// dev helper: node orch/grand3dev.mjs file.js  -> evaluates the file's expression in the booted game page and prints JSON
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { fileURLToPath } from 'node:url';import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { chromium } = await loadPW();
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 800 } })).newPage();
page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 300)));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::|Failed to load|peer|WebSocket|Audio|autoplay/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)); });
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 120000 }).catch(() => {});
const code = fs.readFileSync(process.argv[2], 'utf8');
const out = await page.evaluate(code);
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
await browser.close(); server.close();
