// Lane B scale shots (view only): the normal battle camera over a mixed column (infantry + tanks, jeeps, artillery, trucks)
// on the desert Battle map bm_breakwater and on a snowy Test range map, Day.  -> orch/shots/laneB/<tag>-<scene>.jpg
//   node orch/laneBshots.mjs --tag before --html /tmp/before.html      node orch/laneBshots.mjs --tag after
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = argS('tag', 'after'), HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.join(ROOT, 'orch', 'shots', 'laneB'); fs.mkdirSync(OUT, { recursive: true });
let pw; try { pw = await import('playwright'); } catch { const r = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = r(p); break; } catch {} } }
const chromium = pw.chromium || pw.default.chromium;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gz': 'application/gzip' };
const page0 = fs.readFileSync(HTML);
const server = http.createServer((q, s) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end(page0); }
  if (p === '/sw.js') { s.writeHead(404); return s.end(); }
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('page error:', e.message.slice(0, 200)));
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 180000 });
await page.evaluate(() => { window.__stopLoop = true; try { AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {} });
const SCENES = [['desert', 'bm_breakwater', 'battle'], ['snow', null, 'range']];
for (const [scene, map0, kind] of SCENES) {
  const info = await page.evaluate(async ([map0, kind]) => {
    if (G) G.over = true;
    const snowMap = (typeof BM_KEYS !== 'undefined' ? BM_KEYS : Object.keys(MAPS)).find(k => MAPS[k] && MAPS[k].theme === 'snow' && MAPS[k].min <= 2 && MAPS[k].max >= 2);
    const map = map0 || snowMap || 'bm_breakwater', w = map0 || snowMap ? 0 : 30;   // Day; winter season only if no snow Battle map exists
    if (kind === 'battle') { Object.assign(setup, { map, n: 1, p: 'IR', a: 'US', others: [], tm: [], slot: -1, seed: 4242, w }); startSingle(); }
    else { Object.assign(setup, { seed: 4242, w, slot: -1 }); startSandbox({ p: 'RU', a: 'US', map }); }
    const t0 = performance.now(); while (window.LOADING && performance.now() - t0 < 900000) await new Promise(r => setTimeout(r, 100));
    G.paused = true;
    const T = G.teams[0], fac = T.fac; try { await modelsFor([fac], () => {}, 600000); } catch (e) {}
    const hq = G.ents.find(e => e.isB && e.team === 0), dx = Math.sign(MAPW / 2 - hq.x) || 1, dy = Math.sign(MAPH / 2 - hq.y) || 1;
    const cx = hq.x + dx * 260, cy = hq.y + dy * 160, kinds = ['tank', 'tank', 'jeep', 'arty', 'aa', 'atgm', 'harv', 'dozer'];
    const placed = [];
    kinds.forEach((k, i) => { try { const u = addUnit(0, k, cx + (i % 4) * 40 - 60, cy + Math.floor(i / 4) * 46 - 20); if (u) placed.push(k); } catch (e) {} });
    for (let i = 0; i < 12; i++) { try { addUnit(0, 'inf', cx - 60 + (i % 6) * 16, cy + 70 + Math.floor(i / 6) * 16); } catch (e) {} }
    for (const e of G.ents) { e.ox = e.x; e.oy = e.y; if (e.vs) e.vs[0] = true; }
    G.alpha = 1; centerOn(cx, cy + 30, true);
    return { map: G.mapKey, theme: MAPS[G.mapKey].theme, fac, dist: cam.dist, placed, w: setup.w };
  }, [map0, kind]);
  console.log(TAG, scene, JSON.stringify(info));
  await page.evaluate(() => { for (let i = 0; i < 40; i++) renderFrame(1 / 60); });
  await page.screenshot({ path: path.join(OUT, `${TAG}-${scene}.jpg`), type: 'jpeg', quality: 85, timeout: 300000 });
  console.log('wrote', `${TAG}-${scene}.jpg`);
}
await browser.close(); server.close();
