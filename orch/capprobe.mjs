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
  const cdp = await ctx.newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  for (let i = 0; i < FRAMES; i++) { await page.evaluate(() => window.__frame(true)); if (i % 25 === 24) LOG('frame ' + (i + 1)); }
  const prof = (await cdp.send('Profiler.stop')).profile;
  const res = await page.evaluate(() => ({ L: window.__L, units: G.ents.filter(e => !e.isB && !e.dead).length }));
  // sampled self time per function, grouped by name; sim vs render split by walking up to the frame's top-level call
  const byId = new Map(prof.nodes.map(n => [n.id, n])), self = new Map(); const dt = prof.timeDeltas; let tot = 0;
  prof.samples.forEach((id, i) => { const d = dt[i] || 0; tot += d; self.set(id, (self.get(id) || 0) + d); });
  const byFn = {}; for (const [id, t] of self) { const c = byId.get(id).callFrame; const k = (c.functionName || '(anon)') + ' ' + (c.url || '').split('/').pop() + ':' + c.lineNumber; byFn[k] = (byFn[k] || 0) + t; }
  const top = Object.entries(byFn).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, t]) => [k, r2(t / 1000 / FRAMES), r2(100 * t / tot)]);   // [fn, ms per frame, % of profile]
  // checkpoint (host-migration / save-game) cost
  const ck = await page.evaluate(() => { const o = {}; try { let t = performance.now(); const c = ckEncode(); o.encodeMs = performance.now() - t; t = performance.now(); const s = JSON.stringify(c); o.stringifyMs = performance.now() - t; o.bytes = s.length;
      t = performance.now(); const c2 = JSON.parse(s); o.parseMs = performance.now() - t; t = performance.now(); try { ckDecode(c2); o.decodeMs = performance.now() - t; } catch (e) { o.decodeErr = String(e).slice(0, 80); }
      t = performance.now(); try { ckRestore(JSON.parse(s)); o.restoreMs = performance.now() - t; } catch (e) { o.restoreErr = String(e).slice(0, 80); }
      try { const z = (typeof LZString !== 'undefined') ? 1 : 0; o.lz = z; } catch (e) {} } catch (e) { o.err = String(e).slice(0, 120); } return o; });
  const L = res.L, worst = L.all.slice().sort((a, b) => b - a), nW = Math.max(1, Math.floor(L.all.length * .01)), avgW = worst.slice(0, nW).reduce((a, b) => a + b, 0) / nW;
  result = { scenario: `${PLAYERS}p-${PER}-${FILL}`, players: PLAYERS, per: PER, fill: FILL, map: MAP, cap: st.cap, bench: r2(bench), census: sp, unitsAtEnd: res.units, frames: FRAMES,
    frameMed: r2(pct(L.all, .5)), frameP95: r2(pct(L.all, .95)), frameP99: r2(pct(L.all, .99)), worst1Fps: r2(1000 / avgW), longFrames: L.all.filter(x => x > 50).length,
    simMed: r2(pct(L.sim, .5)), simP95: r2(pct(L.sim, .95)), drawCalls: Math.round(pct(L.cl, .5)), kTris: Math.round(pct(L.tl, .5) / 1000),
    ckKB: ck.bytes ? Math.round(ck.bytes / 1024) : 0, ckEncodeMs: r2(ck.encodeMs || 0), ckStringifyMs: r2(ck.stringifyMs || 0), ckParseMs: r2(ck.parseMs || 0), ckDecodeMs: r2(ck.decodeMs || 0), ckRestoreMs: r2(ck.restoreMs || 0), ckErr: ck.err || ck.decodeErr || ck.restoreErr || '',
    profileTop: top, errs: errs.slice(0, 3) };
} finally { await browser.close(); server.close(); }
fs.writeFileSync(OUTF, JSON.stringify(result, null, 1)); console.log(JSON.stringify({ ...result, profileTop: undefined })); console.log('PROFILE TOP\n' + result.profileTop.slice(0, 15).map(x => x.join('  ')).join('\n'));
process.exit(0);
