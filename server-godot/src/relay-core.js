// Lockstep relay room for the Godot edition of World War 3. Pure logic, no Cloudflare APIs:
// src/index.js (Durable Object, production) and local-server.mjs (Node, tests) both wrap it.
// The relay is the authority for tick order: it owns the clock, closes one "turn" (3 sim ticks) every turnMs,
// stamps every order it received with that turn and sends the turn to everyone. No player hosts anything.
// Wire protocol: ../PROTOCOL.md.

export const PROTO = 1;
export const DEF = {
  hz: 30,               // sim ticks per second (game time)
  tpt: 3,               // ticks per turn -> 10 turns a second
  turnMs: 100,          // real ms per turn (tests may speed this up; production: 100)
  hashEvery: 10,        // players report a state hash after every 10th turn (once a game-second)
  maxPlayers: 8,
  lagTurns: 30,         // never run more than 3 s ahead of the slowest player who is still reporting...
  quietMs: 3000,        // ...but a player silent for 3 s (frozen tab, alt-tab) is not waited for
  maxOrdersPerTurn: 16, // per player
  maxOrderBytes: 1024,
  maxMsgBytes: 1 << 20, // snapshot parts are <= 512 KB of base64
  idleEndMs: 120000,    // a battle with nobody connected for 2 minutes ends
  staleMs: 45000,       // a socket silent this long is dropped (clients ping every 15 s)
  snapWaitMs: 15000,    // a snapshot donor gets this long before we fall back to replaying from turn 0
  resyncGapTurns: 300,  // at most one snapshot resync per 30 game-seconds (a sim that keeps desyncing would loop otherwise)
  chunkBytes: 256 * 1024,
  rate: [40, 120],      // messages per second per socket [rate, burst]
};

const TOK_RE = /^[A-Za-z0-9_-]{8,40}$/;
const clean = (s, n) => String(s == null ? '' : s).replace(/[\x00-\x1f\x7f]/g, '').slice(0, n);
const intOr = (v, d) => (Number.isSafeInteger(v) ? v : d);

export function randomCode(rand32) {
  const A = 'abcdefghjkmnpqrstuvwxyz23456789'; // no i l o 0 1
  let s = '';
  for (let i = 0; i < 6; i++) s += A[rand32() % A.length];
  return s;
}

export class Room {
  /** io: { now(), every(ms, fn) -> stopFn, rand32(), log(...a), changed(info) } ; conn: { send(str), close(code, why) } */
  constructor(code, io, opt = {}) {
    this.code = code; this.io = io; this.o = { ...DEF, ...opt };
    if (this.o.turnMs < DEF.turnMs) {           // a sped-up test clock: allow proportionally more messages
      const f = DEF.turnMs / this.o.turnMs; this.o.rate = [this.o.rate[0] * f, this.o.rate[1] * f];
    }
    this.phase = 'lobby';            // lobby -> battle -> ended
    this.players = [];               // {s, name, tok, pick, ready, conn, on, prog, progAt, snap, cnt, cntTurn}
    this.leader = -1; this.cfg = {}; this.seed = 0;
    this.turn = 0;                   // the next turn to close
    this.pending = [];               // [slot, seq, order] collected for this.turn
    this.log = [];                   // [[k, orders]] every non-empty turn since the start
    this.hashes = new Map();         // k -> Map(slot -> hash string)
    this.desyncs = []; this.resyncAt = -1e15;
    this.snapReq = null;             // {id, donor, waiters:Set(player), k, at}
    this.snapId = 0;
    this.meta = new Map();           // conn -> {p, bucket, at}
    this.timer = null; this.emptySince = 0; this.stalls = 0;
    this.pinger = io.every(5000, () => this.sweep());
  }

  // ---------- connections ----------
  join(conn, q) {
    const now = this.io.now();
    this.meta.set(conn, { p: null, b: this.o.rate[1], bt: now, at: now });
    if (this.phase === 'ended') return this.refuse(conn, 'This battle has ended.');
    if (q.v != null && +q.v !== PROTO) return this.refuse(conn, 'Update the game: this server speaks a different version.');
    let tok = TOK_RE.test(q.tok || '') ? q.tok : null;
    let p = tok && this.players.find(x => x.tok === tok);
    if (p) {                                   // rejoin (same token): take the slot back
      if (p.conn && p.conn !== conn) { const old = p.conn; this.meta.delete(old); p.conn = null; old.close(4000, 'replaced'); }
    } else {
      if (this.phase !== 'lobby') return this.refuse(conn, 'That battle has already started.');
      if (this.players.length >= this.o.maxPlayers) return this.refuse(conn, 'That battle is full.');
      if (!tok) tok = this.newTok();
      let s = 0; while (this.players.some(x => x.s === s)) s++;
      p = { s, tok, name: clean(q.name, 24) || 'Player ' + (s + 1), pick: {}, ready: false, conn: null, on: false,
        prog: -1, progAt: now, snap: false, cnt: 0, cntTurn: -1 };
      this.players.push(p);
      if (this.leader < 0) this.leader = s;
    }
    p.conn = conn; p.on = true; p.snap = q.snap == 1 || q.snap === '1'; p.progAt = now;
    this.meta.get(conn).p = p;
    this.emptySince = 0;
    this.send(conn, { t: 'W', proto: PROTO, code: this.code, you: p.s, tok: p.tok, phase: this.phase });
    if (this.phase === 'lobby') { this.lobbyChanged(); return true; }
    // battle: give the player the start info and catch them up
    this.send(conn, this.startMsg(p));
    const have = intOr(+q.have, -1);
    p.prog = Math.max(p.prog, this.turn - 1); p.progAt = 0;  // not waited for until it reports again (catching up)
    this.pending.push([-1, 0, { sys: 'back', s: p.s }]);
    if (have >= 0 && have < this.turn) this.sendCatchup(p, have + 1, this.turn - 1);
    else if (have < 0 && this.turn > 0) this.freshRejoin(p);
    this.roster();
    return true;
  }

  leave(conn) {
    const m = this.meta.get(conn); this.meta.delete(conn);
    if (!m || !m.p || m.p.conn !== conn) return;
    const p = m.p; p.conn = null; p.on = false;
    if (this.phase === 'lobby') {
      this.players = this.players.filter(x => x !== p);
      if (this.leader === p.s) this.leader = this.players.length ? this.players[0].s : -1;
      this.lobbyChanged();
    } else if (this.phase === 'battle') {
      this.pending.push([-1, 0, { sys: 'left', s: p.s }]);
      if (this.snapReq) { this.snapReq.waiters.delete(p); if (this.snapReq.donor === p) this.snapFailed(); }
      this.roster();
    }
    if (!this.players.some(x => x.on)) this.emptySince = this.io.now();
  }

  refuse(conn, why) { this.send(conn, { t: 'E', m: why }); this.meta.delete(conn); conn.close(4001, 'refused'); return false; }

  // ---------- messages ----------
  message(conn, raw) {
    const m0 = this.meta.get(conn); if (!m0) return;
    const now = this.io.now(); m0.at = now;
    m0.b = Math.min(this.o.rate[1], m0.b + (now - m0.bt) * this.o.rate[0] / 1000); m0.bt = now;
    if (m0.b < 1) return; m0.b -= 1;
    if (typeof raw !== 'string' || raw.length > this.o.maxMsgBytes) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const p = m0.p; if (!p || !m || typeof m !== 'object') return;
    switch (m.t) {
      case 'p': this.send(conn, { t: 'p' }); return;        // keep-alive (the answer lets the player notice a dead link)
      case 'c': {                                           // chat (lobby and battle)
        const text = clean(m.m, 200); if (text) this.bcast({ t: 'c', s: p.s, m: text }); return;
      }
      case 'pick': if (this.phase === 'lobby') { p.pick = smallObj(m.p, 256); this.lobbyChanged(); } return;
      case 'ready': if (this.phase === 'lobby') { p.ready = !!m.r; this.lobbyChanged(); } return;
      case 'cfg': if (this.phase === 'lobby' && p.s === this.leader) { this.cfg = smallObj(m.cfg, 2048); this.lobbyChanged(); } return;
      case 'start': if (this.phase === 'lobby' && p.s === this.leader) this.start(); return;
      case 'o': return this.order(p, m);
      case 'H': return this.hash(p, m, now);
      case 'snap': return this.snapPart(p, m);
      case 'bye': if (this.phase === 'battle') { p.tok = this.newTok(); } conn.close(1000, 'bye'); this.leave(conn); return;
    }
  }

  order(p, m) {
    if (this.phase !== 'battle') return;
    if (p.cntTurn !== this.turn) { p.cntTurn = this.turn; p.cnt = 0; }
    if (++p.cnt > this.o.maxOrdersPerTurn) return;
    const o = m.o; if (o == null || typeof o !== 'object') return;
    if (JSON.stringify(o).length > this.o.maxOrderBytes) return;
    if (o.sys !== undefined) return;                       // system orders come only from the relay
    this.pending.push([p.s, intOr(m.s, 0), o]);
  }

  // ---------- battle clock ----------
  start() {
    this.phase = 'battle';
    this.seed = this.io.rand32() >>> 0;
    this.turn = 0; this.pending = []; this.log = [];
    const now = this.io.now();
    for (const p of this.players) { p.prog = -1; p.progAt = now; }
    for (const p of this.players) if (p.on) this.send(p.conn, this.startMsg(p));
    this.next = now + this.o.turnMs;                 // wall-clock time the next turn is due (timers drift)
    this.timer = this.io.every(Math.max(5, this.o.turnMs >> 1), () => this.clock());
    this.changed();
  }

  startMsg(p) {
    return { t: 'S', seed: this.seed, hz: this.o.hz, tpt: this.o.tpt, turnMs: this.o.turnMs, hashEvery: this.o.hashEvery,
      you: p.s, cfg: this.cfg, players: this.players.map(x => ({ s: x.s, name: x.name, pick: x.pick })), now: this.turn };
  }

  clock() {
    const now = this.io.now();
    if (now - this.next > 1000) this.next = now;           // a long pause (stall, overloaded machine): don't burst
    for (let i = 0; i < 4 && now >= this.next && this.phase === 'battle'; i++) {
      if (!this.closeTurn(now)) { this.next = now + this.o.turnMs; return; }
      this.next += this.o.turnMs;
    }
  }

  /** returns false while stalled for a slow player */
  closeTurn(now) {
    if (this.phase !== 'battle') return false;
    if (this.emptySince && now - this.emptySince > this.o.idleEndMs) { this.end('Everyone left.'); return false; }
    // wait for a slow player who is still reporting (Generals-style), never for one who went quiet
    const k = this.turn;
    for (const p of this.players) {
      if (!p.on || now - p.progAt > this.o.quietMs) continue;
      if (p.prog < k - this.o.lagTurns) { this.stalls++; return false; }
    }
    const orders = this.pending; this.pending = []; this.turn = k + 1;
    const msg = JSON.stringify(orders.length ? { t: 'T', k, o: orders } : { t: 'T', k });
    if (orders.length) this.log.push([k, orders]);
    for (const p of this.players) if (p.on) p.conn.send(msg);
    if (k % 50 === 0) this.checkHashes(true);
    return true;
  }

  // ---------- desync detection ----------
  hash(p, m, now) {
    if (this.phase !== 'battle') return;
    const k = intOr(m.k, -1); if (k < 0 || k >= this.turn) return;
    if (k > p.prog) { p.prog = k; p.progAt = now; }
    if (m.h == null || k % this.o.hashEvery) return;
    let e = this.hashes.get(k); if (!e) this.hashes.set(k, e = new Map());
    if (!e.has(p.s)) e.set(p.s, String(m.h).slice(0, 32));
    this.checkHashes(false);
  }

  checkHashes(sweep) {
    const now = this.io.now();
    const on = this.players.filter(p => p.on && !(this.snapReq && this.snapReq.waiters.has(p)));
    for (const [k, e] of this.hashes) {
      // wait for every connected player except one catching up (progAt 0) or gone quiet; stragglers: the late sweep
      const all = on.every(p => e.has(p.s) || p.progAt === 0 || now - p.progAt > this.o.quietMs);
      const late = sweep && k < this.turn - 100;
      if (!all && !late) continue;
      this.hashes.delete(k);
      if (e.size < 2) continue;
      const groups = new Map();
      for (const [s, h] of e) { if (!groups.has(h)) groups.set(h, []); groups.get(h).push(s); }
      if (groups.size < 2) continue;
      const sorted = [...groups.values()].sort((a, b) => b.length - a.length);
      const majority = sorted[0].length > sorted[1].length ? sorted[0] : null;  // a tie has no majority
      const bad = majority ? [].concat(...sorted.slice(1)) : [...e.keys()];
      const d = { t: 'D', k, h: Object.fromEntries(e), bad };
      this.desyncs.push({ k, h: d.h, bad });
      this.io.log('desync', this.code, JSON.stringify(d));
      this.bcast(d);
      if (majority) this.resync(majority, bad);
    }
  }

  resync(good, bad) {
    if (this.snapReq || this.turn - this.resyncAt < this.o.resyncGapTurns) return;
    const donor = this.players.find(p => p.on && p.snap && good.includes(p.s));
    const waiters = this.players.filter(p => p.on && p.snap && bad.includes(p.s));
    if (!donor || !waiters.length) return;
    this.resyncAt = this.turn;
    this.io.log('resync', this.code, 'turn', this.turn, 'donor', donor.s, 'bad', bad.join(','));
    this.askSnap(donor, waiters, false);
  }

  // ---------- catch-up: turns, snapshots, replay ----------
  freshRejoin(p) {
    const donor = p.snap && this.players.find(x => x !== p && x.on && x.snap && this.io.now() - x.progAt < this.o.quietMs);
    if (donor) return this.askSnap(donor, [p], true);
    this.sendCatchup(p, 0, this.turn - 1);
  }

  askSnap(donor, waiters, fresh) {
    if (this.snapReq) { for (const w of waiters) this.snapReq.waiters.add(w); this.snapReq.fresh = this.snapReq.fresh || fresh; return; }
    const id = ++this.snapId;
    this.snapReq = { id, donor, waiters: new Set(waiters), fresh, k: -1, at: this.io.now() };
    for (const w of waiters) this.send(w.conn, { t: 'SW' });   // "wait: a snapshot is on its way"
    this.send(donor.conn, { t: 'SR', id });
  }

  snapPart(p, m) {
    const r = this.snapReq;
    if (!r || p !== r.donor || m.id !== r.id) return;
    const k = intOr(m.k, -1), i = intOr(m.i, -1), n = intOr(m.n, 0);
    if (k < 0 || k >= this.turn || i < 0 || i >= n || n > 64 || typeof m.d !== 'string') return this.snapFailed();
    const fwd = JSON.stringify({ t: 'snap', k, i, n, d: m.d });
    for (const w of r.waiters) if (w.on) w.conn.send(fwd);
    if (i === n - 1) {
      this.snapReq = null;
      for (const w of r.waiters) if (w.on) { this.sendCatchup(w, k + 1, this.turn - 1); w.prog = k; w.progAt = this.io.now(); }
    }
  }

  snapFailed() {
    const r = this.snapReq; this.snapReq = null;
    if (!r) return;
    for (const w of r.waiters) if (w.on) {
      if (r.fresh) this.sendCatchup(w, 0, this.turn - 1, true);  // no snapshot: replay the whole battle
      else this.send(w.conn, { t: 'SX' });                       // resync gave up; play on
    }
  }

  /** send turns a..b (inclusive) in chunks; turns not listed in a chunk were empty */
  sendCatchup(p, a, b, replay) {
    if (!p.on) return;
    if (b < a) { this.send(p.conn, { t: 'C', from: a, to: b, o: [], last: 1, replay: replay ? 1 : 0 }); return; }
    let lo = 0, hi = this.log.length;                         // first log entry with k >= a
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.log[mid][0] < a) lo = mid + 1; else hi = mid; }
    let from = a, chunk = [], size = 0;
    for (let i = lo; i < this.log.length && this.log[i][0] <= b; i++) {
      const e = this.log[i], len = JSON.stringify(e).length;
      if (size + len > this.o.chunkBytes && chunk.length) {
        const to = e[0] - 1;
        this.send(p.conn, { t: 'C', from, to, o: chunk, replay: replay ? 1 : 0 });
        from = e[0]; chunk = []; size = 0;
      }
      chunk.push(e); size += len;
    }
    this.send(p.conn, { t: 'C', from, to: b, o: chunk, last: 1, replay: replay ? 1 : 0 });
  }

  // ---------- housekeeping ----------
  sweep() {
    const now = this.io.now();
    for (const [conn, m] of this.meta) if (now - m.at > this.o.staleMs) { conn.close(4002, 'silent'); this.leave(conn); }
    if (this.snapReq && now - this.snapReq.at > this.o.snapWaitMs) this.snapFailed();
    if (this.phase === 'lobby' && !this.players.length && this.meta.size === 0) this.end('empty');
    else if (this.phase === 'lobby' && this.players.length) this.changed();     // keep the game list entry fresh
    if (this.phase === 'battle' && this.emptySince && now - this.emptySince > this.o.idleEndMs) this.end('Everyone left.');
  }

  end(why) {
    if (this.phase === 'ended') return;
    this.phase = 'ended';
    if (this.timer) this.timer(); this.timer = null;
    if (this.pinger) this.pinger(); this.pinger = null;
    this.bcast({ t: 'X', m: why });
    for (const [conn] of this.meta) conn.close(1000, 'ended');
    this.meta.clear();
    this.changed();
  }

  lobbyChanged() {
    const players = this.players.map(p => ({ s: p.s, name: p.name, pick: p.pick, ready: p.ready, on: p.on }));
    this.bcast({ t: 'L', code: this.code, leader: this.leader, cfg: this.cfg, players, max: this.o.maxPlayers });
    this.changed();
  }
  roster() { this.bcast({ t: 'R', players: this.players.map(p => ({ s: p.s, name: p.name, on: p.on })) }); }
  changed() { this.io.changed && this.io.changed(this.info()); }
  info() {
    const lead = this.players.find(p => p.s === this.leader);
    return { code: this.code, phase: this.phase, n: this.players.length, max: this.o.maxPlayers, host: lead ? lead.name : '' };
  }
  send(conn, obj) { if (conn) conn.send(JSON.stringify(obj)); }
  bcast(obj) { const s = JSON.stringify(obj); for (const p of this.players) if (p.on) p.conn.send(s); }
  newTok() { let t = ''; for (let i = 0; i < 3; i++) t += (this.io.rand32() >>> 0).toString(36); return (t + 'xxxxxxxx').slice(0, 20); }
  stats() { return { code: this.code, phase: this.phase, turn: this.turn, players: this.players.length, desyncs: this.desyncs.length, stalls: this.stalls, logTurns: this.log.length }; }
}

function smallObj(v, max) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  try { return JSON.stringify(v).length <= max ? JSON.parse(JSON.stringify(v)) : {}; } catch (e) { return {}; }
}
