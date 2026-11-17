// local diagnosis (not a gate): where does a loaded save start to run differently?
//   node orch/_savediag.mjs [--pre 2] [--post 1] [--seed 4242]
import { boot } from './savelib.mjs';
import fs from 'node:fs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const PRE = arg('pre', 2), POST = arg('post', 1), SEED = arg('seed', 4242), OUT = process.env.OUT || '/tmp';
const B = await boot();
const start = async (P) => {
  await P.evaluate((seed) => { window.__reseed(seed); setup.n = 1; setup.seed = seed; startSingle(); G.ldHold = 1; G.teams[0].ai = mkAI(1); }, SEED);
  await P.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 250 });
  await P.evaluate(() => { G.paused = true; }); await P.evaluate((s) => { window.__reseed(s); window.__fakeClock(true); }, SEED);
};
// run k ticks; record per-tick hash; snapshot (ckEncode JSON) at ticks listed in snap
const run = (P, k, seed, snap) => P.evaluate(({ k, seed, snap }) => { window.__reseed(seed); const hs = [], sn = {};
  for (let i = 0; i < k && !G.over; i++) { if (snap.includes(i)) sn[i] = JSON.stringify(ckEncode()); window.__reseed(Math.imul(seed, 100003) + i); if (i === window.__trT) window.__stk = []; simUpdate(1 / 60); if (i === window.__trT) { window.__trOut = window.__stk; window.__stk = null; } if (window.__full) { const j = JSON.stringify(ckEncode(), (kk, v) => (kk === 'lx' || kk === 'ly' || kk === 'odo' || kk === 'k' || kk === 'ffc' || kk === 'lgv' || kk === 'S' || kk === '$s') ? undefined : (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, q) => (o[q] = v[q], o), {}) : v); let h = 2166136261 >>> 0; for (let q = 0; q < j.length; q++) { h ^= j.charCodeAt(q); h = Math.imul(h, 16777619) >>> 0; } hs.push(h); } else hs.push(svStateHash().h); }
  return { hs, sn, tr: window.__trOut || null }; }, { k, seed, snap });
const preRun = (P) => run(P, PRE * 3600, SEED, []);
const A = await B.open(); await start(A); await preRun(A);
const exported = await A.evaluate(async () => { const r = await svSave('diag', 'manual'); const L = await svList(); const m = L[0]; return { packed: await svGetData(m.id), meta: m }; });
if (process.env.CLEAR) await A.evaluate((c) => { eval(c); }, process.env.CLEAR);
const ckA0 = await A.evaluate(() => JSON.stringify(ckEncode()));
if (process.env.FULL) { await A.evaluate(() => { window.__full = 1; }); }
const a = await run(A, POST * 3600, SEED + 1, [0]);
console.log('A done');
const C = await B.open();
await C.evaluate(async ({ meta, packed }) => { window.__reseed(5); await svLoad(meta, packed); }, exported);
await C.evaluate(() => window.__fakeClock(true));
const ckC0 = await C.evaluate(() => JSON.stringify(ckEncode()));
if (process.env.FULL) { await C.evaluate(() => { window.__full = 1; }); }
const c = await run(C, POST * 3600, SEED + 1, [0]);
let d = -1; for (let i = 0; i < Math.min(a.hs.length, c.hs.length); i++) if (a.hs[i] !== c.hs[i]) { d = i; break; }
console.log('first differing tick after load:', d, 'of', a.hs.length);
fs.writeFileSync(OUT + '/ckA0.json', ckA0); fs.writeFileSync(OUT + '/ckC0.json', ckC0);
fs.writeFileSync(OUT + '/ckA0b.json', a.sn[0]); fs.writeFileSync(OUT + '/ckC0b.json', c.sn[0]);
if (d >= 0) {
  // re-run C (deterministic) to snapshot just before and after the divergence; A from a fresh page the same way
  const C2 = await B.open(); await C2.evaluate(async ({ meta, packed }) => { window.__reseed(5); await svLoad(meta, packed); }, exported); await C2.evaluate(() => window.__fakeClock(true));
  if (process.env.FULL) await C2.evaluate(() => { window.__full = 1; });
  await C2.evaluate((t) => { window.__trT = t; }, d);
  const c2 = await run(C2, d + 2, SEED + 1, [d, d + 1]);
  const A2 = await B.open(); await start(A2); await preRun(A2); await A2.evaluate(async () => { await svSave('diag', 'manual'); });
  if (process.env.FULL) await A2.evaluate(() => { window.__full = 1; });
  await A2.evaluate((t) => { window.__trT = t; }, d);
  const a2 = await run(A2, d + 2, SEED + 1, [d, d + 1]);
  fs.writeFileSync(OUT + '/trace.json', JSON.stringify({ a: a2.tr, c: c2.tr }));
  console.log('A2 same as A up to d:', a2.hs.slice(0, d + 1).every((h, i) => h === a.hs[i]));
  for (const t of [d, d + 1]) { fs.writeFileSync(OUT + `/A_${t}.json`, a2.sn[t] || ''); fs.writeFileSync(OUT + `/C_${t}.json`, c2.sn[t] || ''); }
}
fs.writeFileSync(OUT + '/hs.json', JSON.stringify({ a: a.hs, c: c.hs }));
console.log('errs', B.errs.slice(0, 3));
await B.close();
