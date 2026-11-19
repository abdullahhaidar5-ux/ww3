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
  const res = await page.evaluate(() => { const cnt = o => { let n = 0, v = 0; o.traverse(q => { if (q.isMesh) { n++; v += q.geometry.attributes.position.count; } }); return [n, v]; };
    const by = {}; const sm = window.staticMerge;
    for (const e of G.ents) { if (!e.isB || e.dead) continue; const k = e.kind + '|' + G.teams[e.team].fac; if (by[k]) continue;
      window.staticMerge = () => 0; const o0 = makeObj(e); window.staticMerge = sm; const o1 = makeObj(e); by[k] = { before: cnt(o0), after: cnt(o1), parts: Object.keys(o1.userData.parts).join(',') }; }
    const e0 = G.ents.find(e => e.isB && e.kind === 'hq'); const o = makeObj(e0); const why = {}; const mu = {}; o.traverse(q => { if (!q.isMesh) return; const m = q.material, g = q.geometry; let r = 'ok'; if (Array.isArray(m)) r = 'arr'; else if (m.transparent) r = 'transp'; else if (g.attributes.tangent) r = 'tan'; else if (g.groups && g.groups.length > 1) r = 'groups'; else if (q.renderOrder) r = 'ro'; else if (q.layers.mask !== 1) r = 'layer'; else if (q.userData.base) r = 'base'; else if (q.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) r = 'obr'; else if (q.isSkinnedMesh) r = 'skin'; else if (g.morphAttributes && Object.keys(g.morphAttributes).length) r = 'morph'; why[r] = (why[r] || 0) + 1; if (!Array.isArray(m)) mu[m.uuid] = (mu[m.uuid] || 0) + 1; });
    window.staticMerge = () => 0; const o2 = makeObj(e0); window.staticMerge = sm; delete o2.userData.smerged; const made = sm(o2, Object.values(o2.userData.parts)); const vis = []; o2.traverse(q => { if (q.isMesh) { let bl = ''; for (let p = q; p && p !== o2; p = p.parent) { if (!p.visible) bl += 'inv:' + p.type; } vis.push(bl); } });
    const vv = []; o2.traverse(q => { if (q.isMesh && q.visible) { const m = q.material; vv.push([m.uuid.slice(0, 5), m.transparent ? 'T' : 'O', q.castShadow ? 'S' : '-', q.geometry.attributes.position.count, (m.map ? 'map' : '') + (m.vertexColors ? 'vc' : ''), q.name.slice(0, 14)].join(':')); } });
    by.WHY3 = { before: [vv.length, 0], after: [0, 0], parts: vv.join(' ') };
    by.WHY2 = { before: [made, 0], after: [0, 0], parts: 'made=' + made + ' blocked=' + vis.filter(x => x).length + ' ' + [...new Set(vis)].join('/') };
    by.WHY = { before: [0, 0], after: [0, 0], parts: JSON.stringify(why) + ' mats=' + Object.keys(mu).length + ' smerged=' + o.userData.smerged + ' ' + typeof staticMerge };
    return by; });
  for (const k in res) console.log(k, 'meshes', res[k].before[0], '->', res[k].after[0], 'verts', res[k].before[1], '->', res[k].after[1], res[k].parts);
  fs.writeFileSync('/tmp/bld.json', JSON.stringify(res, null, 1));
} finally { await browser.close(); server.close(); }
process.exit(0);
