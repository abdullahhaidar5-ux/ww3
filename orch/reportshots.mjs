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
await acquireBrowserLock('reportshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });


// Battle report card shots (one-language idea 6): plays an AI skirmish fast, ends it, pictures the end screen and the card.
//   node orch/reportshots.mjs [before|after]   -> orch/shots/lang-campaign/6-<tag>-end.png, 6-<tag>-card.png
const TAGN = process.argv[2] || 'after';
const SH = path.join(ROOT, 'orch', 'shots', 'lang-campaign'); fs.mkdirSync(SH, { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONERR', m.text().slice(0, 200)); });
await page.goto(ORIGIN + '/index.html?lazy=1', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.w = 7; setup.map = 'fulda'; startSingle(); });
await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
const out = await page.evaluate(() => { try { G.teams[ME].ai = G.teams[ME].ai || mkAI(setup.d); } catch (e) { console.error('mkAI ' + e.message); } const t0 = performance.now();
  while (G.t < 1500 && !G.over && performance.now() - t0 < 240000) { simUpdate(.2); aarTick(); }
  return { t: G.t, over: G.over, s: AAR.s.length, ev: AAR.ev.length }; });
console.log(JSON.stringify(out));
await page.evaluate(() => { if (!G.over) endGame(ME, 'Test ending.'); });
await page.waitForTimeout(2500);
await page.evaluate(() => { try { kcSkip(); } catch (e) {} });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(SH, '6-' + TAGN + '-end.png'), timeout: 300000 });
const info = await page.evaluate(async () => { const r = { line: typeof ES !== 'undefined' && ES.card ? ES.card.how : null, arrows: typeof ES !== 'undefined' && ES.card ? ES.card.arrows.length : null };
  try { const c = esImage(ES.S); r.w = c.width; r.h = c.height; r.url = c.toDataURL('image/png'); } catch (e) { r.err = String(e); } return r; });
if (info.url) fs.writeFileSync(path.join(SH, '6-' + TAGN + '-card.png'), Buffer.from(info.url.split(',')[1], 'base64'));
delete info.url; console.log(JSON.stringify(info)); console.log('done');
await browser.close(); server.close(); process.exit(0);
