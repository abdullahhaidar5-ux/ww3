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
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.w = 7; setup.map = 'fulda'; startSingle(); });
await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });

const out = await page.evaluate(() => { for (const T of G.teams) if (!T.ai && T.id !== ME) {} let n = 0; const t0 = performance.now();
  while (G.t < 1500 && !G.over && performance.now() - t0 < 200000) { simUpdate(.2); aarTick(); n++; }
  return { t: G.t, over: G.over, s: AAR.s.length, ev: AAR.ev.length, kinds: AAR.ev.reduce((a, e) => (a[e.k] = (a[e.k] | 0) + 1, a), {}) }; });
console.log(JSON.stringify(out));
await page.evaluate(() => { G.over = false; showEnd(ME, 'test'); });
await page.waitForTimeout(3000);
await page.evaluate(() => { try { skipKillCam && skipKillCam(); } catch (e) {} const b = document.getElementById('aarBox'); if (b) b.scrollIntoView(); });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(SH, '8-after-action-end.png'), timeout: 300000 }); console.log('shot8');
await page.evaluate(() => { document.getElementById('aarSl').value = 20; document.getElementById('aarSl').dispatchEvent(new Event('input')); });
await page.waitForTimeout(500);
const box = await page.$('#aarBox'); if (box) await box.screenshot({ path: path.join(SH, '9-after-action-early.png'), timeout: 300000 });
await page.evaluate(() => { const s = document.getElementById('aarSl'); s.value = Math.floor(s.max / 2); s.dispatchEvent(new Event('input')); });
if (box) await box.screenshot({ path: path.join(SH, '9-after-action-mid.png'), timeout: 300000 });
console.log('done');
await browser.close(); server.close(); process.exit(0);
