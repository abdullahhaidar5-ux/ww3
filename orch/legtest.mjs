// A5b named battles (laneA): node orch/legtest.mjs
// the province is captured. Screenshots: orch/shots/grand1/.   node orch/grandtest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'laneA');
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

const page = await ctx.newPage();
page.on('pageerror', e => console.log('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof glBattle === 'function', null, { timeout: 60000 });
  const r = await ev(() => { grNew({ me: 'US', seed: 4242, len: 'std' }); const out = {};
    const land = GCM.P.filter(p => p.land && !p.cap).slice(5, 9).map(p => p.i);
    const mk = (id, o, at, n) => { const a = { id, o, at, path: [], pg: 0, u: Array.from({ length: n }, () => ['tank', 100, 0, 100]) }; GC.armies.push(a); return a; };
    const big = (pi, att, def) => { const a = mk(88001 + pi, att, pi, 40), d = mk(88501 + pi, def, pi, 40); return { p: pi, an: att, dn: def, att: [a.id], def: [d.id] }; };
    const m0 = gmod('nation', 'US', 'warSupport', 0), a0 = glMor('US');
    const b1 = big(land[0], 'US', 'RU'); out.v = [glSide(b1.att), glSide(b1.def)]; out.leg = !!glBattle(b1, 'att');
    out.ws = Math.round((gmod('nation', 'US', 'warSupport', 0) - m0) * 100); out.mor = glMor('US') - a0; out.loserWs = Math.round(gmod('nation', 'RU', 'warSupport', 0) * 100) - Math.round(gmod('nation', 'RU', 'warSupport', 0) * 100 - 2) > 0;
    out.again = !!glBattle(big(land[0], 'US', 'RU'), 'att');           // same province inside a year: no second legend
    const tiny = { p: land[1], an: 'US', dn: 'RU', att: [mk(88100, 'US', land[1], 1).id], def: [mk(88101, 'RU', land[1], 1).id] }; out.tiny = !!glBattle(tiny, 'att');
    const lop = { p: land[2], an: 'US', dn: 'RU', att: [mk(88200, 'US', land[2], 60).id], def: [mk(88201, 'RU', land[2], 2).id] }; out.lop = !!glBattle(lop, 'att');
    out.names = [...new Set(GC.leg.map(l => l.nm))].length; out.style = GC.leg[0].st;
    GC.turn += 13; gmodMonth(GC.turn); out.expired = glMor('US') === a0 && Math.abs(gmod('nation', 'US', 'warSupport', 0) - m0) < 1e-9;
    const s = JSON.stringify(GC); out.saved = JSON.parse(s).leg.length === GC.leg.length;
    return out; });
  console.log('leg', JSON.stringify(r));
  const fails = [];
  if (!r.leg) fails.push('no legend from a big battle ' + JSON.stringify(r.v)); if (r.ws !== 4) fails.push('winner war support ' + r.ws); if (r.mor !== 2) fails.push('army morale ' + r.mor);
  if (r.again) fails.push('second legend in same province'); if (r.tiny) fails.push('tiny skirmish became a legend'); if (r.lop) fails.push('massacre became a legend');
  if (!r.expired) fails.push('bonus did not expire'); if (!r.saved) fails.push('legends not in save');
  console.log(fails.length ? 'LEG FAIL ' + fails.join('; ') : 'LEG PASS'); globalThis.__bad = fails.length;
} catch (e) { console.log('LEG ERROR', e.message); globalThis.__bad = 1; }
await browser.close(); server.close(); process.exit(globalThis.__bad ? 1 : 0);
