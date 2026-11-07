// Menu v3 flow: title -> Conquest screens (click-through, Esc/Back one step) -> Start battle from the Players screen -> battle starts.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { chromium } = await (async () => { try { return await import('playwright'); } catch {} const q = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return q(p); } catch {} } throw new Error('playwright not found'); })();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
let ok = false, why = '';
const cur = () => page.evaluate(() => MX.cur);
const click = t => page.evaluate(t => { const e = [...document.querySelectorAll('#menu .mxi,#menu .mxgo,#menu .mxlink')].find(x => (x.textContent || '').trim().toLowerCase().startsWith(t)); if (!e) return false; e.click(); return true; }, t);
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`); await page.waitForFunction(() => typeof menuGo === 'function', null, { timeout: 60000 }); await page.waitForTimeout(1500);
  const step = async (want, label) => { try { await page.waitForFunction(w => MX.cur === w, want, { timeout: 8000 }); } catch { throw new Error(`${label}: on ${await cur()}, wanted ${want}`); } };
  if (!await click('conquest')) throw new Error('no Conquest item'); await step('c-map', 'Conquest');
  await page.evaluate(() => document.querySelector('#mx .mxmap:nth-child(2)').click()); await step('c-nation', 'pick map');
  await page.evaluate(() => document.querySelector('#pickP .fac:nth-child(3)').click()); await step('c-players', 'pick nation');
  const me = await page.evaluate(() => setup.p); if (me !== 'IL') throw new Error('nation not set: ' + me);
  await page.keyboard.press('Escape'); await step('c-nation', 'Esc 1'); await page.keyboard.press('Escape'); await step('c-map', 'Esc 2'); await page.keyboard.press('Escape'); await step('title', 'Esc 3');
  await page.evaluate(() => menuGo('c-players')); await page.waitForTimeout(500);
  await click('start battle');
  await page.waitForFunction(() => document.getElementById('menu').hidden && typeof G !== 'undefined' && G && !G.over, null, { timeout: 150000 }); ok = true;
} catch (e) { why = String(e.message || e).split('\n')[0]; }
if (errs.length) { ok = false; why += ' pageerror: ' + errs[0]; }
console.log(ok ? 'MENUFLOW PASS' : 'MENUFLOW FAIL ' + why); await b.close(); server.close(); process.exit(ok ? 0 : 1);
