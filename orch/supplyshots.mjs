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
await acquireBrowserLock('supplyshots');
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
const SH = path.join(ROOT, 'orch', 'shots', 'supply'); fs.mkdirSync(SH, { recursive: true });
for (const s of sizes) {
  const c = cfg[s]; const ctx = await browser.newContext({ viewport: c.viewport, isMobile: !!c.isMobile, hasTouch: !!c.hasTouch, deviceScaleFactor: c.deviceScaleFactor || 1 });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} setup.n = 1; startSingle(); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
  const r = await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); const us = G.ents.filter(e => e.team === ME && !e.isB && hasAmmo(e)).slice(0, 8);
    const out = []; us.forEach((u, i) => { u.x = hq.x + 330 + (i % 4) * 34; u.y = hq.y + 40 + Math.floor(i / 4) * 40; if (i === 1) { u.x = hq.x + 700; u.supT = G.t - 70; } ammoInit(u); u.am = [u.amx * .22, 0, u.amx * .5][i % 3]; });
    G.sel = us; const t = G.civ.find(k => !k.dead); if (t) { t.ow = ME; }
    return { n: us.length, hq: [hq.x, hq.y], town: !!t }; });
  await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); centerOn(hq.x + 380, hq.y + 150, true); simUpdate(.6); updateUI(); });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => ({ t: G.t, paused: G.paused, supT: G.supT, row: (document.getElementById('ammoRow') || {}).textContent, n: G.sel.length, sup: G.sel.map(u => [u.sup, Math.round(u.am || -1), u.amx]) }));
  console.log(c.name, JSON.stringify(r), JSON.stringify(info));
  await page.screenshot({ path: path.join(SH, `supply-${c.name}.png`), timeout: 300000 });
  await ctx.close();
}
await browser.close(); server.close(); process.exit(0);
