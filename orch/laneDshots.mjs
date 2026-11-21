// Lane D vehicle-art pictures: boots a real Battle (bm_breakwater, Day, 4 nations), parks rows of the given vehicle kinds per
// nation in one open spot, and saves a battle-camera frame (normal zoom) plus one close-up per nation row.
//   node orch/laneDshots.mjs <theme> <tag>      -> orch/shots/laneD/<theme>-<tag>-battle.jpg, -<theme>-<tag>-close-<NAT>.jpg
// Deterministic (same seed, same spots, no randomness) so a run on main and a run on the branch are directly comparable.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots', 'laneD');
const THEMES = {
  shia: { facs: ['RS', 'DW', 'OB', 'IR'], kinds: ['tank', 'tank', 'aa', 'atgm'] },
  west: { facs: ['US', 'GB', 'FR', 'IL'], kinds: ['tank', 'jeep', 'arty', 'atgm'], navy: ['lander', 'minel', 'sweep'] },
  regional: { facs: ['KR', 'IN', 'SA', 'TR'], kinds: ['aa', 'ew', 'dozer', 'atgm', 'drone'] },
  drones: { facs: ['US', 'IR', 'RU', 'KR'], kinds: ['drone', 'drone', 'tank'] },
};
const theme = process.argv[2] || 'shia', tag = process.argv[3] || 'after', TH = THEMES[theme];
const { chromium } = await import('playwright').catch(() => import('/opt/npm-tools/node_modules/playwright/index.mjs'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.gz': 'application/gzip', '.webp': 'image/webp' };
const page0 = fs.readFileSync(path.join(ROOT, 'index.html'));
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1090 } })).newPage();
page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 180000 });
const info = await page.evaluate(async ([TH]) => {
  window.__stopLoop = true;
  try { initAudio(); AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {}
  try { window.supplyWanted = () => false; if (typeof LGU !== 'undefined') LGU.on = false; } catch (e) {}
  Object.assign(setup, { map: 'bm_breakwater', n: 3, p: TH.facs[0], a: TH.facs[1], others: TH.facs.slice(2), tm: [0, 1, 2, 3], slot: -1, seed: 7, w: 0 });
  startSingle(); const w0 = performance.now(); while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
  if (typeof modelsFor === 'function') await modelsFor(TH.facs, () => {}, 600000);
  G.paused = true; G.teams.forEach(T => { T.ai = null; });
  window.__fc = null; const orig = placeCam;
  window.placeCam = function () { orig(); const f = window.__fc; try { if (typeof SELR !== 'undefined' && SELR.m) SELR.m.visible = false; if (!window.__rg || window.__rgN !== SCN.children.length) { window.__rgN = SCN.children.length; window.__rg = []; SCN.traverse(o => { if (o.isMesh && /^decals_ring/.test(o.name || '')) window.__rg.push(o); }); } for (const o of window.__rg) o.visible = false; } catch (e) {} if (!f) return;
    if (CAM.near > 3) { CAM.near = 3; CAM.updateProjectionMatrix(); } CAM.position.set(f.p[0], f.p[1], f.p[2]); CAM.lookAt(f.l[0], f.l[1], f.l[2]);
    if (CAM.fov !== f.fov) { CAM.fov = f.fov; CAM.updateProjectionMatrix(); } CAM.updateMatrixWorld(); if (window.SKY) SKY.position.copy(CAM.position); cam.x = f.l[0]; cam.y = f.l[2]; };
  // open flat land nearest the map centre, big enough for 4 rows of 5 vehicles
  const ok = (x, y) => { let lo = 1e9, hi = -1e9; for (let dx = -170; dx <= 170; dx += 34) for (let dy = -150; dy <= 150; dy += 30) { const h = groundH(x + dx, y + dy); lo = Math.min(lo, h); hi = Math.max(hi, h); } return lo > WL + 4 && hi - lo < 14; };
  let C = null; for (let r = 0; r < 1600 && !C; r += 50) for (let a = 0; a < 6.28 && !C; a += .25) { const x = MAPW / 2 + Math.cos(a) * r, y = MAPH / 2 + Math.sin(a) * r; if (x > 300 && y > 300 && x < MAPW - 300 && y < MAPH - 300 && ok(x, y)) C = [Math.round(x), Math.round(y)]; }
  if (!C) C = [MAPW / 2, MAPH / 2];
  const rows = [], gapX = 66, gapY = 70;
  // every row is the player's own team (no fog), built while team 0 wears that row's nation, so each row gets its nation's models
  const F0 = G.teams[0].fac;
  TH.facs.forEach((f, ti) => { const y = C[1] + (ti - 1.5) * gapY, row = []; G.teams[0].fac = f;
    TH.kinds.forEach((k, ki) => { const x = C[0] + (ki - (TH.kinds.length - 1) / 2) * gapX; let u = null; try { u = addUnit(0, k, x, y); } catch (e) {}
      if (u) { u.a = Math.PI * .8; if ('ta' in u) u.ta = u.a; u.order = null; u.ox = u.x; u.oy = u.y; row.push(u.id); } });
    try { cam.x = C[0]; cam.y = y; renderFrame(1 / 30); } catch (e) {}
    rows.push({ f, y }); });
  let W = null; if (TH.navy) { for (let r = 0; r < 2400 && !W; r += 40) for (let a = 0; a < 6.28 && !W; a += .2) { const x = C[0] + Math.cos(a) * r, y = C[1] + Math.sin(a) * r; if (x > 200 && y > 200 && x < MAPW - 200 && y < MAPH - 200 && groundH(x, y) < WL - 8 && groundH(x + 120, y) < WL - 8 && groundH(x - 120, y) < WL - 8) W = [x, y]; }
    if (W) TH.facs.forEach((f, ti) => { G.teams[0].fac = f; TH.navy.forEach((k, ki) => { try { const u = addUnit(0, k, W[0] + (ki - 1) * 70, W[1] + (ti - 1.5) * 60); if (u) { u.a = Math.PI * .8; u.order = null; u.ox = u.x; u.oy = u.y; } } catch (e) {} }); try { cam.x = W[0]; cam.y = W[1]; renderFrame(1 / 30); } catch (e) {} }); }
  G.teams[0].fac = F0;
  for (const e of G.ents) { e.ox = e.x; e.oy = e.y; if (e.vs) for (let i = 0; i < e.vs.length; i++) e.vs[i] = true; } G.alpha = 1;
  window.updateVis = () => { for (const e of G.ents) e.vis = true; }; updateVis();
  window.__C = C; window.__W = W; window.__rows = rows; return { C, W, rows, ents: G.ents.length };
}, [TH]);
console.log('scene', JSON.stringify(info));
console.log('spawned', await page.evaluate(() => G.ents.filter(e => !e.isB && Math.hypot(e.x - __C[0], e.y - __C[1]) < 260).map(e => G.teams[e.team].fac + ':' + e.kind).join(' ')));
fs.mkdirSync(OUT, { recursive: true });
const grab = async (fc, name) => {
  const jpg = await page.evaluate(([fc]) => { window.__fc = fc; for (const e of G.ents) e.vis = true; for (let i = 0; i < 3; i++) renderFrame(1 / 30); return R3.domElement.toDataURL('image/jpeg', .9); }, [fc]);
  fs.writeFileSync(path.join(OUT, `${theme}-${tag}-${name}.jpg`), Buffer.from(jpg.split(',')[1], 'base64')); console.log('saved', name);
};
const [cx, cy] = info.C, gh = await page.evaluate(([x, y]) => groundH(x, y), info.C);
await page.evaluate(([x, y]) => { cam.x = x; cam.y = y; }, info.C);
await grab(null, 'battle'); // the normal battle camera, centred on the parked vehicles
await page.evaluate(() => { window.__fc = null; });
for (const r of info.rows) { const L = (THEMES[theme].kinds.length - 1) * 33; // close-up of one nation's row, low 3/4 view
  await grab({ p: [cx + L * .5 + 60, gh + 85, r.y + 215], l: [cx, gh + 6, r.y], fov: 40 }, 'close-' + r.f); }
if (info.W) { const wh = await page.evaluate(() => WL); await grab({ p: [info.W[0] + 60, wh + 120, info.W[1] + 260], l: [info.W[0], wh, info.W[1]], fov: 42 }, 'navy'); }
await browser.close(); server.close(); console.log('done');
