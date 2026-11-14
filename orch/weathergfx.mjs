// Battlefeel: wildfire, drifting smoke + LOS, wreck cover, auto-build panel. Writes orch/shots/battlefeel/*.png and prints checks (BF-FEEL PASS/FAIL)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); 
async function loadPlaywright() { try { return await import('playwright'); } catch {} const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} } throw new Error('playwright not found'); }
function findChromium() { const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {} }
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const SHOT_DIR = path.join(ROOT, 'orch', 'shots'); const errors = []; const checks = [];
const ck = (n, ok, d) => { checks.push([n, !!ok]); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d !== undefined ? ' ' + JSON.stringify(d) : '')); };
// [file name, map, setup.w, graphics preset]
const PLAN = [['day', 'bosphorus', 0, 'auto'], ['dusk', 'bosphorus', 3, 'auto'], ['night', 'bosphorus', 4, 'auto'], ['rain', 'bosphorus', 7, 'auto'], ['sandstorm', 'hormuzgate', 6, 'auto'], ['snow', 'arctic', 8, 'auto'], ['low', 'bosphorus', 0, 'low'], ['ultra', 'bosphorus', 0, 'ultra']];
const only = (process.env.SHOTS || '').split(',').filter(Boolean);
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await guardContext(ctx); const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  // picker logic (pure): what fits which map, Random only picks what fits, an unfitting choice becomes Day
  const logic = await page.evaluate(() => { const o = {}; for (const [mk, th] of [['bosphorus', 'green'], ['hormuzgate', 'desert'], ['arctic', 'snow']]) { const t = condTheme(mk, 0); const fit = CONDS.filter(c => condFits(c.w, t)).map(c => c.n);
      const rnd = new Set(); for (let s = 1; s < 400; s++) rnd.add(condFit(-1, t, s * 7919)); o[mk] = { t, fit, rnd: [...rnd].sort(), snowOnDesert: condFit(8, t, 5), sandOnSnow: condFit(6, t, 5) }; } return o; });
  console.log(JSON.stringify(logic));
  ck('rain only on temperate maps', logic.bosphorus.fit.includes('Rain') && !logic.hormuzgate.fit.includes('Rain') && !logic.arctic.fit.includes('Rain'));
  ck('sandstorm only on desert maps', logic.hormuzgate.fit.includes('Sandstorm') && !logic.bosphorus.fit.includes('Sandstorm') && !logic.arctic.fit.includes('Sandstorm'));
  ck('snow only on snow maps', logic.arctic.fit.includes('Snow') && !logic.bosphorus.fit.includes('Snow') && !logic.hormuzgate.fit.includes('Snow'));
  ck('Random only picks fitting options', logic.bosphorus.rnd.every(b => [0, 3, 4, 7].includes(b)) && logic.hormuzgate.rnd.every(b => [0, 3, 4, 6].includes(b)) && logic.arctic.rnd.every(b => [0, 3, 4, 8].includes(b)) && logic.bosphorus.rnd.length === 4);
  ck('an unfitting choice becomes Day', logic.hormuzgate.snowOnDesert === 0 && logic.arctic.sandOnSnow === 0);
  for (const [name, map, w, gfx] of PLAN) {
    if (only.length && !only.includes(name)) continue;
    await page.evaluate(([map, w, gfx]) => { SET.gfx = gfx; SET.gfxB = 1; try { applyGfx(); } catch (e) {} setup.n = 1; setup.map = map; setup.w = w; try { initAudio(); } catch (e) {} startSingle(); }, [map, w, gfx]);
    await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 });
    const info = await page.evaluate(() => { G.paused = true; G.teams.forEach(T => { T.ai = null; }); G.setupEnd = 0; const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); return { x: hq.x, y: hq.y, wxB: G.wxB, fix: G.fixWx, todM: G.todM, theme: G.map.theme, gfx: SET.gfx, lock: QUAL.lock, sm: SUN.shadow.mapSize.x }; });
    ck(name + ': battle has the picked conditions', info.wxB === w && (w === 4 ? info.todM === 2 : w === 3 ? info.todM === 1 : true), info);
    await page.evaluate(([x, y]) => { for (let i = 0; i < 40; i++) simUpdate(.05); camTarget(); cam.td = cam.dist = 620; centerOn(x, y, true); for (let i = 0; i < 12; i++) renderFrame(.2); }, [info.x, info.y]);
    await page.waitForTimeout(600); await page.evaluate(() => { renderFrame(.016); renderFrame(.016); });
    await page.screenshot({ path: path.join(SHOT_DIR, 'weathergfx-' + name + '.jpg'), type: 'jpeg', quality: 80, timeout: 240000 }); console.log('shot', name);
    if (name === 'ultra') ck('ultra: 4096 shadows and fixed full quality', info.sm === 4096 && info.lock === 1, info);
  }
  // Random is the same for everyone with the same seed
  const same = await page.evaluate(() => [condFit(-1, 'green', 12345), condFit(-1, 'green', 12345), condFit(-1, 'desert', 99)].join());
  ck('Random is deterministic from the seed', same.split(',')[0] === same.split(',')[1], same);
} finally { await browser.close(); server.close(); }
if (errors.length) { console.log('page errors:', errors.slice(0, 5)); }
const bad = checks.filter(c => !c[1]); console.log(bad.length || errors.length ? 'WEATHERGFX FAIL' : 'WEATHERGFX PASS');
process.exit(bad.length || errors.length ? 1 : 0);
