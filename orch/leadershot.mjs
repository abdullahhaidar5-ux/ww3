// Leader look proof (helper leaderlook): a rifle squad and the nation's leader unit (Ayatollah for IR/RS/DW, Dear Leader
// for KP) side by side, close and at normal battle zoom.  node orch/leadershot.mjs --p IR [--a IL] [--map golan] [--out dir]
//   -> ldr-<P>-close.png, ldr-<P>-zoom.png ; --repl dir = developer loop (see below). Based on orch/spyshot.mjs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = argS('tag', 'after');
const HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.resolve(argS('out', path.join(ROOT, 'orch', 'out', 'leader')));
const MAPS = argS('maps', 'strait,arctic,fulda,gulf,zagros,emirates,dmz').split(',').filter(Boolean);
const SEED = 4242;
const ISBLD = !!argS('bld', '');
// --bkinds kind:dx:dy,... buildings placed around the base (bld mode); --dist camera distance; --live N = no staging, N sim-seconds of AI play, camera on the player's base
const BKINDS = argS('bkinds', 'barracks:110:-90,factory:-110:90,hq:0:0').split(',').map(s => { const [k, x, y] = s.split(':'); return [k, +x, +y]; });
const DIST = +argS('dist', '330');
const LIVE = +argS('live', '0');
const CLIP = ISBLD ? { x: 190, y: 60, width: 900, height: 480 } : { x: 340, y: 170, width: 600, height: 340 };

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const page0 = fs.readFileSync(HTML);
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); } // no service worker: every run loads exactly this page
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
await acquireBrowserLock('gfx-shots');
const dir = OUT; fs.mkdirSync(dir, { recursive: true });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errs = [];
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';

async function open(ctxOpts) {
  const ctx = await browser.newContext(ctxOpts); await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
  page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { const t = m.text(); if (/3D models for|^ldr /.test(t)) console.log(`[${secs()}] ` + t.slice(0, 400)); if ((m.type() === 'error' || m.type() === 'warning') && !/net::|Failed to load|AudioContext|autoplay|speech|WebSocket|peer/i.test(t)) errs.push(m.type() + ': ' + t.slice(0, 300)); });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
  await page.evaluate(() => { window.__stopLoop = true; try { initAudio(); } catch (e) {} try { AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {} });
  return { ctx, page };
}
// start a 2-player battle (both sides AI), wait for the loading screen, then fast-forward `simSec` game-seconds
async function battle(page, map, p, a, simSec) {
  const r = await page.evaluate(async ([map, p, a, seed]) => {
    if (G) G.over = true;
    Object.assign(setup, { map, n: 1, p, a, others: [], tm: [], slot: -1, seed });
    startSingle(); const w0 = performance.now();
    while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    G.teams.forEach(T => { if (!T.ai) T.ai = mkAI(1); }); G.paused = false;
    return { map: G.mapKey, facs: G.teams.map(T => T.fac), rev: THREE.REVISION, W: MAPW, H: MAPH };
  }, [map, p, a, SEED]);
  for (let done = 0; done < simSec * 60; done += 1800)
    await page.evaluate(k => { for (let i = 0; i < k && G && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1; }, Math.min(1800, simSec * 60 - done));
  return r;
}
async function frames(page, n) {
  return page.evaluate(n => { const gl = R3.getContext(), px = new Uint8Array(4), ts = [];
    for (let i = 0; i < n; i++) { const a = performance.now(); renderFrame(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - a); }
    return ts; }, n);
}
async function snap(page, name) { await page.screenshot({ path: path.join(dir, name + '.png'), timeout: 300000, clip: CLIP }); console.log(`[${secs()}] ${TAG}/${name}.png`); }

const P = argS('p', 'IR'), A = argS('a', P === 'IL' ? 'IR' : 'IL'), MAP = argS('map', 'golan');
try {
  const { ctx, page } = await open({ viewport: { width: 1600, height: +argS('vh', '1160') }, deviceScaleFactor: 1 });
  await battle(page, MAP, P, A, 2);
  console.log(`[${secs()}] battle up`, JSON.stringify(await page.evaluate(() => ({ ready: !!MODELS.ready, proto: Object.keys(MODELS.proto).filter(k => /^sol|soldier/.test(k)), nproto: Object.keys(MODELS.proto).length }))));
  const info = await page.evaluate(() => { G.paused = true; G.ents = G.ents.filter(e => e.isB);
    const [bx, by] = BASES[0]; const x = Math.max(700, Math.min(MAPW - 700, bx + 260)), y = Math.max(700, Math.min(MAPH - 700, by + 80));
    const put = (kd, dx) => { const u = addUnit(0, kd, x + dx, y + 40); u.ox = u.x; u.oy = u.y; if (u.vs) u.vs[0] = true; u.ang = u.va = Math.PI / 2; return u; };
    put('inf', -30); window.__ui = on => { const cvs = document.querySelector('canvas'); for (let n = cvs; n && n !== document.documentElement; n = n.parentElement) for (const q of n.parentElement.children) if (q !== n && q.tagName !== 'SCRIPT' && q.tagName !== 'STYLE' && q.tagName !== 'HEAD') q.style.visibility = on ? '' : 'hidden'; }; window.__spies = [];
    window.__at = [x, y]; return { x, y }; });
  // the Infiltrator (one look)
  await page.evaluate(() => { window.__respawn = () => { for (const u of window.__spies) { u.dead = true; } G.ents = G.ents.filter(e => !window.__spies.includes(e)); window.__spies = []; for (const k in SOLM) if (/\|ldr\|/.test(k)) delete SOLM[k]; for (const k in GEARG) if (/\|ldr\|/.test(k)) delete GEARG[k]; }; });
  const spawn = async () => { for (const i of [1]) {
    await page.evaluate(i => { const [x, y] = window.__at; const u = addUnit(0, 'cleric', x + 12, y + 40); u.ox = u.x; u.oy = u.y; if (u.vs) u.vs[0] = true; u.ang = u.va = Math.PI / 2; window.__spies.push(u); }, i);
    await frames(page, 2); } };
  if (argS('repl', '')) { // developer loop: drop go-N.js (page code; may return a value) into the folder, get out-N.png back; file "quit" ends it
    const RD = path.resolve(argS('repl', '')); fs.mkdirSync(RD, { recursive: true }); await spawn(); console.log('repl ready');
    for (let n = 1; !fs.existsSync(path.join(RD, 'quit')); ) { const f = path.join(RD, `go-${n}.js`); if (!fs.existsSync(f)) { await new Promise(r => setTimeout(r, 500)); continue; }
      await new Promise(r => setTimeout(r, 300)); let res; try { res = await page.evaluate(fs.readFileSync(f, 'utf8')); if (res === 'respawn') { await frames(page, 2); await spawn(); } } catch (e) { res = 'ERR ' + e.message.slice(0, 600); }
      await frames(page, 3); await page.screenshot({ path: path.join(RD, `out-${n}.png`), timeout: 300000 }); fs.writeFileSync(path.join(RD, `out-${n}.txt`), String(typeof res === 'string' ? res : JSON.stringify(res)) + '\n' + errs.splice(0).filter(t => !/toNonIndexed|GPU stall/.test(t)).join('\n')); n++; }
    await ctx.close(); await browser.close(); server.close(); process.exit(0); }
  await spawn();
  console.log('ldr', await page.evaluate(() => { const u = window.__spies[0], o = OBJ.get(u.id); return JSON.stringify({ model: !!(o && o.userData.ldrModel), keys: Object.keys(SOLM).filter(k => /ldr/.test(k)) }); }));
  // close: a straight-on camera (the game camera cannot get this low); zoom: the normal battle view (default distance 560)
  await page.evaluate(() => { window.__pc0 = placeCam; placeCam = function () { window.__pc0.apply(this, arguments); const c = window.__cc; if (c) { CAM.position.set(c[0] + c[3], c[1] + c[4], c[2] + c[5]); CAM.lookAt(c[0], c[1], c[2]); CAM.updateMatrixWorld(); } }; });
  const CLIP = { x: 0, y: 0, width: 1600, height: 900 };
  await page.evaluate(() => { const [x, y] = window.__at; window.__cc = [x - 5, 8.5, y + 40, 0, 9, 62]; cam.dist = cam.td = cam._dl = 30; window.__ui(false); });
  await frames(page, 4); await page.screenshot({ path: path.join(dir, `ldr-${P}-close.png`), timeout: 300000, clip: CLIP }); console.log(`[${secs()}] ldr-${P}-close.png`);
  await page.evaluate(() => { const [x, y] = window.__at; window.__cc = null; cam.free = false; cam.dist = cam.td = cam._dl = 560; cam.x = cam.tx = cam._xl = x; cam.y = cam.ty = cam._yl = y + 40; });
  await frames(page, 4); await page.screenshot({ path: path.join(dir, `ldr-${P}-zoom.png`), timeout: 300000, clip: CLIP }); console.log(`[${secs()}] ldr-${P}-zoom.png`);
  await ctx.close();
} catch (e) { console.error(e); process.exitCode = 1; }
if (errs.length) console.log(errs.slice(0, 20).join('\n'));
await browser.close(); server.close();
