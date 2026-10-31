// Input test: does every mouse (and basic touch) control do what it should?
// Serves the repo locally, opens the game in headless Chromium, starts a skirmish, freezes the battle clock and places
// a few test units, then drives the real mouse/keyboard/touch events (Playwright) and checks what happened: the
// selection, the orders sent to the battle (every doAct call is recorded), the rally point, the camera.
//
//   node orch/controls.mjs            # desktop: Standard scheme (default) + mouse lock + Generals scheme; phone: basic taps
//   node orch/controls.mjs --no-lock  # skip the machine-wide browser lock (see browserlock.mjs)
//
// Screenshots go to orch/out/controls-*.png. Never talks to the live game servers (guardContext + page.route).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
import { enterExitChecks } from './enterexit.mjs';
import { stanceChecks } from './stances.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
fs.mkdirSync(OUT, { recursive: true });

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) {
    try { return req(p); } catch {}
  }
  throw new Error('playwright not found (npm i -g playwright, then npx playwright install chromium)');
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
  '.mp3': 'audio/mpeg', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const results = [], errors = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok }); console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !info ? '' : '  — ' + info}`); };
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

async function openGame(ctxOpts, saved) {
  const ctx = await browser.newContext(ctxOpts);
  await guardContext(ctx);
  if (saved) await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__saved')) { localStorage.setItem('ww3_settings', JSON.stringify(s)); sessionStorage.setItem('__saved', '1'); } } catch (e) {} }, saved);
  // the phone's first-time touch guide (a card near the top) is tested in orch/touch.mjs; here it would cover test units
  await ctx.addInitScript(() => { try { localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => errors.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (!/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) errors.push('console error: ' + t.slice(0, 300));
  });
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(() => { setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 });
  // Freeze the battle (drawing and input keep running), place the test units, record every order sent to the battle.
  await page.evaluate(() => {
    G.paused = true; SET.edge = 0;
    window.__acts = []; const o = doAct; doAct = function (a) { __acts.push(JSON.parse(JSON.stringify(a))); return o(a); };
    const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'), eq = G.ents.find(b => b.team !== ME && b.kind === 'hq');
    // a patch of open, passable ground between the two bases
    const ok = (x, y) => x > 60 && y > 60 && x < MAPW - 60 && y < MAPH - 60 && passXY('ground', x, y) && fieldAt({ x, y }) < 0 && oilAt({ x, y }, true) < 0 && !civAtXYAny(x, y);
    let P = null;
    for (let f = .18; f < .6 && !P; f += .02) for (let s = -1; s <= 1 && !P; s += .5) {
      const x = hq.x + (eq.x - hq.x) * f + (eq.y - hq.y) * .08 * s, y = hq.y + (eq.y - hq.y) * f - (eq.x - hq.x) * .08 * s;
      let good = true; for (let dx = -200; dx <= 200 && good; dx += 25) for (let dy = -200; dy <= 200 && good; dy += 25) if (!ok(x + dx, y + dy)) good = false;
      if (good) P = { x, y };
    }
    if (!P) P = { x: hq.x + (eq.x - hq.x) * .3, y: hq.y + (eq.y - hq.y) * .3 };
    window.__P = P;
    window.__U = [addUnit(ME, 'inf', P.x - 70, P.y), addUnit(ME, 'inf', P.x, P.y), addUnit(ME, 'inf', P.x + 70, P.y)].map(u => u.id);
    const e = addUnit(1, 'tank', P.x, P.y - 130); e.vis = true; e.hid = false; for (const v of G.ents) if (v.team === 1 && !v.isB) v.vis = true;
    window.__E = e.id; window.__HQ = hq.id;
    G.sel = []; updateUI();
  });
  return { ctx, page };
}

// screen (page) coordinates of a unit, a world point, and the camera
async function view(page, at) {
  return page.evaluate(async (at) => {
    const P = window.__P, c = at === 'hq' ? G.byId.get(window.__HQ) : P;
    camTarget(); cam.td = cam.dist = 520; centerOn(c.x, c.y + (at === 'hq' ? 0 : -40), true); renderFrame(0.016);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); renderFrame(0.016);
    const R = cv.getBoundingClientRect();
    const sc = e => { const p = toScreen(e.x, unitH(e) + entHeightMid(e) * .6, e.y); return { x: R.left + p.x, y: R.top + p.y }; };
    const free = (wx, wy) => { const p = toScreen(wx, groundH(wx, wy), wy); const x = R.left + p.x, y = R.top + p.y;
      return { x, y, ok: document.elementFromPoint(x, y) === cv && !pickAt(p.x, p.y, false) }; };
    const out = { U: window.__U.map(id => sc(G.byId.get(id))), E: sc(G.byId.get(window.__E)), HQ: sc(G.byId.get(window.__HQ)),
      ground: [], line: null, hqGround: null, onScreen: true };
    // open ground on screen (not under the command bar or a unit), nearest to the test units first; the layout differs
    // between screens and machines, so search instead of using fixed spots
    const cand = [];
    for (let dy = -220; dy <= 220; dy += 40) for (let dx = -240; dx <= 240; dx += 60) if (Math.abs(dy) >= 60 || Math.abs(dx) > 150) cand.push([dx, dy]);
    cand.sort((a, b) => Math.hypot(a[0], a[1] * 1.3) - Math.hypot(b[0], b[1] * 1.3));
    for (const [dx, dy] of cand) { const f = free(P.x + dx, P.y + dy); if (f.ok && out.ground.every(q => Math.hypot(q.x - f.x, q.y - f.y) > 40)) out.ground.push(f); if (out.ground.length >= 4) break; }
    for (const dy of [60, -60, 100, -100, 140, 180, -180]) { const a = free(P.x - 160, P.y + dy), b = free(P.x + 160, P.y + dy); if (a.ok && b.ok) { out.line = [a, b]; break; } }
    const hq = G.byId.get(window.__HQ); out.hqGround = free(hq.x + (P.x - hq.x) * .35, hq.y + (P.y - hq.y) * .35);
    for (const p of [...out.U, out.E]) if (document.elementFromPoint(p.x, p.y) !== cv) out.onScreen = false;
    return out;
  }, at);
}
const sel = page => page.evaluate(() => G.sel.filter(e => !e.dead).map(e => e.id).sort((a, b) => a - b));
const acts = page => page.evaluate(() => { const a = window.__acts; window.__acts = []; return a; });
const clear = page => page.evaluate(() => { G.sel = []; G.amove = G.defm = false; G.place = G.aim = null; window.__acts = []; updateUI(); });
const wait = ms => new Promise(r => setTimeout(r, ms));
async function rdrag(page, a, b, holdMs = 0) {
  await page.mouse.move(a.x, a.y); await page.mouse.down({ button: 'right' });
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 4 });
  if (holdMs) await wait(holdMs);
  await page.mouse.up({ button: 'right' });
}
const sameIds = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const t0 = Date.now();
try {
  /* ================= desktop mouse ================= */
  console.log('desktop (1600×900, mouse)');
  // a player who saved the old Generals default before 2026-10-29: moved to the new Standard scheme once
  const { page } = await openGame({ viewport: { width: 1600, height: 900 } },
    { mLG: 'move', mRC: 'cancel', mRDU: 'line', mRDN: 'scroll', mAK: 'a', mRS: 100, mCur: 1, mPing: 1 });
  const scheme = await page.evaluate(() => ({ pre: mPreset(), mAK: SET.mAK, saved: JSON.parse(localStorage.getItem('ww3_settings') || '{}'), hint: $('hint').textContent }));
  check('default mouse scheme is Standard (old saved Generals default migrated once)', scheme.pre === 'std' && scheme.saved.mRC === 'order' && scheme.saved.ctl2 === 1, JSON.stringify(scheme).slice(0, 200));
  check('on-screen hint: left selects, right moves/attacks, F attack-move', /Left-click or drag: select/.test(scheme.hint) && /Right-click: move \/ attack/.test(scheme.hint) && /F then click: attack-move/.test(scheme.hint), scheme.hint.slice(0, 160));
  { const txt = await page.evaluate(() => [...document.querySelectorAll('#hint,#settings,#side,#info')].map(e => e.textContent).join(' '));
    check('no text says A attack-moves or S stops', !/\bA\b[^·]{0,12}(then click|attack-move)|\bS: stop|Attack \(A\)/.test(txt), (txt.match(/.{30}\bA\b.{30}/) || [''])[0]); }
  let V = await view(page);
  check('test units are on screen', V.onScreen, JSON.stringify(V.U));
  const g = V.ground;
  check('open ground to click on', g.length >= 3 && V.line, JSON.stringify(V.ground));
  const [A, B, C] = await page.evaluate(() => window.__U.slice().sort((a, b) => a - b));
  const E = await page.evaluate(() => window.__E);
  const setSel = ids => page.evaluate(ids => { G.sel = ids.map(i => G.byId.get(i)); updateUI(); window.__acts = []; }, ids);
  let a, s;

  console.log(' Standard scheme (default)');
  await clear(page);
  // After an order the units deselect (Abdullah 2026-10-30 20:54); Shift keeps them; Settings toggle mKeep keeps them
  await page.evaluate(() => { SET.mKeep = 0; });
  await setSel([A, B]);
  await page.mouse.click(g[1].x, g[1].y, { button: 'right' });
  a = await acts(page);
  check('right-click move gives the order', a.some(x => x.t === 'go'), JSON.stringify(a));
  check('…and the selection is empty afterwards', (await sel(page)).length === 0, JSON.stringify(await sel(page)));
  await setSel([A, B]);
  await page.keyboard.down('Shift'); await page.mouse.click(g[2].x, g[2].y, { button: 'right' }); await page.keyboard.up('Shift');
  a = await acts(page);
  check('Shift+right-click keeps the selection', a.some(x => x.t === 'go') && sameIds(await sel(page), [A, B]), JSON.stringify({ a, s: await sel(page) }));
  await page.evaluate(() => { SET.mKeep = 1; });
  await setSel([A, B]);
  await page.mouse.click(g[1].x, g[1].y, { button: 'right' });
  a = await acts(page);
  check('with "Keep units selected" on, the selection stays', a.some(x => x.t === 'go') && sameIds(await sel(page), [A, B]), JSON.stringify({ a, s: await sel(page) }));
  // (SET.mKeep stays on below: the older checks chain several orders on one selection)
  await clear(page);
  await page.mouse.click(V.U[0].x, V.U[0].y);
  check('left-click own unit selects it', sameIds(await sel(page), [A]), JSON.stringify(await sel(page)));
  await page.keyboard.down('Shift'); await page.mouse.click(V.U[1].x, V.U[1].y); await page.keyboard.up('Shift');
  check('Shift+click adds to the selection', sameIds(await sel(page), [A, B]), JSON.stringify(await sel(page)));
  await acts(page);
  await page.mouse.click(g[0].x, g[0].y, { button: 'right' });
  a = await acts(page);
  check('right-click ground = move order', a.some(x => x.t === 'go' && x.mode === 'move' && sameIds(x.ids.slice().sort((p, q) => p - q), [A, B])), JSON.stringify(a));
  check('…and keeps the selection', sameIds(await sel(page), [A, B]));
  await page.mouse.click(V.E.x, V.E.y, { button: 'right' });
  a = await acts(page);
  check('right-click enemy = attack order', a.some(x => x.t === 'atk' && x.tid === E), JSON.stringify(a));
  await page.mouse.click(V.E.x, V.E.y);
  a = await acts(page);
  check('left-click enemy selects it (no order)', !a.length && sameIds(await sel(page), [E]), JSON.stringify({ a, s: await sel(page) }));
  await setSel([A, B]);
  await page.mouse.click(g[0].x, g[0].y);
  a = await acts(page);
  check('left-click empty ground deselects (no order)', (await sel(page)).length === 0 && !a.length, JSON.stringify(a));
  await page.mouse.dblclick(V.U[0].x, V.U[0].y);
  s = await sel(page);
  check('double-click selects every unit of that type on screen', [A, B, C].every(id => s.includes(id)), JSON.stringify(s));
  await clear(page);
  { const xs = [V.U[0].x, V.U[1].x], ys = [V.U[0].y, V.U[1].y];
    await page.mouse.move(Math.min(...xs) - 25, Math.min(...ys) - 25); await page.mouse.down();
    await page.mouse.move(Math.max(...xs) + 25, Math.max(...ys) + 25, { steps: 6 }); await page.mouse.up(); }
  s = await sel(page);
  check('left-drag draws a selection box', s.includes(A) && s.includes(B) && !s.includes(C), JSON.stringify(s));
  // F + click (left or right) = attack-move; A does nothing
  await setSel([A, B]);
  await page.keyboard.press('a');
  a = await acts(page);
  check('A does nothing (no attack-move, no order)', await page.evaluate(() => !G.amove) && !a.length, JSON.stringify(a));
  await page.keyboard.press('f');
  check('F arms attack-move', await page.evaluate(() => G.amove === true));
  await page.mouse.click(g[1].x, g[1].y);
  a = await acts(page);
  check('F then left-click ground = attack-move order', a.some(x => x.t === 'go' && x.mode === 'amove'), JSON.stringify(a));
  check('…selection kept after attack-move', sameIds(await sel(page), [A, B]));
  await page.keyboard.press('f');
  await page.mouse.click(g[2].x, g[2].y, { button: 'right' });
  a = await acts(page);
  check('F then right-click ground = attack-move order', a.some(x => x.t === 'go' && x.mode === 'amove'), JSON.stringify(a));
  // Ctrl / Alt / G / X
  await page.keyboard.down('Control'); await page.mouse.click(V.E.x, V.E.y); await page.mouse.click(g[1].x, g[1].y); await page.keyboard.up('Control');
  a = await acts(page);
  check('Ctrl+click enemy = force-fire on it', a.some(x => x.t === 'atk' && x.tid === E), JSON.stringify(a));
  check('Ctrl+click empty ground does not move the units', !a.some(x => x.t === 'go'), JSON.stringify(a));
  check('…selection kept after Ctrl+click', sameIds(await sel(page), [A, B]));
  await page.keyboard.down('Alt'); await page.mouse.click(g[0].x, g[0].y); await page.keyboard.up('Alt');
  a = await acts(page);
  check('Alt+click = waypoint (queued move)', a.some(x => x.t === 'go' && x.q === 1), JSON.stringify(a));
  await page.keyboard.press('g');
  check('G arms guard', await page.evaluate(() => G.defm === true));
  await page.mouse.click(g[2].x, g[2].y);
  a = await acts(page);
  check('G then click ground = guard-area order', a.some(x => x.t === 'def'), JSON.stringify(a));
  await page.keyboard.press('x');
  a = await acts(page);
  check('X stops the selected units', a.some(x => x.t === 'stop'), JSON.stringify(a));
  await page.evaluate(() => { G.place = 'barracks'; updateUI(); });
  await page.mouse.click(g[0].x, g[0].y, { button: 'right' });
  a = await acts(page);
  check('right-click cancels building placement (no order)', await page.evaluate(() => !G.place) && !a.length, JSON.stringify(a));
  // right-drag line / right-drag with nothing selected
  await setSel([A, B, C]);
  await page.mouse.move(V.line[0].x, V.line[0].y); await page.mouse.down({ button: 'right' });
  await page.mouse.move((V.line[0].x + V.line[1].x) / 2, V.line[0].y + 4, { steps: 4 }); await page.mouse.move(V.line[1].x, V.line[1].y, { steps: 4 });
  await page.evaluate(() => renderFrame(0.016)); await wait(300);
  try { await page.screenshot({ path: path.join(OUT, 'controls-line.png'), timeout: 120000 }); } catch (e) { console.log('  (screenshot skipped: ' + String(e.message).split('\n')[0] + ')'); }
  await page.mouse.up({ button: 'right' });
  a = await acts(page);
  check('right-drag with units selected = infantry line formation', a.some(x => x.t === 'line' && x.ids.length === 3), JSON.stringify(a));
  check('…selection kept after the line order', (await sel(page)).length === 3);
  await clear(page);
  { const c0 = await page.evaluate(() => ({ x: cam.tx, y: cam.ty }));
    await rdrag(page, { x: 800, y: 380 }, { x: 1050, y: 380 }, 600);
    const c1 = await page.evaluate(() => ({ x: cam.tx, y: cam.ty }));
    a = await acts(page);
    check('right-drag with nothing selected does nothing', Math.abs(c1.x - c0.x) < 5 && !a.length && !(await sel(page)).length, JSON.stringify({ c0, c1, a })); }
  // rally point
  V = await view(page, 'hq');
  await clear(page);
  await page.mouse.click(V.HQ.x, V.HQ.y);
  check('left-click own building selects it', sameIds(await sel(page), [await page.evaluate(() => window.__HQ)]), JSON.stringify(await sel(page)));
  check('rally-point ground is clickable', V.hqGround.ok, JSON.stringify(V.hqGround));
  await page.mouse.click(V.hqGround.x, V.hqGround.y);
  a = await acts(page);
  check('left-click ground with a production building selected sets its rally point', a.some(x => x.t === 'rally'), JSON.stringify(a));
  check('…and the building stays selected', (await sel(page)).length === 1);

  /* ---- mouse kept inside the game window (Pointer Lock) ---- */
  console.log(' mouse kept inside the game window');
  V = await view(page);
  await clear(page);
  // Headless Chromium has no real pointer lock, so the browser side is stood in for: requestPointerLock / exitPointerLock
  // flip document.pointerLockElement and fire pointerlockchange. Playwright's mouse sends real (trusted) events with
  // movementX/Y, which drive the game's own cursor exactly as under a real lock. (Under automation the game only asks for
// the lock when __mlockTest is set.)
  await page.evaluate(() => { let L = null; window.__lockReq = 0; window.__mlockTest = true;
    Object.defineProperty(Document.prototype, 'pointerLockElement', { configurable: true, get() { return L; } });
    HTMLCanvasElement.prototype.requestPointerLock = function () { __lockReq++; L = this; setTimeout(() => document.dispatchEvent(new Event('pointerlockchange')), 0); return Promise.resolve(); };
    Document.prototype.exitPointerLock = function () { if (!L) return; L = null; setTimeout(() => document.dispatchEvent(new Event('pointerlockchange')), 0); }; });
  const lk = () => page.evaluate(() => ({ on: MLOCK.on, x: MLOCK.x, y: MLOCK.y, req: __lockReq, vis: !$('vcur').hidden, img: !!$('vcur').style.backgroundImage, el: !!document.pointerLockElement }));
  await page.mouse.click(V.U[0].x, V.U[0].y); await wait(150);
  let L = await lk();
  check('lock: a click on the battlefield locks the mouse (and still selects)', L.req === 1 && L.on && L.el && sameIds(await sel(page), [A]), JSON.stringify(L));
  check('lock: the game draws its own cursor', L.vis && L.img, JSON.stringify(L));
  await page.mouse.move(V.U[0].x + 60, V.U[0].y + 30, { steps: 3 }); L = await lk();
  check('lock: the game cursor follows the mouse movement', Math.abs(L.x - (V.U[0].x + 60)) < 2 && Math.abs(L.y - (V.U[0].y + 30)) < 2, JSON.stringify(L));
  await page.mouse.click(g[0].x, g[0].y, { button: 'right' }); a = await acts(page);
  check('lock: right-click ground still gives a move order', a.some(x => x.t === 'go' && x.mode === 'move'), JSON.stringify(a));
  // pushed past the left edge: the cursor stops at the edge and the camera scrolls
  await page.evaluate(() => { SET.edge = 1; });
  const cx0 = await page.evaluate(() => cam.tx);
  // (the test mouse can't leave the page, so the game cursor is first put 5 px from the edge, then the mouse moves 60 px left)
  await page.mouse.move(400, 450, { steps: 2 }); await page.evaluate(() => { MLOCK.x = 5; MLOCK.y = 450; });
  await page.mouse.move(340, 450, { steps: 3 }); await wait(700);
  L = await lk(); const cx1 = await page.evaluate(() => cam.tx);
  check('lock: the cursor stays inside the window at the edge', L.x === 0 && L.on, JSON.stringify(L));
  check('lock: edge scrolling works at the window edge', cx1 < cx0 - 20, JSON.stringify({ cx0, cx1 }));
  await page.mouse.move(800, 450); await page.evaluate(() => { SET.edge = 0; MLOCK.x = 800; MLOCK.y = 450; });
  // the command bar still works: a click on the Units tab goes to the tab under the game cursor
  { const tb = await page.evaluate(() => { const b = [...document.querySelectorAll('.tabs button')].find(b => /units/i.test(b.textContent)); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(tb.x, tb.y, { steps: 3 }); await page.mouse.click(tb.x, tb.y); await wait(100);
    check('lock: clicking a command-bar tab under the game cursor works', await page.evaluate(() => TAB === 'units' && MLOCK.on), await page.evaluate(() => TAB)); }
  await page.mouse.move(V.U[0].x, V.U[0].y, { steps: 3 });
  await setSel([A, B]); await page.keyboard.press('f');
  await page.keyboard.press('Escape'); await wait(150); L = await lk();
  check('lock: Esc releases the mouse and cancels attack-move (selection kept)', !L.on && !L.el && !L.vis && await page.evaluate(() => !G.amove) && (await sel(page)).length === 2, JSON.stringify(L));
  await page.mouse.click(V.U[1].x, V.U[1].y); await wait(150); L = await lk();
  check('lock: clicking the battlefield again locks again', L.on && L.req === 2, JSON.stringify(L));
  await wait(500); await page.evaluate(() => { G.amove = true; document.exitPointerLock(); }); await wait(150);
  check('lock: when the browser itself releases it (Esc), attack-move is cancelled too', await page.evaluate(() => !MLOCK.on && !G.amove));
  await page.mouse.click(V.U[1].x, V.U[1].y); await wait(150);
  { const mb = await page.evaluate(() => { const r = $('aMenu').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(mb.x, mb.y, { steps: 3 }); await page.mouse.click(mb.x, mb.y); await wait(300); L = await lk();
    check('lock: the ☰ menu opens under the game cursor and releases the mouse', await page.evaluate(() => menuOpen()) && !L.on, JSON.stringify(L));
    await page.evaluate(() => menuOpen(false)); }
  await page.evaluate(() => { SET.mLock = 0; }); const r0 = (await lk()).req;
  await page.mouse.click(V.U[1].x, V.U[1].y); await wait(150); L = await lk();
  check('lock: Settings toggle off = the mouse is never locked', !L.on && L.req === r0, JSON.stringify(L));
  await page.evaluate(() => { SET.mLock = 1; });

  /* ---- Settings > Mouse > Generals ---- */
  console.log(' Generals scheme (chosen in Settings > Mouse)');
  await page.evaluate(() => openSettings());
  // settings buttons are pressed from inside the page: the 3D battle behind the panel renders slowly under SwiftShader,
  // and Playwright's wait-for-a-stable-frame before a click can time out on it
  const press = q => page.evaluate(q => { const b = document.querySelector(q); b.scrollIntoView({ block: 'center' }); b.click(); }, q);
  check('lock: no lock while Settings is open', await page.evaluate(() => !MLOCK.on));
  await press('#sMpre button[data-v="gen"]');
  try { await page.locator('#sMpre').evaluate(e => e.previousElementSibling.previousElementSibling.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(OUT, 'controls-settings.png'), timeout: 120000 }); } catch (e) { console.log('  (screenshot skipped)'); }
  const gen = await page.evaluate(() => ({ pre: mPreset(), mLG: SET.mLG, mRC: SET.mRC, saved: JSON.parse(localStorage.getItem('ww3_settings') || '{}').mRC, hint: $('hint').textContent, lockRow: !!$('sMLock') }));
  check('Settings > Mouse switches to Generals and saves it', gen.pre === 'gen' && gen.mRC === 'cancel' && gen.saved === 'cancel', JSON.stringify(gen));
  check('Settings > Mouse has the "keep the mouse inside the game window" toggle', gen.lockRow);
  check('hint shows the Generals controls with F attack-move', /left-click ground to move/.test(gen.hint) && /Right-click: deselect/.test(gen.hint) && /F then click: attack-move/.test(gen.hint), gen.hint.slice(0, 160));
  await press('#sDone');
  V = await view(page);
  await clear(page);
  await page.mouse.click(V.U[0].x, V.U[0].y);
  await page.keyboard.down('Shift'); await page.mouse.click(V.U[1].x, V.U[1].y); await page.keyboard.up('Shift');
  await acts(page);
  await page.mouse.click(g[0].x, g[0].y);
  a = await acts(page);
  check('gen: left-click ground = move order', a.some(x => x.t === 'go' && x.mode === 'move' && x.ids.length === 2), JSON.stringify(a));
  await page.mouse.click(V.E.x, V.E.y);
  a = await acts(page);
  check('gen: left-click enemy = attack order', a.some(x => x.t === 'atk' && x.tid === E), JSON.stringify(a));
  await page.keyboard.press('a');
  check('gen: A does nothing', await page.evaluate(() => !G.amove));
  await page.keyboard.press('f');
  await page.mouse.click(g[1].x, g[1].y);
  a = await acts(page);
  check('gen: F then click = attack-move', a.some(x => x.t === 'go' && x.mode === 'amove'), JSON.stringify(a));
  await page.mouse.click(g[0].x, g[0].y, { button: 'right' });
  a = await acts(page);
  check('gen: right-click deselects', (await sel(page)).length === 0 && !a.length, JSON.stringify({ sel: await sel(page), a }));
  await page.evaluate(() => openSettings());
  await press('#sMLG button[data-v="desel"]');
  const cu = await page.evaluate(() => ({ pre: mPreset(), mLG: SET.mLG }));
  check('per-function choice works (custom mix)', cu.pre === 'custom' && cu.mLG === 'desel', JSON.stringify(cu));
  await press('#sMreset');
  check('Reset mouse settings returns to Standard', await page.evaluate(() => mPreset() === 'std' && SET.mLock === 1));
  await press('#sDone');
  // getting in and out of transports, buildings and tunnels with no button (orch/enterexit.mjs)
  await enterExitChecks(page, { mode: 'mouse', ck: check });
  await stanceChecks(page, { mode: 'mouse', ck: check });
  // one-click powers: hotkey + 1 click, no-target = 1 press, Esc / right-click cancels
  await page.evaluate(() => { const T = G.teams[ME]; T.pw.barrage = { lv: 1, cd: 0 }; T.pw.sanc = { lv: 1, cd: 0 }; updateUI(); });
  await clear(page); await page.keyboard.press('b'); await wait(100);
  check('power: B aims the barrage', await page.evaluate(() => G.aim === 'barrage'));
  await page.keyboard.press('Escape'); await wait(100);
  check('power: Esc cancels aiming, nothing fired', await page.evaluate(() => !G.aim) && !(await acts(page)).some(x => x.t === 'pow'));
  await page.keyboard.press('b'); await wait(100); await page.mouse.click(640, 360); await wait(150);
  { const a = await acts(page); check('power: hotkey + ONE click fires the barrage', a.some(x => x.t === 'pow' && x.k === 'barrage') && await page.evaluate(() => !G.aim), JSON.stringify(a)); }
  await page.keyboard.press('b'); await wait(100); await page.mouse.click(640, 360, { button: 'right' }); await wait(150);
  check('power: right-click cancels aiming', await page.evaluate(() => !G.aim));
  await page.keyboard.press('u'); await wait(150);
  { const a = await acts(page); check('power: no-target power fires on ONE key press', a.some(x => x.t === 'pow' && x.k === 'sanc'), JSON.stringify(a)); }
  await page.context().close();

  /* ================= phone (touch) ================= */
  console.log('phone (390×844, touch)');
  const T = await openGame({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const tp = T.page;
  await tp.evaluate(() => { window.__lockReq = 0; const o = HTMLCanvasElement.prototype.requestPointerLock; HTMLCanvasElement.prototype.requestPointerLock = function () { __lockReq++; return o && o.call(this); }; });
  V = await view(tp);
  const tg = V.ground;
  check('phone: test units and open ground are on screen', V.onScreen && tg.length >= 1, JSON.stringify({ U: V.U, E: V.E, g: V.ground }));
  await clear(tp);
  await tp.touchscreen.tap(V.U[1].x, V.U[1].y);
  check('phone: tap a unit selects it', sameIds(await sel(tp), [B]), JSON.stringify(await sel(tp)));
  if (tg.length) { await wait(400); await tp.touchscreen.tap(tg[0].x, tg[0].y);
    a = await acts(tp);
    check('phone: tap the ground with units selected = move order', a.some(x => x.t === 'go'), JSON.stringify(a)); }
  check('phone: taps never lock the mouse', await tp.evaluate(() => __lockReq === 0 && !MLOCK.on));
  try { await tp.screenshot({ path: path.join(OUT, 'controls-phone.png'), timeout: 120000 }); } catch (e) {}
  await enterExitChecks(tp, { mode: 'touch', ck: check, tap: (x, y) => tp.touchscreen.tap(x, y) });
  await T.ctx.close();
} catch (e) {
  errors.push(String(e && e.stack || e).split('\n').slice(0, 4).join(' | '));
}
await browser.close();
server.close();
for (const e of [...new Set(errors)]) check(e, false);
const bad = results.filter(r => !r.ok);
console.log(`\n${bad.length ? 'CONTROLS FAIL' : 'CONTROLS PASS'} — ${results.length - bad.length}/${results.length} checks (${((Date.now() - t0) / 1000).toFixed(0)}s); screenshots orch/out/controls-*.png`);
process.exit(bad.length ? 1 : 0);
