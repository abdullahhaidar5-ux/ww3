// Battle host core: one World War 3 battle hosted by the server (a Cloudflare Durable Object, or Node for the tests).
// Runtime-neutral: no Cloudflare or Node APIs. The caller passes a battle (createBattleSim() from gen/battle-sim.js),
// a way to send a text frame to a player, and a clock. Protocol: orch/STAGE2.md section 8 "Cloudflare battle protocol".
//
// Players speak the relay-room wire format: player -> server "|<json>" records (joined by "\n"), server -> player
// "ww3-<code>|<json>" records; <json> = {"k":"e","t":topic,"d":data} (emit) or {"k":"p","p":presence}.

export const STEP = 1 / 60;                  // the battle steps at 60 Hz, as in the browser
export const MAX_STEPS_PER_TICK = 2;         // one timer callback runs at most this many steps (keeps CPU per event small)
export const LOBBY_MAX_MS = 30 * 60000;      // an unstarted lobby closes after 30 minutes
export const EMPTY_MS = 60000;               // no player connected for this long: the room closes
export const AFTER_END_MS = 120000;          // battle over: the room closes this much later
export const MAX_BATTLE_MS = 45 * 60000;     // free-plan cap: after 45 minutes the server hands the battle to a player
                                             // (it closes; the standby player takes over as a browser host, as when a
                                             // host leaves)
const MAX_PLAYERS = 8;
const MAX_FRAME = 16 * 1024;                 // a player's frame (presence with its order queue is capped ~3.5 KB)

const int = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);

export class BattleHost {
  // sim: createBattleSim(); code: game code; ownKey: the creator's key; send(id, frame); close(id, code, why);
  // now(): ms clock; publish(entry|null): the game-list entry changed; save(record|null): keep (or drop) the battle's
  // latest checkpoint so it can be picked up after a server restart (BattleHost.restore); log(msg)
  constructor({ sim, code, ownKey, send, close, now, publish = () => {}, save = () => {}, log = () => {}, seed }) {
    Object.assign(this, { sim, code, ownKey, sendRaw: send, closeRaw: close, now, publish, save, log });
    this.hostId = 'ww3-' + code;
    this.phase = 'lobby';                    // lobby -> battle -> over -> closed
    this.players = new Map();                // id -> {id, pres, f, tok, at, seat}
    this.order = [];                         // ids of humans in seat order (join order, owner first)
    this.owner = null;                       // id of the owner (configures and starts)
    this.map = 'strait'; this.w = 0; this.tm = []; this.ais = [];
    this.seed = seed;
    this.created = now(); this.emptySince = now(); this.endAt = 0;
    this.out = new Map();                    // id -> records queued this turn ('' = everyone)
    this.lastStep = 0; this.acc = 0; this.steps = 0; this.lastPub = '';
    sim.room({ emit: (t, d) => { this.emit(t, d); return Promise.resolve(); }, buffered: () => 0 });
  }

  // ---- sending
  emit(t, d) {
    const to = d && typeof d === 'object' && typeof d.to === 'string' ? d.to : '';
    const rec = JSON.stringify({ k: 'e', t, d });
    let q = this.out.get(to); if (!q) this.out.set(to, q = []); q.push(rec);
  }
  flush() {
    if (!this.out.size) return;
    const all = this.out.get('') || [];
    for (const id of this.players.keys()) {
      const own = this.out.get(id) || [];
      const recs = all.length ? all.concat(own) : own;
      if (recs.length) this.sendRaw(id, recs.map(r => this.hostId + '|' + r).join('\n'));
    }
    this.out.clear();
  }

  // ---- players
  // a socket wants in: null = welcome, else the refusal reason
  admit(id, own) {
    if (this.phase === 'closed' || this.phase === 'over') return 'nohost';
    if (this.players.has(id)) return 'taken';
    if (own && own !== this.ownKey) return 'taken';
    if (this.players.size >= MAX_PLAYERS + 4) return 'full';   // seats are checked at the greeting (lobby {full:1})
    return null;
  }
  join(id, own) {
    const p = { id, pres: {}, f: null, tok: null, at: this.now(), own: !!own && own === this.ownKey };
    this.players.set(id, p);
    if (p.own) this.owner = id;
    this.emptySince = 0;
    this.sendRaw(id, '!w ' + this.hostId);
    if (this.phase === 'lobby') this.sendLobby();
  }
  leave(id) {
    const p = this.players.get(id); if (!p) return;
    this.players.delete(id);
    this.sim.forget(id);
    if (this.phase === 'lobby') {
      const i = this.order.indexOf(id);
      if (i >= 0) { this.order.splice(i, 1); this.tm.splice(i, 1); }
      if (this.owner === id) this.owner = this.order[0] || null;
      this.sendLobby();
    } else if (this.phase === 'battle') this.sim.gone(id);
    if (!this.players.size) this.emptySince = this.now();
  }
  // a frame from a player: "|<json>" records joined by "\n"
  frame(id, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_FRAME || !this.players.has(id)) return;
    for (const r of msg.indexOf('\n') < 0 ? [msg] : msg.split('\n')) {
      const i = r.indexOf('|'); if (i < 0) continue;
      let m; try { m = JSON.parse(r.slice(i + 1)); } catch (e) { continue; }
      if (!m || typeof m !== 'object') continue;
      try { if (m.k === 'p') this.presence(id, m.p); else if (m.k === 'e') this.event(id, m.t, m.d); } catch (e) { this.log('player message: ' + (e && e.stack || e)); }
    }
    this.flush();
  }
  presence(id, p) {
    if (!p || typeof p !== 'object') return;
    const P = this.players.get(id); P.pres = p;
    this.sim.pres(id, p, (peer, by, f, tok) => this.hello(peer, f, tok));
  }
  event(id, t, d) {
    if (t === 'hello') { if (d && typeof d === 'object') this.hello(id, d.f, null); }
    else if (t === 'cmd') { if (this.phase === 'battle') this.sim.cmd(id, d); }
    else if (t === 'bset') { if (this.phase === 'lobby' && id === this.owner) this.configure(d || {}); }
  }
  // a player's greeting (presence hi, or the 'hello' emit): takes a seat in the lobby / reconnects during the battle
  hello(id, f, tok) {
    const P = this.players.get(id); if (!P) return;
    if (tok) P.tok = String(tok).slice(0, 16);
    if (this.phase === 'battle') { if (P.tok) this.sim.rejoin(id, P.tok); return; }
    if (this.phase !== 'lobby') return;
    if (typeof f === 'string' && this.sim.facs.includes(f)) P.f = f; else if (!P.f) P.f = this.sim.facs[0];
    if (!this.order.includes(id)) {
      if (this.order.length >= this.mx()) { this.emit('lobby', { n: 0, to: id, full: 1 }); return; }
      if (P.own) { this.order.unshift(id); this.tm.unshift(0); } else { this.order.push(id); this.tm.push(this.order.length - 1); }
      if (!this.owner) this.owner = id;
      // a joining human takes a computer seat if the map is full
      while (this.order.length + this.ais.length > this.mx() && this.ais.length) this.ais.pop();
    }
    this.emit('lobby', { n: this.seats().length, to: id });
    this.sendLobby();
  }

  // ---- lobby
  mx() { return Math.min(MAX_PLAYERS, this.sim.mapMax(this.map)); }
  seats() {
    return [...this.order.map((id, i) => ({ h: 1, f: this.players.get(id).f, tm: this.tm[i] | 0 })), ...this.ais.map(a => ({ ai: 1, f: a.f, d: a.d, tm: a.tm }))];
  }
  check() {
    const s = this.seats();
    if (this.order.length < 2) return 'Waiting for at least one more player to join.';
    if (new Set(s.map(x => x.tm)).size < 2) return 'Everyone is on one team: put someone on another team to start.';
    return '';
  }
  configure(d) {
    if (this.sim.mapOk(d.map)) this.map = d.map;
    if (typeof d.w === 'number') this.w = int(d.w, -1, 31, 0);
    if (Array.isArray(d.ais)) this.ais = d.ais.slice(0, MAX_PLAYERS).map(a => ({ f: this.sim.facs.includes(a && a.f) ? a.f : this.sim.facs[0], d: int(a && a.d, 0, 2, 1), tm: int(a && a.tm, 0, 7, 1) }));
    if (Array.isArray(d.tm)) this.tm = this.order.map((_, i) => int(d.tm[i], 0, 7, this.tm[i] | 0));
    const mx = this.mx();
    if (this.order.length + this.ais.length > mx) this.ais.splice(Math.max(0, mx - this.order.length));
    if (d.start) { const why = this.check(); if (!why) { this.startBattle(); return; } }
    this.sendLobby();
  }
  sendLobby() {
    const seats = this.seats(), why = this.check();
    for (const id of this.players.keys()) {
      this.emit('blob', { to: id, c: this.code, pv: this.sim.pv, own: id === this.owner ? 1 : 0, you: this.order.indexOf(id), map: this.map, mx: this.mx(), w: this.w, seats, ok: why ? 0 : 1, why });
    }
    this.flush();
    this.list();
  }
  // the game-list entry (published to /lobby by the caller)
  entry() {
    if (this.phase === 'closed' || this.phase === 'over') return null;
    const o = this.owner && this.players.get(this.owner), n = this.phase === 'battle' ? this.facs.length : this.seats().length;
    return { c: this.code, f: (o && o.f) || (this.facs && this.facs[0]) || 'US', s: this.phase === 'lobby' && n < this.mx() ? 'open' : 'full', n: Math.max(1, n), m: this.map, mx: this.mx(), cf: 1 };
  }
  list(force) { const e = this.entry(), s = JSON.stringify(e); if (force || s !== this.lastPub) { this.lastPub = s; this.publish(e); } }

  // ---- battle
  startBattle() {
    const ais = this.ais.slice(0, Math.max(0, this.mx() - this.order.length));
    const facs = [...this.order.map(id => this.players.get(id).f), ...ais.map(a => a.f)];
    const tm = [...this.order.map((_, i) => this.tm[i] | 0), ...ais.map(a => a.tm | 0)];
    const peers = [...this.order, ...ais.map(() => null)], toks = [...this.order.map(id => this.players.get(id).tok || null), ...ais.map(() => null)];
    const aiD = [...this.order.map(() => null), ...ais.map(a => a.d)];
    const seed = this.seed != null ? this.seed : (Math.random() * 1e9) | 0;
    this.facs = facs; this.si = { seed, facs, map: this.map, tm, w: this.w | 0, code: this.code };
    this.order.forEach((id, i) => this.emit('start', { pv: this.sim.pv, seed, facs, slot: i, to: id, map: this.map, tm, w: this.w | 0, sv: 1 }));
    this.flush();
    this.sim.start({ seed, facs, map: this.map, tm, w: this.w, aiD, peers, toks, code: this.code });
    this.phase = 'battle'; this.lastStep = this.now(); this.acc = 0; this.startedAt = this.now();
    this.log(`battle ${this.code} started: ${facs.join(' ')} on ${this.map}`);
    this.list();
  }
  // Called by the caller's timer. Runs the steps that are due (at most MAX_STEPS_PER_TICK) and the send loop, and returns
  // how many ms until the next step is due (or -1 when the room should close now).
  tick() {
    const now = this.now();
    if (this.phase === 'closed') return -1;
    if (this.phase === 'lobby') {
      if (now - this.created > LOBBY_MAX_MS || (this.emptySince && now - this.emptySince > EMPTY_MS)) return this.shut('lobby closed');
      return 1000;
    }
    if (this.phase === 'over') return now >= this.endAt ? this.shut('battle over') : 1000;
    if (this.emptySince && now - this.emptySince > EMPTY_MS) return this.shut('everyone left');
    if (now - this.startedAt > MAX_BATTLE_MS) return this.shut('time limit');
    const real = Math.min(1, Math.max(0, (now - this.lastStep) / 1000)); this.lastStep = now;
    this.acc = Math.min(0.25, this.acc + real);   // more than 0.25 s behind: the battle slows down rather than spiking
    let n = 0;
    while (this.acc >= STEP - 1e-6 && n < MAX_STEPS_PER_TICK) { this.sim.step(STEP); this.acc -= STEP; n++; this.steps++; }
    if (real > 0) this.sim.net(real);
    this.flush();
    const ck = this.sim.ckFresh();
    if (ck) this.save({ code: this.code, own: this.ownKey, si: this.si, s: ck, at: now });
    const info = n ? this.sim.info() : null;
    if (info && info.over) { this.phase = 'over'; this.endAt = now + AFTER_END_MS; this.save(null); this.log(`battle ${this.code} over, winner slot ${info.winner}`); this.list(); }
    return Math.max(0, Math.ceil((STEP - this.acc) * 1000));
  }
  // A battle picked up from its last kept checkpoint after the server restarted (rec: what save() was given). Players
  // reconnect as usual (same /battle/ address, their token); each human side has 30 s before the AI takes over.
  static async restore(opts, rec) {
    const h = new BattleHost({ ...opts, code: rec.code, ownKey: rec.own });
    await h.sim.restore(rec.si, rec.s);
    h.si = rec.si; h.facs = rec.si.facs.slice(); h.map = rec.si.map; h.w = rec.si.w | 0;
    h.phase = 'battle'; h.startedAt = h.lastStep = h.emptySince = h.now(); h.acc = 0;
    h.log(`battle ${rec.code} picked up from its checkpoint (${Math.round((h.now() - rec.at) / 1000)} s old)`);
    h.list(true);
    return h;
  }
  shut(why) {
    if (this.phase === 'battle') this.save(null);
    this.phase = 'closed';
    for (const id of [...this.players.keys()]) { this.sendRaw(id, '!l ' + this.hostId); this.closeRaw(id, 4002, why); }
    this.players.clear();
    this.list(true);
    return -1;
  }
}

// ------------------------------------------------------------------------------------------------ bench
// One AI battle, all sides played by the AI, with the full host netcode sending to every side as a connected player
// (each message JSON-encoded, as for a real socket). Steps `batch` 1/60 s steps per event, then yields to the runtime
// (yieldFn), and times each event by the clock reading at the start of the next one: on Cloudflare the clock stands
// still while code runs and moves on between events, so this is the event's wall time (CPU + scheduling).
// write(line) gets a progress line every game-minute. Returns the summary.
export async function runBench(sim, o, { now, yieldFn, write = () => {}, cpu = null }) {
  const facs = o.facs.slice(0, o.players);
  let msgs = 0, bytes = 0;
  sim.room({ emit: (t, d) => { msgs++; bytes += JSON.stringify(d).length; return Promise.resolve(); }, buffered: () => 0 });
  const t0 = now();
  const st = sim.benchStart({ seed: o.seed, facs, map: o.map, diff: o.diff });
  await yieldFn();
  const setupMs = now() - t0;
  write(`setup: ${facs.length} sides (${facs.join(' ')}) on ${o.map}, seed ${o.seed}, AI difficulty ${o.diff}, ${o.batch} step(s) per event; battle set up in ${setupMs} ms`);
  const steps = Math.round(o.minutes * 60 / STEP), per = Math.max(1, o.batch | 0);
  const rows = []; let minute = { wall: 0, cpu: 0, events: 0, maxEv: 0, steps: 0 }, total = { wall: 0, cpu: 0, events: 0, steps: 0 }, maxEv = 0;
  let done = 0, last = now(), c0 = cpu ? cpu() : 0;
  const HB = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000], hist = HB.map(() => 0), big = []; // staging diagnostics
  let zeroRun = 0, maxZeroRun = 0, runBefore = [];
  while (done < steps) {
    const evStart = now();
    for (let k = 0; k < per && done < steps; k++) { sim.step(STEP); sim.benchNet(STEP); done++; minute.steps++; }
    await yieldFn();
    const t = now(), ev = t - evStart; last = t;
    { let b = 0; while (b + 1 < HB.length && ev >= HB[b + 1]) b++; hist[b]++; }
    if (ev === 0) { zeroRun++; if (zeroRun > maxZeroRun) maxZeroRun = zeroRun; } else { if (ev >= 50) big.push({ step: done, ms: ev, zerosBefore: zeroRun }); zeroRun = 0; }
    minute.wall += ev; minute.events++; if (ev > minute.maxEv) minute.maxEv = ev;
    const info = done % 3600 === 0 || done >= steps ? sim.info() : null;
    if (info) {
      const c1 = cpu ? cpu() : 0; minute.cpu = c1 - c0; c0 = c1;
      const gs = minute.steps * STEP;
      const row = { min: rows.length + 1, t: Math.round(info.t), ents: info.ents, wallMsPerGameS: +(minute.wall / gs).toFixed(1), cpuMsPerGameS: cpu ? +(minute.cpu / gs).toFixed(1) : null, maxEventMs: minute.maxEv, events: minute.events };
      rows.push(row);
      write(`game-min ${row.min}: ${row.ents} entities, ${row.wallMsPerGameS} ms wall per game-second${cpu ? `, ${row.cpuMsPerGameS} ms CPU` : ''}, slowest event ${row.maxEventMs} ms, ${row.events} events`);
      total.wall += minute.wall; total.cpu += minute.cpu; total.events += minute.events; total.steps += minute.steps; if (minute.maxEv > maxEv) maxEv = minute.maxEv;
      minute = { wall: 0, cpu: 0, events: 0, maxEv: 0, steps: 0 };
      if (info.over) { write(`battle over at ${(info.t / 60).toFixed(1)} game-min (winner slot ${info.winner})`); break; }
    }
  }
  const info = sim.info(), gs = total.steps * STEP;
  return { players: facs.length, map: o.map, seed: o.seed, diff: o.diff, batch: per, setupMs, gameSeconds: +gs.toFixed(1), wallMs: total.wall,
    wallMsPerGameS: +(total.wall / Math.max(1e-9, gs)).toFixed(1), cpuMsPerGameS: cpu ? +(total.cpu / Math.max(1e-9, gs)).toFixed(1) : null,
    maxEventMs: maxEv, events: total.events, peakEnts: Math.max(0, ...rows.map(r => r.ents)), endEnts: info.ents, over: info.over,
    hist: HB.map((b, i) => b + 'ms:' + hist[i]).join(' '), maxZeroRun, big: big.slice(0, 40),
    msgs, kbSent: Math.round(bytes / 1024), kbPerGameS: +(bytes / 1024 / Math.max(1e-9, gs)).toFixed(1), rows };
}
