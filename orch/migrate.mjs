// ORCH host-migration test: when the host closes the game mid-battle, does a client take over and the battle go on?
//
// Opens the game three times in one headless Chromium (HOST, CLIENT A, CLIENT B), connects them through the game's own
// lobby and room code (hostGame -> joinByCode x2 -> launchMP), and plays a 3-way free-for-all for ~2 game-minutes. All
// three sides play like people through doAct (the same path as clicks): each dozer builds a barracks and a war factory,
// infantry and tanks stay queued; the two clients' armies attack-move on each other, the host's holds the middle. Nobody's side is AI-run before the host leaves, so the takeover path is
// the real one.
//
// Then the host page is CLOSED (like closing the browser tab). What the game is meant to do (src/07b-ckpt.js,
// src/07-net.js clientReconnect / promoteToHost): the host sends a checkpoint of the whole battle to a standby player
// (the first connected client, here CLIENT A) every 8 s; when the host vanishes, CLIENT A restores the latest checkpoint
// and opens the follow-up room "<code>-m1"; CLIENT B reconnects there and keeps commanding its own army; the old host's
// army is handed to the AI (team.ai set, team.aiTook = 1).
//
// Checks (MIGRATE FAIL with reasons if any is broken):
//   before the host leaves: no page/console errors, the clients keep up, a strict settle check for both clients
//     (same style as mpsync.mjs), and CLIENT A holds a checkpoint;
//   takeover: CLIENT A becomes host within 60 s, CLIENT B reconnects to it within 90 s, the battle clock goes on, the
//     checkpoint was at most ~12 game-s old (that is how much of the battle is rolled back);
//   armies: every side still has most of the units it had when the host left; CLIENT B is still its own commander (not
//     AI-run, not marked disconnected); the old host's side is run by the AI and the AI actually plays it;
//   after the takeover: an order given on CLIENT B moves its units on the new host; strict settle checks right after
//     the takeover and again ~45 game-s later (every entity CLIENT B can see is on its screen at the same spot, same
//     kind/team/health, credits equal); the new host's simulation and CLIENT B's ticks never throw.
//
// How it connects without the internet: like mpsync.mjs, window.Peer is swapped for a stand-in with the PeerJS API that
// carries messages between the pages over a BroadcastChannel. A page that closes tells its peers its connections
// closed (as WebRTC does when a tab closes). With --abrupt it does not (power cut / network gone): the clients must
// notice from the silence (5 s) instead. Trystero (Nostr backup network) is switched off.
//
// The game servers (WW3_SERVER_URL, a Cloudflare Worker) are configured in the game, so like a real player's page each
// page uses them (game list, the host's relay room) besides PeerJS - but the test pages never reach the live servers:
// by default they talk to a LOCAL copy (`wrangler dev`, orch/serverdev.mjs; `npm ci` in server/ once), and any
// WebSocket to another host fails (serverdev.mjs guardContext).
//
// How it stays fast under SwiftShader: render loops are stopped; before the host leaves, the test drives the clocks in
// 0.1 s steps (host: 6 sim steps + netTick, then each client's clientTick). The takeover itself is real-time (timers,
// reconnect tries), so during it each page drives itself every 100 ms; once it is done the test goes back to stepping.
//
//   node orch/migrate.mjs                  # default: host leaves at 2 game-minutes, then 45 game-s more
//   node orch/migrate.mjs --minutes 1      # host leaves earlier
//   node orch/migrate.mjs --after 90       # play 90 game-s after the takeover
//   node orch/migrate.mjs --abrupt         # the host disappears without a goodbye (clients must time out)
//   node orch/migrate.mjs --no-lock        # skip the machine-wide browser lock (see browserlock.mjs)
//   node orch/migrate.mjs --server         # local game servers, P2P working (the default), plus checks on the server
//                                          # side: the old host's and the new host's relay rooms are open on it
//   node orch/migrate.mjs --server-down    # servers configured but unreachable (as when the Worker is down)
// Prints MIGRATE PASS / MIGRATE FAIL: reason (exit 0 / 1). Runtime ~5-8 min (mostly three pages building the map).
// Screenshots: orch/out/mig-before-host.png, orch/out/mig-after-newhost.png, orch/out/mig-after-client.png
// (latest run; each run also keeps its own in orch/out/runs/<timestamp>-migrate*/, see runs.mjs)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock, watchPeakMemory } from './browserlock.mjs';
import { newRun } from './runs.mjs';
import { startServer, guardContext, DEAD_SERVER } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const MINUTES = arg('minutes', 2), AFTER = arg('after', 45), ABRUPT = process.argv.includes('--abrupt');
const SRV_DOWN = process.argv.includes('--server-down'), SRV_CHECK = process.argv.includes('--server') && !SRV_DOWN;

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) {
    try { return req(p); } catch {}
  }
  throw new Error('playwright not found (npm i -g playwright, then npx playwright install chromium)');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux64', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch {}
  return undefined;
}

await acquireBrowserLock();
const peakMB = watchPeakMemory();
const SRV = SRV_DOWN ? null : await startServer();
console.log(SRV ? `game servers running locally at ${SRV.url}` : `game servers configured but down (${DEAD_SERVER})`);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`, URL0 = ORIGIN + '/index.html';

// ---- in-page stand-in for PeerJS (copied from mpsync.mjs, plus: a closing page says goodbye on its connections) ----
function fakePeerShim() {
  if (window.__fakePeer) return; window.__fakePeer = true;
  const BC = new BroadcastChannel('ww3-migrate'), local = new Map(), conns = new Map(), pending = new Map();
  const stats = window.__fpStats = { tx: 0, rx: 0, txB: 0, rxB: 0, dropped: 0 };
  const nonce = () => Math.random().toString(36).slice(2, 12);
  const post = m => { BC.postMessage(m); setTimeout(() => onMsg(m), 0); };
  const err = (type, msg) => Object.assign(new Error(msg || type), { type });
  class Em { constructor() { this._h = {}; } on(t, f) { (this._h[t] = this._h[t] || []).push(f); return this; } off(t, f) { this._h[t] = (this._h[t] || []).filter(x => x !== f); return this; }
    _emit(t, ...a) { for (const f of (this._h[t] || []).slice()) try { f(...a); } catch (e) { console.error(e); } } }
  class Conn extends Em {
    constructor(cid, owner, remote) { super(); this.cid = cid; this.owner = owner; this.peer = remote; this.open = false; this.reliable = true;
      this.serialization = 'json'; this.dataChannel = { bufferedAmount: 0 }; this.peerConnection = null; conns.set(cid + '@' + owner.id, this); }
    send(m) { if (!this.open) return; const s = JSON.stringify(m); stats.tx++; stats.txB += s.length; post({ k: 'd', cid: this.cid, to: this.peer, s }); }
    close() { this._closed(true); }
    _closed(tell) { if (!conns.has(this.cid + '@' + this.owner.id)) return; conns.delete(this.cid + '@' + this.owner.id); const was = this.open; this.open = false;
      if (tell) post({ k: 'x', cid: this.cid, to: this.peer }); if (was || tell) this._emit('close'); }
  }
  class FakePeer extends Em {
    constructor(id, opts) { super(); if (typeof id === 'object') id = null; this.id = id || 'fp-' + nonce(); this.open = false; this.destroyed = false; this.disconnected = false; this.options = opts || {};
      const n = nonce(); pending.set(n, () => { pending.delete(n); if (this.destroyed) return; this.destroyed = true; this._emit('error', err('unavailable-id', 'ID "' + this.id + '" is taken')); });
      if (local.has(this.id)) { setTimeout(() => pending.get(n) && pending.get(n)(), 0); return; }
      post({ k: 'who', id: this.id, n });
      setTimeout(() => { if (!pending.has(n)) return; pending.delete(n); if (this.destroyed) return;
        if (local.has(this.id)) { this.destroyed = true; this._emit('error', err('unavailable-id')); return; }
        local.set(this.id, this); this.open = true; this._emit('open', this.id); }, 150); }
    connect(rid) { const c = new Conn(nonce(), this, rid), key = 'c' + c.cid;
      pending.set(key, () => { pending.delete(key); c.open = true; c._emit('open'); });
      setTimeout(() => { if (!pending.has(key)) return; pending.delete(key); c._closed(false); this._emit('error', err('peer-unavailable', 'Could not connect to peer ' + rid)); }, 800);
      post({ k: 'conn', cid: c.cid, to: rid, from: this.id }); return c; }
    destroy() { if (this.destroyed) return; this.destroyed = true; this.open = false; if (local.get(this.id) === this) local.delete(this.id);
      for (const c of [...conns.values()]) if (c.owner === this) c.close(); this._emit('close'); }
    disconnect() {} reconnect() {}
  }
  function onMsg(m) {
    if (!m || typeof m !== 'object' || window.__fpDead) return;
    if (m.k === 'who') { const p = local.get(m.id); if (p && !p.destroyed) post({ k: 'have', n: m.n }); }
    else if (m.k === 'have') { const f = pending.get(m.n); if (f) f(); }
    else if (m.k === 'conn') { const p = local.get(m.to); if (!p || p.destroyed) return; const c = new Conn(m.cid, p, m.from); c.open = true;
      p._emit('connection', c); post({ k: 'ack', cid: m.cid, to: m.from }); setTimeout(() => c._emit('open'), 0); }
    else if (m.k === 'ack') { const f = pending.get('c' + m.cid); if (f) f(); }
    else if (m.k === 'd') { const c = conns.get(m.cid + '@' + m.to); if (!c || !c.open) return; if (window.__fpDrop) { stats.dropped++; return; }
      stats.rx++; stats.rxB += m.s.length; c._emit('data', JSON.parse(m.s)); }
    else if (m.k === 'x') { const c = conns.get(m.cid + '@' + m.to); if (c) c._closed(false); }
    else if (m.k === 'bye') { for (const c of [...conns.values()]) if (m.ids.includes(c.peer)) c._closed(false); }
  }
  BC.onmessage = ev => onMsg(ev.data);
  // closing the tab: WebRTC tells the other side its data channels closed (skipped when the test says --abrupt)
  // __fpGone(bye): this page drops off the network at once (its peer ids stop answering); with bye, every page holding a
  // connection to it sees that connection close
  window.__fpGone = (bye) => { const ids = [...local.keys()]; window.__fpDead = true; local.clear(); if (bye) BC.postMessage({ k: 'bye', ids }); return ids; };
  window.addEventListener('pagehide', () => { if (!window.__fpDead) window.__fpGone(!window.__fpAbrupt); });
  Object.defineProperty(window, 'Peer', { configurable: false, get: () => FakePeer, set: () => {} });
  Object.defineProperty(window, 'Trystero', { configurable: false, get: () => undefined, set: () => {} });
}

const fails = [], warns = [];
const fail = m => { fails.push(m); };
let crashed = () => {}; const crash = new Promise((_, rej) => { crashed = () => rej(new Error('a page crashed')); }); crash.catch(() => {});
async function shot(page, name) {
  try { await RUN.save(page, name, { timeout: 240000 }); }
  catch (e) { warns.push(`screenshot ${name} skipped: ${String(e.message || e).split('\n')[0]}`); }
}
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required',
    '--renderer-process-limit=1'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 } });
await guardContext(ctx, SRV ? SRV.url : DEAD_SERVER);
await ctx.addInitScript(fakePeerShim);
await ctx.route('**/*', r => r.request().url().startsWith(ORIGIN) || SRV && r.request().url().startsWith(SRV.url) ? r.continue() : r.abort());
let hostClosed = false;
async function openPage(tag) {
  const page = await ctx.newPage();
  page.on('crash', () => { fail(`${tag} page crashed (renderer killed - out of memory?)`); crashed(); });
  page.on('pageerror', e => { if (tag === 'host' && hostClosed) return; fail(`${tag} page error: ` + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')); });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (tag === 'host' && hostClosed) return;
    if (/ERR_FAILED|net::|Failed to load resource|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) warns.push(`${tag} console (ignored, offline/headless): ` + t.slice(0, 200));
    else fail(`${tag} console error: ` + t.slice(0, 300));
  });
  page.on('console', m => { if (m.type() === 'warning' && /checkpoint|p2p/i.test(m.text())) warns.push(`${tag} console warning: ` + m.text().slice(0, 200)); });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined' && typeof hostGame === 'function', null, { timeout: 120000 });
  return page;
}
const waitFor = (page, fn, arg, ms, what) => page.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).catch(() => { throw new Error('timed out waiting for ' + what); });

fs.mkdirSync(OUT, { recursive: true });
const RUN = newRun(ABRUPT ? 'migrate-abrupt' : 'migrate');
const t0 = Date.now();
const secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
const sample = a => a.slice(0, 4).join(', ') + (a.length > 4 ? ` (+${a.length - 4} more)` : '');
let host, cA, cB;

// ---- driving the clocks (test-stepped) ----
const hostRun = (pg, n) => pg.evaluate((n) => {
  try { for (let i = 0; i < n && G && !G.over; i++) { for (let s = 0; s < 6; s++) simUpdate(1 / 60); netTick(0.1); } }
  catch (e) { return { err: String(e && e.stack || e) }; }
  return { t: G.t, over: G.over };
}, n);
const clientRun = (pg, n) => pg.evaluate(async (n) => {
  await new Promise(r => setTimeout(r, 0));
  try { for (let i = 0; i < n && G; i++) clientTick(0.1); } catch (e) { return { err: String(e && e.stack || e) }; }
  return { t: G.t, snapT: NET.lastSnapT || 0 };
}, n);
// one 0.5 s step for the host page and every client page; returns false if something threw
async function step(hp, clients, n = 5) {
  const h = await hostRun(hp, n); if (h.err) { fail('host simulation threw: ' + h.err.split('\n').slice(0, 4).join(' | ')); return null; }
  let lag = 0;
  for (const c of clients) { const r = await clientRun(c, n); if (r.err) { fail('client tick threw: ' + r.err.split('\n').slice(0, 4).join(' | ')); return null; } lag = Math.max(lag, h.t - r.snapT); }
  return { t: h.t, over: h.over, lag };
}
// ---- what client slot k may see on the host page vs what it shows (same rules as mpsync.mjs) ----
const hostView = (hp, k) => hp.evaluate((k) => {
  const out = [];
  for (const e of G.ents) { if (e.dead) continue; const own = e.team === k, vis = own || !!(e.vs && e.vs[k]);
    if (!vis && !(e.isB && ((e.sn | 0) & (1 << k)))) continue;
    out.push([e.id, e.kind, e.team, Math.round(e.x), Math.round(e.y), Math.round(e.hp), e.isB ? 1 : 0, vis ? 1 : 0]); }
  return { t: G.t, list: out, credits: Math.floor(G.teams[k].credits), all: G.ents.filter(e => !e.dead).length };
}, k);
const clientView = (cp) => cp.evaluate(() => ({ t: NET.lastSnapT || 0, credits: G.teams[ME].credits,
  list: G.ents.filter(e => !e.dead && !e.gone).map(e => [e.id, e.kind, e.team, !e.isB && e.tx != null ? e.tx : e.x, !e.isB && e.ty != null ? e.ty : e.y, Math.round(e.hp), e.isB ? 1 : 0, e.mem ? 1 : 0, +((NET.lastSnapT || 0) - (e.seenAt || 0)).toFixed(2)]) }));
async function settleCheck(hp, cp, k, label) {
  await hp.evaluate((k) => { if (NET.kf) NET.kf[k] = 0; NET.snapT = 0; NET.teamT = 0; netTick(0.1); }, k);
  for (let i = 0; i < 4; i++) { await cp.waitForTimeout(150); await clientRun(cp, 1); await hp.evaluate(() => netTick(0.1)); }
  await cp.waitForTimeout(300); await clientRun(cp, 1);
  const H = await hostView(hp, k), C = await clientView(cp);
  const cm = new Map(C.list.map(a => [a[0], a])), hm = new Map(H.list.map(a => [a[0], a]));
  const missing = [], moved = [], wrong = [], extra = []; let ownMissing = 0, vis = 0;
  for (const h of H.list) {
    if (!h[7]) continue; vis++; const c = cm.get(h[0]);
    if (!c) { missing.push(`${h[1]}#${h[0]}(team ${h[2]})`); if (h[2] === k) ownMissing++; continue; }
    const d = Math.hypot(c[3] - h[3], c[4] - h[4]);
    if (d > 2) moved.push(`${h[1]}#${h[0]} off by ${d.toFixed(1)}`);
    if (c[2] !== h[2] || c[1] !== h[1] || Math.abs(c[5] - h[5]) > 1) wrong.push(`${h[1]}#${h[0]} client ${c[1]}/team ${c[2]}/hp ${c[5]} vs host ${h[1]}/team ${h[2]}/hp ${h[5]}`);
  }
  for (const c of C.list) if (!hm.has(c[0]) && !c[7]) extra.push(`${c[1]}#${c[0]}(team ${c[2]}, last seen ${c[8]} s before)`);
  const own = H.list.filter(h => h[2] === k).length;
  console.log(`[${secs()}] ${label} t=${H.t.toFixed(0)}s: host ${H.all} entities, slot ${k} sees ${vis} (own ${own}); its screen has ${C.list.length}; ` +
    `missing ${missing.length}, extra ${extra.length}, off-position ${moved.length}, mismatched ${wrong.length}; credits host ${H.credits} client ${C.credits}`);
  if (ownMissing) fail(`${label}: ${ownMissing} of slot ${k}'s own entities are missing on its screen: ${sample(missing)}`);
  else if (missing.length > Math.max(1, vis * .02)) fail(`${label}: ${missing.length}/${vis} visible entities missing on slot ${k}'s screen: ${sample(missing)}`);
  if (moved.length > Math.max(1, vis * .02)) fail(`${label}: ${moved.length} entities at the wrong position on slot ${k}'s screen: ${sample(moved)}`);
  if (wrong.length > Math.max(1, vis * .02)) fail(`${label}: ${wrong.length} entities differ (kind/team/health) on slot ${k}'s screen: ${sample(wrong)}`);
  if (extra.length > Math.max(2, vis * .03)) fail(`${label}: ${extra.length} entities on slot ${k}'s screen that the host no longer has in view: ${sample(extra)}`);
  if (Math.abs(H.credits - C.credits) > 1) fail(`${label}: slot ${k} credits differ: host ${H.credits}, client ${C.credits}`);
  if (H.t - C.t > .3) fail(`${label}: slot ${k}'s latest state is ${(H.t - C.t).toFixed(1)} s behind the host after settling`);
  if (H.t - C.t > .3 || ownMissing || Math.abs(H.credits - C.credits) > 1) await netDiag(label);
}
// ---- network diagnostics: what the host thinks of each client, and what each client has received (printed at key
// moments and whenever a check fails, so a failure says WHY the clients fell behind) ----
const hostNet = (hp) => hp.evaluate(() => { const now = performance.now();
  return { t: +G.t.toFixed(1), loading: !!window.LOADING, paused: !!G.paused, fp: window.__fpStats, slots: [1, 2].map(k => { const p = NET.peers && NET.peers[k];
    return { k, peer: p || null, seenAgo: p && NET.seen && NET.seen[p] ? Math.round(now - NET.seen[p]) : null, disc: G.teams[k].discT || 0, ai: !!G.teams[k].ai,
      aiTook: !!G.teams[k].aiTook, buf: p && NET.game && NET.game.buffered ? NET.game.buffered(p) : null, snapTo: NET.snapTo ? NET.snapTo[k] : null }; }),
    sb: NET.sbSlot, ckOut: !!NET.ckOut }; });
const clientNet = (cp) => cp.evaluate(() => ({ me: typeof ME !== 'undefined' ? ME : null, mode: MODE, loading: !!window.LOADING, paused: !!(G && G.paused), t: G ? +G.t.toFixed(1) : null,
  snapT: NET.lastSnapT || 0, rxAgo: NET.lastRx ? Math.round(performance.now() - NET.lastRx) : null, recon: !!NET.recon, myPeer: NET.myPeer, hostPeer: NET.hostPeer,
  sb: !!NET.isStandby, ck: !!NET.lastCk, ents: G ? G.ents.length : 0, fp: window.__fpStats, trace: (window.__trace || []).slice(-6) })).catch(e => ({ err: String(e).slice(0, 120) }));
async function netDiag(label) {
  try {
    if (host) console.log(`    [net ${label}] host: ` + JSON.stringify(await hostNet(host)));
    for (const [p, n] of [[cA, 'A'], [cB, 'B']]) if (p) console.log(`    [net ${label}] client ${n}: ` + JSON.stringify(await clientNet(p)));
  } catch (e) { console.log(`    [net ${label}] diagnostics failed: ${String(e).split('\n')[0]}`); }
}
// a side plays like a person: units attack-move on an enemy base, production kept busy (doAct = the click path)
const playSide = (pg, target) => pg.evaluate((target) => {
  const T = G.teams[ME];
  // keep the barracks and war factory busy (infantry, anti-tank, tanks), like a player would
  try { const want = { barracks: ['inf', 'inf', 'at'], factory: ['tank', 'tank'] };
    for (const c in want) if (T.q[c].length < 2) for (const k of want[c]) doAct({ t: 'q', k }); } catch (e) {}
  const us = G.ents.filter(e => e.team === ME && !e.isB && !e.dead && e.kind !== 'dozer' && e.kind !== 'harv');
  if (us.length && target) doAct({ t: 'go', ids: us.map(e => e.id), x: target[0], y: target[1], mode: 'amove' });
  return us.length;
}, target);
const baseOf = (hp, k) => hp.evaluate((k) => { const b = G.ents.filter(e => e.team === k && e.isB && !e.dead); if (!b.length) return null;
  return [b.reduce((s, e) => s + e.x, 0) / b.length, b.reduce((s, e) => s + e.y, 0) / b.length]; }, k);
const armies = (hp) => hp.evaluate(() => ({ t: G.t, teams: G.teams.map(T => ({ ids: G.ents.filter(e => e.team === T.id && !e.dead).map(e => e.id), credits: Math.floor(T.credits),
  ai: !!T.ai, aiTook: !!T.aiTook, disc: T.discT || 0, out: !!T.out, q: CATS.reduce((s, c) => s + T.q[c].length, 0), bi: T.ai ? T.ai.bi : null })) }));
async function screenshot(pg, name) {
  await pg.evaluate(() => { try { updateUI(); renderFrame(0.016); } catch (e) { console.warn(e); } });
  await shot(pg, name);
}
// pages drive themselves in real time (used while the takeover runs: reconnect tries and timers are real-time)
const selfDrive = (pg, on) => pg.evaluate((on) => {
  window.__drive = on;
  if (on && !window.__driveI) window.__driveI = setInterval(() => { if (!window.__drive || !G || G.over) return;
    try { if (MODE === 'host') { for (let s = 0; s < 6; s++) simUpdate(1 / 60); netTick(0.1); } else if (MODE === 'client') clientTick(0.1); }
    catch (e) { window.__driveErr = window.__driveErr || String(e && e.stack || e).split('\n').slice(0, 4).join(' | '); } }, 100);
}, on);

// trace a client page's reconnect steps (room joins and their outcome); reset=true starts a fresh trace
const traceOn = (pg, reset) => pg.evaluate((reset) => {
  if (!window.__trace) { const T = window.__trace = []; window.__traceT0 = performance.now(); const at = () => ((performance.now() - window.__traceT0) / 1000).toFixed(1);
    const rj = NET.room.join; NET.room.join = async (n, o) => { T.push(at() + ' join ' + n); try { const r = await rj(n, o); T.push(at() + ' joined ' + n + ' via ' + r.via); return r; } catch (e) { T.push(at() + ' join failed ' + n + ': ' + (e && e.type || e)); throw e; } };
    const cr = clientReconnect; clientReconnect = async () => { T.push(at() + ' clientReconnect' + (NET.recon ? ' (already running)' : '')); const r = await cr(); T.push(at() + ' clientReconnect done, mode ' + MODE); return r; };
    const ph = promoteToHost; promoteToHost = async () => { T.push(at() + ' promoteToHost'); const r = await ph(); T.push(at() + ' promoteToHost -> ' + r); return r; };
    const ap = applySnap; let n = 0; applySnap = (d) => { if (!NET.recon) n = 0; else if (n++ < 3) T.push(at() + ' snapshot t=' + d.t + ' while reconnecting'); return ap(d); }; }
  if (reset) { window.__trace.length = 0; window.__traceT0 = performance.now(); }
}, reset);

async function main() {
  [host, cA, cB] = await Promise.all([openPage('host'), openPage('clientA'), openPage('clientB')]);
  await Promise.all([host, cA, cB].map(p => p.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 240000 }).catch(() => warns.push('3D models still loading after 240s'))));
  console.log(`[${secs()}] three pages loaded`);

  // ---- lobby: host opens a game, both clients join by its code, host starts a 3-way free-for-all ----
  await waitFor(host, () => !!NET.room, null, 30000, 'the host page to set up its network room');
  const code = await host.evaluate(async () => { try { initAudio(); } catch (e) {} setup.p = 'US';
    // a battle hosted in this browser (with the servers, "Play online" goes to Cloudflare)
    await Promise.race([typeof hostBrowser === 'function' ? hostBrowser() : hostGame(), new Promise(r => setTimeout(r, 20000))]); return NET.game ? NET.code : null; });
  if (!code) throw new Error('host could not open a game (NET.code empty; fake transport not picked up?)');
  console.log(`[${secs()}] host lobby open, code ${code}`);
  await cA.evaluate((c) => { try { initAudio(); } catch (e) {} setup.p = 'RU'; joinByCode(c); }, code);
  await waitFor(host, () => NET.lobby && NET.lobby.length === 1, null, 60000, 'client A to appear in the host lobby');
  await waitFor(cA, () => /Joined/.test(document.getElementById('mpstatus').textContent), null, 30000, 'client A to see "Joined"');
  await cB.evaluate((c) => { try { initAudio(); } catch (e) {} setup.p = 'CN'; joinByCode(c); }, code);
  await waitFor(host, () => NET.lobby && NET.lobby.length === 2, null, 60000, 'client B to appear in the host lobby');
  await waitFor(cB, () => /Joined/.test(document.getElementById('mpstatus').textContent), null, 30000, 'client B to see "Joined"');
  for (const p of [host, cA, cB]) await p.evaluate(() => { window.__stopLoop = true; });
  const facs = await host.evaluate(() => { NET.tm = [0, 1, 2]; NET.ais = []; launchMP(); return G && G.teams.map(T => T.fac); });
  if (!facs) throw new Error('host battle did not start (launchMP)');
  for (const [p, n] of [[cA, 'client A'], [cB, 'client B']]) await waitFor(p, () => MODE === 'client' && G && G.teams && G.teams.length > 2, null, 300000, n + ' to enter the battle');
  const slots = [await cA.evaluate(() => ME), await cB.evaluate(() => ME)], map = await host.evaluate(() => G.mapKey);
  console.log(`[${secs()}] battle: ${facs.join(' vs ')} on ${map}; client A is slot ${slots[0]}, client B slot ${slots[1]}`);
  if (slots[0] !== 1 || slots[1] !== 2) throw new Error(`unexpected slots ${slots} (expected client A = 1, client B = 2)`);
  for (const p of [cA, cB]) await traceOn(p, false);
  await netDiag('battle start');

  // ---- phase 1: ~MINUTES game-minutes, three human-style sides, test-stepped ----
  for (let i = 0; i < 10; i++) if (!await step(host, [cA, cB])) return;
  await netDiag('t=5s');
  const bases = [await baseOf(host, 0), await baseOf(host, 1), await baseOf(host, 2)];
  // each side's dozer builds a barracks and then a war factory near its HQ (spots asked from the host, read-only)
  const spotNear = (k, kind) => host.evaluate(([k, kind]) => { const hq = G.ents.find(e => e.team === k && e.isB && !e.dead); if (!hq) return null;
    for (let r = 60; r < 400; r += 20) for (let a = 0; a < 16; a++) { const x = hq.x + Math.cos(a / 16 * 6.283) * r, y = hq.y + Math.sin(a / 16 * 6.283) * r;
      if (validSpot(k, kind, x, y)) return [Math.round(x), Math.round(y)]; } return null; }, [k, kind]);
  const build = async (kind) => { for (const [pg, k] of [[host, 0], [cA, 1], [cB, 2]]) { const sp = await spotNear(k, kind);
    if (sp) await pg.evaluate(([x, y, kind]) => { const dz = G.ents.find(e => e.team === ME && e.kind === 'dozer' && !e.dead); doAct({ t: 'bld', k: kind, x, y, dz: dz ? dz.id : 0 }); }, [...sp, kind]);
    else warns.push(`no legal ${kind} spot near slot ${k}'s HQ`); } };
  await build('barracks');
  // the clients fight each other; the host builds up and holds the middle, so it still has an army when it leaves
  const mid = bases[0] && bases[1] && bases[2] ? [(bases[0][0] * 2 + bases[1][0] + bases[2][0]) / 4, (bases[0][1] * 2 + bases[1][1] + bases[2][1]) / 4] : null;
  const orders = async () => { await playSide(host, mid); await playSide(cA, bases[2]); await playSide(cB, bases[1]); };
  await orders();
  await host.waitForTimeout(1200);
  const total = Math.round(MINUTES * 600); let ticks = 50, lagMax = 0;
  while (ticks < total) {
    const s = await step(host, [cA, cB]); if (!s) return; ticks += 5;
    if (ticks >= 100) lagMax = Math.max(lagMax, s.lag);
    if (s.over) throw new Error(`the battle ended before the host left (t=${s.t.toFixed(0)}s); nothing to migrate`);
    if (ticks === 100 || ticks === 300) await netDiag(`t=${s.t.toFixed(0)}s`);
    if (ticks === 400) await build('factory');
    if (ticks % 150 === 0) await orders();
    if (ticks === 600) { await settleCheck(host, cA, 1, 'before: client A @1 min'); await settleCheck(host, cB, 2, 'before: client B @1 min'); }
  }
  if (lagMax > 1.5) fail(`before the host left, a client fell ${lagMax.toFixed(1)} game-s behind`);
  // make sure the standby holds a checkpoint newer than ~8 s (one is sent every 8 game-s)
  for (let i = 0; i < 40; i++) { const ok = await cA.evaluate(() => !!(NET.isStandby && NET.lastCk)); if (ok) break; if (!await step(host, [cA, cB])) return; ticks += 5; }
  const ck = await cA.evaluate(async () => { if (!NET.lastCk) return null; try { const c = await ckUnpack(NET.lastCk); return { t: c.g.t, kb: Math.round(NET.lastCk.length / 1024), n: c.ents.length }; } catch (e) { return { err: String(e) }; } });
  const ckB = await cB.evaluate(() => !!NET.lastCk);
  if (!ck) { await netDiag('no checkpoint'); fail('client A (the standby) never received a checkpoint from the host, so nobody can take over'); return; }
  if (ck.err) { fail('client A\'s checkpoint cannot be unpacked: ' + ck.err); return; }
  if (ckB) warns.push('client B also holds a checkpoint (only one standby expected)');
  for (const p of [cA, cB]) await traceOn(p, false);
  // the test (not the game) freezes the host while it draws and photographs the page; a real host never stops sending.
  // Keep the clients' 'host lost' watchdog (5 s without word -> reconnect) from mistaking that freeze for a lost host
  // (same as mpsync.mjs), then let it count normally again.
  for (const p of [cA, cB]) await p.evaluate(() => { NET.lastRx = performance.now() + 120000; });
  await screenshot(host, 'mig-before-host.png');
  for (const p of [cA, cB]) await p.evaluate(() => { NET.lastRx = performance.now(); });
  // the slow screenshot frame stalls the host for several real seconds, which the clients take for a lost host (they
  // start reconnecting after 5 s of silence). Play on until both are settled again, so the host leaves a calm battle.
  let calm = false;
  for (let i = 0; i < 40 && !calm; i++) { if (!await step(host, [cA, cB], 2)) return; await host.waitForTimeout(250);
    const r = await Promise.all([cA, cB].map(p => p.evaluate(() => !NET.recon && performance.now() - (NET.lastRx || 0) < 1000)));
    const h = await host.evaluate(() => [1, 2].every(k => !G.teams[k].discT && !G.teams[k].ai && NET.peers[k]));
    calm = r[0] && r[1] && h; }
  for (const [p, n] of [[cA, 'A'], [cB, 'B']]) console.log(`    trace client ${n} (screenshot stall): ` + (await p.evaluate(() => window.__trace.join(' | ') +
      ` || now: ${MODE}${NET.recon ? ' reconnecting' : ''} via=${NET.game && NET.game.via} ws=${!!(NET.game && NET.game._ws)} rxAgo=${Math.round(performance.now() - (NET.lastRx || 0))}`)));
  if (!calm) { fail('after the pre-takeover screenshot the clients did not settle back onto the host within ~10 s');
    console.log('    host sees: ' + await host.evaluate(() => JSON.stringify([1, 2].map(k => ({ peer: NET.peers[k], disc: G.teams[k].discT || 0, ai: !!G.teams[k].ai })))));
    return; }
  const pre = await armies(host);
  if (SRV_CHECK) { const w = await host.evaluate(() => !!(NET.game && NET.game._ws && NET.game._ws.readyState === 1));
    console.log(`[${secs()}] --server: the host's relay room on the local server is ${w ? 'open' : 'NOT open'}`);
    if (!w) fail('--server: the host never opened its relay room on the (local) game server'); }
  console.log(`[${secs()}] host leaves at t=${pre.t.toFixed(1)}s; standby checkpoint from t=${ck.t.toFixed(1)}s (${ck.kb} KB, ${ck.n} entities); ` +
    `armies ${pre.teams.map((T, i) => `${facs[i]} ${T.ids.length}`).join(', ')}`);

  // ---- phase 2: the host closes its tab; the pages run themselves in real time while the takeover happens ----
  await selfDrive(cA, true); await selfDrive(cB, true);
  // closing a tab closes its WebRTC data channels, which the other side notices at once: say goodbye explicitly (a
  // message posted from pagehide is not reliably delivered while the page is torn down). --abrupt: no goodbye.
  for (const p of [cA, cB]) await traceOn(p, true);
  hostClosed = true; const tc = Date.now();
  await host.evaluate((abrupt) => window.__fpGone(!abrupt), ABRUPT);
  await host.waitForTimeout(300); // let the goodbye leave before the page is torn down
  await host.close({ runBeforeUnload: false });
  host = null;
  // timeline of the takeover as each remaining page sees it (printed on change)
  const tl = { on: true, last: {} }, tlState = (p) => p.evaluate(() => `${MODE}${NET.recon ? ' reconnecting' : ''} room=${NET.code === 'join' ? (NET.hostPeer || '?') : NET.code} gen=${NET.gen || 0}${NET.game ? '' : ' (no room)'}`).catch(() => null);
  (async () => { while (tl.on) { for (const [p, n] of [[cA, 'A'], [cB, 'B']]) { const v = await tlState(p); if (v && v !== tl.last[n]) { tl.last[n] = v; console.log(`    +${((Date.now() - tc) / 1000).toFixed(1)}s client ${n}: ${v}`); } }
    await new Promise(r => setTimeout(r, 200)); } })();
  const noticed = await cA.waitForFunction(() => NET.recon || MODE === 'host', null, { timeout: 30000, polling: 100 }).then(() => (Date.now() - tc) / 1000, () => null);
  console.log(`[${secs()}] client A noticed the host was gone after ${noticed == null ? 'more than 30' : noticed.toFixed(1)} s${ABRUPT ? ' (abrupt: no goodbye)' : ''}`);
  if (!ABRUPT && noticed != null && noticed > 3) warns.push(`the clients took ${noticed.toFixed(1)} s to notice a closed host tab (expected ~0 s from the closed connection)`);
  try { await waitFor(cA, () => MODE === 'host', null, 60000, 'client A to take over as host'); }
  catch (e) { const st = await cA.evaluate(() => ({ mode: MODE, recon: !!NET.recon, sb: !!NET.isStandby, ck: !!NET.lastCk, gen: NET.gen, err: window.__driveErr || null })).catch(() => null);
    fail(`client A did not become the host within 60 s after the host left (${JSON.stringify(st)})`); return; }
  const tHost = (Date.now() - tc) / 1000;
  const restored = await cA.evaluate(() => ({ t: G.t, code: NET.code, gen: NET.gen }));
  console.log(`[${secs()}] client A is the new host after ${tHost.toFixed(1)} s (room ${restored.code}, battle resumed from t=${restored.t.toFixed(1)}s)`);
  const roll = pre.t - restored.t;
  if (roll > 12.5) fail(`the takeover rolled the battle back ${roll.toFixed(1)} game-s (checkpoints should be at most ~8 s old)`);
  try { await waitFor(cB, (room) => MODE === 'client' && !NET.recon && NET.hostPeer === 'ww3-' + room && performance.now() - (NET.lastRx || 0) < 2000, restored.code, 90000, 'client B to reconnect to the new host'); }
  catch (e) { const st = await cB.evaluate(() => ({ mode: MODE, recon: !!NET.recon, hostPeer: NET.hostPeer, gen: NET.gen, rxAgo: Math.round(performance.now() - (NET.lastRx || 0)) })).catch(() => null);
    fail(`client B did not reconnect to the new host within 90 s (${JSON.stringify(st)})`); return; }
  const tB = (Date.now() - tc) / 1000;
  console.log(`[${secs()}] client B reconnected to the new host ${tB.toFixed(1)} s after the host left`);
  tl.on = false;
  for (const [p, n] of [[cA, 'A'], [cB, 'B']]) console.log(`    trace client ${n}: ` + (await p.evaluate(() => window.__trace.join(' | '))));
  await cA.waitForTimeout(5000); // a few real seconds of the new host running on its own
  if (SRV_CHECK) { const w = await cA.waitForFunction(() => !!(NET.game && NET.game._ws && NET.game._ws.readyState === 1), null, { timeout: 20000, polling: 250 }).then(() => true, () => false);
    console.log(`[${secs()}] --server: the new host's relay room ${restored.code} on the local server is ${w ? 'open' : 'NOT open'}`);
    if (!w) fail(`--server: the new host did not open its relay room ${restored.code} on the (local) game server`); }
  for (const p of [cA, cB]) await selfDrive(p, false);
  for (const [p, n] of [[cA, 'new host (client A)'], [cB, 'client B']]) { const e = await p.evaluate(() => window.__driveErr || null); if (e) fail(`${n} threw while running during the takeover: ${e}`); }

  // ---- phase 3: back to test-stepping; check armies, ownership, orders and sync ----
  const post = await armies(cA);
  if (!(post.t > restored.t)) fail(`the battle clock did not advance after the takeover (t=${post.t.toFixed(1)})`);
  if (post.t < pre.t - 12.5) warns.push(`new host clock ${post.t.toFixed(1)} s is behind the old host's ${pre.t.toFixed(1)} s`);
  for (let k = 0; k < 3; k++) {
    const before = new Set(pre.teams[k].ids), kept = post.teams[k].ids.filter(id => before.has(id)).length;
    console.log(`[${secs()}]   ${facs[k]} (slot ${k}): ${kept}/${before.size} of its pre-takeover entities are on the new host, ${post.teams[k].ids.length} in all; ` +
      `${post.teams[k].ai ? 'AI-run' + (post.teams[k].aiTook ? ' (took over)' : '') : 'player-run'}${post.teams[k].disc ? ', marked disconnected' : ''}`);
    if (!pre.teams[k].out && kept < before.size * .6) fail(`${facs[k]} (slot ${k}) lost its army in the takeover: only ${kept} of ${before.size} entities made it to the new host`);
  }
  const T0 = post.teams[0], T2 = post.teams[2], T1 = post.teams[1];
  if (!T0.out && !(T0.ai && T0.aiTook)) fail(`the old host's side (${facs[0]}) is not handed to the AI on the new host (ai=${T0.ai}, aiTook=${T0.aiTook})`);
  if (T1.ai || T1.disc) fail(`the new host's own side is AI-run or marked disconnected (ai=${T1.ai}, disc=${T1.disc})`);
  if (T2.ai || T2.disc) fail(`client B's side is not back under client B's command (ai=${T2.ai}, marked disconnected at t=${T2.disc})`);
  const ok2 = await cA.evaluate(() => ({ peers: NET.peers, live: NET.peers.filter(Boolean).length }));
  if (!ok2.peers[2]) fail('the new host has no connection recorded for client B (NET.peers[2] empty)');

  await settleCheck(cA, cB, 2, 'after: client B right after the takeover');
  // client B gives an order on its own screen; it must reach the new host
  const target = bases[1] || bases[0]; // toward client A, the new host
  const ord = await cB.evaluate((t) => { let us = G.ents.filter(e => e.team === ME && !e.isB && !e.dead && e.kind !== 'dozer' && e.kind !== 'harv');
    if (!us.length) us = G.ents.filter(e => e.team === ME && !e.isB && !e.dead && e.kind === 'dozer' && !e.building);
    if (!us.length) return { n: 0 }; doAct({ t: 'go', ids: us.map(e => e.id), x: t[0], y: t[1], mode: 'move' }); return { n: us.length, ids: us.map(e => e.id) }; }, target);
  const posOf = (ids) => cA.evaluate((ids) => ids.map(id => { const e = G.byId.get(id); return e ? [e.x, e.y] : null; }), ids);
  const before = ord.n ? await posOf(ord.ids) : [];
  await cA.waitForTimeout(1500);
  const aiT0 = { bi: T0.bi, ids: new Set(T0.ids) };
  const steps = Math.round(AFTER * 2); let lag2 = 0, orderChecked = false;
  for (let i = 0; i < steps; i++) {
    const s = await step(cA, [cB]); if (!s) return; if (i > 10) lag2 = Math.max(lag2, s.lag);
    if (!orderChecked && i >= 40 && ord.n) { orderChecked = true; const after = await posOf(ord.ids);
      const moved = after.filter((a, j) => a && before[j] && Math.hypot(a[0] - before[j][0], a[1] - before[j][1]) > 15).length;
      console.log(`[${secs()}] client B order after the takeover: ${moved}/${ord.n} of its units moved on the new host`);
      if (!moved) fail('an order given on client B after the takeover never reached the new host (none of its units moved)'); }
    if (s.over) { console.log(`[${secs()}] battle ended at t=${s.t.toFixed(0)}s`); break; }
    if (i % 60 === 59) await playSide(cB, bases[1]);
  }
  if (!ord.n) warns.push('client B had no units after the takeover, so the order round-trip was not tested');
  if (lag2 > 1.5) fail(`after the takeover, client B fell ${lag2.toFixed(1)} game-s behind the new host`);
  // the AI must actually be playing the old host's side
  const end = await armies(cA), E0 = end.teams[0];
  const fresh = E0.ids.filter(id => !aiT0.ids.has(id)).length;
  console.log(`[${secs()}] old host's side after ${AFTER} game-s under the AI: build step ${aiT0.bi} -> ${E0.bi}, ${fresh} new entities, ${E0.q} in production, $${E0.credits}`);
  if (!E0.out && E0.ai && E0.bi === aiT0.bi && !fresh && !E0.q) fail(`the AI took over the old host's side but did nothing with it in ${AFTER} game-s (no building, no production, no new units)`);
  if (end.teams[2].ai || end.teams[2].disc) fail(`by the end client B's side was AI-run / marked disconnected (ai=${end.teams[2].ai}, disc=${end.teams[2].disc})`);
  await settleCheck(cA, cB, 2, `after: client B ${AFTER} game-s after the takeover`);
  await screenshot(cA, 'mig-after-newhost.png');
  await screenshot(cB, 'mig-after-client.png');
}
try { await Promise.race([main(), crash]); } catch (e) {
  fail(String(e && e.message || e));
  if (!/crashed/.test(fails.join(' '))) for (const [p, n] of [[host, 'mig-before-host.png'], [cA, 'mig-after-newhost.png'], [cB, 'mig-after-client.png']]) if (p) await shot(p, n);
}
await browser.close().catch(() => {});
server.close();
if (SRV) SRV.stop();

{ const mb = peakMB(); if (mb) console.log(`peak memory (node + browser, summed RSS): ${mb} MB`); }
for (const w of [...new Set(warns)].slice(0, 12)) console.log('  warn: ' + w);
const MODE_TXT = SRV_DOWN ? ', game servers down' : ', local game servers';
const uniq = [...new Set(fails)];
if (uniq.length) {
  console.log(`\nMIGRATE FAIL: ${uniq[0]} (${secs()})`);
  for (const f of uniq.slice(1, 20)) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`\nMIGRATE PASS${ABRUPT ? ' (abrupt host loss)' : ''}${MODE_TXT} (${secs()}) — screenshots orch/out/mig-before-host.png, orch/out/mig-after-newhost.png, orch/out/mig-after-client.png (this run: ${RUN.rel}/)`);
process.exit(0);
