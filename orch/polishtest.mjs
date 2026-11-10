// Polish guard (orch/polishP2): the "never lose progress / settings / readability" promises, checked in a real browser.
//   node orch/polishtest.mjs      prints POLISH PASS / POLISH FAIL
// 1. Never lose progress: the grand campaign is saved on a timer with 3 rolling copies, a damaged save falls back to a copy,
//    and after reloading the page "Continue" is the first item of the single-player list and reopens the campaign.
import { boot } from './savelib.mjs';
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
  const c = await P.evaluate(() => { const vis = [...document.querySelectorAll('#mxmenu .mxi')].filter(b => !b.hidden); const sp = document.querySelector('#ms-single .mxlist');
    const spFirst = sp ? [...sp.querySelectorAll('.mxi')].filter(b => !b.hidden)[0] : null;
    const r = { first: vis[0] && vis[0].textContent, isCont: vis[0] === MX.cont, kind: document.getElementById('svContinue').dataset.kind, sp: sp ? (spFirst && spFirst.id) : 'no-window' }; MX.cont.click(); return r; });
  console.log('continue', JSON.stringify(c));
  ck(c.isCont && /^Continue/.test(c.first || '') && /Grand campaign/.test(c.first || ''), 'Continue is not the first menu item for a saved campaign: ' + c.first);
  ck(c.sp === 'no-window' || c.sp === 'mxContSP', 'Continue is not the first item of the Single player window');
  await P.waitForFunction(() => !!document.getElementById('grandScreen') && typeof GC !== 'undefined' && GC && GC.me === 'IR', null, { timeout: 60000 }).catch(() => fails.push('Continue did not reopen the saved grand campaign'));
} catch (e) { fails.push('polishtest crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of B.errs || []) fails.push(e);
await B.close();
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'POLISH FAIL (' + fails.length + ')' : 'POLISH PASS');
process.exit(fails.length ? 1 : 0);
