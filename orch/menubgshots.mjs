// Menu background shots -> orch/shots/menubg/: stages a dusk clash (IR vs US) with the battle engine, 1920x1080, HUD hidden.
//   node orch/menubgshots.mjs [--map zagros] [--w 1] [--seed 7] [--cams 6]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MAP = argS('map', 'zagros'), W = +argS('w', 1), SEED = +argS('seed', 7), A = argS('a', 'IR'), B = argS('b', 'US');
const req = createRequire(import.meta.url); let pw; try { pw = await import('playwright'); } catch { for (const p of ['/opt/npm-tools/node_modules/playwright']) try { pw = req(p); } catch {} }
const html = fs.readFileSync(path.join(ROOT, 'index.html'));
const server = http.createServer((q, res) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const O = `http://127.0.0.1:${server.address().port}`;
const exe = (() => { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} })();
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(O) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
await page.goto(O + '/index.html', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
await page.evaluate(([map, w, seed, a, b]) => { window.__stopLoop = true; try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {}
  try { SET.gfx = 'ultra'; applyGfx(); } catch (e) {} try { initAudio(); AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {}
  Object.assign(setup, { map, n: 1, p: a, a: b, others: [], tm: [], slot: -1, seed, w }); startSingle(); }, [MAP, W, SEED, A, B]);
await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
await page.addStyleTag({ content: 'body>*:not(#app):not(script):not(style){display:none!important}#side,#stage>*:not(#cv){display:none!important}' });
const info = await page.evaluate(([a, b]) => {
  for (const T of G.teams) T.ai = null; G.paused = true; for (const e of G.ents) e.vs && (e.vs[0] = true);
  let cx = MAPW / 2, cy = MAPH / 2, out = [], best = -1;
  { const hq = G.ents.find(e => e.team === 0 && e.isB); const dx = MAPW / 2 - hq.x, dy = MAPH / 2 - hq.y, d = Math.hypot(dx, dy); cx = hq.x + dx / d * 650; cy = hq.y + dy / d * 650; }  // dry ground in front of the player's base: the terrain around the start camera is already built
  window.__C = [cx, cy];
  const put = (t, k, x, y, face) => { const u = addUnit(t, k, x, y); if (u) { u.ang = u.va = u.tang = face; } return u; };
  // two columns closing on a front along x: team0 from the west, team1 from the east
  for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) { const y = cy + (r - 3) * 34 + (c % 2) * 9;
    put(0, c < 2 ? 'tank' : 'inf', cx - 150 - c * 38, y, 0); put(1, c < 2 ? 'tank' : 'inf', cx + 150 + c * 38, y, Math.PI); }
  for (let r = 0; r < 4; r++) { put(0, 'at', cx - 120, cy + (r - 1.5) * 50, 0); put(1, 'at', cx + 120, cy + (r - 1.5) * 50, Math.PI); put(0, 'arty', cx - 330, cy + (r - 1.5) * 60, 0); put(1, 'arty', cx + 330, cy + (r - 1.5) * 60, Math.PI); }
  for (const t of [0, 1]) for (const e of G.ents) if (!e.isB && e.team === t && e.s && e.s.dom !== 'air') { try { orderAttackMove ? 0 : 0; } catch (_) {} }
  return { W: MAPW, H: MAPH, n: G.ents.length, a: G.teams.map(T => T.fac) }; }, [A, B]);
console.log(JSON.stringify(info));
// let the armies meet: AI back on (attack-wave behaviour), fast-forward
await page.evaluate(() => { for (const T of G.teams) if (!T.ai) T.ai = mkAI(2); for (const T of G.teams) T.credits = 0; G.paused = false;
  const [cx, cy] = window.__C;
  for (const e of G.ents) if (!e.isB && e.s && e.s.dom !== 'air') { const dir = e.team === 0 ? 1 : -1; try { e.ord = null; e.tx = cx + dir * 220; e.ty = e.y; e.moving = true; } catch (_) {} } });
const step = async n => page.evaluate(n => { for (let i = 0; i < n && G && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1; }, n);
await step(60 * 5);
// air: gunships and jets over the front
await page.evaluate(() => { const [cx, cy] = window.__C; for (let i = 0; i < 3; i++) { const h = addUnit(1, 'heli', cx + 260 + i * 40, cy - 90 + i * 70); const h2 = addUnit(0, 'heli', cx - 300 - i * 40, cy - 60 + i * 80); }
  for (let i = 0; i < 2; i++) addUnit(1, 'jet', cx + 400, cy + (i - .5) * 120); });
await step(60 * 4);
await page.evaluate(() => { const [cx, cy] = window.__C; for (let i = 0; i < 6; i++) try { smkAdd(cx + (i - 3) * 60 + Math.random() * 40, cy + (Math.random() - .5) * 200, 6); } catch (e) {}
  for (const e of G.ents) e.vs && (e.vs[0] = true); });
console.log(JSON.stringify(await page.evaluate(() => ({ n: G.ents.filter(e => !e.isB).length, hp: G.ents.filter(e => !e.isB && e.team === 0).length, h1: G.ents.filter(e => !e.isB && e.team === 1).length }))));
const N = +argS('cams', 6), T0 = Date.now();
const views = [[0, 0, 230, -0.2, 0], [0, 40, 200, -0.16, 0.5], [-40, -30, 260, -0.24, -0.5], [60, 0, 190, -0.14, 0.9], [0, 60, 300, -0.3, 0.2], [-60, 0, 170, -0.12, -0.9]];
for (let i = 0; i < N; i++) { const v = views[i % views.length];
  await page.evaluate(async ([v]) => { const [cx, cy] = window.__C; for (let k = 0; k < 1; k++) { cam.dist = cam.td = v[2]; cam.x = cam.tx = cx + v[0]; cam.y = cam.ty = cy + v[1]; cam.tilt = v[3]; cam.yaw = cam.tyaw = v[4]; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; for (let f = 0; f < 6; f++) renderFrame(1 / 60); } }, [v]);
  await step(40);
  const d = await page.evaluate(() => { for (let f = 0; f < 5; f++) renderFrame(1 / 60); renderFrame(1 / 60); return R3.domElement.toDataURL('image/png'); }); // same task as the draw: the buffer is still there
  fs.writeFileSync(path.join(ROOT, 'orch/shots/menubg', `raw-${MAP}-${SEED}-${i}.png`), Buffer.from(d.split(',')[1], 'base64')); console.log('shot', i, Date.now() - T0); }
await browser.close(); server.close(); process.exit(0);
