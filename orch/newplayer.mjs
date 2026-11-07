// First-time-player audit (Lane D2): opens the menu like a new player and lists every visible button/label,
// flagging ones with no tooltip, jargon-y or very short text. Usage: node orch/newplayer.mjs [--shot]
// Output = visible text only (what a new player can see); fix the flagged ones with wording/hints.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { for (const p of ['/opt/npm-tools/node_modules/playwright']) try { pw = req(p); break; } catch {} }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await pg.waitForTimeout(6000);
const items = await pg.evaluate(() => [...document.querySelectorAll('button,[role=button],.btn,a')].filter(e => e.offsetParent).map(e => ({
  t: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60), tip: e.title || e.getAttribute('data-tip') || '' })).filter(x => x.t));
const flags = items.filter(x => !x.tip && (x.t.length < 4 || /^[A-Z0-9 +\/-]{2,6}$/.test(x.t)));
console.log('VISIBLE CONTROLS:', items.length); items.forEach(x => console.log(' -', x.t, x.tip ? '(tip)' : ''));
console.log('FLAGGED (no tooltip + cryptic):'); flags.forEach(x => console.log(' !', x.t));
if (process.argv.includes('--shot')) { fs.mkdirSync(path.join(ROOT, 'orch/shots/laneD'), { recursive: true }); await pg.screenshot({ path: path.join(ROOT, 'orch/shots/laneD/menu.png') }); }
await b.close(); srv.close();
