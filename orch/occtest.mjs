// A6 occupation reaction by style (laneA): node orch/occtest.mjs
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

const fails = [];
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const ev = (fn, arg) => page.evaluate(fn, arg);
// A6 occupation reaction by style: take 4 provinces per style off their owners (set owner = a far nation, o0 kept), run 18 months,
// check each style shows its effect, an army rolls cells up, and the cost to the occupier per style is within 2x of each other.
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof ocMonth === 'function', null, { timeout: 60000 });
  const r = await ev(() => { grNew({ me: 'US', seed: 4242, len: 'std' }); const P = GCM.P, out = { cost: {}, eff: {} };
    const pick = {}; for (const p of P) { if (!p.land) continue; const st = GC.prov[p.i]; if (!st.o0 || st.o0 === 'US' || p.cap) continue;
      const s = ocStyle(st.o0); pick[s] = pick[s] || []; if (pick[s].length < 6 && (s !== 'home' || 'mjs'.includes(p.t))) pick[s].push(p.i); }
    const runs = {}; for (const s of Object.keys(OCC_STY)) {
      let cost = 0, eff = 0;
      for (const pi of pick[s] || []) { const st = GC.prov[pi]; const save = JSON.stringify(st), cash = GC.nat.US.cash; st.o = 'US'; st.rc = 0; st.un = 30; st.tax = 1;
        if (st.gar.length < 6) for (let k = st.gar.length; k < 6; k++) st.gar.push(['inf', 100, 0, 100]);
        for (let m = 0; m < 12; m++) { GC.turn++; const g0 = st.gar.length, c0 = GC.nat.US.cash; ocMonth(); cost += (g0 - st.gar.length) * OCC_UNIT + (c0 - GC.nat.US.cash); if (st.gar.length < 6) st.gar.push(['inf', 100, 0, 100]); }
        eff += st.rc | 0; Object.assign(st, JSON.parse(save)); delete st.rc; if (!JSON.parse(save).rc) st.rc = 0; GC.nat.US.cash = cash; }
      out.cost[s] = Math.round(cost / Math.max(1, (pick[s] || []).length)); out.eff[s] = eff; out.n = Object.fromEntries(Object.entries(pick).map(([k, v]) => [k, v.length])); }
    // counter-play: an army sitting in a zealous province rolls the cells up
    const zp = (pick.zeal || [])[0]; if (zp !== undefined) { const st = GC.prov[zp]; st.o = 'US'; st.rc = 4; GC.armies.push({ id: 99999, o: 'US', at: zp, path: [], pg: 0, u: [['inf', 100, 0, 100]] }); ocMonth(); out.guard = st.rc; GC.armies.pop();
      GV.sel = zp; try { guSide(); } catch (e) {} out.panel = /Resistance cells/.test((document.getElementById('gSide') || document.body).textContent); }
    // determinism: the same seed gives the same occupation result
    const h = []; for (let k = 0; k < 2; k++) { grNew({ me: 'US', seed: 99, len: 'std' }); for (const pi of (pick.zeal || []).concat(pick.home || [])) GC.prov[pi].o = 'US'; for (let m = 0; m < 6; m++) ocMonth(); h.push(GCM.P.filter(p => p.land).map(p => (GC.prov[p.i].rc | 0) + ':' + GC.prov[p.i].gar.length).join(',')); }
    out.det = h[0] === h[1]; return out; });
  console.log('occ', JSON.stringify(r));
  const fails = []; const cs = Object.values(r.cost); const mn = Math.min(...cs), mx = Math.max(...cs);
  if (!(mn > 0 && mx / mn < 2)) fails.push('occ: unequal cost ' + JSON.stringify(r.cost));
  if (!(r.eff.zeal > 0 && r.eff.home > 0)) fails.push('occ: no cells/partisans');
  if (!(r.guard <= 3)) fails.push('occ: army does not roll cells up'); if (!r.panel) fails.push('occ: panel line missing');
  if (!r.det) fails.push('occ: not deterministic'); if (errs.length) fails.push(errs.join('|'));
  console.log(fails.length ? 'OCC FAIL ' + fails.join('; ') : 'OCC PASS'); globalThis.__bad = fails.length;
} catch (e) { console.log('OCC ERROR', e.message); globalThis.__bad = 1; }
await browser.close(); server.close(); process.exit(globalThis.__bad ? 1 : 0);
