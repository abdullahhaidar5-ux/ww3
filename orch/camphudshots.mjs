// Proof pictures for the campaign top bar + Nation window (helper camphud). node orch/camphudshots.mjs before|after [sizes]
// Writes small JPEGs into orch/concepts/camphud/. View only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'concepts', 'camphud');
const TAG = process.argv[2] || 'after';
const SIZES = (process.argv[3] || '1280x720,1600x900,1920x1080').split(',').map(s => s.split('x').map(Number));
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock();
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: SIZES[0][0], height: SIZES[0][1] } }); await guardContext(ctx);
const page = await ctx.newPage();
page.on('pageerror', e => console.log('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot = async (n, clip) => { await page.waitForTimeout(500); const f = path.join(OUT, TAG + '-' + n + '.jpg'); await page.screenshot({ path: f, type: 'jpeg', quality: 62, timeout: 180000, ...(clip ? { clip } : {}) }).catch(e => console.log('  (screenshot skipped ' + n + ')')); try { console.log(n, Math.round(fs.statSync(f).size / 1024) + ' KB'); } catch {} };
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await ev(() => { grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); grandOpen(); guFit(GR_REGIONS[4][1]); guRedraw(); });
  await page.waitForTimeout(1500); await ev(() => { const b = document.getElementById('gCoachOk'); if (b) b.click(); });
  await ev(() => { const a = GC.armies.find(x => x.o === GC.me && !x.fl); if (a) { GV.selA = a.id; GV.sel = a.at; guSide(); guRedraw(); if (typeof gmPaint === 'function') gmPaint(); } });
  await page.waitForTimeout(8000);
  for (const [w, h] of SIZES) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(2500); await shot('map-' + w); await shot('bar-' + w, { x: 0, y: 0, width: w, height: 150 }); }
  if (TAG !== 'before') {
    await page.setViewportSize({ width: 1600, height: 900 }); await page.waitForTimeout(1500);
    await ev(() => { const b = document.getElementById('gGoBtn'); if (b) b.click(); }); await shot('goto-open'); await ev(() => { const b = document.getElementById('gGoBtn'); if (b) b.click(); });
    await ev(() => { const b = document.getElementById('gMenuBtn'); if (b) b.click(); }); await shot('menu-open', { x: 800, y: 0, width: 800, height: 300 }); await ev(() => { const b = document.getElementById('gMenuBtn'); if (b) b.click(); });
    for (const g of await ev(() => NP_GROUPS.map(g => g.id))) { await ev(g => { npOpen(GC.me); npGroup(g); }, g); await shot('nation-' + g); }
    await ev(() => npClose());
    /* play months on until more than five things need the player, then open "+N more" */
    const n = await ev(() => { let i = 0; while (alItems(GC.me).length <= AL.max && i++ < 14 && !GC.over) grEndTurn(true); const m = document.getElementById('gModal'); if (m) m.remove(); grandMapRefresh(); return alItems(GC.me).length; }); console.log('alerts after playing on:', n);
    await page.waitForTimeout(3000); await ev(() => { const b = document.getElementById('gAlMore'); if (b) b.click(); }); await shot('alerts-more', { x: 0, y: 0, width: 1600, height: 420 }); await shot('map-later-1600');
  } else { await page.setViewportSize({ width: 1600, height: 900 }); await ev(() => npOpen(GC.me)); await shot('nation'); }
} finally { await browser.close(); server.close(); }
process.exit(0);
