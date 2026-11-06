// Battlefield screenshots: trench network, building damage + collapse + rubble, dam breach + flood, medic reviving. Writes orch/shots/battlefield/*.png
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const OUT = path.join(ROOT, 'orch', 'shots', 'battlefield'); fs.mkdirSync(OUT, { recursive: true });
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
const want = (process.env.SHOTS || 'trench,damage,rubble,flood,medic').split(','); const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 840 } }); await guardContext(ctx); const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await page.evaluate(() => { setup.n = 1; setup.map = 'rivers'; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 });
  const info = await page.evaluate(() => { G.paused = true; G.teams.forEach(T => { T.ai = null; }); G.setupEnd = 0; const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); return { x: hq.x, y: hq.y, w: MAPW, h: MAPH }; });
  console.log('battle ready', JSON.stringify(info));
  const shot = async (name, x, y, dist, extra) => { await page.evaluate(([x, y, d]) => { camTarget(); cam.td = cam.dist = d; centerOn(x, y, true); for (let i = 0; i < 3; i++) renderFrame(.016); }, [x, y, dist]);
    if (extra) await page.evaluate(extra); await page.waitForTimeout(500); await page.evaluate(() => { renderFrame(.016); renderFrame(.016); });
    await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 240000 }); console.log('shot', name); };
  const step = (n, dt = .05) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { simUpdate(dt); } }, [n, dt]);
  if (want.includes('trench')) {
    const p = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); const x = hq.x + 380, y = hq.y - 40; G.dug = []; dugInit(); G.teams[ME].credits = 9999;
      const mk = (k, x, y, a) => dugAdd(ME, k, x, y, a);
      for (let i = 0; i < 7; i++) mk('trench', x + i * 30, y, 0); for (let i = 1; i < 5; i++) mk('trench', x + 90, y + i * 30, 1.5708); for (let i = 1; i < 5; i++) mk('trench', x + 90, y - i * 30, 1.5708);
      for (let i = 0; i < 5; i++) mk('trench', x + 180 + i * 30, y + 120, 0); for (let i = 0; i < 4; i++) mk('sand', x - 50 + i * 25, y - 140, 0); mk('fox', x + 20, y - 40, 0); mk('fox', x + 150, y + 60, 0); mk('fox', x + 210, y - 50, 0);
      for (let i = 0; i < 8; i++) { const u = addUnit(ME, 'inf', x + 30 + i * 22, y + (i % 2 ? 3 : -3)); u.hp = u.max; }
      return { x: x + 90, y }; });
    await shot('trench-network', p.x, p.y, 380);
  }
  if (want.includes('damage') || want.includes('rubble')) {
    const c = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); let best = null, bd = 1e9; for (const c of G.civ) { if (c.ruin || c.dead) continue; const d = Math.hypot(c.x - hq.x, c.y - hq.y); if (d < bd && d > 420) { bd = d; best = c; } }
      const cs = G.civ.filter(q => !q.ruin && !q.dead && Math.hypot(q.x - best.x, q.y - best.y) < 160).slice(0, 4); window.__cs = cs.map(q => q.i); cs[0].hp = cs[0].max * .55; civStage(cs[0]); if (cs[1]) { cs[1].hp = cs[1].max * .25; civStage(cs[1]); }
      for (let i = 0; i < 6; i++) { const u = addUnit(ME, 'inf', best.x + 40 + i * 9, best.y + 60); } return { x: best.x, y: best.y }; });
    if (want.includes('damage')) { await page.evaluate(() => { for (let i = 0; i < 40; i++) bfFxTick(.1); }); await shot('building-damage', c.x, c.y, 330, () => { for (let i = 0; i < 30; i++) { bfFxTick(.1); } }); }
    if (want.includes('rubble')) {
      await page.evaluate(() => { const cs = window.__cs.map(i => G.civ[i]); for (const c of cs) { if (!c.dead) collapseCiv(c, 1); } });
      await shot('building-collapse-dust', c.x, c.y, 300);
      await step(200); await shot('rubble-piles', c.x, c.y, 300, () => { G.civDirty = true; renderFrame(.016); buildCity(); renderFrame(.016); });
    }
  }
  if (want.includes('medic')) {
    const p = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); const x = hq.x + 300, y = hq.y + 200; G.ents.filter(e => e.team !== ME && !e.isB).forEach(e => { e.x = 1e4; });
      wndInit(); for (let i = 0; i < 5; i++) { G.wnd.push({ id: G.wndId++, x: x + i * 26, y: y + (i % 2) * 14, team: ME, kind: 'inf', rank: 1, xp: 5, t0: G.t, until: G.t + (i === 4 ? 6 : 28), p: 0, dr: 0, md: 0 }); } wndBump();
      const m = addUnit(ME, 'medic', x + 26 + 14, y + 5); m.mv = G.t; const a = addUnit(ME, 'inf', x + 70, y + 30); for (let i = 0; i < 4; i++) addUnit(ME, 'inf', x + 100 + i * 12, y - 20); return { x: x + 40, y }; });
    await page.evaluate(() => { G.teams[ME].color; }); await step(30, .05);
    await shot('medic-reviving', p.x, p.y, 240, () => { for (let i = 0; i < 4; i++) bfFxTick(.1); });
  }
  if (want.includes('flood')) {
    const d = await page.evaluate(() => { const d = G.dams[0]; const tg = []; let n = 0; for (const [k, c] of d.fc) { if (c[0] > 300 && c[0] < 700 && c[1] < -20 && n < 14) { tg.push([(k % GW) * CELL + 20, ((k / GW) | 0) * CELL + 20]); n++; } }
      for (const [x, y] of tg) { addUnit(1 - ME >= 0 ? 1 : 0, 'inf', x, y); addUnit(1, 'tank', x + 30, y + 30); }
      return { x: d.x, y: d.y, dir: d.dir, tx: d.tx, ty: d.ty }; });
    await shot('dam-before', d.x - d.dir * d.tx * 160, d.y - d.dir * d.ty * 160, 420);
    await page.evaluate(() => { const d = G.dams[0]; applyDmg(d.tg, 9999, 'cannon', ME, null, false); }); await step(40, .05);
    await shot('dam-breach', d.x, d.y, 380, () => { for (let i = 0; i < 6; i++) bfFxTick(.1); });
    await step(500, .05);
    await shot('flood-wave', d.x + d.dir * d.tx * 520, d.y + d.dir * d.ty * 520, 700, () => { bfFxTick(.3); });
  }
  console.log(errors.length ? 'PAGE ERRORS: ' + errors.join('\n') : 'no page errors');
} finally { await browser.close(); server.close(); }
