// polishfeel: headless play-through with screenshots: menu -> Battle setup -> match -> Test range.
//   node orch/polishshots.mjs [--tag after]   -> orch/shots/polishfeel-<tag>-*.jpg  (default tag "before")
// Also prints text under 11px, clipped text and tiny buttons it finds on each screen.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots');
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : 'before';
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock('polishshots'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);
const page = await ctx.newPage(); await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
const errs = []; page.on('pageerror', e => errs.push(e.message));
const shot = async n => { try { await page.screenshot({ path: path.join(OUT, `polishfeel-${TAG}-${n}.jpg`), type: 'jpeg', quality: 80, timeout: 240000 }); } catch (e) { console.log('shot skipped', n, e.message.split('\n')[0]); } };
const audit = async n => console.log(n, JSON.stringify(await page.evaluate(() => { const small = [], clip = [], tiny = [];
  for (const el of document.querySelectorAll(window.G ? '#side *, #sbx *, #pauseOv *, #top *, #hint *' : 'body *')) { const r = el.getBoundingClientRect(); if (!r.width || !r.height || el.offsetParent === null) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const own = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()); const id = (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') || el.tagName;
    if (own && parseFloat(cs.fontSize) < 11) small.push(id + ':' + cs.fontSize + ':' + el.textContent.trim().slice(0, 20));
    if (own && el.scrollWidth > el.clientWidth + 2 && cs.overflowX === 'hidden' && cs.textOverflow !== 'ellipsis') clip.push(id + ':' + el.textContent.trim().slice(0, 20));
    if ((el.tagName === 'BUTTON') && (r.height < 22 || r.width < 22)) tiny.push(id + ':' + Math.round(r.width) + 'x' + Math.round(r.height) + ':' + el.textContent.trim().slice(0, 14)); }
  return { small: small.slice(0, 15), clip: clip.slice(0, 15), tiny: tiny.slice(0, 15) }; })));
const ONLY = process.argv.includes('--only');
await page.goto(ORIGIN + '/index.html?lazy=1', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && document.getElementById('mx'), null, { timeout: 60000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} });
if (!ONLY) {
await page.waitForTimeout(2500); await shot('01-menu'); await audit('menu');
console.log('menu items:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#mxmenu .mxi')].map(b => b.textContent + (b.title ? ' [tip]' : '')))));
await page.evaluate(() => { mxSetMode('battle'); menuGo('c-map'); }); await page.waitForTimeout(1200); await shot('02-battle-map'); await audit('map');
await page.evaluate(() => menuGo('c-nation')); await page.waitForTimeout(900); await shot('03-battle-nation'); await audit('nation');
await page.evaluate(() => menuGo('c-players')); await page.waitForTimeout(900); await shot('04-battle-players'); await audit('players');
await page.evaluate(() => { setup.n = 1; initAudio(); mxClick('start'); }); await page.waitForTimeout(500); await shot('05-loading');
await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 }); await page.waitForTimeout(3000); await shot('06-battle-start'); await audit('battle');
await page.evaluate(() => { const d = G.ents.find(e => e.team === ME && e.isB); if (d) { G.sel = [d]; updateUI(); } }); await page.waitForTimeout(1500); await shot('07-battle-building'); await audit('battle-sel');
await page.evaluate(() => { const d = G.ents.find(e => e.team === ME && !e.isB); if (d) { G.sel = [d]; updateUI(); } }); await page.waitForTimeout(1500); await shot('08-battle-unit');
await page.keyboard.press('Escape'); await page.waitForTimeout(800); await shot('09-pause'); await audit('pause'); await page.keyboard.press('Escape');
}
if (!ONLY) await page.evaluate(() => { location.reload(); }); await page.waitForFunction(() => typeof startSandbox === 'function' && document.getElementById('mx'), null, { timeout: 60000 }); await page.waitForTimeout(1500);
await page.evaluate(() => { initAudio(); startSandbox(); }); await page.waitForFunction(() => !window.LOADING && window.G && G.sandbox, null, { timeout: 600000, polling: 500 }); await page.waitForTimeout(3000);
await shot('10-testrange'); await audit('testrange');
console.log('sbx html:', await page.evaluate(() => { const s = document.getElementById('sbx'); return s ? s.innerText.replace(/\n+/g, ' | ') : 'none'; }));
console.log('errors:', errs.slice(0, 5)); await browser.close(); server.close(); process.exit(0);
