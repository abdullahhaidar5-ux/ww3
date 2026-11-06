// Debug tool for save games: A runs on from a save, a fresh page C loads the save; prints the first second where the two differ (and which fields). node orch/savediverge.mjs <pre-minutes> <post-minutes>
import { boot } from './savelib.mjs';
const PRE = +(process.argv[2] || 1), POST = +(process.argv[3] || 1);
const B = await boot();
const TS = +(process.env.TS || -1);
const FP = `(() => { const dump = (e) => { const o = {}; for (const k in e) { const v = e[k]; if (v && typeof v === 'object') { if (v.isObject3D) continue; try { o[k] = JSON.stringify(v, (kk, vv) => (vv && vv.s && vv.id ? '#' + vv.id : vv)).slice(0, 140); } catch (x) { o[k] = '?'; } } else if (typeof v !== 'function') o[k] = v; } return o; };
  const ents = {}; for (const e of G.ents) if (!e.dead) ents[e.id] = dump(e); const tj = {}; G.teams.forEach((T, ti) => { for (const k in T) { if (k === 'F' || k === 'sup') continue; try { tj[ti + '.' + k] = JSON.stringify(T[k], (kk, vv) => (vv && vv.s && vv.id ? '#' + vv.id : vv)); } catch (x) {} } });
  const gj = {}; for (const k in G) { const v = G[k]; if (v == null || typeof v === 'function') continue; if (typeof v !== 'object' || (Array.isArray(v) && v.length < 40 && v.every(x => typeof x !== 'object'))) gj[k] = JSON.stringify(v); }
  return { gj, ents, tj, cr: G.teams.map(T => Math.round(T.credits * 100)).join(), vals: window.__vals.length, stk: window.__stkOut || null }; })()`;
const A = await B.open();
await A.evaluate(() => { window.__reseed(4242); setup.n = 1; setup.seed = 4242; startSingle(); G.ldHold = 1; G.teams[0].ai = mkAI(1); });
await A.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 });
await A.evaluate(() => { G.paused = true; window.__reseed(4242); window.__fakeClock(true); });
await A.evaluate((k) => { for (let i = 0; i < k; i++) simUpdate(1 / 60); }, PRE * 3600);
const rec = await A.evaluate(async () => svCapture('x', 'manual'));
const gA = await A.evaluate(() => ({ keys: Object.keys(G).filter(k => !k.startsWith('_')).sort() }));
const seq = [];
for (let i = 0; i < POST * 60; i++) { seq.push(await A.evaluate(`(() => { ${i === 0 ? 'window.__reseed(99); window.__vals = [];' : ''} window.__stk = []; for (let j = 0; j < 60; j++) { window.__reseed(777 + ${i}*60 + j); simUpdate(1 / 60); } window.__stkOut = window.__stk; window.__stk = null; return ${FP}; })()`)); }
const C = await B.open();
await C.evaluate(async (r) => { window.__reseed(5); const x = await svLoad(r.meta, r.packed); if (!x.ok) throw new Error(x.msg); }, rec);
const gC = await C.evaluate(() => ({ keys: Object.keys(G).filter(k => !k.startsWith('_')).sort() }));
console.log('G keys only in A:', gA.keys.filter(k => !gC.keys.includes(k)).join(','), '| only in C:', gC.keys.filter(k => !gA.keys.includes(k)).join(','));
await C.evaluate(() => { window.__fakeClock(true); });
const seen = {};
const note = (k, s, ex) => { if (!seen[k]) seen[k] = { s: s + 1, n: 0, ex }; seen[k].n++; };
for (let s = 0; s < seq.length; s++) {
  const c = await C.evaluate(`(() => { ${s === 0 ? 'window.__reseed(99); window.__vals = [];' : ''} window.__stk = []; for (let j = 0; j < 60; j++) { window.__reseed(777 + ${s}*60 + j); simUpdate(1 / 60); } window.__stkOut = window.__stk; window.__stk = null; return ${FP}; })()`); const a = seq[s];
  if (a.cr !== c.cr) note('credits', s, `A ${a.cr} C ${c.cr}`);
  for (const id in a.ents) { const ea = a.ents[id], ec = c.ents[id]; if (!ec) { note('missing-in-C ' + ea.kind, s, id); continue; }
    for (const k of new Set([...Object.keys(ea), ...Object.keys(ec)])) if (!['lx', 'ly', 'odo', 'k', 'fires'].includes(k) && JSON.stringify(ea[k]) !== JSON.stringify(ec[k])) note('ent.' + ea.kind + '.' + k, s, `#${id} A=${JSON.stringify(ea[k])} C=${JSON.stringify(ec[k])}`); }
  for (const id in c.ents) if (!(id in a.ents)) note('only-in-C ' + c.ents[id].kind, s, id);
  for (const k in a.tj) if (a.tj[k] !== c.tj[k] && !/_uk|_ut/.test(k)) note('team.' + k, s, `A=${(a.tj[k] || '').slice(0, 120)} C=${(c.tj[k] || '').slice(0, 120)}`);
}
const rows = Object.entries(seen).sort((x, y) => x[1].s - y[1].s).slice(0, 25);
console.log(rows.length ? rows.map(([k, v]) => `second ${v.s} (x${v.n}) ${k}: ${String(v.ex).slice(0, 200)}`).join('\n') : 'NO difference over ' + POST + ' min');
await B.close();
