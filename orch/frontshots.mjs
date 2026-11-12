import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), ROOT = process.env.GAMEROOT ? path.resolve(process.env.GAMEROOT) : HERE, OUT = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'orch', 'out');
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : '';
const { acquireBrowserLock } = await import(path.join(HERE, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(HERE, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of [ '/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
await acquireBrowserLock('frontshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });



// Front line + supply vein shots (one-language idea 4): Iran at war with Iraq, one army fed just over the border, one cut off deep inside.
//   node orch/frontshots.mjs [before|after]   (GAMEROOT=<other checkout> to picture another build) -> orch/shots/lang-campaign/4-<tag>-{far,middle,close}.png
const TAGN = process.argv[2] || 'after';
const SH = path.join(HERE, 'orch', 'shots', 'lang-campaign'); fs.mkdirSync(SH, { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof grNew === 'function' && typeof grandOpen === 'function', null, { timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} grNew({ me: 'IR', seed: 99, len: 'quick' }); grandOpen(); });
await page.waitForFunction(() => typeof G3 !== 'undefined' && G3.lines && G3.arrows && G3.F, null, { timeout: 600000, polling: 500 });
const sc = await page.evaluate(() => { const me = 'IR', foe = 'IQ', P = GCM.P; grDeclare(me, foe);
  let pair = null; for (const p of P) if (p.land && GC.prov[p.i].o === me) for (const j of p.adj) if (P[j].land && GC.prov[j].o === foe) { pair = pair || [p.i, j]; }
  if (!pair) return { err: 'no border' };
  const far = p => p.land && GC.prov[p.i].o === foe && !p.adj.includes(pair[1]) && !p.adj.some(j => P[j].land && GC.prov[j].o === me); const deep = P.find(p => far(p) && p.adj.some(j => P[j].adj.includes(pair[1]))) || P.find(far);
  const mine = GC.armies.filter(a => a.o === me && P[a.at].land); if (mine[0]) { mine[0].at = pair[1]; mine[0].path = []; } if (mine[1] && deep) { mine[1].at = deep.i; mine[1].path = []; }
  window.__fs = { pair, deep: deep && deep.i }; return { pair: pair.map(i => P[i].n), deep: deep && deep.n, armies: mine.length }; });
console.log(JSON.stringify(sc));
const cam = (d) => page.evaluate((d) => { const p = GCM.P[window.__fs.pair[1]]; g3Centre(p.i); G3.camera.d = d; G3.camera.pitch = 1.15; G3.moved = true; }, d);
await cam(330); await page.waitForTimeout(6000);
// the front moves: Iran takes the border province -> advance arrow (the view compares with what it saw before)
await page.evaluate(() => { const b = window.__fs.pair[1]; const far = GCM.P.find(p => p.land && GC.prov[p.i].o === 'IQ' && p.i !== window.__fs.deep && p.adj.includes(b)); GC.prov[b].o = 'IR'; try { g3LineColors(); G3.ovDirty = true; } catch (e) {} });
await page.waitForTimeout(6000);
for (const [n, d] of [['far', 560], ['middle', 330], ['close', 200]]) { await cam(d); await page.waitForFunction((d) => { const f = G3.time; if (window.__ft === undefined || window.__fd !== d) { window.__ft = f; window.__fd = d; return false; } return G3.time - window.__ft > .05 && Math.abs(G3.cc.d - d) < d * .03 && (window.__fn = (window.__fn | 0) + 1) > 3; }, d, { timeout: 240000, polling: 1500 }).catch(() => console.log('camera slow')); await page.evaluate(() => { window.__fn = 0; }); await page.screenshot({ path: path.join(SH, '4-' + TAGN + '-' + n + '.png'), timeout: 300000 });
  console.log(n, JSON.stringify(await page.evaluate(() => { const F = G3.front; return F && F.data ? { tier: grTier(), fr: F.data.fr.length, adv: F.data.adv.length, gold: F.data.gold.length, dark: F.data.dark.length, cut: F.data.cut.length, vis: [F.fm && F.fm.visible, F.vm && F.vm.visible, F.dm && F.dm.visible], builds: F.builds } : null; }))); }
console.log('done'); await browser.close(); server.close(); process.exit(0);
