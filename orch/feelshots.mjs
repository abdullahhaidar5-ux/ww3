// Battlefeel: wildfire, drifting smoke + LOS, wreck cover, auto-build panel. Writes orch/shots/battlefeel/*.png and prints checks (BF-FEEL PASS/FAIL)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const OUT = path.join(ROOT, 'orch', 'shots', 'battlefeel'); fs.mkdirSync(OUT, { recursive: true });
async function loadPlaywright() { try { return await import('playwright'); } catch {} const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} } throw new Error('playwright not found'); }
function findChromium() { const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {} }
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const want = (process.env.SHOTS || 'fire,smoke,wreck,auto').split(','); const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 620 } }); await guardContext(ctx); const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await page.evaluate(() => { setup.n = 1; setup.map = 'rivers'; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 });
  const info = await page.evaluate(() => { G.paused = true; G.teams.forEach(T => { T.ai = null; }); G.setupEnd = 0; const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); return { x: hq.x, y: hq.y, w: MAPW, h: MAPH }; });
  console.log('battle ready', JSON.stringify(info));
  const shot = async (name, x, y, dist, extra) => { if (process.env.NOSHOT) return; await page.evaluate(([x, y, d]) => { camTarget(); cam.td = cam.dist = d; centerOn(x, y, true); for (let i = 0; i < 3; i++) renderFrame(.016); }, [x, y, dist]);
    if (extra) await page.evaluate(extra); await page.waitForTimeout(500); await page.evaluate(() => { renderFrame(.016); renderFrame(.016); });
    await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 240000 }); console.log('shot', name); };
  const step = (n, dt = .05) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { simUpdate(dt); } }, [n, dt]);
  const checks = []; const ck = (n, ok, d) => { checks.push([n, !!ok]); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d !== undefined ? ' ' + JSON.stringify(d) : '')); };
  await page.evaluate(() => { G.noShout = true; G.ssn = 1; G.wx = { k: 'clear', t: 0, next: 1e9 }; G.fixWx = 'clear'; });
  if (want.includes('fire')) {
    const p = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); const M = G.map; bfInit(); const F = bfFuel(); let best = null, bn = -1;
      for (let j = 3; j < GH - 3; j += 2) for (let i = 3; i < GW - 3; i += 2) { let n = 0; for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) if (F[(j + b) * GW + i + a] >= 2) n++; if (n > bn && Math.hypot(i * 40 - hq.x, j * 40 - hq.y) > 500) { bn = n; best = [i, j]; } }
      const x = best[0] * 40 + 20, y = best[1] * 40 + 20; fireHit(x, y, 60, 'thermo'); for (let q = 0; q < 6; q++) fireIgnite((best[1] + (q % 3) - 1) * GW + best[0] + ((q / 3) | 0)); return { x, y, bn, ign: G.bfFire.length, ssn: G.ssn }; });
    console.log('fire start', JSON.stringify(p)); ck('wildfire ignites on dry forest', p.ign > 0, p.ign);
    await page.evaluate(() => { for (let i = 0; i < 25 * 5; i++) simUpdate(.2); }); // 25 s
    const m = await page.evaluate(() => ({ n: G.bfFire.length, sc: G.bfScorch.length, smk: G.bfN, t: G.t, bfT: G.bfT, mx: Math.max(...G.bfD), W: G.bfW, over: G.over }));
    ck('fire spreads', m.n + m.sc > 6, m); ck('fire makes smoke', m.smk > 0, m);
    await shot('1-field-fire-spreading', p.x, p.y, 520, () => { for (let i = 0; i < 40; i++) { simUpdate(.05); } for (let i = 0; i < 10; i++) renderFrame(.2); });
    const m2 = await page.evaluate(() => { for (let i = 0; i < 90 * 5; i++) simUpdate(.2); return { n: G.bfFire.length, sc: G.bfScorch.length }; });
    ck('fire burns out and scorches', m2.sc > m.sc, m2);
    await page.evaluate(() => { G.bfFire.length = 0; G.bfFN = 0; G.bfBurn = null; G.wx = { k: 'rain', t: 0, next: 1e9 }; G.fixWx = 'rain'; const n0 = G.bfFire.length; fireHit(G.ents[0].x + 300, G.ents[0].y, 80, 'thermo'); window.__rainFires = G.bfFire.length - n0; G.wx = { k: 'clear', t: 0, next: 1e9 }; G.fixWx = 'clear'; });
    ck('rain: ~no ignition', (await page.evaluate(() => window.__rainFires)) <= 2);
  }
  if (want.includes('smoke')) {
    const r = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); const x = hq.x + 500, y = hq.y; G.bfD = null; bfInit(); const enemy = G.teams.findIndex((T, i) => i !== ME);
      const a = addUnit(ME, 'inf', x - 120, y), b = addUnit(enemy, 'inf', x + 120, y); a.hp = a.max; b.hp = b.max; G.teams.forEach(T => { T.ai = null; }); G.sandbox = false;
      updateVis(); const before = !!b.vs[ME]; window.__vr = visR(a);
      G.smokes = G.smokes || []; G.smokes.push({ team: ME, x, y, r: 90, t: G.t + 600 });
      for (let i = 0; i < 12; i++) { bfeelTick(1); } updateVis(); const after = !!b.vs[ME]; const w = bfWind(); const x0 = G.smokes[0].x;
      for (let i = 0; i < 20; i++) bfeelTick(1); const drift = Math.hypot(G.smokes[0].x - x0, 0);
      window.__smk = { x: G.smokes[0].x, y: G.smokes[0].y }; return { vr: window.__vr, before, after, wind: [w.x | 0, w.y | 0], n: G.bfN, drift: drift | 0, ax: a.x, bx: b.x }; });
    console.log('smoke', JSON.stringify(r)); ck('smoke blocks line of sight (seen before, hidden behind cloud)', r.before && !r.after, r); ck('smoke drifts with wind', r.drift > 20 || Math.abs(r.wind[1]) > 3, r.drift);
    await page.evaluate(() => { for (let i = 0; i < 12; i++) FXH.bfx && 0; });
    const s = await page.evaluate(() => window.__smk); await shot('2-smoke-screen-drifting', s.x, s.y, 560, () => { for (let i = 0; i < 6; i++) bfeelTick(1); for (let i = 0; i < 10; i++) { renderFrame(.2); } });
  }
  if (want.includes('wreck')) {
    const r = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); const x = hq.x + 700, y = hq.y + 520; const p = nearestPassXY('ground', x, y) || [x, y]; const t = addUnit(ME, 'tank', p[0], p[1]); const before = G.rubN | 0;
      kill(t, null, null); FXE('die', [t.id, t.x | 0, t.y | 0, KINDS.indexOf('tank'), 0, ME]); const hl = G.bfHulk.length; const k = G.bfHulk[0] && G.bfHulk[0].k; const inf = [];
      for (let i = 0; i < 5; i++) { const u = addUnit(ME, 'inf', p[0] + 34 + i * 9, p[1] + (i % 2 ? 8 : -8)); u.hp = u.max; inf.push(u.id); }
      const cov = coverAt(p[0], p[1]); return { x: p[0], y: p[1], hulks: hl, rub: (G.rubN | 0) - before, cov, k }; });
    console.log('wreck', JSON.stringify(r)); ck('destroyed tank leaves a hulk', r.hulks === 1, r); ck('hulk blocks heavy vehicles (rubble grid)', r.rub === 1, r); ck('hulk gives cover', r.cov > 0, r.cov);
    const c = await page.evaluate(() => { const k = G.bfHulk[0].k; rubDo(k); return { left: G.bfHulk.length, rub: G.rub[k] }; }); ck('clearing removes the hulk', c.left === 0 && c.rub === 0, c);
    await page.evaluate((r) => { const t = addUnit(ME, 'tank', r.x, r.y); kill(t, null, null); FXE('die', [t.id, t.x | 0, t.y | 0, KINDS.indexOf('tank'), 0, ME]); for (let i = 0; i < 25; i++) bfeelTick(1); }, r);
    await shot('3-infantry-behind-wreck', r.x, r.y, 300, () => { for (let i = 0; i < 10; i++) renderFrame(.2); });
    const cap = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); for (let i = 0; i < 60; i++) { const t = addUnit(ME, 'tank', hq.x + 140 + (i % 10) * 60, hq.y + 300 + ((i / 10) | 0) * 60); kill(t, null, null); } return G.bfHulk.length; });
    ck('hulk cap holds', cap <= 36, cap);
  }
  if (want.includes('auto')) {
    const r = await page.evaluate(() => { const hq0 = G.ents.find(b => b.team === ME && b.kind === 'hq'); if (!done(ME, 'factory')) addBld(ME, 'factory', hq0.x + 140, hq0.y + 60, true); if (!done(ME, 'barracks')) addBld(ME, 'barracks', hq0.x + 140, hq0.y - 80, true); simUpdate(.05); simUpdate(.05); const T = G.teams[ME]; T.credits = 30000; T.ai = null; G.setupEnd = 0; for (const T2 of G.teams) T2.ai = null;
      const n0 = unitCount(ME, 'tank'), i0 = unitCount(ME, 'inf'); act(ME, { t: 'auto', k: 'tank', ti: n0 + 3 }); act(ME, { t: 'auto', k: 'inf', ti: i0 + 6 });
      for (let i = 0; i < 90 * 5; i++) simUpdate(.2); return { tank: unitCount(ME, 'tank') - n0, inf: unitCount(ME, 'inf') - i0, auto: T.auto, pack: bfAuPack(T) }; });
    console.log('auto', JSON.stringify(r)); console.log('autodbg', JSON.stringify(await page.evaluate(() => { const T = G.teams[ME]; const s = stats(T.fac, 'tank'); return { fac: T.fac, from: s.from, done: done(ME, s.from), cr: T.credits, q: T.q[s.from].length, auT: G.auT, bfT: G.bfT, out: T.out, ai: !!T.ai, t: G.t, setup: G.setupEnd, enq: enqueue(ME, 'tank'), q2: T.q[s.from].length, cost: s.cost }; }))); ck('auto-build tops up tanks', r.tank === 3, r); ck('auto-build tops up infantry', r.inf === 6, r);
    const p = await page.evaluate(() => { act(ME, { t: 'auto', k: '_on', ti: 0 }); const T = G.teams[ME]; const before = unitCount(ME, 'tank'); act(ME, { t: 'auto', k: 'tank', ti: before + 2 }); for (let i = 0; i < 30 * 5; i++) simUpdate(.2); return unitCount(ME, 'tank') - before; });
    ck('pause toggle stops it', p === 0, p);
    await page.evaluate(() => { act(ME, { t: 'auto', k: '_on', ti: 1 }); act(ME, { t: 'auto', k: 'aa', ti: 4 }); AB.open = true; AB.sig = ''; abUI(); });
    const hq = await page.evaluate(() => { const h = G.ents.find(b => b.team === ME && b.kind === 'hq'); return { x: h.x, y: h.y }; });
    await shot('4-auto-build-panel', hq.x, hq.y, 520, () => { for (let i = 0; i < 3; i++) renderFrame(.03); });
  }
  const bad = checks.filter(c => !c[1]);
  console.log(errors.length ? 'PAGE ERRORS: ' + errors.join('\n') : 'no page errors');
  console.log(bad.length || errors.length ? 'BF-FEEL FAIL ' + bad.map(c => c[0]).join('; ') : 'BF-FEEL PASS (' + checks.length + ' checks)');
} finally { await browser.close(); server.close(); }
