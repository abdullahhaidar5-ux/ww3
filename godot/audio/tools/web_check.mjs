// Opens the Godot WEB build in a real browser (headless Chromium) and checks the sound rules of the web:
// nothing plays before the first click, after it the music streams from the site's mus/ folder and the voice / effect
// sheets are fetched from vo/ and sfx/ (nothing of that is inside the .pck).
//   godot --headless --path godot --export-release Web <dir>/index.html ; node godot/audio/tools/web_check.mjs <dir>
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(new URL('../../../', import.meta.url).pathname), WEB = path.resolve(process.argv[2]);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png' };
const got = [];
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]);
  let f = u.startsWith('/godot/') ? path.join(WEB, u.slice(7) || 'index.html') : path.join(ROOT, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  if (/\.mp3$/.test(u)) got.push(u);
  if (u === '/godot/index.html') { res.writeHead(200, { 'content-type': 'text/html' });   // the battle scene, AI on both sides, sound log on
    return res.end(fs.readFileSync(f, 'utf8').replace('"args":[]', '"args":["res://scenes/battle.tscn","--","--battle-ai","--fac=IR","--vs=US","--seed=1","--audio-log","--audio-demo"]')); }
  const st = fs.statSync(f), rg = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  if (rg) { const a = +rg[1], b = rg[2] ? +rg[2] : st.size - 1; res.writeHead(206, { 'content-type': MIME[path.extname(f)], 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1, 'accept-ranges': 'bytes' }); return fs.createReadStream(f, { start: a, end: b }).pipe(res); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'content-length': st.size, 'accept-ranges': 'bytes' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
let pw; try { pw = await import('playwright'); } catch { pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_DIR || '/opt/node22/lib/node_modules/playwright'); }
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });   // NO autoplay flag: the real browser rule applies
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await page.goto(`http://127.0.0.1:${server.address().port}/godot/index.html`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__ww3a, null, { timeout: 300000, polling: 500 });
await page.waitForTimeout(+(process.argv[3] || 25) * 1000);
const before = await page.evaluate(() => ({ a: window.__ww3a, mus: window.__ww3m.id(), left: window.__ww3m.left() }));
const mp3Before = got.slice();
await page.mouse.click(160, 60);
await page.waitForTimeout(+(process.argv[4] || 60) * 1000);
const after = await page.evaluate(() => { const a = [...document.querySelectorAll('audio')]; return { a: window.__ww3a, mus: window.__ww3m.id(), left: window.__ww3m.left() }; });
const t1 = await page.evaluate(() => window.__ww3m.left()); await page.waitForTimeout(3000); const t2 = await page.evaluate(() => window.__ww3m.left());
let fails = 0; const ok = (c, w) => { console.log((c ? 'ok    ' : 'FAIL  ') + w); if (!c) fails++; };
ok(before.a.unlocked === false && Object.keys(before.a.events).filter(k => k !== 'battle').length === 0 && before.mus === '', `before the first click: locked, no sound events, no music (${JSON.stringify(before.a.events)})`);
ok(mp3Before.length === 0 || mp3Before.every(u => !/mus\//.test(u)), `before the first click no music file is requested (${mp3Before.length} sheet files pre-fetched)`);
ok(after.a.unlocked === true, 'after the first click: unlocked');
ok(/mus\/st\/(calm|combat)-\d+\.mp3$/.test(after.mus), 'battle music streams from the site: ' + after.mus.replace(/^.*\/mus/, 'mus'));
ok(t2 < t1 && t1 < 900, `the music is really playing (time left ${t1.toFixed(1)} s -> ${t2.toFixed(1)} s)`);
ok(after.a.loaded >= 5 && after.a.failed.length === 0, `sheets loaded over HTTP: ${after.a.loaded}, failed: ${JSON.stringify(after.a.failed)}; base ${after.a.base}`);
ok(['vo/IR.mp3', 'vo/IR_r.mp3', 'vo/IR_h.mp3', 'vo/IR_s.mp3', 'vo/ann_fa.mp3', 'sfx/sfx.mp3'].every(f => got.includes('/' + f)), 'requested from the site: ' + [...new Set(got)].join(' '));
ok((after.a.events.vor || 0) + (after.a.events.vo || 0) >= 1, 'unit lines played: ' + JSON.stringify(after.a.events));
ok(errs.filter(e => !/favicon|404/.test(e)).length === 0, 'no page errors ' + JSON.stringify(errs.slice(0, 3)));
console.log('last events: ' + JSON.stringify(after.a.last));
console.log(fails ? `WEB AUDIO CHECK FAIL (${fails})` : 'WEB AUDIO CHECK PASS');
await browser.close(); server.close(); process.exit(fails ? 1 : 0);
