// Proof pictures for the "orderfeel" pass (selection rings, order markers, goal line): a selected mixed group (infantry +
// tanks), a move order marker, an attack-move marker, a right-drag line ghost, the Conquest and the Battle goal line.
//   node orch/orderfeelshots.mjs [--tag before|after]   -> orch/concepts/orderfeel/<tag>-*.jpg (1280x720 JPG)
// Also prints ORDERFEEL numbers (ring instances, order markers alive) so a run can be compared without looking.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : 'after';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
await acquireBrowserLock('orderfeelshots');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const want = k => !ONLY || ONLY.includes(k);

async function game(mode) {
  const ctx = await browser.newContext({ viewport: process.env.DBG ? { width: 480, height: 300 } : { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(ORIGIN + '/index.html?lazy=1', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate((m) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} SET.mLock = 0; setup.n = 1; setup.map = 'fulda'; setup.mode = m; startSingle(); }, mode);
  await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.ents && G.ents.length, null, { timeout: 900000, polling: 500 });
  await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; for (const T of G.teams) if (T.ai) T.ai = null; });
  return { ctx, page };
}
const shot = async (page, name, wait = 1500) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(ROOT, 'orch/shots', name + '.jpg'), type: 'jpeg', quality: 82, timeout: 300000 }); console.log('SHOT', name); };
fs.mkdirSync(path.join(ROOT, 'orch/shots'), { recursive: true });
const { page: pg } = await game('battle');
const settle = () => pg.evaluate(() => { try { cam.dist = cam.td; placeCam(); } catch (e) {} });
await settle();
await shot(pg, 'presentation-camera', 4000);
await pg.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); window.__hq = [hq.x, hq.y]; const mk = (k, dx, dy, r) => { const u = addUnit(ME, k, hq.x + dx, hq.y + dy); if (u) { u.rank = r; u.xp = 99; } return u; };
  const a = [mk('tank', 150, 90, 3), mk('tank', 185, 90, 2), mk('tank', 220, 90, 1), mk('inf', 150, 125, 3), mk('inf', 175, 125, 2), mk('inf', 200, 125, 1), mk('inf', 225, 125, 0)].filter(Boolean);
  G.sel = [a[1]]; updateUI(); });
await shot(pg, 'presentation-bar', 3000);
await pg.evaluate(() => { const [x, y] = window.__hq; centerOn(x + 190, y + 105, true); cam.td = 150; cam.dist = 150; placeCam(); });
await shot(pg, 'presentation-veteran', 4000);
await pg.evaluate(() => { const s0 = G.teams[ME].st || (G.teams[ME].st = stNew()), o = G.teams[1 - ME] || G.teams[0]; const s1 = o.st || (o.st = stNew());
  G.t = 912; G.teams[ME].built = 64; G.teams[ME].lost = 21; s0.ku = 88; s0.kb = 6; s0.lb = 2; s0.bb = 14; s0.cb = 3; s0.sp = 21400; G.teams[ME].credits = 5200; s0.c0 = 10000; G.teams[ME].tm = 0; o.built = 71; o.lost = 90; s1.ku = 20; s1.kb = 1; s1.lb = 6; s1.bb = 9; s1.cb = 1; s1.sp = 17900; o.credits = 100; s1.c0 = 10000;
  endGame(ME, 'The last enemy building fell.'); });
await shot(pg, 'presentation-stats', 4000);
await browser.close(); server.close(); process.exit(0);
