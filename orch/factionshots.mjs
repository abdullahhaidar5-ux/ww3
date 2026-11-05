// Faction-looks close-ups (ground row + air/sea row per nation; PC and phone/Low). Based on gfxshots.mjs. Old header: before/after close-ups: the same lineup of units for three pairs of nations, same
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
const OUT = path.join(ROOT, 'orch', 'shots', argS('dir','faction-looks'));
const MAPS = argS('maps', 'strait,arctic,fulda,gulf,zagros,emirates,dmz').split(',').filter(Boolean);
const SEED = 4242;

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
  page.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/net::|Failed to load|AudioContext|autoplay|speech|WebSocket|peer/i.test(t)) errs.push(m.type() + ': ' + t.slice(0, 300)); });
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
async function snap(page, name) { await page.screenshot({ path: path.join(dir, name + '.png'), timeout: 300000 }); console.log(`[${secs()}] ${TAG}/${name}.png`); }

const FACS = argS('facs', 'IR,KP,RU,US').split(',');
const LINE1 = ['tank', 'arty', 'aa', 'jeep'], LINE2 = (argS('line2', 'heli,jet,drone,boat,ship')).split(',');
async function lineup(page, fac, tagn, d) {
  const other = fac === 'US' ? 'RU' : 'US';
  await battle(page, 'fulda', fac, other, 2);
  await page.evaluate(([l1, l2]) => { G.paused = true; G.ents = G.ents.filter(e => e.isB);
    const [bx, by] = BASES[0]; const x = Math.max(700, Math.min(MAPW - 700, bx + 260)), y = Math.max(700, Math.min(MAPH - 700, by + 80));
    const put = (kd, px, py) => { try { const u = addUnit(0, kd, px, py); u.ox = u.x; u.oy = u.y; if (u.vs) u.vs[0] = true; u.ang = u.va = -Math.PI / 2; } catch (e) { console.warn('lineup', kd, e.message); } };
    l1.forEach((kd, i) => put(kd, x - 70 + i * 46, y + 10)); l2.forEach((kd, i) => put(kd, x - 90 + i * 60, y + 85));
    window.__at = [x, y]; }, [LINE1, LINE2]);
  await page.evaluate(([d]) => { const [x, y] = window.__at; cam.dist = cam.td = d; cam.x = cam.tx = x; cam.y = cam.ty = y + 40; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; }, [d]);
  await frames(page, 4); await snap(page, `${tagn}-${fac}`);
}
// --solo tank,jet,...: one close-up per unit kind, camera centred on the rendered model (air units fly high);
// --dmg 0.3 sets every unit's hp to that fraction first so the battle-damage smoke shows.
async function solo(page, fac, tagn, kinds, dmg) {
  const other = fac === 'US' ? 'RU' : 'US';
  await battle(page, 'fulda', fac, other, 2);
  for (const kd of kinds) {
    const ok = await page.evaluate(([kd, dmg]) => { G.paused = true; G.ents = G.ents.filter(e => e.isB);
      const [bx, by] = BASES[0]; const x = Math.max(700, Math.min(MAPW - 700, bx + 260)), y = Math.max(700, Math.min(MAPH - 700, by + 80));
      let px = x, py = y; if (/ship|boat|sub|lander/.test(kd) && G.map.isWater) { outer: for (let r = 100; r < 4000; r += 60) for (let a = 0; a < 6.28; a += .2) { const qx = x + Math.cos(a) * r, qy = y + Math.sin(a) * r; if (qx > 200 && qy > 200 && qx < MAPW - 200 && qy < MAPH - 200 && G.map.isWater(qx, qy) && G.map.isWater(qx + 80, qy) && G.map.isWater(qx - 80, qy) && G.map.isWater(qx, qy + 80) && G.map.isWater(qx, qy - 80)) { px = qx; py = qy; break outer; } } }
      let u; try { u = addUnit(0, kd, px, py); } catch (e) { return false; } u.ox = u.x; u.oy = u.y; if (u.vs) u.vs[0] = true; u.ang = u.va = -Math.PI * .8;
      if (dmg) u.hp = u.max * dmg; window.__u = u; const d = dmg ? 260 : { jet: 70, heli: 80, ship: 170, boat: 80, drone: 75 }[kd] || 75;
      cam.dist = cam.td = d; cam.x = cam.tx = x; cam.y = cam.ty = y; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; return true; }, [kd, dmg]);
    if (!ok) continue;
    await page.evaluate(() => { cam.tilt = -.55; });
    await frames(page, 2);
    if (kd === 'drone') await page.evaluate(() => { const o = OBJ.get(window.__u.id); if (o) { o.userData.yaw = o.userData.pyd = window.__u.va; } });
    if (kd === 'drone') console.log('drone', await page.evaluate(() => { const o = OBJ.get(window.__u.id); return o ? JSON.stringify([o.rotation.x, o.rotation.y, o.rotation.z, o.rotation.order, o.children[0].rotation.toArray(), o.position.y - groundH(window.__u.x, window.__u.y), o.userData.dp]) : 'none'; }));
    await page.evaluate(([base]) => { const o = OBJ.get(window.__u.id); if (!o) return; const h = o.position.y, ux = o.position.x, uz = o.position.z;
      const pf = d => { const kz = Math.max(0, Math.min(1, (d - 230) / 370)); return Math.max(.22, Math.min(1.42, Math.max(.34 + kz * .44, Math.asin(Math.min(1, 112 / d))) + (cam.tilt || 0))); };
      let d = base; for (let i = 0; i < 8; i++) { const p = pf(d); d = h / Math.sin(p) + base; } const p = pf(d);
      cam.dist = cam.td = d; cam.x = cam.tx = ux; cam.y = cam.ty = uz - h / Math.tan(p); cam._xl = cam.x; cam._yl = cam.y; cam._dl = d; }, [await page.evaluate(() => cam.dist)]);
    if (dmg) { await page.evaluate(() => { for (let i = 0; i < 40; i++) { G.t += 1 / 30; renderFrame(1 / 30); } }); console.log('parts', await page.evaluate(() => PARTS.length + ' near ' + PARTS.filter(p => Math.hypot(p.x - window.__u.x, p.y - window.__u.y) < 60).length + ' G.paused ' + G.paused + ' hp ' + window.__u.hp + '/' + window.__u.max)); }
    if (argS('ab', '')) { await page.evaluate(() => { const u = window.__u, o = OBJ.get(u.id); if (o) o.userData.abk = 1; }); console.log('nozzles', await page.evaluate(() => { const o = OBJ.get(window.__u.id), g = o && o.userData.parts.glow; return g ? JSON.stringify(g.children.map(c => [c.position.x, c.position.y, c.position.z, c.userData.r].map(v => +(+v).toFixed(2)))) : 'none'; })); }
    await frames(page, 3); await snap(page, `${tagn}-${fac}-${kd}${dmg ? '-dmg' : ''}`);
    await page.evaluate(() => { G.ents = G.ents.filter(e => e !== window.__u); });
  }
}
try {
  const SOLO = argS('solo', '');
  if (SOLO) { const { ctx, page } = await open(argS('phone', '') ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 720 } });
    if (argS('phone', '')) await page.evaluate(() => { for (const b of document.querySelectorAll('button')) if (/^skip$/i.test(b.textContent.trim())) b.click(); });
    if (argS('low', '')) await page.evaluate(() => { SET.gfx = 'low'; });
    for (const f of FACS) await solo(page, f, argS('low', '') ? 'low' : 'pc', SOLO.split(','), +argS('dmg', '0'));
    await ctx.close(); if (errs.length) console.log(errs.slice(0, 20).join('\n')); await browser.close(); server.close(); process.exit(0); }
  let { ctx, page } = await open({ viewport: { width: 1280, height: 720 } });
  for (const f of FACS) await lineup(page, f, 'pc', 150);
  await ctx.close();
  if (!argS('nophone', '')) {
    ({ ctx, page } = await open({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }));
    await page.evaluate(() => { SET.gfx = 'low'; });
    for (const f of FACS.filter(f => f === 'IR' || f === 'US')) await lineup(page, f, 'phone', 160);
    await ctx.close();
  }
} catch (e) { console.error(e); process.exitCode = 1; }
if (errs.length) console.log(errs.slice(0, 20).join('\n'));
await browser.close(); server.close();
