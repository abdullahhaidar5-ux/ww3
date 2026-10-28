// Before/after captures for the Three.js upgrade (r128 -> current): the same battles, same seeds, same camera, rendered
// by a given index.html, plus frame-time numbers. The simulation is deterministic and never reads rendering state, so a
// battle with the same seed and nations is the same battle in both builds; only the picture differs.
//
//   git show origin/main:index.html > /tmp/before.html
//   node orch/three/compare.mjs --html /tmp/before.html --tag before     # r128 build
//   node orch/three/compare.mjs --tag after                              # this branch's index.html
//   node orch/three/compare.mjs --sheet                                  # side-by-side contact sheets (Python + Pillow)
//
// Options: --maps strait,arctic   --close 0 (skip close-ups)   --perf 0 (skip frame timing)   --frames 20   --no-lock
// Writes orch/out/three/<tag>/*.png and perf.json. Uses the machine-wide browser lock like smoke.mjs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { acquireBrowserLock } from '../browserlock.mjs';
import { guardContext } from '../serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = argS('tag', 'after');
const HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.join(ROOT, 'orch', 'out', 'three');
const MAPS = argS('maps', 'strait,arctic,fulda,gulf,zagros,emirates,dmz').split(',').filter(Boolean);
// close-ups: [map, player nation, enemy nation]
const CLOSE = argS('close', '1') === '0' ? [] : [['fulda', 'US', 'RU'], ['golan', 'IR', 'IL'], ['dmz', 'RS', 'CN']];
const PERF = argS('perf', '1') !== '0';
const FRAMES = Number(argS('frames', 20));
const AIR = argS('air', '1') !== '0'; // Apache + F-16 close-up (US vs IL: US flies the Apache, IL the F-16)
const SEED = 4242;
const PHONEONLY = argS('phoneonly', '0') === '1'; // skip the desktop shots, phone frame times only

if (process.argv.includes('--sheet')) { sheet(); process.exit(0); }

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
await acquireBrowserLock('three-compare');
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
    // the sim draws from Math.random: seed it (one stream for setup, one for the fast-forward) so both builds play the
    // same battle; rendering in between gets the normal Math.random back
    const R0 = Math.random; window.__R0 = R0; window.__simR = mulberry(seed * 7 + 1);
    Math.random = mulberry(seed); try { startSingle(); } finally { Math.random = R0; } const w0 = performance.now();
    while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    Math.random = window.__simR; try { G.teams.forEach(T => { if (!T.ai) T.ai = mkAI(1); }); } finally { Math.random = R0; } G.paused = false;
    return { map: G.mapKey, facs: G.teams.map(T => T.fac), rev: THREE.REVISION, W: MAPW, H: MAPH };
  }, [map, p, a, SEED]);
  for (let done = 0; done < simSec * 60; done += 1800)
    await page.evaluate(k => { Math.random = window.__simR; try { for (let i = 0; i < k && G && !G.over; i++) simUpdate(1 / 60); } finally { Math.random = window.__R0; } for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1; }, Math.min(1800, simSec * 60 - done));
  return r;
}
// camera: 'overview' (zoomed all the way out over the middle of the map) or 'close' (the busiest fight, zoomed in)
async function aim(page, how) {
  return page.evaluate(how => {
    if (how === 'overview') { cam.dist = cam.td = 1800; cam.x = cam.tx = MAPW / 2; cam.y = cam.ty = MAPH / 2 + 500; }
    else {
      const us = G.ents.filter(e => !e.dead && !e.isB);
      let best = null, bs = -1;
      for (const e of us) { let m = 0, o = 0; for (const f of us) { const d = Math.hypot(f.x - e.x, f.y - e.y); if (d < 260) { if (f.team === e.team) m++; else o++; } } const s = Math.min(m, o) * 3 + m + o; if (s > bs) { bs = s; best = e; } }
      if (!best) best = G.ents.find(e => !e.dead && e.isB && e.team === 0);
      cam.dist = cam.td = 330; cam.x = cam.tx = best.x; cam.y = cam.ty = best.y + 60;
    }
    cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; return { x: cam.x | 0, y: cam.y | 0 };
  }, how);
}
async function frames(page, n) {
  return page.evaluate(n => { const gl = R3.getContext(), px = new Uint8Array(4), ts = [];
    for (let i = 0; i < n; i++) { const a = performance.now(); renderFrame(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - a); }
    return ts; }, n);
}
const stats = ts => { const s = ts.slice().sort((a, b) => a - b); return { median: +s[s.length >> 1].toFixed(1), mean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1), p90: +s[Math.floor(s.length * .9)].toFixed(1), n: s.length }; };
async function snap(page, name) { await page.screenshot({ path: path.join(dir, name + '.png'), timeout: 300000 }); console.log(`[${secs()}] ${TAG}/${name}.png`); }

const perf = { tag: TAG, html: path.relative(ROOT, HTML), when: new Date().toISOString() };
try {
  if (!PHONEONLY) {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 720 } });
  perf.rev = await page.evaluate(() => THREE.REVISION);
  console.log(`[${secs()}] booted three r${perf.rev}`);
  for (const k of MAPS) {
    const r = await battle(page, k, 'US', 'RU', 60);
    await aim(page, 'overview'); await frames(page, 3); await snap(page, `map-${k}`);
    console.log(`  ${r.map} ${r.facs.join(' vs ')} ${r.W}x${r.H}`);
  }
  for (const [k, p, a] of CLOSE) {
    await battle(page, k, p, a, 300);
    const at = await aim(page, 'close'); await frames(page, 3); await snap(page, `close-${k}-${p}-${a}`);
    if (PERF && k === CLOSE[0][0]) { perf.desktop = { scene: `close-up ${k} ${p} vs ${a} @${at.x},${at.y}, 1280x720 dpr1`, ...stats(await frames(page, FRAMES)) };
      await aim(page, 'overview'); perf.desktopOverview = { scene: `overview ${k}`, ...stats(await frames(page, FRAMES)) }; }
  }
  if (AIR) {
    await battle(page, 'golan', 'US', 'IL', 30);
    await page.evaluate(() => { G.paused = true; const [bx, by] = BASES[0]; const x = Math.max(600, Math.min(MAPW - 600, bx + 220)), y = Math.max(600, Math.min(MAPH - 600, by + 60));
      const h = addUnit(0, 'heli', x - 40, y), j = addUnit(1, 'jet', x + 50, y - 20); h.ox = h.x; h.oy = h.y; j.ox = j.x; j.oy = j.y; h.ang = h.va = .6; j.ang = j.va = 2.4;
      boomFX(x + 20, y + 110, 26, false); FXH.smoke(x - 120, y + 60, 40);
      for (let i = 0; i < 5; i++) FXH.tr(x - 40, y, 30, x + 140 + i * 8, y + 120, 2, false);
      window.__air = [x, y]; });
    // aircraft fly 55 (Apache) / 110 (jets) above the ground, which lifts them up the screen: aim north of them
    for (const [nm, d, dy] of [['air-apache-f16', 300, -70], ['air-wide', 520, -40]]) {
      await page.evaluate(([d, dy]) => { const [x, y] = window.__air; cam.dist = cam.td = d; cam.x = cam.tx = x; cam.y = cam.ty = y + dy; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; }, [d, dy]);
      await frames(page, 4); await snap(page, nm);
    }
  }
  await ctx.close();
  }
  if (PERF && CLOSE.length) {
    const [k, p, a] = CLOSE[0];
    const { ctx: c2, page: m } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    const cdp = await c2.newCDPSession(m);
    await battle(m, k, p, a, 300);
    const at = await aim(m, 'close'); await frames(m, 3);
    const q = await m.evaluate(() => ({ phone: gfxPhone(), lv: QUAL.lv, dpr, w: Math.round(VW * dpr), h: Math.round(VH * dpr) }));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    perf.phone = { scene: `close-up ${k} @${at.x},${at.y}, 390x844 x3, 4x CPU throttle, phone look=${q.phone} level ${q.lv}, ${q.w}x${q.h} px`, ...stats(await frames(m, FRAMES)) };
    // same picture in both builds whatever the battle did: the player's own base, fixed camera
    await m.evaluate(() => { const [bx, by] = BASES[0]; cam.dist = cam.td = 330; cam.x = cam.tx = bx; cam.y = cam.ty = by + 60; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; });
    await frames(m, 2); perf.phoneBase = { scene: `own base, fixed camera, same phone setup`, ...stats(await frames(m, FRAMES)) };
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await snap(m, `phone-${k}`);
    await c2.close();
  }
} catch (e) { errs.push('harness: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); }
await browser.close(); server.close();
perf.errors = [...new Set(errs)].slice(0, 40);
fs.writeFileSync(path.join(dir, PERF ? 'perf.json' : 'errors-' + Date.now() + '.json'), JSON.stringify(perf, null, 2));
console.log(JSON.stringify({ desktop: perf.desktop, desktopOverview: perf.desktopOverview, phone: perf.phone, phoneBase: perf.phoneBase }, null, 1));
for (const e of perf.errors) console.log('  ! ' + e);
console.log(`done in ${secs()}: orch/out/three/${TAG}/`);

// side-by-side sheets: before | after for every image both runs have, scaled down, labelled; plus per-pair PNGs
function sheet() {
  const py = `
import os,sys,json
from PIL import Image,ImageDraw
out=sys.argv[1];dst=sys.argv[2];os.makedirs(dst,exist_ok=True)
b=os.path.join(out,'before');a=os.path.join(out,'after')
names=sorted(n for n in os.listdir(a) if n.endswith('.png') and os.path.exists(os.path.join(b,n)))
rows=[]
for n in names:
  A=Image.open(os.path.join(b,n)).convert('RGB');B=Image.open(os.path.join(a,n)).convert('RGB')
  w=480 if A.width>A.height else 200;h=round(A.height*w/A.width)
  im=Image.new('RGB',(2*w+6,h+20),(17,17,17));d=ImageDraw.Draw(im)
  im.paste(A.resize((w,h),Image.LANCZOS),(0,20));im.paste(B.resize((w,h),Image.LANCZOS),(w+6,20))
  d.text((4,4),'r128  '+n[:-4],fill=(230,230,230));d.text((w+10,4),'r186  '+n[:-4],fill=(230,230,230))
  im.save(os.path.join(dst,n),optimize=True);rows.append(im)
W=max(r.width for r in rows);cols=2 if W<700 else 1
land=[r for r in rows if r.width>600];port=[r for r in rows if r.width<=600]
def grid(rs,cols,name):
  if not rs:return
  cw=max(r.width for r in rs);ch=max(r.height for r in rs);n=len(rs);R=(n+cols-1)//cols
  S=Image.new('RGB',(cols*cw,R*ch),(17,17,17))
  for i,r in enumerate(rs):S.paste(r,((i%cols)*cw,(i//cols)*ch))
  S.save(os.path.join(dst,name),optimize=True)
grid(land,2,'contact-sheet.png');grid(port,2,'contact-phone.png')
print('sheets:',len(names),'pairs ->',dst)
`;
  execFileSync('python3', ['-c', py, OUT, path.join(ROOT, 'orch', 'shots', 'three-upgrade')], { stdio: 'inherit' });
}
