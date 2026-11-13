// Polish guard (orch/polishP2): the "never lose progress / settings / readability" promises, checked in a real browser.
//   node orch/polishtest.mjs      prints POLISH PASS / POLISH FAIL
// 2. Settings: the Keyboard keys window lists the whole key table, refuses W A S D / keys in use, rebinding works in a battle, Reset restores;
//    the first-launch graphics check picks a preset once.
// 3. Campaign panels: every grand-map panel (GPAN, src/13zzz-gpanels.js) has the shared frame and close X, Esc closes the top one.
// 4. Readability: text size 115 / 130 % keeps every menu, overlay and grand panel inside the window at 1366x768 and 1920x1080; colour-blind shapes.
// 1. Never lose progress: the grand campaign is saved on a timer with 3 rolling copies, a damaged save falls back to a copy,
//    and after reloading the page "Continue" is the first item of the single-player list and reopens the campaign.
import { boot, ROOT } from './savelib.mjs';
import fs from 'node:fs';
import path from 'node:path';
const SHOTS = path.join(ROOT, 'orch', 'shots', 'polish'); fs.mkdirSync(SHOTS, { recursive: true });
const shot = (pg, n) => pg.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 72 }).catch(() => {});
const FROM = (() => { const i = process.argv.indexOf('--from'); return i > 0 ? Number(process.argv[i + 1]) : 1; })();   // --from 3: only the grand-map sections (quick)
const fails = []; const ck = (c, m) => { if (!c) fails.push(m); };
const B = await boot();
try {
  if (FROM < 3) {
  const P = await B.open();
  await P.waitForFunction(() => typeof svMenuSync === 'function' && typeof grNew === 'function' && typeof MX !== 'undefined', null, { timeout: 120000 });
  // ---- 1. never lose progress
  const a = await P.evaluate(async () => { localStorage.clear(); await svMenuSync(); mxContSync();
    const none = document.getElementById('svContinue').hidden && MX.cont.hidden;
    grNew({ me: 'IR', seed: 7, len: 'quick' }); grandOpen(); const open = !!document.getElementById('grandScreen');
    const K = GR_KEY; localStorage.removeItem(K); const t1 = grAutoTick();            // not due yet
    GR_AUTO.t = Date.now() - GR_AUTO.ms - 1000; const t2 = grAutoTick();               // due: saves + first copy
    const s1 = !!localStorage.getItem(K), b1 = !!localStorage.getItem(K + '.b1');
    grAutoTick(true); grAutoTick(true); grAutoTick(true);
    const copies = [1, 2, 3].filter(i => localStorage.getItem(K + '.b' + i)).length, extra = !!localStorage.getItem(K + '.b4');
    const info = JSON.parse(localStorage.getItem(K + '.i') || 'null'), size = localStorage.getItem(K).length;
    localStorage.setItem(K, '{broken'); const turn = GC.turn; GC = null; const back = grLoad(); const fell = !!back && back.turn === turn; grSave();
    return { none, open, t1, t2, s1, b1, copies, extra, info, size, fell }; });
  console.log('grand autosave', JSON.stringify(a));
  ck(a.none, 'Continue is shown although nothing is saved'); ck(a.open, 'grand map did not open');
  ck(!a.t1 && a.t2 && a.s1 && a.b1, 'grand autosave timer does not save when due (or saves when not due)');
  ck(a.copies === 3 && !a.extra, 'grand campaign must keep exactly 3 rolling copies, has ' + a.copies);
  ck(a.info && a.info.n && a.info.ts > 0, 'grand save lacks the menu note (.i)'); ck(a.fell, 'a damaged grand save did not fall back to a safety copy');
  ck(a.size * 4 < 4.5e6, 'grand save too big for 4 copies in browser storage: ' + a.size + ' chars each');
  await P.reload({ waitUntil: 'load' });
  await P.waitForFunction(() => typeof svMenuSync === 'function' && typeof MX !== 'undefined' && MX.cont, null, { timeout: 120000 });
  await P.waitForFunction(() => { const b = document.getElementById('svContinue'); return b && !b.hidden && !MX.cont.hidden; }, null, { timeout: 20000 }).catch(() => fails.push('Continue did not appear after reload with a saved campaign'));
  await P.waitForTimeout(1500); await shot(P, 'continue');
  const c = await P.evaluate(() => { const vis = [...document.querySelectorAll('#mxmenu .mxi')].filter(b => !b.hidden); const sp = document.querySelector('#ms-single .mxlist');
    const spFirst = sp ? [...sp.querySelectorAll('.mxi')].filter(b => !b.hidden)[0] : null;
    const r = { first: vis[0] && vis[0].textContent, isCont: vis[0] === MX.cont, kind: document.getElementById('svContinue').dataset.kind, sp: sp ? (spFirst && spFirst.id) : 'no-window' }; MX.cont.click(); return r; });
  console.log('continue', JSON.stringify(c));
  ck(c.isCont && /^Continue/.test(c.first || '') && /Grand campaign/.test(c.first || ''), 'Continue is not the first menu item for a saved campaign: ' + c.first);
  ck(c.sp === 'no-window' || c.sp === 'mxContSP', 'Continue is not the first item of the Single player window');
  await P.waitForFunction(() => !!document.getElementById('grandScreen') && typeof GC !== 'undefined' && GC && GC.me === 'IR', null, { timeout: 60000 }).catch(() => fails.push('Continue did not reopen the saved grand campaign'));
  // ---- 2. settings: the Keyboard keys window (the one key table) + first-launch graphics check
  await P.close();
  const Q = await B.open();
  await Q.waitForFunction(() => typeof kbSet === 'function' && typeof kbuOpen === 'function' && typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
  const k1 = await Q.evaluate(() => { localStorage.removeItem('ww3_keys'); kbLoad(); openSettings();
    const btn = document.getElementById('sKeys'); const inCtl = !!btn && !!btn.closest('[data-pp="ctl"],.uk-pane') ; btn.click();
    const w = document.getElementById('kbWin'); const rows = w ? w.querySelectorAll('.kbrow').length : 0;
    const r = { btn: !!btn, win: !!w, rows, all: rows === KEYTAB.length, setHidden: document.getElementById('settings').hidden,
      wasd: kbSet('stop', 'w'), used: kbSet('stop', 'f'), digit: kbSet('stop', '1'), tab: kbSet('stop', 'Tab'), fixed: kbSet('nope', 'c'), ok: kbSet('stop', 'F8'), back: kbSet('amove', 'x'), swap2: kbSet('stop', 'x') };
    r.cur = { stop: KB.cur.stop, amove: KB.cur.amove }; r.stored = localStorage.getItem('ww3_keys');
    // letters used by the handlers must all be rows of the table
    r.dupes = ['battle', 'grand'].map(c => { const d = KEYTAB.filter(x => x.def && x.ctx === c).map(x => x.def); return d.length - new Set(d).size; });
    r.pow = Object.values(POW_KEY).filter(k => !KEYTAB.some(x => x.def === k && x.ctx === 'battle'));
    kbuPaint(); return r; });
  await shot(Q, 'keys');
  console.log('keys', JSON.stringify(k1));
  ck(k1.btn && k1.win && k1.all && k1.rows > 30, 'Keyboard keys window missing or does not list every row of the key table'); ck(k1.setHidden, 'Settings must step aside while the Keyboard keys window is open (one job per window)');
  ck(/W, A, S and D/.test(k1.wasd), 'W A S D must be refused: ' + k1.wasd); ck(/already used for "Attack-move"/.test(k1.used), 'a key in use must be refused with a plain message: ' + k1.used);
  ck(/Only letters/.test(k1.digit) && /Only letters/.test(k1.tab) && k1.fixed, 'digits / unknown actions must be refused'); ck(k1.ok === '' && k1.back === '' && /already used/.test(k1.swap2), 'rebinding to a free key failed: ' + JSON.stringify([k1.ok, k1.back, k1.swap2]));
  ck(k1.cur.stop === 'F8' && k1.cur.amove === 'x' && /"stop":"F8"/.test(k1.stored || ''), 'rebinding is not stored'); ck(!k1.dupes[0] && !k1.dupes[1] && !k1.pow.length, 'key table has duplicate letters or misses a power key: ' + JSON.stringify([k1.dupes, k1.pow]));
  // Esc: first cancels "press a key", then closes the window and Settings is back
  await Q.click('#kbWin .kbk[data-id="hq"]'); await Q.keyboard.press('x'); const refused = await Q.evaluate(() => document.querySelector('#kbWin .kbmsg').textContent);
  await Q.keyboard.press('Escape'); const still = await Q.evaluate(() => !!document.getElementById('kbWin')); await Q.keyboard.press('Escape');
  const after = await Q.evaluate(() => ({ win: !!document.getElementById('kbWin'), set: !document.getElementById('settings').hidden, hq: KB.cur.hq })); await Q.keyboard.press('Escape');
  ck(/already used/.test(refused) && still && !after.win && after.set && after.hq === 'h', 'Keyboard keys window: refusal message / Esc one step back is wrong: ' + JSON.stringify({ refused, still, after }));
  // in a battle: X now attack-moves, F (its old key) does nothing, [ stops; after Reset the standard keys work again
  await Q.evaluate(() => { document.getElementById('settings').hidden = true; setup.n = 1; startSingle(); });
  await Q.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.ents.some(e => !e.isB && e.team === ME), null, { timeout: 900000, polling: 250 });
  const press = async (key) => { await Q.evaluate(() => { G.amove = false; G.sel = G.ents.filter(e => !e.isB && e.team === ME && !e.dead).slice(0, 3); window.__stops = 0; if (!window.__da) { window.__da = doAct; doAct = function (a) { if (a && a.t === 'stop') window.__stops++; return window.__da.apply(this, arguments); }; } });
    await Q.keyboard.press(key); return Q.evaluate(() => ({ am: !!G.amove, stops: window.__stops })); };
  const bx = await press('x'), bf = await press('f'), bb = await press('F8');
  await Q.evaluate(() => kbReset()); const rx = await press('x'), rf = await press('f');
  console.log('battle keys', JSON.stringify({ bx, bf, bb, rx, rf }));
  ck(bx.am && !bx.stops && !bf.am && !bf.stops && bb.stops === 1 && !bb.am, 'rebound keys do not work in battle: ' + JSON.stringify({ bx, bf, bb }));
  ck(rx.stops === 1 && !rx.am && rf.am, 'Reset to defaults did not restore the standard keys: ' + JSON.stringify({ rx, rf }));
  // first-launch graphics check: picks once from a 3 s measurement, never again, never for a returning player
  const bn = await Q.evaluate(() => { const picks = [benchPick(20, 0, .004, 60), benchPick(60, 0, .004, 60), benchPick(58, 0, .012, 60), benchPick(60, 2, .004, 60), benchPick(140, 0, .003, 144)];
    const auto0 = benchWant(); window.__bench = 1; delete SET.gfxB; SET.gfx = 'auto'; BENCH.done = false; BENCH.t = 0; BENCH.n = 0; BENCH.skip = 0; G.paused = false; QUAL.lv = 0; QUAL.cost = .004;
    for (let i = 0; i < 200; i++) benchTick(1 / 60); const r1 = BENCH.res && BENCH.res.pick, g1 = SET.gfx, once = SET.gfxB === 1 && !benchWant(); window.__bench = 0; return { picks, auto0, r1, g1, once }; });
  console.log('bench', JSON.stringify(bn));
  ck(bn.picks.join() === 'low,high,auto,low,high', 'graphics check picks the wrong preset: ' + bn.picks); ck(!bn.auto0, 'graphics check must not run in automated tests / for returning players');
  ck(bn.r1 === 'high' && bn.g1 === 'high' && bn.once, 'graphics check did not set the preset exactly once: ' + JSON.stringify(bn));
  // text size in a battle: the command bar grows, the battlefield shrinks to make room, nothing reaches past the window, the minimap still maps clicks
  for (const [W, H] of [[1366, 768]]) { await Q.setViewportSize({ width: W, height: H }); await Q.evaluate(() => { tsSet(1.3); G.paused = false; });   // the tight case; the build grid (#panel) scrolls sideways by design at every size await Q.waitForTimeout(1200);
    const hb = await Q.evaluate(() => { const r = (id) => { const e = document.getElementById(id); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); };
      const out = [...document.querySelectorAll('#side button, #side canvas, #log, #hint')].filter(e => e.getClientRects().length && !e.closest('#panel')).filter(e => { const b = e.getBoundingClientRect(); return b.width > 2 && (b.right > innerWidth + 2 || b.bottom > innerHeight + 2 || b.left < -2); }).map(e => e.id || e.className || e.tagName).slice(0, 5);
      const m = document.getElementById('mm').getBoundingClientRect(); return { side: r('side'), stage: r('stage'), cv: r('cv'), out, zoom: +getComputedStyle(document.getElementById('side')).zoom, W: innerWidth, H: innerHeight, mm: [m.width > 20, m.right <= innerWidth + 1, m.bottom <= innerHeight + 1] }; });
    console.log('battle text size', W + 'x' + H, JSON.stringify(hb));
    ck(hb.zoom === 1.3 && hb.side && hb.side[3] <= H + 1 && hb.side[2] <= W + 1 && hb.stage[3] <= hb.side[1] + 2 && hb.cv[3] <= hb.side[1] + 2 && !hb.out.length && hb.mm.every(Boolean), 'battle HUD at 130% text does not fit ' + W + 'x' + H + ': ' + JSON.stringify(hb));
    await Q.evaluate(() => { G.paused = true; }); if (W === 1366) await shot(Q, 'textsize-battle'); }
  await Q.evaluate(() => tsSet(1));
  // ---- 3. campaign panels: one frame, one close X in the same corner, Esc closes the top-most panel, one per press
  await Q.close(); }
  const R = await B.open();
  await R.waitForFunction(() => typeof grNew === 'function' && typeof gpxDress === 'function', null, { timeout: 120000 });
  await R.evaluate(() => { localStorage.clear(); grNew({ me: 'IR', seed: 7, len: 'quick' }); grandOpen(); const c = document.getElementById('gCoach'); if (c) c.remove(); });
  await R.waitForTimeout(1500);
  const openers = { gEco: () => geUiPanel(), gMil: () => gmilUiPanel(), npWin: () => npOpen('IR'), gWeb: () => gwebOpen(), gpDeal: () => { const foe = Object.keys(GC.nat).find(c => c !== 'IR' && !GC.nat[c].dead); gpOpen('IR', foe); }, gModal: () => guConfirm('Test', 'Close me with Esc', () => { window.__yes = 1; }),
    gwWin: () => { const p = GCM.P.find(q => q.land && GC.prov[q.i].o !== 'IR' && !gwFort(q.i) && GC.prov[q.i].gar.length && !GC.armies.some(a => a.at === q.i)); GC.war[grWk('IR', GC.prov[p.i].o)] = 1; grAddArmy('IR', p.i, grGenUnits('IR', 20000, true)); gwScanAt(p.i); gwuOpen(p.i); } };
  const info = async (id) => R.evaluate((id) => { const p = GPAN.find(x => x.id === id), e = document.getElementById(id); if (!e) return null; const c = p.card ? e.firstElementChild : e, x = [...c.children].filter(k => k.classList.contains('gpx-x'));
    const cr = c.getBoundingClientRect(), xr = x[0] ? x[0].getBoundingClientRect() : null; return { dressed: c.classList.contains('gpx'), xs: x.length, dx: xr ? Math.round(cr.right - xr.right) : -1, dy: xr ? Math.round(xr.top - cr.top) : -1, font: getComputedStyle(c).fontFamily.slice(0, 9), rad: getComputedStyle(c).borderTopLeftRadius, old: [...c.querySelectorAll('button')].filter(b => !b.classList.contains('gpx-x') && /✕/.test(b.textContent)).length }; }, id);
  const seen = {};
  for (const id of Object.keys(openers)) { await R.evaluate((src) => (0, eval)('(' + src + ')')(), openers[id].toString()); await R.waitForTimeout(250); const a = await info(id); seen[id] = a;
    ck(a && a.dressed && a.xs === 1 && !a.old, 'panel ' + id + ' lacks the shared frame / has no or two close buttons: ' + JSON.stringify(a));
    if (a) ck(a.dx >= 8 && a.dx <= 16 && a.dy >= 6 && a.dy <= 16, 'panel ' + id + ': close X is not in the shared top-right corner: ' + JSON.stringify(a));
    if (id === 'npWin') await shot(R, 'panel-nation'); if (id === 'gMil') await shot(R, 'panel-military');
    await R.keyboard.press('Escape'); await R.waitForTimeout(150); ck(!(await R.evaluate((id) => !!document.getElementById(id), id)), 'Esc did not close ' + id); }
  console.log('panels', JSON.stringify(seen));
  ck(new Set(Object.values(seen).filter(Boolean).map(a => a.font + a.rad)).size === 1, 'grand panels do not share one font / corner radius');
  // stack: Esc closes one per press, top-most first; a dialog that needs an answer is not skipped
  const stack = await R.evaluate(async () => { const o = []; geUiPanel(); gmilUiPanel(); npOpen('IR'); guConfirm('A', 'b', () => {}); const ids = ['gModal', 'npWin', 'gMil', 'gEco'];
    const st = () => ids.filter(i => document.getElementById(i)).join(','); o.push(st()); for (let i = 0; i < 4; i++) { o.push(gpxCloseTop() + '>' + st()); }
    guModal('Pick', [['One', () => { window.__one = 1; }, 1], ['Two', () => {}, 0]]); const blocked = gpxCloseTop(), still = !!document.getElementById('gModal'), noX = !document.querySelector('#gModal .gpx-x'); document.getElementById('gModal').remove();
    grandClose(); grandMenu(); const camp = !!document.getElementById('campScreen'); return { o, blocked, still, camp }; });
  await R.keyboard.press('Escape'); await R.waitForTimeout(200); stack.campGone = !(await R.evaluate(() => !!document.getElementById('campScreen')));
  console.log('stack', JSON.stringify(stack));
  ck(stack.o.join(' ') === 'gModal,npWin,gMil,gEco gModal>npWin,gMil,gEco npWin>gMil,gEco gMil>gEco gEco>', 'Esc must close the top-most grand panel, one per press: ' + stack.o.join(' '));
  ck(stack.blocked === 'blocked' && stack.still, 'a dialog that needs an answer must not be skipped by Esc'); ck(stack.camp && stack.campGone, 'Esc on the Grand campaign menu must go one step back');
  ck(await R.evaluate(() => GPAN.length >= 11 && ['gMilX', '_gPanelEsc', '_npKeys'].every(k => !document.getElementById(k) && !window[k])), 'old per-panel close / Esc code is back');
  // ---- 4. readability: text size 100 / 115 / 130 % - nothing reaches past the window at 1366x768 and 1920x1080; colour-blind shapes
  const offScreen = () => R.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))); const bad = [], W = innerWidth, H = innerHeight; const sel = TS_ROOTS.join(',');
    for (const el of document.querySelectorAll(sel)) { if (!el.getClientRects().length) continue; const st = getComputedStyle(el); if (st.visibility === 'hidden' || +st.opacity === 0) continue; const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
      const scrollHost = el.closest('.overlay'); if (scrollHost && el.matches('.overlay>.card')) { if (r.left < -2 || r.right > W + 2) bad.push((el.id || el.className || el.tagName) + ' x ' + Math.round(r.left) + '..' + Math.round(r.right)); continue; }
      if (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2) bad.push((el.id || String(el.className).slice(0, 20) || el.tagName) + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',')); }
    return bad; });
  const zoomOf = (sel) => R.evaluate((sel) => { const e = document.querySelector(sel); return e ? +getComputedStyle(e).zoom : 0; }, sel);
  const tsRes = {};
  for (const [W, H] of (process.argv.includes('--small') ? [[1366, 768]] : [[1366, 768], [1920, 1080]])) { await R.setViewportSize({ width: W, height: H });
    for (const ts of [1.3, 1.15]) { const key = W + 'x' + H + '@' + ts; tsRes[key] = {};
      // main menu + settings + keyboard window
      await R.evaluate((ts) => { try { grandClose(); } catch (e) {} const c = document.getElementById('campScreen'); if (c) c.remove(); document.getElementById('menu').hidden = false; tsSet(ts); }, ts); await R.waitForTimeout(400);
      tsRes[key].menu = await offScreen(); ck(Math.abs(await zoomOf('#mx') - ts) < .01, key + ': the main menu did not take the text size');
      await R.evaluate(() => { openSettings(); }); await R.waitForTimeout(300); tsRes[key].settings = await offScreen(); if (W === 1366 && ts === 1.3) await shot(R, 'textsize-settings');
      await R.evaluate(() => { kbuOpen(); }); await R.waitForTimeout(300); tsRes[key].keys = await offScreen(); await R.evaluate(() => { kbuClose(true); document.getElementById('settings').hidden = true; });
      // grand map: top bar, province column, every panel
      await R.evaluate(() => { if (!GC) grNew({ me: 'IR', seed: 7, len: 'quick' }); grandOpen(); const c = document.getElementById('gCoach'); if (c) c.remove(); }); await R.waitForTimeout(900);
      tsRes[key].grand = await offScreen();
      for (const [id, src] of Object.entries({ gEco: 'geUiPanel()', gMil: 'gmilUiPanel()', npWin: "npOpen('IR')", gWeb: 'gwebOpen()', gpDeal: "gpOpen('IR',Object.keys(GC.nat).find(c=>c!=='IR'&&!GC.nat[c].dead))", gModal: "guConfirm('Declare war?','Text size test',()=>{})" })) {
        await R.evaluate((c) => (0, eval)(c), src); await R.waitForTimeout(350); tsRes[key][id] = await offScreen(); if (id === 'npWin' && W === 1366 && ts === 1.3) await shot(R, 'textsize-nation');
        await R.evaluate(() => { for (let i = 0; i < 3 && gpxCloseTop(); i++); }); }
      for (const [k, v] of Object.entries(tsRes[key])) ck(!v.length, 'text size ' + key + ' ' + k + ': reaches past the window: ' + v.slice(0, 4).join(' | ')); } }
  console.log('text size', JSON.stringify(Object.fromEntries(Object.entries(tsRes).map(([k, v]) => [k, Object.values(v).flat().length]))));
  const cbm = await R.evaluate(() => { tsSet(1); const off = !document.documentElement.classList.contains('ts-on'); SET.cb = 1; const g = [0, 1, 2, 3].map(cbGlyph); SET.cb = 0; const none = cbGlyph(0);
    const lbl = [...document.querySelectorAll('#setBody .label')].map(x => x.textContent).filter(t => /Colou?r-blind|Text size/.test(t)).length; return { off, g, none, lbl, seg: document.querySelectorAll('#sTs button').length }; });
  console.log('cb', JSON.stringify(cbm));
  ck(cbm.off && cbm.seg === 3 && cbm.lbl === 2, 'Text size / Colour-blind settings missing: ' + JSON.stringify(cbm)); ck(new Set(cbm.g).size === 4 && cbm.none === '', 'colour-blind mode: each team needs its own shape');
} catch (e) { fails.push('polishtest crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of B.errs || []) fails.push(e);
await B.close();
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'POLISH FAIL (' + fails.length + ')' : 'POLISH PASS');
process.exit(fails.length ? 1 : 0);
