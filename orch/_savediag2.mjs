// local diagnosis (not a gate): compare every G field (typed arrays hashed) right after a save vs right after loading it
import { boot } from './savelib.mjs';
import fs from 'node:fs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const PRE = arg('pre', 5), SEED = arg('seed', 4242), OUT = process.env.OUT || '/tmp';
const B = await boot();
const dump = () => { const hs = (a) => { let h = 2166136261 >>> 0; const n = a.length; for (let i = 0; i < n; i++) { h ^= (a[i] * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; } return n + ':' + h; };
  const out = {}; const seen = new WeakSet();
  const val = (v, d) => { if (v == null || typeof v !== 'object') return typeof v === 'function' ? 'fn' : v; if (ArrayBuffer.isView(v)) return 'TA ' + hs(v); if (v.isObject3D || v.isMaterial || v.isBufferGeometry || v.isTexture) return 'three'; if (v instanceof Map) return 'Map ' + v.size; if (v instanceof Set) return 'Set ' + v.size; if (d > 3 || seen.has(v)) return '…'; seen.add(v);
    if (Array.isArray(v)) { const r = v.slice(0, 50).map(x => val(x, d + 1)); seen.delete(v); return r; } const o = {}; for (const k in v) { if (k === 'obj' || k === 'mesh') continue; o[k] = val(v[k], d + 1); } seen.delete(v); return o; };
  for (const k in G) { if (k === 'ents' || k === 'byId' || k === 'sel') continue; try { out[k] = val(G[k], 0); } catch (e) { out[k] = 'ERR'; } }
  const glob = {}; for (const k of ['P_ROAD', 'P_H', 'P_B', 'P_Wv', 'P_stamp', 'GW', 'GH', 'CELL']) { try { glob[k] = eval(k); } catch (e) {} } try { glob.P_W = P_W ? hs(P_W) : null; } catch (e) {} try { glob.regG = P_REG.ground ? hs(P_REG.ground.a) : null; } catch (e) {}
  out.$glob = glob; return JSON.stringify(out); };
const A = await B.open();
await A.evaluate((seed) => { window.__reseed(seed); setup.n = 1; setup.seed = seed; startSingle(); G.ldHold = 1; G.teams[0].ai = mkAI(1); }, SEED);
await A.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 250 });
await A.evaluate(() => { G.paused = true; }); await A.evaluate((s) => { window.__reseed(s); window.__fakeClock(true); }, SEED);
await A.evaluate(({ k, seed }) => { for (let i = 0; i < k && !G.over; i++) { window.__reseed(Math.imul(seed, 100003) + i); simUpdate(1 / 60); } }, { k: PRE * 3600, seed: SEED });
const exported = await A.evaluate(async () => { await svSave('diag', 'manual'); const L = await svList(); const m = L[0]; return { packed: await svGetData(m.id), meta: m }; });
fs.writeFileSync(OUT + '/gA.json', await A.evaluate(`(${dump})()`));
await A.close();
const C = await B.open();
await C.evaluate(async ({ meta, packed }) => { window.__reseed(5); await svLoad(meta, packed); }, exported);
await C.evaluate(() => window.__fakeClock(true));
fs.writeFileSync(OUT + '/gC.json', await C.evaluate(`(${dump})()`));
console.log('done', B.errs.slice(0, 3));
await B.close();
