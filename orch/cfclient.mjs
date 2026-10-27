// "Host on Cloudflare", browser side: two real game pages (headless Chromium) play a battle hosted by the game
// server's BattleRoom, the real one (server/src, run locally by `wrangler dev`, orch/serverdev.mjs).
//
// The pages reach the servers only through orch/cfproxy.mjs (a local pass-through), so the test can cut a connection,
// restart the server, or make a battle vanish. A second local server with a tiny free-plan allowance answers "busy"
// for real. Browser-to-browser links are blocked in both pages (as on a strict network), so every connection goes
// through the servers, and no page can reach anything off this machine (guardContext).
//
// Steps (each must pass):
//   1. fallback: "Host on Cloudflare" chosen, the server is over its budget ("busy") -> the page hosts in its own
//      browser, with a message; the choice stays remembered
//   2. lobby: the creator hosts on Cloudflare (a client of the server: via 'wsb', owner lobby from 'blob'); the game
//      shows up in the friend's game list (from the server's "b|" frame) marked "on Cloudflare" and the friend joins it;
//      the creator sets teams and adds a computer player ('bset'), the friend's copy of the lobby (from the server)
//      shows them; the lobby says "Hosted on Cloudflare"; Start
//   3. battle: both pages get 'start' with sv:1 (creator = slot 0, friend = slot 1) and play as clients; orders from
//      both are carried out by the server (their units move in the server's snapshots); the battle runs in sync: each
//      page matches the server's own checkpoint (sent to the standby page) for its side, and the two pages agree on
//      everything both can see; the in-battle readout says "hosted on Cloudflare" with a ping
//   4. reconnect: the friend's connection is cut; it reconnects to the same battle and keeps its army
//   5. server blip: the server restarts (same stored data); both pages wait for it, the server picks the battle up from
//      its kept checkpoint and the battle goes on there (no player took over)
//   6. server gone for good: the battle vanishes ("nohost"); the standby page takes over as a browser host in
//      "<code>-m1" and the other page joins it; the battle goes on
//
//   node orch/cfclient.mjs [--no-lock] [--minutes 1.5]
// Prints CFCLIENT PASS / CFCLIENT FAIL: reason. Screenshots: orch/out/cf-*.png
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { startServer, guardContext } from './serverdev.mjs';
import { startProxy } from './cfproxy.mjs';

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
const STATE = fs.mkdtempSync(path.join(os.tmpdir(), 'ww3-cfclient-'));
const BENCH_KEY = 'cfclientbench1';
// the game server (its stored data kept in STATE, so it can be restarted with it) and one over its free-plan budget
let [SRV, BUSY] = await Promise.all([startServer({ state: STATE }), startServer({ vars: { FREE_GBS: '0.001', BENCH_KEY } })]);
const P = await startProxy(SRV.url);
console.log(`local game server ${SRV.url} (pages reach it through ${P.url}); over-budget server ${BUSY.url}`);
// put some use on the over-budget server's books (a short bench), so it refuses new battles with "busy"
const busyReady = (async () => { const r = await fetch(`${BUSY.url}/battle-bench?players=2&minutes=0.25&batch=60&key=${BENCH_KEY}`); await r.text(); })();
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
await guardContext(ctx, P.url);
await ctx.addInitScript(blockedPeerShim, P.url);
await ctx.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith(P.url) ? r.continue() : r.abort());
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
const games = async () => { try { return await (await fetch(SRV.url + '/games')).json(); } catch { return {}; } };

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

  // ---- 1. server over its budget -> host in this browser ----
  await busyReady;
  P.route(p => p.startsWith('/battle/') ? BUSY.url : null);
  await A.evaluate(() => hostGame());
  await waitFor(A, () => MODE === 'single' && NET.code && NET.code !== 'join' && NET.game && !NET.cf, null, 40000, 'the creator to fall back to hosting in its browser');
  const fb = await A.evaluate(() => ({ st: document.getElementById('mpstatus').textContent, hostOn: hostOn() }));
  say(`1. server busy -> browser hosting: "${fb.st.slice(0, 140)}"`);
  if (!/Cloudflare is busy/.test(fb.st) || !/browser is hosting/.test(fb.st)) fail('the busy fallback message is missing from the lobby');
  if (fb.hostOn !== 'cf') fail('the Cloudflare choice was forgotten after a fallback');
  await A.evaluate(() => cancelHost());
  P.route(null);

  // ---- 2. lobby on Cloudflare ----
  await A.evaluate(() => hostGame());
  await waitFor(A, () => NET.via === 'wsb' && NET.cf && NET.cf.own && NET.cf.blob && document.querySelector('#mpstatus .lob'), null, 30000, 'the creator\'s Cloudflare lobby');
  const code = await A.evaluate(() => NET.jcode);
  say(`2. lobby open on Cloudflare, code ${code.toUpperCase()}; creator status: "${(await status(A)).slice(0, 120)}"`);
  if (!/Hosted on Cloudflare/.test(await status(A))) fail('the creator\'s lobby does not say "Hosted on Cloudflare"');
  const gl = await games();
  if (!(gl.battles || []).some(([, e]) => e.g && e.g.c === code && e.g.cf)) fail('the server does not list the battle (cf:1) in its game list: ' + JSON.stringify(gl).slice(0, 200));
  // the friend finds it in the game list (the server's "b|" frame) and joins from there
  await waitFor(B, c => NET.room.peers().some(q => q.presence && q.presence.g && q.presence.g.c === c && q.presence.g.cf), code, 20000, 'the Cloudflare battle in the friend\'s game list');
  const listed = await B.evaluate(async c => { await renderGames(); return document.getElementById('games') ? document.getElementById('games').textContent : ''; }, code);
  say(`friend's game list: "${listed.replace(/\s+/g, ' ').slice(0, 120)}"`);
  if (!/on Cloudflare/.test(listed)) warns.push('the game list entry does not say "on Cloudflare"');
  await B.evaluate(c => { initAudio(); setup.p = 'RU'; joinGame(NET.room.peers().find(q => q.presence && q.presence.g && q.presence.g.c === c)); }, code);
  await waitFor(B, () => NET.via === 'wsb' && /hosted on Cloudflare/.test(document.getElementById('mpstatus').textContent), null, 60000, 'the friend to join the Cloudflare battle from the game list');
  say(`friend joined: "${(await status(B)).slice(0, 120)}"`);
  await waitFor(A, () => NET.cf.blob.seats.filter(s => s.h).length === 2, null, 20000, 'the friend to appear in the creator\'s lobby');
  // teams 1 vs 2 plus one Easy computer player on the friend's team, as a player would set them in the lobby
  await A.evaluate(() => { NET.tm = [0, 1]; renderLobby(); });
  await A.waitForTimeout(600);
  await A.evaluate(() => { document.querySelector('#mpstatus .addai').click(); });
  await A.waitForTimeout(600);
  await A.evaluate(() => { NET.ais.forEach(a => { a.f = 'CN'; a.d = 0; a.tm = 1; }); renderLobby(); });
  // the friend's lobby comes from the server, so this is what the server holds
  const lobOk = () => B.evaluate(() => { const s = (NET.cf && NET.cf.blob && NET.cf.blob.seats) || []; return s.filter(x => x.h).map(x => x.tm).join() === '0,1' && s.filter(x => x.ai).length === 1 && s.find(x => x.ai).f === 'CN' && s.find(x => x.ai).d === 0; });
  for (let i = 0; i < 40 && !(await lobOk()); i++) await A.waitForTimeout(250);
  const seats = await B.evaluate(() => NET.cf.blob.seats);
  say(`server lobby (as the friend sees it): ${seats.map(s => `${s.h ? 'player' : 'computer'} ${s.f}/team ${s.tm + 1}`).join(', ')}`);
  if (!(await lobOk())) fail('lobby edits did not reach the server (teams / computer player)');
  await waitFor(A, () => !document.querySelector('#mpstatus .startbtn').disabled, null, 15000, 'Start to be enabled');
  await shot(A, 'cf-lobby.png');
  await A.evaluate(() => { window.__stopLoop = true; }); await B.evaluate(() => { window.__stopLoop = true; });
  await A.evaluate(() => document.querySelector('#mpstatus .startbtn').click());

  // ---- 3. battle ----
  await waitFor(A, () => MODE === 'client' && G && G.teams.length === 3, null, 300000, 'the creator to enter the battle');
  await waitFor(B, () => MODE === 'client' && G && G.teams.length === 3, null, 300000, 'the friend to enter the battle');
  const slots = [await A.evaluate(() => ME), await B.evaluate(() => ME)];
  say(`3. battle started; creator is slot ${slots[0]}, friend slot ${slots[1]}`);
  if (slots[0] !== 0 || slots[1] !== 1) fail(`expected slots 0 and 1, got ${slots}`);
  for (const [p, who] of [[A, 'creator'], [B, 'friend']]) await waitFor(p, () => G && G.terrain && !window.LOADING, null, 600000, `the ${who} to finish loading`);
  say('both pages past the loading screen');
  const tick = async n => { for (let i = 0; i < n; i++) { const w0 = Date.now();
      for (const p of [A, B]) await p.evaluate(() => { try { if (MODE === 'client') clientTick(0.1); else if (MODE === 'host') { for (let s = 0; s < 6; s++) simUpdate(1 / 60); netTick(0.1); } } catch (e) { console.error('tick: ' + e); } });
      const left = 100 - (Date.now() - w0); if (left > 0) await A.waitForTimeout(left); } };
  const snapT = p => p.evaluate(() => NET.lastSnapT || 0);
  await tick(30);
  const tA = await snapT(A); await tick(20); const tA2 = await snapT(A);
  say(`the server's battle clock advances on the creator's page: ${tA.toFixed(1)} s -> ${tA2.toFixed(1)} s`);
  if (!(tA2 > tA + 1)) fail('the creator gets no fresh battle state from the server');
  // orders from both players: every combat unit attack-moves on the other side's base (as each page knows its own)
  const baseOf = p => p.evaluate(() => { const b = G.ents.filter(e => e.team === ME && e.isB && !e.dead); return [b.reduce((s, e) => s + e.x, 0) / b.length, b.reduce((s, e) => s + e.y, 0) / b.length]; });
  const bases = [await baseOf(A), await baseOf(B)];
  const posOf = (p, ids) => p.evaluate(ids => ids.map(id => { const e = G.byId.get(id); return e && !e.dead ? [e.tx != null ? e.tx : e.x, e.ty != null ? e.ty : e.y] : null; }), ids);
  const ord = {};
  for (const [p, k] of [[A, 0], [B, 1]]) {
    ord[k] = await p.evaluate(([bx, by]) => { const us = G.ents.filter(e => e.team === ME && !e.isB && !e.dead && e.kind !== 'dozer' && e.kind !== 'harv').map(e => e.id);
      try { const R = roster(G.teams[ME].fac); for (const c of CATS) if (R[c] && R[c][0]) doAct({ t: 'q', k: R[c][0] }); } catch (e) {}
      if (us.length) doAct({ t: 'go', ids: us, x: bx, y: by, mode: 'amove' }); return us; }, bases[1 - k]);
    ord[k].before = await posOf(p, ord[k]);
  }
  await tick(40);
  for (const [p, k] of [[A, 0], [B, 1]]) { const after = await posOf(p, ord[k]); const n = after.filter((a, i) => a && ord[k].before[i] && Math.hypot(a[0] - ord[k].before[i][0], a[1] - ord[k].before[i][1]) > 15).length;
    say(`slot ${k}'s order: ${n}/${ord[k].length} of its units moved in the server's updates`); if (ord[k].length && !n) fail(`orders from slot ${k} never reached the server`); }
  // in-battle readout
  const hud = await A.evaluate(() => { localStorage.setItem('ww3_fpsShow', '1'); _fpsT = 0; fpsHud(); return document.getElementById('fpsHud').textContent; });
  say(`in-battle readout (creator): "${hud}"`);
  if (!/hosted on Cloudflare/.test(hud) || !/ping \d+ ms/.test(hud)) fail('the in-battle readout does not show "hosted on Cloudflare" and a ping');
  // run to about MINUTES game-minutes, then check sync
  while ((await snapT(A)) < MINUTES * 60) await tick(10);
  await syncCheck(`@${((await snapT(A)) / 60).toFixed(1)} min`);
  await shot(B, 'cf-friend.png');

  // ---- 4. reconnect ----
  const bId = await B.evaluate(() => NET.myPeer);
  const nCut = P.cut(i => i.code === code && i.id === bId);
  say(`4. the friend's connection to the server is cut (${nCut} socket)`);
  const own0 = await B.evaluate(() => G.ents.filter(e => e.team === ME && !e.dead && !e.gone).length);
  if (!(await waitRecon([B], 25000, 'the friend to reconnect'))) fail('the friend did not reconnect to the Cloudflare battle');
  else {
    await tick(30);
    const r = await B.evaluate(() => ({ via: NET.game && NET.game.via, gen: NET.gen | 0, own: G.ents.filter(e => e.team === ME && !e.dead && !e.gone).length, ai: !!(G.teams[ME] && G.teams[ME].ai) }));
    say(`friend reconnected via ${r.via} (room gen ${r.gen}); its side has ${r.own} units/buildings (had ${own0})`);
    if (r.via !== 'wsb' || r.gen !== 0) fail('the friend reconnected somewhere other than the Cloudflare battle');
    if (r.own < own0 * 0.6) fail('the friend lost its army on reconnecting');
  }

  // ---- 5. server blip: restart with the same stored data ----
  await tick(90);   // a fresh checkpoint (every 8 s) is on the server
  const tBefore = await snapT(A);
  const SRV2 = await startServer({ state: STATE });   // up before the old one goes, so the blip stays short
  SRV.stop(); P.setUpstream(SRV2.url); SRV = SRV2;
  P.cut(() => true);
  say(`5. the server restarted (battle at ${tBefore.toFixed(0)} s); pages reconnect`);
  if (!(await waitRecon([A, B], 40000, 'both pages to get back into the battle after the restart'))) fail('the pages did not get back into the battle after the server restarted');
  else {
    const st = await Promise.all([A, B].map(p => p.evaluate(() => ({ mode: MODE, gen: NET.gen | 0, via: NET.game && NET.game.via }))));
    say(`after the restart: ${st.map((s, i) => `${i ? 'friend' : 'creator'} ${s.mode} via ${s.via} gen ${s.gen}`).join(', ')}`);
    if (st.some(s => s.mode !== 'client' || s.gen !== 0 || s.via !== 'wsb')) fail('after the server blip a player took over instead of the server picking the battle up');
    await tick(40);
    const tAfter = await snapT(A);
    say(`the server picked the battle up: clock now ${tAfter.toFixed(0)} s`);
    if (!(tAfter > tBefore - 12)) fail(`the battle went back too far after the restart (${tBefore.toFixed(0)} s -> ${tAfter.toFixed(0)} s)`);
    await syncCheck('after the server restart');
  }

  // ---- 6. server gone for good: a player takes over ----
  await tick(90);
  const holders = [await A.evaluate(() => !!NET.isStandby), await B.evaluate(() => !!NET.isStandby)];
  say(`6. the server's battle vanishes for good; pages holding a checkpoint: ${holders}`);
  if (!holders.some(Boolean)) fail('the server never sent a checkpoint to a standby player');
  P.kill(code);
  const k0 = Date.now(); let st = null;
  while (Date.now() - k0 < 60000) { await tick(3);
    st = await Promise.all([A, B].map(p => p.evaluate(() => ({ mode: MODE, gen: NET.gen | 0, rx: performance.now() - (NET.lastRx || 0), recon: !!NET.recon }))));
    const h = st.findIndex(s => s.mode === 'host'), c = st.findIndex(s => s.mode === 'client');
    if (h >= 0 && c >= 0 && st[c].gen === 1 && !st[c].recon && st[c].rx < 1000) break; }
  say(`after ${((Date.now() - k0) / 1000).toFixed(1)} s: ${st.map((s, i) => `${i ? 'friend' : 'creator'} ${s.mode}${s.mode === 'client' ? ` (room gen ${s.gen}, last update ${(s.rx / 1000).toFixed(1)} s ago)` : ''}`).join(', ')}`);
  const hi = st.findIndex(s => s.mode === 'host'), ci = st.findIndex(s => s.mode === 'client');
  if (hi < 0 || ci < 0 || st[ci].gen !== 1 || st[ci].recon) fail('no player took over the battle after the server lost it');
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

  // pages reconnecting (client mode, fresh updates from a room on 'wsb'); keeps ticking. true when all made it.
  async function waitRecon(pages, ms) {
    const r0 = Date.now();
    while (Date.now() - r0 < ms) { await tick(3);
      const ok = await Promise.all(pages.map(p => p.evaluate(() => MODE === 'client' && !NET.recon && !!NET.game && performance.now() - (NET.lastRx || 0) < 1000)));
      if (ok.every(Boolean)) { say(`  back after ${((Date.now() - r0) / 1000).toFixed(1)} s`); return true; } }
    return false;
  }
  // Sync: the server's own full battle state is the checkpoint it sends to the standby page (every 8 s). Each page's
  // side must match it (its buildings exactly, its units present and no farther away than they can have moved since),
  // and the two pages must agree on everything both of them see right now.
  async function syncCheck(label) {
    const view = p => p.evaluate(() => ({ me: ME, t: NET.lastSnapT || 0, sb: !!NET.isStandby, list: G.ents.filter(e => !e.dead && !e.gone).map(e => [e.id, e.kind, e.team, !e.isB && e.tx != null ? e.tx : e.x, !e.isB && e.ty != null ? e.ty : e.y, Math.round(e.hp), e.isB ? 1 : 0, e.mem ? 1 : 0, (e.s && e.s.spd) || 0]) }));
    const ckOf = p => p.evaluate(async () => { if (!NET.lastCk) return null; const c = await ckUnpack(NET.lastCk);
      return { t: c.g.t, nid: c.g.nid, ents: c.ents.map(e => [e.id, e.kind, e.team, e.x, e.y, Math.round(e.hp), e.isB ? 1 : 0]) }; });
    await tick(3);
    const V = [await view(A), await view(B)];
    const sbp = V[0].sb ? A : V[1].sb ? B : null, ck = sbp ? await ckOf(sbp) : null;
    if (!ck) fail(`${label}: no checkpoint from the server on either page`);
    else for (const v of V) {
      const own = new Map(v.list.filter(a => a[2] === v.me).map(a => [a[0], a]));
      const cOwn = ck.ents.filter(e => e[2] === v.me), dt = Math.max(0, v.t - ck.t);
      let bWrong = 0, uMiss = 0, uFar = 0, ghosts = 0, bN = 0, uN = 0;
      for (const c of cOwn) { const a = own.get(c[0]);
        if (c[6]) { bN++; if (a && (a[1] !== c[1] || Math.hypot(a[3] - c[3], a[4] - c[4]) > 1)) bWrong++; continue; }
        uN++; if (!a) { uMiss++; continue; } if (Math.hypot(a[3] - c[3], a[4] - c[4]) > (a[8] || 120) * dt * 1.3 + 24) uFar++; }
      const cIds = new Set(ck.ents.map(e => e[0]));
      for (const a of own.values()) if (a[0] < ck.nid && !cIds.has(a[0])) ghosts++;
      say(`${label} slot ${v.me}: server checkpoint (${dt.toFixed(1)} s older) has ${bN} buildings + ${uN} units for this side; page: ${bWrong} buildings differ, ${uMiss} units missing, ${uFar} units too far off, ${ghosts} not on the server`);
      if (bWrong) fail(`${label}: slot ${v.me} has ${bWrong} buildings that differ from the server`);
      if (uMiss > Math.max(2, uN * 0.1)) fail(`${label}: slot ${v.me} is missing ${uMiss}/${uN} of its units`);
      if (uFar > Math.max(1, uN * 0.05)) fail(`${label}: slot ${v.me} shows ${uFar} units far from where the server has them`);
      if (ghosts > Math.max(1, own.size * 0.03)) fail(`${label}: slot ${v.me} shows ${ghosts} things the server doesn't have`);
    }
    // the two pages, on what both see live
    const dt = Math.abs(V[0].t - V[1].t), m1 = new Map(V[1].list.filter(a => !a[7]).map(a => [a[0], a]));
    let both = 0, diff = 0;
    for (const a of V[0].list) { if (a[7]) continue; const b = m1.get(a[0]); if (!b) continue; both++;
      if (a[1] !== b[1] || a[2] !== b[2] || Math.hypot(a[3] - b[3], a[4] - b[4]) > (a[6] ? 1 : (a[8] || 120) * dt * 1.3 + 24)) diff++; }
    say(`${label}: the pages' latest states are ${dt.toFixed(2)} s apart; ${both} things both see, ${diff} differ`);
    if (dt > 1.5) fail(`${label}: the two pages are ${dt.toFixed(1)} s apart`);
    if (diff > Math.max(1, both * 0.03)) fail(`${label}: the pages disagree on ${diff}/${both} things both see`);
  }
}
try { await Promise.race([main(), crash]); } catch (e) { fail(String(e && e.message || e)); for (const [p, n] of [[A, 'cf-creator-fail.png'], [B, 'cf-friend-fail.png']]) if (p) await shot(p, n); }
await browser.close().catch(() => {});
server.close(); P.stop(); SRV.stop(); BUSY.stop();
try { fs.rmSync(STATE, { recursive: true, force: true }); } catch {}
for (const w of [...new Set(warns)].slice(0, 10)) console.log('  warn: ' + w);
const uniq = [...new Set(fails)];
if (uniq.length) { console.log(`\nCFCLIENT FAIL: ${uniq[0]} (${secs()})`); for (const f of uniq.slice(1, 15)) console.log('  ✗ ' + f); process.exit(1); }
console.log(`\nCFCLIENT PASS (${secs()}) — battle hosted by the real server: busy fallback, lobby, start, sync, orders, reconnect, server restart, takeover all OK`);
process.exit(0);
