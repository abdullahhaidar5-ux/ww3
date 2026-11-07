// Menu screenshots: node orch/menushots.mjs <tag> [screen,screen...]  -> orch/shots/menu/<tag>-<screen>-<w>.png (+ contact sheet note)
// Screens: title, or any menu screen id opened via menuGo(id) (see src/14-menu.js). Before the redesign only "title" exists.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { chromium } = await (async () => { try { return await import('playwright'); } catch {} const q = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return q(p); } catch {} } throw new Error('playwright not found'); })();
const tag = process.argv[2] || 'shot', screens = (process.argv[3] || 'title').split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h] of [[1920, 1080], [1600, 900]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`); await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 }); await page.waitForTimeout(2500);
  for (const s of screens) { if (s !== 'title') { await page.evaluate(id => typeof menuGo === 'function' && menuGo(id), s); await page.waitForTimeout(700); }
    await page.screenshot({ path: path.join(ROOT, `orch/shots/menu/${tag}-${s}-${w}.png`) }); }
  if (errs.length) console.log('pageerrors', w, errs.slice(0, 3));
}
await b.close(); server.close(); console.log('shots done', tag);
