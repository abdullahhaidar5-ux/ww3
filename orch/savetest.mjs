// Save-game test (orch/savetest.mjs): run an AI battle 5 min, save, load into a FRESH page, run both 2 more minutes
// with the same random numbers and compare a state hash (positions / HP / money / town owners). Then: save -> reload
// the page -> Continue works (IndexedDB), a file round trip, and an "old version" save is refused without a crash.
//   node orch/savetest.mjs [--pre 5] [--post 2] [--seed 4242]
import { boot } from './savelib.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const PRE = arg('pre', 5), POST = arg('post', 2), SEED = arg('seed', 4242);
const fails = [];
const B = await boot();
// deterministic mode: seeded Math.random, no wall-clock path-finding budget
const detInit = (seed) => { window.__reseed(seed); window.__fakeClock(true); };
// (reseeded every tick: timers/async code outside the sim may draw random numbers between steps)
const run = (page, steps, seed) => page.evaluate(({ k, seed }) => { if (seed != null) window.__reseed(seed); const t0 = Date.now(); for (let i = 0; i < k && !G.over; i++) { if (seed != null) window.__reseed(Math.imul(seed, 100003) + i); simUpdate(1 / 60); } return { t: G.t, ms: Date.now() - t0, h: svStateHash() }; }, { k: steps, seed });
const waitLoaded = (page) => page.waitForFunction(() => !window.LOADING && G && G.paused, null, { timeout: 600000, polling: 250 });
try {
  const A = await B.open();
  await A.evaluate((seed) => { window.__reseed(seed); setup.n = 1; setup.seed = seed; startSingle(); G.ldHold = 1; G.teams[0].ai = mkAI(1); }, SEED);  // ldHold: the battle starts paused, so every run begins identically
  await A.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 });
  await A.evaluate(() => { G.paused = true; });
  await A.evaluate(detInit, SEED);
  const pre = await run(A, PRE * 3600, SEED);
  console.log(`A: ${PRE} min in, t=${pre.t.toFixed(1)} units=${pre.h.units} money=${pre.h.money} (${pre.ms} ms)`);
  // --- save A
  const sv = await A.evaluate(async () => { const t0 = performance.now ? Date.now() : 0; const e0 = Date.now(); const ck = ckEncode(); const enc = Date.now() - e0;
    const r = await svSave('Test save', 'manual'); return { ok: r.ok, msg: r.msg || '', encMs: enc, len: r.rec ? r.rec.packed.length : 0 }; });
  console.log(`save: ok=${sv.ok} ${sv.msg} encode ${sv.encMs} ms, packed ${(sv.len / 1024).toFixed(0)} KB`);
  if (!sv.ok) fails.push('save failed: ' + sv.msg);
  const exported = await A.evaluate(async () => { const L = await svList(); const m = L[0]; return { n: L.length, id: m && m.id, packed: m && await svGetData(m.id), meta: m }; });
  if (exported.n !== 1) fails.push('save list has ' + exported.n + ' entries, expected 1');
  // --- A continues
  const postA = await run(A, POST * 3600, SEED + 1);
  console.log(`A after +${POST} min: t=${postA.t.toFixed(1)} hash=${postA.h.h} units=${postA.h.units} money=${postA.h.money}`);
  // --- fresh page, load the save
  const C = await B.open();
  const lr = await C.evaluate(async ({ meta, packed }) => { window.__reseed(5); const r = await svLoad(meta, packed); return { ok: r.ok, msg: r.msg || '', paused: G && G.paused, sub: document.getElementById('pauseSub').textContent, t: G && G.t, h: G && svStateHash() }; }, exported);
  console.log(`C loaded: ok=${lr.ok} ${lr.msg} paused=${lr.paused} "${lr.sub}" t=${lr.t && lr.t.toFixed(1)}`);
  if (!lr.ok) fails.push('load failed: ' + lr.msg);
  else {
    if (!lr.paused) fails.push('loaded game did not start paused');
    if (lr.h.h !== pre.h.h) fails.push(`state right after load differs: ${lr.h.h} vs saved ${pre.h.h} (units ${lr.h.units}/${pre.h.units}, money ${lr.h.money}/${pre.h.money})`);
    await C.evaluate(() => window.__fakeClock(true));
    const postC = await run(C, POST * 3600, SEED + 1);
    console.log(`C after +${POST} min: t=${postC.t.toFixed(1)} hash=${postC.h.h} units=${postC.h.units} money=${postC.h.money}`);
    if (postC.h.h !== postA.h.h) fails.push(`replay differs after +${POST} min: A ${postA.h.h} (units ${postA.h.units}, money ${postA.h.money}) vs C ${postC.h.h} (units ${postC.h.units}, money ${postC.h.money})`);
  }
  // --- reload the page: Continue works from IndexedDB
  await C.reload({ waitUntil: 'load' });
  await C.waitForFunction(() => typeof svMenuSync === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await C.waitForFunction(() => { const b = document.getElementById('svContinue'); return b && !b.hidden; }, null, { timeout: 15000 }).catch(() => fails.push('Continue button did not appear after reloading the page'));
  const cont = await C.evaluate(async () => { const b = document.getElementById('svContinue'); if (!b || b.hidden) return null; const txt = b.textContent; b.click(); return txt; });
  console.log('Continue button:', cont);
  if (cont) { await waitLoaded(C).catch(() => fails.push('Continue did not start a paused battle')); const q = await C.evaluate(() => G ? { t: G.t, p: G.paused } : null); console.log('after Continue:', JSON.stringify(q)); if (!q || !(q.t > 100)) fails.push('Continue loaded a wrong battle'); }
  // --- file round trip + old-version refusal
  const rt = await C.evaluate(async ({ meta, packed }) => {
    const body = JSON.stringify({ magic: SV_MAGIC, fmt: SV_FMT, meta, data: packed });
    const f = new File([body], 'x.ww3save'); const r1 = await svReadFile(f);
    const old = await svReadFile(new File([JSON.stringify({ magic: SV_MAGIC, fmt: SV_FMT, meta: Object.assign({}, meta, { pv: 1 }), data: packed })], 'o.ww3save'));
    const junk = await svReadFile(new File(['not json'], 'j.ww3save'));
    const bad = await svLoad(meta, 'Zbm90IGd6aXA=');
    const stale = await svLoad(Object.assign({}, meta, { fmt: 0 }), packed);
    return { file: r1.ok, old: old.msg, junk: junk.msg, bad: bad.msg, stale: stale.msg, g: !!G }; }, exported);
  console.log('file round trip:', JSON.stringify(rt));
  if (!rt.file) fails.push('.ww3save file did not read back');
  if (!/older version/.test(rt.old) || !/older version/.test(rt.stale)) fails.push('old-version save was not refused with the older-version message');
  if (!/not a World War 3 save/.test(rt.junk)) fails.push('junk file not refused');
  if (!/damaged/.test(rt.bad)) fails.push('damaged save not refused');
} catch (e) { fails.push('test threw: ' + (e && e.stack || e)); }
fails.push(...B.errs.slice(0, 5));
await B.close();
if (fails.length) { console.log('SAVETEST FAIL'); for (const f of fails) console.log(' - ' + f.slice(0, 600)); process.exit(1); }
console.log('SAVETEST PASS');
