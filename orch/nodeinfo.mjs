// Unit-cap probe (measurement only): does 500 units per player stay smooth?  Modelled on orch/smooth.mjs (same headless setup,
// CPU-side frame time with draw commands swallowed, see orch/SMOOTH.md).  One scenario per run:
//   node orch/capprobe.mjs --players 2 --per 300 --fill pop|units [--frames 150] [--out file.json]
// players = total teams (2 = 1v1, 8 = free-for-all). per = target per team. fill=pop: spawn mixed units until each team's
// population (the cap counts infantry 1, light vehicle 2, tank/arty/aircraft 3) reaches `per`; fill=units: until `per` bodies.
// Reports frame ms, sim step ms, draw calls, triangles, checkpoint size + save/load time, and a CPU profile (top self-time functions).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  // ~1 game minute of normal play (bases, AI), then the armies are added and thrown into one or two big fights
  await page.evaluate(() => { for (let i = 0; i < 3600 && !G.over; i++) simUpdate(1 / 60); });
  const sp = await page.evaluate(([per, fill]) => {
    const seq = ['inf', 'inf', 'inf', 'at', 'tank', 'inf', 'aa', 'inf', 'arty', 'inf', 'heli', 'inf', 'tank', 'inf', 'at', 'jet'], cx = MAPW / 2, cy = MAPH / 2; const out = [];
    for (const T of G.teams) { if (T.dead || T.reb) continue; const side = T.id % 2 ? 1 : -1, lane = (Math.floor(T.id / 2) - (G.teams.length / 4 - .5)) * 90;
      let i = 0, guard = 0; const have = () => fill === 'pop' ? popUsed(T.id, 1) : G.ents.filter(e => !e.isB && !e.dead && e.team === T.id).length;
      while (have() < per && guard++ < per * 3) { const k = seq[i % seq.length];
        const p = nearestPassXY('ground', cx + side * (220 + (i % 16) * 20), cy + lane + Math.floor(i / 16) * 18 - 60) || [cx, cy];
        try { const u = addUnit(T.id, k, p[0], p[1]); if (u) setMove(u, cx - side * 500, cy + lane, 'amove'); } catch (e) {} i++; }
    }
    for (let i = 0; i < 1200; i++) simUpdate(1 / 60);   // ~20 s of fighting before measuring
    const C = 240, cnt = new Map(); let best = null, bn = 0;
    for (const e of G.ents) if (!e.isB && !e.dead) { const k = Math.floor(e.x / C) + ',' + Math.floor(e.y / C); const n = (cnt.get(k) || 0) + 1; cnt.set(k, n); if (n > bn) { bn = n; best = k; } }
    if (best) { const [a, b] = best.split(',').map(Number); centerOn((a + .5) * C, (b + .5) * C, true); } else centerOn(cx, cy, true);
    window.vis = () => true; try { FOGM.visible = false; } catch (e) {}
    const uf = window.updateFog; window.updateFog = function () { uf.apply(this, arguments); try { FOGM.visible = false; } catch (e) {} };
    const per_team = G.teams.filter(T => !T.dead).map(T => ({ id: T.id, units: G.ents.filter(e => !e.isB && !e.dead && e.team === T.id).length, pop: popUsed(T.id, 1) }));
    return { per_team, units: G.ents.filter(e => !e.isB && !e.dead).length, bodies: bn, min: +(G.t / 3600).toFixed(1) }; }, [PER, FILL]);
  LOG('army in place ' + JSON.stringify(sp));
  await page.evaluate(() => { const gl = R3.getContext(); R3.info.autoReset = false;
    for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) if (gl[fn]) gl[fn] = function () {};
    window.__L = { sim: [], all: [], cl: [], tl: [] };
    window.__frame = (rec) => { const L = window.__L, t0 = performance.now(); for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1 / 60); G.alpha = 1; const t1 = performance.now();
      R3.info.reset(); renderFrame(1 / 60); const t3 = performance.now();
      if (rec) { L.sim.push(t1 - t0); L.all.push(t3 - t0); L.cl.push(R3.info.render.calls); L.tl.push(R3.info.render.triangles); } return 0; }; });
  for (let i = 0; i < 15; i++) await page.evaluate(() => window.__frame(false));

  const info = await page.evaluate(() => { const ud = {}; let total = 0; SCN.traverse(() => total++); let units = 0, figs = 0, rig = 0, vis = 0, kinds = {}, bld = 0, solbN = 0;
    for (const e of G.ents) { if (e.dead) continue; const o = OBJ.get(e.id); if (!o) continue; let n = 0; o.traverse(() => n++); if (e.isB) { bld += n; continue; } units += n; const k = kinds[e.kind] || (kinds[e.kind] = { c: 0, n: 0, vis: 0 }); k.c++; k.n += n; if (o.visible) k.vis++; if (o.visible) vis++;
      const P = o.userData.parts; if (P && P.body) for (const m of P.body.children) { figs++; if (m.userData.rgA) rig++; } }
    let sc = {}; for (const c of SCN.children) { let n = 0; c.traverse(() => n++); const k = c.type + ':' + (c.name || ''); sc[k] = (sc[k] || 0) + n; }
    const top = Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const vm = (o) => { let n = 0; o.traverseVisible(q => { if (q.isMesh && !q.isInstancedMesh) n++; else if (q.isInstancedMesh) n++; }); return n; };
    const mc = { bld: 0, bldN: 0 }; const mk = {}; for (const e of G.ents) { if (e.dead) continue; const o = OBJ.get(e.id); if (!o || !o.visible) continue; const n = vm(o); if (e.isB) { mc.bld += n; mc.bldN++; } else { const k = mk[e.kind] || (mk[e.kind] = [0, 0]); k[0]++; k[1] += n; } }
    let other = 0; for (const c of SCN.children) { if (c.userData && c.userData.tm !== undefined) continue; other += vm(c); }
    const calls = R3.info.render.calls;
    return { meshes: mc, mk, other, calls, total, units, bld, figs, rig, vis, kinds, top }; });
  console.log('NODEINFO', JSON.stringify(info));
  console.log('errs', errs.slice(0, 3));
} finally { await browser.close(); server.close(); }
process.exit(0);
