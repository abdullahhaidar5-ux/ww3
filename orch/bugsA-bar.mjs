// Task: formation bar must not widen the HUD when a building is selected. Prints BAR PASS / FAIL.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { createRequire } from 'node:module';import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock('bugsA-bar'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; startSingle(); });
await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
const measure = async (label) => { await page.waitForTimeout(1200); const m = await page.evaluate(() => { const f = document.getElementById('fmb'); const sb = document.getElementById('side'); return { fmb: f ? getComputedStyle(f).display : 'none', sideScroll: sb ? [sb.scrollWidth, sb.clientWidth] : null, bodyScroll: [document.documentElement.scrollWidth, innerWidth] }; }); await page.screenshot({ path: path.join(OUT, 'bugsA-bar-' + label + '.png'), timeout: 300000 }); return m; };
await page.evaluate(() => { const b = G.ents.find(e => e.team === ME && e.isB); G.sel = [b]; updateUI(); renderSquads(); });
const a = await measure('building'); console.log('building', JSON.stringify(a));
await page.evaluate(() => { const us = G.ents.filter(e => e.team === ME && !e.isB && !e.dead).slice(0, 3); G.sel = us; updateUI(); renderSquads(); });
const b = await measure('units'); console.log('units', JSON.stringify(b));
const ok = a.fmb === 'none' && b.fmb !== 'none' && a.bodyScroll[0] <= a.bodyScroll[1];
console.log(ok ? 'BAR PASS' : 'BAR FAIL'); await browser.close(); server.close(); process.exit(ok ? 0 : 1);
