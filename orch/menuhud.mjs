// Battle HUD must not stay on screen over the menu (Abdullah 2026-11-06 19:52). Boots, starts a battle, shows the menu, checks.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { chromium } = await (async () => { try { return await import('playwright'); } catch {} const q = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return q(p); } catch {} } throw new Error('playwright not found'); })();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
let ok = false, why = '';
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(() => { startSingle(); $('menu').hidden = true; });
  await page.waitForFunction(() => { const h = document.getElementById('hudBar'); return h && !h.hidden && getComputedStyle(h).display !== 'none'; }, null, { timeout: 90000 });
  const r = await page.evaluate(async () => { $('menu').hidden = false; await new Promise(z => setTimeout(z, 600));
    return ['hudBar', 'hudFeed', 'lgBtn', 'cqBn', 'townp'].map(id => { const e = document.getElementById(id); return [id, !e || getComputedStyle(e).display === 'none' || e.hidden]; }); });
  const bad = r.filter(x => !x[1]).map(x => x[0]); ok = !bad.length; why = bad.join(',');
} catch (e) { why = String(e.message || e).split('\n')[0]; }
console.log(ok ? 'MENUHUD PASS' : 'MENUHUD FAIL ' + why); await b.close(); server.close(); process.exit(ok ? 0 : 1);
