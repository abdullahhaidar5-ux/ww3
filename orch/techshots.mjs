// Proof pictures of the capturable Battle buildings (orch/concepts/techbldgs/*.jpg): each building close up, one being captured,
// the minimap with their icons. Slow in a sandbox browser (software GL).   node orch/techshots.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch/concepts/techbldgs');
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
const jpg = async (name, clip) => { const f = path.join(OUT, name + '.jpg'); let q = 80; for (;;) { await page.screenshot({ path: f, type: 'jpeg', quality: q, timeout: 300000, ...(clip ? { clip } : {}) }); if (fs.statSync(f).size < 245000 || q <= 35) break; q -= 8; } console.log(name, fs.statSync(f).size); };
const frame = async o => {   // o = JS expression giving the building; centre it on screen (the camera looks at an angle)
  for (let i = 0; i < 4; i++) { await page.evaluate(e => { const o = eval(e), w = screenToWorld(innerWidth / 2, innerHeight * .42); if (!w) return; cam.x += o.x - w.x; cam.y += o.y - w.y; cam.tx = cam.x; cam.ty = cam.y; cam._xl = cam.x; cam._yl = cam.y; }, o); await page.waitForTimeout(1200); } };
const MAPS = [['ferryquarter', ['hosp', 'mine']], ['splitridge', ['plant', 'quarry']]];
for (const [id, kinds] of MAPS) {
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof mxSetMode === 'function' && document.getElementById('mapSel'), null, { timeout: 120000 });
  await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) { } });
  await page.evaluate(k => { mxSetMode('battle'); setup.n = 1; const s = document.getElementById('mapSel'); s.value = k; s.onchange(); startSingle(); }, 'bm_' + id);
  await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.t >= 0, null, { timeout: 900000, polling: 500 });
  await page.evaluate(() => { for (const T of G.teams) if (T.ai) T.ai = null; for (let i = 0; i < 120; i++) simUpdate(1 / 60); for (const el of document.querySelectorAll('div')) if (/^Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 120) el.style.display = 'none'; });
  for (const k of kinds) {
    // held by me (flag in my colour), camera close
    await page.evaluate(k => { const o = G.oil.find(q => q.tb === k); o.owner = ME; o.cp.fill(0); cam.dist = 330; cam.td = 330; centerOn(o.x, o.y, true); cam.x = cam.tx; cam.y = cam.ty; }, k);
    await page.waitForTimeout(1500); await frame(`G.oil.find(q => q.tb === '${k}')`); await jpg(`${k}-held`);
  }
  if (id === 'ferryquarter') {
    // being captured: infantry beside the neutral mine, capture bar half full
    await page.evaluate(() => { const o = G.oil.filter(q => q.tb === 'mine')[1]; o.owner = -1; for (let k = 0; k < 4; k++) { const u = addUnit(ME, 'inf', o.x + 12 * k - 20, o.y + 22); u.order = null; } for (let i = 0; i < 60 * 3; i++) simUpdate(1 / 60); cam.dist = 330; cam.td = 330; centerOn(o.x, o.y, true); cam.x = cam.tx; cam.y = cam.ty; });
    await page.waitForTimeout(1500); await frame("G.oil.filter(q => q.tb === 'mine')[1]"); await jpg('mine-being-captured');
    await page.evaluate(() => { G.oil.forEach(o => { if (o.tb && o.owner < 0 && o.tb !== 'mine') o.owner = 1 % G.teams.length; }); cam.dist = 700; cam.td = 700; const m = G.oil.find(q => q.tb); centerOn(m.x, m.y, true); try { updateUI(); } catch (e) { } });
    await page.waitForTimeout(2000);
    const box = await page.evaluate(() => { const r = document.getElementById('mm').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    await jpg('minimap-icons', { x: Math.max(0, box.x - 4), y: Math.max(0, box.y - 4), width: box.width + 8, height: box.height + 8 });
  }
}
await browser.close(); server.close(); process.exit(0);
