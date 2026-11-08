// Mobilisation test (RG34); template from devtest: determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
// from the map holds EXACTLY the army's units (types and counts) and no production, survivors/losses flow back exactly,
// the province is captured. Screenshots: orch/shots/grand1/.   node orch/grandtest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'grand2');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MIN = Number(arg('minutes', 2)), ONLY = arg('only', '');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock();
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);

const fails = [];
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot3 = async (n) => { fs.mkdirSync(path.join(ROOT, 'orch', 'shots', 'grand3'), { recursive: true }); await page.waitForTimeout(400); await page.screenshot({ path: path.join(ROOT, 'orch', 'shots', 'grand3', n + '.png'), timeout: 120000 }).catch(e => console.log('  (screenshot skipped ' + n + ')')); };
const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(e => console.log('  (screenshot skipped ' + n + ')')); };
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gmbSet === 'function', null, { timeout: 60000 });
  const r = await ev(() => { grNew({ me: 'IR', seed: 777, len: 'std' }); const out = {}; const N = GC.nat.IR; N.pp = N.pp || { pol: 0, dip: 0, mil: 0 }; N.pp.mil = 200;
    const m0 = N.e.man, i0 = (GMOD_C.cache.clear(), gmod('nation', 'IR', 'income', 1));
    out.e1 = gmbSet('IR', 2); out.lv = N.mob; out.pts = N.pp.mil; out.fill = N.e.man > m0; out.inc = gmod('nation', 'IR', 'income', 1) < i0;
    out.lock = gmbSet('IR', 0) !== ''; const rel0 = {}; const near = Object.keys(GC.nat).filter(o => o !== 'IR' && !GC.nat[o].dead && gdNear('IR', o) && !grAllied('IR', o) && !grAtWar('IR', o));
    for (const o of near) rel0[o] = gdOp(o, 'IR');
    for (let i = 0; i < 4 && !GC.over; i++) grEndTurn(true);
    out.near = near.length; out.cooled = near.some(o => gdOp(o, 'IR') < rel0[o]); out.ai = Object.keys(GC.nat).filter(o => o !== 'IR').some(o => GC.nat[o].mob > 0); if (!out.ai) fails.push('mob AI');
    out.e0 = gmbSet('IR', 0); out.lv0 = N.mob;
    npOpen('IR', 'mob'); out.tab = !!document.getElementById('npWin') && /mobilisation/i.test(document.getElementById('npWin').textContent); return out; });
  console.log('mob', JSON.stringify(r));
  if (r.e1 || r.lv !== 2 || r.pts !== 140 || !r.fill || !r.inc) fails.push('mob order/effects'); if (!r.lock) fails.push('mob lock');
  if (r.near && !r.cooled) fails.push('mob neighbours'); if (r.e0 || r.lv0 !== 0) fails.push('mob stand down'); if (!r.tab) fails.push('mob tab');
  console.log(fails.length ? 'MOB FAIL ' + fails.join('; ') + errs.join('|') : 'MOB PASS');
} catch (e) { console.log('MOB ERROR', e.message); }
await browser.close(); server.close(); process.exit(0);
