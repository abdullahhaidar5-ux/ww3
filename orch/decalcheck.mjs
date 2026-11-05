// Decal audit: every national marking (roundel, fin flash, flag, hull number, slogan, stencil...) on every unit type, for
// several nations, must lie ON the model's surface, never hang off an edge, and never be oversized.
//   node orch/decalcheck.mjs [--facs IR,US,...|all] [--kinds tank,jet,...] [--verbose]
// For each unit type x nation it builds the unit (so the game itself makes the markings), then for every recorded decal
// (src/11-models.js kitDec, userData.aud) re-ray-probes the model: 4 corners + 4 edge middles + centre must hit the surface
// directly under the decal (miss = overhang; surface far below = floating; far above = buried); the decal may cover at most
// its allowed share (<= 80%) of the local flat panel; and it must respect its semantic cap (roundel <= 1/3 chord, hull
// numerals <= 40% of hull-side height, flags <= 15% of length...) and never exceed the model's own size.
// Prints DECALCHECK PASS/FAIL (exit 1 on fail). Visuals only; touches nothing in the game.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ALL = 'US,TR,IL,EU,UA,RU,IR,SA,AE,PK,IN,CN,KP,KR,EG,CU,RS,DW';
const FACS = (argS('facs', 'IR,US,RU,KP,DW,CN,TR,IL') === 'all' ? ALL : argS('facs', 'IR,US,RU,KP,DW,CN,TR,IL')).split(',');
const KINDS = argS('kinds', 'tank,arty,aa,jeep,raidlead,heli,airlift,jet,drone,boat,ship,lander,sub').split(',');
const VERBOSE = process.argv.includes('--verbose');
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const page0 = fs.readFileSync(path.join(ROOT, 'index.html'));
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
await acquireBrowserLock('decalcheck');
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const t0 = Date.now(); let code = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } }); await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
  const errs = [];
  page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { const t = m.text(); if (m.type() === 'warning' && /^(kit|factionKit|drone kit|radar)/.test(t)) errs.push(t.slice(0, 200)); });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
  await page.evaluate(() => { window.__stopLoop = true; });
  await page.evaluate(async () => {
    if (G) G.over = true;
    Object.assign(setup, { map: 'fulda', n: 1, p: 'US', a: 'RU', others: [], tm: [], slot: -1, seed: 4242 });
    startSingle(); const w0 = performance.now();
    while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    G.paused = true;
  });
  console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] battle loaded; building ${KINDS.length} unit types x ${FACS.length} nations`);
  const built = await page.evaluate(async ([facs, kinds]) => {
    window.__kg = []; window.__kd = 0; { const od = kitDec, op = kitPanel; kitDec = function (...a) { const t = performance.now(); try { return od.apply(this, a); } finally { window.__kd += performance.now() - t; (window.__kc = window.__kc || []).push([a[0] + a[1] + ' ' + (a[10] && a[10].tag || a[8]), Math.round(performance.now() - t)]); } }; }
     { const og = kitGeo; kitGeo = function (...a) { const t = performance.now(), r = og.apply(this, a); window.__kg.push([a[1].m + '/' + a[2] + '/' + a[3], Math.round(performance.now() - t)]); return r; }; }
    const out = { n: 0, skipped: [], ms: 0 }, T = G.teams[0], f0 = T.fac, F0 = T.F, t0 = performance.now();
    for (const fac of facs) for (const kd of kinds) {
      try { T.fac = fac; T.F = FACTIONS[fac]; const [bx, by] = BASES[0]; const u = addUnit(0, kd, bx + 200, by + 100); u.ox = u.x; u.oy = u.y; if (u.vs) u.vs[0] = true;
        const t1 = performance.now(); renderFrame(1 / 60); (out.t = out.t || []).push([fac + '/' + kd, Math.round(performance.now() - t1)]); out.n++; G.ents = G.ents.filter(e => e !== u); }
      catch (e) { out.skipped.push(fac + '/' + kd + ': ' + e.message); } }
    T.fac = f0; T.F = F0; out.ms = performance.now() - t0; out.kg = window.__kg; out.kd = Math.round(window.__kd); out.kc = window.__kc; return out; }, [FACS, KINDS]);
  console.log(`built ${built.n} units in ${(built.ms / 1000).toFixed(1)}s` + (built.skipped.length ? `, skipped: ${built.skipped.join('; ')}` : ''));
  console.log('kitDec total ms ' + built.kd + '; kit build ms (kitGeo, per model/nation; total ' + built.kg.reduce((a, b) => a + b[1], 0) + ' for ' + built.kg.length + ' kits): ' + built.kg.sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x.join(' ')).join(', '));
  if (VERBOSE) console.log('slowest kitDec calls: ' + built.kc.sort((a, b) => b[1] - a[1]).slice(0, 14).map(x => x.join(' ')).join(', '));
  if (VERBOSE) console.log('slowest builds (ms): ' + built.t.sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x.join(' ')).join(', '));
  const res = await page.evaluate((verbose) => {
    const geos = []; for (const k in KIT.geo) { const g = KIT.geo[k]; if (g && g.userData && g.userData.aud) geos.push([k, g]); }
    for (const k in DECAL.sets) if (k.startsWith('kit:drone|')) { const g = DECAL.sets[k].geo; if (g && g.userData && g.userData.aud) geos.push([k.slice(4), g]); }
    const V = (a, b) => new THREE.Vector3(...a).sub(new THREE.Vector3(...b)), fails = [], stats = { geos: geos.length, decals: 0, byTag: {}, empty: [] };
    for (const [key, g] of geos) { const P = g.userData.P, aud = g.userData.aud; if (!P) { fails.push(key + ': geometry without probe'); continue; }
      if (!aud.length) stats.empty.push(key);
      for (const r of aud) { stats.decals++; const tag = r.tag || r.kind; stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        const id = `${key} [${tag}${r.cell ? ' ' + r.cell : ''}] ${r.w.toFixed(2)}x${r.h.toFixed(2)}`, L = P.L, why = [];
        if (!(r.w > 0 && r.h > 0) || !isFinite(r.w + r.h)) { fails.push(id + ': bad size'); continue; }
        if (Math.max(r.w, r.h) > L * 0.5) why.push(`bigger than half the model length (${L.toFixed(1)})`);
        if (r.w > L + 1e-6 || r.h > Math.max(P.H, P.W) + 1e-6) why.push('bigger than the model itself');
        if (r.kind === 'free') { if (r.w > L * 0.15 + 1e-6) why.push(`flag wider than 15% of length (${(r.w / L * 100).toFixed(0)}%)`); }
        else {
          if (r.maxw && r.w > r.maxw + 1e-3) why.push(`width ${r.w.toFixed(2)} over its cap ${r.maxw.toFixed(2)}`);
          if (r.maxh && r.h > r.maxh + 1e-3) why.push(`height ${r.h.toFixed(2)} over its cap ${r.maxh.toFixed(2)}`);
          const n = new THREE.Vector3(...r.n).normalize(), rt = new THREE.Vector3(...r.up).cross(n).normalize(), up = n.clone().cross(rt), c = new THREE.Vector3(...r.c), size = Math.max(r.w, r.h);
          if (n.dot(r.face === 'side' ? new THREE.Vector3(0, 0, r.sg) : new THREE.Vector3(0, r.face === 'top' ? 1 : -1, 0)) < 0.7) why.push('not facing outward');
          const m = size * 0.35 + 0.25, bad = [];
          const pts = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0], [0, 0]];
          const hits = pts.map(([i, j]) => { const q = c.clone().addScaledVector(rt, i * r.w / 2).addScaledVector(up, j * r.h / 2), org = q.clone().addScaledVector(n, m), t = kitHitTris(P, org, n.clone().negate(), m + size * 0.5 + 0.5); return t === null ? null : t - m; });
          hits.forEach((gap, i) => { if (gap === null) bad.push(`corner${i} MISS (overhang)`); else if (gap < -(0.02 * size + 0.02)) bad.push(`pt${i} buried ${(-gap).toFixed(2)}`); else if (gap > 0.08 * size + 0.15) bad.push(`pt${i} floats ${gap.toFixed(2)}`); });
          if (bad.length) { why.push(bad.slice(0, 3).join(', ')); if (verbose) why.push('DBG ' + JSON.stringify({ c: r.c, n: r.n, w: r.w, h: r.h, a0: r.a0, b0: r.b0, face: r.face, sg: r.sg, gaps: hits.map(g => g === null ? null : +g.toFixed(2)), L: P.L, bb: [P.bb.min.toArray(), P.bb.max.toArray()].map(a => a.map(v => +v.toFixed(1))) })); }
          const pan = kitPanel(P, r.face, r.sg, r.a0, r.b0, r.cap || size * 1.3);
          if (!pan) why.push('no surface at the decal centre'); else {
            if (r.w > (r.fa || .8) * pan.pa + 1e-3) why.push(`width ${r.w.toFixed(2)} > ${Math.round((r.fa || .8) * 100)}% of its ${pan.pa.toFixed(2)} panel`);
            if (r.h > (r.fb || .8) * pan.pb + 1e-3) why.push(`height ${r.h.toFixed(2)} > ${Math.round((r.fb || .8) * 100)}% of its ${pan.pb.toFixed(2)} panel`);
            if (Math.max(r.fa || .8, r.fb || .8) > 0.8 + 1e-6) why.push('allowed panel share above 80%'); } }
        if (why.length) fails.push(id + ': ' + why.join('; '));
        else if (verbose) console.log('ok ' + id); } }
    return { fails, stats }; }, VERBOSE);
  const st = res.stats;
  console.log(`audited ${st.decals} decals on ${st.geos} model/nation kits: ` + Object.entries(st.byTag).map(([k, v]) => k + ' ' + v).join(', '));
  if (st.empty.length && VERBOSE) console.log('kits with no decals: ' + st.empty.join(', '));
  if (errs.length) { console.log(errs.slice(0, 8).join('\n')); }
  if (st.decals < 20) { console.log('FAIL: suspiciously few decals (' + st.decals + ') - the audit found nothing to check'); code = 1; }
  for (const f of res.fails.slice(0, 60)) console.log('FAIL ' + f);
  if (res.fails.length > 60) console.log(`... and ${res.fails.length - 60} more`);
  if (res.fails.length) code = 1;
  console.log(code ? `DECALCHECK FAIL (${res.fails.length} bad decals)` : `DECALCHECK PASS (${st.decals} decals, ${FACS.length} nations, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  await ctx.close();
} catch (e) { console.error(e); code = 1; console.log('DECALCHECK FAIL (harness error)'); }
await browser.close(); server.close(); process.exit(code);
