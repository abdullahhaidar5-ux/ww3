// Stuck-units sweep (orch/reports/stuck.md). Boots the real game headlessly, and on each map orders a mixed 150-unit
// column (infantry, anti-tank, tanks, AA, artillery, supply trucks) along 3 routes (enemy base, map centre, far corner),
// stepping the real simulation by hand (no rendering). Records, per run:
//   stalled  units that make <6 px progress for 8 s while they still hold a move order and are >80 px from its goal
//   piled    units caught in a pile-up: >6 units within 40 px of each other, and the pile makes no progress for 10 s
//   idle     (own scenario per map) units standing idle, in weapon range of an enemy that is shooting at their group, for >4 s
// Prints one table + STUCK PASS/FAIL against --max (default 12 stalled+piled+idle units in total over the quick set).
//   node orch/stucktest.mjs                 # quick set: 3 maps x 3 routes (what cigate runs)
//   node orch/stucktest.mjs --full          # every Middle East slice map + 3 others, 3 routes each
//   node orch/stucktest.mjs --maps strait,gulf --units 150 --secs 120 --max 12 --json out.json
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = process.env.STUCK_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FULL = process.argv.includes('--full');
const MAPS = (arg('maps', '') || (FULL ? 'strait,rivers,gulf,hormuz,zagros,lebanon,persia,mesopotamia,yemen,golan,bosphorus,fulda,dmz,volga' : 'strait,lebanon,bosphorus')).split(',');
const ROUTES = arg('routes', '0,1,2').split(',').map(Number), MODES = arg('modes', 'move,fire').split(',');
const UNITS = +arg('units', 150), SECS = +arg('secs', 110), MAXBAD = +arg('max', 12), JSON_OUT = arg('json', '');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); await guardContext(ctx);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
await page.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
await page.addInitScript(() => { try { localStorage.setItem('ww3_tut', '1'); } catch (e) {} });
await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });

// everything below runs inside the page
async function runOne(map, route, mode) {
  await page.evaluate(([map, seed]) => {
    setup.n = 1; setup.map = map; setup.seed = seed;
    const MR = Math.random; let z = seed * 2654435761 >>> 0; Math.random = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296);
    try { startSingle(); } finally { }
    window.__MR = MR; window.__stopLoop = true;
    for (const T of G.teams) T.ai = null;          // nobody but this test gives orders
  }, [map, 4242 + route]);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 300000, polling: 200 });
  await page.evaluate(() => { window.__stopLoop = true; });
  return page.evaluate(([n, SECS, route, mode]) => {
    const T0 = 0, T1 = G.teams.length > 1 ? 1 : 0;
    const b0 = BASES[0], b1 = BASES[1] || BASES[0];
    const kinds = ['inf', 'inf', 'inf', 'at', 'tank', 'tank', 'aa', 'arty', 'harv', 'inf'];
    const mid = [MAPW / 2, MAPH / 2], corner = [route === 2 ? MAPW * .85 : MAPW * .15, MAPH * .15 + (route === 2 ? MAPH * .7 : 0)];
    const goal = nearestPassXY('ground', ...(route === 0 ? [b1.x ?? b1[0], b1.y ?? b1[1]] : route === 1 ? mid : corner)) || mid;
    const sx = b0.x ?? b0[0], sy = b0.y ?? b0[1], us = [];
    for (let i = 0; i < n; i++) { const k = kinds[i % kinds.length], a = i * 2.399, r = 130 + 20 * Math.sqrt(i);
      const p = nearestPassXY('ground', sx + Math.cos(a) * r, sy + Math.sin(a) * r); if (!p) continue;
      try { const u = addUnit(T0, k, p[0], p[1]); if (u) us.push(u); } catch (e) {} }
    const by = {}; for (const u of us) { (by[u.s.cls] = by[u.s.cls] || []).push(u); }
    formMove(us, goal[0], goal[1], 'move');
    // idle-under-fire scenario: a halted group, enemy armour comes at it
    let foes = [];
    if (mode === 'fire') { for (const u of us) { u.order = null; u.path = null; u.target = null; }
      const gx = goal[0], gy = goal[1];
      for (let i = 0; i < 8; i++) { const p = nearestPassXY('ground', sx + 500 + i * 30, sy + 40); if (!p) continue; const f = addUnit(T1, 'tank', p[0], p[1]); if (f) { foes.push(f); setMove(f, sx, sy, 'amove'); } } }
    const traj = new Map(), detail = [], hist = new Map(), samples = [], stalled = new Set(), piled = new Set(), idle = new Map(), idleBad = new Set(), crowdT = new Map();
    const t0 = G.t, DT = 1 / 60; let nxt = 0, maxPile = 0;
    for (let step = 0; step < SECS * 60 && !G.over; step++) {
      simUpdate(DT);
      if (step % 30) continue;                       // sample every 0.5 s
      const now = G.t - t0, live = us.filter(u => !u.dead);
      if (mode === 'move') {
        if (step % 240 === 0) for (const u of live) (traj.get(u.id) || traj.set(u.id, []).get(u.id)).push([+now.toFixed(0), u.x | 0, u.y | 0, +(u.v || 0).toFixed(0)]);
        // spatial hash for crowd test
        const C = 40, H = new Map(); for (const u of live) { const k = ((u.x / C) | 0) + ',' + ((u.y / C) | 0); (H.get(k) || H.set(k, []).get(k)).push(u); }
        for (const u of live) {
          const o = u.order, h = hist.get(u.id) || (hist.set(u.id, []), hist.get(u.id)); h.push([now, u.x, u.y]); while (h.length && now - h[0][0] > 10.2) h.shift();
          if (!o || (o.type !== 'move' && o.type !== 'amove')) { crowdT.delete(u.id); continue; }
          const dg = Math.hypot(o.x - u.x, o.y - u.y); if (dg < 80) { crowdT.delete(u.id); continue; }
          const h8 = h.find(q => now - q[0] <= 8.2 && now - q[0] >= 7.7);
          if (h8 && Math.hypot(u.x - h8[1], u.y - h8[2]) < 6 && !(u.s.cls === 'arty' && u.deployed)) { if (!stalled.has(u.id)) detail.push({ id: u.id, cls: u.s.cls, t: +now.toFixed(0), x: u.x | 0, y: u.y | 0, gx: o.x | 0, gy: o.y | 0, dg: dg | 0, path: u.path ? u.path.length : -1, ff: u.ffx != null ? 1 : 0, v: +(u.v || 0).toFixed(1), blk: !!u.blocked }); stalled.add(u.id); }
          let near = 0; const cx = (u.x / C) | 0, cy = (u.y / C) | 0;
          for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const L = H.get((cx + dx) + ',' + (cy + dy)); if (L) for (const v of L) if (Math.hypot(v.x - u.x, v.y - u.y) < 40) near++; }
          if (near > 6) { const t = crowdT.get(u.id); if (!t) crowdT.set(u.id, { t: now, x: u.x, y: u.y }); else if (now - t.t > 10) { if (Math.hypot(u.x - t.x, u.y - t.y) < 25) piled.add(u.id); crowdT.set(u.id, { t: now, x: u.x, y: u.y }); } }
          else crowdT.delete(u.id);
        }
      } else {
        for (const u of live) { if (u.order || u.target || u.s.noAttack || !u.s.rng) { idle.delete(u.id); continue; }
          const sh = G.ents.find(f => !f.dead && f.team !== u.team && !f.isB && f.target && Math.hypot(f.x - u.x, f.y - u.y) < (u.s.rng || 0) && effOn(u.s, f) >= .35 && u.s.dom === 'ground' && u.s.cls !== 'aa' && u.s.cls !== 'arty');
          if (!sh) { idle.delete(u.id); continue; } const t = idle.get(u.id); if (t == null) idle.set(u.id, now); else if (now - t > 4) idleBad.add(u.id); }
      }
    }
    const live = us.filter(u => !u.dead);
    const done = live.filter(u => !u.order || Math.hypot(u.order.x - u.x, u.order.y - u.y) < 90).length;
    const aband = mode === 'move' ? live.filter(u => !u.order && Math.hypot(goal[0] - u.x, goal[1] - u.y) > 220 && (u.v || 0) < 2 && !u.target).length : 0;
    return { n: us.length, live: live.length, arrived: done, aband, stalled: stalled.size, piled: piled.size, idle: idleBad.size,
      detail: detail.slice(0, 12), trace: [...stalled].slice(0, 6).map(id => { const u = us.find(q => q.id === id); return { id, cls: u.s.cls, r: u.r, traj: traj.get(id), path: (u.path || []).slice(0, 3).map(q => [q[0] | 0, q[1] | 0]), nb: G.ents.filter(q => q !== u && !q.dead && !q.isB && Math.hypot(q.x - u.x, q.y - u.y) < 45).map(q => [q.s.cls, (q.v || 0) | 0, q.order ? q.order.type : '-', q.team]).slice(0, 8), bld: G.ents.filter(q => q.isB && !q.dead && Math.hypot(q.x - u.x, q.y - u.y) < q.size / 2 + 60).map(q => [q.kind, Math.hypot(q.x - u.x, q.y - u.y) | 0, q.size | 0]).slice(0, 3), ord: u.order ? u.order.type : '-', st: [u.so === u.order, u.sbD | 0, +(G.t - (u.sbT || 0)).toFixed(1), u.srp], map: (() => { const rows = []; for (let j = -8; j <= 8; j++) { let r = ''; for (let i = -10; i <= 10; i++) { const x = u.x + i * 14, y = u.y + j * 14; const q = G.ents.find(e => !e.dead && !e.isB && e !== u && Math.hypot(e.x - x, e.y - y) < 8); r += !i && !j ? '@' : q ? (q.v > 5 ? 'm' : 'i') : passXY(u.s.dom, x, y) ? '.' : (G.ents.some(b => b.isB && !b.dead && Math.abs(b.x - x) < b.size / 2 && Math.abs(b.y - y) < b.size / 2) ? 'B' : '#'); } rows.push(r); } return rows.join('\n'); })(), pass: [[-1,0],[1,0],[0,-1],[0,1]].map(([a,b]) => passXY(u.s.dom, u.x + a * 30, u.y + b * 30) ? 1 : 0) }; }), stalledKinds: [...stalled].map(id => us.find(u => u.id === id)?.s.cls).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {}), t: +(G.t - t0).toFixed(0) };
  }, [UNITS, SECS, route, mode]);
}
const rows = []; let bad = 0;
for (const m of MAPS) if (MODES.includes('move')) for (const route of ROUTES) {
  let r; try { r = await runOne(m, route, 'move'); } catch (e) { r = { err: String(e.message || e).slice(0, 160) }; }
  rows.push({ map: m, route, mode: 'move', ...r }); if (!r.err) bad += r.stalled + r.piled + r.aband;
  console.log(`${m.padEnd(11)} route ${route} move  ` + (r.err ? 'ERR ' + r.err : `units ${r.n} arrived ${r.arrived} stalled ${r.stalled} piled ${r.piled} abandoned ${r.aband} ${JSON.stringify(r.stalledKinds)}`));
}
for (const m of MAPS) if (MODES.includes('fire')) {
  let r; try { r = await runOne(m, 0, 'fire'); } catch (e) { r = { err: String(e.message || e).slice(0, 160) }; }
  rows.push({ map: m, route: 0, mode: 'fire', ...r }); if (!r.err) bad += r.idle;
  console.log(`${m.padEnd(11)} fire        ` + (r.err ? 'ERR ' + r.err : `idle-under-fire ${r.idle}`));
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(rows, null, 1));
const hard = rows.filter(r => r.err).length + errs.length;
console.log(`TOTAL stuck units: ${bad} (allowed ${MAXBAD}), errors ${hard} ${errs.slice(0, 2).join(' | ')}`);
console.log(bad <= MAXBAD && !hard ? 'STUCK PASS' : 'STUCK FAIL');
await browser.close(); server.close(); process.exit(0);
