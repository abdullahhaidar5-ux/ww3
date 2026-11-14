import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = argS('shots', ''), QUICK = process.argv.includes('--quick'); // --quick: desktop, first scene, closest zoom only
const HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.join(ROOT, 'orch', 'shots', process.env.WALK_SHOTS || 'infantry-walk');

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const page0 = fs.readFileSync(HTML);
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); } // no service worker: every run loads exactly this page
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
await acquireBrowserLock('walktest');
const dir = TAG ? path.join(OUT, TAG) : null; if (dir) fs.mkdirSync(dir, { recursive: true });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errs = [];
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';

async function open(ctxOpts) {
  const ctx = await browser.newContext(ctxOpts); await guardContext(ctx);
  // test only: the game gives up on a model download after 30 s; on a machine busy with other agents' browsers that drops
  // the soldier models (stand-ins with no skeleton fail every check). Let downloads finish however long they take.
  await ctx.addInitScript(() => { const AC = window.AbortController; if (AC) window.AbortController = class extends AC { abort() {} }; });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
  page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { const t = m.text(); if (/^live blds|^bld /.test(t)) console.log(t); if ((m.type() === 'error' || m.type() === 'warning') && !/net::|Failed to load|AudioContext|autoplay|speech|WebSocket|peer/i.test(t)) errs.push(m.type() + ': ' + t.slice(0, 300)); });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
  await page.evaluate(() => { window.__stopLoop = true; try { initAudio(); } catch (e) {} try { AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {} });
  return { ctx, page };
}
// Civilians (orch/civhumans): node orch/civshots.mjs <tag> [map] -> orch/concepts/civhumans/<tag>-{street,flee,close}.jpg (JPG < 250 KB)
// street = a town at normal play zoom with people walking; flee = the same street while gunfire starts; close = one civilian next to a soldier.
const SHOT = process.argv[2] || 'after', MAP = process.argv[3] || 'fulda';
const OUTD = path.join(ROOT, 'orch', 'concepts', 'civhumans'); fs.mkdirSync(OUTD, { recursive: true });
const { ctx, page } = await open({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await page.evaluate(async ([map]) => {
  if (G) G.over = true; Object.assign(setup, { map, n: 1, p: 'IR', a: 'US', others: [], tm: [], slot: -1, seed: 4242 });
  const ready = () => !!(MODELS.proto[solKey('IR')]);
  for (let tr = 0; tr < 3; tr++) { if (tr) G.over = true; startSingle(); const w0 = performance.now(); while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    while (!ready() && performance.now() - w0 < 600000) await new Promise(r => setTimeout(r, 250)); if (ready()) break; }
  G.paused = true;
}, [MAP]);
async function shot(name, clip) { await page.evaluate(() => { for (let k = 0; k < 3; k++) renderFrame(1 / 60); });
  const png = path.join(OUTD, `.${SHOT}-${name}.png`), jpg = path.join(OUTD, `${SHOT}-${name}.jpg`); await page.screenshot({ path: png, timeout: 180000, clip: clip || { x: 0, y: 0, width: 1280, height: 540 } });
  for (const q of [84, 76, 68, 60, 52, 44]) { execFileSync('convert', [png, '-resize', clip ? '1280x' : '1600x', '-quality', String(q), jpg]); if (fs.statSync(jpg).size < 250000) break; } fs.unlinkSync(png); console.log('shot', name, (fs.statSync(jpg).size / 1024 | 0) + ' KB'); }
async function aim(cx, cy) { await page.evaluate(([cx, cy]) => { const W = innerWidth, H = innerHeight - 180; for (let i = 0; i < 100; i++) { const f = toScreen(cx, 6, cy); cam.ty += (f.y - H / 2) * .12; cam.tx += (f.x - W / 2) * .12; cam.x = cam.tx; cam.y = cam.ty; placeCam(); } }, [cx, cy]); }
const info = await page.evaluate(() => {
  G.ents = G.ents.filter(e => e.isB); let best = null;
  for (const c of G.civ) { if (c.dead || c.ruin) continue; let n = 0; for (const d of G.civ) if (!d.dead && !d.ruin && Math.hypot(d.x - c.x, d.y - c.y) < 220) n++; if (!best || n > best.n) best = { c, n }; }
  const c = best.c; window.__c = c; cam.dist = cam.td = 330; cam.x = cam.tx = c.x; cam.y = cam.ty = c.y + 60; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist;
  window.__st = dt => { G.t += dt; G.alpha = 1; placeCam(); syncScene(dt); fxUpdate(dt); realTick(dt); };
  for (let k = 0; k < 900; k++) __st(1 / 30);
  return { n: RE.civ.length, x: c.x | 0, y: c.y | 0 };
});
console.log('street', JSON.stringify(info));
const ctr = () => page.evaluate(() => { const L = RE.civ.filter(q => !q.fl || 1); if (!L.length) return [__c.x, __c.y]; const a = L[0]; const N = L.filter(q => Math.hypot(q.x - a.x, q.y - a.y) < 260); return [N.reduce((s, q) => s + q.x, 0) / N.length, N.reduce((s, q) => s + q.y, 0) / N.length]; });
await page.evaluate(() => { cam.dist = cam.td = 280; cam.tilt = -.12; placeCam(); }); await aim(...await ctr()); await page.evaluate(() => { for (let k = 0; k < 3; k++) __st(1 / 60); });
await shot('street');
await page.evaluate(() => { const [x, y] = [cam.x, cam.y]; window.__fp = { x, y }; for (let k = 0; k < 30; k++) { const L = RE.civ; const a = L[0] || { x, y }; reMuz(a.x + 80 + (k % 7) * 6, a.y - 50, 0); if (k % 4 === 0) FXH.muz(a.x + 80 | 0, a.y - 50 | 0, 8, 0.3, 13); __st(1 / 30); } });
await page.evaluate(() => { cam.dist = cam.td = 260; placeCam(); }); await aim(...await ctr()); await page.evaluate(() => { for (let k = 0; k < 3; k++) { reMuz(cam.x + 90, cam.y - 50, 0); __st(1 / 30); } });
console.log('flee', JSON.stringify(await page.evaluate(() => [RE.civ.length, RE.civ.filter(p => p.fl).length])));
await shot('flee');
const cl = await page.evaluate(() => {
  RE.shots.fill(0); for (let k = 0; k < 300; k++) __st(1 / 30);
  const open = q => { for (let a = 0; a < 6.28; a += .5) for (const r of [8, 18]) if (!reFree(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r)) return false; return true; };
  let p = RE.civ.find(q => open(q)) || RE.civ[0]; if (!p) return null;
  p.age = 0; p.home = null; const u = addUnit(0, 'inf', p.x + 26, p.y + 22); u.hold = 1; window.__p = p; window.__u = u;
  cam.dist = cam.td = 200; cam.tilt = -.25; cam.x = cam.tx = p.x; cam.y = cam.ty = p.y; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist;
  for (let k = 0; k < 6; k++) __st(1 / 30);
  return { p: [p.x | 0, p.y | 0], n: RE.civ.length };
});
if (cl) { await aim(...await page.evaluate(() => [__p.x + 8, __p.y])); await page.evaluate(() => { for (let k = 0; k < 4; k++) { G.t += 1 / 60; syncScene(1 / 60); realTick(1 / 60); } }); }
console.log('close', JSON.stringify(cl));
await shot('close', { x: 320, y: 90, width: 640, height: 360 });
await browser.close(); server.close(); console.log(errs.slice(0, 5).join('\n') || 'no errors');
