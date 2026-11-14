// Polish guard (orch/polishP2): the "never lose progress / settings / readability" promises, checked in a real browser.
//   node orch/polishtest.mjs      prints POLISH PASS / POLISH FAIL
// 2. Settings: the Keyboard keys window lists the whole key table, refuses W A S D / keys in use, rebinding works in a battle, Reset restores;
//    the first-launch graphics check picks a preset once.
// 4. Readability: text size 115 / 130 % keeps every menu and overlay inside the window at 1366x768 and 1920x1080; colour-blind shapes.
// 1. Never lose progress: with no save "Continue" is hidden, and an old grand-campaign save (the campaign was removed 2026-11-14) is ignored
//    (battle saves + Continue after a reload: orch/savetest.mjs).
import { boot, ROOT } from './savelib.mjs';
import fs from 'node:fs';
import path from 'node:path';
const SHOTS = path.join(ROOT, 'orch', 'shots', 'polish'); fs.mkdirSync(SHOTS, { recursive: true });
const shot = (pg, n) => pg.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 72 }).catch(() => {});
const FROM = (() => { const i = process.argv.indexOf('--from'); return i > 0 ? Number(process.argv[i + 1]) : 1; })();   // --from 4: only the readability section (quick)
const fails = []; const ck = (c, m) => { if (!c) fails.push(m); };
const B = await boot();
try {
  if (FROM < 3) {
  const P = await B.open();
  await P.waitForFunction(() => typeof svMenuSync === 'function' && typeof MX !== 'undefined', null, { timeout: 120000 });
  // ---- 1. never lose progress (Continue covers battle saves only)
  const a = await P.evaluate(async () => { localStorage.clear(); await svMenuSync(); mxContSync();
    const none = document.getElementById('svContinue').hidden && MX.cont.hidden;
    localStorage.setItem('ww3grand1', '{"v":1,"me":"IR"}'); localStorage.setItem('ww3grand1.i', JSON.stringify({ ts: 5, me: 'IR', n: 'Iran', d: 'Mar 2027', over: 0 }));
    await svMenuSync(); mxContSync(); const old = document.getElementById('svContinue').hidden && MX.cont.hidden;
    localStorage.removeItem('ww3grand1'); localStorage.removeItem('ww3grand1.i'); return { none, old, gm: typeof grandMenu }; });
  console.log('continue', JSON.stringify(a));
  ck(a.none, 'Continue is shown although nothing is saved'); ck(a.old, 'Continue offers an old grand-campaign save (the campaign was removed)'); ck(a.gm === 'undefined', 'grand campaign code is back');
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
    r.dupes = ['battle'].map(c => { const d = KEYTAB.filter(x => x.def && x.ctx === c).map(x => x.def); return d.length - new Set(d).size; });
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
  await Q.close(); }
  const R = await B.open();
  await R.waitForFunction(() => typeof tsSet === 'function' && typeof MX !== 'undefined', null, { timeout: 120000 });
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
      await R.evaluate((ts) => { document.getElementById('menu').hidden = false; tsSet(ts); }, ts); await R.waitForTimeout(400);
      tsRes[key].menu = await offScreen(); ck(Math.abs(await zoomOf('#mx') - ts) < .01, key + ': the main menu did not take the text size');
      await R.evaluate(() => { openSettings(); }); await R.waitForTimeout(300); tsRes[key].settings = await offScreen(); if (W === 1366 && ts === 1.3) await shot(R, 'textsize-settings');
      await R.evaluate(() => { kbuOpen(); }); await R.waitForTimeout(300); tsRes[key].keys = await offScreen(); await R.evaluate(() => { kbuClose(true); document.getElementById('settings').hidden = true; });
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
