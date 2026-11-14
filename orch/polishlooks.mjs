// polishlooks: close-up shots of every Battle building and the main units of IR, RS, DW, RV, US, IL, RU, CN.
// node orch/polishlooks.mjs --tag before|after [--facs IR,RS] [--what units|blds|both] [--kinds tank,hq]
// Writes orch/shots/polishlooks/<tag>/<what>-<fac>-<kind>.jpg plus contact sheets orch/shots/polishlooks-<tag>-<fac>-<what>.jpg
// (montage). Based on orch/factionshots.mjs (same server/browser/camera code).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = argS('tag', 'after');
const HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.join(ROOT, 'orch', 'shots', 'polishlooks', TAG);
const WHAT = argS('what', 'both');
const FACS = argS('facs', 'IR,RS,DW,RV,US,IL,RU,CN').split(',');
const UNITS = argS('units', 'inf,at,tank,arty,aa,heli,harv,dozer').split(',');
const BFACS = argS('bfacs', 'IR,RS,RV,US,RU').split(',');
const BLDS = argS('blds', 'hq,barracks,factory,airfield,depot,turret,sam,tunnel,econ,uplink,radio,fort').split(',');
const SEED = 4242;

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
const page0 = fs.readFileSync(HTML);
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
await acquireBrowserLock('polishlooks');
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } }); await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/net::|Failed to load|AudioContext|autoplay|speech|WebSocket|peer/i.test(t)) errs.push(t.slice(0, 300)); });
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
await page.evaluate(() => { window.__stopLoop = true; try { initAudio(); AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {} });

async function battle(fac) {
  const other = fac === 'US' ? 'RU' : 'US';
  await page.evaluate(async ([p, a, seed]) => {
    if (G) G.over = true;
    Object.assign(setup, { map: 'fulda', mode: 'battle', n: 1, p, a, others: [], tm: [], slot: -1, seed });
    startSingle(); const w0 = performance.now();
    while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    G.paused = true; for (let i = 0; i < 30; i++) simUpdate(1 / 60);
    for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1;
    try { const W = (typeof WEATHER !== 'undefined') ? WEATHER : null; if (W) W.k = 'clear'; } catch (e) {}
    G.tod = 0.45;
  }, [fac, other, SEED]);
}
async function frames(n) { await page.evaluate(n => { const gl = R3.getContext(), px = new Uint8Array(4); for (let i = 0; i < n; i++) { renderFrame(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } }, n); }
const shots = {};
async function snap(name, grp) { await page.evaluate(() => { if (!document.getElementById('__plk')) { const st = document.createElement('style'); st.id = '__plk'; st.textContent = '*{visibility:hidden!important} canvas.__plk3{visibility:visible!important}'; document.head.appendChild(st); } R3.domElement.classList.add('__plk3'); }); const f = path.join(OUT, name + '.jpg'); await page.screenshot({ path: f, type: 'jpeg', quality: 82, timeout: 300000 }); (shots[grp] = shots[grp] || []).push(f); console.log(`[${secs()}] ${TAG}/${name}.jpg`); }

async function place(fac, kd, isB) {
  return page.evaluate(([kd, isB]) => {
    G.paused = true; G.ents = G.ents.filter(e => false); G.bdirty = true;
    const [bx, by] = BASES[0]; const x = Math.max(700, Math.min(MAPW - 700, bx + 320)), y = Math.max(700, Math.min(MAPH - 700, by + 120));
    let u; try { u = isB ? addBld(0, kd, x, y, true) : addUnit(0, kd, x, y); } catch (e) { return 'ERR ' + e.message; }
    if (!u) return 'none'; u.ox = u.x; u.oy = u.y; if (u.vs) u.vs[0] = true; u.ang = u.va = -Math.PI * .8;
    window.__u = u; const d = isB ? Math.max(150, (u.size || 60) * 3.0) : ({ heli: 90, harv: 80, dozer: 80, tank: 80, arty: 85 }[kd] || 62);
    cam.tilt = -.45; cam.dist = cam.td = d; cam.x = cam.tx = u.x; cam.y = cam.ty = u.y; cam._xl = cam.x; cam._yl = cam.y; cam._dl = d; return 'ok';
  }, [kd, isB]);
}
async function aim() {
  await page.evaluate(() => { const o = OBJ.get(window.__u.id); if (!o) return; const h = o.position.y, ux = o.position.x, uz = o.position.z;
    const base = cam.dist;
    const pf = d => { const kz = Math.max(0, Math.min(1, (d - 230) / 370)); return Math.max(.22, Math.min(1.42, Math.max(.34 + kz * .44, Math.asin(Math.min(1, 112 / d))) + (cam.tilt || 0))); };
    let d = base; for (let i = 0; i < 8; i++) { const p = pf(d); d = Math.max(0, h) / Math.sin(p) + base; } const p = pf(d);
    cam.dist = cam.td = d; cam.x = cam.tx = ux; cam.y = cam.ty = uz - Math.max(0, h) / Math.tan(p); cam._xl = cam.x; cam._yl = cam.y; cam._dl = d; });
}
try {
  for (const fac of FACS) {
    await battle(fac);
    if (WHAT !== 'blds') for (const kd of UNITS) {
      const r = await place(fac, kd, false); if (r !== 'ok') { console.log(fac, kd, r); continue; }
      await frames(2); if (kd === 'heli') await aim(); await frames(2); await snap(`u-${fac}-${kd}`, `${fac}-units`);
    }
    if (WHAT !== 'units' && BFACS.includes(fac)) for (const kd of BLDS) {
      const r = await place(fac, kd, true); if (r !== 'ok') { console.log(fac, kd, r); continue; }
      await frames(4);
      if (process.env.PROBE) console.log(kd, await page.evaluate(() => { const o = OBJ.get(window.__u.id), out = []; const b = new THREE.Box3(); o.updateMatrixWorld(true);
        o.traverse(c => { if (c.isMesh) { b.setFromObject(c); const s = b.getSize(new THREE.Vector3()); if (s.x > 6 || s.z > 6) out.push((c.name || c.parent.name || '?') + ':' + [s.x, s.y, s.z].map(v => v.toFixed(1)).join('x') + '@' + [b.min.x - o.position.x, b.min.z - o.position.z].map(v => v.toFixed(0)).join(',')); } }); return out.join(' | '); }));
      await snap(`b-${fac}-${kd}`, `${fac}-blds`);
    }
  }
} catch (e) { console.error(e); process.exitCode = 1; }
for (const [g, fs_] of Object.entries(shots)) {
  const out = path.join(ROOT, 'orch', 'shots', `polishlooks-${TAG}-${g}.jpg`);
  try { execFileSync('montage', [...fs_.flatMap(f => ['-label', path.basename(f, '.jpg'), f]), '-tile', '3x', '-geometry', '480x320+2+2', '-pointsize', '14', '-quality', '78', out]); console.log('sheet', path.relative(ROOT, out)); } catch (e) { console.log('montage failed', e.message); }
}
if (errs.length) console.log(errs.slice(0, 15).join('\n'));
await browser.close(); server.close();
