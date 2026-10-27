// ORCH multiplayer sync test: does a client see the same battle the host is running?
//
// Opens the game twice in one headless Chromium (a HOST page and a CLIENT page), connects them through the game's own
// lobby and room code (hostGame -> joinByCode -> launchMP), and plays host vs client (optionally + computer players)
// for a few game-minutes. The host's own side is run by the normal AI; the client plays like a person through doAct
// (the same path as clicks): its infantry attack-move on the host base, its dozer builds a barracks, it keeps
// production queued. Replaces the old t8.py check.
//
// How it connects without the internet: the online edition talks through PeerJS (window.Peer). Before the page loads,
// this test swaps window.Peer for a small stand-in with the same API (open / connection / connect / data / close /
// error, unavailable-id and peer-unavailable errors) that carries messages between the two pages over a
// BroadcastChannel, JSON-encoded like the real wire. Trystero (the Nostr backup network) is switched off. No game code
// is modified: the lobby directory, hello/start handshake, presence-borne client orders, delta snapshots, keep-alives,
// team panels and event bundles all run as in a real match. (Not covered: real WebRTC, packet loss, host migration.)
//
// How it stays fast under SwiftShader: both pages' render loops are stopped (window.__stopLoop) before the battle
// starts, and the test drives time itself in 0.1 s steps: the host runs 6 fixed 60 Hz sim steps + netTick, then the
// client runs clientTick. Nothing is drawn (and no GPU textures uploaded) until the two screenshots at the end.
//
// Checks: no page/console errors or crashes on either page; the client's newest snapshot stays within 1.5 game-s of
// the host clock; a client order reaches the host (its units move); every 10 game-s a loose live comparison; and at
// 1, 2.5 and N minutes (and when the battle ends) a strict "settle" check - host paused, a full keyframe flushed -
// in which every entity the client's side can see on the host is on the client at the same spot (+-2 m), same
// kind/team/health, nothing stale lingers, and the client's credits match the host's.
//
// Runtime: ~3-5 min, almost all of it the two pages building the map under SwiftShader; the battle itself takes ~30 s.
//
//   node orch/mpsync.mjs                       # default: 4 game-minutes, host (AI-driven) vs client
//   node orch/mpsync.mjs --minutes 5 --ais 1   # longer, with a computer player added in the lobby
//   node orch/mpsync.mjs --break               # self-test: the client stops receiving at 1 min; must print MPSYNC FAIL
//   node orch/mpsync.mjs --verbose             # print both pages' network state every 5 s while connecting
//   node orch/mpsync.mjs --no-lock             # skip the machine-wide browser lock (see browserlock.mjs)
//   node orch/mpsync.mjs --reconnect           # (default in the plain run; --no-reconnect skips it) at 1 min the client's connection is cut both ways for 12 game-s, then
//                                              # it must reconnect and keep its army (the AI must not take over after
//                                              # 30 s); right after, a strict check: own units, what it sees of the
//                                              # enemy and its credits match the host exactly
//   node orch/mpsync.mjs --artifact            # the claude.ai artifact edition (python3 orch/build.py --artifact
//                                              # first): pages talk over a stand-in for the artifact `room`
//                                              # capability (orch/artifact-harness.mjs) instead of PeerJS
//   node orch/mpsync.mjs --server              # through the World War 3 servers (server/, run locally with
//                                              # wrangler dev; `npm ci` in server/ once): browser-to-browser is
//                                              # blocked in both pages, so the game's own fallback must pick the
//                                              # server relay; also checks the server game list (the client must see
//                                              # the host's game before joining by code). Runs the battle in real
//                                              # time (~4 min). With --reconnect the client's server connection is
//                                              # really cut at 1 min. Writes relay traffic to orch/out/srv-traffic*.json
// Prints MPSYNC PASS / MPSYNC FAIL: reason (exit 0 / 1). Screenshots: orch/out/mp-host.png, orch/out/mp-client.png
// (latest run; each run also keeps its own in orch/out/runs/<timestamp>-mpsync*/, see runs.mjs)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock, watchPeakMemory } from './browserlock.mjs';
import { artifactHtml, artifactHandler, threeJs, THREE_CDN, roomStub, roomTopics, judgeRoomStats } from './artifact-harness.mjs';
import { startServer, guardContext, DEAD_SERVER } from './serverdev.mjs';
import zlib from 'node:zlib';
import { newRun } from './runs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const MINUTES = arg('minutes', 4), AIS = Math.max(0, Math.min(6, arg('ais', 0))), BREAK = process.argv.includes('--break');
const ART = process.argv.includes('--artifact') ? { html: artifactHtml(), three: threeJs() } : null;
const SRV_MODE = process.argv.includes('--server') && !ART;
// the reconnect check runs by default in the plain (browser-to-browser) run, so the ship gate always covers it
const PFX = ART ? 'art-' : SRV_MODE ? 'srv-' : '', RECON = process.argv.includes('--reconnect') || (!ART && !SRV_MODE && !BREAK && !process.argv.includes('--no-reconnect'));

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

// one headless browser at a time on this machine (parallel agents' runs OOM-kill each other); --no-lock skips
await acquireBrowserLock();
const peakMB = watchPeakMemory();
const SRV = SRV_MODE ? await startServer() : null;
if (SRV) console.log(`game servers running locally at ${SRV.url}`);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = http.createServer(ART ? artifactHandler(ART.html) : (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`, URL0 = ORIGIN + '/index.html';

// ---- in-page stand-in for PeerJS: same API, carried over a BroadcastChannel between pages of this origin ----
function fakePeerShim() {
  if (window.__fakePeer) return; window.__fakePeer = true;
  const BC = new BroadcastChannel('ww3-mpsync'), local = new Map(), conns = new Map(), pending = new Map();
  const stats = window.__fpStats = { tx: 0, rx: 0, txB: 0, rxB: 0, dropped: 0 };
  const nonce = () => Math.random().toString(36).slice(2, 12);
  // deliver to the other page (BroadcastChannel) and to this page (BroadcastChannel skips its own sender)
  const post = m => { BC.postMessage(m); setTimeout(() => onMsg(m), 0); };
  const err = (type, msg) => Object.assign(new Error(msg || type), { type });
  class Em { constructor() { this._h = {}; } on(t, f) { (this._h[t] = this._h[t] || []).push(f); return this; } off(t, f) { this._h[t] = (this._h[t] || []).filter(x => x !== f); return this; }
    _emit(t, ...a) { for (const f of (this._h[t] || []).slice()) try { f(...a); } catch (e) { console.error(e); } } }
  class Conn extends Em {
    constructor(cid, owner, remote) { super(); this.cid = cid; this.owner = owner; this.peer = remote; this.open = false; this.reliable = true;
      this.serialization = 'json'; this.dataChannel = { bufferedAmount: 0 }; this.peerConnection = null; conns.set(cid + '@' + owner.id, this); }
    send(m) { if (!this.open) return; if (window.__fpCut) { stats.dropped++; return; } const s = JSON.stringify(m); stats.tx++; stats.txB += s.length; post({ k: 'd', cid: this.cid, to: this.peer, s }); }
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
    if (!m || typeof m !== 'object') return;
    if (m.k === 'who') { const p = local.get(m.id); if (p && !p.destroyed) post({ k: 'have', n: m.n }); }
    else if (m.k === 'have') { const f = pending.get(m.n); if (f) f(); }
    else if (m.k === 'conn') { const p = local.get(m.to); if (!p || p.destroyed) return; const c = new Conn(m.cid, p, m.from); c.open = true;
      p._emit('connection', c); post({ k: 'ack', cid: m.cid, to: m.from }); setTimeout(() => c._emit('open'), 0); }
    else if (m.k === 'ack') { const f = pending.get('c' + m.cid); if (f) f(); }
    else if (m.k === 'd') { const c = conns.get(m.cid + '@' + m.to); if (!c || !c.open) return; if (window.__fpDrop || window.__fpCut) { stats.dropped++; return; }
      stats.rx++; stats.rxB += m.s.length; c._emit('data', JSON.parse(m.s)); }
    else if (m.k === 'x') { const c = conns.get(m.cid + '@' + m.to); if (c) c._closed(false); }
  }
  BC.onmessage = ev => onMsg(ev.data);
  // the bundled PeerJS assigns window.Peer later in the page: keep ours; switch off the Nostr backup network
  Object.defineProperty(window, 'Peer', { configurable: false, get: () => FakePeer, set: () => {} });
  Object.defineProperty(window, 'Trystero', { configurable: false, get: () => undefined, set: () => {} });
}

// --server: PeerJS is replaced by one that can never connect (as on a network that blocks browser-to-browser links),
// the Nostr backup is off, and the page is pointed at the local game servers
function blockedPeerShim(url) {
  window.WW3_SERVER = url;
  class BlockedPeer { constructor() { this._h = {}; this.destroyed = false; this.open = false;
      setTimeout(() => this._emit('error', Object.assign(new Error('browser-to-browser blocked (test)'), { type: 'network' })), 50); }
    on(t, f) { (this._h[t] = this._h[t] || []).push(f); return this; } _emit(t, ...a) { for (const f of (this._h[t] || []).slice()) try { f(...a); } catch (e) {} }
    connect() { return { on() {}, open: false, send() {} }; } destroy() { this.destroyed = true; } disconnect() {} reconnect() {} }
  Object.defineProperty(window, 'Peer', { configurable: false, get: () => BlockedPeer, set: () => {} });
  Object.defineProperty(window, 'Trystero', { configurable: false, get: () => undefined, set: () => {} });
}

const fails = [], warns = [];
const fail = m => { fails.push(m); };
// a crashed page leaves playwright calls hanging: abort the whole run instead
let crashed = () => {}; const crash = new Promise((_, rej) => { crashed = () => rej(new Error('a page crashed')); }); crash.catch(() => {});
async function shot(page, name) {
  try { await RUN.save(page, PFX + name, { timeout: 240000 }); }
  catch (e) { warns.push(`screenshot ${name} skipped: ${String(e.message || e).split('\n')[0]}`); }
}
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required',
    // both pages in one renderer process: saves a few hundred MB (the test drives them one after the other anyway)
    '--renderer-process-limit=1'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 } });
// never the live game servers: --server uses the local one, otherwise the page sees its servers as down
await guardContext(ctx, SRV ? SRV.url : DEAD_SERVER);
if (ART) await ctx.addInitScript(roomStub, { topics: roomTopics() }); else if (SRV) await ctx.addInitScript(blockedPeerShim, SRV.url); else await ctx.addInitScript(fakePeerShim);
await ctx.route('**/*', r => r.request().url().startsWith(ORIGIN) || SRV && r.request().url().startsWith(SRV.url) ? r.continue()
  : ART && r.request().url() === THREE_CDN ? r.fulfill({ status: 200, contentType: 'text/javascript', body: ART.three }) : r.abort());
async function openPage(tag) {
  const page = await ctx.newPage();
  page.on('crash', () => { fail(`${tag} page crashed (renderer killed - out of memory?)`); crashed(); });
  page.on('pageerror', e => fail(`${tag} page error: ` + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/ERR_FAILED|net::|Failed to load resource|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) warns.push(`${tag} console (ignored, offline/headless): ` + t.slice(0, 200));
    else fail(`${tag} console error: ` + t.slice(0, 300));
  });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined' && typeof hostGame === 'function', null, { timeout: 120000 });
  return page;
}
const waitFor = (page, fn, arg, ms, what) => page.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).catch(() => { throw new Error('timed out waiting for ' + what); });

fs.mkdirSync(OUT, { recursive: true });
const RUN = newRun(ART ? 'mpsync-art' : SRV ? 'mpsync-srv' : 'mpsync');
const t0 = Date.now();
const secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
let host, client;
async function main() {
  [host, client] = await Promise.all([openPage('host'), openPage('client')]);
  if (SRV) client.on('websocket', w => { if (!w.url().includes('/room/')) return; // every relay frame the client gets / sends
    w.on('framereceived', f => cap.rx.push(String(f.payload))); w.on('framesent', f => cap.tx.push(String(f.payload))); });
  await Promise.all([host, client].map(p => p.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 240000 }).catch(() => warns.push('3D models still loading after 240s'))));
  console.log(`[${secs()}] both pages loaded`);

  // ---- lobby: host opens a game, client joins by its code, host adds computer players and starts ----
  await waitFor(host, () => !!NET.room, null, 30000, 'the host page to set up its network room');
  const code = await host.evaluate(async () => { try { initAudio(); } catch (e) {} setup.p = 'US';
    await Promise.race([hostGame(), new Promise(r => setTimeout(r, 20000))]); return NET.game ? NET.code : null; });
  if (!code) throw new Error('host could not open a game (NET.code empty; fake transport not picked up?)');
  console.log(`[${secs()}] host lobby open, code ${code}`);
  if (process.argv.includes('--verbose')) for (const p of [host, client]) { p.__cdp = await ctx.newCDPSession(p); await p.__cdp.send('Debugger.enable'); }
  if (process.argv.includes('--verbose')) setInterval(async () => {
    const q = p => Promise.race([p.evaluate(() => JSON.stringify({ mode: MODE, code: NET.code, game: !!NET.game, host: NET.hostPeer, me: NET.myPeer, lobby: NET.lobby && NET.lobby.length,
      st: document.getElementById('mpstatus').textContent.slice(0, 80), fp: window.__fpStats, dir: window.WW3_DIR && WW3_DIR.state() })), new Promise(r => setTimeout(() => r('(page busy)'), 3000))]).catch(e => '(' + String(e.message || e).split('\n')[0] + ')');
    const hq = await q(host), cq = await q(client);
    console.log('  host:', hq, '\n  client:', cq);
    for (const [p, r] of [[host, hq], [client, cq]]) if (r === '(page busy)' && !p.__dbg) { p.__dbg = 1;
      const s = p.__cdp;
      s.on('Debugger.paused', ev => { console.log('  BUSY STACK:', ev.callFrames.slice(0, 8).map(f => `${f.functionName}@${f.location.lineNumber}:${f.location.columnNumber}`).join(' < ')); s.send('Debugger.resume').catch(() => {}); });
      await s.send('Debugger.pause'); }
  }, 5000).unref();
  if (SRV) { // matchmaking: the host's game must show up in the client's game list (pushed by the server)
    await waitFor(client, (c) => NET.room.peers().some(p => !p.sameTab && p.presence && p.presence.g && p.presence.g.c === c) &&
      document.getElementById('games').textContent.includes(c.toUpperCase()), code, 20000, "the host's game to appear in the client's game list");
    const ls = await client.evaluate(() => JSON.stringify(window.WW3_SDIR.state()));
    console.log(`[${secs()}] client's game list (from the server) shows game ${code.toUpperCase()}: ${ls}`);
  }
  await client.evaluate((c) => { try { initAudio(); } catch (e) {} setup.p = 'RU'; joinByCode(c); }, code);
  console.log(`[${secs()}] client joining`);
  await waitFor(host, () => NET.lobby && NET.lobby.length === 1, null, 60000, 'the client to appear in the host lobby');
  await waitFor(client, () => /Joined/.test(document.getElementById('mpstatus').textContent), null, 30000, 'the client to see "Joined"');
  if (SRV) { const v = await client.evaluate(() => ({ via: NET.via, ws: !!(NET.game && NET.game._ws), st: document.getElementById('mpstatus').textContent }));
    console.log(`[${secs()}] client connected via ${v.via}: "${v.st.slice(0, 80)}"`);
    if (v.via !== 'ws' || !v.ws) fail(`client should have fallen back to the server relay, but connected via ${v.via}`); }
  // Stop both render loops BEFORE the battle starts: the test drives the clocks itself, and nothing is drawn (so no
  // GPU textures are uploaded) until the screenshots at the end - two full game pages are heavy under SwiftShader.
  await client.evaluate(() => { window.__stopLoop = true; });
  await host.evaluate(() => { window.__stopLoop = true; });
  const facs = await host.evaluate((ais) => {
    NET.tm = [0, 1]; NET.ais = [];
    const pool = ['CN', 'IR', 'TR', 'EU', 'KP', 'IN'];
    for (let i = 0; i < ais; i++) NET.ais.push({ f: pool[i], d: 0, tm: 2 + i });
    launchMP(); return G && G.teams.map(T => T.fac);
  }, AIS);
  if (!facs) throw new Error('host battle did not start (launchMP)');
  await waitFor(client, () => MODE === 'client' && G && G.teams && G.teams.length > 1, null, 300000, 'the client to enter the battle');
  const cInfo = await client.evaluate(() => ({ me: ME, n: G.teams.length, map: G.mapKey }));
  console.log(`[${secs()}] battle: ${facs.join(' vs ')} on ${cInfo.map}; client is slot ${cInfo.me}`);
  // the battle starts behind a loading screen (terrain, shader warm-up, first frame drawn underneath): wait for both
  // pages to finish it, as players would, before the test drives the clocks (otherwise the client's last loading steps
  // land at a random point inside the measured window and it looks like a lagging client)
  for (const [p, who] of [[host, 'host'], [client, 'client']])
    await waitFor(p, () => typeof G !== 'undefined' && G && G.terrain && !window.LOADING, null, 600000, `the ${who} to finish its loading screen`);
  console.log(`[${secs()}] both pages finished loading`);
  // every model this battle's nations need must have arrived on both pages (the artifact edition publishes them differently)
  for (const [tag, p] of [['host', host], ['client', client]]) {
    const m = await p.evaluate(() => { const ks = typeof modelKeysFor === 'function' ? modelKeysFor(G.teams.map(T => T.fac)) : Object.keys(MODEL_FILES);
      return { of: ks.length, miss: ks.filter(k => !MODELS.proto[k]), err: MODELS.err || '' }; });
    if (m.miss.length) fail(`${ART ? 'artifact ' : ''}${tag}: ${m.miss.length} of ${m.of} 3D models for this battle missing (${m.miss.slice(0, 5).join(', ')}) ${m.err}`); }
  if (cInfo.me !== 1) fail('client got slot ' + cInfo.me + ', expected 1');
  if (SRV) { cap.rx.length = 0; cap.tx.length = 0; cap.g0 = await host.evaluate(() => G.t); cap.w0 = Date.now(); }

  // ---- take over the clocks: stop both render loops; the host's own side plays as an easy AI ----
  await host.evaluate(() => { if (!G.teams[0].ai) G.teams[0].ai = mkAI(1); });

  const CK = 1; // client slot
  // host: advance n x 0.1 s (6 sim steps + one network tick each)
  const hostRun = (n) => host.evaluate((n) => {
    try { for (let i = 0; i < n && G && !G.over; i++) { for (let s = 0; s < 6; s++) simUpdate(1 / 60); netTick(0.1); } }
    catch (e) { return { err: String(e && e.stack || e) }; }
    // does the client's side see anything at all? (a player whose side is wiped out sees nothing, and the host's
    // delta snapshots then carry nothing for them, so their latest-snapshot clock legitimately stops)
    const k = 1; let sees = false; for (const e of G.ents) if (!e.dead && (e.team === k || (e.vs && e.vs[k]))) { sees = true; break; }
    return { t: G.t, over: G.over, sees };
  }, n).then(r => { if (r && typeof r.t === 'number') lastHostT = r.t; return r; });
  // client: let queued messages land, then advance its clock the same amount
  // --server: the test runs ~25x faster than real time, so a few tens of ms through the local server would read as
  // seconds of game lag; the client first waits (real time, up to 400 ms) for the host's latest update, as in a match
  const clientRun = (n) => client.evaluate(async ([n, srv, hostT]) => {
    await new Promise(r => setTimeout(r, 0));
    if (srv) { const w0 = performance.now(); while (performance.now() - w0 < 400 && (NET.lastSnapT || 0) < hostT - 0.6) await new Promise(r => setTimeout(r, 4)); }
    try { for (let i = 0; i < n && G; i++) clientTick(0.1); } catch (e) { return { err: String(e && e.stack || e) }; }
    return { t: G.t, snapT: NET.lastSnapT || 0, rx: performance.now() - (NET.lastRx || 0), ents: G.ents.length };
  }, [n, !!SRV, lastHostT]);
  let lastHostT = 0;
  // what the client's side may see on the host: own entities and everything currently in its vision
  const hostView = () => host.evaluate((k) => {
    const out = [];
    for (const e of G.ents) { if (e.dead) continue; const own = e.team === k, vis = own || !!(e.vs && e.vs[k]);
      if (!vis && !(e.isB && ((e.sn | 0) & (1 << k)))) continue;
      out.push([e.id, e.kind, e.team, Math.round(e.x), Math.round(e.y), Math.round(e.hp), e.isB ? 1 : 0, vis ? 1 : 0]); }
    return { t: G.t, list: out, credits: Math.floor(G.teams[k].credits), all: G.ents.filter(e => !e.dead).length };
  }, CK);
  const clientView = () => client.evaluate(() => ({ t: NET.lastSnapT || 0, credits: G.teams[ME].credits,
    list: G.ents.filter(e => !e.dead && !e.gone).map(e => [e.id, e.kind, e.team, !e.isB && e.tx != null ? e.tx : e.x, !e.isB && e.ty != null ? e.ty : e.y, Math.round(e.hp), e.isB ? 1 : 0, e.mem ? 1 : 0, +((NET.lastSnapT || 0) - (e.seenAt || 0)).toFixed(2)]) }));

  // ---- strict comparison with the host paused and one full keyframe flushed ----
  async function settleCheck(label) {
    await host.evaluate((k) => { if (NET.kf) NET.kf[k] = 0; NET.snapT = 0; NET.teamT = 0; netTick(0.1); }, CK);
    for (let i = 0; i < 4; i++) { await client.waitForTimeout(150); await clientRun(1); await host.evaluate(() => netTick(0.1)); }
    await client.waitForTimeout(300); await clientRun(1);
    const H = await hostView(), C = await clientView();
    const cm = new Map(C.list.map(a => [a[0], a])), hm = new Map(H.list.map(a => [a[0], a]));
    let missing = [], moved = [], wrong = [], extra = [], ownMissing = 0, vis = 0;
    for (const h of H.list) {
      if (!h[7]) continue; vis++; const c = cm.get(h[0]);
      if (!c) { missing.push(`${h[1]}#${h[0]}(team ${h[2]})`); if (h[2] === CK) ownMissing++; continue; }
      const d = Math.hypot(c[3] - h[3], c[4] - h[4]);
      if (d > 2) moved.push(`${h[1]}#${h[0]} off by ${d.toFixed(1)}`);
      if (c[2] !== h[2] || c[1] !== h[1] || Math.abs(c[5] - h[5]) > 1) wrong.push(`${h[1]}#${h[0]} client ${c[1]}/team ${c[2]}/hp ${c[5]} vs host ${h[1]}/team ${h[2]}/hp ${h[5]}`);
    }
    for (const c of C.list) if (!hm.has(c[0]) && !c[7]) extra.push(`${c[1]}#${c[0]}(team ${c[2]}, last seen ${c[8]} s before)`);
    const own = H.list.filter(h => h[2] === CK).length, cOwn = C.list.filter(c => c[2] === CK).length;
    console.log(`[${secs()}] ${label} t=${H.t.toFixed(0)}s: host ${H.all} entities, client side sees ${vis} (own ${own}); client has ${C.list.length} (own ${cOwn}); ` +
      `missing ${missing.length}, extra ${extra.length}, off-position ${moved.length}, mismatched ${wrong.length}; credits host ${H.credits} client ${C.credits}`);
    const sample = a => a.slice(0, 4).join(', ') + (a.length > 4 ? ` (+${a.length - 4} more)` : '');
    // the client's own side must be complete; anything else in view may lag one tick at a vision edge (allow 2%)
    if (ownMissing) fail(`${label}: ${ownMissing} of the client's own entities are missing on the client: ${sample(missing)}`);
    else if (missing.length > Math.max(1, vis * .02)) fail(`${label}: ${missing.length}/${vis} visible entities missing on the client: ${sample(missing)}`);
    if (moved.length > Math.max(1, vis * .02)) fail(`${label}: ${moved.length} entities at the wrong position on the client: ${sample(moved)}`);
    if (wrong.length > Math.max(1, vis * .02)) fail(`${label}: ${wrong.length} entities differ (kind/team/health): ${sample(wrong)}`);
    if (extra.length > Math.max(2, vis * .03)) fail(`${label}: ${extra.length} entities on the client that the host no longer has in view: ${sample(extra)}`);
    if (Math.abs(H.credits - C.credits) > 1) fail(`${label}: credits differ: host ${H.credits}, client ${C.credits}`);
    if (H.t - C.t > .3 && vis) fail(`${label}: client's latest state is ${(H.t - C.t).toFixed(1)} s behind the host after settling`);
    return { H, C };
  }

  // ---- light check while the battle runs (no settling): the client may trail by a snapshot, so tolerances are loose ----
  let enemySeen = 0, live = { n: 0, worst: '' };
  async function liveCheck() {
    const H = await hostView(), C = await clientView(); const cm = new Map(C.list.map(a => [a[0], a]));
    let vis = 0, miss = 0, far = 0, en = 0;
    for (const h of H.list) { if (!h[7]) continue; vis++; if (h[2] !== CK) en++; const c = cm.get(h[0]); if (!c) { miss++; continue; } if (Math.hypot(c[3] - h[3], c[4] - h[4]) > 25) far++; }
    enemySeen = Math.max(enemySeen, en); live.n++;
    if (miss > 2 + vis * .15 || far > 2 + vis * .1) { live.bad = (live.bad || 0) + 1; live.worst = `t=${H.t.toFixed(0)}s: ${miss}/${vis} visible entities missing, ${far} more than 25 m off`; }
  }

  // warm up 5 s, then the client gives orders like a player: its units attack-move on the host's base (so the client
  // gets to see enemies, fighting, deaths), and it queues one of everything it can build
  for (let i = 0; i < 10; i++) { await hostRun(5); await clientRun(5); }
  const base0 = await host.evaluate(() => { const b = G.ents.filter(e => e.team === 0 && e.isB && !e.dead); if (!b.length) return [MAPW / 2, MAPH / 2];
    return [b.reduce((s, e) => s + e.x, 0) / b.length, b.reduce((s, e) => s + e.y, 0) / b.length]; });
  const order = await client.evaluate(([bx, by]) => {
    const us = G.ents.filter(e => e.team === ME && !e.isB && !e.dead && e.kind !== 'dozer' && e.kind !== 'harv');
    const kinds = G.ents.filter(e => e.team === ME).map(e => e.kind).join(',');
    try { const R = roster(G.teams[ME].fac); for (const c of CATS) if (R[c] && R[c][0]) doAct({ t: 'q', k: R[c][0] }); } catch (e) {}
    if (!us.length) return { n: 0, kinds };
    doAct({ t: 'go', ids: us.map(e => e.id), x: bx, y: by, mode: 'amove' });
    return { n: us.length, ids: us.map(e => e.id), kinds };
  }, base0);
  console.log(`[${secs()}] client owns ${order.kinds}; ordering ${order.n} units to attack-move on the host base`);
  // the client's dozer builds a barracks: the test asks the host (read-only) for a legal spot near the client's HQ,
  // then the client sends the same 'bld' order a player's click would
  const spot = await host.evaluate((k) => { const hq = G.ents.find(e => e.team === k && e.isB && !e.dead); if (!hq) return null;
    for (let r = 60; r < 400; r += 20) for (let a = 0; a < 16; a++) { const x = hq.x + Math.cos(a / 16 * 6.283) * r, y = hq.y + Math.sin(a / 16 * 6.283) * r;
      if (validSpot(k, 'barracks', x, y)) return [Math.round(x), Math.round(y)]; } return null; }, CK);
  if (spot) await client.evaluate(([x, y]) => { const dz = G.ents.find(e => e.team === ME && e.kind === 'dozer'); doAct({ t: 'bld', k: 'barracks', x, y, dz: dz ? dz.id : 0 }); }, spot);
  else warns.push('no legal barracks spot found near the client HQ; build order not tested');
  const before = order.n ? await host.evaluate((ids) => ids.map(id => { const e = G.byId.get(id); return e ? [e.x, e.y] : null; }), order.ids) : [];
  await host.waitForTimeout(1500); // orders travel in the client's presence: give it real time to arrive

  // --server: real time (one network tick per 0.1 s, each flushed on its own, like a real match), so the relay sees
  // real message rates (its rate limits are sized for those) and the traffic numbers are per real minute
  const STEP = SRV ? 1 : 5, total = Math.round(MINUTES * 600), checks = new Set([600, 1500, total].filter(x => x <= total));
  let blindAt = 0, lagSkip = 0, lagLog = 0, lagLogged = false, ticks = 50, behindMax = 0, breakAt = BREAK ? 600 : -1, orderChecked = false, chunkMs = [];
  while (ticks < total) {
    const w0 = Date.now();
    const h = await hostRun(STEP); if (h.err) { fail('host simulation threw: ' + h.err.split('\n').slice(0, 4).join(' | ')); break; }
    const c = await clientRun(STEP); if (c.err) { fail('client tick threw: ' + c.err.split('\n').slice(0, 4).join(' | ')); break; }
    ticks += STEP; chunkMs.push(Date.now() - w0);
    if (SRV) { const left = 100 * STEP - (Date.now() - w0); if (left > 0) await host.waitForTimeout(left); }
    if (!h.sees && !blindAt) { blindAt = h.t; console.log(`[${secs()}] the client's side sees nothing from host t=${h.t.toFixed(1)}s (wiped out): its clock is no longer checked`); }
    if (ticks >= 100 && ticks > lagSkip && h.sees) behindMax = Math.max(behindMax, h.t - c.snapT);
    if (SRV && ticks >= 100 && ticks > lagSkip && h.sees && h.t - c.snapT > 1.5 && lagLog < 6) { lagLog++;
      const b = await host.evaluate(() => ({ buf: NET.game && NET.game._ws ? NET.game._ws.bufferedAmount : -1, kf: NET.kf && NET.kf[1] }));
      console.log(`[${secs()}] lag ${(h.t - c.snapT).toFixed(1)} s at host t=${h.t.toFixed(1)} (host socket backlog ${b.buf} B, client rx ${(c.rx / 1000).toFixed(1)} s ago)`); }
    if (ticks >= 100 && ticks > lagSkip && h.sees && h.t - c.snapT > 1.5 && !lagLogged) { lagLogged = true; // say when, and in what state, the client first fell behind
      const o = await host.evaluate(() => G.teams.map(T => T.fac + (T.out ? ' out' : '')).join(', '));
      console.log(`[${secs()}] client first fell ${(h.t - c.snapT).toFixed(1)} s behind at host t=${h.t.toFixed(1)}s (${o})`); }
    if (RECON && ticks === 650 && SRV) { await client.evaluate(() => { NET.game._ws.close(); });
      console.log(`[${secs()}] --reconnect: the client's connection to the server is cut; it must reconnect`);
      // the reconnect needs real time (and the host must keep running so it hears the client's hello)
      const r0 = Date.now(); while (Date.now() - r0 < 20000) { await hostRun(2); await clientRun(2); await host.waitForTimeout(150);
        if (await client.evaluate(() => !NET.recon && !!(NET.game && NET.game._ws) && performance.now() - NET.lastRx < 1000)) break; }
      const rs = await client.evaluate(() => ({ recon: !!NET.recon, via: NET.game && NET.game.via, ws: !!(NET.game && NET.game._ws) }));
      console.log(`[${secs()}] --reconnect: after ${((Date.now() - r0) / 1000).toFixed(1)} s the client is ${rs.recon ? 'STILL reconnecting' : 'reconnected'} via ${rs.via}`);
      if (rs.recon || !rs.ws) fail('client did not reconnect through the server after its connection was cut');
      lagSkip = ticks + 50; // a real outage: the client may trail while it catches up
      await settleCheck('right after reconnecting'); }
    else if (RECON && ticks === 650) {
      // a real outage: nothing gets through either way for 12 game-s while the battle goes on (the client's screen
      // expires what it no longer hears about), then the client notices the silence and rejoins the same host
      await client.evaluate(() => { window.__fpCut = true; NET.lastRx = performance.now() + 120000; });
      console.log(`[${secs()}] --reconnect: the client's connection is cut for 12 game-s`);
      for (let i = 0; i < 120; i += STEP) { await hostRun(STEP); await clientRun(STEP); } ticks += 120;
      const pre = await client.evaluate(() => ({ own: G.ents.filter(e => e.team === ME).length, all: G.ents.length }));
      await client.evaluate(() => { window.__fpCut = false; NET.lastRx = performance.now() - 6000; });
      console.log(`[${secs()}] --reconnect: the client (now showing ${pre.all} entities, ${pre.own} own) thinks it lost the host and reconnects`);
      const r0 = Date.now(); while (Date.now() - r0 < 30000) { await hostRun(2); await clientRun(2); await host.waitForTimeout(150);
        if (await client.evaluate(() => !NET.recon && performance.now() - NET.lastRx < 1000)) break; }
      const rs = await client.evaluate(() => ({ recon: !!NET.recon }));
      console.log(`[${secs()}] --reconnect: after ${((Date.now() - r0) / 1000).toFixed(1)} s the client is ${rs.recon ? 'STILL reconnecting' : 'reconnected'}`);
      if (rs.recon) fail('client did not reconnect to the host after its connection came back');
      lagSkip = ticks + 50;
      // the client's own army, what it can see of the enemy and its money must match the host's exactly again
      await settleCheck('right after reconnecting'); }
    if (RECON && ticks === 1100) { const r = await host.evaluate((k) => ({ ai: !!G.teams[k].ai, disc: G.teams[k].discT || 0, out: !!G.teams[k].out }), CK);
      if (!r.out && (r.ai || r.disc)) fail('45 s after reconnecting, the host still treats the client as gone (AI took over / marked disconnected)'); }
    if (ticks === breakAt && SRV) { warns.push('--break is not supported with --server'); }
    else if (ticks === breakAt) { await client.evaluate(() => { window.__fpDrop = true; }); console.log(`[${secs()}] --break: the client stops receiving from now on`); }
    if (!orderChecked && ticks >= 250 && order.n) {
      orderChecked = true;
      const after = await host.evaluate((ids) => ids.map(id => { const e = G.byId.get(id); return e ? [e.x, e.y] : null; }), order.ids);
      const movedN = after.filter((a, i) => a && before[i] && Math.hypot(a[0] - before[i][0], a[1] - before[i][1]) > 15).length;
      console.log(`[${secs()}] client order: ${movedN}/${order.n} of the client's units moved on the host`);
      if (!movedN) fail('an order given on the client never reached the host (none of its units moved)');
    }
    if (h.over) { const w = await host.evaluate(() => G.teams.map(T => T.fac + (T.out ? ' out' : '')).join(', '));
      console.log(`[${secs()}] battle ended at t=${h.t.toFixed(0)}s (${w})`); if (!checks.has(ticks)) await settleCheck('final'); break; }
    if (ticks % 100 === 0) await liveCheck();
    if (checks.has(ticks)) { await settleCheck(`check @${(ticks / 600).toFixed(1)} min`); if (ticks === 1500 || ticks === total) await screenshots(); }
    if (ticks % 300 === 0) await client.evaluate(() => { // keep the client's production busy, like a player would
      try { const R = roster(G.teams[ME].fac); for (const c of CATS) if (R[c] && R[c][0] && !G.teams[ME].q[c].length) doAct({ t: 'q', k: R[c][0] }); } catch (e) {} });
  }
  if (!order.n) warns.push('client had no units at the start, so the order round-trip was not tested');
  const stK = SRV ? '__ww3WsStats' : '__fpStats';
  const st = await client.evaluate(k => window[k], stK), hs = await host.evaluate(k => window[k], stK);
  console.log(`[${secs()}] traffic host->client ${(st.rxB / 1024).toFixed(0)} KB in ${st.rx} messages, client->host ${(hs.rxB / 1024).toFixed(0)} KB in ${hs.rx}; ` +
    `client lag max ${behindMax.toFixed(2)} game-s; ${(chunkMs.reduce((a, b) => a + b, 0) / Math.max(1, chunkMs.length)).toFixed(0)} ms per ${STEP / 10} s step`);
  console.log(`[${secs()}] ${live.n} live checks, ${live.bad || 0} out of tolerance; up to ${enemySeen} enemy entities were in the client's view at once`);
  if ((live.bad || 0) > Math.max(1, live.n * .1)) fail(`client view diverged from the host in ${live.bad}/${live.n} live checks, e.g. ${live.worst}`);
  if (behindMax > 1.5) fail(`client fell ${behindMax.toFixed(1)} game-seconds behind the host (it should trail by at most a few 0.1 s snapshots)`);
  if (!st.rx) fail('client never received anything from the host');
  if (RECON) { const r = await host.evaluate((k) => ({ ai: !!G.teams[k].ai, disc: G.teams[k].discT || 0, out: !!G.teams[k].out, t: G.t }), CK);
    console.log(`[${secs()}] --reconnect: at t=${r.t.toFixed(0)}s the client's side is ${r.ai ? 'run by the AI' : 'still the player\'s'}${r.disc ? ', still marked disconnected' : ''}`);
    if (!r.out && (r.ai || r.disc)) fail('after reconnecting, the client did not get its army back (AI took over / still marked disconnected)'); }
  if (SRV) await trafficReport().catch(e => warns.push('traffic report: ' + e.message));
  if (ART) for (const [tag, s] of [['host', hs], ['client', st]]) { const j = judgeRoomStats(tag, s); j.fails.forEach(fail); warns.push(...j.warns);
    console.log(`[${secs()}] ${tag} room sends: ${s.tx} messages, peak ${s.peakRate} in one game-second`); }

  if (!shotsTaken) await screenshots();
}
// one real frame on each page, mid-battle (right after the 2.5 min check) or at the end
let shotsTaken = false;
// --server: relay traffic seen by the client page, for orch/out/srv-traffic.json (read by orch/serverbench.mjs)
const cap = { rx: [], tx: [], g0: 0, w0: 0 };
function deflated(frames) { // size on the wire with permessage-deflate (context takeover, one sync flush per frame)
  const d = zlib.createDeflateRaw({ level: 6 }); let n = 0; d.on('data', b => { n += b.length; });
  for (const f of frames) { d.write(f); d.flush(zlib.constants.Z_SYNC_FLUSH); }
  return new Promise(r => d.end(() => setTimeout(() => r(n), 0)));
}
async function trafficReport() {
  const g = await host.evaluate(() => G.t), gameMin = Math.max(.01, (g - cap.g0) / 60), realMin = Math.max(.01, (Date.now() - cap.w0) / 60000);
  const rx = cap.rx.filter(f => f !== 'pong' && f[0] !== '!'), tx = cap.tx.filter(f => f !== 'ping');
  const recs = a => a.reduce((n, f) => n + f.split('\n').length, 0), bytes = a => a.reduce((n, f) => n + Buffer.byteLength(f), 0);
  const out = { gameMin: +gameMin.toFixed(2), realMin: +realMin.toFixed(2), ais: AIS,
    hostToPlayer: { framesPerGameMin: Math.round(rx.length / gameMin), recordsPerGameMin: Math.round(recs(rx) / gameMin),
      bytesPerGameMin: Math.round(bytes(rx) / gameMin), wireBytesPerGameMin: Math.round(await deflated(rx) / gameMin) },
    playerToHost: { framesPerRealMin: Math.round(tx.length / realMin), recordsPerRealMin: Math.round(recs(tx) / realMin),
      bytesPerRealMin: Math.round(bytes(tx) / realMin), wireBytesPerRealMin: Math.round(await deflated(tx) / realMin) } };
  const tf = AIS ? `srv-traffic-ais${AIS}.json` : 'srv-traffic.json'; cap.file = tf;
  fs.writeFileSync(path.join(OUT, tf), JSON.stringify(out, null, 2));
  const h = out.hostToPlayer, p = out.playerToHost;
  console.log(`[${secs()}] relay traffic per player: host->player ${h.framesPerGameMin} frames (${h.recordsPerGameMin} records), ` +
    `${(h.bytesPerGameMin / 1024).toFixed(0)} KB raw / ${(h.wireBytesPerGameMin / 1024).toFixed(0)} KB compressed per game-minute; ` +
    `player->host ${p.framesPerRealMin} frames, ${(p.wireBytesPerRealMin / 1024).toFixed(1)} KB compressed per minute (orch/out/${cap.file})`);
}
async function screenshots() {
  shotsTaken = true;
  // the test (not the game) freezes the host while it draws and photographs both pages; a real host never stops
  // sending. Keep the client's 'host lost' watchdog (5 s without word -> reconnect) from mistaking that freeze for a
  // dropped connection, then let it count normally again.
  await client.evaluate(() => { NET.lastRx = performance.now() + 120000; });
  for (const [p, n] of [[host, 'mp-host.png'], [client, 'mp-client.png']]) {
    await p.evaluate(() => { try { updateUI(); renderFrame(0.016); } catch (e) { console.warn(e); } });
    await shot(p, n);
  }
  await client.evaluate(() => { NET.lastRx = performance.now(); });
  // a slow frame can block the pages for a while: let the client's keep-alive presence reach the host before the next
  // netTick, so the host's disconnect detector (8 s without word) does not mistake the pause for a dropped player
  await host.waitForTimeout(1500);
}
try { await Promise.race([main(), crash]); } catch (e) {
  fail(String(e && e.message || e));
  if (!/crashed/.test(fails.join(' '))) for (const [p, n] of [[host, 'mp-host.png'], [client, 'mp-client.png']]) if (p) await shot(p, n);
}
await browser.close().catch(() => {});
server.close();
if (SRV) SRV.stop();

{ const mb = peakMB(); if (mb) console.log(`peak memory (node + browser, summed RSS): ${mb} MB`); }
for (const w of [...new Set(warns)].slice(0, 12)) console.log('  warn: ' + w);
const uniq = [...new Set(fails)];
if (uniq.length) {
  console.log(`\nMPSYNC FAIL: ${uniq[0]} (${secs()})`);
  for (const f of uniq.slice(1, 20)) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`\nMPSYNC PASS${ART ? ' (artifact edition)' : SRV ? ' (through the game servers)' : ''} (${secs()}) — screenshots orch/out/${PFX}mp-host.png, orch/out/${PFX}mp-client.png (this run: ${RUN.rel}/)`);
process.exit(0);
