// ORCH map sweep: checks every battlefield in MAPS the way players use it.
// Boots the game once in headless Chromium (same setup as smoke.mjs), then
//   1. a STATIC check of every map at every player count it supports: bases on dry, open, reachable ground; each base
//      with its own supply field; every supply field and oil derrick reachable by land from some base;
//   2. an AI BATTLE per map at 2, 4 and 8 players (only counts the map supports), fast-forwarding the real simulation
//      for a few game-minutes and flagging thrown errors, NaN positions, a side that never built a structure, ground
//      units stuck inside water/rock/buildings, sides whose supply trucks never deliver, draws and sub-minute wins.
// Prints one table, saves a top-down overview per map plus a contact sheet to orch/out/maps/, exits 1 on failures.
//
//   node orch/mapsweep.mjs                         # all maps, 2/4/8 players, 3 game-minutes each
//   node orch/mapsweep.mjs --maps strait,oasis --players 2,8 --minutes 5
//   node orch/mapsweep.mjs --static-only           # just the map-layout checks (about a minute; --static-seeds N, default 4)
//   node orch/mapsweep.mjs --seed 7 --no-lock
//   node orch/mapsweep.mjs --previews               # screenshot the map picker preview of every map, desktop + phone width
//   node orch/mapsweep.mjs --full-start             # rebuild the 3D world for every battle (slow, like the Deploy button)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock, watchPeakMemory } from './browserlock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out', 'maps');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MINUTES = Number(argS('minutes', 3));
const PLAYERS = String(argS('players', '2,4,8')).split(',').map(Number).filter(n => n >= 2 && n <= 8);
const ONLY = argS('maps', '') ? argS('maps', '').split(',') : null;
const SEED = Number(argS('seed', 1234));
const STATIC_ONLY = process.argv.includes('--static-only');
const FULL_START = process.argv.includes('--full-start');
const STATIC_SEEDS = Number(argS('static-seeds', 4)); // the static check is cheap: try several seeds (coastlines wobble per seed)
const MAX_MS = Number(argS('max-ms', 15));
const EARLY = Number(argS('early', 3)); // a side knocked out before this many game-minutes is reported (under 1 min fails) // average sim ms per 1/60 s step above this is reported as slow

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) {
    try { return req(p); } catch {}
  }
  throw new Error('playwright not found (npm i -g playwright, then npx playwright install chromium)');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux64', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch {}
  return undefined;
}

await acquireBrowserLock();
const peakMB = watchPeakMemory();

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;

fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const globalFails = [], warns = [];
let cur = null; // the run errors are attributed to
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const addFail = m => (cur ? cur.fails : globalFails).push(m);
page.on('pageerror', e => addFail('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) return;
  addFail('console error: ' + t.slice(0, 240));
});

// ---------------------------------------------------------------- in-page helpers
const HELPERS = () => {
  const SW = window.__SW = {};
  // 8-connected ground regions exactly like regions('ground') in 02-map (diagonals need both sides open)
  SW.regions = (grid, pass) => {
    const a = new Int32Array(GW * GH); let id = 0; const st = [];
    for (let i = 0; i < a.length; i++) { if (a[i] || !pass(grid[i])) continue; id++; a[i] = id; st.push(i);
      while (st.length) { const c = st.pop(), cx = c % GW, cy = (c / GW) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const n = ny * GW + nx; if (a[n] || !pass(grid[n])) continue;
          if (dx && dy && (!pass(grid[cy * GW + nx]) || !pass(grid[ny * GW + cx]))) continue; a[n] = id; st.push(n); } } }
    return a; };
  const gpass = v => v === 0 || v === 2;
  // region of the nearest passable cell (what findPath's nearestPass would use)
  SW.regAt = (R, grid, x, y) => { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let r = 0; r < 16; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= GW || Y >= GH) continue; if (gpass(grid[Y * GW + X])) return R[Y * GW + X]; }
    return 0; };
  // Static map check at n players: builds the map the way newGame does (world scale, base slots, seed).
  SW.staticCheck = (k, n, seed) => {
    const out = { k, n, issues: [], fields: 0, oil: 0 };
    setWorld(worldScaleFor(n)); setBases(n, k, -1);
    const sv = srand; let M; try { M = mkMap(seed, k); } finally { srand = sv; }
    const g = M.grid, R = SW.regions(g, gpass);
    out.fields = M.fields.length; out.oil = M.oil.length;
    { let h = 2166136261, w = 0; for (let i = 0; i < g.length; i++) { h = Math.imul(h ^ g[i], 16777619); if (g[i] === 1) w++; } out.hash = (h >>> 0).toString(16); out.water = w; }
    const breg = BASES.map(([x, y]) => SW.regAt(R, g, x, y));
    BASES.forEach(([bx, by], i) => {
      const cx = Math.floor(bx / CELL), cy = Math.floor(by / CELL), v = g[cy * GW + cx];
      if (v !== 0) out.issues.push(`base ${i + 1} centre is ${v === 1 ? 'water' : v === 2 ? 'a bridge' : 'rock/city'}`);
      // HQ + first buildings need open ground around the slot
      let tot = 0, ok = 0, wat = 0; const rr = Math.ceil(200 / CELL);
      for (let j = -rr; j <= rr; j++) for (let q = -rr; q <= rr; q++) { const X = cx + q, Y = cy + j; if ((q * q + j * j) * CELL * CELL > 200 * 200) continue; tot++;
        if (X >= 0 && Y >= 0 && X < GW && Y < GH && g[Y * GW + X] === 0) ok++; else if (X >= 0 && Y >= 0 && X < GW && Y < GH && g[Y * GW + X] === 1) wat++; }
      if (ok / tot < .85) out.issues.push(`base ${i + 1} cramped (${Math.round(100 * ok / tot)}% open ground within 200, ${Math.round(100 * wat / tot)}% water)`);
      if (breg[i] !== breg[0]) out.issues.push(`base ${i + 1} cannot reach base 1 by land`);
      // a river passing so close that the dry ground kept around every base would cut straight across it (a free
      // land crossing next to the base, and a river split in two for boats)
      M.rivers.forEach((rv, ri) => { let bd = 1e9, bh = 0; const P = rv.pts; for (let q = 0; q < P.length - 1; q++) { const [d, t] = segDist(bx, by, P[q][0], P[q][1], P[q + 1][0], P[q + 1][1]); if (d < bd) { bd = d; bh = rv.hw((rv.acc[q] + (rv.acc[q + 1] - rv.acc[q]) * t) / rv.len, P[q][0] + (P[q + 1][0] - P[q][0]) * t); } }
        if (bd + bh < 330) out.issues.push(`base ${i + 1} cuts river ${ri + 1} (centre ${bd | 0} away, half-width ${bh | 0})`);
        else if (bd < 300 + bh * .5) out.issues.push(`base ${i + 1} squeezes river ${ri + 1} (centre ${bd | 0} away, half-width ${bh | 0})`); });
      const own = M.fields.filter(f => Math.hypot(f.x - bx, f.y - by) < 650 && SW.regAt(R, g, f.x, f.y) === breg[i]);
      if (!own.length) out.issues.push(`base ${i + 1} has no supply field of its own within 650`);
      for (let j = i + 1; j < BASES.length; j++) { const d = Math.hypot(BASES[j][0] - bx, BASES[j][1] - by); if (d < 650) out.issues.push(`bases ${i + 1} & ${j + 1} only ${d | 0} apart`); }
    });
    const reachable = new Set(breg);
    M.fields.forEach((f, i) => { if (!reachable.has(SW.regAt(R, g, f.x, f.y))) out.issues.push(`supply field ${i} unreachable by land`); });
    M.oil.forEach((o, i) => { if (!reachable.has(SW.regAt(R, g, o.x, o.y))) out.issues.push(`oil derrick ${i} unreachable by land`); });
    if (M.fields.length < n + 2) out.issues.push(`only ${M.fields.length} supply fields for ${n} players`);
    if (M.oil.length < 2) out.issues.push(`only ${M.oil.length} oil derricks`);
    if (SW.wantImg) { // layout picture: land, water, bridges, rock/city, base slots, supply (yellow), oil (orange)
      const W = 480, H = Math.round(W * MAPH / MAPW), c = document.createElement('canvas'); c.width = W; c.height = H + 18; const x = c.getContext('2d'), id = x.createImageData(W, H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const v = g[Math.floor(j / H * GH) * GW + Math.floor(i / W * GW)]; id.data.set(v === 1 ? [40, 90, 120, 255] : v === 2 ? [150, 120, 80, 255] : v === 3 ? [90, 86, 80, 255] : [196, 170, 120, 255], (j * W + i) * 4); }
      x.fillStyle = '#111'; x.fillRect(0, 0, W, 18); x.putImageData(id, 0, 18); const K = W / MAPW;
      for (const f of M.fields) { x.fillStyle = '#ffe14a'; x.beginPath(); x.arc(f.x * K, 18 + f.y * K, 3, 0, 7); x.fill(); }
      for (const o of M.oil) { x.fillStyle = '#ff7a00'; x.fillRect(o.x * K - 3, 18 + o.y * K - 3, 6, 6); }
      BASES.forEach(([bx, by], i) => { x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.arc(bx * K, 18 + by * K, 276 * K, 0, 7); x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 11px sans-serif'; x.fillText(i + 1, bx * K - 3, 18 + by * K + 4); });
      x.fillStyle = out.issues.length ? '#ff6b5a' : '#eee'; x.font = 'bold 12px sans-serif'; x.fillText(`${k} · ${n}p · seed ${seed}${out.issues.length ? ' · ' + out.issues.length + ' issue(s)' : ''}`, 4, 13);
      out.img = c.toDataURL('image/png'); }
    return out;
  };
  // ---- battle run
  SW.start = (k, n, seed, p, a) => {
    window.__stopLoop = true; // the sweep drives the sim itself; no rendering between chunks
    if (G) G.over = true;
    setup.map = k; setup.n = n - 1; setup.p = p; setup.a = a; setup.others = []; setup.tm = []; setup.slot = -1; setup.seed = seed;
    if (!SW.endWrapped) { SW.endWrapped = true; const E = endGame; window.endGame = (w, why) => { SW.end = SW.end || { w, t: G ? G.t : -1, why }; return E(w, why); }; }
    SW.end = null;
    const ms0 = performance.now();
    // First battle goes through startSingle() exactly like the Deploy button (builds the 3D world too). Later ones call
    // newGame() the same way startSingle does but skip rebuilding the 3D scene, which nothing in the simulation reads
    // and which costs most of a minute per map under SwiftShader. --full-start rebuilds it every time.
    if (!SW.started || SW.full) { SW.started = true; startSingle(); }
    else { MODE = 'single'; ME = 0; const facs = rollAis(); if (new Set(setup.tm).size < 2) setup.tm = facs.map((_, i) => i);
      newGame({ seed, facs, ai: facs.map((_, i) => i > 0), map: k, tm: setup.tm.slice(), bs: setup.bs, slot: -1 }); }
    if (!G || G.mapKey !== k || G.teams.length !== n) return { err: `started ${G && G.mapKey} with ${G && G.teams.length} players` };
    G.teams.forEach(T => { if (!T.ai) T.ai = mkAI(1); });
    SW.st = { built: G.teams.map(() => false), harvSeen: G.teams.map(() => false), earn: G.teams.map(() => 0), cargo: new Map(),
      peak: G.teams.map(() => 0), bad: new Map(), stuck: new Map(), frozen: new Map(), lastPos: new Map(), trace: [], first: G.teams.map(() => -1), steps: 0, ms: 0, nan: 0, nextS: 5 };
    return { ok: true, facs: G.teams.map(T => T.fac), startMs: performance.now() - ms0, W: MAPW, H: MAPH };
  };
  const sample = (heavy) => {
    const S = SW.st, ents = G.ents, cnt = G.teams.map(() => 0);
    for (const e of ents) {
      if (e.dead) continue; cnt[e.team]++;
      if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { S.nan++; continue; }
      if (e.isB) { if (e.kind !== 'hq' && e.built >= 1) S.built[e.team] = true; continue; }
      if (e.kind === 'harv') { S.harvSeen[e.team] = true; const c0 = S.cargo.get(e.id) || 0; if (e.cargo < c0) { S.earn[e.team] += c0 - e.cargo; if (S.first[e.team] < 0) S.first[e.team] = G.t | 0; } S.cargo.set(e.id, e.cargo); }
      if (!heavy || e.s.dom !== 'ground' || e.inGar || e.inTun) continue;
      const v = G.grid[Math.floor(e.y / CELL) * GW + Math.floor(e.x / CELL)];
      if (v !== 0 && v !== 2) { const p = S.bad.get(e.id); if (p && Math.hypot(p[0] - e.x, p[1] - e.y) < 24) S.stuck.set(e.id, [e.x | 0, e.y | 0, e.team, e.kind, v, G.t | 0]); S.bad.set(e.id, [e.x, e.y]); }
      else S.bad.delete(e.id);
      // ordered to move, not fighting, yet hasn't moved for 30 s: a pathfinding dead end
      const lp = S.lastPos.get(e.id), moving = e.order && (e.order.type === 'move' || e.order.type === 'amove') && !e.target && e.kind !== 'harv';
      if (lp && moving && Math.hypot(lp[0] - e.x, lp[1] - e.y) < 6 && Math.hypot(e.order.x - e.x, e.order.y - e.y) > 80) { lp[2] += 5; if (lp[2] >= 30) S.frozen.set(e.id, [e.x | 0, e.y | 0, e.team, e.kind, (e.order.x) | 0, (e.order.y) | 0]); }
      else S.lastPos.set(e.id, [e.x, e.y, 0]);
    }
    cnt.forEach((c, i) => S.peak[i] = Math.max(S.peak[i], c));
    if (heavy && Math.round(G.t) % 10 < 5) S.trace.push(`t${G.t | 0}: ` + G.teams.map(T => { const F = forceOf(T); return `${T.fac} b${F.bn} u${F.un} dz${F.dz} $${T.credits | 0}${T.out ? ' OUT' : ''}`; }).join(' | '));
    return cnt;
  };
  SW.chunk = (steps) => {
    const S = SW.st; let cnt = null;
    try {
      for (let i = 0; i < steps && G && !G.over; i++) {
        const a = performance.now(); simUpdate(1 / 60); S.ms += performance.now() - a; S.steps++;
        if (S.steps % 60 === 0) { const heavy = G.t >= S.nextS; if (heavy) S.nextS += 5; cnt = sample(heavy); }
      }
    } catch (e) { return { err: String(e && e.stack || e) }; }
    cnt = sample(false);
    return { t: G.t, over: G.over, end: SW.end, cnt };
  };
  SW.result = () => {
    const S = SW.st;
    return { t: G.t, over: G.over, end: SW.end, msPerStep: S.ms / Math.max(1, S.steps), nan: S.nan, built: S.built, harvSeen: S.harvSeen,
      earn: S.earn, peak: S.peak, alive: G.teams.map(T => !T.out), stuck: [...S.stuck.values()], frozen: [...S.frozen.values()], trace: S.trace, first: S.first,
      units: G.ents.filter(e => !e.dead && !e.isB).length, blds: G.ents.filter(e => !e.dead && e.isB).length };
  };
  // top-down overview: terrain + blocked cells + fields/oil + every entity, stuck units ringed red
  SW.overview = (title, W) => {
    W = W || 800; const H = Math.round(W * MAPH / MAPW), k = W / MAPW, c = document.createElement('canvas'); c.width = W; c.height = H + 22; const x = c.getContext('2d');
    x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height); x.drawImage(G.terrain, 0, 22, W, H);
    x.save(); x.translate(0, 22); x.scale(k, k);
    x.fillStyle = 'rgba(255,40,40,.18)'; for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) if (G.grid[j * GW + i] === 3) x.fillRect(i * CELL, j * CELL, CELL, CELL);
    for (const f of G.fields) { x.strokeStyle = f.amt > 0 ? '#ffe14a' : '#776'; x.lineWidth = 6 / k; x.beginPath(); x.arc(f.x, f.y, 40, 0, 7); x.stroke(); }
    for (const o of G.oil) { x.fillStyle = '#000'; x.strokeStyle = '#ff9a2a'; x.lineWidth = 3 / k; x.beginPath(); x.moveTo(o.x, o.y - 34); x.lineTo(o.x + 26, o.y); x.lineTo(o.x, o.y + 34); x.lineTo(o.x - 26, o.y); x.closePath(); x.fill(); x.stroke(); }
    for (const e of G.ents) { if (e.dead) continue; x.fillStyle = G.teams[e.team].color; x.strokeStyle = '#000'; x.lineWidth = 1.5 / k;
      if (e.isB) { x.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size); x.strokeRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size); }
      else { x.beginPath(); x.arc(e.x, e.y, Math.max(12, 3 / k), 0, 7); x.fill(); x.stroke(); } }
    for (const [sx, sy] of [...SW.st.stuck.values(), ...SW.st.frozen.values()]) { x.strokeStyle = '#ff2020'; x.lineWidth = 5 / k; x.beginPath(); x.arc(sx, sy, 60, 0, 7); x.stroke(); }
    BASES.forEach(([bx, by], i) => { x.fillStyle = '#fff'; x.font = `bold ${Math.round(16 / k)}px sans-serif`; x.fillText(String(i + 1), bx + 120, by - 120); });
    x.restore(); x.fillStyle = '#eee'; x.font = 'bold 14px sans-serif'; x.fillText(title, 6, 16);
    return c.toDataURL('image/png');
  };
  SW.sheet = (urls, cols, tw) => new Promise(res => {
    const imgs = urls.map(u => { const i = new Image(); i.src = u; return i; });
    Promise.all(imgs.map(i => i.decode())).then(() => {
      const th = Math.round(imgs[0].height * tw / imgs[0].width), rows = Math.ceil(imgs.length / cols), c = document.createElement('canvas');
      c.width = cols * tw; c.height = rows * th; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
      imgs.forEach((im, i) => x.drawImage(im, (i % cols) * tw, ((i / cols) | 0) * th, tw, th)); res(c.toDataURL('image/png'));
    });
  });
};
const saveUrl = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));

// ---------------------------------------------------------------- boot
await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => warns.push('3D models still loading after 180s'));
await page.evaluate(HELPERS);
if (FULL_START) await page.evaluate(() => { __SW.full = true; });
try { await page.evaluate(() => { try { initAudio(); } catch (e) {} }); } catch {}
let keys = await page.evaluate(() => MAP_KEYS.map(k => [k, MAPS[k].max, MAPS[k].min || 2]));
if (ONLY) keys = keys.filter(([k]) => ONLY.includes(k));
console.log(`map sweep: ${keys.length} maps, players ${PLAYERS.join('/')}, ${MINUTES} game-min each, seed ${SEED} (boot ${((Date.now() - t0) / 1000) | 0}s)`);

// ---------------------------------------------------------------- 0. map-select previews (--previews: only this)
// Picks each map in the menu's Battlefield picker at desktop and phone width, screenshots the picker and checks the
// preview canvas actually has a drawn map (not blank, not one flat colour).
if (process.argv.includes('--previews')) {
  const bad = [], pv = [];
  for (const [w, h, tag] of [[1280, 800, 'desktop'], [390, 844, 'phone']]) {
    await page.setViewportSize({ width: w, height: h });
    for (const [k] of keys) {
      const r = await page.evaluate(async (k) => {
        const sel = document.getElementById('mapSel'); if (!sel) return { err: 'no #mapSel picker' };
        sel.value = k; sel.onchange(); await new Promise(r => setTimeout(r, 120));
        const cv = document.getElementById('mapCv'), c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data;
        const cols = new Set(); let lum = 0, lum2 = 0, n = 0;
        for (let i = 0; i < d.length; i += 4 * 37) { const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; lum += l; lum2 += l * l; n++; cols.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4); }
        const b = cv.getBoundingClientRect(), box = cv.closest('.mapsel').getBoundingClientRect();
        cv.scrollIntoView({ block: 'center' });
        return { sd: Math.sqrt(Math.max(0, lum2 / n - (lum / n) ** 2)), cols: cols.size, cw: b.width, ch: b.height, bw: box.width, vw: innerWidth, sw: document.documentElement.scrollWidth, text: document.querySelector('.mapsel .pl').textContent };
      }, k);
      if (r.err) { bad.push(`${tag} ${k}: ${r.err}`); break; }
      if (r.sd < 4 || r.cols < 3) bad.push(`${tag} ${k}: preview looks blank (sd ${r.sd.toFixed(1)}, ${r.cols} colours)`);
      if (Math.abs(r.cw / r.ch - 32 / 22) > .05) bad.push(`${tag} ${k}: preview stretched ${r.cw.toFixed(0)}x${r.ch.toFixed(0)}`);
      if (r.bw > r.vw || r.sw > r.vw + 1) bad.push(`${tag} ${k}: picker wider than the screen (${r.bw.toFixed(0)} / page ${r.sw} > ${r.vw})`);
      const file = path.join(OUT, `preview-${tag}-${k}.png`);
      await page.locator('.mapsel').screenshot({ path: file });
      pv.push({ tag, k, ...r });
    }
  }
  for (const tag of ['desktop', 'phone']) {
    const urls = pv.filter(p => p.tag === tag).map(p => 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, `preview-${tag}-${p.k}.png`)).toString('base64'));
    if (urls.length) saveUrl(path.join(OUT, `previews-${tag}.png`), await page.evaluate(([u, tw]) => __SW.sheet(u, 4, tw), [urls, tag === 'phone' ? 260 : 400]));
  }
  await browser.close(); server.close();
  for (const p of pv) console.log(`  ${p.tag.padEnd(7)} ${p.k.padEnd(12)} canvas ${p.cw.toFixed(0)}x${p.ch.toFixed(0)} sd ${p.sd.toFixed(0)}  ${p.text}`);
  for (const b of bad) console.log('  ✗ ' + b);
  console.log(`\nPREVIEWS ${bad.length ? 'FAIL' : 'PASS'}: ${pv.length} screenshots, contact sheets orch/out/maps/previews-desktop.png / previews-phone.png`);
  process.exit(bad.length ? 1 : 0);
}

// ---------------------------------------------------------------- 1. static checks (every supported player count)
const statics = [];
for (let si = 0; si < STATIC_SEEDS; si++) for (const [k, max, min] of keys) for (let n = Math.max(2, min); n <= max; n++) {
  cur = { fails: [] };
  const seed = SEED + si * 7919;
  const r = await page.evaluate(([k, n, s]) => { try { return __SW.staticCheck(k, n, s); } catch (e) { return { k, n, issues: ['threw: ' + String(e && e.stack || e).split('\n')[0]] }; } }, [k, n, seed]);
  r.issues.push(...cur.fails); r.seed = seed; statics.push(r);
}
{ // one layout picture per map (its largest player count, first seed) + a contact sheet
  const imgs = [];
  for (const [k, max] of keys) { const u = await page.evaluate(([k, n, s]) => { __SW.wantImg = true; try { return __SW.staticCheck(k, n, s).img; } finally { __SW.wantImg = false; } }, [k, max, SEED]); if (u) { saveUrl(path.join(OUT, `layout-${k}.png`), u); imgs.push(u); } }
  if (imgs.length) saveUrl(path.join(OUT, 'layouts.png'), await page.evaluate(([u]) => __SW.sheet(u, 4, 480), [imgs]));
}
cur = null;
fs.writeFileSync(path.join(OUT, 'static.json'), JSON.stringify(statics.map(({ k, n, seed, hash, water, issues }) => ({ k, n, seed, hash, water, issues }))));
const sBad = statics.filter(s => s.issues.length);
console.log(`\nSTATIC  ${statics.length} map/player-count/seed combinations (${STATIC_SEEDS} seeds), ${sBad.length} with issues`);
for (const s of sBad) console.log(`  ${s.k.padEnd(12)} ${String(s.n).padStart(1)}p seed ${s.seed}  ${s.issues.join('; ')}`);

// ---------------------------------------------------------------- 2. battles
const runs = [], shots = [];
if (!STATIC_ONLY) {
  const FAC = await page.evaluate(() => FKEYS.slice());
  let ri = 0;
  for (const [k, max] of keys) {
    const ns = PLAYERS.filter(n => n <= max);
    for (const n of ns) {
      const run = { k, n, fails: [], warn: [] }; cur = run; runs.push(run);
      // factions rotate through all 18 but depend only on map + player count, so a run is reproducible with --maps
      ri = [...k].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, n * 7);
      const p = FAC[ri % FAC.length], a = FAC[(ri + 7) % FAC.length];
      const tr = Date.now();
      const st = await page.evaluate(([k, n, s, p, a]) => { try { return __SW.start(k, n, s, p, a); } catch (e) { return { err: String(e && e.stack || e) }; } }, [k, n, SEED + n, p, a === p ? FAC[0] : a]);
      if (st.err) { run.fails.push('start: ' + st.err.split('\n').slice(0, 3).join(' | ')); continue; }
      run.facs = st.facs;
      const steps = Math.round(MINUTES * 3600), CH = 1800;
      for (let done = 0; done < steps; done += CH) {
        const c = await page.evaluate(k => __SW.chunk(k), Math.min(CH, steps - done));
        if (c.err) { run.fails.push('simulation threw: ' + c.err.split('\n').slice(0, 4).join(' | ')); break; }
        if (c.over) break;
      }
      const R = await page.evaluate(() => __SW.result());
      Object.assign(run, R, { real: (Date.now() - tr) / 1000, startS: st.startMs / 1000 }); delete run.trace;
      if (R.nan) run.fails.push(`${R.nan} NaN positions`);
      if (R.over) {
        if (!R.end || R.end.w < 0) run.fails.push(`ended in a draw at ${R.t | 0}s`);
        else if (R.end.t < 60) run.fails.push(`ended after only ${R.end.t | 0}s`);
        else if (R.end.t < EARLY * 60) run.warn.push(`early knockout at ${(R.end.t / 60).toFixed(1)} min: ${R.end.why || ''}`);
        if (!R.end || R.end.t < EARLY * 60) run.trace = R.trace;
      }
      const mins = R.t / 60;
      R.built.forEach((b, i) => { if (!b && mins >= 1.5) run.fails.push(`side ${i + 1} (${st.facs[i]}) never built a structure`); });
      R.first.forEach((f, i) => { if ((f < 0 && mins >= 1.5) || f > 75) run.warn.push(`side ${i + 1} (${st.facs[i]}) first supply delivery ${f < 0 ? 'never' : 'at ' + f + 's'}`); });
      R.harvSeen.forEach((h, i) => { if (mins >= 2 && R.earn[i] === 0 && R.alive[i]) run.fails.push(`side ${i + 1} (${st.facs[i]}) supply trucks never delivered`); });
      if (R.stuck.length) run.fails.push(`${R.stuck.length} ground units stuck in water/rock (${R.stuck.slice(0, 3).map(s => `${s[3]}@${s[0]},${s[1]} cell${s[4]}`).join(' ')})`);
      if (R.frozen.length) run.warn.push(`${R.frozen.length} units stalled on a move order (${R.frozen.slice(0, 3).map(s => `${s[3]}@${s[0]},${s[1]}→${s[4]},${s[5]}`).join(' ')})`);
      if (R.msPerStep > MAX_MS) run.warn.push(`slow sim ${R.msPerStep.toFixed(1)} ms/step`);
      if (n === Math.max(...ns)) {
        try {
          const url = await page.evaluate(([t]) => __SW.overview(t, 800), [`${k} · ${n}p · ${(R.t / 60).toFixed(1)} min${run.fails.length ? ' · FAIL' : ''}`]);
          saveUrl(path.join(OUT, `${k}.png`), url); shots.push(url);
        } catch (e) { warns.push(`overview ${k}: ${e.message}`); }
      }
      cur = null;
      const flag = run.fails.length ? 'FAIL' : run.warn.length ? 'warn' : 'ok';
      console.log(`  ${k.padEnd(12)} ${n}p ${flag.padEnd(4)} ${(R.t / 60).toFixed(1)}min ${R.msPerStep.toFixed(2)}ms/step peak ${R.peak.join('/')} earn ${R.earn.join('/')} 1st ${R.first.join('/')}s (${run.real.toFixed(0)}s, start ${run.startS.toFixed(0)}s)`);
    }
  }
  if (shots.length) {
    try { saveUrl(path.join(OUT, 'contact.png'), await page.evaluate(([u]) => __SW.sheet(u, 4, 400), [shots])); } catch (e) { warns.push('contact sheet: ' + e.message); }
  }
}
await browser.close();
server.close();

// ---------------------------------------------------------------- report
if (runs.length) {
  console.log('\nBATTLES');
  console.log('map          pl  min  ms/st  peak ents         harvest earned        result');
  for (const r of runs) {
    const res = r.fails.length ? 'FAIL ' + r.fails.join('; ') : r.warn.length ? 'warn ' + r.warn.join('; ') : r.over ? `won by side ${r.end.w + 1} at ${(r.end.t / 60).toFixed(1)}m` : 'ok';
    console.log(`${r.k.padEnd(12)} ${String(r.n).padStart(2)} ${r.t != null ? (r.t / 60).toFixed(1).padStart(4) : '   -'} ${r.msPerStep != null ? r.msPerStep.toFixed(2).padStart(6) : '     -'}  ${(r.peak || []).join('/').padEnd(17)} ${(r.earn || []).map(e => e > 999 ? (e / 1000).toFixed(0) + 'k' : e).join('/').padEnd(21)} ${res}`);
  }
}
for (const r of runs) if (r.trace) { console.log(`\n${r.k} ${r.n}p (${(r.facs || []).join(' vs ')}) ended ${(r.t / 60).toFixed(1)} min: ${r.end ? r.end.why : 'draw'}`); for (const l of r.trace) console.log('   ' + l); }
{ const mb = peakMB(); if (mb) console.log(`peak memory (node + browser): ${mb} MB`); }
for (const w of [...new Set(warns)]) console.log('  warn: ' + w);
const nFail = runs.filter(r => r.fails.length).length + sBad.length + globalFails.length;
for (const f of [...new Set(globalFails)].slice(0, 10)) console.log('  ✗ ' + f);
const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (nFail) { console.log(`\nMAPSWEEP FAIL (${secs}s): ${sBad.length} static, ${runs.filter(r => r.fails.length).length}/${runs.length} battles — overviews in orch/out/maps/`); process.exit(1); }
console.log(`\nMAPSWEEP PASS (${secs}s): ${statics.length} static checks, ${runs.length} battles — overviews in orch/out/maps/`);
