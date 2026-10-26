// Phone check: boots the game in a phone-sized touch browser (portrait 390x844 and landscape 844x390), walks the
// menu, Settings, a real skirmish and the pause/quit overlays, and drives the battle with touch alone (tap select,
// tap move, tap attack, drag-select, two-finger pan, pinch zoom, place a building). Reports layout problems
// (horizontal scroll, things off-screen, buttons too small to tap) and which touch flows work.
// Screenshots go to orch/out/phone/<tag>-*.png.
//
//   node orch/phone.mjs                 # both orientations, tag "now"
//   node orch/phone.mjs --tag before    # name the screenshots
//   node orch/phone.mjs --only landscape
//   node orch/phone.mjs --no-lock
// Exit code 1 if a touch flow fails or the page errors; layout findings are printed as warnings.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out', 'phone');
const sarg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = sarg('tag', 'now'), ONLY = sarg('only', ''), QUICK = process.argv.includes('--quick');
const MIN_TAP = 40;

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) {
    try { return req(p); } catch {}
  }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux64', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch {}
  return undefined;
}

await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
fs.mkdirSync(OUT, { recursive: true });

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

const fails = [], warns = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Layout audit of what's currently on screen: horizontal scroll, visible things poking out of the viewport,
// tappable things smaller than MIN_TAP in either dimension.
async function audit(page, scope, where) {
  const r = await page.evaluate(({ scope, MIN_TAP }) => {
    const W = innerWidth, H = innerHeight, root = document.querySelector(scope) || document.body;
    const vis = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return false;
      const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && !el.closest('[hidden]'); };
    const name = el => el.id ? '#' + el.id : (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + (el.textContent ? ` "${el.textContent.trim().slice(0, 18)}"` : ''));
    const out = [], small = [];
    for (const el of root.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const b = el.getBoundingClientRect();
      // element inside a horizontally scrolling parent is fine
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(s.overflowX)) { clipped = true; break; } p = p.parentElement; }
      if (!clipped && (b.right > W + 1 || b.left < -1)) out.push(`${name(el)} x ${b.left.toFixed(0)}..${b.right.toFixed(0)}`);
      if (el.matches('button,select,input,.fac,.mapc,label.btn2,canvas#mm') && (b.height < MIN_TAP - 0.5 || b.width < MIN_TAP - 0.5)) small.push(`${name(el)} ${b.width.toFixed(0)}x${b.height.toFixed(0)}`);
    }
    const se = document.scrollingElement;
    return { W, H, hscroll: se.scrollWidth > W + 1 || root.scrollWidth > root.clientWidth + 1, out: out.slice(0, 12), nOut: out.length, small: small.slice(0, 14), nSmall: small.length };
  }, { scope, MIN_TAP });
  const msg = `${where}: ${r.hscroll ? 'HORIZONTAL SCROLL, ' : ''}${r.nOut} off-screen, ${r.nSmall} small tap targets`;
  console.log('  ' + msg);
  if (r.nOut) console.log('    off-screen: ' + r.out.join('; '));
  if (r.nSmall) console.log('    small: ' + r.small.join('; '));
  if (r.hscroll || r.nOut) warns.push(msg);
  return r;
}

async function shot(page, name) {
  try { await page.screenshot({ path: path.join(OUT, `${TAG}-${name}.png`), timeout: 120000 }); }
  catch (e) { warns.push(`screenshot ${name}: ${String(e.message).split('\n')[0]}`); }
}

// Raw multi-touch through CDP (Playwright's touchscreen only taps).
async function touch(cdp, type, pts) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i, radiusX: 4, radiusY: 4, force: 1 })) });
}
async function tap(cdp, x, y) { await touch(cdp, 'touchStart', [{ x, y }]); await sleep(60); await touch(cdp, 'touchEnd', []); await sleep(250); }
async function drag1(cdp, a, b, steps = 8) {
  await touch(cdp, 'touchStart', [a]);
  for (let i = 1; i <= steps; i++) { await touch(cdp, 'touchMove', [{ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }]); await sleep(30); }
  await touch(cdp, 'touchEnd', []); await sleep(250);
}
async function drag2(cdp, a0, a1, b0, b1, steps = 8) {
  await touch(cdp, 'touchStart', [{ ...a0, id: 0 }]); await sleep(20);
  await touch(cdp, 'touchStart', [{ ...a0, id: 0 }, { ...b0, id: 1 }]);
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    await touch(cdp, 'touchMove', [{ x: a0.x + (a1.x - a0.x) * f, y: a0.y + (a1.y - a0.y) * f, id: 0 }, { x: b0.x + (b1.x - b0.x) * f, y: b0.y + (b1.y - b0.y) * f, id: 1 }]);
    await sleep(30);
  }
  await touch(cdp, 'touchEnd', [{ ...a1, id: 0 }]); await sleep(20);
  await touch(cdp, 'touchEnd', []); await sleep(300);
}


// Tap a DOM element the way a finger would: scroll it into view, check nothing covers it, tap its centre.
async function tapEl(page, cdp, sel, label, quiet) {
  const r = await page.evaluate(sel => {
    const el = document.querySelector(sel); if (!el) return { err: 'missing' };
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const b = el.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
    const hit = document.elementFromPoint(x, y);
    const ok = hit && (hit === el || el.contains(hit));
    return { x, y, ok, hit: hit ? (hit.id || hit.className || hit.tagName) : null, inView: y >= 0 && y <= innerHeight && x >= 0 && x <= innerWidth };
  }, sel);
  if (r.err) { if (!quiet) warns.push(`${label}: ${sel} ${r.err}`); return false; }
  if (!r.ok || !r.inView) { if (!quiet) warns.push(`${label}: ${sel} can't be tapped (covered by ${r.hit}, in view ${r.inView})`); return false; }
  await sleep(150);
  await tap(cdp, r.x, r.y);
  return true;
}

async function runOrientation(label, viewport) {
  console.log(`\n== ${label} ${viewport.width}x${viewport.height}`);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  page.on('pageerror', e => fails.push(`${label} page error: ` + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  const cdp = await ctx.newCDPSession(page);
  const flows = {};
  try {
    await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
    await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => warns.push('models still loading'));
    await sleep(800);
    await shot(page, `${label}-menu`);
    await audit(page, '#menu', `${label} menu`);
    await page.screenshot({ path: path.join(OUT, `${TAG}-${label}-menu-full.png`), fullPage: false }).catch(() => {});

    // Settings
    await tapEl(page, cdp, '#openSettings', label);
    await sleep(500);
    await shot(page, `${label}-settings`);
    await audit(page, '#settings', `${label} settings`);
    const doneOk = await page.evaluate(() => { const b = document.getElementById('sDone'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    if (!doneOk) warns.push(`${label}: Settings "Done" not reachable`);
    await tapEl(page, cdp, '#sDone', label);
    await sleep(300);

    // Start a skirmish with a tap on Deploy (faction/map defaults)
    if (!await tapEl(page, cdp, '#start', label)) await page.evaluate(() => document.getElementById('start').click());
    await page.waitForFunction(() => typeof G !== 'undefined' && G && G.t > 0.5, null, { timeout: 120000 });
    await sleep(2500);
    await shot(page, `${label}-battle`);
    const lay = await page.evaluate(() => {
      const r = id => { const b = document.getElementById(id).getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
      return { stage: r('stage'), side: r('side'), mm: r('mm'), panel: r('panel') };
    });
    console.log(`  battle layout: stage ${lay.stage.w}x${lay.stage.h}, sidebar ${lay.side.w}x${lay.side.h} at ${lay.side.x},${lay.side.y}, minimap ${lay.mm.w}x${lay.mm.h}`);
    flows.mapArea = (lay.stage.w * lay.stage.h) / (viewport.width * viewport.height);
    await audit(page, '#side', `${label} sidebar`);
    for (const tab of ['units', 'upg', 'pow', 'build']) {
      if (!await tapEl(page, cdp, `.tabs button[data-tab="${tab}"]`, label)) { flows.tabsTappable = false; await page.evaluate(t => document.querySelector(`.tabs button[data-tab="${t}"]`).click(), tab); }
      await sleep(250);
      if (tab === 'units') await shot(page, `${label}-units-tab`);
    }

    if (QUICK) { // layout + screenshots only: no fast-forward, no gestures
      await tapEl(page, cdp, '#aPause', label); await sleep(400);
      await shot(page, `${label}-pause`); await audit(page, '#pauseOv', `${label} pause`);
      await tapEl(page, cdp, '#resumeBtn', label); await sleep(300);
      await page.evaluate(() => togglePause(true));
      await tapEl(page, cdp, '#aQuit', label, true) || await page.evaluate(() => document.getElementById('aQuit').click()); await sleep(400);
      await shot(page, `${label}-quit`); await audit(page, '#quitOv', `${label} quit`);
      await ctx.close();
      console.log(`  (quick: layout only)`);
      return;
    }
    // ---- touch flows ----
    // Record every command the UI sends.
    await page.evaluate(() => { window.__acts = []; const o = doAct; doAct = a => { window.__acts.push(JSON.parse(JSON.stringify(a))); return o(a); }; G.sel = []; });
    const cvBox = await page.locator('#cv').boundingBox();
    const scr = (x, y, h = 6) => page.evaluate(({ x, y, h }) => { const p = toScreen(x, h, y); return { x: p.x, y: p.y }; }, { x, y, h }).then(p => ({ x: cvBox.x + p.x, y: cvBox.y + p.y }));
    const lastAct = () => page.evaluate(() => window.__acts[window.__acts.length - 1] || null);

    // Make sure there are a few of our units to play with: build them through the normal sim (host side).
    const setup = await page.evaluate(() => {
      const mine = G.ents.filter(u => u.team === ME && !u.isB && !u.dead && u.kind !== 'harv');
      const hq = G.ents.find(b => b.team === ME && b.kind === 'hq');
      return { n: mine.length, hq: hq ? { x: hq.x, y: hq.y } : null, kinds: mine.map(u => u.kind) };
    });
    // Fast-forward so the AI/production fills the field a bit.
    await page.evaluate(() => { const ai = G.teams[ME].ai; G.teams[ME].ai = mkAI(1); for (let i = 0; i < 60 * 45; i++) simUpdate(1 / 60); G.teams[ME].ai = ai; G.sel = []; });
    const u = await page.evaluate(() => {
      const mine = G.ents.filter(u => u.team === ME && !u.isB && !u.dead && u.s.dom === 'ground' && u.kind !== 'harv' && u.kind !== 'dozer');
      const u = mine[0] || G.ents.find(u => u.team === ME && !u.isB && !u.dead);
      if (!u) return null;
      centerOn(u.x, u.y, true); camTick(1); renderFrame(0.016);
      return { id: u.id, x: u.x, y: u.y, kind: u.kind, n: mine.length };
    });
    if (!u) throw new Error('no own unit to test with');
    await sleep(400);
    // hold the unit still and centre it, so the tap lands on it rather than on where it used to be
    await page.evaluate(id => { doAct({ t: 'stop', ids: [id] }); for (let i = 0; i < 30; i++) simUpdate(1 / 60); const u = G.ents.find(e => e.id === id); centerOn(u.x, u.y, true); camTick(1); renderFrame(0.016); G.sel = []; }, u.id);
    await sleep(400);
    let pu = null;
    for (let tryN = 0; tryN < 3 && !flows.tapSelect; tryN++) {
      pu = await page.evaluate(id => { const u = G.ents.find(e => e.id === id); renderFrame(0.016); const p = toScreen(u.x, unitH(u) + entHeightMid(u) * .6, u.y); return { x: p.x, y: p.y }; }, u.id);
      await tap(cdp, cvBox.x + pu.x, cvBox.y + pu.y);
      flows.tapSelect = await page.evaluate(() => G.sel.length === 1 && G.sel[0].team === ME && !G.sel[0].isB);
    }

    // tap ground = move
    const before = await page.evaluate(() => window.__acts.length);
    const selIds = await page.evaluate(() => G.sel.map(e => e.id));
    const gp = { x: cvBox.x + pu.x + cvBox.width * 0.18, y: cvBox.y + pu.y + 10 };
    await tap(cdp, gp.x, gp.y);
    const mv = await lastAct();
    flows.tapMove = !!(mv && (await page.evaluate(() => window.__acts.length)) > before && /^(go|fld)$/.test(mv.t) && (mv.ids || []).some(i => selIds.includes(i)));

    // tap enemy = attack: bring an enemy unit into view next to ours (test-only staging)
    const en = await page.evaluate(id => {
      const me = G.ents.find(e => e.id === id);
      const e = G.ents.find(e => !ally(e.team, ME) && !e.isB && !e.dead && e.s.dom === 'ground');
      if (!e) return null;
      e.x = me.x - 60; e.y = me.y + 10; e.hid = false;
      for (let i = 0; i < 20; i++) simUpdate(1 / 60);
      centerOn(me.x, me.y, true); camTick(1); renderFrame(0.016);
      return { id: e.id };
    }, u.id);
    if (en) {
      await page.evaluate(id => { G.sel = [G.ents.find(e => e.id === id)]; }, u.id);
      const pe = await page.evaluate(id => { const u = G.ents.find(e => e.id === id); if (!u || u.dead) return null; const p = toScreen(u.x, unitH(u) + entHeightMid(u) * .6, u.y); return { x: p.x, y: p.y, v: vis(u) }; }, en.id);
      if (pe) {
        await tap(cdp, cvBox.x + pe.x, cvBox.y + pe.y);
        const at = await lastAct();
        flows.tapAttack = !!(at && (at.tid === en.id || at.target === en.id || JSON.stringify(at).includes(`:${en.id}`)) && /^(atk|atkOil|atkCiv|go)$/.test(at.t));
        if (!flows.tapAttack) console.log('    attack act:', JSON.stringify(at), 'enemy', en.id, 'visible', pe.v);
      }
    }

    // drag-select: box around our unit from empty sky
    await page.evaluate(() => { G.sel = []; });
    const p2 = await page.evaluate(id => { const u = G.ents.find(e => e.id === id); const p = toScreen(u.x, unitH(u) + 4, u.y); return { x: p.x, y: p.y }; }, u.id);
    await drag1(cdp, { x: cvBox.x + p2.x - 70, y: cvBox.y + p2.y - 50 }, { x: cvBox.x + p2.x + 70, y: cvBox.y + p2.y + 50 });
    flows.dragSelect = await page.evaluate(id => G.sel.some(e => e.id === id), u.id);

    // two-finger pan (keep selection; a pan must not issue orders)
    const c0 = await page.evaluate(() => { camTarget(); return { x: cam.tx, y: cam.ty, d: cam.td, sel: G.sel.length, n: window.__acts.length }; });
    const mx = cvBox.x + cvBox.width / 2, my = cvBox.y + cvBox.height / 2;
    await drag2(cdp, { x: mx - 40, y: my }, { x: mx - 40 - 120, y: my - 30 }, { x: mx + 40, y: my }, { x: mx + 40 - 120, y: my - 30 });
    const c1 = await page.evaluate(() => { camTarget(); return { x: cam.tx, y: cam.ty, d: cam.td, sel: G.sel.length, n: window.__acts.length }; });
    flows.twoFingerPan = Math.hypot(c1.x - c0.x, c1.y - c0.y) > 20 && c1.sel === c0.sel && c1.n === c0.n;
    // pinch out = zoom in
    await drag2(cdp, { x: mx - 30, y: my }, { x: mx - 130, y: my }, { x: mx + 30, y: my }, { x: mx + 130, y: my });
    const c2 = await page.evaluate(() => { camTarget(); return { d: cam.td, sel: G.sel.length, n: window.__acts.length }; });
    flows.pinchZoom = c2.d < c1.d * 0.85 && c2.n === c1.n;
    console.log(`    camera: pan ${(Math.hypot(c1.x - c0.x, c1.y - c0.y)).toFixed(0)}, zoom ${c1.d.toFixed(0)} -> ${c2.d.toFixed(0)}, acts ${c0.n}/${c1.n}/${c2.n}`);

    // place a building: Build tab, first affordable building button, tap ground near HQ
    await page.evaluate(() => { G.teams[ME].credits = 99999; G.sel = G.ents.filter(u => u.team === ME && u.kind === 'dozer' && !u.dead).slice(0, 1); updateUI(); });
    if (!await tapEl(page, cdp, '.tabs button[data-tab="build"]', label)) await page.evaluate(() => document.querySelector('.tabs button[data-tab="build"]').click());
    await sleep(300);
    const hasBtn = await page.evaluate(() => { const b = document.querySelector('#panel .btn:not([disabled])'); if (b) b.id = b.id || '__firstBuild'; return b ? '#' + b.id : null; });
    if (hasBtn) {
      if (!await tapEl(page, cdp, hasBtn, label)) { flows.buildButtonTappable = false; await page.evaluate(s => document.querySelector(s).click(), hasBtn); }
      await sleep(300);
      const placing = await page.evaluate(() => G.place);
      if (placing) {
        const hq = setup.hq;
        const spot = await page.evaluate(({ hq }) => {
          for (let r = 140; r < 600; r += 40) for (let a = 0; a < 6.28; a += .5) { const x = hq.x + Math.cos(a) * r, y = hq.y + Math.sin(a) * r; if (validSpot(ME, G.place, x, y)) { centerOn(x, y, true); camTick(1); renderFrame(0.016); return { x, y }; } }
          return null;
        }, { hq });
        if (spot) {
          await sleep(300);
          const ps = await scr(spot.x, spot.y, 0);
          // with touch, the game may need a preview tap before confirming; tap up to twice
          const n0 = await page.evaluate(() => window.__acts.length);
          await tap(cdp, ps.x, ps.y);
          let a = await lastAct();
          if (!(a && a.t === 'bld')) { await tap(cdp, ps.x, ps.y); a = await lastAct(); }
          flows.placeBuilding = !!(a && a.t === 'bld' && (await page.evaluate(() => window.__acts.length)) > n0);
        } else warns.push(`${label}: no valid building spot found`);
      } else warns.push(`${label}: tapping a build button did not enter placement`);
    }
    await page.evaluate(() => { G.place = null; G.sel = []; for (let i = 0; i < 60; i++) simUpdate(1 / 60); });
    await sleep(800);
    await shot(page, `${label}-battle-after`);

    // Pause and quit overlays
    if (!await tapEl(page, cdp, '#aPause', label)) await page.evaluate(() => togglePause(true)); await sleep(400);
    await shot(page, `${label}-pause`);
    await audit(page, '#pauseOv', `${label} pause`);
    flows.resumeTappable = await tapEl(page, cdp, '#resumeBtn', label); await sleep(300);
    await page.evaluate(() => togglePause(true)); // keep the battle still: SwiftShader screenshots of a live battle take minutes
    if (!await tapEl(page, cdp, '#aQuit', label, true)) await page.evaluate(() => document.getElementById('aQuit').click()); await sleep(400);
    await shot(page, `${label}-quit`);
    await audit(page, '#quitOv', `${label} quit`);
    await tapEl(page, cdp, '#quitNo', label); await sleep(200);
  } catch (e) {
    fails.push(`${label}: ${String(e.message || e).split('\n')[0]}`);
    await shot(page, `${label}-failure`);
  }
  const bad = Object.entries(flows).filter(([k, v]) => k !== 'mapArea' && !v).map(([k]) => k);
  console.log(`  touch flows: ${Object.entries(flows).map(([k, v]) => k === 'mapArea' ? `map ${(v * 100).toFixed(0)}% of screen` : `${k} ${v ? 'ok' : 'FAIL'}`).join(', ')}`);
  for (const k of bad) fails.push(`${label}: touch flow "${k}" failed`);
  await ctx.close();
}

const t0 = Date.now();
if (ONLY !== 'portrait') await runOrientation('landscape', { width: 844, height: 390 });
if (ONLY !== 'landscape') await runOrientation('portrait', { width: 390, height: 844 });
await browser.close();
server.close();
for (const w of [...new Set(warns)]) console.log('  warn: ' + w);
if (fails.length) { console.log(`\nPHONE FAIL (${((Date.now() - t0) / 1000).toFixed(0)}s)`); for (const f of [...new Set(fails)]) console.log('  x ' + f); process.exit(1); }
console.log(`\nPHONE PASS (${((Date.now() - t0) / 1000).toFixed(0)}s) - screenshots in orch/out/phone/`);
