// Logistics screenshots (orch/logistics3): convoy ambush, front line + minimap, blown bridge, pontoon, checkpoint/mines, blockade, airlift.
//   node orch/logishots.mjs   -> orch/shots/logistics/*.png
// (template: conquestshots2) Screenshots of the command bar in a live skirmish at phone portrait (390x844), phone landscape (844x390, both with
// mobile/touch emulation) and desktop (1366x768) sizes, with the Construction Vehicle selected so the Build tab shows
// its full grid. Prints, per size, where each command button sits and any text in the bar that is cut off without an
// ellipsis. Screenshots: orch/out/bar-portrait.png, bar-landscape.png, bar-desktop.png.
//   node orch/barshots.mjs [--tag -x] [--names]   (SIZES=p,l,d,w to pick sizes, w = 1920x1080; OUT=dir for the screenshots; --names: list every faction's command-button
//   names that don't fit, and buttons under 40 px, on every tab -> BARNAMES PASS / FAIL)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'orch', 'out');
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : '';
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of [ '/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
await acquireBrowserLock('logishots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const sizes = (process.env.SIZES || 'p,l,d').split(',');
const cfg = { p: { name: 'portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  l: { name: 'landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  d: { name: 'desktop', viewport: { width: 1366, height: 768 } },
  w: { name: 'desktop1920', viewport: { width: 1920, height: 1080 } } };
const SH = path.join(ROOT, 'orch', 'shots', 'logistics'); fs.mkdirSync(SH, { recursive: true });
const MAP = process.env.MAP || 'fulda';

async function run(MAP, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate((m) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; try { setup.map = m; } catch (e) {} startSingle(); }, MAP);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
  const hide = () => page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });
  const shot = async (name) => { await page.evaluate(() => { try { lgGfx(); } catch (e) {} }); await hide(); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(SH, `${name}.png`), timeout: 300000 }); console.log('shot', name); };
  await page.evaluate(() => { for (const T of G.teams) if (T.ai) T.ai = null; G.setupEnd = 0; G.teams[ME].credits = 20000; LGU.on = true; lgBtnSync(); });
  await fn(page, shot);
  await ctx.close();
}
const sim = (page, f, a) => page.evaluate(f, a);
await run(MAP, async (page, shot) => {
  // own the towns nearest each base, so there is a front line and a road network
  await sim(page, () => { for (const k of [0, 1]) { const B = BASES[k]; const ts = [...G.towns].sort((a, b) => Math.hypot(a.x - B[0], a.y - B[1]) - Math.hypot(b.x - B[0], b.y - B[1])); for (const t of ts.slice(0, 3)) for (const c of t.cells) if (c.key) c.ow = k; } G.civDirty = true; for (let i = 0; i < 90; i++) simUpdate(1 / 15); });
  // 1 front line + minimap
  await sim(page, () => { const T = terrUpdate(true); const g = T.seg[(T.seg.length / 2) | 0]; if (g) centerOn((g[0] + g[2]) / 2, (g[1] + g[3]) / 2, true); simUpdate(.1); updateUI(); });
  await shot('1-front-line-minimap');
  // 2 convoy ambush
  await sim(page, () => { const t = G.towns.find(q => q.ow === ME && !q.cut); const r = lgRoute(ME, ME, G.lg.tn[t.i]); if (!r) return; const p = r.pts[Math.min(r.pts.length - 1, (r.pts.length * .45) | 0)];
    const u = addUnit(ME, 'harv', p[0], p[1]); u.cv = { ti: t.i, dp: 0, pts: r.pts.slice((r.pts.length * .45) | 0), i: 1, ret: 0, esc: 0, w: 0, k: 0 }; G.lgd.cvl = (G.lgd.cvl || []).concat([u.id]);
    const en = G.teams.find(T => !T.reb && T.id !== ME).id; for (let i = 0; i < 4; i++) { const q = nearestPassXY('ground', p[0] + 160 + i * 18, p[1] + 90 - i * 30); if (q) { const e = addUnit(en, i < 2 ? 'inf' : 'at', q[0], q[1]); e.target = u; } }
    centerOn(p[0] + 60, p[1] + 40, true); for (let i = 0; i < 40; i++) simUpdate(1 / 30); updateUI(); });
  await shot('2-convoy-ambush');
  // 3 checkpoint + mine on a road, Construction Vehicle selected (command bar shows the logistics buttons)
  await sim(page, () => { const e = G.lg.E.find(e => { const n = G.lg.N[e.a]; return n.t >= 0 && G.towns[n.t].ow === ME; }) || G.lg.E[0]; const p = lgPoint(e, e.len * .3), q = lgProj(e, p[0], p[1]);
    const nx = -Math.sin(q.a), ny = Math.cos(q.a); const dg = []; for (const off of [-58, -34, 34, 58]) { const d = dugAdd(ME, 'sand', p[0] + nx * off, p[1] + ny * off, q.a); if (d) dg.push(d.id); }
    G.lgd.ck.push({ id: G.lgd.id++, team: ME, x: Math.round(p[0]), y: Math.round(p[1]), ei: G.lg.E.indexOf(e), dg }); const m = lgPoint(e, e.len * .3 + 120); G.lgd.mn.push({ id: G.lgd.id++, team: ME, x: Math.round(m[0]), y: Math.round(m[1]) });
    const z = nearestPassXY('ground', p[0] - 70, p[1] - 50); const dz = addUnit(ME, 'dozer', z[0], z[1]); G.sel = [dz]; centerOn(p[0], p[1], true); for (let i = 0; i < 20; i++) simUpdate(1 / 30); updateUI(); });
  await shot('3-checkpoint-mine-dozer-bar');
  // 4 bridge charges, then blown bridge
  await sim(page, () => { G.sel = []; const b = G.map.bridges[1] || G.map.bridges[0]; const i = G.map.bridges.indexOf(b); G.lgd.bd[i] = { hp: 2400, ch: { team: ME, t: G.t + 21, x: Math.round(b.a[0]), y: Math.round(b.a[1]), df: 0 } }; centerOn(b.x, b.y, true); simUpdate(.1); updateUI(); });
  await shot('4-bridge-charges');
  await sim(page, () => { const b = G.map.bridges[1] || G.map.bridges[0]; lgBridgeDown(G.map.bridges.indexOf(b), ME); for (let i = 0; i < 30; i++) simUpdate(1 / 30); });
  await shot('5-bridge-blown');
  // 6 pontoon bridge
  await sim(page, () => { const rv = G.map.rivers[0]; let sp = null; for (let f = .3; f < .98 && !sp; f += .01) { const target = f * rv.len; let k = 0; const P = rv.pts; while (k < P.length - 2 && rv.acc[k + 1] < target) k++; const x = (P[k][0] + P[k + 1][0]) / 2, y = (P[k][1] + P[k + 1][1]) / 2; if (x < 200 || y < 200 || x > MAPW - 200 || y > MAPH - 200) continue; const p = lgPontPlan(x, y); if (p) sp = p; }
    if (!sp) return; G.lgd.pt.push({ x: sp.x, y: sp.y, h: sp.h, nx: sp.n[0], ny: sp.n[1], team: ME }); lgPontSync(); G.lgd.bd[G.map.bridges.length - 1] = { hp: 800 }; G.lgd.bv++; lgSync();
    const b = G.map.bridges[G.map.bridges.length - 1]; for (let i = 0; i < 5; i++) { const q = nearestPassXY('ground', b.a[0] - b.n[0] * (30 + i * 25), b.a[1] - b.n[1] * (30 + i * 25)); const u = addUnit(ME, i < 2 ? 'tank' : 'inf', q[0], q[1]); setMove(u, b.b[0] + b.n[0] * 80, b.b[1] + b.n[1] * 80, 'move'); }
    centerOn(b.x, b.y, true); for (let i = 0; i < 120; i++) simUpdate(1 / 30); updateUI(); });
  await shot('6-pontoon-bridge');
  // 7 airlift to a town
  await sim(page, () => { const t = G.towns.filter(q => q.ow === ME).sort((a, b) => Math.hypot(b.x - BASES[ME][0], b.y - BASES[ME][1]) - Math.hypot(a.x - BASES[ME][0], a.y - BASES[ME][1]))[0]; const h = addUnit(ME, 'airlift', t.x - 420, t.y - 160); doAct({ t: 'lg', k: 'alift', ids: [h.id], ti: t.i, tid: 0 }); for (let i = 0; i < 60; i++) simUpdate(1 / 30); centerOn(h.x + 80, h.y + 40, true); G.sel = [h]; updateUI(); });
  await shot('7-airlift');
});
await run(process.env.NMAP || 'hormuz', async (page, shot) => {
  await sim(page, () => { const en = G.teams.find(T => !T.reb && T.id !== ME).id; const h = G.ents.find(e => e.team === ME && e.kind === 'hq'); let best = null, bd = 1e9; for (let cy = 0; cy < GH; cy += 2) for (let cx = 0; cx < GW; cx += 2) { const x = cx * CELL + CELL / 2, y = cy * CELL + CELL / 2; if (G.grid[cy * GW + cx] !== 0) continue; let shore = false; for (const [dx, dy] of [[60, 0], [-60, 0], [0, 60], [0, -60]]) if (G.grid[Math.floor((y + dy) / CELL) * GW + Math.floor((x + dx) / CELL)] === 1) shore = true; if (!shore) continue; const d = Math.hypot(x - h.x, y - h.y); if (d < bd) { bd = d; best = [x, y]; } }
    const sy = addBld(ME, 'shipyard', best[0], best[1], true); sy.built = 1; const w = G.map.deeper(best[0], best[1], 300); for (let i = 0; i < 3; i++) { const s = addUnit(en, i ? 'boat' : 'ship', w[0] + i * 50, w[1] + i * 30); s.order = null; }
    for (let i = 0; i < 30; i++) simUpdate(1 / 15); centerOn((best[0] + w[0]) / 2, (best[1] + w[1]) / 2, true); updateUI(); });
  await page.waitForTimeout(8000);
  await shot('8-port-blockade');
});
await browser.close(); server.close(); process.exit(0);
