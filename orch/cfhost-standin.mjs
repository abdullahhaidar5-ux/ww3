// Stand-in for the Cloudflare BattleRoom (Stage 2 "Host on Cloudflare"), for the browser-side tests (orch/cfclient.mjs)
// until the real Durable Object exists. It speaks the "Cloudflare battle protocol" in orch/STAGE2.md on
// `/battle/<code>` and runs the battle in plain Node with the game's own code: src/01-03 + 07a-hostsnap + 07b-ckpt (the
// same bundle the BattleRoom runs, loaded the way orch/headless.mjs does), the server host being slot ME=-1 (no side).
// Everything else (game list `/lobby`, relay rooms `/room/<code>`, `/turn`, `/health`) is passed through to a local
// `wrangler dev` of server/ (orch/serverdev.mjs), so a page pointed at this address sees one complete game server.
//
//   import { startStandin } from './cfhost-standin.mjs';
//   const cf = await startStandin({ upstream: srv.url });   // { url, battles, setBusy(bool), kill(code), stop() }
//
// Test controls: setBusy(true) makes new battles answer `!e busy` (the free-plan guard); kill(code) makes a battle
// vanish like an evicted object (sockets closed, later connections get `!e nohost`); battle.pause / battle.view(slot)
// let a test compare a client with the host.
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { simSource } from './headless.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(path.join(ROOT, 'server', 'package.json'));
const { WebSocketServer } = req('ws'); // installed with server/ (npm ci there), as wrangler's own dependency

const CODE_RE = /^[a-z0-9]{4,8}$/, ID_RE = /^[A-Za-z0-9_-]{4,40}$/, KEY_RE = /^[A-Za-z0-9]{8,40}$/;

// ---- the battle code, one fresh copy per battle (its own G, NET, MODE ...) ----
const BROWSER_NAMES = ['window', 'self', 'document', 'localStorage', 'matchMedia', 'navigator', 'performance'];
let compiled = null;
function SERVER_DRIVER() {
  const D = {};
  D.pv = NET_PV; D.FKEYS = FKEYS; D.maxOf = m => (MAPS[m] || MAPS.strait).max; D.hasMap = m => !!MAPS[m];
  // start the battle as the host with no side of its own; humans: [{id, tok}], ais: [{f, d}] after them
  D.start = (room, o) => {
    MODE = 'host'; ME = -1; NET.p2p = true; NET.game = room; NET.room = null;
    Object.assign(NET, { snapT: 0, evT: 0, teamT: 0, bT: 0, sc: {}, kf: {}, kt: {}, cseq: {}, cseqSlot: [], ver: null, sk: null, gq: [], civQ: [], snapTo: [],
      tgC: null, tgS: null, ckAk: null, ckOut: null, ckBusy: false, ckT: null, sbSlot: null, seen: {}, edOf: {}, gen: 0, lastSnapT: 0, iaDev: 0 });
    TERR_DEFER = true;
    try { newGame({ seed: o.seed, facs: o.facs, ai: o.facs.map((_, i) => o.aiD[i] != null), map: o.map, tm: o.tm, slot: -1 }); } finally { TERR_DEFER = false; }
    G.headless = true;
    G.teams.forEach((T, i) => { if (o.aiD[i] != null) T.ai = mkAI(o.aiD[i]); });
    NET.peers = o.facs.map((_, i) => o.peers[i] || null); NET.toks = o.facs.map((_, i) => o.toks[i] || null);
    NET.startInfo = { seed: o.seed, facs: o.facs, map: G.mapKey, tm: o.tm, w: o.w | 0, sv: 1 };
    return { map: G.mapKey };
  };
  D.step = dt => { simUpdate(dt); };
  D.net = dt => { netTick(dt); };
  D.pres = (peer, presence) => hostPres({ peer, by: null, presence }, (p, by, f, tok) => { if (MODE === 'host') hostRejoin(p, tok); });
  D.cmd = (peer, data) => hostCmd(peer, data);
  D.gone = peer => hostGone(peer);
  D.t = () => G.t; D.over = () => !!G.over;
  D.keyframe = k => { if (NET.kf) NET.kf[k] = 0; NET.snapT = 0; NET.teamT = 0; };
  D.team = k => { const T = G.teams[k]; return T ? { ai: !!T.ai, disc: T.discT || 0, out: !!T.out, credits: Math.floor(T.credits), fac: T.fac } : null; };
  D.peers = () => NET.peers.slice();
  // what slot k may see: its own entities and everything in its vision (as orch/mpsync.mjs compares)
  D.view = k => { const out = []; for (const e of G.ents) { if (e.dead) continue; const own = e.team === k, vis = own || !!(e.vs && e.vs[k]);
      if (!vis && !(e.isB && ((e.sn | 0) & (1 << k)))) continue; out.push([e.id, e.kind, e.team, Math.round(e.x), Math.round(e.y), Math.round(e.hp), e.isB ? 1 : 0, vis ? 1 : 0]); }
    return { t: G.t, list: out, credits: Math.floor(G.teams[k].credits), all: G.ents.filter(e => !e.dead).length }; };
  D.pos = ids => ids.map(id => { const e = G.byId.get(id); return e ? [e.x, e.y] : null; });
  D.base = k => { const b = G.ents.filter(e => e.team === k && e.isB && !e.dead); return b.length ? [b.reduce((s, e) => s + e.x, 0) / b.length, b.reduce((s, e) => s + e.y, 0) / b.length] : [MAPW / 2, MAPH / 2]; };
  D.spot = (k, kind) => { const hq = G.ents.find(e => e.team === k && e.isB && !e.dead); if (!hq) return null;
    for (let r = 60; r < 400; r += 20) for (let a = 0; a < 16; a++) { const x = hq.x + Math.cos(a / 16 * 6.283) * r, y = hq.y + Math.sin(a / 16 * 6.283) * r; if (validSpot(k, kind, x, y)) return [Math.round(x), Math.round(y)]; } return null; };
  D.ck = () => ({ sb: NET.sbSlot, id: NET.ckId || 0 });
  return D;
}
function newSim() {
  const noop = () => {};
  const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: () => true });
  const store = new Map();
  const env = {
    document: { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d }), getElementById: () => null, hidden: true, addEventListener: noop },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    navigator: { userAgent: 'node', hardwareConcurrency: os.cpus().length },
    performance, window: undefined, self: undefined,
  };
  if (!compiled) {
    const body = simSource(undefined, { host: true }) + `\nreturn (${SERVER_DRIVER.toString()})();\n//# sourceURL=ww3-cfhost.js`;
    compiled = new vm.Script(`(function(${BROWSER_NAMES.join(',')}){\n${body}\n})`, { filename: 'ww3-cfhost.js' }).runInThisContext();
  }
  return compiled(...BROWSER_NAMES.map(k => env[k]));
}

// ---- one battle room ----
class Battle {
  constructor(code, ownKey, sv) {
    this.code = code; this.hostId = 'ww3-' + code; this.ownKey = ownKey; this.sv = sv;
    this.socks = new Map();       // id -> ws
    this.humans = [];             // lobby seats in join order (owner first): {id, f, tok, tm, n}
    this.ownerId = null; this.map = 'strait'; this.w = 0; this.ais = []; this.q = 0;
    this.started = false; this.sim = null; this.loop = null; this.pause = false; this.log = [];
    this.dead = false; this.slots = null;
  }
  // frames: "<from>|<json>" records joined by "\n", one frame per socket per microtask (as the real server batches)
  send(id, obj) { const ws = this.socks.get(id); if (!ws || ws.readyState !== 1) return;
    (ws._q = ws._q || []).push(this.hostId + '|' + JSON.stringify(obj));
    if (!ws._qt) { ws._qt = true; queueMicrotask(() => { ws._qt = false; const f = ws._q.join('\n'); ws._q = []; if (ws.readyState === 1) ws.send(f); }); } }
  emit(t, d, to) { const msg = { k: 'e', t, d }; if (to) this.send(to, msg); else for (const id of this.socks.keys()) this.send(id, msg); }
  room() { const B = this; return { emit(t, d) { B.emit(t, d, d && typeof d === 'object' && d.to); return Promise.resolve(); },
    buffered: to => { const ws = B.socks.get(to); return ws ? ws.bufferedAmount : 0; }, on() {}, onPeers() {}, presence() { return Promise.resolve(); } }; }
  mx() { const S = this.simOrProbe(); return S.maxOf(this.map); }
  simOrProbe() { return this.sim || (this.probe = this.probe || newSim()); }
  // ---- lobby ----
  blob() {
    const S = this.simOrProbe(), mx = S.maxOf(this.map);
    const hs = this.humans.slice(0, mx), as = this.ais.slice(0, Math.max(0, mx - hs.length));
    const teams = new Set([...hs.map(h => h.tm | 0), ...as.map(a => a.tm | 0)]);
    const ok = hs.length >= 2 && teams.size > 1;
    const why = hs.length < 2 ? 'Waiting for at least one more player to join. You can also add computer players below.' : teams.size < 2 ? 'Everyone is on one team: put someone on another team to start.' : '';
    return { c: this.code, pv: S.pv, map: this.map, mx, w: this.w, q: this.q, ok: ok ? 1 : 0, why,
      seats: [...hs.map(h => ({ h: 1, f: h.f, tm: h.tm | 0 })), ...as.map(a => ({ ai: 1, f: a.f, d: a.d | 0, tm: a.tm | 0 }))] };
  }
  sendBlobs() { if (this.started) return; const b = this.blob(); for (const [i, h] of this.humans.entries()) this.emit('blob', Object.assign({}, b, { to: h.id, own: h.id === this.ownerId ? 1 : 0, you: i })); }
  hello(id, hi) {
    const S = this.simOrProbe();
    let h = this.humans.find(x => x.id === id);
    if (!h) { if (this.humans.length >= S.maxOf(this.map)) { this.emit('lobby', { n: this.humans.length, to: id, full: 1 }); return; }
      h = { id, f: 'US', tok: null, tm: this.humans.length % 8 }; this.humans.push(h);
      if (this.ais.length && this.humans.length + this.ais.length > S.maxOf(this.map)) this.ais.pop(); }
    if (hi && S.FKEYS.includes(hi.f)) h.f = hi.f;
    if (hi && typeof hi.tok === 'string') h.tok = hi.tok.slice(0, 16);
    this.emit('lobby', { n: this.humans.length, to: id });
    this.sendBlobs();
  }
  bset(id, d) {
    if (id !== this.ownerId || this.started || !d || typeof d !== 'object') return;
    const S = this.simOrProbe();
    if (typeof d.map === 'string' && S.hasMap(d.map)) this.map = d.map;
    if (typeof d.w === 'number') this.w = Math.max(-1, Math.min(9, d.w | 0));
    if (Array.isArray(d.tm)) d.tm.forEach((t, i) => { if (this.humans[i]) this.humans[i].tm = Math.max(0, Math.min(7, t | 0)); });
    if (Array.isArray(d.ais)) this.ais = d.ais.slice(0, 7).map(a => ({ f: S.FKEYS.includes(a && a.f) ? a.f : S.FKEYS[0], d: Math.max(0, Math.min(2, (a && a.d) | 0)), tm: Math.max(0, Math.min(7, (a && a.tm) | 0)) }));
    const mx = S.maxOf(this.map); if (this.humans.length + this.ais.length > mx) this.ais.length = Math.max(0, mx - this.humans.length);
    this.q++;
    const b = this.blob();
    if (d.start && b.ok) { this.startBattle(typeof d.seed === 'number' ? d.seed | 0 : (Math.random() * 1e9) | 0); return; }
    this.sendBlobs();
  }
  startBattle(seed) {
    const S = this.sim = this.probe || newSim(); this.probe = null;
    const mx = S.maxOf(this.map), hs = this.humans.slice(0, mx), as = this.ais.slice(0, mx - hs.length);
    const facs = [...hs.map(h => h.f), ...as.map(a => a.f)], tm = [...hs.map(h => h.tm | 0), ...as.map(a => a.tm | 0)];
    const aiD = [...hs.map(() => null), ...as.map(a => a.d | 0)];
    this.started = true; this.slots = hs.map(h => h.id); this.t0 = performance.now(); this.go = false; this.rd = this.rd || {};
    const r = S.start(this.room(), { seed, facs, tm, aiD, map: this.map, w: this.w, peers: hs.map(h => h.id), toks: hs.map(h => h.tok) });
    for (const [i, h] of hs.entries()) this.emit('start', { pv: S.pv, seed, facs, slot: i, to: h.id, map: r.map, tm, w: this.w, sv: 1 }, h.id);
    this.log.push(`started: ${facs.join(' vs ')} on ${r.map}, seed ${seed}`);
    // 60 Hz from a timer inside the room (no per-tick alarms); network tick after each batch of steps
    let last = performance.now(), acc = 0;
    this.loop = setInterval(() => {
      const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
      if (this.pause || this.dead) return;
      // hold the battle until every player is past the loading screen (presence rd:1), at most 20 s
      if (!this.go) { if (this.slots.every(id => this.rd[id]) || performance.now() - this.t0 > 20000) { this.go = true; this.log.push(`battle running after ${((performance.now() - this.t0) / 1000).toFixed(1)} s`); } else return; }
      acc += dt; let n = 0;
      try { while (acc >= 1 / 60 && n < 8) { S.step(1 / 60); acc -= 1 / 60; n++; } if (acc > 0.1) acc = 0; S.net(dt); }
      catch (e) { this.log.push('sim error: ' + (e && e.stack || e)); console.error('cfhost-standin: battle error', e); }
    }, 16);
  }
  // ---- sockets ----
  attach(ws, id, isOwner) {
    if (isOwner) this.ownerId = id;
    this.socks.set(id, ws);
    ws.send('!w ' + this.hostId);
    ws.on('message', (buf, isBin) => {
      if (isBin) return; const m = String(buf); if (m === 'ping') { ws.send('pong'); return; }
      for (const r of m.split('\n')) { const i = r.indexOf('|'); if (i < 0) continue; let d; try { d = JSON.parse(r.slice(i + 1)); } catch { continue; } this.onMsg(id, d); }
    });
    ws.on('close', () => { if (this.socks.get(id) !== ws) return; this.socks.delete(id); this.left(id); });
  }
  onMsg(id, m) {
    if (!m || typeof m !== 'object' || this.dead) return;
    if (m.k === 'p') {
      const p = m.p || {};
      if (!this.started) {
        if (p.hi && (this.lastN || (this.lastN = {}))[id] !== p.hi.n) { this.lastN[id] = p.hi.n; this.hello(id, p.hi); }
        if (typeof p.pg === 'number' && (this.lastPg || (this.lastPg = {}))[id] !== p.pg) { this.lastPg[id] = p.pg; this.emit('pong', { to: id, t: p.pg }, id); }
        return;
      }
      if (p.rd) (this.rd = this.rd || {})[id] = 1;
      this.sim.pres(id, p);
    } else if (m.k === 'e') {
      if (m.t === 'bset') this.bset(id, m.d);
      else if (m.t === 'hello' && !this.started) { /* the presence 'hi' carries the greeting */ }
      else if (m.t === 'cmd' && this.started) this.sim.cmd(id, m.d);
    }
  }
  left(id) {
    if (!this.started) {
      this.humans = this.humans.filter(h => h.id !== id);
      if (id === this.ownerId) this.ownerId = this.humans.length ? this.humans[0].id : null;
      this.sendBlobs(); return;
    }
    this.sim.gone(id);
  }
  close() { this.dead = true; clearInterval(this.loop); for (const ws of this.socks.values()) { try { ws.send('!l ' + this.hostId); } catch {} try { ws.close(4002, 'battle closed'); } catch {} } this.socks.clear(); }
}

export async function startStandin({ upstream, quiet = true } = {}) {
  const up = new URL(upstream);
  const battles = new Map();
  let busy = false;
  const wss = new WebSocketServer({ noServer: true });
  const refuse = (ws, why) => { try { ws.send('!e ' + why); ws.close(4000, why); } catch {} };
  const server = http.createServer((rq, rs) => { // plain HTTP: pass through to the local game server
    const p = http.request({ host: up.hostname, port: up.port, method: rq.method, path: rq.url, headers: rq.headers }, r => { rs.writeHead(r.statusCode, r.headers); r.pipe(rs); });
    p.on('error', () => { rs.writeHead(502); rs.end(); }); rq.pipe(p);
  });
  server.on('upgrade', (rq, sock, head) => {
    const u = new URL(rq.url, 'http://x');
    if (!u.pathname.startsWith('/battle/')) { // relay rooms and the game list: raw pass-through to wrangler dev
      const t = net.connect(+up.port, up.hostname, () => {
        t.write(`${rq.method} ${rq.url} HTTP/1.1\r\n` + Object.entries(rq.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n');
        if (head && head.length) t.write(head); t.pipe(sock); sock.pipe(t); });
      const end = () => { try { t.destroy(); } catch {} try { sock.destroy(); } catch {} }; t.on('error', end); sock.on('error', end);
      return;
    }
    wss.handleUpgrade(rq, sock, head, ws => {
      const code = decodeURIComponent(u.pathname.slice(8)).toLowerCase(), id = u.searchParams.get('id') || '', own = u.searchParams.get('own');
      if (!CODE_RE.test(code)) return refuse(ws, 'nohost');
      if (u.searchParams.get('role') !== 'client' || !ID_RE.test(id) || id.startsWith('ww3-') || own && !KEY_RE.test(own)) return refuse(ws, 'error');
      let B = battles.get(code);
      if (B && B.dead) { battles.delete(code); B = null; }
      if (!B) {
        if (!own) return refuse(ws, 'nohost');
        if (busy) return refuse(ws, 'busy');
        B = new Battle(code, own); battles.set(code, B);
        if (!quiet) console.log(`cfhost-standin: battle ${code} created`);
      } else if (own && own !== B.ownKey) return refuse(ws, 'taken');
      if (B.socks.has(id)) return refuse(ws, 'taken');
      if (!B.started && B.humans.length >= B.mx() && !B.humans.some(h => h.id === id)) return refuse(ws, 'full');
      B.attach(ws, id, !!own && !B.started); // the owner's key (checked above) makes this socket the owner again
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url, battles,
    setBusy(v) { busy = !!v; },
    kill(code) { const B = battles.get(code); if (B) { B.close(); battles.delete(code); } },
    stop() { for (const B of battles.values()) B.close(); try { wss.close(); } catch {} server.close(); },
  };
}
