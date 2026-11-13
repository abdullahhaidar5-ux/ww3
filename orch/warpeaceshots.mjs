// Pictures for the war & peace work (helper warpeace 2026-11-13): node orch/warpeaceshots.mjs [occupied,score,reason,table]
// Writes JPGs (under 300 KB) into orch/concepts/warpeace/. The sandbox starves requestAnimationFrame, so frames are driven by hand.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 860 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof grNew === 'function' && typeof gpOpen === 'function', null, { timeout: 120000 });
const OUTD = path.join(ROOT, 'orch', 'concepts', 'warpeace'); fs.mkdirSync(OUTD, { recursive: true });
const ONLY = (process.argv[2] || '').split(',').filter(Boolean), want = n => !ONLY.length || ONLY.includes(n);
const frames = async k => { for (let i = 0; i < k; i++) { await page.evaluate(() => { for (const q of ['x', 'z', 'd', 'yaw', 'pitch']) G3.cc[q] = G3.camera[q]; G3.moved = true; G3.lblDirty = true; cancelAnimationFrame(G3.raf); g3Frame(performance.now()); }); await page.waitForTimeout(150); } };
const shot = async (n, wait = 3000) => { await frames(3); await page.waitForTimeout(wait); await frames(4); await page.waitForTimeout(300); const f = path.join(OUTD, n + '.jpg'); let q = 78; do { await page.screenshot({ path: f, type: 'jpeg', quality: q, timeout: 120000 }); q -= 10; } while (fs.statSync(f).size > 295000 && q > 30); console.log('shot', n, Math.round(fs.statSync(f).size / 1024) + ' KB'); };
// one campaign for every picture: Iran at war with Iraq, two Iraqi border provinces occupied
console.log("page ready");
const info = await page.evaluate(() => { grNew({ me: 'IR', seed: 99, len: 'std' }); grSave(); grandOpen(); const me = 'IR', foe = 'IQ';
  if (typeof gdAct === 'function' && typeof gcbPick === 'function') { /* items 2-3: declare with a reason */ } grDeclare(me, foe); GC.wsT = GC.wsT || {}; GC.wsT[grWk(me, foe)] = GC.turn - 7;
  const tk = []; for (const p of GCM.P) if (p.land && GC.prov[p.i].o === foe && GC.nat[foe].cap !== p.i && p.adj.some(j => GCM.P[j].land && GC.prov[j].o === me) && tk.length < 2) tk.push(p.i);
  const mine = GC.armies.filter(x => x.o === me && !x.fl); tk.forEach((pj, k) => { const ar = mine[k]; ar.at = pj; ar.path = []; GC.prov[pj].gar = []; for (const x of GC.armies) if (x.o === foe && x.at === pj) x.at = GC.nat[foe].cap; grCapture(pj); });
  g3SyncArmies(); g3PaintOverlay(); if (G3.tOv) G3.tOv.needsUpdate = true; guCentre(tk[0], 2.4); G3.camera.d = 520; guRedraw(); return { tk: tk.map(i => GCM.P[i].n), held: tk.map(i => GC.prov[i].ow) }; });
console.log('setup', JSON.stringify(info));
if (want('occupied')) { await page.evaluate(() => { const i = GCM.P.findIndex(p => p.land && GC.prov[p.i].ow); GV.sel = i; guRedraw(); try { guPanel(); } catch (e) {} }); await shot('occupied-land'); }
