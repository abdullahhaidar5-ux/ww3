// Battle map list + in-game pictures (proof for orch/concepts/battlemaps/), and a check that the list follows the game:
//   node orch/battlemapshots.mjs            # list windows only (fast)  -> BATTLEMAPLIST PASS / FAIL
//   node orch/battlemapshots.mjs --ingame   # + one in-game picture per theme (slow in a sandbox browser)
// Overview pictures (top-down, starts and resources marked) come from orch/battlemapshots.py.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch/concepts/battlemaps');
fs.mkdirSync(OUT, { recursive: true });
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { } if (!pw || !pw.chromium) pw = req('/opt/npm-tools/node_modules/playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
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
let ok = true; const bad = m => { ok = false; console.log('FAIL', m); };
const jpg = async name => { const f = path.join(OUT, name + '.jpg'); let q = 82; for (;;) { await page.screenshot({ path: f, type: 'jpeg', quality: q, timeout: 300000 }); if (fs.statSync(f).size < 295000 || q <= 40) break; q -= 10; } console.log('shot', name, Math.round(fs.statSync(f).size / 1024) + ' KB'); };
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof mxSetMode === 'function' && typeof BM_KEYS !== 'undefined' && document.getElementById('mapSel'), null, { timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) { } });
// Conquest: its own list, no Battle map in it
const c0 = await page.evaluate(() => { mxSetMode('conquest'); return { opts: [...document.getElementById('mapSel').options].map(o => o.value).filter(k => !/^cm_/.test(k)), keys: MAP_KEYS.slice(), map: setup.map }; });
if (c0.opts.join() !== c0.keys.join() || c0.opts.some(k => /^bm_/.test(k)) || /^bm_/.test(c0.map)) bad('Conquest list changed: ' + c0.opts.length + ' options vs ' + c0.keys.length + ' maps, chosen ' + c0.map);
// Battle: the Battle map list
const b0 = await page.evaluate(() => { mxSetMode('battle'); return { opts: [...document.getElementById('mapSel').options].map(o => o.value).filter(k => !/^cm_/.test(k)), keys: BM_KEYS.slice(), map: setup.map }; });
if (b0.opts.join() !== b0.keys.join() || !/^bm_/.test(b0.map)) bad('Battle setup does not offer the Battle map list: ' + b0.opts.join(',') + ' chosen ' + b0.map);
await page.evaluate(() => { menuGo('c-map'); }); await page.waitForTimeout(6000);
const cards = await page.evaluate(() => [...document.querySelectorAll('.mxmap')].filter(b => b.offsetParent).map(b => b.dataset.k + '|' + b.querySelector('.f').textContent));
if (cards.length !== b0.keys.length) bad('Battle map window shows ' + cards.length + ' cards for ' + b0.keys.length + ' maps');
console.log(cards.join('\n'));
await jpg('list-battle-setup');
await page.evaluate(() => mapPickerOpen(document.getElementById('mapSel'), () => { })); await page.waitForTimeout(5000);
const rows = await page.evaluate(() => [...document.querySelectorAll('#mapPickW [data-k]')].map(e => e.dataset.k));
if (rows.join() !== b0.keys.join()) bad('Battle map picker rows: ' + rows.join(','));
if (!(await page.evaluate(() => !!document.getElementById('mpMore')))) bad('no "Conquest battlefields too" link');
await jpg('list-battle-picker');
await page.keyboard.press('Escape');
// back to Conquest: the Conquest map comes back
const c1 = await page.evaluate(() => { mxSetMode('conquest'); return { n: document.getElementById('mapSel').options.length, map: setup.map }; });
if (/^bm_/.test(c1.map) || c1.n < c0.keys.length) bad('switching back to Conquest kept a Battle map: ' + c1.map);
console.log(ok ? 'BATTLEMAPLIST PASS' : 'BATTLEMAPLIST FAIL');
if (process.argv.includes('--ingame')) {
  const want = (process.env.MAPS || 'tarbasin,splitridge,ferryquarter,breakwater').split(',');
  for (const id of want) {
    await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof startSingle === 'function' && typeof mxSetMode === 'function' && document.getElementById('mapSel'), null, { timeout: 120000 });
    await page.evaluate(k => { mxSetMode('battle'); setup.n = 1; const s = document.getElementById('mapSel'); s.value = k; s.onchange(); startSingle(); }, 'bm_' + id);
    await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.t >= 0, null, { timeout: 900000, polling: 500 });
    const info = await page.evaluate(() => { for (const T of G.teams) if (T.ai) T.ai = null; for (let i = 0; i < 240; i++) simUpdate(1 / 60); const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'), f = G.fields.slice().sort((a, b) => Math.hypot(a.x - hq.x, a.y - hq.y) - Math.hypot(b.x - hq.x, b.y - hq.y))[0];
      centerOn((hq.x * 2 + f.x) / 3, (hq.y * 2 + f.y) / 3, true); try { updateUI(); } catch (e) { } return { battle: !!G.battle, map: G.mapKey, fields: G.fields.length, oil: G.oil.length }; });
    console.log(id, JSON.stringify(info)); if (!info.battle || info.map !== 'bm_' + id) bad('in-game ' + id);
    await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });
    await page.waitForTimeout(4000); await jpg('ingame-' + id);
  }
  console.log(ok ? 'BATTLEMAPSHOTS PASS' : 'BATTLEMAPSHOTS FAIL');
}
await browser.close(); server.close(); process.exit(ok ? 0 : 1);
