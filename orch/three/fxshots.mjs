// FX before/after captures + frame-time probe for the Three.js upgrade.
//   node orch/three/fxshots.mjs <repoRoot> <outDir> <tag> [--perf] [--mobile]   (repoRoot = a worktree whose index.html to test)
// Deterministic: Math.random seeded, sim paused, main loop stopped, frames stepped by hand at a fixed dt.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const [ROOT, OUTD, TAG] = process.argv.slice(2);
const PERF = process.argv.includes('--perf'), MOBILE = process.argv.includes('--mobile');
const req = createRequire(import.meta.url);
const { chromium } = req('/opt/npm-tools/node_modules/playwright');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch', 'browserlock.mjs'));
await acquireBrowserLock('fxshots');
fs.mkdirSync(OUTD, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/octet-stream', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const base = '/opt/pw-browsers'; let exe;
for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(MOBILE ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } : { viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
await page.addInitScript(() => { let s = 0x2545F491; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /warn/.test(m.type())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined' && (MODELS.ready || !MODELS.loading), null, { timeout: 240000 });
const rev = await page.evaluate(() => THREE.REVISION);
console.log('three r' + rev);
async function battle(w) {
  await page.evaluate((w) => { setup.n = 1; setup.seed = 777; setup.w = w; setup.map = undefined; startSingle(); }, w);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
  await page.evaluate(() => { window.__stopLoop = true; G.paused = true; });
  await page.waitForTimeout(300);
}
// stage: camera at a fixed spot near base 0, then the effects
const stage = () => page.evaluate(() => {
  PARTS.length = 0; TRACERS.length = 0; const [bx, by] = BASES[0]; const x = Math.max(700, Math.min(MAPW - 700, bx + 260)), y = Math.max(700, Math.min(MAPH - 700, by + 120));
  cam.x = x; cam.y = y + 330; cam.dist = 470; window.__fxp = [x, y];
  boomFX(x - 120, y - 40, 40, true); boomFX(x + 60, y - 90, 18, false); boomFX(x + 150, y + 30, 9, false); FXH.smoke(x - 10, y + 90, 60);
  for (let i = 0; i < 6; i++) FXH.tr(x - 300, y + 160 + i * 6, 12, x + 40 + i * 9, y - 20, 4, false);
  FXH.muz(x - 300, y + 160, 12, 0, 14);
});
// each stepped frame is flushed (gl.finish) so SwiftShader never queues dozens of frames behind the next screenshot
const step = (n, dt = 1 / 60) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { renderFrame(dt); R3.getContext().finish(); } }, [n, dt]);
const shots = [];
async function snap(name) { const p = path.join(OUTD, `${TAG}-${name}.png`); await page.screenshot({ path: p, timeout: 900000 }); shots.push(p); console.log('shot', p); }
if (!PERF) {
  for (const [w, wn] of [[0, 'day'], [3, 'dusk']]) {
    await battle(w);
    await step(2); await stage(); await step(4); await snap(wn + '-boom');
    await step(18, 1 / 15); await snap(wn + '-smoke'); // ~1.2 s later: smoke spreading, fireballs fading
  }
} else {
  // frame-time probe: real main loop with explosions kept going, CPU throttled
  await battle(0);
  await page.evaluate(() => { G.paused = false; });
  await stage();
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await page.evaluate(async () => {
    const T = []; let n = 0; const [x, y] = window.__fxp;
    for (let i = 0; i < 40; i++) { if (i % 8 === 0) { boomFX(x + (i % 3) * 60 - 60, y, 30, i % 16 === 0); FXH.smoke(x, y + 60, 40); } const t0 = performance.now(); renderFrame(1 / 30); R3.getContext().finish(); T.push(performance.now() - t0); }
    T.sort((a, b) => a - b); return { med: T[T.length >> 1], p90: T[Math.floor(T.length * .9)], mean: T.reduce((a, b) => a + b, 0) / T.length, parts: PARTS.length, lv: QUAL.lv, phone: !!POST.phone };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log('PERF', TAG, JSON.stringify(r));
}
console.log('errors:', errs.slice(0, 12).join('\n  '));
await browser.close(); server.close();
