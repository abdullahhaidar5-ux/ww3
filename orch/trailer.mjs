// Trailer capture: renders deterministic 1920x1080 / 30 fps frames of real in-game footage (no src changes).
//   node orch/trailer.mjs --list
//   node orch/trailer.mjs --scene horizon[,columns,...]   -> orch/shots/tr/<scene>/NNNNN.jpg (+ events.json)
// How: boots the game headless (software GL), starts a battle, runs the real sim, then per frame advances the sim a fixed
// step, places a free cinematic camera (TR.fc, wraps placeCam) and reads the WebGL canvas back (much faster than
// screenshots). Viewport is 1920x1270 so the game canvas (minus the 190 px command bar) is exactly 1920x1080.
// Scenes are defined in orch/trailer-scenes.mjs. Then orch/trailer.sh edits with ffmpeg.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { SCENES } from './trailer-scenes.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
if (process.argv.includes('--list')) { for (const [k, s] of Object.entries(SCENES)) console.log(k, s.map, s.shots.map(h => h.n + ':' + h.dur).join(' ')); process.exit(0); }
const OUT = path.join(ROOT, 'orch', 'shots', 'tr');
const want = arg('scene', '').split(',').filter(Boolean), skip = arg('skip', '').split(',').filter(Boolean); // --skip scene-shot,... leaves already captured shots alone
const CAPFPS = Number(arg('fps', 15)), RS = Number(arg('rs', .667)); // capture fps (ffmpeg interpolates to 30) and render scale: 1280x720 upscaled to 1080p
const { chromium } = await import('playwright').catch(() => import('/opt/npm-tools/node_modules/playwright/index.mjs'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const page0 = fs.readFileSync(path.join(ROOT, 'index.html'));
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1270 } });
const page = await ctx.newPage(); page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' && !/net::|Failed to load|AudioContext|autoplay|WebSocket|peer/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });

// ---- in-page library ----
await page.evaluate(() => {
  window.__stopLoop = true;
  try { initAudio(); AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {}
  const s = document.createElement('style'); s.textContent = '#tstrip,#qpow,.toast{display:none!important}'; document.head.appendChild(s);
  const TR = window.TR = { fc: null, shk: 0, ev: [], f: 0, A: {} };
  const orig = placeCam;
  window.placeCam = function () {
    orig();
    const f = TR.fc; if (!f) return;
    let sx = 0, sy = 0, sz = 0; if (TR.shk > .05) { sx = (Math.random() - .5) * TR.shk; sy = (Math.random() - .5) * TR.shk; sz = (Math.random() - .5) * TR.shk; }
    const py = Math.max(f.p[1], groundH(f.p[0], f.p[2]) + 4);
    CAM.position.set(f.p[0] + sx, py + sy, f.p[2] + sz); CAM.lookAt(f.l[0] + sx * .6, f.l[1] + sy * .6, f.l[2] + sz * .6);
    if (f.fov && CAM.fov !== f.fov) { CAM.fov = f.fov; CAM.updateProjectionMatrix(); }
    CAM.updateMatrixWorld(); if (window.SKY) SKY.position.copy(CAM.position);
    cam.x = f.l[0]; cam.y = f.l[2];
  };
  const ob = boomFX;
  window.boomFX = function (x, y, s, big, h) { try { const d = TR.fc ? Math.hypot(TR.fc.l[0] - x, TR.fc.l[2] - y) : 1e9; TR.ev.push({ f: TR.f, big: !!big, s, d: Math.round(d) }); if (big && d < 700) TR.shk = Math.max(TR.shk, 14 * Math.max(.25, 1 - d / 700)); } catch (e) {} return ob.apply(this, arguments); };
  const lerp = (a, b, t) => a + (b - a) * t, ease = t => t * t * (3 - 2 * t);
  TR.lerp = lerp; TR.ease = ease; window.lerp = lerp; window.ease = ease;
  // orbit: target (x,y), radius r, height h, angle a (rad); returns a camera description
  TR.orb = (tx, ty, r, h, a, ly = 14, fov = 42) => ({ p: [tx + Math.cos(a) * r, h, ty + Math.sin(a) * r], l: [tx, ly, ty], fov });
  TR.cam = (px, py, pz, lx, ly, lz, fov = 42) => ({ p: [px, py, pz], l: [lx, ly, lz], fov });
  TR.mid = (i, j, t) => { const a = BASES[i], b = BASES[j]; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; };
  TR.land = (x, y, towardX, towardY) => { for (let k = 0; k < 60 && groundH(x, y) < WL + 3; k++) { x += (towardX - x) * .06; y += (towardY - y) * .06; } return [x, y]; };
  TR.water = (nearX, nearY) => { let best = null; for (let r = 0; r < 1200 && !best; r += 40) for (let a = 0; a < 6.28; a += .2) { const x = nearX + Math.cos(a) * r, y = nearY + Math.sin(a) * r; if (x > 80 && y > 80 && x < MAPW - 80 && y < MAPH - 80 && groundH(x, y) < WL - 6) { best = [x, y]; break; } } return best; };
  TR.mass = (team, kind, cx, cy, n, cols, gap, tx, ty) => { const out = []; for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); const x = cx + (c - cols / 2) * gap + (Math.random() - .5) * 4, y = cy + r * gap;
      const u = addUnit(team, kind, x, y); if (u) { out.push(u); if (tx != null) u.order = { type: 'amove', x: tx, y: ty }; } } return out; };
  TR.orderAll = (team, x, y, filt) => { for (const u of G.ents) if (!u.dead && !u.isB && u.team === team && (!filt || filt(u))) u.order = { type: 'amove', x, y }; };
  TR.step = n => { for (let i = 0; i < n && G && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1; };
  // column of n units of `kind` for team bi, centred t0 of the way from its base to the other base, cols wide, marching to t1
  TR.col = (bi, kind, t0, n, cols, gap, t1) => { const oi = bi === 0 ? 1 : 0, B = BASES[bi], O = BASES[oi], L = Math.hypot(O[0] - B[0], O[1] - B[1]), dx = (O[0] - B[0]) / L, dy = (O[1] - B[1]) / L, px = -dy, py = dx;
    const c = TR.mid(bi, oi, t0), tg = TR.mid(bi, oi, t1), out = []; for (let i = 0; i < n; i++) { const ci = i % cols, r = Math.floor(i / cols);
      const x = c[0] + px * (ci - cols / 2) * gap - dx * r * gap + (Math.random() - .5) * 3, y = c[1] + py * (ci - cols / 2) * gap - dy * r * gap + (Math.random() - .5) * 3;
      if (groundH(x, y) < WL + 2) continue; const u = addUnit(bi, kind, x, y); if (u) { u.order = { type: 'amove', x: tg[0], y: tg[1] }; out.push(u); } } return out; };
  TR.dir = (bi) => { const oi = bi === 0 ? 1 : 0, B = BASES[bi], O = BASES[oi], L = Math.hypot(O[0] - B[0], O[1] - B[1]); return [(O[0] - B[0]) / L, (O[1] - B[1]) / L]; };
  TR.avg = (team, pred) => { let x = 0, y = 0, n = 0; for (const u of G.ents) if (!u.dead && !u.isB && u.team === team && (!pred || pred(u))) { x += u.x; y += u.y; n++; } return n ? [x / n, y / n, n] : (TR.last || [MAPW / 2, MAPH / 2, 0]); };
  TR.avgL = (l) => { let x = 0, y = 0, n = 0; for (const u of l || []) if (u && !u.dead) { x += u.x; y += u.y; n++; } if (n) TR.last = [x / n, y / n, n]; return n ? [x / n, y / n, n] : (TR.last || [MAPW / 2, MAPH / 2, 0]); };
  // centre of the densest part of the fighting (units with a target); falls back to the two columns' midpoint
  TR.fight = () => { const E = G.ents.filter(u => !u.dead && !u.isB && u.target && u.s && u.s.cls !== 'jet' && u.s.cls !== 'heli' && u.s.cls !== 'drone'); if (E.length < 6) return null; let best = null, bn = -1;
    for (let i = 0; i < E.length; i += Math.max(1, Math.floor(E.length / 120))) { const a = E[i]; let n = 0, x = 0, y = 0; for (const b of E) if (Math.hypot(a.x - b.x, a.y - b.y) < 140) { n++; x += b.x; y += b.y; } if (n > bn) { bn = n; best = [x / n, y / n]; } }
    if (best) { const L = TR.fl; TR.fl = L ? [L[0] + (best[0] - L[0]) * .25, L[1] + (best[1] - L[1]) * .25] : best; } return TR.fl; };
  TR.grab = () => R3.domElement.toDataURL('image/jpeg', .92);
});

async function boot(s) {
  await page.evaluate(rs => { QUAL.caps = [rs, rs, rs, rs, rs, rs]; QUAL.lv = 1; POST.phone = true; POST.w = 0; resize(); }, RS);
  await page.evaluate(async s => {
    if (G) G.over = true; TR.fc = null; TR.ev = []; TR.shk = 0;
    Object.assign(setup, { map: s.map, n: s.n || 1, p: s.p, a: s.a, others: [], tm: [], slot: -1, seed: s.seed || 7, w: s.w || 0 });
    if (s.camp) startCampaign(s.camp, 1); else startSingle(); const w0 = performance.now(); while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    G.teams.forEach(T => { if (!T.ai) T.ai = mkAI(1); }); G.paused = false; for (const e of G.ents) e.vs && (e.vs[0] = true);
  }, s);
  await page.evaluate(rs => { QUAL.caps = [rs, rs, rs, rs, rs, rs]; QUAL.lv = 1; POST.phone = true; POST.w = 0; resize(); }, RS);
  const warm = (SCENES_CUR.warm ?? 60) * 60;
  for (let done = 0; done < warm; done += 1800) await page.evaluate(k => TR.step(k), Math.min(1800, warm - done));
}
let SCENES_CUR = null;
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
for (const [name, sc] of (want.length ? want.map(k => [k, SCENES[k]]) : Object.entries(SCENES))) {
  SCENES_CUR = sc; console.log(`[${secs()}] scene ${name}: boot`);
  await boot(sc);
  if (sc.prep) { const r = await page.evaluate(src => { try { return (0, eval)('(' + src + ')')(); } catch (e) { return 'PREPERR ' + e.stack; } }, sc.prep); if (typeof r === 'string' && r.startsWith('PREPERR')) console.log(r.slice(0, 400)); }
  for (const h of sc.shots) {
    if (skip.includes(name + '-' + h.n)) continue;
    const dir = path.join(OUT, (process.argv.includes('--preview') ? 'pre/' : '') + name + '-' + h.n); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    await page.evaluate(() => { TR.events = null; });
    if (h.prep) { const r = await page.evaluate(src => { try { return (0, eval)('(' + src + ')')(); } catch (e) { return 'PREPERR ' + e.stack; } }, h.prep); if (typeof r === 'string' && r.startsWith('PREPERR')) console.log(r.slice(0, 400)); }
    await page.evaluate(([src]) => { TR.camFn = (0, eval)('(' + src + ')'); TR.f = 0; TR.ev = []; }, [h.cam]);
    const stepPer = h.speed === 0 ? 0 : Math.max(1, Math.round(60 / CAPFPS * (h.speed ?? 1))); // sim ticks per captured frame (speed .5 = slow motion)
    const N = Math.round(h.dur * CAPFPS); let first = true;
    const PRE = process.argv.includes('--preview'), preSet = new Set([0, Math.floor(N / 3), Math.floor(2 * N / 3), N - 1]);
    for (let i = 0; i < N; i++) {
      if (PRE && !preSet.has(i)) { await page.evaluate(([n]) => { TR.f = 0; if (n) TR.step(n); if (TR.events) TR.events(0, 0); }, [stepPer]); continue; }
      const jpg = await page.evaluate(([i, N, stepPer, CAPF]) => { TR.f = i; window.CAPF = CAPF; const u = i / (N - 1);
        if (stepPer) TR.step(stepPer); if (TR.events) TR.events(i, u);
        TR.fc = TR.camFn(u, TR.A); renderFrame(1 / CAPF); TR.shk *= Math.pow(.86, 30 / CAPF); return TR.grab(); }, [i, N, stepPer, CAPFPS]);
      fs.writeFileSync(path.join(dir, String(i).padStart(5, '0') + '.jpg'), Buffer.from(jpg.split(',')[1], 'base64'));
      if (i % 30 === 0) console.log(`[${secs()}] ${name}-${h.n} ${i}/${N}`);
    }
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ fps: CAPFPS, rs: RS }));
    fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify(await page.evaluate(() => TR.ev)));
  }
}
await browser.close(); server.close(); console.log(`[${secs()}] done`);
