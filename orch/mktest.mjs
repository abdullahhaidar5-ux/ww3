// World-market test (B5b s3): prices move within 60..180, metals->upkeep, grain->unrest, subsidy cancels it, tab renders.  node orch/mktest.mjs
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
  await page.waitForFunction(() => typeof grNew === 'function' && typeof mkMonth === 'function', null, { timeout: 60000 });
  const r = await ev(() => { grNew({ me: 'IR', seed: 777, len: 'std' }); const N = GC.nat.IR; N.cash = 5000; mkMonth(); const out = {}; out.p0 = JSON.stringify(GC.mk.p);
    for (let i = 0; i < 14 && !GC.over; i++) grEndTurn(true); out.p1 = JSON.stringify(GC.mk.p); out.moved = ['grain', 'metals', 'wares'].some(k => Math.abs(GC.mk.p[k] - 100) > 0.5);
    out.bounds = ['grain', 'metals', 'wares'].every(k => GC.mk.p[k] >= 60 && GC.mk.p[k] <= 180);
    GC.mk.p.metals = 150; mkSync('IR'); out.upk = gmod('nation', 'IR', 'upkeep', 1) > 1.03;
    GC.mk.p.grain = 170; const di = Object.keys(GC.nat).find(c => !GC.nat[c].dead && mkGrainDef(c) > .25); if (di) { mkSync(di); out.un = gmod('nation', di, 'unrest', 0) >= 2; out.sub = mkSubsidy(di); mkSync(di); out.un2 = gmod('nation', di, 'unrest', 0) < 2; } out.di = di || '';
    npOpen('IR', 'mkt'); out.tab = !!document.getElementById('npWin') && /World market/.test(document.getElementById('npWin').textContent); out.js = JSON.stringify(GC.mk).length < 5000; return out; });
  console.log('mk', JSON.stringify(r));
  if (!r.moved || !r.bounds) fails.push('prices move/bounds'); if (!r.upk) fails.push('metals->upkeep'); if (r.di && (!r.un || r.sub || !r.un2)) fails.push('grain unrest/subsidy'); if (!r.tab) fails.push('mkt tab'); if (!r.js) fails.push('state size');
  console.log(fails.length ? 'MK FAIL ' + fails.join('; ') + errs.join('|') : 'MK PASS');
} catch (e) { console.log('MK ERROR', e.message); }
await browser.close(); server.close(); process.exit(0);
