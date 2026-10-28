// Review test (independent reviewer): in a battle on Cloudflare, the standby player's OWN connection drops for ~12 s
// while the server and the other player are fine. Expected: the standby comes back to the server battle (it was only a
// blip on its side). Bug if: the standby takes the battle over in its browser ("<code>-m1") while the server battle goes
// on with the other player: the battle splits in two.
// Runs two headless Chromium pages against a LOCAL `wrangler dev` (never the live servers), like orch/cfbattle.mjs.
//   node orch/review-cf-split.mjs --root <checkout with the browser client, e.g. orch/play-online> [--blip 12]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(argS('root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const BLIP = Number(argS('blip', 12));
const { startServer, guardContext } = await import(path.join(ROOT, 'orch', 'serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { pw = req('/opt/npm-tools/node_modules/playwright'); }
const SRV = await startServer({ vars: { TEST_HOOKS: '1', BATTLE_READY_MS: '240000' } });
const H = async (code, op, q = {}) => (await fetch(`${SRV.url}/battle-test/${code}?` + new URLSearchParams({ op, ...q }))).json();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const t0 = Date.now(), say = m => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
function blockedPeerShim(url) {
  window.WW3_SERVER = url;
  class BlockedPeer { constructor() { this._h = {}; setTimeout(() => (this._h.error || []).forEach(f => f(Object.assign(new Error('blocked'), { type: 'network' }))), 50); }
    on(t, f) { (this._h[t] = this._h[t] || []).push(f); return this; } connect() { return { on() {}, open: false, send() {} }; } destroy() {} disconnect() {} reconnect() {} }
  Object.defineProperty(window, 'Peer', { configurable: false, get: () => BlockedPeer, set: () => {} });
  Object.defineProperty(window, 'Trystero', { configurable: false, get: () => undefined, set: () => {} });
  // the review's network switch: while window.__netDown is set, every new WebSocket fails at once
  const W = window.WebSocket;
  function Sw(u, p) { if (window.__netDown) u = 'ws://127.0.0.1:9/down'; return p === undefined ? new W(u) : new W(u, p); }
  Sw.prototype = W.prototype; for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Sw[k] = W[k]; window.WebSocket = Sw;
}
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let verdict = 'REVIEW-SPLIT FAIL: did not finish';
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await guardContext(ctx, SRV.url);
  await ctx.addInitScript(blockedPeerShim, SRV.url);
  await ctx.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith(SRV.url) ? r.continue() : r.abort());
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => say('page error: ' + e.message.slice(0, 200)));
    await p.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 180000 });
    await p.waitForFunction(() => typeof hostCF === 'function' && !!NET.room, null, { timeout: 120000 }); return p; };
  const [A, B] = [await open(), await open()];
  const wf = (p, fn, a, ms, what) => p.waitForFunction(fn, a, { timeout: ms, polling: 250 }).catch(() => { throw new Error('timed out: ' + what); });
  await A.evaluate(() => { initAudio(); setup.p = 'US'; hostCF(); });
  await wf(A, () => NET.via === 'wsb' && NET.cf && NET.cf.own && NET.cf.blob, null, 30000, 'creator lobby on the server');
  const code = await A.evaluate(() => NET.jcode);
  await B.evaluate(c => { initAudio(); setup.p = 'RU'; joinByCode(c); }, code);
  await wf(A, () => NET.cf.blob.seats.filter(s => s.h).length === 2, null, 60000, 'friend in the lobby');
  await A.evaluate(() => { NET.tm = [0, 1]; renderLobby(); });
  await wf(A, () => !document.querySelector('#mpstatus .startbtn').disabled, null, 20000, 'Start enabled');
  await A.evaluate(() => { window.__stopLoop = true; }); await B.evaluate(() => { window.__stopLoop = true; });
  await A.evaluate(() => document.querySelector('#mpstatus .startbtn').click());
  for (const p of [A, B]) await wf(p, () => MODE === 'client' && G && window.LOADING === false, null, 600000, 'battle loaded');
  say(`battle ${code} running on the server; creator and friend are clients`);
  const tick = async n => { for (let i = 0; i < n; i++) { const w0 = Date.now();
    for (const p of [A, B]) await p.evaluate(() => { try { if (MODE === 'client') clientTick(0.1); else if (MODE === 'host') { for (let s = 0; s < 6; s++) simUpdate(1 / 60); netTick(0.1); } } catch (e) {} });
    const l = 100 - (Date.now() - w0); if (l > 0) await A.waitForTimeout(l); } };
  let sbi = -1;
  for (let i = 0; i < 40 && sbi < 0; i++) { await tick(10); const h = [await A.evaluate(() => !!(NET.isStandby && NET.lastCk)), await B.evaluate(() => !!(NET.isStandby && NET.lastCk))]; sbi = h.indexOf(true); }
  if (sbi < 0) throw new Error('no page became the standby');
  const S = [A, B][sbi], O = [A, B][1 - sbi];
  say(`standby is the ${sbi ? 'friend' : 'creator'}; its network now drops for ${BLIP} s (server and the other player are fine)`);
  await S.evaluate(() => { window.__netDown = true; NET.game._ws.close(); });
  const d0 = Date.now();
  while (Date.now() - d0 < BLIP * 1000) await tick(5);
  await S.evaluate(() => { window.__netDown = false; });
  say('standby network back');
  await tick(150);
  const s = await S.evaluate(() => ({ mode: MODE, gen: NET.gen | 0, via: NET.game && NET.game.via, recon: !!NET.recon }));
  const o = await O.evaluate(() => ({ mode: MODE, gen: NET.gen | 0, via: NET.game && NET.game.via, rx: performance.now() - (NET.lastRx || 0) }));
  const st = await H(code, '');
  say(`standby page: ${JSON.stringify(s)}; other page: ${JSON.stringify(o)}; server: phase ${st.phase}, sides held by ${JSON.stringify(st.peers)}`);
  const split = s.mode === 'host' && st.phase === 'battle' && o.mode === 'client' && o.gen === 0;
  verdict = split ? `REVIEW-SPLIT FAIL: the battle split in two — the standby runs its own copy in its browser (room gen ${s.gen}) while the server battle goes on with the other player`
    : s.mode === 'client' && s.gen === 0 && st.phase === 'battle' ? 'REVIEW-SPLIT PASS: the standby came back to the server battle' : 'REVIEW-SPLIT FAIL: unexpected state (see above)';
} catch (e) { verdict = 'REVIEW-SPLIT FAIL: ' + (e && e.message || e); }
await browser.close().catch(() => {}); server.close(); SRV.stop();
console.log(verdict);
process.exit(/PASS/.test(verdict) ? 0 : 1);
