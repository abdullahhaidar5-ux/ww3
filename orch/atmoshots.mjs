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
await acquireBrowserLock('conquestshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const SH = path.join(ROOT, 'orch', 'shots', 'atmosphere'); fs.mkdirSync(SH, { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONERR', m.text().slice(0, 200)); });
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.w = 5; setup.map = 'fulda'; startSingle(); });
await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });
// a battle: put some enemy + own units together in the middle of own territory
await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); centerOn(hq.x + 60, hq.y + 60, true); G.sel = []; for (const T of G.teams) if (T.ai) T.ai = null; });
const shot = async (name, t) => { await page.evaluate((t) => { if (t != null) G.t = t; simUpdate(.05); applyWeather(0); }, t); await page.waitForTimeout(2500); await page.screenshot({ path: path.join(SH, name + '.png'), timeout: 300000 }); console.log('shot', name); };
const info = await page.evaluate(() => ({ n: G.ents.length, todM: G.todM, d: todDark() }));
console.log(JSON.stringify(info));
await shot('1-day', 10);
await shot('2-dusk', 400);
await shot('3-night', 650);
await page.evaluate(() => visionSet(1)); await shot('4-nightvision', 650);
await page.evaluate(() => visionSet(2)); await shot('5-thermal', 650);
await page.evaluate(() => visionSet(0)); await shot('6-dawn', 940);
await page.evaluate(() => { G.wx = { k: 'sandstorm', t: 0, next: 1e9 }; });
for (let i = 0; i < 30; i++) await page.evaluate(() => { simUpdate(.05); WXV.m = 1; WXV.k = 'sandstorm'; weatherFX(.5); });
await shot('7-sandstorm', 10);
await page.evaluate(() => { G.wx = { k: 'clear', t: 0, next: 1e9 }; WXV.m = 0; WXV.k = 'clear'; cam.dist = 230; placeCam && placeCam(); });
await shot('10-dof-closeup', 10);
console.log(JSON.stringify(await page.evaluate(() => { const P=VISN.pts; const a=P.geometry.attributes; return {vis:P.visible, par:!!P.parent, dr:P.geometry.drawRange.count, p:[a.position.getX(0),a.position.getY(0),a.position.getZ(0)], s:a.size.getX(0), h:a.heat.getX(0), sc:P.material.uniforms.sc.value, cam:[CAM.position.x,CAM.position.y,CAM.position.z]}; })));console.log('vis pts', await page.evaluate(() => VISN.n));
await browser.close(); server.close(); process.exit(0);
