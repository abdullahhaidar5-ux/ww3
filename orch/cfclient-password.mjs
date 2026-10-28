// Password-protected games, browser side: two real game pages (headless Chromium) against the real servers (server/,
// local `wrangler dev`, orch/serverdev.mjs). No page can reach anything off this machine (guardContext), and
// browser-to-browser links are blocked (as on a strict network), so every join goes through the servers.
//
// Steps (each must pass):
//   1. Cloudflare battle: the creator types a password and hosts on Cloudflare; its lobby says "Password protected" and
//      its invite link carries the password in the fragment (#join=<code>&pw=…); the server's game list marks the
//      battle pw:1 and never contains the password
//   2. the friend's game list shows the battle with a 🔒; Join asks for the password; a wrong one is refused with
//      "Wrong password"; the right one joins (the friend's seat appears in the creator's server-sent lobby)
//   3. invite link: the friend opens the creator's invite link and is in the lobby in one go, with the password taken
//      off the address bar
//   4. browser-hosted fallback: the creator hosts in its own browser with a password (relay room on the server);
//      joining by code without it asks for it, a wrong one is refused, the right one joins the host's lobby
//
//   node orch/cfclient-password.mjs [--no-lock]
// Prints CFPASSWORD PASS / CFPASSWORD FAIL: reason. Screenshots: orch/out/pw-*.png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { startServer, guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const PW = 'Yalla 2026 ñ';

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
const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 } });
await guardContext(ctx, SRV.url);
await ctx.addInitScript(blockedPeerShim, SRV.url);
await ctx.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith(SRV.url) ? r.continue() : r.abort());
function watch(page, tag) {
  page.on('crash', () => { fail(`${tag} page crashed`); crashed(); });
  page.on('pageerror', e => fail(`${tag} page error: ` + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() !== 'error') return; const t = m.text();
    if (/ERR_FAILED|net::|Failed to load resource|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) warns.push(`${tag} console (ignored): ` + t.slice(0, 160)); else fail(`${tag} console error: ` + t.slice(0, 300)); });
}
async function load(page, url) {
  if (url.includes('#')) await page.goto('about:blank');   // a fragment-only change would not reload the page
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof hostGame === 'function' && typeof askPw === 'function' && !!NET.room, null, { timeout: 120000 });
}
async function openPage(tag, url = URL0) { const page = await ctx.newPage(); watch(page, tag); await load(page, url); return page; }
const waitFor = (page, fn, a, ms, what) => page.waitForFunction(fn, a, { timeout: ms, polling: 250 }).catch(() => { throw new Error('timed out waiting for ' + what); });
async function shot(page, name) { try { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, name), timeout: 120000 }); } catch (e) { warns.push(`screenshot ${name}: ${String(e.message || e).split('\n')[0]}`); } }
const status = p => p.evaluate(() => document.getElementById('mpstatus').textContent);
const pwRx = new RegExp([PW, encodeURIComponent(PW), Buffer.from(PW).toString('base64').replace(/=+$/, '')].map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
// type into the password prompt and press its Join button, like a player
async function answer(page, pw) {
  await waitFor(page, () => !!document.getElementById('joinpw'), null, 20000, 'the password prompt');
  await page.fill('#joinpw', pw);
  await page.click('#joinpwgo');
}

let A, B;
async function main() {
  [A, B] = await Promise.all([openPage('creator'), openPage('friend')]);
  say('both pages loaded');
  // ---- 1. a password-protected battle on Cloudflare ----
  const hasField = await A.evaluate(() => !!document.getElementById('hostpw'));
  if (!hasField) throw new Error('no password field next to "Host a game"');
  await A.evaluate(() => { initAudio(); setup.p = 'US'; try { localStorage.setItem('ww3_hostOn', 'cf'); } catch (e) {} });
  await A.fill('#hostpw', PW);
  await A.evaluate(() => hostGame());
  await waitFor(A, () => NET.via === 'wsb' && NET.cf && NET.cf.own && NET.cf.blob && document.querySelector('#mpstatus .lob'), null, 40000, 'the creator\'s Cloudflare lobby');
  const code = await A.evaluate(() => NET.jcode);
  const lobA = await status(A), inv = await A.evaluate(() => [inviteLink(), inviteText()]);
  say(`1. protected battle open on Cloudflare, code ${code.toUpperCase()}; invite link ${inv[0]}`);
  if (!/Password protected/.test(lobA)) fail('the creator\'s lobby does not say "Password protected"');
  if (!inv[0].includes(`#join=${code}&pw=${encodeURIComponent(PW)}`) || inv[0].includes('?')) fail('the invite link does not carry the password in its fragment: ' + inv[0]);
  if (!inv[1].includes(inv[0])) fail('the invite text does not contain the one-tap link');
  let gl = ''; for (let i = 0; i < 40 && !gl.includes('b-' + code); i++) { gl = await (await fetch(SRV.url + '/games')).text(); if (!gl.includes('b-' + code)) await A.waitForTimeout(250); }
  const be = (JSON.parse(gl || '{}').battles || []).find(([id]) => id === 'b-' + code);
  if (!be || be[1].g.pw !== 1) fail('the server does not mark the battle as password protected (pw:1): ' + gl.slice(0, 200));
  if (pwRx.test(gl)) fail('the server\'s game list contains the password');
  const rec = await (await fetch(`${SRV.url}/battle-test/${code}?op=pw`)).text();
  say(`   server keeps: ${rec.slice(0, 120)}`);
  if (pwRx.test(rec) || !/"h":"/.test(rec)) fail('the server should keep only a salted hash of the password: ' + rec.slice(0, 160));
  await shot(A, 'pw-lobby.png');

  // ---- 2. the friend: lock in the list, wrong password, right password ----
  await waitFor(B, c => NET.room.peers().some(q => q.presence && q.presence.g && q.presence.g.c === c && q.presence.g.pw), code, 20000, 'the protected battle in the friend\'s game list');
  await B.evaluate(() => { initAudio(); setup.p = 'RU'; return renderGames(); });
  const row = await B.evaluate(() => { const r = [...document.querySelectorAll('#games .game')].find(x => x.textContent.includes('🔒')); return r ? r.textContent : null; });
  say(`2. friend's game list: "${String(row).replace(/\s+/g, ' ').slice(0, 100)}"`);
  if (!row) throw new Error('no 🔒 game in the friend\'s game list');
  if (pwRx.test(await B.evaluate(() => JSON.stringify(NET.room.peers().map(q => q.presence))))) fail('the friend\'s copy of the game list contains the password');
  await B.evaluate(() => [...document.querySelectorAll('#games .game')].find(x => x.textContent.includes('🔒')).querySelector('button').click());
  await answer(B, 'yalla 2026 n');
  await waitFor(B, () => /Wrong password/.test(document.getElementById('mpstatus').textContent) && !!document.getElementById('joinpw'), null, 20000, '"Wrong password" for a wrong password');
  say(`   wrong password -> "${(await status(B)).slice(0, 60)}"`);
  if (await B.evaluate(() => !!NET.game)) fail('the friend stayed connected after a wrong password');
  await shot(B, 'pw-wrong.png');
  await answer(B, PW);
  await waitFor(B, () => NET.via === 'wsb' && /hosted on Cloudflare/.test(document.getElementById('mpstatus').textContent), null, 40000, 'the friend to join with the right password');
  await waitFor(A, () => NET.cf.blob.seats.filter(s => s.h).length === 2, null, 20000, 'the friend to appear in the creator\'s lobby');
  say(`   right password -> "${(await status(B)).slice(0, 80)}"; creator's lobby has 2 players`);

  // ---- 3. one-tap invite link ----
  await B.evaluate(() => leaveNet());
  await waitFor(A, () => NET.cf.blob.seats.filter(s => s.h).length === 1, null, 20000, 'the friend to leave the creator\'s lobby');
  await load(B, inv[0]);
  await waitFor(B, () => NET.via === 'wsb' && /hosted on Cloudflare/.test(document.getElementById('mpstatus').textContent), null, 40000, 'the friend to join from the invite link');
  const addr = await B.evaluate(() => location.href);
  say(`3. invite link joined in one go; address bar now ${addr.replace(ORIGIN, '')}`);
  if (/pw=/.test(addr)) fail('the password stayed in the address bar after joining from the invite link');
  await waitFor(A, () => NET.cf.blob.seats.filter(s => s.h).length === 2, null, 20000, 'the invited friend in the creator\'s lobby');
  await B.evaluate(() => leaveNet()); await A.evaluate(() => cancelHost());

  // ---- 4. browser-hosted fallback (relay room on the server + the host's own check) ----
  await A.evaluate(() => { try { localStorage.setItem('ww3_hostOn', 'browser'); } catch (e) {} });
  await A.fill('#hostpw', PW);
  await A.evaluate(() => hostGame());
  await waitFor(A, () => MODE === 'single' && NET.code && NET.code !== 'join' && NET.game && !NET.cf && NET.game._ws, null, 40000, 'the creator to host in its browser (with its relay room)');
  const bcode = await A.evaluate(() => NET.code);
  if (!/Password protected/.test(await status(A))) fail('the browser host\'s lobby does not say "Password protected"');
  const rr = await (await fetch(`${SRV.url}/room-test/${bcode}`)).text();
  if (pwRx.test(rr) || !/"h":"/.test(rr)) fail('the relay room should keep only a salted hash: ' + rr.slice(0, 160));
  await B.evaluate(c => { initAudio(); document.getElementById('jcode').value = c.toUpperCase(); joinByCode(c); }, bcode);
  await waitFor(B, () => !!document.getElementById('joinpw') && /password protected/i.test(document.getElementById('mpstatus').textContent), null, 40000, 'the friend to be asked for the password (join by code)');
  say(`4. browser-hosted ${bcode.toUpperCase()}: join by code asks "${(await status(B)).slice(0, 70)}"`);
  await answer(B, 'wrong');
  await waitFor(B, () => /Wrong password/.test(document.getElementById('mpstatus').textContent), null, 40000, '"Wrong password" from the browser-hosted game');
  await answer(B, PW);
  await waitFor(A, () => NET.lobby.length === 1, null, 40000, 'the friend in the browser host\'s lobby');
  await waitFor(B, () => /Joined/.test(document.getElementById('mpstatus').textContent), null, 20000, 'the friend to be told it joined');
  say(`   right password -> friend: "${(await status(B)).slice(0, 80)}"`);
  await shot(A, 'pw-browserhost.png');
}
try { await Promise.race([main(), crash]); } catch (e) { fail(String(e && e.message || e)); }
if (fails.length) { console.log('--- server log (tail) ---\n' + SRV.log().slice(-2000)); for (const [p, n] of [[A, 'creator'], [B, 'friend']]) if (p) try { console.log(n + ' status: ' + (await status(p)).slice(0, 300)); } catch {} }
if (fails.length) { for (const [p, n] of [[A, 'pw-creator-fail.png'], [B, 'pw-friend-fail.png']]) if (p) await shot(p, n); }
await browser.close().catch(() => {});
server.close(); SRV.stop();
for (const w of [...new Set(warns)].slice(0, 10)) console.log('  warn: ' + w);
const uniq = [...new Set(fails)];
if (uniq.length) { console.log(`\nCFPASSWORD FAIL: ${uniq[0]} (${secs()})`); for (const f of uniq.slice(1, 15)) console.log('  ✗ ' + f); process.exit(1); }
console.log(`\nCFPASSWORD PASS (${secs()}) — password-protected games: lock in the list, wrong password refused, right password and invite link join, server keeps only a hash, browser-hosted fallback checks it too`);
process.exit(0);
