// Unit-cap probe (measurement only): does 500 units per player stay smooth?  Modelled on orch/smooth.mjs (same headless setup,
// CPU-side frame time with draw commands swallowed, see orch/SMOOTH.md).  One scenario per run:
//   node orch/capprobe.mjs --players 2 --per 300 --fill pop|units [--frames 150] [--out file.json]
// players = total teams (2 = 1v1, 8 = free-for-all). per = target per team. fill=pop: spawn mixed units until each team's
// population (the cap counts infantry 1, light vehicle 2, tank/arty/aircraft 3) reaches `per`; fill=units: until `per` bodies.
// Reports frame ms, sim step ms, draw calls, triangles, checkpoint size + save/load time, and a CPU profile (top self-time functions).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = process.env.PROBE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argN = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PLAYERS = argN('players', 2), PER = argN('per', 300), FILL = argS('fill', 'pop'), FRAMES = argN('frames', 150), OUTF = argS('out', path.join(ROOT, 'orch', 'out', 'capprobe.json')), MAP = argS('map', 'fulda');
fs.mkdirSync(path.dirname(OUTF), { recursive: true });
async function loadPlaywright() { try { return await import('playwright'); } catch {} const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} } throw new Error('playwright not found'); }
function findChromium() { const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {} return undefined; }
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const pct = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const r2 = x => Math.round(x * 100) / 100; const T0 = Date.now(); const LOG = m => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s] ${m}`);
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
let result;
try {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } }); await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith('data:') || r.request().url().startsWith('blob:') ? r.continue() : r.abort());
  page.on('console', m => { if (/staticMerge/.test(m.text())) console.log('PAGE', m.text().slice(0, 300)); }); const errs = []; page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200))); page.on('crash', () => errs.push('PAGE CRASHED'));
  await page.addInitScript(() => { let z = 12345; Math.random = () => { z = (z + 0x6D2B79F5) | 0; let t = Math.imul(z ^ (z >>> 15), 1 | z); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await page.addInitScript(() => { try { localStorage.setItem('ww3_tut', '1'); } catch (e) {} });
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  if (PER > 300) await page.evaluate(n => { window.popCap = () => (G && G.battle ? n : Infinity); }, PER);   // POP_CAP stays 300 on main; the 500 rows raise it in-page only
  const bench = await page.evaluate(() => { let best = 1e9; for (let k = 0; k < 5; k++) { const t = performance.now(); let a = 0; for (let i = 0; i < 6e6; i++) a += Math.sqrt(i) * 1.0001; best = Math.min(best, performance.now() - t); } return best; });
  const st = await page.evaluate(([n, seed, map]) => { setup.n = n - 1; setup.map = map; setup.seed = seed;
    const MR = Math.random; let z = seed * 2654435761 >>> 0; Math.random = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296);
    try { startSingle(); } finally { Math.random = MR; } if (G.teams[0] && !G.teams[0].ai) G.teams[0].ai = mkAI(1);
    return { teams: G.teams.length, battle: !!G.battle, cap: popCap(), map: G.mapKey || map }; }, [PLAYERS, 3, MAP]);
  LOG('started ' + JSON.stringify(st));
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 }); LOG('loaded');
  await page.evaluate(() => { window.__stopLoop = true; }); await page.waitForTimeout(300);

  await page.evaluate(() => { for (let i = 0; i < 3600 && !G.over; i++) simUpdate(1 / 60); });
  const res = await page.evaluate(() => { const by = {}; const sm = window.staticMerge;
    for (const kd of ['heli', 'airlift', 'jet', 'bomber']) for (const fi of [0, 1]) { let st = null; try { st = stats(G.teams[fi].fac, kd); } catch (e) {} if (!st) continue;
      for (const merged of [0, 1]) { window.staticMerge = merged ? sm : () => 0; let o = null; try { o = makeObj({ id: 900500 + fi, kind: kd, team: fi, isB: false, s: st, x: 100, y: 100, hp: 1, max: 1 }); } catch (e) { by[kd + fi + merged] = { before: [0, 0], after: [0, 0], parts: String(e) }; continue; } window.staticMerge = sm; if (!o) continue;
        const vv = []; o.traverse(q => { if (q.isMesh) { const m = q.material; vv.push([m.uuid.slice(0, 4), m.transparent ? 'T' : 'O', q.visible ? 'v' : 'h', q.castShadow ? 'S' : '-', q.geometry.attributes.position.count, (m.map ? 'map' : '') + (m.vertexColors ? 'vc' : ''), (q.name || '').slice(0, 10)].join(':')); } });
        by[kd + ' ' + G.teams[fi].fac + ' merged=' + merged] = { before: [vv.length, 0], after: [0, 0], parts: vv.join(' ') }; } }
    { const st = stats(G.teams[0].fac, 'airlift'); window.staticMerge = () => 0; const o = makeObj({ id: 900600, kind: 'airlift', team: 0, isB: false, s: st, x: 100, y: 100, hp: 1, max: 1 }); window.staticMerge = sm; const P = o.userData.parts; const bl = P.blades; let nm = 0; bl && bl.traverse(q => { if (q.isMesh) nm++; });
      by.DBG = { before: [0, 0], parts: 'dom=' + st.dom + ' parts=' + Object.keys(P) + ' bladesGroup=' + (bl && bl.isGroup) + ' meshes=' + nm + ' made=' + (bl && sm(bl, [])) + ' mixers=' + !!o.userData.mixers }; }
    return by; });
  for (const k in res) console.log(k, 'meshes', res[k].before[0], res[k].parts);
  fs.writeFileSync('/tmp/bld.json', JSON.stringify(res, null, 1));
} finally { await browser.close(); server.close(); }
process.exit(0);
