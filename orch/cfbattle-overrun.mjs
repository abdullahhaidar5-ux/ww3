// Overrun guard end to end (orch/reports/net-host.md): a battle on the real BattleRoom (local `wrangler dev`, TEST_HOOKS)
// with two real pages. The creator's page reports a weak device, the friend's a strong PC (hostPower benchmark, hi.hp).
//   1. lobby on the server, friend joins by code, Start; both loading screens close
//   2. the server picks the strong PC (the friend, slot 1 - not the creator in slot 0) as its standby and sends it the
//      checkpoint
//   3. the server is made to fall behind real time (test hook `slow`: it gets only a third of the real time); after the overrun
//      guard's two 15 s windows it hands the battle over; the friend's PC takes it over as the browser host in
//      "<code>-m1", the creator follows
//   4. sync after the takeover: the new host is paused, sends the creator a full keyframe, and the creator's page must
//      match what the new host shows that side (entities, positions, HP, credits); the creator's side is still theirs
//   node orch/cfbattle-overrun.mjs [--no-lock]
// Prints CFOVER PASS / CFOVER FAIL: reason. Run by the ship gate's "cfclient" job (gate.yml runs orch/cfbattle*.mjs).
// Never touches the live servers (local wrangler dev only).
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
const SRV = await startServer({ vars: { TEST_HOOKS: '1', BATTLE_READY_MS: '240000', OVERRUN_GUARD: '1' }, quiet: !process.env.CFE2E_DEBUG });
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

let A, B;
async function main() {
  [A, B] = await Promise.all([openPage('creator'), openPage('friend')]);
  await Promise.all([A, B].map(p => p.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 240000 }).catch(() => warns.push('models still loading'))));
  await waitFor(A, () => !!NET.room && !!document.getElementById('playOnline'), null, 30000, 'the multiplayer menu');
  if (!(await A.evaluate(() => typeof hostPower === 'function' && typeof sbPick === 'function'))) { console.log('SKIP cfbattle-overrun: this build has no host benchmark (hostPower/sbPick)'); return 'skip'; }
  const real = await A.evaluate(() => hostPower());
  say(`pages loaded; this machine's host benchmark: ${real}`);
  if (!(real > 0)) fail('hostPower() gave no score');
  await A.evaluate(() => { initAudio(); setup.p = 'US'; NET.hp = 40; });     // a weak device
  await B.evaluate(() => { initAudio(); setup.p = 'RU'; NET.hp = 900; });    // a strong PC

  // ---- 1. lobby + start ----
  await A.evaluate(() => newBattle());
  await waitFor(A, () => NET.via === 'wsb' && NET.cf && NET.cf.own && NET.cf.blob && document.querySelector('#mpstatus .lob'), null, 30000, 'the creator\'s lobby on the server');
  const code = await A.evaluate(() => NET.jcode);
  const SB = () => H(code, 'state');
  await B.evaluate(c => joinByCode(c), code);
  await waitFor(B, () => NET.via === 'wsb' && /Joined/.test(document.getElementById('mpstatus').textContent), null, 60000, 'the friend to join by code');
  await waitFor(A, () => NET.cf.blob.seats.filter(s => s.h).length === 2, null, 20000, 'the friend in the creator\'s lobby');
  await A.evaluate(() => { NET.tm = [0, 1]; renderLobby(); });
  await B.evaluate(() => { GLB.g = NET.game; GLB.me.r = 1; glSend(); }); await A.waitForTimeout(1500);
  await waitFor(A, () => !document.querySelector('#mpstatus .startbtn').disabled, null, 15000, 'Start to be enabled');
  await A.evaluate(() => { window.__stopLoop = true; }); await B.evaluate(() => { window.__stopLoop = true; });
  await A.evaluate(() => document.querySelector('#mpstatus .startbtn').click());
  for (const [p, who] of [[A, 'creator'], [B, 'friend']]) {
    await waitFor(p, () => MODE === 'client' && G && G.teams.filter(Q => !Q.reb).length === 2, null, 300000, `the ${who} to enter the battle`);
    await waitFor(p, () => G && window.LOADING === false, null, 600000, `the ${who} to finish loading`);
  }
  let st = await SB();
  for (let i = 0; i < 100 && !(st.go && st.humans.every(h => h.rd)); i++) { await A.waitForTimeout(200); st = await SB(); }
  say(`1. battle ${code.toUpperCase()} running on the server: ${st.go}; slots creator ${await A.evaluate(() => ME)}, friend ${await B.evaluate(() => ME)}`);
  if (!st.go) fail('the battle did not start on the server');
  const tick = async n => { for (let i = 0; i < n; i++) { const w0 = Date.now();
      for (const p of [A, B]) await p.evaluate(() => { try { if (MODE === 'client') clientTick(0.1); else if (MODE === 'host') { for (let s = 0; s < 6; s++) simUpdate(1 / 60); netTick(0.1); } } catch (e) { console.error('tick: ' + e); } });
      const left = 100 - (Date.now() - w0); if (left > 0) await A.waitForTimeout(left); } };

  // ---- 2. the strong PC is the standby ----
  let sb = null; const s0 = Date.now();
  while (Date.now() - s0 < 60000) { await tick(5); st = await SB(); sb = st.sbHp; if (sb && sb.sb != null && await [A, B][sb.sb].evaluate(() => !!NET.isStandby)) break; }
  say(`2. server's standby: slot ${sb && sb.sb} (benchmarks the server holds: ${sb && sb.hp.join(', ')})`);
  if (!sb || sb.sb !== 1) fail(`the server did not pick the strong PC (slot 1) as its standby (picked ${sb && sb.sb})`);
  if (!(await B.evaluate(() => !!NET.isStandby))) fail('the strong PC holds no checkpoint');

  // ---- 3. overrun -> hand-over to the strong PC ----
  await H(code, 'slow', { k: 3 });
  say('3. the server is made to fall behind real time (it gets only a third of the real time)');
  const k0 = Date.now(); let ts = null, ovr = null;
  while (Date.now() - k0 < 90000) { await tick(3);
    const s = await SB(); if (s && s.ovr) ovr = s.ovr;
    ts = await Promise.all([A, B].map(p => p.evaluate(() => ({ mode: MODE, gen: NET.gen | 0, rx: performance.now() - (NET.lastRx || 0), recon: !!NET.recon }))));
    if (ts[1].mode === 'host' && ts[0].mode === 'client' && ts[0].gen === 1 && !ts[0].recon && ts[0].rx < 1000) break; }
  const gone = await SB();
  say(`   after ${((Date.now() - k0) / 1000).toFixed(1)} s: server battle ${gone.host === null ? 'closed' : gone.phase} (last window ${ovr && ovr.last}x real time); creator ${ts[0].mode} (room gen ${ts[0].gen}), friend ${ts[1].mode}`);
  if (gone.host !== null) fail('the server did not hand the battle over while falling behind real time');
  if (ts[1].mode !== 'host') fail('the strong PC (friend) did not take the battle over');
  if (ts[0].mode !== 'client' || ts[0].gen !== 1 || ts[0].recon) fail('the creator did not follow the new host');

  // ---- 4. sync after the takeover ----
  if (ts[1].mode === 'host' && ts[0].mode === 'client') {
    await tick(40);
    const v = await B.evaluate(() => ({ ai: !!G.teams[0].ai, disc: G.teams[0].discT || 0, aiHost: !!G.teams[ME].ai, t: G.t }));
    if (v.ai || v.disc) fail('after the takeover the creator\'s side was handed to the AI');
    if (v.aiHost) fail('after the takeover the new host\'s own side is run by the AI');
    // full keyframe to slot 0 from the paused new host, then compare
    for (let i = 0; i < 5; i++) { await B.evaluate(() => { NET.kf[0] = 0; NET.kf.all = 0; NET.snapT = 0; NET.teamT = 0; netTick(0.1); }); await A.waitForTimeout(250); await A.evaluate(() => clientTick(0.1)); }
    await A.waitForTimeout(400); await A.evaluate(() => clientTick(0.1));
    const Hv = await B.evaluate(k => { const out = []; for (const e of G.ents) { if (e.dead) continue; const own = e.team === k, vis = own || !!(e.vs && e.vs[k]);
        if (!vis && !(e.isB && ((e.sn | 0) & (1 << k)))) continue; out.push([e.id, e.kind, e.team, Math.round(e.x), Math.round(e.y), Math.round(e.hp), e.isB ? 1 : 0, vis ? 1 : 0]); }
      return { t: G.t, list: out, credits: Math.floor(G.teams[k].credits), all: G.ents.filter(e => !e.dead).length }; }, 0);
    const C = await A.evaluate(() => ({ t: NET.lastSnapT || 0, credits: G.teams[ME].credits, list: G.ents.filter(e => !e.dead && !e.gone).map(e => [e.id, e.kind, e.team, !e.isB && e.tx != null ? e.tx : e.x, !e.isB && e.ty != null ? e.ty : e.y, Math.round(e.hp), e.isB ? 1 : 0, e.mem ? 1 : 0]) }));
    const cm = new Map(C.list.map(a => [a[0], a])); let vis = 0; const missing = [], moved = [], wrong = [];
    for (const h of Hv.list) { if (!h[7]) continue; vis++; const c = cm.get(h[0]); if (!c) { missing.push(`${h[1]}#${h[0]}`); continue; }
      if (Math.hypot(c[3] - h[3], c[4] - h[4]) > 2) moved.push(`${h[1]}#${h[0]}`); if (c[2] !== h[2] || c[1] !== h[1] || Math.abs(c[5] - h[5]) > 1) wrong.push(`${h[1]}#${h[0]}`); }
    say(`4. after the takeover, t=${Hv.t.toFixed(0)} s: new host ${Hv.all} entities, creator's side sees ${vis}; creator's page: missing ${missing.length}, off-position ${moved.length}, mismatched ${wrong.length}; credits host ${Hv.credits} page ${Math.floor(C.credits)}`);
    const tol = n => Math.max(1, vis * .02) < n;
    if (!vis) fail('the creator\'s side sees nothing after the takeover');
    if (tol(missing.length)) fail(`creator is missing ${missing.length}/${vis} entities: ${missing.slice(0, 4)}`);
    if (tol(moved.length)) fail(`creator has ${moved.length} entities at the wrong spot: ${moved.slice(0, 4)}`);
    if (tol(wrong.length)) fail(`creator has ${wrong.length} entities that differ: ${wrong.slice(0, 4)}`);
    if (Math.abs(Hv.credits - C.credits) > 1) fail(`credits differ (host ${Hv.credits}, page ${Math.floor(C.credits)})`);
    await shot(A, 'cfover-takeover.png');
  }
}
let res = null;
try { res = await Promise.race([main(), crash]); } catch (e) { fail(String(e && e.message || e)); for (const [p, n] of [[A, 'cfover-creator-fail.png'], [B, 'cfover-friend-fail.png']]) if (p) await shot(p, n); }
await browser.close().catch(() => {});
server.close(); SRV.stop();
if (res === 'skip') process.exit(0);
for (const w of [...new Set(warns)].slice(0, 10)) console.log('  warn: ' + w);
const uniq = [...new Set(fails)];
if (uniq.length && process.env.CFE2E_DEBUG) console.log('server log:\n' + SRV.log().slice(-4000));
if (uniq.length) { console.log(`\nCFOVER FAIL: ${uniq[0]} (${secs()})`); for (const f of uniq.slice(1, 15)) console.log('  ✗ ' + f); process.exit(1); }
console.log(`\nCFOVER PASS (${secs()}) — the server picked the strong PC as standby, handed the battle to it when it fell behind real time, and the other player stayed in sync`);
process.exit(0);
