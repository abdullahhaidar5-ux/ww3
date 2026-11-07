// laneE: battle-look shots from Abdullah's view (IR base, desert, normal camera height). node orch/laneEshots.mjs <tag> [map] [fac]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const TAG = process.argv[2] || 'x', MAP = process.argv[3] || 'rivers', FAC = process.argv[4] || 'IR';
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs')); const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url); let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe; for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
await acquireBrowserLock('laneEshots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const SH = path.join(ROOT, 'orch', 'shots', 'laneE'); fs.mkdirSync(SH, { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }); await guardContext(ctx);
const page = await ctx.newPage(); await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
await page.evaluate(([m, f]) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.p = f; try { setup.map = m; } catch (e) {} startSingle(); }, [MAP, FAC]);
await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; for (const T of G.teams) if (T.ai) T.ai = null;
  const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); centerOn(hq.x + 60, hq.y + 60, true); for (let i = 0; i < 30; i++) simUpdate(1 / 30); updateUI(); });
await page.waitForTimeout(2500); if(!process.env.NOBASE){await page.screenshot({ path: path.join(SH, `${TAG}-base.png`), timeout: 300000 }); console.log('shot base');}
await page.evaluate(() => { const inf = G.ents.filter(e => e.team === ME && !e.isB && e.kind === 'inf'); const e = inf[0]; if (e) { centerOn(e.x, e.y, true); cam.dist = 110; cam.td = 110; for (let i = 0; i < 5; i++) simUpdate(1 / 30); } });
await page.waitForTimeout(2500); await page.screenshot({ path: path.join(SH, `${TAG}-close.png`), timeout: 300000 }); console.log('shot close');
await page.waitForTimeout(500); await browser.close(); server.close();
