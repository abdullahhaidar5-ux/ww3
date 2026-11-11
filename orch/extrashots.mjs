// Screenshots for helper "extras-battle" (ideas 10 Commander's radio, 12 Opening shot, 7 Ping wheel). Writes orch/shots/extras-battle/*.png
// SHOTS=radio,opening,ping node orch/extrashots.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const OUT = path.join(ROOT, 'orch', 'shots', 'extras-battle'); fs.mkdirSync(OUT, { recursive: true });
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
const want = (process.env.SHOTS || 'radio,opening,ping').split(','); const errors = []; const fails = [];
const ck = (ok, msg) => { if (!ok) fails.push(msg); };
try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx); const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  const start = async () => { await page.evaluate(() => { setup.n = 1; setup.map = 'rivers'; try { initAudio(); } catch (e) {} startSingle(); });
    await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 }); };
  const snap = async name => { await page.evaluate(() => { renderFrame(.016); renderFrame(.016); }); await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 240000 }); console.log('shot', name); };
  await start();
  if (want.includes('radio')) {
    const r = await page.evaluate(() => { G.paused = true; G.teams.forEach(T => { T.ai = null; }); const hq = G.ents.find(b => b.team === ME && b.kind === 'hq');
      const foe = G.ents.find(b => b.kind === 'hq' && b.team !== ME && !ally(b.team, ME)); centerOn(foe.x, foe.y, true);
      document.getElementById('log').innerHTML = ''; const st = window.setTimeout; window.setTimeout = () => 0;   // the picture must not race the 6 s fade on a slow box
      log(ME, 'Our base is under attack!', 'r:base', hq.x, hq.y); log(ME, 'Enemy armour on the left flank!', 'r:armL', hq.x + 300, hq.y + 80); log(ME, 'Rifle Squad ready.', '', hq.x + 60, hq.y); log(ME, 'Barracks complete.', 'g', hq.x - 90, hq.y + 40); window.setTimeout = st; window._pl = pushLog; pushLog = () => {};   // and no later game message may push a line out before the picture
      const L = [...document.querySelectorAll('#log > div')]; return { n: L.length, go: L.filter(d => d.classList.contains('go')).length, icons: L.map(d => d.querySelector('i') && d.querySelector('i').className), rects: L.map(d => { const r = d.getBoundingClientRect(), c = getComputedStyle(d); return [r.x | 0, r.y | 0, r.width | 0, r.height | 0, c.opacity, c.display, d.className].join(','); }), hx: hq.x, hy: hq.y, sub: !!document.getElementById('radsub') }; });
    console.log('radio', JSON.stringify(r)); ck(r.n === 3, 'radio: the feed must hold at most 3 lines, got ' + r.n); ck(r.go === 3, 'radio: lines with a place must be clickable'); ck(!r.sub, 'radio: the old subtitle box is back');
    await snap('radio-1-feed');
    await page.evaluate(() => { pushLog = window._pl; });
    await page.evaluate(() => { const d = document.querySelector('#log > div.go'); if (d) d.classList.add('vhov'); }); await snap('radio-2-hover');
    // Space = look at the newest report
    await page.keyboard.press('Space'); await page.waitForTimeout(1200);
    const d1 = await page.evaluate(([x, y]) => { return Math.hypot(cam.tx - x, cam.ty - y); }, [r.hx, r.hy]);
    ck(d1 < 260, 'radio: Space did not move the camera to the last report (' + Math.round(d1) + ')');
    // click the first line (base under attack)
    const box = await page.evaluate(() => { const foe = G.ents.find(b => b.kind === 'hq' && b.team !== ME && !ally(b.team, ME)); centerOn(foe.x, foe.y, true); const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); document.getElementById('log').innerHTML = ''; log(ME, 'Our base is under attack!', 'r:base', hq.x, hq.y); log(ME, 'Unit lost.', 'r:lost', hq.x + 200, hq.y); log(ME, 'Enemy attack force spotted moving out.', 'w');
      const r = document.querySelector('#log > div.go').getBoundingClientRect(); return { x: r.x, y: r.y, height: r.height }; });
    await page.mouse.move(box.x + 30, box.y + box.height / 2); await page.mouse.click(box.x + 30, box.y + box.height / 2);
    const d2 = await page.evaluate(([x, y]) => { return Math.hypot(cam.tx - x, cam.ty - y); }, [r.hx, r.hy]);
    ck(d2 < 260, 'radio: clicking a line did not move the camera there (' + Math.round(d2) + ')');
    
    await page.waitForTimeout(7200); const left = await page.evaluate(() => document.querySelectorAll('#log > div').length); ck(left === 0, 'radio: lines must fade after about 6 s (' + left + ' left)');
  }
  // __MORE__
} catch (e) { fails.push('crash: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')); }
await browser.close(); server.close();
if (errors.length) console.log('page errors:', errors.slice(0, 5).join('\n'));
console.log(fails.length || errors.length ? 'EXTRAS FAIL ' + fails.join('; ') : 'EXTRAS PASS'); process.exit(fails.length || errors.length ? 1 : 0);
