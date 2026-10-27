// "Host on Cloudflare", browser side: two real game pages (headless Chromium) play a battle hosted by the game server.
//
// Until the real BattleRoom (server/, branch orch/stage2-dedicated) exists, the server host is orch/cfhost-standin.mjs:
// it speaks the "Cloudflare battle protocol" (orch/STAGE2.md) on /battle/<code> and runs the battle in Node with the
// game's own host code (src/01-03 + 07a + 07b, ME=-1); everything else (game list, relay rooms) is the local
// `wrangler dev` of server/ (orch/serverdev.mjs). Browser-to-browser links are blocked in both pages (as on a strict
// network), so every connection goes through the servers, and no page can reach anything off this machine.
//
// Steps (each must pass):
//   1. fallback: "Host on Cloudflare" chosen, server says busy -> the page hosts in its own browser, with a message
//   2. lobby: the creator hosts on Cloudflare (it is a client of the server: via 'wsb', owner lobby from 'blob'),
//      a friend joins by code (join chain finds the Cloudflare battle), the creator sets teams and adds a computer
//      player (sent as 'bset'), the lobby shows "Hosted on Cloudflare", then Start
//   3. battle: both pages get 'start' with sv:1 (creator = slot 0, friend = slot 1) and play as clients; orders from
//      both reach the server; at about 1 game-minute each page is compared with what the server shows that side
//      (host paused, full keyframe: same entities, positions, health, credits); the in-battle readout says
//      "hosted on Cloudflare" with a ping
//   4. reconnect: the friend's connection to the server is cut; it reconnects and keeps its army
//   5. server gone: the battle object vanishes (as if evicted); the standby page (it holds the server's checkpoint)
//      takes over as a browser host in "<code>-m1" and the other page joins it; the battle goes on
//
//   node orch/cfclient.mjs [--no-lock] [--minutes 1.5]
// Prints CFCLIENT PASS / CFCLIENT FAIL: reason. Screenshots: orch/out/cf-*.png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { startServer, guardContext } from './serverdev.mjs';
import { startStandin } from './cfhost-standin.mjs';

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
// browser-to-browser blocked (PeerJS never connects, Nostr off), page pointed at the local servers
function blockedPeerShim(url) {
  window.WW3_SERVER = url;
  class BlockedPeer { constructor() { this._h = {}; this.destroyed = false; this.open = false;
      setTimeout(() => this._emit('error', Object.assign(new Error('browser-to-browser blocked (test)'), { type: 'network' })), 50); }
    on(t, f) { (this._h[t] = this._h[t] || []).push(f); return this; } _emit(t, ...a) { for (const f of (this._h[t] || []).slice()) try { f(...a); } catch (e) {} }
    connect() { return { on() {}, open: false, send() {} }; } destroy() { this.destroyed = true; } disconnect() {} reconnect() {} }
  Object.defineProperty(window, 'Peer', { configurable: false, get: () => BlockedPeer, set: () => {} });
  Object.defineProperty(window, 'Trystero', { configurable: false, get: () => undefined, set: () => {} });
}

if (!process.argv.includes('--no-lock')) await acquireBrowserLock();
const SRV = await startServer();
const CF = await startStandin({ upstream: SRV.url });
console.log(`local game server ${SRV.url}; Cloudflare battle stand-in ${CF.url}`);
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
let crashed = () => {}; const crash = new Promise((_, rej) => { crashed = () => rej(new Error('a page crashed')); }); crash.catch(() => {});
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--renderer-process-limit=1'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 } });
await guardContext(ctx, CF.url);
await ctx.addInitScript(blockedPeerShim, CF.url);
await ctx.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith(CF.url) ? r.continue() : r.abort());
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

let A, B;
async function main() {
  [A, B] = await Promise.all([openPage('creator'), openPage('friend')]);
  await Promise.all([A, B].map(p => p.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 240000 }).catch(() => warns.push('models still loading'))));
  await waitFor(A, () => !!NET.room && !!document.getElementById('hostOn'), null, 30000, 'the "Host on Cloudflare" choice on the multiplayer menu');
  say('both pages loaded; the multiplayer menu offers "Host in my browser" / "Host on Cloudflare"');
  const def = await A.evaluate(() => hostOn());
  if (def !== 'browser') fail(`default hosting should be "browser", is "${def}"`);
  await A.evaluate(() => { initAudio(); setup.p = 'US'; document.querySelector('#hostOn button[data-v="cf"]').click(); });
  const remembered = await A.evaluate(() => [hostOn(), localStorage.getItem('ww3_hostOn')]);
  if (remembered[0] !== 'cf' || remembered[1] !== 'cf') fail('choosing "Host on Cloudflare" was not remembered: ' + remembered);

  // ---- 1. server busy -> host in this browser ----
  CF.setBusy(true);
  await A.evaluate(() => hostGame());
  await waitFor(A, () => MODE === 'single' && NET.code && NET.code !== 'join' && NET.game && !NET.cf, null, 40000, 'the creator to fall back to hosting in its browser');
  const fb = await A.evaluate(() => ({ st: document.getElementById('mpstatus').textContent, srv: !!(NET.game && NET.game.srv), hostOn: hostOn() }));
  say(`1. server busy -> browser hosting: "${fb.st.slice(0, 140)}"`);
  if (!/Cloudflare is busy/.test(fb.st) || !/browser is hosting/.test(fb.st)) fail('the busy fallback message is missing from the lobby');
  if (fb.hostOn !== 'cf') fail('the Cloudflare choice was forgotten after a fallback');
  await A.evaluate(() => cancelHost());
  CF.setBusy(false);

  // ---- 2. lobby on Cloudflare ----
  await A.evaluate(() => hostGame());
  await waitFor(A, () => NET.via === 'wsb' && NET.cf && NET.cf.own && NET.cf.blob && document.querySelector('#mpstatus .lob'), null, 30000, 'the creator\'s Cloudflare lobby');
  const code = await A.evaluate(() => NET.jcode);
  say(`2. lobby open on Cloudflare, code ${code.toUpperCase()}; creator status: "${(await status(A)).slice(0, 120)}"`);
  if (!/Hosted on Cloudflare/.test(await status(A))) fail('the creator\'s lobby does not say "Hosted on Cloudflare"');
  if (!CF.battles.get(code)) fail('no battle room on the server for code ' + code);
  await B.evaluate(c => { initAudio(); setup.p = 'RU'; joinByCode(c); }, code);
  await waitFor(B, () => NET.via === 'wsb' && /hosted on Cloudflare/.test(document.getElementById('mpstatus').textContent), null, 60000, 'the friend to join the Cloudflare battle by code');
  say(`friend joined: "${(await status(B)).slice(0, 120)}"`);
  await waitFor(A, () => NET.cf.blob.seats.filter(s => s.h).length === 2, null, 20000, 'the friend to appear in the creator\'s lobby');
  // teams 1 vs 2 plus one Easy computer player on the friend's team, as a player would set them in the lobby
  await A.evaluate(() => { NET.tm = [0, 1]; renderLobby(); });
  await A.waitForTimeout(600);
  await A.evaluate(() => { document.querySelector('#mpstatus .addai').click(); });
  await A.waitForTimeout(600);
  await A.evaluate(() => { NET.ais.forEach(a => { a.f = 'CN'; a.d = 0; a.tm = 1; }); renderLobby(); });
  const SB = () => CF.battles.get(code);
  for (let i = 0; i < 40 && !(SB().ais.length === 1 && SB().humans.map(h => h.tm).join() === '0,1' && SB().ais[0].f === 'CN'); i++) await A.waitForTimeout(250);
  const L = SB();
  say(`server lobby: humans ${L.humans.map(h => h.f + '/team ' + (h.tm + 1)).join(', ')}; computer ${L.ais.map(a => a.f + '/team ' + (a.tm + 1)).join(', ')}`);
  if (L.ais.length !== 1 || L.humans.map(h => h.tm).join() !== '0,1') fail('lobby edits did not reach the server (teams / computer player)');
  await waitFor(A, () => !document.querySelector('#mpstatus .startbtn').disabled, null, 15000, 'Start to be enabled');
  await shot(A, 'cf-lobby.png');
  await A.evaluate(() => { window.__stopLoop = true; }); await B.evaluate(() => { window.__stopLoop = true; });
  await A.evaluate(() => document.querySelector('#mpstatus .startbtn').click());

  // ---- 3. battle ----
  await waitFor(A, () => MODE === 'client' && G && G.teams.length === 3, null, 300000, 'the creator to enter the battle');
  await waitFor(B, () => MODE === 'client' && G && G.teams.length === 3, null, 300000, 'the friend to enter the battle');
  const slots = [await A.evaluate(() => ME), await B.evaluate(() => ME)];
  say(`3. battle started (${SB().log[0]}); creator is slot ${slots[0]}, friend slot ${slots[1]}`);
  if (slots[0] !== 0 || slots[1] !== 1) fail(`expected slots 0 and 1, got ${slots}`);
  for (const [p, who] of [[A, 'creator'], [B, 'friend']]) await waitFor(p, () => G && G.terrain && !window.LOADING, null, 600000, `the ${who} to finish loading`);
  for (let i = 0; i < 100 && !SB().go; i++) await A.waitForTimeout(200);
  say(`both pages past the loading screen; ${SB().log.slice(-1)[0]}`);
  const S = () => SB().sim;
  const tick = async n => { for (let i = 0; i < n; i++) { const w0 = Date.now();
      for (const p of [A, B]) await p.evaluate(() => { try { if (MODE === 'client') clientTick(0.1); else if (MODE === 'host') { for (let s = 0; s < 6; s++) simUpdate(1 / 60); netTick(0.1); } } catch (e) { console.error('tick: ' + e); } });
      const left = 100 - (Date.now() - w0); if (left > 0) await A.waitForTimeout(left); } };
  await tick(30);
  // orders from both players: every combat unit attack-moves on the other side's base
  const ord = {};
  for (const [p, k] of [[A, 0], [B, 1]]) {
    const base = S().base(k === 0 ? 1 : 0);
    ord[k] = await p.evaluate(([bx, by]) => { const us = G.ents.filter(e => e.team === ME && !e.isB && !e.dead && e.kind !== 'dozer' && e.kind !== 'harv').map(e => e.id);
      try { const R = roster(G.teams[ME].fac); for (const c of CATS) if (R[c] && R[c][0]) doAct({ t: 'q', k: R[c][0] }); } catch (e) {}
      if (us.length) doAct({ t: 'go', ids: us, x: bx, y: by, mode: 'amove' }); return us; }, base);
    ord[k].before = S().pos(ord[k]);
  }
  await tick(30);
  for (const k of [0, 1]) { const after = S().pos(ord[k]); const n = after.filter((a, i) => a && ord[k].before[i] && Math.hypot(a[0] - ord[k].before[i][0], a[1] - ord[k].before[i][1]) > 15).length;
    say(`slot ${k}'s order: ${n}/${ord[k].length} of its units moved on the server`); if (ord[k].length && !n) fail(`orders from slot ${k} never reached the server`); }
  // in-battle readout
  const hud = await A.evaluate(() => { localStorage.setItem('ww3_fpsShow', '1'); _fpsT = 0; fpsHud(); return document.getElementById('fpsHud').textContent; });
  say(`in-battle readout (creator): "${hud}"`);
  if (!/hosted on Cloudflare/.test(hud) || !/ping \d+ ms/.test(hud)) fail('the in-battle readout does not show "hosted on Cloudflare" and a ping');
  // run to about MINUTES game-minutes, then compare each page with the server
  while (S().t() < MINUTES * 60 && !S().over()) await tick(10);
  for (const [p, k] of [[A, 0], [B, 1]]) await settle(p, k, `check @${(S().t() / 60).toFixed(1)} min`);
  await shot(B, 'cf-friend.png');

  // ---- 4. reconnect ----
  await B.evaluate(() => { NET.game._ws.close(); });
  say('4. the friend\'s connection to the server is cut');
  const r0 = Date.now();
  while (Date.now() - r0 < 25000) { await tick(3); if (await B.evaluate(() => !NET.recon && !!(NET.game && NET.game._ws) && performance.now() - NET.lastRx < 1000)) break; }
  const rs = await B.evaluate(() => ({ recon: !!NET.recon, via: NET.game && NET.game.via }));
  say(`after ${((Date.now() - r0) / 1000).toFixed(1)} s the friend is ${rs.recon ? 'STILL reconnecting' : 'reconnected'} via ${rs.via}`);
  if (rs.recon || rs.via !== 'wsb') fail('the friend did not reconnect to the Cloudflare battle');
  await tick(40);
  const tB = S().team(1); if (!tB.out && (tB.ai || tB.disc)) fail('after reconnecting, the server still treats the friend as gone');
  await settle(B, 1, 'after reconnect');

  // ---- 5. server gone: a player takes over ----
  const sb = S().ck().sb; const holders = [await A.evaluate(() => !!NET.isStandby), await B.evaluate(() => !!NET.isStandby)];
  say(`5. the server's battle vanishes; standby (checkpoint holder) is slot ${sb}; pages holding a checkpoint: ${holders}`);
  if (sb == null || !holders.some(Boolean)) fail('the server never sent a checkpoint to a standby player');
  CF.kill(code);
  const k0 = Date.now(); let st = null;
  while (Date.now() - k0 < 60000) { await tick(3);
    st = await Promise.all([A, B].map(p => p.evaluate(() => ({ mode: MODE, gen: NET.gen | 0, rx: performance.now() - (NET.lastRx || 0), recon: !!NET.recon }))));
    const h = st.findIndex(s => s.mode === 'host'), c = st.findIndex(s => s.mode === 'client');
    if (h >= 0 && c >= 0 && st[c].gen === 1 && !st[c].recon && st[c].rx < 1000) break; }
  say(`after ${((Date.now() - k0) / 1000).toFixed(1)} s: ${st.map((s, i) => `${i ? 'friend' : 'creator'} ${s.mode}${s.mode === 'client' ? ` (room gen ${s.gen}, last update ${(s.rx / 1000).toFixed(1)} s ago)` : ''}`).join(', ')}`);
  const hi = st.findIndex(s => s.mode === 'host'), ci = st.findIndex(s => s.mode === 'client');
  if (hi < 0 || ci < 0 || st[ci].gen !== 1 || st[ci].recon) fail('no player took over the battle after the server vanished');
  else {
    await tick(30);
    const H = [A, B][hi], C = [A, B][ci], ck = ci;
    const v = await H.evaluate(k => ({ ai: !!G.teams[k].ai, disc: G.teams[k].discT || 0, t: G.t, ents: G.ents.length, aiHost: !!G.teams[ME].ai }), ck);
    const rx = await C.evaluate(() => performance.now() - (NET.lastRx || 0));
    say(`new browser host at t=${v.t.toFixed(0)} s with ${v.ents} entities; the other player's side is ${v.ai ? 'run by the AI' : 'still theirs'}; its last update ${(rx / 1000).toFixed(1)} s ago`);
    if (v.ai || v.disc) fail('after the takeover the other player\'s side was handed to the AI');
    if (v.aiHost) fail('after the takeover the new host\'s own side is run by the AI');
    if (rx > 2000) fail('the other player gets no updates from the new host');
    await shot(C, 'cf-takeover.png');
  }

  // settle check: server paused, full keyframe to this player, then its page must match what the server shows that side
  async function settle(p, k, label) {
    const Bt = SB(); if (!Bt || !Bt.sim) return; Bt.pause = true;
    try {
      Bt.sim.keyframe(k); Bt.sim.net(0.1);
      for (let i = 0; i < 4; i++) { await p.waitForTimeout(200); await p.evaluate(() => clientTick(0.1)); Bt.sim.net(0.1); }
      await p.waitForTimeout(300); await p.evaluate(() => clientTick(0.1));
      const H = Bt.sim.view(k);
      const C = await p.evaluate(() => ({ t: NET.lastSnapT || 0, credits: G.teams[ME].credits, list: G.ents.filter(e => !e.dead && !e.gone).map(e => [e.id, e.kind, e.team, !e.isB && e.tx != null ? e.tx : e.x, !e.isB && e.ty != null ? e.ty : e.y, Math.round(e.hp), e.isB ? 1 : 0, e.mem ? 1 : 0]) }));
      const cm = new Map(C.list.map(a => [a[0], a])), hm = new Map(H.list.map(a => [a[0], a]));
      let vis = 0; const missing = [], moved = [], wrong = [], extra = [];
      for (const h of H.list) { if (!h[7]) continue; vis++; const c = cm.get(h[0]); if (!c) { missing.push(`${h[1]}#${h[0]}`); continue; }
        if (Math.hypot(c[3] - h[3], c[4] - h[4]) > 2) moved.push(`${h[1]}#${h[0]}`); if (c[2] !== h[2] || c[1] !== h[1] || Math.abs(c[5] - h[5]) > 1) wrong.push(`${h[1]}#${h[0]}`); }
      for (const c of C.list) if (!hm.has(c[0]) && !c[7]) extra.push(`${c[1]}#${c[0]}`);
      say(`${label} slot ${k} t=${H.t.toFixed(0)}s: server ${H.all} entities, this side sees ${vis}; page has ${C.list.length}; missing ${missing.length}, extra ${extra.length}, off-position ${moved.length}, mismatched ${wrong.length}; credits server ${H.credits} page ${Math.floor(C.credits)}`);
      const tol = n => Math.max(1, vis * .02) < n;
      if (tol(missing.length)) fail(`${label}: slot ${k} is missing ${missing.length}/${vis} entities: ${missing.slice(0, 4)}`);
      if (tol(moved.length)) fail(`${label}: slot ${k} has ${moved.length} entities at the wrong spot: ${moved.slice(0, 4)}`);
      if (tol(wrong.length)) fail(`${label}: slot ${k} has ${wrong.length} entities that differ: ${wrong.slice(0, 4)}`);
      if (extra.length > Math.max(2, vis * .03)) fail(`${label}: slot ${k} still shows ${extra.length} entities the server no longer has in view`);
      if (Math.abs(H.credits - C.credits) > 1) fail(`${label}: slot ${k} credits differ (server ${H.credits}, page ${Math.floor(C.credits)})`);
      if (H.t - C.t > .3 && vis) fail(`${label}: slot ${k}'s latest state is ${(H.t - C.t).toFixed(1)} s behind the server`);
    } finally { Bt.pause = false; }
  }
}
try { await Promise.race([main(), crash]); } catch (e) { fail(String(e && e.message || e)); for (const [p, n] of [[A, 'cf-creator-fail.png'], [B, 'cf-friend-fail.png']]) if (p) await shot(p, n); }
await browser.close().catch(() => {});
server.close(); CF.stop(); SRV.stop();
for (const w of [...new Set(warns)].slice(0, 10)) console.log('  warn: ' + w);
const uniq = [...new Set(fails)];
if (uniq.length) { console.log(`\nCFCLIENT FAIL: ${uniq[0]} (${secs()})`); for (const f of uniq.slice(1, 15)) console.log('  ✗ ' + f); process.exit(1); }
console.log(`\nCFCLIENT PASS (${secs()}) — battle hosted by the server: fallback, lobby, start, sync, orders, reconnect, takeover all OK`);
process.exit(0);
