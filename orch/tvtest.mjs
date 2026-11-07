// lane G RG5 TV news test: node orch/tvtest.mjs
// After a turn, the biggest story of the month becomes a lower-third broadcast card (fictional channel + anchor);
// quiet months show nothing; one card per turn; clicking dismisses it. Screenshot: orch/shots/laneG/tv.png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'laneG');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock();
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);
const fails = [];
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gtvShow === 'function', null, { timeout: 60000 });
  const r = await page.evaluate(() => {
    grNew({ me: 'IR', seed: 7, len: 'std' }); grandOpen(); guTop();
    const out = {};
    // quiet month: nothing to broadcast
    GC.log = []; GC.turn = 5; gtvShow(); out.quietShown = !!document.getElementById('gTV');
    // a world event and an own-nation war story from last month
    GC.log.push([4, 'WORLD: oil price shock', '']); GC.log.push([4, 'IR declared war on IQ.', 'IR']);
    gtvShow(); const card = document.getElementById('gTV');
    out.shown = !!card; out.text = card ? card.textContent : '';
    out.hasChannel = card ? /Meridian 24|Global Eye|Horizon News|Continental Wire|Northstar TV/.test(card.textContent) : false;
    out.hasAnchor = card ? /Anchor /.test(card.textContent) : false;
    out.hot = card ? /BREAKING/.test(card.textContent) : false;
    // same turn again: no second card
    const before = document.querySelectorAll('#gTV').length; gtvShow(); out.dupes = document.querySelectorAll('#gTV').length - before;
    return out;
  });
  await page.waitForTimeout(600);
  if (r.quietShown) fails.push('quiet month still showed a card');
  if (!r.shown) fails.push('no TV card for a big story');
  if (!r.hasChannel) fails.push('card has no fictional channel name');
  if (!r.hasAnchor) fails.push('card has no anchor line');
  if (!r.hot) fails.push('war story not marked BREAKING');
  if (r.dupes) fails.push('a second card appeared on the same turn');
  await page.screenshot({ path: path.join(SHOTS, 'tv.png'), timeout: 120000 }).catch(() => {});
  console.log('tv', JSON.stringify(r).slice(0, 300));
} catch (e) { fails.push('exception: ' + e.message.slice(0, 200)); }
if (errs.length) fails.push(...errs.slice(0, 3));
await browser.close(); server.close();
console.log(fails.length ? 'TV FAIL\n' + fails.join('\n') : 'TV PASS');
process.exit(fails.length ? 1 : 0);
