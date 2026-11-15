// Dev helper for the look pictures: keeps one battle page open and runs JS snippets dropped in $CMD/*.js (result -> same name .out).
// A snippet may be `await`-style async function body. node orch/looktestrepl.mjs  (CMD defaults to /tmp/claude-0/cmd)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), CMD = process.env.CMD || '/tmp/claude-0/cmd'; fs.mkdirSync(CMD, { recursive: true });
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock('looktest');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await (exe ? pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }) : pw.chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 }); const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto(ORIGIN + '/index.html?lazy=1&look=' + (process.env.LOOK || 'a'), { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 90000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
await page.evaluate((m) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.p = 'IR'; setup.a = 'IL'; setup.map = m; startSingle(); }, process.env.MAP || 'rubalkhali');
await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 900000, polling: 500 });
fs.writeFileSync(path.join(CMD, 'READY'), 'ready');
console.log('READY');
const seen = new Set(); setInterval(async () => { for (const f of fs.readdirSync(CMD).filter(f => f.endsWith('.js') && !seen.has(f)).sort()) { seen.add(f); const src = fs.readFileSync(path.join(CMD, f), 'utf8'); let out;
  try { if (src.startsWith('//NODE')) { out = String(await (new (Object.getPrototypeOf(async function () {}).constructor)('page', 'OUT', 'path', src))(page, ROOT, path)); } else out = JSON.stringify(await page.evaluate(src)); } catch (e) { out = 'ERR ' + e.message; } fs.writeFileSync(path.join(CMD, f.replace(/\.js$/, '.out')), out || ''); } }, 500);
