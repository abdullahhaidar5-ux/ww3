// Graphics Phase 2 infantry close-ups (derived from gfxshots.mjs): same seed/camera before and after.  // Graphics Phase 2 (real unit models) before/after close-ups: the same lineup of units for three pairs of nations, same
// seed and camera, rendered by a given index.html.  node orch/gfxshots.mjs --html /tmp/before.html --tag before ; node orch/gfxshots.mjs --tag after
// Writes orch/out/gfx-models/<tag>/*.png. Uses the machine-wide browser lock like smoke.mjs.
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
const OUT = path.join(ROOT, 'orch', 'shots', argS('out', 'gfx-infantry'));
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
const dir = path.join(OUT, TAG); fs.mkdirSync(dir, { recursive: true });
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
  page.on('console', m => { const t = m.text(); if (/^live blds|^bld /.test(t)) console.log(t); if ((m.type() === 'error' || m.type() === 'warning') && !/net::|Failed to load|AudioContext|autoplay|speech|WebSocket|peer/i.test(t)) errs.push(m.type() + ': ' + t.slice(0, 300)); });
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
// a paused lineup next to the player's base: the nation's tank, artillery, supply truck, AA, infantry squad, transport
// helicopter and special unit, in a row (one battle per nation, same seed and camera)
// --scenes map:P:A,map:P:A,... picks other lineups (e.g. fulda:UA:RU,fulda:TR:IR)
const SCENES = argS('scenes', '') ? argS('scenes', '').split(',').map(s => s.split(':'))
  : [['fulda', 'US', 'RU'], ['fulda', 'RU', 'US'], ['golan', 'IL', 'IR'], ['golan', 'IR', 'IL'], ['strait', 'CN', 'SA'], ['strait', 'DW', 'EU']];
try {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  for (const [k, p, a] of SCENES) {
    await battle(page, k, p, a, LIVE || 2);
    if (LIVE) { await page.evaluate(() => { G.paused = true; const T0 = G.ents.filter(e => e.isB && e.team === 0 && !e.dead); const hq = T0.find(e => e.kind === 'hq') || T0[0] || { x: BASES[0][0], y: BASES[0][1] }; window.__at = [hq.x, hq.y]; console.log('live blds', T0.map(e => e.kind).join(',')); }); }
    else await page.evaluate(([ISBLD, BKINDS]) => { G.paused = true; G.ents = G.ents.filter(e => e.isB && !ISBLD);
      const [bx, by] = BASES[0]; const BLD = ISBLD; const x = BLD ? bx : Math.max(700, Math.min(MAPW - 700, bx + 260)), y = BLD ? by : Math.max(700, Math.min(MAPH - 700, by + 80));
      const kinds = t => BLD ? [] : ['inf', 'at', 'medic', 'sapper', 'officer', 'inf'];
      for (const t of [0]) kinds(t).forEach((kd, i) => { try { const u = addUnit(t, kd, x - 90 + i * 30, y + 40); u.ox = u.x; u.oy = u.y; if (u.vs) u.vs[0] = true; u.ang = u.va = t ? Math.PI / 2 : -Math.PI / 2; } catch (e) {} });
      if (BLD) { for (const [kd, dx, dy] of BKINDS) { try { const b = addBld(0, kd, x + dx, y + dy, true); } catch (er) { console.log('bld', kd, er.message); } } }
      window.__at = [x, y]; }, [ISBLD, BKINDS]);
    if (process.env.DBG) console.log(await page.evaluate(() => { const o=[]; const sc=SCN; sc.traverse(q=>{ if(q.isSkinnedMesh&&o.length<4){const m=q.material;o.push([m.type,m.color.r.toFixed(2),m.color.g.toFixed(2),m.color.b.toFixed(2),!!m.map,m.envMapIntensity,m.emissive&&m.emissive.getHexString(),q.parent&&q.parent.name]);}}); return JSON.stringify(o); }));
    for (const [nm, d, dy] of [ISBLD ? [LIVE ? 'live' : 'bld', DIST, 0] : ['inf', 232, 18]]) {
      await page.evaluate(([d, dy]) => { const [x, y] = window.__at; cam.dist = cam.td = d; cam.x = cam.tx = x; cam.y = cam.ty = y + dy; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; }, [d, dy]);
      await frames(page, 4); await snap(page, `${nm}-${k}-${p}-${a}`);
    }
  }
  await ctx.close();
} catch (e) { console.error(e); process.exitCode = 1; }
if (errs.length) console.log(errs.slice(0, 20).join('\n'));
await browser.close(); server.close();
