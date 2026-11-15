// Ground look proof pictures (orch/concepts/groundreal/): the same battle spots before and after a ground change.
//   node orch/groundshots.mjs before          # -> orch/concepts/groundreal/before-*.jpg
//   node orch/groundshots.mjs after           # -> after-*.jpg     (SHOTS=desert,close,fort,mountain,green,snow to pick)
// Each spot: a Battle map, AI off, a tank + infantry firefight in front of the player's base (tanks drive, so tracks show),
// camera at normal play zoom (560) or close (260). Swiftshader is slow: ~2-4 min per map.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch/concepts/groundreal');
fs.mkdirSync(OUT, { recursive: true });
const TAG = process.argv[2] || 'after';
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { } if (!pw || !pw.chromium) pw = req('/opt/npm-tools/node_modules/playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
const jpg = async name => { const f = path.join(OUT, TAG + '-' + name + '.jpg'); let q = 80; for (;;) { await page.screenshot({ path: f, type: 'jpeg', quality: q, timeout: 300000 }); if (fs.statSync(f).size < 245000 || q <= 40) break; q -= 8; } console.log('shot', path.relative(ROOT, f), (fs.statSync(f).size / 1024 | 0) + ' KB'); };
const want = (process.env.SHOTS || 'desert,close,fort,mountain,green,snow').split(',');
const SPOTS = [ // [name, map, dist, fortification line?]
  ['desert', 'bm_tarbasin', 560], ['close', 'bm_tarbasin', 260], ['fort', 'bm_tarbasin', 300, 1],
  ['mountain', process.env.MTN || 'bm_splitridge', 620], ['green', 'bm_fourmills', 560], ['snow', 'bm_splitridge', 560]].filter(s => want.includes(s[0]));
let lastMap = null;
for (const [name, map, dist, fort] of SPOTS) {
  if (map !== lastMap) {
    await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof startSingle === 'function' && typeof mxSetMode === 'function' && document.getElementById('mapSel'), null, { timeout: 120000 });
    await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) { } });
    await page.evaluate(k => { mxSetMode(/^bm_/.test(k) ? 'battle' : 'conquest'); setup.n = 1; const s = document.getElementById('mapSel'); s.value = k; if (s.value !== k) setup.map = k; else s.onchange(); startSingle(); }, map);
    await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.t >= 0 && typeof TERR !== 'undefined' && TERR, null, { timeout: 900000, polling: 500 });
    lastMap = map;
    // a firefight in front of the base: tanks drive across (tracks), infantry on both sides
    const info = await page.evaluate(() => { G.noShout = true; G.wx = { k: 'clear', t: 0, next: 1e9 }; G.fixWx = 'clear'; for (const T of G.teams) T.ai = null;
      const hq = G.ents.find(e => e.team === ME && e.isB), en = G.teams.findIndex((T, i) => i !== ME), cx = hq.x * .62 + MAPW / 2 * .38, cy = hq.y * .62 + MAPH / 2 * .38;
      const P = (x, y) => (typeof nearestPassXY === 'function' && nearestPassXY('ground', x, y)) || [x, y];
      const mine = [], his = [];
      for (let i = 0; i < 5; i++) { const p = P(cx - 150, cy - 100 + i * 45); mine.push(addUnit(ME, 'tank', p[0], p[1]).id); }
      for (let i = 0; i < 12; i++) { const p = P(cx - 60 + (i % 4) * 14, cy - 60 + (i / 4 | 0) * 40); mine.push(addUnit(ME, 'inf', p[0], p[1]).id); }
      for (let i = 0; i < 4; i++) { const p = P(cx + 260, cy - 80 + i * 50); his.push(addUnit(en, 'tank', p[0], p[1]).id); }
      for (let i = 0; i < 10; i++) { const p = P(cx + 200 + (i % 3) * 14, cy - 50 + (i / 3 | 0) * 35); his.push(addUnit(en, 'inf', p[0], p[1]).id); }
      act(ME, { t: 'go', ids: mine.slice(0, 5), x: cx + 120, y: cy + 60 }); act(en, { t: 'go', ids: his.slice(0, 4), x: cx - 40, y: cy - 40 });
      window.__spot = { x: cx + 40, y: cy }; return { map: G.mapKey, theme: G.map.theme, mtn: G.map.hasMtn, x: cx | 0, y: cy | 0 }; });
    console.log(name, JSON.stringify(info));
    await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });
    for (let k = 0; k < 14; k++) await page.evaluate(() => { for (let i = 0; i < 6; i++) simUpdate(1 / 30); try { renderFrame(.1); } catch (e) { } });
  }
  if (fort) await page.evaluate(() => { const s = window.__spot, d = G.ents.find(e => e.team === ME && e.kind === 'dozer'); const pts = [s.x - 160, s.y + 120, s.x - 60, s.y + 150, s.x + 40, s.y + 110, s.x + 130, s.y + 160];
    if (d) { d.x = s.x - 170; d.y = s.y + 110; act(ME, { t: 'wall', ids: [d.id], pts }); G.teams[ME].money = 99999; for (let i = 0; i < 30 * 60; i++) simUpdate(1 / 30); } window.__spot = { x: s.x - 20, y: s.y + 130 }; });
  await page.evaluate(([d]) => { const s = window.__spot; G.place = null; cam.dist = cam.td = d; cam._dl = d; centerOn(s.x, s.y, true); for (let i = 0; i < 6; i++) { simUpdate(1 / 30); try { renderFrame(.1); } catch (e) { } } }, [dist]);
  await page.waitForTimeout(2500); await jpg(name);
}
await browser.close(); server.close(); process.exit(0);
