// Seamless-flow screenshots (helper seamless-flow): node orch/seamlessflowshots.mjs <tag>  -> orch/shots/seamless-flow/<tag>-<name>.png (1600x900)
// Shoots the same setup step in Conquest, Battle and the grand campaign so they can be compared side by side.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { chromium } = await (async () => { try { return await import('playwright'); } catch {} const q = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return q(p); } catch {} } throw new Error('playwright not found'); })();
const tag = process.argv[2] || 'shot', only = process.argv[3] ? process.argv[3].split(',') : null;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`); await page.waitForFunction(() => typeof startSingle === 'function' && typeof menuGo === 'function', null, { timeout: 90000 }); await page.waitForTimeout(2500);
const shot = async n => { if (only && !only.some(o => n.startsWith(o))) return; await page.waitForTimeout(700); await page.screenshot({ path: path.join(ROOT, `orch/shots/seamless-flow/${tag}-${n}.png`) }); };
const steps = await page.evaluate(() => (typeof MX_STEPS !== 'undefined' ? MX_STEPS.map(s => s[0]) : []));
for (const mode of ['conquest', 'battle']) {
  await page.evaluate(m => { menuHome(); menuGo('single'); mxSetMode(m); }, mode);
  for (const s of steps) { await page.evaluate(id => menuGo(id), s); await shot(mode + '-' + s); }
}
await page.evaluate(() => { menuHome(); menuGo('single'); }); await shot('single');
await page.evaluate(() => { menuHome(); mxOnline('conquest'); }); await shot('online');
// campaign: the grand bundle loads on demand
await page.evaluate(() => { menuHome(); document.getElementById('grandBtn').click(); });
await page.waitForFunction(() => typeof grandSetup === 'function', null, { timeout: 90000 }); await page.waitForTimeout(800); await shot('campaign-menu');
await page.evaluate(() => grandSetup()); await shot('campaign-1');
for (const i of [2, 3]) { const ok = await page.evaluate(i => { if (typeof gsStep === 'function') { gsStep(i - 1); return 1; } return 0; }, i); if (ok) await shot('campaign-' + i); }
if (errs.length) console.log('pageerrors', errs.slice(0, 5));
await b.close(); server.close(); console.log('shots done', tag);
