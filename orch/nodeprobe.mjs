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
  const errs = []; page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200))); page.on('crash', () => errs.push('PAGE CRASHED'));
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

  await page.evaluate(() => { for (let i = 0; i < 300 && !G.over; i++) simUpdate(1 / 60); });
  const res = await page.evaluate(() => { const cx = MAPW / 2, cy = MAPH / 2, T = G.teams[0].id, o = {}; const ks = ['inf','at','tank','aa','arty','heli','jet'];
    for (const k of ks) { try { const u = (()=>{const p=nearestPassXY('ground', cx + (ks.indexOf(k)-4)*25, cy) || [cx, cy]; return addUnit(T, k, p[0], p[1]);})(); if (!u) { o[k] = 'noadd'; continue; } } catch (e) { o[k] = 'err ' + e; } }
    centerOn(cx, cy, true); window.vis = () => true; for (let i = 0; i < 3; i++) { for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1/60); renderFrame(1/60); }
    const rows = []; for (const e of G.ents) { if (e.isB || e.dead) continue; const ob = OBJ.get(e.id); if (!ob) continue; let n = 0, m = 0, sk = 0, auto = 0; ob.traverse(q => { n++; if (q.isMesh) m++; if (q.isSkinnedMesh) sk++; if (q.matrixAutoUpdate) auto++; }); rows.push([e.team, e.kind, n, m, sk, auto]); }
    const agg = {}; for (const r of rows) { const a = agg[r[1]] || (agg[r[1]] = { c: 0, n: 0, m: 0, sk: 0, auto: 0 }); a.c++; a.n += r[2]; a.m += r[3]; a.sk += r[4]; a.auto += r[5]; }
    let bn = 0, bm = 0, bc = 0; for (const e of G.ents) if (e.isB && !e.dead) { const ob = OBJ.get(e.id); if (!ob) continue; bc++; ob.traverse(q => { bn++; if (q.isMesh) bm++; }); }
    let sn = 0; SCN.traverse(() => sn++);
    return { agg, buildings: { c: bc, nodes: bn, meshes: bm }, sceneNodes: sn, o }; });
  console.log(JSON.stringify(res.agg.inf), JSON.stringify(res.sceneNodes));
  if (process.env.SHOT) { await page.evaluate(() => { const T = G.teams[0].id, cx = MAPW / 2, cy = MAPH / 2; for (let i = 0; i < 6; i++) { const p = nearestPassXY('ground', cx - 60 + i * 24, cy + 40) || [cx, cy]; try { addUnit(T, 'inf', p[0], p[1]); } catch (e) {} } window.vis = () => true; try { FOGM.visible = false; } catch (e) {} centerOn(cx, cy + 40, true); try { cam.dist = 160; cam.tdist = 160; } catch (e) {} for (let i = 0; i < 4; i++) renderFrame(1 / 60); });
    await page.waitForTimeout(500); await page.evaluate(() => { renderFrame(1 / 60); }); await page.screenshot({ path: process.env.SHOT }); }
  console.log(JSON.stringify(res.agg.tank));
  console.log('errs', errs.slice(0, 3));
} finally { await browser.close(); server.close(); }
process.exit(0);
