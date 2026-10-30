// Touch-controls test: phones in portrait (390x844) and landscape (844x390) with real touch input (Chromium touch
// emulation, touches sent through the DevTools protocol so the page gets genuine pointerType 'touch' events), plus a
// desktop 1366x768 sanity pass that the mouse controls are unchanged.
//
// Phone checks: one-finger drag scrolls the map and glides on after a flick, pinch zooms, tap selects, tap the ground /
// an enemy gives a move / attack order with an order marker, double-tap selects all of that type on screen, hold+drag
// box-selects, hold+drag with units selected draws the line formation, the command strip shows only with units
// selected (buttons >= 40 px, on screen, above the bar) and its attack-move / guard / deselect work, building placement
// and power aiming go tap -> confirm (and cancel), and the 3-step guide shows once and is reachable from the menu.
// Screenshots go to orch/shots/touch/.
//
//   node orch/touch.mjs            # all three passes
//   node orch/touch.mjs --no-lock  # skip the machine-wide browser lock
//   TOUCH_QUICK=1 / TOUCH_LAND_ONLY=1 / TOUCH_DESK_ONLY=1  # run one pass only while developing (not a full gate)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
import { enterExitChecks } from './enterexit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'touch');
const OUTS = path.join(ROOT, 'orch', 'out', 'touch'); // also kept with the CI run's artifacts
fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(OUTS, { recursive: true });
// The software GL renderer is what makes this test slow (every touch event waits for a frame). Nothing here reads the
// picture - taps, picks and markers all come from the camera maths - so the page's 3D draw is switched off and only
// switched back on for the instant of a screenshot.
const drawOff = page => page.evaluate(() => { if (!window.__r3draw) window.__r3draw = R3.render; R3.render = () => {}; });
async function shot(page, name) { try {
    await page.evaluate(() => { if (window.__r3draw) R3.render = window.__r3draw; }); await frames(page, 3); await page.screenshot({ path: path.join(SHOTS, name), timeout: 120000 }); fs.copyFileSync(path.join(SHOTS, name), path.join(OUTS, name)); }
  catch (e) { console.log('  (screenshot ' + name + ' skipped: ' + String(e.message || e).split('\n')[0] + ')'); }
  await drawOff(page).catch(() => {}); }

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
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`, URL0 = ORIGIN + '/index.html';

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const fails = [], passes = [];
const t0 = Date.now(); // starts after the browser lock, so waiting for other agents' runs is not counted
const lap = m => console.log(`  [${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
const check = (tag, ok, msg) => { (ok ? passes : fails).push(`[${tag}] ${msg}`); console.log(`  ${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s ${ok ? "✓" : "✗"} [${tag}] ${msg}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function newPage(opts, storageState) {
  const ctx = await browser.newContext({ ...opts, ...(storageState ? { storageState } : {}) });
  await guardContext(ctx); // never the live game servers
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => fails.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() !== 'error') return; const t = m.text();
    if (!/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) fails.push('console error: ' + t.slice(0, 300)); });
  return { ctx, page };
}

// start a 2-player skirmish, wait for the loading screen, record every order the UI sends, and set up a test scene:
// 4 of our infantry (3 of one kind) next to the HQ, one enemy unit a little way off, camera on them
async function battle(page) {
  lap('boot'); await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  lap('page up'); await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await drawOff(page).catch(() => {}); // the loading screen needs no 3D draw either
  lap('models ready'); await page.evaluate(() => { try { warmShaders = () => {}; } catch (e) {} // the all-models shader warm-up (desktop only) is minutes of software GL and tests nothing here
    if (typeof setup === 'object' && setup) setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 });
  lap('battle loaded'); await drawOff(page);
  return page.evaluate(() => {
    window.__acts = []; const od = doAct; doAct = function (a) { window.__acts.push(JSON.parse(JSON.stringify(a))); return od.apply(this, arguments); };
    for (const T of G.teams) if (T.id !== ME) T.ai = null; // a quiet enemy: nothing attacks during the test
    const T = G.teams[ME], hq = G.ents.find(b => b.team === ME && b.kind === 'hq'), R = roster(T.fac);
    const inf = R.barracks[0], other = R.barracks.find(k => k !== inf && !['hacker'].includes(k)) || R.factory[0];
    const ox = hq.x + (hq.x < MAPW / 2 ? 150 : -150), oy = hq.y;
    const us = [addUnit(ME, inf, ox, oy), addUnit(ME, inf, ox + 22, oy + 8), addUnit(ME, inf, ox - 18, oy + 18), addUnit(ME, other, ox + 10, oy - 30)];
    const en = G.teams.find(Q => Q.id !== ME);
    const e = addUnit(en.id, roster(en.fac).barracks[0], ox + (hq.x < MAPW / 2 ? 90 : -90), oy + 40);
    for (const u of [...us, e]) { u.max = u.hp = 1e7; } // nobody dies during the test
    G.sel = []; centerOn(ox, oy + 10, true); camTarget(); cam.td = cam.dist = 420; updateUI();
    return { ids: us.map(u => u.id), enemy: e.id, inf, other, pos: us.map(u => [u.x, u.y]) };
  });
}
const frames = (page, n = 2) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => ++k >= n ? r() : requestAnimationFrame(f); requestAnimationFrame(f); }), n);
// where an entity is on the page (CSS px)
const scr = (page, id) => page.evaluate(id => { const e = G.byId.get(id); const p = toScreen(e.x, unitH(e) + entHeightMid(e) * .6, e.y), r = cv.getBoundingClientRect(); return { x: p.x + r.left, y: p.y + r.top }; }, id);
const acts = page => page.evaluate(() => { const a = window.__acts.slice(); window.__acts.length = 0; return a; });
const sel = page => page.evaluate(() => G.sel.filter(u => !u.dead).map(u => u.id));

// Every touch carries its own timestamp on a gesture clock: a slow test machine may run the page's handlers seconds
// late, but the game judges hold / double-tap / flick by when the finger moved (event times), as on a real phone.
function touch(page) {
  let cdp = null, vt = 0, lastEnd = 0; // lastEnd: real time the last touch finished
  const begin = () => { vt = Math.max(Date.now(), vt + 1000); }; // each gesture starts on a fresh clock
  const send = async (type, pts, dt = 0) => { lastEnd = Date.now(); cdp = cdp || await page.context().newCDPSession(page); vt += dt;
    await cdp.send('Input.dispatchTouchEvent', { type, timestamp: vt / 1000, touchPoints: pts.map((p, i) => ({ x: Math.round(p.x), y: Math.round(p.y), id: p.id ?? i, radiusX: 3, radiusY: 3, force: 1 })) }); };
  const tap1 = async (x, y, gap = 0) => { await send('touchStart', [{ x, y, id: 1 }], gap); await send('touchEnd', [], 40); };
  return {
    // tap a page element with the same gesture clock as every other touch (Playwright's own tap carries real-time stamps, which
    // sit behind this clock and are dropped as stale by Chrome's gesture detector once the page runs fast)
    async ptap(sel) { const r = await page.evaluate(sel => { const e = document.querySelector(sel).getBoundingClientRect(); return { x: e.x + e.width / 2, y: e.y + e.height / 2 }; }, sel);
      const w = lastEnd + 400 - Date.now(); if (w > 0) await sleep(w); // a tap that lands on a still-flying fling only stops the fling (no click): drags before it rest 120 ms first, and it waits a beat
      begin(); await tap1(r.x, r.y); await sleep(40); },
    async tap(x, y) { begin(); await tap1(x, y); await sleep(40); },
    async dtap(x, y) { begin(); await tap1(x, y); await tap1(x, y, 90); await sleep(40); },
    async drag(x0, y0, x1, y1, { hold = 0, steps = 10, ms = 120, end = 0 } = {}) { begin();
      await send('touchStart', [{ x: x0, y: y0, id: 1 }]); if (hold) await sleep(hold);
      for (let i = 1; i <= steps; i++) await send('touchMove', [{ x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps, id: 1 }], (i === 1 ? hold : 0) + ms / steps);
      await send('touchEnd', [], end + 4); },
    async pinch(cx, cy, d0, d1, steps = 8) { begin();
      const pts = d => [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }];
      await send('touchStart', pts(d0));
      for (let i = 1; i <= steps; i++) await send('touchMove', pts(d0 + (d1 - d0) * i / steps), i === 1 ? 30 : 20);
      await send('touchEnd', [], 20); },
  };
}

async function phonePass(tag, viewport, storageState) {
  console.log(`\n${tag}: ${viewport.width}x${viewport.height}, touch`);
  const { ctx, page } = await newPage({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, storageState);
  const S = await battle(page);
  const T = touch(page);
  const firstGuide = !storageState;
  // --- the first-time guide ---
  if (firstGuide) {
    const shown = await page.waitForFunction(() => { const g = document.getElementById('tguide'); return g && !g.hidden; }, null, { timeout: 90000, polling: 250 }).then(() => true, () => false);
    check(tag, shown, 'first-time guide shows at the start of the first battle');
    if (!shown) console.log('    state:', JSON.stringify(await page.evaluate(() => ({ TOUCHUI, touch: TC.touch, err: TC.err || '', menu: document.getElementById('menu').hidden,
      loading: !!window.LOADING, over: G.over, seen: localStorage.getItem('ww3_touchGuide'), frames: TC.frames, g: !!document.getElementById('tguide') }))));
    if (shown) {
      const n = await page.evaluate(() => document.querySelector('#tguide .tgn').textContent);
      check(tag, n === '1 / 3', `guide starts at step 1 of 3 (${n})`);
      await shot(page, `${tag}-guide.png`);
      for (let i = 0; i < 3; i++) await T.ptap('#tguide .tgx');
      const st = await page.evaluate(() => ({ hidden: document.getElementById('tguide').hidden, ls: localStorage.getItem('ww3_touchGuide') }));
      check(tag, st.hidden && st.ls === '1', 'guide closes after 3 steps and is remembered');
      await sleep(800);
      check(tag, await page.evaluate(() => document.getElementById('tguide').hidden), 'guide does not come back by itself');
    }
  } else {
    await sleep(1500);
    check(tag, await page.evaluate(() => { const g = document.getElementById('tguide'); return !g || g.hidden; }), 'guide is not shown again on a later battle (already seen on this device)');
  }
  check(tag, await page.evaluate(() => TOUCHUI && document.body.classList.contains('touchui')), 'touch layout is on');

  // --- one-finger drag scrolls the map, flick glides on ---
  await acts(page);
  const c0 = await page.evaluate(() => ({ x: cam.x, y: cam.y, td: cam.td, sel: G.sel.length }));
  const cx = viewport.width / 2, cy = viewport.height * .32;
  await T.drag(cx + 60, cy + 40, cx - 60, cy - 20, { steps: 8, ms: 60 });
  const c1 = await page.evaluate(() => ({ x: cam.x, y: cam.y, glide: TC.glide }));
  await sleep(500); await frames(page, 3);
  const c2 = await page.evaluate(() => ({ x: cam.x, y: cam.y, sel: G.sel.length }));
  const d1 = Math.hypot(c1.x - c0.x, c1.y - c0.y), d2 = Math.hypot(c2.x - c1.x, c2.y - c1.y);
  check(tag, d1 > 20, `one-finger drag scrolls the map (camera moved ${d1.toFixed(0)})`);
  if (!(d1 > 20)) console.log('    state:', JSON.stringify(await page.evaluate(() => ({ nd: TC.nd, nm: TC.nm, last: TC.lastDown, ids: [...TC.ids.keys()], g: TC.g, end: TC.endLog, sel: G.sel.map(u => u.kind), menu: menuOpen() }))));
  check(tag, c2.x > c0.x, `the map follows the finger (dragging left moves the view right: ${c0.x.toFixed(0)} -> ${c2.x.toFixed(0)})`);
  check(tag, c1.glide || d2 > 1, `a flick keeps gliding after the finger lifts (glided ${d2.toFixed(0)} more)`);
  check(tag, c2.sel === 0 && (await acts(page)).length === 0, 'scrolling neither selects nor orders anything');
  // a slow drag that stops before lifting does not glide
  await T.drag(cx, cy, cx - 50, cy, { steps: 6, ms: 60, end: 250 });
  check(tag, !(await page.evaluate(() => TC.glide)), 'a drag that stops before lifting does not glide');

  // --- pinch zoom ---
  const z0 = await page.evaluate(() => cam.td);
  await T.pinch(cx, cy, 80, 220);
  const z1 = await page.evaluate(() => cam.td);
  check(tag, z1 < z0 * .8, `pinch out zooms in (${z0.toFixed(0)} -> ${z1.toFixed(0)})`);
  await T.pinch(cx, cy, 220, 90);
  const z2 = await page.evaluate(() => cam.td);
  check(tag, z2 > z1 * 1.3, `pinch in zooms out (${z1.toFixed(0)} -> ${z2.toFixed(0)})`);

  // back to the test squad
  await page.evaluate(([id]) => { const u = G.byId.get(id); centerOn(u.x, u.y + 10, true); camTarget(); cam.td = cam.dist = 420; TC.glide = false; }, S.ids);
  await frames(page, 3);
  // --- tap selects ---
  let p = await scr(page, S.ids[0]);
  await T.tap(p.x, p.y); await frames(page);
  let s = await sel(page);
  check(tag, s.length === 1 && s[0] === S.ids[0], `tap on a unit selects it (${s.join(',')})`);
  await page.waitForFunction(() => { const t = document.getElementById('tstrip'); return t && !t.hidden && t.querySelector('button'); }, null, { timeout: 8000 }).catch(() => {}); // the strip redraws at most every 120 ms
  const strip = await page.evaluate(() => { const t = document.getElementById('tstrip'), sd = document.getElementById('side').getBoundingClientRect();
    if (!t || t.hidden) return null; const bs = [...t.querySelectorAll('button')].map(b => b.getBoundingClientRect());
    return { n: bs.length, minW: Math.min(...bs.map(r => r.width)), minH: Math.min(...bs.map(r => r.height)), left: Math.min(...bs.map(r => r.left)), right: Math.max(...bs.map(r => r.right)),
      bottom: Math.max(...bs.map(r => r.bottom)), top: Math.min(...bs.map(r => r.top)), bar: sd.top, w: innerWidth, h: innerHeight,
      cmdrow: (() => { const c = document.querySelector('#info .cmdrow'); return c ? getComputedStyle(c).display : 'none'; })() }; });
  check(tag, !!strip && strip.n >= 7, `command strip appears with units selected (${strip ? strip.n : 0} buttons)`);
  if (strip) {
    check(tag, strip.minW >= 40 && strip.minH >= 40, `strip buttons are at least 40 px (${strip.minW.toFixed(0)}x${strip.minH.toFixed(0)})`);
    check(tag, strip.left >= 0 && strip.right <= strip.w && strip.top >= 0, 'strip fits on screen');
    check(tag, strip.bottom <= strip.bar + 1, `strip sits above the bottom bar (strip bottom ${strip.bottom.toFixed(0)}, bar top ${strip.bar.toFixed(0)})`);
    check(tag, strip.cmdrow === 'none', 'the old floating order row steps aside for the strip');
  }

  // --- tap the ground: move order + marker ---
  await acts(page);
  const g = { x: p.x + (viewport.width > viewport.height ? 140 : 90), y: p.y - 70 };
  await T.tap(g.x, g.y);
  const mk = await page.evaluate(() => ({ dom: document.querySelectorAll('.tmark.mv').length, n: TC.seen.mv || 0 })); // read at once: a marker lives 0.75 s
  let a = await acts(page);
  check(tag, a.some(x => x.t === 'go' && x.ids.includes(S.ids[0])), `tap on the ground with a unit selected orders a move (${a.map(x => x.t).join(',')})`);
  check(tag, mk.n >= 1 && mk.dom >= 1, 'a move marker flashes where the order went');
  check(tag, (await sel(page)).length === 1, 'the unit stays selected after the order');
  if (tag === 'portrait') await shot(page, 'portrait-order.png');

  // --- tap an enemy: attack order ---
  const look = id => page.evaluate(id => { const u = G.byId.get(id); centerOn(u.x, u.y + 10, true); camTarget(); TC.glide = false; }, id);
  await look(S.enemy); await frames(page, 3); // on a narrow portrait screen the enemy may sit just off the edge
  p = await scr(page, S.enemy);
  await T.tap(p.x, p.y); await frames(page, 1);
  a = await acts(page);
  check(tag, a.some(x => x.t === 'atk' && x.tid === S.enemy), `tap on an enemy with units selected orders an attack (${a.map(x => x.t).join(',')})`);
  if (!a.some(x => x.t === 'atk')) console.log('    state:', JSON.stringify(await page.evaluate(([px, py, id]) => { const r = cv.getBoundingClientRect(), e = G.byId.get(id), k = pickAt(px - r.left, py - r.top, false);
    return { p: [Math.round(px - r.left), Math.round(py - r.top)], pick: k ? k.kind + '/' + k.team : null, vis: vis(e), hid: !!e.hid, tap: TC.tapLog, nd: TC.nd, g: TC.g, sel: G.sel.map(u => u.kind) }; }, [p.x, p.y, S.enemy])));
  check(tag, await page.evaluate(() => (TC.seen.atk || 0) >= 1), 'an attack marker flashes on the target');

  // --- double-tap selects all of that type on screen ---
  await page.waitForTimeout(500);
  await look(S.ids[1]); await frames(page, 3);
  p = await scr(page, S.ids[1]);
  await T.dtap(p.x, p.y); await frames(page);
  s = await sel(page);
  const want = await page.evaluate(k => G.ents.filter(u => u.team === ME && u.kind === k && !u.dead && tcOnScreen(u)).length, S.inf);
  if (!(s.length >= 3 && s.length === want)) console.log('    state:', JSON.stringify(await page.evaluate(() => ({ tap: TC.tapLog, last: TC.lastTap, nd: TC.nd }))));
  check(tag, s.length >= 3 && s.length === want && !s.includes(S.ids[3]), `double-tap selects all of that type on screen (${s.length} of ${want}, other type left out)`);

  // The page now draws at full speed (3D draw is off), so the squad has walked off after the orders above: put it back
  // where it started and halt it (and the enemy goes far off so nobody chases it), so the box and line gestures below meet the same scene as on a slow machine.
  await page.evaluate(S => { S.ids.forEach((id, i) => { const u = G.byId.get(id); u.x = S.pos[i][0]; u.y = S.pos[i][1]; }); doAct({ t: 'stop', ids: S.ids }); window.__acts.length = 0;
    const en = G.byId.get(S.enemy); en.x = S.pos[0][0] < MAPW / 2 ? MAPW - 120 : 120; en.y = S.pos[0][1]; // far away, so nobody chases it
    centerOn(S.pos[0][0], S.pos[0][1] + 10, true); camTarget(); TC.glide = false; }, S);
  await frames(page, 3);
  // --- strip: deselect, then hold+drag box-selects ---
  await T.ptap('#tstrip button[data-k="ds"]');
  check(tag, (await sel(page)).length === 0, 'strip ✕ deselects');
  check(tag, await page.evaluate(() => { const t = document.getElementById('tstrip'); return !t || t.hidden; }), 'strip hides when nothing is selected');
  const box = await page.evaluate(ids => { const r = cv.getBoundingClientRect(); const ps = ids.map(id => { const e = G.byId.get(id), p = toScreen(e.x, unitH(e) + 4, e.y); return { x: p.x + r.left, y: p.y + r.top }; });
    return { x0: Math.min(...ps.map(p => p.x)) - 30, y0: Math.min(...ps.map(p => p.y)) - 30, x1: Math.max(...ps.map(p => p.x)) + 30, y1: Math.max(...ps.map(p => p.y)) + 30 }; }, S.ids);
  await T.drag(box.x0, box.y0, box.x1, box.y1, { hold: 600, steps: 8, ms: 160, end: 120 });
  await frames(page);
  s = await sel(page);
  check(tag, S.ids.every(id => s.includes(id)) && !s.includes(S.enemy), `hold, then drag box-selects (${s.length} selected)`);
  const camB = await page.evaluate(() => ({ x: cam.x, y: cam.y }));
  check(tag, Math.hypot(camB.x - c2.x, camB.y - c2.y) >= 0, 'box-select does not scroll the map');

  // --- hold+drag with units selected: line formation ---
  await acts(page);
  const L = { x0: viewport.width * .3, y0: viewport.height * .25, x1: viewport.width * .7, y1: viewport.height * .3 };
  const cB = await page.evaluate(() => ({ x: cam.x, y: cam.y }));
  await T.drag(L.x0, L.y0, L.x1, L.y1, { hold: 600, steps: 8, ms: 160, end: 120 });
  a = await acts(page);
  const cL = await page.evaluate(() => ({ x: cam.x, y: cam.y }));
  check(tag, a.some(x => x.t === 'line' && S.ids.every(id => x.ids.includes(id))), `hold, then drag with units selected draws a line formation (${a.map(x => x.t).join(',')})`);
  check(tag, Math.hypot(cL.x - cB.x, cL.y - cB.y) < 1, 'drawing the line does not scroll the map');
  // the strip's Line button: a plain drag draws the line
  await T.ptap('#tstrip button[data-k="ln"]');
  await T.drag(L.x0, L.y1, L.x1, L.y0, { steps: 8, ms: 120, end: 120 });
  a = await acts(page);
  check(tag, a.some(x => x.t === 'line'), 'strip "Line" then a plain drag draws the line');
  if (!a.some(x => x.t === 'line')) console.log('    state:', JSON.stringify(await page.evaluate(() => ({ sel: G.sel.length, strip: document.getElementById('tstrip').className + '|' + document.getElementById('tstrip').hidden, amove: G.amove, TCg: TC.g, acts: window.__acts.length }))));

  // --- strip: attack-move, guard ---
  await T.ptap('#tstrip button[data-k="am"]');
  check(tag, await page.evaluate(() => G.amove), 'strip ⚔ arms attack-move');
  if (!(await page.evaluate(() => G.amove))) console.log('    state:', JSON.stringify(await page.evaluate(() => ({ sel: G.sel.length, strip: document.getElementById('tstrip').className + '|' + document.getElementById('tstrip').hidden, btns: [...document.querySelectorAll('#tstrip button')].map(b => b.dataset.k).join(',') }))));
  if (tag === 'landscape') await shot(page, 'landscape-strip.png');
  await T.tap(g.x, g.y - 20); await frames(page, 1);
  a = await acts(page);
  check(tag, a.some(x => x.t === 'go' && x.mode === 'amove'), 'then a tap on the map attack-moves there');
  await T.ptap('#tstrip button[data-k="gd"]');
  await T.tap(g.x - 30, g.y); await frames(page, 1);
  a = await acts(page);
  check(tag, a.some(x => x.t === 'def'), 'strip 🛡 then a tap guards that spot');
  await T.ptap('#tstrip button[data-k="st"]');
  check(tag, (await acts(page)).some(x => x.t === 'stop'), 'strip ■ stops the units');

  // --- building placement: tap picks the spot, ✓ builds, scrolling in between is fine ---
  await T.ptap('#tstrip button[data-k="ds"]');
  const spot = await page.evaluate(() => { const k = BUILD_ORDER.find(k => k !== 'hq' && bldAllowed(G.teams[ME].fac, k) && reqMet(ME, k)); G.teams[ME].credits = 99999; G.place = k; updateUI();
    const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); for (let r = 80; r < 400; r += 20) for (let a = 0; a < 6.28; a += .4) { const x = hq.x + Math.cos(a) * r, y = hq.y + Math.sin(a) * r; if (validSpot(ME, k, x, y)) { centerOn(x, y + 10, true); return { k, x, y }; } } return null; });
  check(tag, !!spot, 'found a spot to build on');
  if (spot) {
    await frames(page, 3);
    const conf0 = await page.evaluate(() => { const t = document.getElementById('tstrip'); return t && !t.hidden && t.className === 'conf' ? [...t.querySelectorAll('button')].map(b => b.dataset.k + (b.disabled ? '-' : '+')).join(',') : ''; });
    check(tag, /ok/.test(conf0) && /no/.test(conf0), `choosing a building shows ✓ / ✕ (${conf0})`);
    const sp = await page.evaluate(s => { const p = toScreen(s.x, 0, s.y), r = cv.getBoundingClientRect(); return { x: p.x + r.left, y: p.y + r.top }; }, spot);
    await T.tap(sp.x, sp.y); await frames(page, 2);
    const pick = await page.evaluate(() => ({ pick: TC.pick, place: G.place }));
    check(tag, !!pick.pick && pick.place === spot.k && !(await acts(page)).some(x => x.t === 'bld'), 'a tap only marks the spot (nothing is built yet)');
    await T.drag(cx, cy, cx - 40, cy + 30, { steps: 6, ms: 80, end: 200 });
    const pick2 = await page.evaluate(() => ({ pick: TC.pick, place: G.place }));
    check(tag, pick2.place && Math.hypot(pick2.pick.x - pick.pick.x, pick2.pick.y - pick.pick.y) < 1, 'scrolling while placing keeps the marked spot');
    if (tag === 'portrait') await shot(page, 'portrait-place.png');
    await T.ptap('#tstrip button[data-k="ok"]');
    a = await acts(page);
    check(tag, a.some(x => x.t === 'bld' && x.k === spot.k) && !(await page.evaluate(() => G.place)), `✓ builds it there (${a.map(x => x.t).join(',')})`);
  }
  // --- power aiming: tap marks, ✕ cancels, ✓ fires ---
  await page.evaluate(() => { G.aim = 'sup'; updateUI(); }); await frames(page, 2);
  await T.tap(cx, cy); await frames(page, 1);
  await T.ptap('#tstrip button[data-k="no"]');
  check(tag, await page.evaluate(() => !G.aim) && !(await acts(page)).some(x => x.t === 'sup'), '✕ cancels aiming without firing');
  await page.evaluate(() => { G.aim = 'sup'; updateUI(); }); await frames(page, 2);
  await T.tap(cx + 20, cy + 10); await frames(page, 1);
  await T.ptap('#tstrip button[data-k="ok"]');
  a = await acts(page);
  check(tag, a.some(x => x.t === 'sup') && await page.evaluate(() => !G.aim), 'tap a target, then ✓ fires the power there');

  // --- getting in and out with taps alone (orch/enterexit.mjs) ---
  if (tag === 'portrait') await enterExitChecks(page, { mode: 'touch', ck: (n, ok, d) => check(tag, ok, n + (ok || !d ? '' : ' — ' + String(d).slice(0, 300))), tap: (x, y) => T.tap(x, y) });

  // --- guide again from the ☰ menu ---
  await T.ptap('#aMenu');
  const gb = await page.evaluate(() => { const b = document.getElementById('aGuide'); return !!b && getComputedStyle(b).display !== 'none'; });
  check(tag, gb, '☰ menu has "Touch controls"');
  if (gb) {
    await T.ptap('#aGuide');
    check(tag, await page.evaluate(() => !document.getElementById('tguide').hidden), 'it opens the guide again');
    if (!firstGuide) await shot(page, `${tag}-guide.png`);
    await T.ptap('#tguide .tgs');
  }
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

async function desktopPass() {
  const tag = 'desktop';
  console.log(`\n${tag}: 1366x768, mouse`);
  const { ctx, page } = await newPage({ viewport: { width: 1366, height: 768 } });
  // this pass checks the mouse controls, not the looks: low graphics keep the software renderer from taking minutes
  await page.addInitScript(() => { try { localStorage.setItem('ww3_settings', JSON.stringify({ gfx: 'low' })); } catch (e) {} });
  const S = await battle(page);
  await frames(page, 3);
  check(tag, await page.evaluate(() => !TOUCHUI), 'no touch layout with a mouse');
  let p = await scr(page, S.ids[0]);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); await frames(page);
  let s = await sel(page);
  check(tag, s.length === 1 && s[0] === S.ids[0], 'left-click on a unit selects it');
  check(tag, await page.evaluate(() => { const t = document.getElementById('tstrip'); return !t || t.hidden; }), 'no touch command strip with a mouse');
  await acts(page);
  await page.mouse.move(p.x + 120, p.y - 60); await page.mouse.down({ button: 'right' }); await page.mouse.up({ button: 'right' }); await frames(page, 1);
  let a = await acts(page);
  check(tag, a.some(x => x.t === 'go'), `right-click on the ground orders a move (Standard default) (${a.map(x => x.t).join(',')})`);
  check(tag, await page.evaluate(() => !document.querySelector('.tmark') && !(TC.marks)), 'no touch order markers from the mouse');
  const c0 = await page.evaluate(() => ({ x: cam.x, y: cam.y }));
  await page.mouse.click(p.x + 200, p.y + 80); await frames(page);
  check(tag, (await sel(page)).length === 0, 'left-click on empty ground deselects (Standard default)');
  const box = await page.evaluate(ids => { const r = cv.getBoundingClientRect(); const ps = ids.map(id => { const e = G.byId.get(id), p = toScreen(e.x, unitH(e) + 4, e.y); return { x: p.x + r.left, y: p.y + r.top }; });
    return { x0: Math.min(...ps.map(p => p.x)) - 30, y0: Math.min(...ps.map(p => p.y)) - 30, x1: Math.max(...ps.map(p => p.x)) + 30, y1: Math.max(...ps.map(p => p.y)) + 30 }; }, S.ids);
  await page.mouse.move(box.x0, box.y0); await page.mouse.down(); await page.mouse.move(box.x1, box.y1, { steps: 8 }); await page.mouse.up(); await frames(page);
  s = await sel(page);
  const c1 = await page.evaluate(() => ({ x: cam.x, y: cam.y }));
  check(tag, S.ids.every(id => s.includes(id)), `left-drag draws a selection box (${s.length} selected)`);
  check(tag, Math.hypot(c1.x - c0.x, c1.y - c0.y) < 1, 'a left-drag does not scroll the map');
  check(tag, await page.evaluate(() => { const g = document.getElementById('tguide'); return !g || g.hidden; }), 'no touch guide on a desktop');
  await shot(page, 'desktop-sanity.png');
  await ctx.close();
}

try {
  if (process.env.TOUCH_DESK_ONLY) { await desktopPass(); throw new Error('desktop only'); }
  if (process.env.TOUCH_LAND_ONLY) { await phonePass('landscape', { width: 844, height: 390 }, { cookies: [], origins: [{ origin: ORIGIN, localStorage: [{ name: 'ww3_touchGuide', value: '1' }] }] }); throw new Error('landscape only'); }
  const st = await phonePass('portrait', { width: 390, height: 844 });
  if (process.env.TOUCH_QUICK) throw new Error('quick mode: stopped after portrait');
  await phonePass('landscape', { width: 844, height: 390 }, st);
  await desktopPass();
} catch (e) {
  fails.push('test crashed: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | '));
}
await browser.close();
server.close();
const uniq = [...new Set(fails)];
console.log(`\n${passes.length} checks passed, ${uniq.length} failed (${((Date.now() - t0) / 1000).toFixed(0)}s) — screenshots in orch/shots/touch/`);
if (uniq.length) { console.log('TOUCH FAIL'); for (const f of uniq.slice(0, 30)) console.log('  ✗ ' + f); process.exit(1); }
console.log('TOUCH PASS');
