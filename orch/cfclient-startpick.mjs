// Start positions picked in the battle setup (Abdullah 2026-10-30: "select where AI will be based on the map").
// Real game pages (headless Chromium) against the real servers (server/, local `wrangler dev`, orch/serverdev.mjs); no
// page can reach anything off this machine, and browser-to-browser links are blocked, so multiplayer goes through the
// servers. Runs in the gate's "cfclient" job (it runs every orch/cfclient*.mjs).
//
// Steps (each must pass):
//   1. skirmish, mouse: 3 AIs on Strait; spots picked by clicking the map preview (a spot cycles You -> AI 1 -> ...) and
//      with a row's Start menu; the battle starts with every picked side's base (its HQ) on its spot, and the side left
//      on Random where the preview showed it
//   2. skirmish, touch only (phone portrait, 390x844): the same picks by tapping (and the picker fits in landscape)
//   3. Cloudflare battle: the leader picks spots for itself, a friend and a computer player in the lobby; before any
//      pick the server's lobby carries no start spots (as before); both players' battles have the same bases, on the
//      picked spots, and the server placed every HQ there (seen in the snapshots)
//   4. browser-hosted fallback: the same with the battle hosted in the leader's browser (host and client agree)
//
//   node orch/cfclient-startpick.mjs [--no-lock] [--mp]   (--mp: only steps 3 and 4)
// Prints CFSTARTPICK PASS / CFSTARTPICK FAIL: reason. Screenshots: orch/out/startpick-*.png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { startServer, guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const MAP = 'strait';

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

// a page that stops answering would hang the test: give up after 25 minutes
setTimeout(() => { console.log('\nCFSTARTPICK FAIL: still not done after 25 minutes'); process.exit(1); }, 25 * 60000).unref();
if (!process.argv.includes('--no-lock')) await acquireBrowserLock();
const SRV = await startServer({ vars: { TEST_HOOKS: '1' } });
console.log(`local game server ${SRV.url}`);
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
async function mkCtx(o) {
  const ctx = await browser.newContext(o);
  await guardContext(ctx, SRV.url);
  await ctx.addInitScript(blockedPeerShim, SRV.url);
  // phones start on Low graphics; keep every page light so four battles load quickly on the test machine
  await ctx.addInitScript(() => { try { const k = 'ww3_settings'; const s = JSON.parse(localStorage.getItem(k) || '{}'); if (!s.gfx) { s.gfx = 'low'; localStorage.setItem(k, JSON.stringify(s)); } } catch (e) {} });
  await ctx.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith(SRV.url) ? r.continue() : r.abort());
  return ctx;
}
const ctx = await mkCtx({ viewport: { width: 1280, height: 800 } });
function watch(page, tag) {
  page.on('crash', () => { fail(`${tag} page crashed`); crashed(); });
  page.on('pageerror', e => fail(`${tag} page error: ` + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() !== 'error') return; const t = m.text();
    if (/ERR_FAILED|net::|Failed to load resource|WebSocket|ICE|AudioContext|autoplay|speechSynthesis|WebGL|GL_|GPU|shader/i.test(t)) warns.push(`${tag} console (ignored): ` + t.slice(0, 160)); else fail(`${tag} console error: ` + t.slice(0, 300)); });
}
async function load(page, url = URL0) {
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof hostGame === 'function' && typeof spotsDraw === 'function' && !!NET.room && !!document.getElementById('mapCv'), null, { timeout: 120000 });
}
async function openPage(tag, c = ctx) { const page = await c.newPage(); watch(page, tag); await load(page); return page; }
const waitFor = (page, fn, a, ms, what) => page.waitForFunction(fn, a, { timeout: ms, polling: 250 }).catch(() => { throw new Error('timed out waiting for ' + what); });
async function shot(page, name, opts = {}) { try { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, name), timeout: 120000, ...opts }); } catch (e) { warns.push(`screenshot ${name}: ${String(e.message || e).split('\n')[0]}`); } }

// click (or tap) start spot k on a preview canvas, like a player
async function hitSpot(page, sel, k, n, touch) {
  // (the lobby redraws itself whenever the server's lobby arrives: find the canvas, bring it into view and read where the
  // spot is in one step; the redrawn canvas sits in the same place)
  const p = await page.evaluate(([s, k, n]) => { const cv = document.querySelector(s); { const q = cv.getBoundingClientRect(); if (q.top < 0 || q.bottom > innerHeight) cv.scrollIntoView({ block: 'center' }); } const r = cv.getBoundingClientRect(), mk = s === '#mapCv' ? setup.map : lobMap(), [fx, fy] = startSpots(mk, n)[k]; return [r.left + fx * r.width, r.top + fy * r.height]; }, [sel, k, n]);
  if (touch) await page.touchscreen.tap(p[0], p[1]); else await page.mouse.click(p[0], p[1]);
  await page.waitForTimeout(120);
}
// where the battle put every side, and whether each side's HQ stands on its base
const battleBases = page => page.evaluate(() => ({ mode: MODE, bases: BASES.slice(0, G.teams.length).map(([x, y]) => [Math.round(x), Math.round(y)]),
  hq: G.teams.map((T, t) => { const b = BASES[t]; if (MODE === 'client' && (!(NET.lastSnapT > 0) || T.tm !== G.teams[ME].tm)) return null;   // a player's snapshots hold only what it can see
    return G.ents.some(e => e.team === t && !e.dead && Math.hypot(e.x - b[0], e.y - b[1]) < 40); }) }));
// the world position of spot k for a battle of n sides (what BASES must hold)
const spotXY = (page, k, n) => page.evaluate(([k, n]) => { const D = MAPS[G.mapKey]; return slotsOf(D, n)[k].map(v => Math.round(v * WK)); }, [k, n]);
async function expectBases(page, tag, want) {
  const B = await battleBases(page), n = B.bases.length;
  for (let i = 0; i < want.length; i++) {
    if (want[i] < 0) continue;
    const xy = await spotXY(page, want[i], n);
    if (Math.hypot(xy[0] - B.bases[i][0], xy[1] - B.bases[i][1]) > 1) fail(`${tag}: side ${i} should start at spot ${want[i] + 1} ${xy} but its base is at ${B.bases[i]}`);
  }
  B.hq.forEach((ok, t) => { if (ok === false) fail(`${tag}: side ${t} has no HQ on its base ${B.bases[t]}`); });
  return B;
}
// a multiplayer battle has started on this page (its sides and bases are set: the 3D loading may still be running) and,
// for a player, the host's snapshots have arrived (so the HQs seen are where the host put them); then its bases are checked
// (snap: a player also waits for the host's first snapshot. Two battles load one after the other in the test's single page process,
// so only one page waits for that and the other is checked as soon as its battle is set up.)
async function mpBases(page, mode, tag, want, snap) {
  await waitFor(page, ([m, sn]) => typeof G !== 'undefined' && G && MODE === m && G.teams && G.teams.length === 3 && (!sn || (m === 'host' || NET.lastSnapT > 0) && G.ents.length > 3), [mode, !!snap], 480000, `${tag}: the battle to start`);
  return expectBases(page, tag, want);
}
const inBattle = (page, mode) => waitFor(page, m => typeof G !== 'undefined' && G && MODE === m && !window.LOADING && G.ents.some(e => e.isB), mode, 240000, `the ${mode} battle to load`);

// the skirmish picks (strait, You + 3 AIs, so 8 spots): You on 1, AI 1 on 4, AI 2 Random, AI 3 on 2
async function skirmishPicks(page, touch) {
  await page.evaluate(m => { initAudio(); setup.p = 'IR'; setup.a = 'US'; setup.others = ['RU', 'CN']; const s = document.getElementById('mapSel'); s.value = m; s.onchange(); }, MAP);
  await waitFor(page, m => !!PREV[m], MAP, 30000, 'the map preview');
  await page.locator('#aiN button[data-n="3"]').click();
  await page.waitForTimeout(200);
  const n = await page.evaluate(() => skSides().length);
  if (n !== 4) throw new Error('expected 4 sides after choosing 3 AIs, got ' + n);
  // AI 3's Start menu: spot 2
  await page.locator('#teamList .trow').nth(3).locator('select.stsel').selectOption('1');
  await hitSpot(page, '#mapCv', 5, n, touch);   // You -> spot 6
  await hitSpot(page, '#mapCv', 3, n, touch);   // You moves to spot 4
  await hitSpot(page, '#mapCv', 3, n, touch);   // tapped again: spot 4 goes to AI 1, You back to Random
  await hitSpot(page, '#mapCv', 0, n, touch);   // You -> spot 1
  const st = await page.evaluate(() => skSt(skSides().length));
  if (JSON.stringify(st) !== JSON.stringify([0, 3, -1, 1])) fail(`skirmish${touch ? ' (touch)' : ''}: picks are ${JSON.stringify(st)}, expected [0,3,-1,1]`);
  // the menus show the picks
  const sel = await page.evaluate(() => [...document.querySelectorAll('#teamList select.stsel')].map(s => +s.value));
  if (JSON.stringify(sel) !== JSON.stringify([0, 3, -1, 1])) fail(`skirmish Start menus show ${JSON.stringify(sel)}`);
  return st;
}
// region of the page from the map picker to the team rows (the screenshot of the picker)
async function pickerClip(page) {
  await page.locator('#pickMap').scrollIntoViewIfNeeded();
  return page.evaluate(() => { const a = document.getElementById('pickMap').getBoundingClientRect(), b = document.getElementById('teamList').getBoundingClientRect(), x = Math.max(0, Math.min(a.left, b.left) - 8);
    return { x, y: Math.max(0, a.top + scrollY - 30), width: Math.min(innerWidth - x, Math.max(a.right, b.right) - x + 8), height: b.bottom - a.top + 40 }; });
}

// the leader's lobby picks (3 seats: leader, friend, computer): leader on 5, friend on 3, computer on 7
async function lobbyPicks(A) {
  await A.locator('.seat.open .addai').first().click({ timeout: 30000 });
  say('   computer player added');
  await waitFor(A, () => NET.ais.length === 1 && !!document.getElementById('lobSpots'), null, 20000, 'the computer player in the lobby');
  await A.waitForTimeout(400);
  const n = await A.evaluate(() => NET.lobby.length + 1 + NET.ais.length);
  await hitSpot(A, '#lobSpots', 6, n);   // leader -> 7
  await hitSpot(A, '#lobSpots', 6, n);   // friend -> 7
  await hitSpot(A, '#lobSpots', 6, n);   // computer -> 7
  await hitSpot(A, '#lobSpots', 4, n);   // leader -> 5
  await A.locator('#mpstatus .seat').nth(1).locator('select.stsel').selectOption('2');   // friend's Start menu: 3
  await A.waitForTimeout(300);
  const st = await A.evaluate(() => lobSt());
  if (JSON.stringify(st) !== JSON.stringify([4, 2, 6])) fail(`lobby picks are ${JSON.stringify(st)}, expected [4,2,6]`);
  return st;
}

let A, B, P;
async function main() {
  A = await openPage('player');
  say('page loaded');
  if (!process.argv.includes('--mp')) await skirmishSteps();
  await mpSteps();
}
async function skirmishSteps() {
  // ---- 1. skirmish with the mouse ----
  const st1 = await skirmishPicks(A, false);
  await shot(A, 'startpick-desktop.png', { clip: await pickerClip(A), fullPage: true });
  const pv = await A.evaluate(() => { const cv = document.getElementById('mapCv'); return cv.toDataURL().length; });
  await A.locator('#start').click({ timeout: 240000 });   // the click starts the battle (a long first step)
  await inBattle(A, 'single');
  const b1 = await expectBases(A, '1. skirmish', st1);
  // the side left on Random is where the preview showed it (slotOrder with the same picks)
  const rnd = await A.evaluate(st => slotOrder(MAPS[G.mapKey], st.length, st)[2], st1);
  const rxy = await spotXY(A, rnd, 4);
  if (Math.hypot(rxy[0] - b1.bases[2][0], rxy[1] - b1.bases[2][1]) > 1) fail(`1. AI 2 (Random) is not where the preview showed it (spot ${rnd + 1})`);
  say(`1. skirmish (mouse): picks ${JSON.stringify(st1)}, AI 2 Random -> spot ${rnd + 1}; bases ${JSON.stringify(b1.bases)}; HQs on their bases: ${b1.hq.every(Boolean)} (preview ${pv} bytes)`);

  // ---- 2. touch only, phone portrait ----
  const pctx = await mkCtx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  P = await openPage('phone', pctx);
  const st2 = await skirmishPicks(P, true);
  await shot(P, 'startpick-phone.png', { clip: await pickerClip(P), fullPage: true });
  await P.setViewportSize({ width: 844, height: 390 });
  await P.waitForTimeout(300);
  const land = await P.evaluate(() => { const r = document.getElementById('mapCv').getBoundingClientRect(), rows = [...document.querySelectorAll('#teamList .trow')].map(x => x.getBoundingClientRect());
    return { cv: r.width, over: document.documentElement.scrollWidth - innerWidth, rows: rows.every(q => q.right <= innerWidth + 1) }; });
  if (land.over > 1 || !land.rows || land.cv < 150) fail(`2. phone landscape: picker does not fit (${JSON.stringify(land)})`);
  await shot(P, 'startpick-phone-landscape.png', { clip: await pickerClip(P), fullPage: true });
  // (the battle itself is the same as step 1's: same picks, so the same bases; a phone-sized battle load is slow here)
  say(`2. phone (touch only): picks ${JSON.stringify(st2)} made by tapping; picker fits in landscape too (${JSON.stringify(land)})`);
  await P.close(); await pctx.close();
  await load(A);
}
async function mpSteps() {
  // ---- 3. Cloudflare battle ----
  B = await openPage('friend');
  await A.evaluate(m => { initAudio(); setup.p = 'IR'; const s = document.getElementById('mapSel'); s.value = m; s.onchange(); }, MAP);
  await A.evaluate(() => newBattle());
  await waitFor(A, () => NET.via === 'wsb' && NET.cf && NET.cf.own && NET.cf.blob && document.querySelector('#mpstatus .lob'), null, 40000, 'the leader\'s Cloudflare lobby');
  const code = await A.evaluate(() => NET.jcode);
  say(`3. leader's Cloudflare lobby ${code}`);
  await B.evaluate(c => { initAudio(); setup.p = 'RU'; joinByCode(c); }, code);
  await waitFor(A, () => NET.cf.blob.seats.filter(s => s.h).length === 2, null, 40000, 'the friend in the leader\'s lobby');
  if (await A.evaluate(() => NET.cf.blob.seats.some(s => 'st' in s))) fail('3. the server\'s lobby carries start spots before anyone picked one');
  say('   friend joined');
  const st3 = await lobbyPicks(A);
  say(`   lobby picks ${JSON.stringify(st3)}`);
  await waitFor(A, st => JSON.stringify(NET.cf.blob.seats.map(s => s.st >= 0 ? s.st : -1)) === JSON.stringify(st), st3, 20000, 'the server\'s lobby to hold the picked start spots');
  await shot(A, 'startpick-lobby.png', { fullPage: false });
  // (the pages stop drawing frames: two software-rendered battles in one test browser take minutes; bases, snapshots and
  // the host's own battle don't need them)
  await Promise.all([A, B].map(p => p.evaluate(() => { window.__stopLoop = true; })));
  await A.evaluate(() => document.querySelector('#mpstatus .startbtn').click());
  const [a3, b3] = await Promise.all([mpBases(A, 'client', '3. Cloudflare leader', st3), mpBases(B, 'client', '3. Cloudflare friend', st3, true)]);
  if (JSON.stringify(a3.bases) !== JSON.stringify(b3.bases)) fail(`3. leader and friend disagree on the bases: ${JSON.stringify(a3.bases)} vs ${JSON.stringify(b3.bases)}`);
  if (b3.hq[1] !== true) fail('3. the friend\'s own HQ is not on its picked spot in the server\'s snapshots');
  say(`3. Cloudflare battle ${code.toUpperCase()}: picks ${JSON.stringify(st3)}; both see bases ${JSON.stringify(a3.bases)}; the friend's HQ in the server's snapshots stands on its spot`);

  // ---- 4. browser-hosted fallback ----
  await Promise.all([A.goto('about:blank'), B.goto('about:blank')]);   // stop the step-3 battles before loading again
  await Promise.all([load(A), load(B)]);
  await A.evaluate(m => { initAudio(); setup.p = 'IR'; const s = document.getElementById('mapSel'); s.value = m; s.onchange(); }, MAP);
  await A.evaluate(() => hostGame());
  await waitFor(A, () => MODE === 'single' && NET.code && NET.code !== 'join' && NET.game && !NET.cf && document.querySelector('#mpstatus .lob'), null, 40000, 'the leader to host in its browser');
  const bcode = await A.evaluate(() => NET.code);
  await B.evaluate(c => { initAudio(); setup.p = 'RU'; joinByCode(c); }, bcode);
  await waitFor(A, () => NET.lobby.length === 1, null, 40000, 'the friend in the browser host\'s lobby');
  await A.evaluate(() => renderLobby()); await A.waitForTimeout(300);
  const st4 = await lobbyPicks(A);
  // (the pages stop drawing frames: two software-rendered battles in one test browser take minutes; bases, snapshots and
  // the host's own battle don't need them)
  await Promise.all([A, B].map(p => p.evaluate(() => { window.__stopLoop = true; })));
  await A.evaluate(() => document.querySelector('#mpstatus .startbtn').click());
  const [a4, b4] = await Promise.all([mpBases(A, 'host', '4. browser host', st4, true), mpBases(B, 'client', '4. browser-hosted friend', st4)]);
  if (JSON.stringify(a4.bases) !== JSON.stringify(b4.bases)) fail(`4. host and friend disagree on the bases: ${JSON.stringify(a4.bases)} vs ${JSON.stringify(b4.bases)}`);
  if (!a4.hq.every(v => v === true)) fail('4. the host did not put every HQ on its spot');
  say(`4. browser-hosted ${bcode.toUpperCase()}: picks ${JSON.stringify(st4)}; host and friend both see bases ${JSON.stringify(a4.bases)}; the host's HQs stand on them`);
  await Promise.all([A.goto('about:blank'), B.goto('about:blank')]);
}
try { await Promise.race([main(), crash]); } catch (e) { fail(String(e && e.message || e)); }
if (fails.length) { console.log('--- server log (tail) ---\n' + SRV.log().slice(-1500)); for (const [p, n] of [[A, 'startpick-player-fail.png'], [B, 'startpick-friend-fail.png']]) if (p) await shot(p, n); }
await browser.close().catch(() => {});
server.close(); SRV.stop();
for (const w of [...new Set(warns)].slice(0, 8)) console.log('  warn: ' + w);
const uniq = [...new Set(fails)];
if (uniq.length) { console.log(`\nCFSTARTPICK FAIL: ${uniq[0]} (${secs()})`); for (const f of uniq.slice(1, 15)) console.log('  ✗ ' + f); process.exit(1); }
console.log(`\nCFSTARTPICK PASS (${secs()}) — start spots picked by click, tap and Start menu; skirmish, Cloudflare and browser-hosted battles put every base on its spot, and host and players agree`);
process.exit(0);
