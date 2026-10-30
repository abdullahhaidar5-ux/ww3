// Infantry walk test: soldiers of several nations walk N, E, S, W and diagonally; both feet are tracked through bone
// world matrices over a full stride and must swing along the direction of travel (within 20 degrees), the body must
// face where it walks (within 20 degrees), and the feet must not cross through each other. Arms: the rifle is carried in
// front (support hand ahead of the hips) and any hand motion runs along the walking direction (within 20 degrees once the
// hands travel more than .15); planted feet don't slide (at most 35% of ground speed); the body never rolls (2 degrees).
// Soldiers move at real infantry speed. Desktop and phone
// (390x844), three zoom levels. Usage: node orch/walktest.mjs [--html other.html] [--shots tag]   -> WALKTEST PASS/FAIL
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
const TAG = argS('shots', '');
const HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.join(ROOT, 'orch', 'shots', process.env.WALK_SHOTS || 'infantry-walk');

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
await acquireBrowserLock('walktest');
const dir = TAG ? path.join(OUT, TAG) : null; if (dir) fs.mkdirSync(dir, { recursive: true });
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
const TOL = 20;
// one battle per scene; soldiers of both teams (so all three uniform models: western, eastern, militia)
const SCENES = [['fulda', 'US', 'RU'], ['fulda', 'DW', 'IR'], ['golan', 'RS', 'EU']];
const DIRS = [['E', 0], ['S', Math.PI / 2], ['W', Math.PI], ['N', -Math.PI / 2], ['NE', -Math.PI / 4]];
let fails = 0; const lines = [];
async function runScene(page, sc, zooms, tagp) {
  const [map, p, a] = sc;
  await page.evaluate(async ([map, p, a]) => {
    if (G) G.over = true; Object.assign(setup, { map, n: 1, p, a, others: [], tm: [], slot: -1, seed: 4242 });
    startSingle(); const w0 = performance.now(); while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    G.paused = true; G.ents = G.ents.filter(e => e.isB);
  }, [map, p, a]);
  for (const dist of zooms) {
    const res = await page.evaluate(([dist, DIRS]) => {
      G.ents = G.ents.filter(e => e.isB);
      const [bx, by] = BASES[0]; const x0 = Math.max(700, Math.min(MAPW - 700, bx + 260)), y0 = Math.max(700, Math.min(MAPH - 700, by + 80));
      const U = []; let i = 0;
      for (const t of [0, 1]) for (const [nm, d] of DIRS) { const u = addUnit(t, 'inf', x0 - 120 + (i % 5) * 60, y0 - 40 + (i / 5 | 0) * 70); i++; u.x -= Math.cos(d) * u.s.spd * .83; u.y -= Math.sin(d) * u.s.spd * .83; /* centre the 1.7 s path on the spot */ u.ang = u.va = d; u.ox = u.x; u.oy = u.y; if (u.vs) u.vs.fill(true); u.vis = true; u.order = null; u.target = null; U.push({ u, nm, d, t }); }
      cam.dist = cam.td = dist; cam.x = cam.tx = x0; cam.y = cam.ty = y0 + 15; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist;
      const step = dt => { G.t += dt; for (const { u, d } of U) { u.ang = u.va = d; u.x += Math.cos(d) * u.s.spd * dt; u.y += Math.sin(d) * u.s.spd * dt; u.ox = u.x; u.oy = u.y; u.mv = G.t; u.target = null; } G.alpha = 1; placeCam(); syncScene(dt); };
      for (let k = 0; k < 40; k++) step(1 / 60); // settle: turn to heading, ramp walk in
      const V = () => new THREE.Vector3(), tmp = V(), deg0 = r => r * 180 / Math.PI;
      const bonesOf = m => { const B = {}; m.userData.inner.traverse(o => { if (o.isBone) B[o.name] = o; }); return B; };
      const wp = b => { b.updateWorldMatrix(true, false); return tmp.setFromMatrixPosition(b.matrixWorld).clone(); };
      const N = 60, dt = 1 / 60; // one second at real infantry speed: more than a full stride
      const S = U.map(({ u }) => { const o = OBJ.get(u.id); const ms = o ? o.userData.parts.body.children.filter(m => m.userData.inner) : [];
        return { o, u, allIn: true, ms: ms.map(m => ({ m, B: bonesOf(m), f: [[], []], h: [[], []], fw: [[], []], mids: [], roll: 0, fwd: V(), lat: V(), cross: 0, minGap: 1e9 })), p0: o ? wp(o) : null }; });
      for (let k = 0; k < N; k++) { step(dt); for (const s of S) if (!inView(s.u.x, s.u.y, .05)) s.allIn = false;
        for (const s of S) for (const q of s.ms) { const B = q.B; if (!B.footL) continue;
          const hl = wp(B.uplegL), hr = wp(B.uplegR), mid = hl.clone().add(hr).multiplyScalar(.5), fl = wp(B.footL), fr = wp(B.footR);
          q.f[0].push(fl.clone().sub(mid)); q.f[1].push(fr.clone().sub(mid)); q.fw[0].push(fl.clone().setY(fl.y - s.o.position.y)); q.fw[1].push(fr.clone().setY(fr.y - s.o.position.y)); q.mids.push(mid.clone());
          { const up = new THREE.Vector3(0, 1, 0).transformDirection(q.m.matrixWorld), l = hr.clone().sub(hl); l.y = 0; l.normalize(); q.roll = Math.max(q.roll, Math.abs(deg0(Math.asin(Math.max(-1, Math.min(1, up.dot(l))))))); }
          if (B.handL && B.handR) { q.h[0].push(wp(B.handL).sub(mid)); q.h[1].push(wp(B.handR).sub(mid)); }
          const lat = hr.clone().sub(hl); lat.y = 0; lat.normalize(); q.lat.add(lat);
          const tl = B.LeftToeBase || B.footL.children.find(c => c.isBone), tr = B.RightToeBase || B.footR.children.find(c => c.isBone);
          if (tl && tr) { const f = wp(tl).sub(fl).add(wp(tr).sub(fr)); f.y = 0; q.fwd.add(f); }
          // signed lateral position of each foot: left must stay left of right (no leg crossing through the other)
          const gl = fl.clone().sub(fr).dot(lat); q.minGap = Math.min(q.minGap, -gl);
        } }
      const deg = r => r * 180 / Math.PI;
      const out = [];
      U.forEach(({ u, nm, t }, j) => { const s = S[j]; if (!s.o) { out.push({ nm, t, err: 'no 3D object' }); return; }
        if (!s.allIn) return; // off screen for part of the stride: not posed then, by design
        const p1 = wp(s.o), mv = p1.sub(s.p0); mv.y = 0; const md = Math.atan2(mv.z, mv.x);
        for (const q of s.ms) {
          if (!q.f[0].length) { out.push({ nm, t, key: '', err: 'no foot bones' }); continue; }
          let sw = 0, amp = 0;
          for (const F of q.f) { // principal horizontal axis of the foot path (2x2 covariance)
            let cx = 0, cz = 0; for (const v of F) { cx += v.x; cz += v.z; } cx /= F.length; cz /= F.length;
            let xx = 0, zz = 0, xz = 0; for (const v of F) { const dx = v.x - cx, dz = v.z - cz; xx += dx * dx; zz += dz * dz; xz += dx * dz; }
            const th = .5 * Math.atan2(2 * xz, xx - zz); let e = Math.abs(deg(Math.atan2(Math.sin(th - md), Math.cos(th - md)))); if (e > 90) e = 180 - e;
            sw = Math.max(sw, e); amp = Math.max(amp, 2 * Math.sqrt((xx + zz) / F.length));
          }
          // arms: principal horizontal axis of each hand's path (only judged when the hands actually move)
          let asw = 0, aamp = 0;
          for (const F of q.h) { if (!F.length) continue;
            let cx = 0, cz = 0; for (const v of F) { cx += v.x; cz += v.z; } cx /= F.length; cz /= F.length;
            let xx = 0, zz = 0, xz = 0; for (const v of F) { const dx = v.x - cx, dz = v.z - cz; xx += dx * dx; zz += dz * dz; xz += dx * dz; }
            const a2 = 2 * Math.sqrt((xx + zz) / F.length); aamp = Math.max(aamp, a2);
            const th = .5 * Math.atan2(2 * xz, xx - zz); let e = Math.abs(deg(Math.atan2(Math.sin(th - md), Math.cos(th - md)))); if (e > 90) e = 180 - e;
            if (a2 > .15) asw = Math.max(asw, e);
          }
          // the rifle is carried in front: the support (left) hand must be ahead of the hips along the walking direction
          const dx = Math.cos(md), dz = Math.sin(md); let hf = 0; if (q.h[0].length) { for (const v of q.h[0]) hf += v.x * dx + v.z * dz; hf /= q.h[0].length; }
          // planted feet must not slide: while a foot is down (within .3 of its lowest point above the ground under the soldier)
          // it moves at most 35% of the ground speed (median over those frames: a landing foot touches down moving forward)
          const sl = []; let slip = 0, ns = 0; const gsp = Math.hypot(q.mids[q.mids.length - 1].x - q.mids[0].x, q.mids[q.mids.length - 1].z - q.mids[0].z) / (q.mids.length - 1);
          for (const F of q.fw) { const lo = Math.min(...F.map(v => v.y)); for (let i = 1; i < F.length; i++) if (F[i].y < lo + .3 && F[i - 1].y < lo + .3) sl.push(Math.hypot(F[i].x - F[i - 1].x, F[i].z - F[i - 1].z) / Math.max(1e-6, gsp)); }
          sl.sort((x, y) => x - y); slip = sl.length ? sl[sl.length >> 1] : 1; ns = sl.length;
          const fa = Math.atan2(q.fwd.z, q.fwd.x); let fe = Math.abs(deg(Math.atan2(Math.sin(fa - md), Math.cos(fa - md))));
          out.push({ nm, t, fac: G.teams[t].fac, swing: +sw.toFixed(1), face: +fe.toFixed(1), amp: +amp.toFixed(2), gap: +q.minGap.toFixed(2), aswing: +asw.toFixed(1), aamp: +aamp.toFixed(2), hf: +hf.toFixed(2), slip: +slip.toFixed(2), roll: +q.roll.toFixed(1), anim: !!q.m.userData.legs });
        } });
      return { dist, out };
    }, [dist, DIRS]);
    const moving = dist < 760; // legs animate only when near enough (far away they stand still, by design)
    for (const r of res.out) {
      const bad = r.err ? r.err : !moving ? '' : [r.swing > TOL && `legs swing ${r.swing}° off the walking direction`, r.face > TOL && `body faces ${r.face}° off`, r.gap < 0 && 'feet cross', r.amp < .8 && `stride too small (${r.amp})`, r.aswing > TOL && `arms/rifle sway ${r.aswing}° off the walking direction`, r.hf < 1 && `rifle not carried in front (support hand ${r.hf} ahead of hips)`, r.slip > .35 && `feet slide (${r.slip} of ground speed)`, r.roll > 2 && `body rolls sideways ${r.roll}°`, !r.anim && 'no walk rig'].filter(Boolean).join(', ');
      if (bad) { fails++; lines.push(`FAIL ${tagp} ${map} ${r.fac} ${r.nm} zoom ${dist}: ${bad}`); }
    }
    const w = res.out.filter(r => !r.err); if (w.length < (tagp === 'phone' && dist < 300 ? 8 : 12)) { fails++; lines.push(`FAIL ${tagp} ${map} zoom ${dist}: only ${w.length} soldiers on screen`); } const mx = k => Math.max(...w.map(r => r[k]));
    console.log(`[${secs()}] ${tagp} ${map}:${p}/${a} zoom ${dist}: ${w.length} soldiers, worst swing ${mx('swing')}°, worst facing ${mx('face')}°, min stride ${Math.min(...w.map(r => r.amp))}, min foot gap ${Math.min(...w.map(r => r.gap))}, arms: worst swing ${mx('aswing')}°, hand travel ${Math.min(...w.map(r => r.aamp))}-${mx('aamp')}, support hand ahead ${Math.min(...w.map(r => r.hf))}, foot slip ${mx('slip')}, body roll ${mx('roll')}°`);
    if (dir && dist === zooms[0] && !process.env.NOSNAP) await snap(page, `${tagp}-${map}-${p}`, dist);
  }
}
async function snap(page, name) {
  await page.evaluate(() => { for (let k = 0; k < 3; k++) renderFrame(1 / 60); });
  await page.screenshot({ path: path.join(dir, name + '-game.png'), timeout: 180000 });
  // side-on: camera low and beside the eastbound soldiers
  await page.evaluate(() => { const e = G.ents.find(e => !e.isB && Math.abs(e.va) < .01); if (!e) return; const o = OBJ.get(e.id); const p = o.position;
    const pc = window.placeCam; window.placeCam = () => { CAM.position.set(p.x + 6, p.y + 10, p.z + 90); CAM.lookAt(p.x + 6, p.y + 7, p.z); CAM.updateMatrixWorld(); };
    try { renderFrame(0); } finally { window.placeCam = pc; } });
  await page.screenshot({ path: path.join(dir, name + '-side.png'), timeout: 180000 });
}
try {
  for (const [tagp, opts, zooms, scenes] of [
    ['desktop', { viewport: { width: 1280, height: 720 } }, [232, 450, 700], SCENES],
    ['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, [232, 600], SCENES.slice(0, 2)]]) {
    const { ctx, page } = await open(opts);
    for (const sc of scenes) await runScene(page, sc, zooms, tagp);
    await ctx.close();
  }
} catch (e) { console.error(e); fails++; lines.push('FAIL harness: ' + (e.message || e)); }
if (errs.length) console.log(errs.slice(0, 10).join('\n'));
console.log(lines.slice(0, 30).join('\n'));
console.log(fails ? `WALKTEST FAIL (${fails})` : 'WALKTEST PASS');
await browser.close(); server.close(); process.exit(fails ? 1 : 0);
