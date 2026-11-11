// Story-side screenshots (helper extras-story): node orch/storyshots.mjs [menu] [nations=IR,RS,US]
// menu: the living main menu (war table) for a saved campaign of each nation -> orch/shots/extras-story/menu-<NAT>.png (1600x900)
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), OUT = path.join(ROOT, 'orch/shots/extras-story'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { chromium } = await (async () => { try { return await import('playwright'); } catch {} const q = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return q(p); } catch {} } throw new Error('playwright not found'); })();
const what = process.argv[2] || 'menu', nats = (process.argv[3] || 'IR,RS,US').split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = `http://127.0.0.1:${server.address().port}/index.html`;
if (what === 'menu') for (const nat of nats) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(url); await page.waitForFunction(() => typeof grNew === 'function', null, { timeout: 90000 });
  const info = await page.evaluate(nat => { grNew({ me: nat, seed: 99, len: 'std' }); for (let i = 0; i < 4; i++) grEndTurn(true);
    if (!(GC.scars || []).some(s => s.an === nat || s.dn === nat)) { const mine = GCM.P.filter(p => p.land && GC.prov[p.i].o === nat), p = mine[Math.floor(mine.length / 2)], foe = Object.keys(GC.nat).find(c => c !== nat); grScar({ p: p.i, an: foe, dn: nat }, 'def', 'live'); }
    grSave(); const i = JSON.parse(localStorage.getItem(GR_KEY + '.i')); return { n: i.n, d: i.d, kb: Math.round(JSON.stringify(i).length / 102.4) / 10, b: i.wt && i.wt.b }; }, nat);
  await page.goto(url + '?lazy=1'); await page.waitForFunction(() => typeof startSingle === 'function' && document.querySelector('#mxwt.on'), null, { timeout: 90000 }); await page.waitForTimeout(2500);
  const grandLoaded = await page.evaluate(() => typeof grNew === 'function');
  await page.screenshot({ path: path.join(OUT, `menu-${nat}.png`) }); console.log('menu', nat, JSON.stringify(info), 'grand code loaded on menu:', grandLoaded, errs.slice(0, 2).join(' | ')); await ctx.close();
}
await b.close(); server.close();
