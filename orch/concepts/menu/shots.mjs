// Living main menu proof pictures: node orch/concepts/menu/shots.mjs [campaign,battle,none] [nation=IR] [zoom=1]
// 1600x900 JPEGs -> orch/concepts/menu/menu-<case>.jpg. The campaign case starts a real campaign and stages one battle result for the marker;
// the battle case plays a real skirmish (both sides AI) for a while and saves it. The menu itself is always loaded with ?lazy=1 (no campaign code).
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.resolve(HERE, '../../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { chromium } = await (async () => { try { return await import('playwright'); } catch {} const q = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return q(p); } catch {} } throw new Error('playwright not found'); })();
const cases = (process.argv[2] || 'campaign,battle,none').split(','), nat = process.argv[3] || 'IR', zoom = +(process.argv[4] || 1);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = `http://127.0.0.1:${server.address().port}/index.html`;
for (const c of cases) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), page = await ctx.newPage(); const errs = [], ext = []; page.on('pageerror', e => errs.push(e.message));
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1') && !/^(data|blob):/.test(r.url())) ext.push(r.url().slice(0, 60)); });
  let info = {};
  if (c === 'campaign') { await page.goto(url); await page.waitForFunction(() => typeof grNew === 'function', null, { timeout: 120000 });
    info = await page.evaluate(nat => { grNew({ me: nat, seed: 99, len: 'std' }); for (let i = 0; i < 4; i++) grEndTurn(true);
      if (!GR_LASTB) { const mine = GCM.P.filter(p => p.land && GC.prov[p.i].o === nat), p = mine[Math.floor(mine.length / 2)], foe = Object.keys(GC.nat).find(k => k !== nat); grLastB({ p: p.i, an: foe, dn: nat }, 'def'); }
      grSave(); const i = JSON.parse(localStorage.getItem(GR_KEY + '.i')); return { n: i.n, d: i.d, noteKB: Math.round(JSON.stringify(i).length / 102.4) / 10, lb: i.lbn, scarsInSave: 'scars' in GC }; }, nat); }
  if (c === 'battle') { await page.goto(url + '?lazy=1'); await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
    await page.evaluate(nat => { setup.n = 1; setup.p = nat; setup.a = nat === 'RS' ? 'IL' : 'US'; startSingle(); if (G && G.teams[0] && !G.teams[0].ai && typeof mkAI === 'function') G.teams[0].ai = mkAI(1); }, nat === 'IR' ? 'RS' : nat);
    await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 });
    for (let i = 0; i < 60; i++) { const s = await page.evaluate(() => { for (let k = 0; k < 1200 && G && !G.over; k++) simUpdate(1 / 60); return { t: Math.round(G.t), over: !!G.over, foes: G.ents.filter(e => !e.dead && e.team >= 0 && !ally(e.team, ME) && vis(e)).length }; }); if (s.over || s.foes >= 6 && s.t > 300 || s.t > 900) break; }
    info = await page.evaluate(async () => { let r = null; for (let i = 0; i < 40 && !(r && r.ok); i++) { r = await svSave('Proof picture', 'manual'); if (!r.ok) await new Promise(q => setTimeout(q, 500)); } if (!r.ok) return { saved: false, why: r.msg, t: Math.round(G.t), over: !!G.over }; const L = await svList(); const m = L[0] || {}; return { saved: r && r.ok, map: m.mapName, fac: m.facName, t: m.t, sketchKB: m.wt ? Math.round(JSON.stringify(m.wt).length / 102.4) / 10 : 0, front: !!(m.wt && m.wt.e) }; }); }
  await page.goto(url + '?lazy=1'); await page.waitForFunction(() => typeof startSingle === 'function' && document.getElementById('mxbg'), null, { timeout: 120000 });
  if (zoom > 1) await page.evaluate(z => tsSet(z), zoom);
  await page.waitForTimeout(4000);
  const st = await page.evaluate(() => ({ grandLoaded: typeof grNew === 'function', table: !!document.querySelector('#mxwt.on'), cap: (document.getElementById('mxwar') || {}).innerText || '' }));
  await page.screenshot({ path: path.join(HERE, `menu-${c}${zoom > 1 ? '-' + Math.round(zoom * 100) : ''}.jpg`), type: 'jpeg', quality: 72 });
  console.log(c, JSON.stringify(info), JSON.stringify(st), 'other hosts:', JSON.stringify([...new Set(ext)]), errs.slice(0, 2).join(' | ')); await ctx.close();
}
await b.close(); server.close();
