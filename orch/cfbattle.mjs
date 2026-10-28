// "Host on Cloudflare", end to end: the real BattleRoom (server/, run locally by `wrangler dev`, the Cloudflare
// runtime) hosts a battle that two real game pages (headless Chromium) play. Needs both halves of the work: the server
// (branch orch/stage2-dedicated) and the browser client (branch orch/cf-battle-client), merged (scratch branch
// orch/cf-e2e). Same scenario as orch/cfclient.mjs, which plays against the Node stand-in; here nothing is stood in.
//
// The server is started with TEST_HOOKS=1 (only possible in a local `wrangler dev`), which opens /battle-test/<code>:
// look at the server's battle (lobby, the side a player may see, unit positions), pause it, evict its object, or put
// usage on today's books. Browser-to-browser links are blocked in both pages, so every connection goes through the
// local server, and no page can reach anything off this machine.
//
// Steps (each must pass):
//   1. busy: all 3 battle slots are taken (3 other lobbies), so "Host on Cloudflare" gets "busy" and the page hosts in
//      its own browser, with a message
//   2. lobby: the creator opens a battle on the server (owner, 'blob' lobby), a friend joins by code, the creator sets
//      teams and adds a computer player ('bset'), Start
//   3. battle: 'start' with sv:1 (slots 0 and 1); the server holds the battle until both loading screens close (rd);
//      orders from both reach the server; each page matches what the server shows that side; readout and ping
//   4. reconnect: the friend's connection is cut; it reconnects to the same battle and keeps its side
//   5. server restart: the battle's object is evicted (memory gone, storage kept, as on a redeploy); both pages come
//      back to /battle/<code>, the battle is picked up from its kept checkpoint and they play on, still in sync
//   6. budget hand-over: today's use passes 75% of the free plan; the server hands the battle over (closes it), the
//      standby page takes over as a browser host in "<code>-m1" and the other page follows
//
//   node orch/cfbattle.mjs [--no-lock] [--minutes 1.5]
// Prints CFE2E PASS / CFE2E FAIL: reason. Screenshots: orch/out/cfe2e-*.png. The ship gate runs it as "cfclient"
// (gate.yml picks orch/cfbattle*.mjs first). On a build without the browser client it prints SKIP and passes.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { startServer, guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const MINUTES = arg('minutes', 1.5);

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
// browser-to-browser blocked (PeerJS never connects, Nostr off), page pointed at the local server
function blockedPeerShim(url) {
  window.WW3_SERVER = url;
  class BlockedPeer { constructor() { this._h = {}; this.destroyed = false; this.open = false;
      setTimeout(() => this._emit('error', Object.assign(new Error('browser-to-browser blocked (test)'), { type: 'network' })), 50); }
    on(t, f) { (this._h[t] = this._h[t] || []).push(f); return this; } _emit(t, ...a) { for (const f of (this._h[t] || []).slice()) try { f(...a); } catch (e) {} }
    connect() { return { on() {}, open: false, send() {} }; } destroy() { this.destroyed = true; } disconnect() {} reconnect() {} }
  Object.defineProperty(window, 'Peer', { configurable: false, get: () => BlockedPeer, set: () => {} });
  Object.defineProperty(window, 'Trystero', { configurable: false, get: () => undefined, set: () => {} });
}

if (!/function hostCF\(/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))) {
  console.log('SKIP cfbattle: this build has no "Host on Cloudflare" browser client (branch orch/cf-battle-client) yet');
  process.exit(0);
}
if (!process.argv.includes('--no-lock')) await acquireBrowserLock();
const SRV = await startServer({ vars: { TEST_HOOKS: '1', BATTLE_READY_MS: '240000' }, quiet: !process.env.CFE2E_DEBUG });
const WS = SRV.url.replace(/^http/, 'ws');
console.log(`local game server (wrangler dev, TEST_HOOKS) ${SRV.url}`);
// the server's view of a battle (test hooks)
const H = async (code, op, q = {}) => { const r = await fetch(`${SRV.url}/battle-test/${code}?` + new URLSearchParams({ op, ...q })); return r.json(); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`, URL0 = ORIGIN + '/index.html';

const fails = [], warns = [];
const fail = m => { fails.push(m); console.log('  ✗ ' + m); };
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
const say = m => console.log(`[${secs()}] ${m}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let crashed = () => {}; const crash = new Promise((_, rej) => { crashed = () => rej(new Error('a page crashed')); }); crash.catch(() => {});
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--renderer-process-limit=1'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 } });
await guardContext(ctx, SRV.url);
await ctx.addInitScript(blockedPeerShim, SRV.url);
await ctx.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith(SRV.url) ? r.continue() : r.abort());
async function openPage(tag) {
  const page = await ctx.newPage();
  page.on('crash', () => { fail(`${tag} page crashed`); crashed(); });
  page.on('pageerror', e => fail(`${tag} page error: ` + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() !== 'error') return; const t = m.text();
    if (/ERR_FAILED|net::|Failed to load resource|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) warns.push(`${tag} console (ignored): ` + t.slice(0, 160)); else fail(`${tag} console error: ` + t.slice(0, 300)); });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined' && typeof hostGame === 'function', null, { timeout: 120000 });
  return page;
}
const waitFor = (page, fn, a, ms, what) => page.waitForFunction(fn, a, { timeout: ms, polling: 250 }).catch(() => { throw new Error('timed out waiting for ' + what); });
async function shot(page, name) { try { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, name), timeout: 240000 }); } catch (e) { warns.push(`screenshot ${name}: ${String(e.message || e).split('\n')[0]}`); } }
const status = p => p.evaluate(() => document.getElementById('mpstatus').textContent);
// a scripted lobby on the server (to fill the battle slots)
function dummyLobby(code, k) {
  return new Promise(res => {
    const ws = new WebSocket(`${WS}/battle/${code}?role=client&id=ww3p-dummy00${k}&own=dummykey00${k}`, { headers: { Origin: ORIGIN } });
    ws.onmessage = ev => res({ ws, code, ctl: String(ev.data) }); ws.onerror = () => res({ ws, code, ctl: 'error' });
    setTimeout(() => res({ ws, code, ctl: 'timeout' }), 8000);
  });
}

let A, B;
async function main() {
  [A, B] = await Promise.all([openPage('creator'), openPage('friend')]);
  await Promise.all([A, B].map(p => p.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 240000 }).catch(() => warns.push('models still loading'))));
  await waitFor(A, () => !!NET.room && !!document.getElementById('hostOn'), null, 30000, 'the "Host on Cloudflare" choice on the multiplayer menu');
  say('both pages loaded; the multiplayer menu offers "Host in my browser" / "Host on Cloudflare"');
  await A.evaluate(() => { initAudio(); setup.p = 'US'; document.querySelector('#hostOn button[data-v="cf"]').click(); });

  // ---- 1. all battle slots taken -> busy -> host in this browser ----
  const dz = [];
  for (let k = 0; k < 3; k++) dz.push(await dummyLobby('dz' + k + Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, 'q'), k));
  say(`1. three other lobbies take the 3 battle slots: ${dz.map(d => d.ctl).join(', ')}`);
  if (!dz.every(d => d.ctl.startsWith('!w '))) fail('could not open the 3 lobbies that fill the battle slots');
  await A.evaluate(() => hostGame());
  await waitFor(A, () => MODE === 'single' && NET.code && NET.code !== 'join' && NET.game && !NET.cf, null, 40000, 'the creator to fall back to hosting in its browser');
  const fb = await A.evaluate(() => ({ st: document.getElementById('mpstatus').textContent, hostOn: hostOn() }));
  say(`   server busy -> browser hosting: "${fb.st.slice(0, 140)}"`);
  if (!/Cloudflare is busy/.test(fb.st) || !/browser is hosting/.test(fb.st)) fail('the busy fallback message is missing from the lobby');
  await A.evaluate(() => cancelHost());
  for (const d of dz) { await H(d.code, 'close'); try { d.ws.close(); } catch {} }
  await sleep(800);
  const hl = await (await fetch(SRV.url + '/health')).json();
  say(`   the 3 lobbies closed; battle slots in use: ${hl.budget && hl.budget.battles}`);
  if (!hl.budget || hl.budget.battles !== 0) fail('closing the lobbies did not free their battle slots');

  // ---- 2. lobby on the server ----
  await A.evaluate(() => hostGame());
  await waitFor(A, () => NET.via === 'wsb' && NET.cf && NET.cf.own && NET.cf.blob && document.querySelector('#mpstatus .lob'), null, 30000, 'the creator\'s Cloudflare lobby');
  const code = await A.evaluate(() => NET.jcode);
  const SB = () => H(code, 'state');
  say(`2. lobby open on the server, code ${code.toUpperCase()}; creator status: "${(await status(A)).slice(0, 120)}"`);
  if (!/Hosted on Cloudflare/.test(await status(A))) fail('the creator\'s lobby does not say "Hosted on Cloudflare"');
  if ((await SB()).phase !== 'lobby') fail('no battle lobby on the server for code ' + code);
  await B.evaluate(c => { initAudio(); setup.p = 'RU'; joinByCode(c); }, code);
  await waitFor(B, () => NET.via === 'wsb' && /hosted on Cloudflare/.test(document.getElementById('mpstatus').textContent), null, 60000, 'the friend to join the Cloudflare battle by code');
  say(`   friend joined: "${(await status(B)).slice(0, 120)}"`);
  await waitFor(A, () => NET.cf.blob.seats.filter(s => s.h).length === 2, null, 20000, 'the friend to appear in the creator\'s lobby');
  await A.evaluate(() => { NET.tm = [0, 1]; renderLobby(); });
  await A.waitForTimeout(600);
  await A.evaluate(() => { document.querySelector('#mpstatus .addai').click(); });
  await A.waitForTimeout(600);
  await A.evaluate(() => { NET.ais.forEach(a => { a.f = 'CN'; a.d = 0; a.tm = 1; }); renderLobby(); });
  let L = await SB();
  for (let i = 0; i < 40 && !(L.ais.length === 1 && L.tm.join() === '0,1' && L.ais[0].f === 'CN'); i++) { await A.waitForTimeout(250); L = await SB(); }
  say(`   server lobby: humans ${L.humans.map((h, i) => h.f + '/team ' + (L.tm[i] + 1)).join(', ')}; computer ${L.ais.map(a => a.f + '/team ' + (a.tm + 1)).join(', ')}`);
  if (L.ais.length !== 1 || L.tm.join() !== '0,1' || L.humans.map(h => h.f).join() !== 'US,RU') fail('lobby edits did not reach the server (teams / computer player / nations)');
  await waitFor(A, () => !document.querySelector('#mpstatus .startbtn').disabled, null, 15000, 'Start to be enabled');
  await shot(A, 'cfe2e-lobby.png');
  await A.evaluate(() => { window.__stopLoop = true; }); await B.evaluate(() => { window.__stopLoop = true; });
  await A.evaluate(() => document.querySelector('#mpstatus .startbtn').click());

  // ---- 3. battle ----
  await waitFor(A, () => MODE === 'client' && G && G.teams.length === 3, null, 300000, 'the creator to enter the battle');
  await waitFor(B, () => MODE === 'client' && G && G.teams.length === 3, null, 300000, 'the friend to enter the battle');
  const slots = [await A.evaluate(() => ME), await B.evaluate(() => ME)];
  const s0 = await SB();
  say(`3. battle started on the server (${s0.phase}, held for loading screens: ${!s0.go}); creator is slot ${slots[0]}, friend slot ${slots[1]}`);
  if (slots[0] !== 0 || slots[1] !== 1) fail(`expected slots 0 and 1, got ${slots}`);
  for (const [p, who] of [[A, 'creator'], [B, 'friend']]) await waitFor(p, () => G && window.LOADING === false, null, 600000, `the ${who} to finish loading`);
  let st = await SB();
  for (let i = 0; i < 100 && !(st.go && st.humans.every(h => h.rd)); i++) { await A.waitForTimeout(200); st = await SB(); }
  say(`   both pages past the loading screen (rd: ${st.humans.map(h => h.rd).join(', ')}); battle running: ${st.go}`);
  if (process.env.CFE2E_DEBUG) for (const p of [A, B]) say('     page ' + JSON.stringify(await p.evaluate(() => { const me = NET.game && NET.game.peers().find(q => q.sameTab); return { mode: MODE, sv: NET.sv, me: me && me.peer, rd: me && me.presence && me.presence.rd, peers: NET.peers, recon: !!NET.recon }; })) + ' server ' + JSON.stringify(st.conn) + ' ' + JSON.stringify(st.peers));
  if (!st.go || !st.humans.every(h => h.rd)) fail('the server did not start the battle after both loading screens closed');
  if (s0.go) fail('the server did not wait for the players\' loading screens');
  const tick = async n => { for (let i = 0; i < n; i++) { const w0 = Date.now();
      for (const p of [A, B]) await p.evaluate(() => { try { if (MODE === 'client') clientTick(0.1); else if (MODE === 'host') { for (let s = 0; s < 6; s++) simUpdate(1 / 60); netTick(0.1); } } catch (e) { console.error('tick: ' + e); } });
      const left = 100 - (Date.now() - w0); if (left > 0) await A.waitForTimeout(left); } };
  await tick(30);
  const ord = {};
  for (const [p, k] of [[A, 0], [B, 1]]) {
    const base = await H(code, 'base', { k: k === 0 ? 1 : 0 });
    ord[k] = await p.evaluate(([bx, by]) => { const us = G.ents.filter(e => e.team === ME && !e.isB && !e.dead && e.kind !== 'dozer' && e.kind !== 'harv').map(e => e.id);
      try { const R = roster(G.teams[ME].fac); for (const c of CATS) if (R[c] && R[c][0]) doAct({ t: 'q', k: R[c][0] }); } catch (e) {}
      if (us.length) doAct({ t: 'go', ids: us, x: bx, y: by, mode: 'amove' }); return us; }, base);
    ord[k].before = await H(code, 'pos', { ids: JSON.stringify(ord[k]) });
  }
  await tick(30);
  for (const k of [0, 1]) { const after = await H(code, 'pos', { ids: JSON.stringify(ord[k]) }); const n = after.filter((a, i) => a && ord[k].before[i] && Math.hypot(a[0] - ord[k].before[i][0], a[1] - ord[k].before[i][1]) > 15).length;
    say(`   slot ${k}'s order: ${n}/${ord[k].length} of its units moved on the server`); if (ord[k].length && !n) fail(`orders from slot ${k} never reached the server`); }
  const hud = await A.evaluate(() => { localStorage.setItem('ww3_fpsShow', '1'); _fpsT = 0; fpsHud(); return document.getElementById('fpsHud').textContent; });
  say(`   in-battle readout (creator): "${hud}"`);
  if (!/hosted on Cloudflare/.test(hud) || !/ping \d+ ms/.test(hud)) fail('the in-battle readout does not show "hosted on Cloudflare" and a ping');
  for (;;) { st = await SB(); if (!(st.t < MINUTES * 60) || st.over) break; await tick(10); }
  for (const [p, k] of [[A, 0], [B, 1]]) await settle(p, k, `   check @${(st.t / 60).toFixed(1)} min`);
  await shot(B, 'cfe2e-friend.png');

  // ---- 4. reconnect ----
  await B.evaluate(() => { window.__oldWs = NET.game._ws; NET.game._ws.close(); });
  say('4. the friend\'s connection to the server is cut');
  const r0 = Date.now();
  while (Date.now() - r0 < 25000) { await tick(3);
    const b = await B.evaluate(w0 => ({ ok: !NET.recon && !!(NET.game && NET.game._ws) && NET.game._ws !== window.__oldWs && performance.now() - NET.lastRx < 1000, recon: !!NET.recon, rx: performance.now() - NET.lastRx }));
    if (process.env.CFE2E_DEBUG) say(`     friend ${JSON.stringify(b)} server ${JSON.stringify(await H(code, 'team', { k: 1 }))} peers ${JSON.stringify((await SB()).peers)}`);
    if (b.ok) break; }
  const rs = await B.evaluate(() => ({ recon: !!NET.recon, via: NET.game && NET.game.via }));
  say(`   after ${((Date.now() - r0) / 1000).toFixed(1)} s the friend is ${rs.recon ? 'STILL reconnecting' : 'reconnected'} via ${rs.via}`);
  if (rs.recon || rs.via !== 'wsb') fail('the friend did not reconnect to the Cloudflare battle');
  await tick(40);
  { const tB = await H(code, 'team', { k: 1 }); if (!tB.out && (tB.ai || tB.disc)) fail('after reconnecting, the server still treats the friend as gone'); }
  await settle(B, 1, '   after reconnect');

  // ---- 5. server restart (the object is evicted: memory gone, the kept checkpoint stays) ----
  await tick(90);   // a fresh checkpoint (every 8 s) is kept
  const tEv = (await SB()).t;
  await H(code, 'evict');
  say(`5. the battle's object is evicted at t=${tEv.toFixed(0)} s (as on a redeploy)`);
  const e0 = Date.now(); let ps = null, sv = null;
  while (Date.now() - e0 < 45000) { await tick(3);
    ps = await Promise.all([A, B].map(p => p.evaluate(() => ({ mode: MODE, gen: NET.gen | 0, rx: performance.now() - (NET.lastRx || 0), recon: !!NET.recon, via: NET.game && NET.game.via }))));
    if (ps.every(s => s.mode === 'client' && !s.recon && s.rx < 1000 && s.gen === 0)) { sv = await SB(); if (sv.phase === 'battle' && sv.peers && sv.peers[0] && sv.peers[1]) break; } }
  sv = sv || await SB();
  say(`   after ${((Date.now() - e0) / 1000).toFixed(1)} s: server ${sv.phase || 'gone'} at t=${sv.t != null ? sv.t.toFixed(0) : '?'} s; ${ps.map((s, i) => `${i ? 'friend' : 'creator'} ${s.mode} via ${s.via} (room gen ${s.gen}${s.recon ? ', reconnecting' : ''})`).join(', ')}`);
  if (sv.phase !== 'battle' || !(sv.t > 0)) fail('the battle was not picked up again after the server restart');
  else if (sv.t < tEv - 12) fail(`the battle was picked up from too far back (${sv.t.toFixed(0)} s, it was at ${tEv.toFixed(0)} s)`);
  if (!ps.every(s => s.mode === 'client' && !s.recon && s.gen === 0 && s.via === 'wsb')) fail('after the server restart the players did not come back to the Cloudflare battle (a browser took over instead)');
  if (!(sv.peers && sv.peers[0] && sv.peers[1])) fail('after the server restart the server does not have both players back');
  await tick(30);
  for (const k of [0, 1]) { const T = await H(code, 'team', { k }); if (!T.out && (T.ai || T.disc)) fail(`after the server restart, slot ${k}'s side is treated as gone (AI ${T.ai}, disconnected ${T.disc})`); }
  for (const [p, k] of [[A, 0], [B, 1]]) await settle(p, k, '   after restart');

  // ---- 6. budget hand-over: the day passes 75% of the free plan, a browser takes the battle over ----
  await tick(90);
  const sb = (await SB()).ck.sb; const holders = [await A.evaluate(() => !!NET.isStandby), await B.evaluate(() => !!NET.isStandby)];
  say(`6. today's use is pushed past 75%; standby (checkpoint holder) is slot ${sb}; pages holding a checkpoint: ${holders}`);
  if (sb == null || !holders.some(Boolean)) fail('the server never sent a checkpoint to a standby player');
  await H(code, 'spend', { pct: 0.76 });
  const k0 = Date.now(); let ts = null;
  while (Date.now() - k0 < 60000) { await tick(3);
    ts = await Promise.all([A, B].map(p => p.evaluate(() => ({ mode: MODE, gen: NET.gen | 0, rx: performance.now() - (NET.lastRx || 0), recon: !!NET.recon }))));
    const h = ts.findIndex(s => s.mode === 'host'), c = ts.findIndex(s => s.mode === 'client');
    if (h >= 0 && c >= 0 && ts[c].gen === 1 && !ts[c].recon && ts[c].rx < 1000) break; }
  const hb = await (await fetch(SRV.url + '/health')).json(), gone = await SB();
  say(`   after ${((Date.now() - k0) / 1000).toFixed(1)} s: server battle ${gone.host === null ? 'closed' : gone.phase}, today at ${Math.max(hb.budget.reqPct, hb.budget.gbsPct)}%, battles allowed: ${hb.battles}; ${ts.map((s, i) => `${i ? 'friend' : 'creator'} ${s.mode}${s.mode === 'client' ? ` (room gen ${s.gen}, last update ${(s.rx / 1000).toFixed(1)} s ago)` : ''}`).join(', ')}`);
  if (gone.host !== null) fail('the server did not hand the battle over at 75%');
  if (hb.battles) fail('at 75% the server still allows new battles');
  const hi = ts.findIndex(s => s.mode === 'host'), ci = ts.findIndex(s => s.mode === 'client');
  if (hi < 0 || ci < 0 || ts[ci].gen !== 1 || ts[ci].recon) fail('no player took over the battle after the server handed it over');
  else {
    await tick(30);
    const Hp = [A, B][hi], C = [A, B][ci], ck = ci;
    const v = await Hp.evaluate(k => ({ ai: !!G.teams[k].ai, disc: G.teams[k].discT || 0, t: G.t, ents: G.ents.length, aiHost: !!G.teams[ME].ai }), ck);
    const rx = await C.evaluate(() => performance.now() - (NET.lastRx || 0));
    say(`   new browser host at t=${v.t.toFixed(0)} s with ${v.ents} entities; the other player's side is ${v.ai ? 'run by the AI' : 'still theirs'}; its last update ${(rx / 1000).toFixed(1)} s ago`);
    if (v.ai || v.disc) fail('after the hand-over the other player\'s side was handed to the AI');
    if (v.aiHost) fail('after the hand-over the new host\'s own side is run by the AI');
    if (rx > 2000) fail('the other player gets no updates from the new host');
    await shot(C, 'cfe2e-handover.png');
  }

  // settle check: server paused, full keyframe to this player, then its page must match what the server shows that side
  async function settle(p, k, label) {
    await H(code, 'pause', { v: 1 });
    try {
      await H(code, 'settle', { k });
      for (let i = 0; i < 4; i++) { await p.waitForTimeout(200); await p.evaluate(() => clientTick(0.1)); await H(code, 'settle', { k }); }
      await p.waitForTimeout(400); await p.evaluate(() => clientTick(0.1));
      const Hv = await H(code, 'view', { k });
      const C = await p.evaluate(() => ({ t: NET.lastSnapT || 0, credits: G.teams[ME].credits, list: G.ents.filter(e => !e.dead && !e.gone).map(e => [e.id, e.kind, e.team, !e.isB && e.tx != null ? e.tx : e.x, !e.isB && e.ty != null ? e.ty : e.y, Math.round(e.hp), e.isB ? 1 : 0, e.mem ? 1 : 0]) }));
      const cm = new Map(C.list.map(a => [a[0], a])), hm = new Map(Hv.list.map(a => [a[0], a]));
      let vis = 0; const missing = [], moved = [], wrong = [], extra = [];
      for (const h of Hv.list) { if (!h[7]) continue; vis++; const c = cm.get(h[0]); if (!c) { missing.push(`${h[1]}#${h[0]}`); continue; }
        if (Math.hypot(c[3] - h[3], c[4] - h[4]) > 2) moved.push(`${h[1]}#${h[0]}`); if (c[2] !== h[2] || c[1] !== h[1] || Math.abs(c[5] - h[5]) > 1) wrong.push(`${h[1]}#${h[0]}`); }
      for (const c of C.list) if (!hm.has(c[0]) && !c[7]) extra.push(`${c[1]}#${c[0]}`);
      say(`${label} slot ${k} t=${Hv.t.toFixed(0)}s: server ${Hv.all} entities, this side sees ${vis}; page has ${C.list.length}; missing ${missing.length}, extra ${extra.length}, off-position ${moved.length}, mismatched ${wrong.length}; credits server ${Hv.credits} page ${Math.floor(C.credits)}`);
      const tol = n => Math.max(1, vis * .02) < n;
      if (tol(missing.length)) fail(`${label.trim()}: slot ${k} is missing ${missing.length}/${vis} entities: ${missing.slice(0, 4)}`);
      if (tol(moved.length)) fail(`${label.trim()}: slot ${k} has ${moved.length} entities at the wrong spot: ${moved.slice(0, 4)}`);
      if (tol(wrong.length)) fail(`${label.trim()}: slot ${k} has ${wrong.length} entities that differ: ${wrong.slice(0, 4)}`);
      if (extra.length > Math.max(2, vis * .03)) fail(`${label.trim()}: slot ${k} still shows ${extra.length} entities the server no longer has in view`);
      if (Math.abs(Hv.credits - C.credits) > 1) fail(`${label.trim()}: slot ${k} credits differ (server ${Hv.credits}, page ${Math.floor(C.credits)})`);
      if (Hv.t - C.t > .3 && vis) fail(`${label.trim()}: slot ${k}'s latest state is ${(Hv.t - C.t).toFixed(1)} s behind the server`);
    } finally { await H(code, 'pause', { v: 0 }); }
  }
  const ev = (await SB()).ev;
  if (ev) say(`server timer callbacks: ${ev.n}`);
}
try { await Promise.race([main(), crash]); } catch (e) { fail(String(e && e.message || e)); for (const [p, n] of [[A, 'cfe2e-creator-fail.png'], [B, 'cfe2e-friend-fail.png']]) if (p) await shot(p, n); }
await browser.close().catch(() => {});
server.close(); SRV.stop();
for (const w of [...new Set(warns)].slice(0, 10)) console.log('  warn: ' + w);
const uniq = [...new Set(fails)];
if (uniq.length && process.env.CFE2E_DEBUG) console.log('server log:\n' + SRV.log().slice(-4000));
if (uniq.length) { console.log(`\nCFE2E FAIL: ${uniq[0]} (${secs()})`); for (const f of uniq.slice(1, 15)) console.log('  ✗ ' + f); process.exit(1); }
console.log(`\nCFE2E PASS (${secs()}) — battle hosted by the real BattleRoom (wrangler dev): busy fallback, lobby, start, sync, orders, reconnect, server restart, budget hand-over all OK`);
process.exit(0);
