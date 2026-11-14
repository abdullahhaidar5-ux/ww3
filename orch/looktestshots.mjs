// Looktest pictures: ONE Conquest battle moment (Iran vs Israel, tanks + infantry + smoke + a burning building) rendered in looks A/B/C
// by switching LOOKK at run time, so all three pictures are the exact same frame. Also checks ?look=c in the URL.
//   node orch/looktestshots.mjs  -> orch/concepts/looktest/{a,b,c,a-wide,b-wide,c-wide}.png (convert to JPG with orch/looktestjpg.py)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'concepts', 'looktest');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock('looktest'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await (exe ? pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }) : pw.chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 }); const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto(ORIGIN + '/index.html?lazy=1&look=c', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 90000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
console.log('URL look param ->', await page.evaluate(() => LOOKK));
const MAP = process.env.MAP || 'rivers';
await page.evaluate((m) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.p = 'IR'; setup.a = 'IL'; setup.map = m; startSingle(); }, MAP);
await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 900000, polling: 500 });
const info = await page.evaluate(() => {
  G.teams.forEach(T => { T.ai = null; }); G.setupEnd = 0;
  const e = G.teams.findIndex((T, i) => i !== ME && !T.reb); const h0 = G.ents.find(b => b.team === ME && b.kind === 'hq'), h1 = G.ents.find(b => b.team === e && b.kind === 'hq');
  const mx = (h0.x + h1.x) / 2, my = (h0.y + h1.y) / 2, dx = h1.x - h0.x, dy = h1.y - h0.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const at = (a, b) => [mx + ux * a + px * b, my + uy * a + py * b];
  G.teams[ME].credits = G.teams[e].credits = 9999;
  for (let i = 0; i < 6; i++) { const [x, y] = at(-150, (i - 2.5) * 34); addUnit(ME, 'tank', x, y); }
  for (let i = 0; i < 14; i++) { const [x, y] = at(-200 - (i % 2) * 20, (i - 6.5) * 18); addUnit(ME, 'inf', x, y); }
  for (let i = 0; i < 3; i++) { const [x, y] = at(-260, (i - 1) * 50); addUnit(ME, 'arty', x, y); }
  for (let i = 0; i < 5; i++) { const [x, y] = at(150, (i - 2) * 36); addUnit(e, 'tank', x, y); }
  for (let i = 0; i < 14; i++) { const [x, y] = at(200 + (i % 2) * 20, (i - 6.5) * 18); addUnit(e, 'inf', x, y); }
  const bs = []; for (const [k, a, b] of [['barracks', 250, -90], ['factory', 270, 80], ['barracks', 215, 150]]) { const [x, y] = at(a, b); try { bs.push(addBld(e, k, x, y, true)); } catch (er) {} }
  return { mx, my, n: G.ents.length, e, bs: bs.length };
});
console.log('staged', JSON.stringify(info));
await page.evaluate(() => { G.paused = false; for (let i = 0; i < 300; i++) simUpdate(1 / 30); });
// make sure at least one building burns
await page.evaluate((e) => { let n = 0; for (const b of G.ents) if (b.isB && b.team === e && !b.dead && n < 2 && b.kind !== 'hq') { b.hp = Math.min(b.hp, b.max * .22); n++; } for (let i = 0; i < 60; i++) simUpdate(1 / 30); }, info.e);
const pos = await page.evaluate(() => { const L = G.ents.filter(u => !u.isB && !u.dead); let x = 0, y = 0; for (const u of L) { x += u.x; y += u.y; } return { x: x / L.length, y: y / L.length, n: L.length }; });
console.log('fight centre', JSON.stringify(pos));
const look = async (k, name, dist) => { await page.evaluate(([k, x, y, d]) => { LOOKK = k; applyWeather(0); camTarget(); cam.td = cam.dist = d; centerOn(x, y, true); for (let i = 0; i < 4; i++) renderFrame(.016); }, [k, pos.x, pos.y, dist]);
  await page.waitForTimeout(400); await page.evaluate(() => { renderFrame(.016); renderFrame(.016); }); await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 240000 }); console.log('shot', name); };
const D1 = +process.env.D1 || 300, D2 = +process.env.D2 || 760;
for (const k of ['a', 'b', 'c']) { await look(k, k, D1); await look(k, k + '-wide', D2); }
await ctx.close(); await browser.close(); server.close(); process.exit(0);
