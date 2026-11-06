// Logistics screenshots (orch/economy1): convoy ambush, front line + minimap, blown bridge, pontoon, checkpoint/mines, blockade, airlift.
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
const SH = path.join(ROOT, 'orch', 'shots', 'economy1'); fs.mkdirSync(SH, { recursive: true });
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
  await sim(page, () => { for (const t of G.towns) { const d0 = Math.hypot(t.x - BASES[ME][0], t.y - BASES[ME][1]), d1 = Math.hypot(t.x - BASES[1 - ME][0], t.y - BASES[1 - ME][1]); if (d0 < d1) for (const c of t.cells) if (c.key) c.ow = ME; } G.civDirty = true; for (let i = 0; i < 40 * 30; i++) simUpdate(1 / 30); updateUI(); });
  // 1 trade route + caravans
  await sim(page, () => { const r = G.ec.rt.find(q => q.team === ME); if (!r) { console.log('no route'); return; } const u = G.byId.get(G.ec.cav[0]); const p = u ? [u.x, u.y] : r.pts[(r.pts.length / 2) | 0]; centerOn(p[0], p[1], true); for (let i = 0; i < 30; i++) simUpdate(1 / 30); updateUI(); });
  await shot('1-trade-caravan-route');
  // 2 town panel with food + investment
  await sim(page, () => { const t = G.towns.filter(q => q.ow === ME && !q.ham)[0] || G.towns.filter(q => q.ow === ME)[0]; G.teams[ME].credits = 5000; ecCmd(ME, { ti: t.i, k: 0 }); for (let i = 0; i < 90; i++) simUpdate(1 / 30); centerOn(t.x, t.y, true); townOpen(t.i); updateUI(); });
  await shot('2-town-panel-food-invest');
  // 3 burnt fields (shelled) then a grown town
  await sim(page, () => { const t = G.towns.filter(q => q.ow === ME && !q.ham)[0]; for (const p of ecPlots(t).slice(0, 3)) explode(p[0], p[1], 40, 40, 1, 'boom', 'shell'); for (let i = 0; i < 60; i++) simUpdate(1 / 30); centerOn(t.x + 80, t.y + 80, true); townOpen(t.i); updateUI(); });
  await shot('3-burnt-fields-hungry');
  await sim(page, () => { townClose(); const t = G.towns.filter(q => q.ow === ME && q.ham)[0] || G.towns.filter(q => q.ow === ME)[0]; t.lv = Math.min(2, t.lv0 + 2); G.ec.v++; G.cam && 0; centerOn(t.x, t.y, true); for (let i = 0; i < 10; i++) simUpdate(1 / 30); updateUI(); });
  await shot('4-grown-city');
  // 5 mine / quarry / factory
  await sim(page, () => { const p = G.ec.pts.find(q => q.k === 1) || G.ec.pts[0]; p.ow = ME; G.ec.v++; centerOn(p.x, p.y, true); for (let i = 0; i < 10; i++) simUpdate(1 / 30); updateUI(); });
  await shot('5-mine');
  await sim(page, () => { const p = G.ec.pts.find(q => q.k === 2); p.ow = ME; G.ec.v++; centerOn(p.x, p.y, true); for (let i = 0; i < 10; i++) simUpdate(1 / 30); updateUI(); });
  await shot('6-factory');
});
await browser.close(); server.close(); process.exit(0);
