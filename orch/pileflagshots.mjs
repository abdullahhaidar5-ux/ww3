// Proof pictures for the supply dump look and the rally flag (orch/concepts/pileflag/):
//   node orch/pileflagshots.mjs [--tag before|after] [--mode battle|conquest] [--flag-only]
// Supply dump close + normal play zoom at full / half / almost empty, and HQ selected with its rally flag vs after a click away.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch/concepts/pileflag');
fs.mkdirSync(OUT, { recursive: true });
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const TAG = arg('--tag') || 'after', MODE = arg('--mode') || 'battle';
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { } if (!pw || !pw.chromium) pw = req('/opt/npm-tools/node_modules/playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
const jpg = async name => { const f = path.join(OUT, TAG + '-' + name + '.jpg'); let q = 80; for (;;) { await page.screenshot({ path: f, type: 'jpeg', quality: q, timeout: 300000 }); if (fs.statSync(f).size < 245000 || q <= 35) break; q -= 8; } console.log('shot', TAG + '-' + name, Math.round(fs.statSync(f).size / 1024) + ' KB'); };
await page.goto(ORIGIN + '/index.html?lazy=1', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof mxSetMode === 'function' && document.getElementById('mapSel'), null, { timeout: 120000 });
await page.evaluate(m => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) { } mxSetMode(m); setup.n = 1; setup.p = 'RS'; startSingle(); }, MODE);
await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.t >= 0 && G.fieldObj, null, { timeout: 900000, polling: 500 });
const info = await page.evaluate(() => { for (const T of G.teams) if (T.ai) T.ai = null; for (let i = 0; i < 120; i++) simUpdate(1 / 60);
  for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none';
  const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'), f = G.fields.slice().sort((a, b) => Math.hypot(a.x - hq.x, a.y - hq.y) - Math.hypot(b.x - hq.x, b.y - hq.y))[0];
  window.__F = f; window.__HQ = hq; for (const t of G.teams) t.vis && 0; return { map: G.mapKey, fac: G.teams[ME].fac, fields: G.fields.length, f: [f.x | 0, f.y | 0, f.amt] }; });
console.log(JSON.stringify(info));
const stats = () => page.evaluate(() => { let t = 0, n = 0; for (const v of G.fieldObj) { if (v.grp) v.grp.traverse(o => { if (o.isMesh && o.visible) { n++; const g = o.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); if (v.m) { n++; t += v.m.geometry.drawRange.count === Infinity ? v.m.geometry.attributes.position.count / 3 : v.m.geometry.drawRange.count / 3; } } return n + ' meshes in all dumps, ' + Math.round(t / 1000) + 'k tris'; });
const view = async (dist, frac) => { await page.evaluate(([d, q]) => { const f = window.__F, a0 = (G.map.fields[G.fields.indexOf(f)] || {}).amt || 9000; f.amt = Math.round(a0 * q); G.sel = []; cam.dist = cam.td = d; centerOn(f.x, f.y, true); try { updateUI(); } catch (e) { } }, [dist, frac]); await page.waitForTimeout(800);
  for (let i = 0; i < 2; i++) { await page.evaluate(() => { const f = window.__F, w = screenToWorld(VW / 2, VH * .45); if (w) { cam.x += f.x - w.x; cam.y += f.y - w.y; cam.tx = cam.x; cam.ty = cam.y; cam._xl = cam.x; cam._yl = cam.y; } }); await page.waitForTimeout(2500); }
  await page.waitForTimeout(1500); };
for (const [nm, q] of process.argv.includes('--flag-only') ? [] : [['full', 1], ['half', .5], ['almostempty', .08]]) {
  await view(230, q); await jpg('pile-close-' + nm); console.log(nm, 'close', await stats());
  await view(560, q); await jpg('pile-play-' + nm);
}
await page.evaluate(() => { window.__F.amt = (G.map.fields[G.fields.indexOf(window.__F)] || {}).amt || 9000; });
// rally flag: select HQ, set rally by a click on the ground, then click the ground somewhere else
await page.evaluate(() => { const hq = window.__HQ; cam.dist = cam.td = 520; centerOn(hq.x, hq.y, true); G.sel = [hq]; try { updateUI(); } catch (e) { } });
await page.waitForTimeout(2500);
await page.evaluate(() => { const hq = window.__HQ, w = screenToWorld(VW * .4, VH * .4); if (w) { cam.x += hq.x - w.x; cam.y += hq.y - w.y; cam.tx = cam.x; cam.ty = cam.y; cam._xl = cam.x; cam._yl = cam.y; } });
await page.waitForTimeout(3000);
const cvb = await page.evaluate(() => { const r = cv.getBoundingClientRect(); return [r.left, r.top, VW, VH]; });
await page.mouse.move(cvb[0] + cvb[2] * .62, cvb[1] + cvb[3] * .62); await page.mouse.click(cvb[0] + cvb[2] * .62, cvb[1] + cvb[3] * .62); await page.waitForTimeout(400);
const r1 = await page.evaluate(() => ({ rally: G.teams[ME].rally, sel: G.sel.map(e => e.kind), flag: !!(RALLY && RALLY.visible) })); console.log('after setting rally (flash)', JSON.stringify(r1));
await jpg('flag-1-just-set');
await page.evaluate(() => { G.sel = [window.__HQ]; try { updateUI(); } catch (e) { } }); await page.waitForTimeout(1600);
const r2 = await page.evaluate(() => ({ flag: !!(RALLY && RALLY.visible) })); console.log('HQ selected again', JSON.stringify(r2)); await jpg('flag-2-hq-selected');
await page.evaluate(() => { G.sel = []; try { updateUI(); } catch (e) { } }); await page.waitForTimeout(300);
await page.mouse.move(cvb[0] + cvb[2] * .2, cvb[1] + cvb[3] * .3); await page.mouse.click(cvb[0] + cvb[2] * .2, cvb[1] + cvb[3] * .3); await page.waitForTimeout(400);
const r3 = await page.evaluate(() => ({ sel: G.sel.length, flag: !!(RALLY && RALLY.visible) })); console.log('after click away', JSON.stringify(r3)); await jpg('flag-3-clicked-away');
await browser.close(); server.close(); process.exit(0);
