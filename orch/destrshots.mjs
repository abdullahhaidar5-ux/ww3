// Battlefield screenshots: trench network, building damage + collapse + rubble, dam breach + flood, medic reviving. Writes orch/shots/battlefield/*.png
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const OUT = path.join(ROOT, 'orch', 'shots'); fs.mkdirSync(OUT, { recursive: true });
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
const errors = [];
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
    await page.screenshot({ type: 'jpeg', quality: 82, path: path.join(OUT, 'destruction-' + name + '.jpg'), timeout: 240000 }); console.log('shot', name); };
  const step = (n, dt = .05) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { simUpdate(dt); } }, [n, dt]);
  const base = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); const bs = G.ents.filter(b => b.isB && b.team === ME && b.kind !== 'hq' && b.built >= 1 && b.size >= 40).sort((a, b) => Math.hypot(a.x - hq.x, a.y - hq.y) - Math.hypot(b.x - hq.x, b.y - hq.y)); const b = bs[0] || hq; window.__b = b.id; return { x: b.x, y: b.y, kind: b.kind }; });
  console.log('base', JSON.stringify(base));
  const sethp = f => page.evaluate(f0 => { const b = G.byId.get(window.__b); b.hp = b.max * f0; }, f);
  const base0 = async (n, f) => { await sethp(f); await shot(n, base.x, base.y, 260, () => { for (let i = 0; i < 40; i++) { simUpdate(.05); renderFrame(.05); } }); };
  await base0('base-1-light', .55); await base0('base-2-heavy', .25);
  await page.evaluate(() => { const b = G.byId.get(window.__b); kill(b, 1 - ME); });
  await shot('base-3a-collapsing', base.x, base.y, 260, () => { for (let i = 0; i < 14; i++) { simUpdate(.05); renderFrame(.05); } });
  await shot('base-3b-rubble', base.x, base.y, 260, () => { for (let i = 0; i < 60; i++) { simUpdate(.05); renderFrame(.05); } });
  console.log('ruin', JSON.stringify(await page.evaluate(() => ({ hulks: G.bfHulk.filter(h => h.b).length, rubN: G.rubN }))));
  const nb = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); let best = null, bd = 1e9; for (const c of G.civ) { if (c.ruin || c.dead) continue; const d = Math.hypot(c.x - hq.x - 500, c.y - hq.y); if (d < bd) { bd = d; best = c; } } window.__c = best.i; return { x: best.x, y: best.y }; });
  const cst = async (n, f) => { await page.evaluate(f0 => { const c = G.civ[window.__c]; c.hp = c.max * f0; civStage(c); }, f); await shot(n, nb.x, nb.y, 260, () => { for (let i = 0; i < 40; i++) { simUpdate(.05); renderFrame(.05); } }); };
  await cst('neutral-1-light', .6); await cst('neutral-2-heavy', .25);
  await page.evaluate(() => { collapseCiv(G.civ[window.__c], 1 - ME); });
  await shot('neutral-3-rubble', nb.x, nb.y, 260, () => { for (let i = 0; i < 40; i++) { simUpdate(.05); renderFrame(.05); } });
  const tk = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); const u = addUnit(ME, 'tank', hq.x + 200, hq.y + 150); window.__t = u.id; return { x: u.x, y: u.y }; });
  const th = async (n, f) => { await page.evaluate(f0 => { const u = G.byId.get(window.__t); u.hp = u.max * f0; }, f); await shot(n, tk.x, tk.y, 160, () => { for (let i = 0; i < 30; i++) { simUpdate(.05); renderFrame(.05); } }); };
  await th('tank-1-heavy', .45); await th('tank-2-critical', .15);
  await page.evaluate(() => { kill(G.byId.get(window.__t), 1 - ME); });
  await shot('tank-3-wreck', tk.x, tk.y, 160, () => { for (let i = 0; i < 40; i++) { simUpdate(.05); renderFrame(.05); } });
} finally { console.log('errors', JSON.stringify(errors.slice(0, 5))); await browser.close(); server.close(); }
