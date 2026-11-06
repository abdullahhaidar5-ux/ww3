import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPlaywright() { try { return await import('playwright'); } catch {} const req = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright']) { try { return req(p); } catch {} } }
function findChromium() { const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {} }
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright(); const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 840 } }); await guardContext(ctx); const page = await ctx.newPage(); await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 }); await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await page.evaluate(() => { setup.n = 1; setup.map = 'rivers'; startSingle(); }); await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 });
  const r = await page.evaluate(() => { G.paused = true; const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); const c = G.civ.find(c => !c.ruin && !c.dead && Math.hypot(c.x - hq.x, c.y - hq.y) > 400); c.hp = c.max * .2; civStage(c); camTarget(); cam.td = cam.dist = 300; centerOn(c.x, c.y, true); for (let i = 0; i < 3; i++) renderFrame(.016);
    const n0 = PARTS.length; let err = null; try { for (let i = 0; i < 30; i++) bfCivTick(.1); } catch (e) { err = String(e.stack || e).slice(0, 300); } return { err, stg: c.stg, inset: BFX.civ.has(c), n0, n1: PARTS.length, view: inView(c.x, c.y, .25), c: [c.x, c.y, c.h] }; });
  console.log(JSON.stringify(r));
  if (process.env.SHOT) { await page.evaluate(([x, y]) => { camTarget(); cam.td = cam.dist = 650; centerOn(x, y, true); for (let i = 0; i < 3; i++) renderFrame(.016); }, [JSON.parse(process.env.SHOT)[0], JSON.parse(process.env.SHOT)[1]]); await page.waitForTimeout(500); await page.evaluate(() => { renderFrame(.016); renderFrame(.016); }); await page.screenshot({ path: '/tmp/dbg.png', timeout: 240000 }); }
} finally { await browser.close(); server.close(); }
