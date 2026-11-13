// Declutter screenshots: a Conquest battle at 1920x1080 and 1600x900 (the grand campaign has no real-time battles since 2026-11-12).
//   node orch/declutter.mjs before|after      -> orch/shots/declutter/<tag>-conquest-<w>.png
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), TAG = process.argv[2] || 'after', OUT = path.join(ROOT, 'orch', 'shots', 'declutter'); fs.mkdirSync(OUT, { recursive: true });
const r0 = createRequire(import.meta.url); let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = r0(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe; for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
await acquireBrowserLock('declutter');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const O = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const SIZES = [[1920, 1080], [1600, 900]];
async function open(w, h) { const ctx = await browser.newContext({ viewport: { width: w, height: h } }); await guardContext(ctx); const page = await ctx.newPage(); page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.route('**/*', r => r.request().url().startsWith(O) ? r.continue() : r.abort()); await page.goto(O + '/index.html', { waitUntil: 'load', timeout: 120000 }); await page.waitForFunction(() => typeof startSingle === 'function' && typeof grNew === 'function', null, { timeout: 60000 }); return { ctx, page }; }
const shot = async (page, n) => { await page.waitForTimeout(600); await page.screenshot({ path: path.join(OUT, `${TAG}-${n}.png`), timeout: 120000 }).catch(e => console.log('skip', n)); };
for (const [w, h] of SIZES) {   // ---- Conquest
  const { ctx, page } = await open(w, h);
  await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; startSingle(); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
  await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; for (let i = 0; i < 120; i++) simUpdate(1 / 30); });
  await shot(page, `conquest-${w}`); await ctx.close(); }
await browser.close(); server.close(); console.log('DECLUTTER SHOTS', TAG);
