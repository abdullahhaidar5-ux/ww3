// Screenshots of the command bar in a live skirmish at phone portrait (390x844), phone landscape (844x390, both with
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
await acquireBrowserLock('politicsshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const sizes = ['d'];
const cfg = { p: { name: 'portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  l: { name: 'landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  d: { name: 'desktop', viewport: { width: 1366, height: 768 } },
  w: { name: 'desktop1920', viewport: { width: 1920, height: 1080 } } };
const SH = path.join(ROOT, 'orch', 'shots', 'politics-intel'); fs.mkdirSync(SH, { recursive: true });
const MAP = process.env.MAP || 'zagros';
for (const s of sizes) {
  const c = cfg[s]; const ctx = await browser.newContext({ viewport: c.viewport, deviceScaleFactor: 1 });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate((m) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; try { setup.map = m; } catch (e) {} startSingle(); }, MAP);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
  const hide = () => page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });
  const shot = async (name) => { await hide(); await page.waitForTimeout(700); await page.screenshot({ path: path.join(SH, name + '.png'), timeout: 300000 }); console.log('shot', name); };
  await hide();
  await page.evaluate(() => { for (const T of G.teams) T.ai = null; });
  const P = await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'), eh = G.ents.find(e => e.team !== ME && e.kind === 'hq');
    const towns = G.towns.slice().sort((a, b) => Math.hypot(a.x - hq.x, a.y - hq.y) - Math.hypot(b.x - hq.x, b.y - hq.y));
    return { hq: [hq.x, hq.y], eh: [eh.x, eh.y], rear: towns[0].i, front: towns[1].i }; });
  // 1: opinion banner after shelling a town + sanctions
  await page.evaluate((r) => { const t = G.towns[r]; for (const k of t.cells) if (k.key) k.ow = ME; simUpdate(.6); t.hold = G.t - 300; t.un = 5; t.fresh = 0; G.teams[ME].reveals.push({ x: t.x, y: t.y, r: 900, t: 600 }); centerOn(t.x, t.y + 60, true); simUpdate(.6); }, P.rear);
  await page.evaluate(() => { G.teams[ME].op = 31; G.teams[ME].opS = 1; updateUI(); townPanelTick(true); });
  await shot('1-opinion-sanctions');
  await page.evaluate(() => { G.teams[ME].op = 88; G.teams[ME].opS = 2; townPanelTick(true); });
  await shot('2-opinion-aid');
  // 2: refugees on the road out of a town under fire
  await page.evaluate((r) => { G.teams[ME].op = 62; const t = G.towns[r]; t.cwT = G.t; t.refT = 0; G.setupEnd = 0; const e = addUnit(1, 'tank', t.x + 380, t.y); for (let i = 0; i < 3; i++) simUpdate(.6); const rf = (G.refs || [])[0]; if (rf) { const p = refPos(rf); G.t += 6; const q = refPos(rf); centerOn((q[0] + t.x) / 2, (q[1] + t.y) / 2, true); } }, P.rear);
  await page.evaluate(() => { G.teams[ME].reveals.push({ x: G.towns[0].x, y: G.towns[0].y, r: 2000, t: 600 }); });
  await shot('3-refugees');
  console.log('refs', await page.evaluate(() => (G.refs || []).length));
  // 3: radio & TV station near our HQ
  await page.evaluate((h) => { const T = G.teams[ME]; T.credits = 9000; const p = aiFindSpot(ME, 'radio', { x: h[0], y: h[1] }); if (p) { placeBld(ME, 'radio', p[0], p[1]); const b = G.ents.find(e => e.kind === 'radio'); if (b) { b.built = 1; G.sel = [b]; centerOn(b.x, b.y, true); } } simUpdate(.6); updateUI(); }, P.hq);
  await shot('4-radio-station');
  // 4: spy selected -> command card
  await page.evaluate((h) => { const u = addUnit(ME, 'spy', h[0] + 90, h[1] + 70); G.sel = [u]; centerOn(u.x, u.y, true); G.teams[ME].credits = 5000; simUpdate(.6); updateUI(); }, P.hq);
  await shot('5-spy-card');
  // 5: decoy tank next to a real one + owner label
  await page.evaluate((h) => { const d = addUnit(ME, 'dtank', h[0] + 160, h[1] + 120); const r = addUnit(ME, 'tank', h[0] + 200, h[1] + 120); G.sel = [d]; centerOn(d.x + 20, d.y, true); simUpdate(.6); updateUI(); }, P.hq);
  await shot('6-decoy-and-real-tank');
  // 6: leaflet button on an enemy town panel
  await page.evaluate((r) => { const t = G.towns[r]; for (const k of t.cells) if (k.key) k.ow = 1; simUpdate(.6); t.un = 20; t.hold = G.t - 100; G.teams[ME].reveals.push({ x: t.x, y: t.y, r: 900, t: 600 }); const b = G.ents.find(e => e.kind === 'radio'); if (b) { b.x = t.x - 300; b.y = t.y; } centerOn(t.x, t.y, true); townOpen(r); }, P.front);
  await shot('7-leaflet-panel');
  // 7: minimap with refugees
  await page.evaluate(() => { townClose(); });
  const mm = await page.evaluate(() => { const r = mm.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.screenshot({ path: path.join(SH, '8-minimap.png'), clip: { x: Math.max(0, mm.x - 6), y: Math.max(0, mm.y - 6), width: mm.w + 12, height: mm.h + 12 } });
  await ctx.close();
}
await browser.close(); server.close(); console.log('POLITICSSHOTS DONE'); process.exit(0);
