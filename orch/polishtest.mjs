// Polish guard (orch/polishP2): the "never lose progress / settings / readability" promises, checked in a real browser.
//   node orch/polishtest.mjs      prints POLISH PASS / POLISH FAIL
// 2. Settings: the Keyboard keys window lists the whole key table, refuses W A S D / keys in use, rebinding works in a battle, Reset restores;
//    the first-launch graphics check picks a preset once.
// 1. Never lose progress: the grand campaign is saved on a timer with 3 rolling copies, a damaged save falls back to a copy,
//    and after reloading the page "Continue" is the first item of the single-player list and reopens the campaign.
import { boot, ROOT } from './savelib.mjs';
import fs from 'node:fs';
import path from 'node:path';
const SHOTS = path.join(ROOT, 'orch', 'shots', 'polish'); fs.mkdirSync(SHOTS, { recursive: true });
const shot = (pg, n) => pg.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 72 }).catch(() => {});
const fails = []; const ck = (c, m) => { if (!c) fails.push(m); };
const B = await boot();
try {
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
} catch (e) { fails.push('polishtest crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of B.errs || []) fails.push(e);
await B.close();
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'POLISH FAIL (' + fails.length + ')' : 'POLISH PASS');
process.exit(fails.length ? 1 : 0);
