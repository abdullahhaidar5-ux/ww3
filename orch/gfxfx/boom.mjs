// Graphics Phase 4 (light and effects): a 3-shot sequence of one big explosion, same seed and camera in any build.
//   node orch/gfxfx/boom.mjs <repoRoot> <outDir> <tag> [--mobile]   (repoRoot = a worktree whose index.html to test)
// Deterministic: Math.random seeded, sim paused, main loop stopped, frames stepped by hand at a fixed dt.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const [ROOT, OUTD, TAG] = process.argv.slice(2);
const MOBILE = process.argv.includes('--mobile');
const req = createRequire(import.meta.url);
const { chromium } = req('/opt/npm-tools/node_modules/playwright');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch', 'browserlock.mjs'));
await acquireBrowserLock('gfxfx-boom');
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
const step = (n, dt = 1 / 60) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { renderFrame(dt); R3.getContext().finish(); } }, [n, dt]);
async function snap(name) { const p = path.join(OUTD, `${TAG}-${name}.png`); await page.screenshot({ path: p, timeout: 900000 }); console.log('shot', p); }
await battle(0);
await step(2);
await page.evaluate(() => { PARTS.length = 0; TRACERS.length = 0; const [bx, by] = BASES[0]; const x = Math.max(700, Math.min(MAPW - 700, bx + 260)), y = Math.max(700, Math.min(MAPH - 700, by + 120));
  cam.x = x; cam.y = y + 150; cam.dist = 340; boomFX(x, y, 40, true); });
await step(5); await snap('boom-1-fireball');            // ~0.08 s: flash and fireball
await step(9, 1 / 15); await snap('boom-2-debris');      // ~0.7 s: debris and dirt in the air, fireball rolling up
await step(36, 1 / 15); await snap('boom-3-dust');       // ~3.1 s: lingering dust and the smoke column
console.log('errors:', errs.slice(0, 12).join('\n  '));
await browser.close(); server.close();
