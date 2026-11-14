import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, "orch/shots");
fs.mkdirSync(OUT, { recursive: true });
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { } if (!pw || !pw.chromium) pw = req('/opt/npm-tools/node_modules/playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
let ok = true; const bad = m => { ok = false; console.log('FAIL', m); };
const jpg = async name => { const f = path.join(OUT, name + '.jpg'); let q = 82; for (;;) { await page.screenshot({ path: f, type: 'jpeg', quality: q, timeout: 300000 }); if (fs.statSync(f).size < 295000 || q <= 40) break; q -= 10; } console.log('shot', name, Math.round(fs.statSync(f).size / 1024) + ' KB'); };
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof mapPreview === 'function' && typeof BM_KEYS !== 'undefined' && typeof BATTLE_MAPS !== 'undefined', null, { timeout: 120000 });
// contact sheet of every Battle map: the same small picture the map picker draws (mapPreview), with name and player count
const url = await page.evaluate(async () => {
  const L = BM_KEYS.slice(), cols = 6, cw = 230, ch = 190, rows = Math.ceil(L.length / cols), cv = document.createElement('canvas');
  cv.width = cols * cw + 16; cv.height = rows * ch + 56; const g = cv.getContext('2d'); g.fillStyle = '#14181c'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#e8c250'; g.font = 'bold 22px sans-serif'; g.fillText('Battle maps (' + L.length + ')', 12, 30);
  for (let i = 0; i < L.length; i++) { const k = L[i], D = MAPS[k], x = 8 + (i % cols) * cw, y = 44 + Math.floor(i / cols) * ch, p = document.createElement('canvas'); p.width = 214; p.height = 140;
    try { mapPreview(k, p); } catch (e) { }
    g.drawImage(p, x, y); g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.fillText(D.name.slice(0, 28), x, y + 156);
    g.fillStyle = '#9fb0bf'; g.font = '12px sans-serif'; g.fillText((D.min === D.max ? D.max : D.min + '-' + D.max) + ' players · ' + (D.tag || D.theme || '').slice(0, 24), x, y + 174); }
  return cv.toDataURL('image/jpeg', .85); });
fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'maptrim-list.jpg'), Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote orch/shots/maptrim-list.jpg'); await browser.close(); server.close();
