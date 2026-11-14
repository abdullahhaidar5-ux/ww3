// Sound-mix test (runs in the cigate "audio" job after orch/audio.mjs). Measures what actually reaches the speakers.
// Every node the game connects to the sound output is also tapped by a meter, so the test does not depend on how the
// mixer is wired inside. It boots a battle, drives ~300 units into one fight under the camera and checks:
//   1) no clipping: the summed output never exceeds full scale, with shots, explosions, music and unit voices together
//   2) the limiter is a safety net, not a pump: it holds back less than 6 dB on average during the fight
//   3) orders stay audible: while a unit voice line plays, effects and music are ducked, and they come back afterwards
//   4) voices go through the mixer (voice bus) and not straight to the output
//   5) the quiet battlefield bed (wind for the map's biome + distant fighting) is present but well below the weapons
//   6) every button clicks: a menu button with no sound of its own still makes the UI click (and only one per press)
//   7) no page errors, no AU.err
//   node orch/mixtest.mjs [--no-lock] [--info]   # prints MIX PASS / FAIL (--info: print numbers only, never fail)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INFO = process.argv.includes('--info');
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
if (!process.argv.includes('--no-lock')) await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const type = MIME[path.extname(f)] || 'application/octet-stream', size = fs.statSync(f).size, m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) { const a = m[1] ? +m[1] : size - +m[2], b = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${size}`, 'content-length': b - a + 1 });
    return fs.createReadStream(f, { start: a, end: b }).pipe(res); }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const bctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
await guardContext(bctx);
const page = await bctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
// meter: everything connected to an AudioContext's destination is also summed into window.__MIX.tap(ctx)
await page.addInitScript(() => {
  const M = window.__MIX = { taps: new Map(), direct: [], m: {} };
  M.tap = c => { let g = M.taps.get(c); if (!g) { g = c.createGain(); M.taps.set(c, g); } return g; };
  const oc = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dst, ...a) {
    const r = oc.call(this, dst, ...a);
    try { if (dst && dst === this.context.destination && !this.__tapped) { this.__tapped = 1; M.direct.push(this.constructor.name); oc.call(this, M.tap(this.context)); } } catch (e) {}
    return r;
  };
  // a meter on any node: peak and mean-square, polled by M.poll()
  M.add = (name, node) => { const c = node.context, a = c.createAnalyser(); a.fftSize = 16384; oc.call(node, a); M.m[name] = { a, buf: new Float32Array(a.fftSize), peak: 0, sq: 0, n: 0, hi: 0 }; };
  M.reset = () => { for (const k in M.m) { const m = M.m[k]; m.peak = 0; m.sq = 0; m.n = 0; m.hi = 0; } M.gr = 0; M.grN = 0; M.grMax = 0; };
  M.poll = () => { for (const k in M.m) { const m = M.m[k]; m.a.getFloatTimeDomainData(m.buf); let p = 0, s = 0; for (let i = 0; i < m.buf.length; i += 1) { const v = m.buf[i], x = v < 0 ? -v : v; if (x > p) p = x; s += v * v; } if (p > m.peak) m.peak = p; if (p >= .999) m.hi++; m.sq += s / m.buf.length; m.n++; }
    try { const L = AU.lim; if (L) { const r = -L.reduction; M.gr += r; M.grN++; if (r > M.grMax) M.grMax = r; } } catch (e) {} };
  M.read = () => { const o = {}; for (const k in M.m) { const m = M.m[k]; o[k] = { peak: +m.peak.toFixed(3), rms: +(Math.sqrt(m.sq / Math.max(1, m.n))).toFixed(4), n: m.n, hi: m.hi }; } o.gr = M.grN ? +(M.gr / M.grN).toFixed(2) : null; o.grMax = M.grMax ? +M.grMax.toFixed(1) : 0; return o; };
});
const res = [], fails = [];
const ok = (name, cond, info) => { res.push(`${cond ? 'ok  ' : (INFO ? 'info' : 'FAIL')} ${name}${info ? ' — ' + info : ''}`); if (!cond && !INFO) fails.push(name); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dB = v => v > 0 ? (20 * Math.log10(v)).toFixed(1) + ' dB' : '-inf';
// measure for `sec` seconds while `during` (a string evaluated every poll) runs in the page
async function measure(sec, during, frozen) {
  await page.evaluate(() => __MIX.reset());
  // the page's own loop is stopped (software rendering is far too slow on test machines); the battle is stepped here in real time
  const t0 = Date.now(); let last = t0;
  while (Date.now() - t0 < sec * 1000) { const now = Date.now(), dt = Math.min(.25, (now - last) / 1000); last = now;
    await page.evaluate(([d, dt, fz]) => { if (d) (0, eval)(d); if (G && fz) droneAudio(dt); else if (G && !G.over) { if (window.__fc) centerOn(__fc.x, __fc.y, true); for (const e of G.ents) e.vis = true; for (let t = dt; t > 0; t -= .05) simUpdate(Math.min(.05, t)); droneAudio(dt); } __MIX.poll(); }, [during || '', dt, !!frozen]); await sleep(60); }
  return page.evaluate(() => __MIX.read());
}
try {
  await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof AU === 'object', null, { timeout: 60000 });
  await page.evaluate(() => { try { localStorage.removeItem('ww3_sndtrk'); localStorage.removeItem('ww3_settings'); } catch (e) {} });
  await page.mouse.click(640, 30);
  await page.waitForFunction(() => AU.ctx && AU.ctx.state === 'running', null, { timeout: 20000 });

  // 6) a plain button (no sound of its own) clicks once
  const ui = await page.evaluate(async () => {
    const b = document.createElement('button'); b.textContent = 'mix test'; b.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999'; document.body.appendChild(b);
    const n0 = AU.uiN || 0; b.click(); await new Promise(r => setTimeout(r, 80)); const one = (AU.uiN || 0) - n0;
    b.addEventListener('click', () => sfxUI(660)); const n1 = AU.uiN || 0; b.click(); await new Promise(r => setTimeout(r, 80)); const own = (AU.uiN || 0) - n1;
    b.disabled = true; const n2 = AU.uiN || 0; b.click(); await new Promise(r => setTimeout(r, 80)); const off = (AU.uiN || 0) - n2; b.remove();
    return { one, own, off };
  });
  ok('6) a button with no sound of its own makes one UI click', ui.one === 1, JSON.stringify(ui));
  ok('6) a button that already plays a UI sound does not double it', ui.own === 1, JSON.stringify(ui));

  // battle: two nations on the default map, then two big columns meet under the camera (as orch/smooth.mjs)
  await page.evaluate(() => { try { SET.gfx = 'low'; applyGfx(); } catch (e) {} setup.p = 'IR'; setup.a = 'US'; setup.n = 1; startSingle(); if (G && G.teams[0]) G.teams[0].ai = mkAI(1); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
  await page.evaluate(() => { window.__stopLoop = true; }); await sleep(300);
  const info = await page.evaluate(() => {
    const kinds = ['inf', 'inf', 'inf', 'at', 'tank', 'tank', 'aa', 'arty'], cx = MAPW / 2, cy = MAPH / 2;
    for (const T of G.teams) { if (T.dead || T.reb) continue; const side = T.id % 2 ? 1 : -1;
      for (let i = 0; i < 150; i++) { const k = kinds[i % kinds.length]; const p = nearestPassXY('ground', cx + side * (150 + (i % 8) * 22), cy + Math.floor(i / 8) * 20 - 180) || [cx, cy];
        try { const u = addUnit(T.id, k, p[0], p[1]); if (u) setMove(u, cx - side * 400, p[1], 'amove'); } catch (e) {} } }
    centerOn(cx, cy, true); window.vis = () => true;
    window.__sc = { shot: 0, boom: 0, fx: 0 }; { const a = sfxShot, b = sfxBoom, f = fxPlay; sfxShot = function () { __sc.shot++; return a.apply(this, arguments); }; sfxBoom = function () { __sc.boom++; return b.apply(this, arguments); }; fxPlay = function (t, a) { __sc.fx++; __sc[t] = (__sc[t] || 0) + 1; if (t === 'muz' && a) { const F = window.__fc || (window.__fc = { x: a[0], y: a[1] }); F.x += (a[0] - F.x) * .05; F.y += (a[1] - F.y) * .05; } return f.apply(this, arguments); }; }
    const c = AU.ctx; __MIX.add('out', __MIX.tap(c)); __MIX.add('sfx', AU.sfxD); __MIX.add('mus', AU.musD); if (AU.vox) __MIX.add('vox', AU.vox);
    let u = 0; for (const e of G.ents) if (!e.dead && !e.isB) u++; return { units: u, theme: G.map.theme, direct: __MIX.direct.slice(), vox: !!AU.vox, lim: !!AU.lim };
  });
  console.log('battle:', JSON.stringify(info));
  // let the columns meet (the page's own loop runs the battle)
  await page.evaluate(() => { const on = AU.sfxOn; AU.sfxOn = false; for (let i = 0; i < 60 && !G.over; i++) simUpdate(.05); AU.sfxOn = on; });
  await measure(4, '');  // sounds settle in (sprite sheet and loops load)
  // the fight, with a unit voice line every ~2.5 s and the camera kept on the fighting
  const sc0 = await page.evaluate(() => ({ ...__sc }));
  const fight = await measure(24, `if(!window.__sv||performance.now()-window.__sv>2500){window.__sv=performance.now();AU.lastVoice=0;speak((window.__sk=((window.__sk||0)+1))%3);}`);
  const st = await page.evaluate(() => ({ heat: +AU.heat.toFixed(2), nv: SFX.nv, cap: SFX.cap, st: SFX.st, err: AU.err || '', units: G.ents.filter(e => !e.dead && !e.isB).length, t: +G.t.toFixed(0), calls: __sc, near: G.ents.filter(e => !e.dead && !e.isB && Math.hypot(e.x - cam.x, e.y - cam.y) < 900).length, farH: +(AU.farH || 0).toFixed(2), cam: [cam.x | 0, cam.y | 0, cam.dist | 0, MAPW, MAPH], sp: JSON.stringify(spatial(MAPW / 2, MAPH / 2)), on: [auOn(), AU.sfxOn, !!G.headless] }));
  console.log('fight :', JSON.stringify(fight), JSON.stringify(st), 'in window: shots ' + (st.calls.shot - sc0.shot) + ' booms ' + (st.calls.boom - sc0.boom));
  ok('1) no clipping in a 300-unit fight (output peak below full scale)', fight.out.peak < 0.999 && fight.out.hi === 0, 'peak ' + dB(fight.out.peak) + ', rms ' + dB(fight.out.rms));
  ok('1) the fight is actually loud enough to be a test (effects bus active)', fight.sfx.rms > 0.01, 'sfx rms ' + dB(fight.sfx.rms));
  ok('2) limiter is a safety net (average hold-back under 6 dB)', info.lim && fight.gr !== null && fight.gr < 6, 'avg ' + fight.gr + ' dB, max ' + fight.grMax + ' dB');
  ok('4) voices go through the mixer, nothing but the final stage feeds the output', info.vox && info.direct.length <= 2, 'direct: ' + info.direct.join(','));

  // 3) ducking: effects/music gain while a voice line plays vs after
  const duckv = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); await w(3500); const before = [AU.sfxD.gain.value, AU.musD.gain.value];
    AU.lastVoice = 0; AU.heat = 0; speak(1); await w(450); const during = [AU.sfxD.gain.value, AU.musD.gain.value]; await w(5000); const after = [AU.sfxD.gain.value, AU.musD.gain.value];
    return { before, during, after };
  });
  const f2 = a => a.map(v => +v.toFixed(2)).join('/');
  ok('3) a voice line ducks effects slightly and music more', duckv.during[0] < .85 && duckv.during[0] > .45 && duckv.during[1] < duckv.during[0] + .01, 'effects/music ' + f2(duckv.before) + ' -> ' + f2(duckv.during) + ' -> ' + f2(duckv.after));
  ok('3) and they come back afterwards', duckv.after[0] > .95 && duckv.after[1] > .95, f2(duckv.after));
  if (fight.vox) ok('3) voices sit above the effects bed in the fight', fight.vox.peak > 0.05, 'voice peak ' + dB(fight.vox.peak) + ' rms ' + dB(fight.vox.rms) + ' vs effects rms ' + dB(fight.sfx.rms));

  // 5) quiet bed: freeze the battle's guns (everyone holds fire far apart is not possible cheaply) -> remove the units, keep the map
  await page.evaluate(() => { for (const e of G.ents) if (!e.isB && !e.dead) { e.hp = 0; e.dead = true; } AU.heat = 0; window.__cool = setInterval(() => { AU.heat = 0; }, 100); });
  await measure(9, '', true);  // the battle is frozen; only the sound bed keeps running and the fight's tails die away
  const bed = await page.evaluate(() => ({ loops: Object.keys(SFX.loops).filter(k => k[0] !== '_').map(k => k + ':' + SFX.loops[k].gn.gain.value.toFixed(3)).join(' '), amb: typeof AMB !== 'undefined' && AMB.g ? AMB.k : '', bed: typeof AMB !== 'undefined' && AMB.g ? +AMB.g.gain.value.toFixed(3) : 0 }));
  const calm = await measure(6, '', true);
  console.log('calm  :', JSON.stringify(calm), JSON.stringify(bed));
  ok('5) quiet battlefield bed is present when nothing fires', calm.sfx.rms > 0.0015, 'effects rms ' + dB(calm.sfx.rms) + ' (' + bed.loops + ', biome bed ' + bed.bed + ')');
  ok('5) and is well below the weapons (at least 12 dB under the fight, and under -34 dB)', calm.sfx.rms < fight.sfx.rms * 0.25 && calm.sfx.rms < 0.02, dB(calm.sfx.rms) + ' vs ' + dB(fight.sfx.rms));
  ok('5) the bed follows the map biome', bed.amb === info.theme, 'bed ' + bed.amb + ', map ' + info.theme);
  const e2 = await page.evaluate(() => AU.err || '');
  ok('7) no audio error reported by the game', !e2, e2);
  ok('7) no page errors', errs.length === 0, errs.join(' ; '));
} catch (e) { fails.push('exception: ' + (e.stack || e)); }
for (const r of res) console.log(r);
await browser.close(); server.close();
if (fails.length) { console.log('MIX FAIL: ' + fails.join('; ')); process.exit(1); }
console.log(INFO ? 'MIX INFO' : 'MIX PASS');
process.exit(0);
