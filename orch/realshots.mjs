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
await acquireBrowserLock('realshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// Real-place maps + seasons: 3D screenshots (ground view at the player's base, and a high overview) of map[:season]
//   node orch/realshots.mjs donbas:0 donbas:1 donbas:2 donbas:3 ...   (season 0 = the map's default, 1 summer, 2 autumn mud, 3 winter snow)
// -> orch/shots/real-maps/<map>-<season>-ground.png and -view.png
const SH = path.join(ROOT, 'orch', 'shots', 'real-maps'); fs.mkdirSync(SH, { recursive: true });
const NAMES = ['default', 'summer', 'autumn', 'winter'];
const specs = process.argv.slice(2).filter(a => !a.startsWith('--'));
for (const sp of specs) {
  const [m, s0] = sp.split(':'), s = +(s0 || 0);
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(([m, s]) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.map = m; setup.w = wxJoin(0, s); startSingle(); }, [m, s]);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
  const info = await page.evaluate(() => ({ ssn: G.ssn, theme: G.map.theme, mud: !!G.map.mud, key: G.mapKey }));
  console.log(sp, JSON.stringify(info));
  const shot = async (name) => { await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });
    await page.waitForTimeout(2500); await page.screenshot({ path: path.join(SH, `${m}-${NAMES[s]}-${name}.png`), timeout: 300000 }); };
  await page.evaluate(() => { for (const T of G.teams) if (T.ai) T.ai = null; const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); cam.dist = cam.td = 300; centerOn(hq.x + 260, hq.y + 150, true); G.sel = []; simUpdate(.3); updateUI(); });
  await shot('ground');
  await page.evaluate(() => { const d = zmax(); cam.dist = cam.td = d; centerOn(MAPW / 2, MAPH / 2, true); simUpdate(.3); });
  await shot('view');
  await ctx.close();
}
await browser.close(); server.close();
