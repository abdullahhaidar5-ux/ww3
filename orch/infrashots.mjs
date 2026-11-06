// Screenshots for the infrastructure + militia ship: power plant captured, base in blackout, militia joining. node orch/infrashots.mjs
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
await acquireBrowserLock('infrashots');
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
const SH = path.join(ROOT, 'orch', 'shots', 'infra-militias'); fs.mkdirSync(SH, { recursive: true });
const MAP = process.env.MAP || 'fulda';
{
  const c = cfg.d; const ctx = await browser.newContext({ viewport: c.viewport, deviceScaleFactor: 1 });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate((m) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; try { setup.map = m; } catch (e) {} startSingle(); }, MAP);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
  const hide = () => page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });
  const shot = async (name) => { await hide(); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(SH, `${name}.png`), timeout: 300000 }); console.log('shot', name); };
  await page.evaluate(() => { for (const T of G.teams) if (T.ai) T.ai = null; G.t = Math.max(G.t, 100); G.setupEnd = 0; simUpdate(.2); });
  // 1. the neutral power plant, captured by us
  await page.evaluate(() => { const o = G.oil.find(o => o.pw && o.home < 0) || G.oil.find(o => o.pw); o.owner = ME; centerOn(o.x + 60, o.y + 40, true); simUpdate(.2); updateUI(); });
  await shot('1-power-plant-captured');
  // 2. blackout: our own plant is shot down - SAM / guns go dark, banner shows
  await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); addBld(ME, 'sam', hq.x + 120, hq.y + 60, true); addBld(ME, 'turret', hq.x + 160, hq.y - 50, true); for (const o of G.oil) if (o.pw && ally(o.owner, ME)) destroyOil(o, 1); centerOn(hq.x + 60, hq.y, true); for (let i = 0; i < 40; i++) simUpdate(.1); const s = G.ents.find(e => e.team === ME && e.kind === 'sam'); G.sel = [s]; updateUI(); });
  await shot('2-blackout-base-dark');
  // 3. militia joins: raise the trust of the first militia town and watch them take up arms
  await page.evaluate(() => { const t = G.towns.find(t => t.ml && t.ml.st === 0); const q = t || G.towns[0]; centerOn(q.x, q.y, true); for (let i = 0; i < 10; i++) simUpdate(.1); window.__mt = q.i; updateUI(); });
  await shot('3a-neutral-militia');
  await page.evaluate(() => { const t = G.towns[window.__mt]; if (t.ml) t.ml.aff[ME] = 70; for (let i = 0; i < 30; i++) simUpdate(.1); updateUI(); });
  await shot('3b-militia-joins-us');
  console.log(await page.evaluate(() => JSON.stringify({ log: (G.msgs || []).slice(-4) })));
  await ctx.close();
}
await browser.close(); server.close(); process.exit(0);
