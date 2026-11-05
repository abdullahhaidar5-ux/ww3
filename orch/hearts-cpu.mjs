// CPU cost of the Hearts & Minds code per sim step in an 8-player Conquest battle (all AI), vs the whole step.
import { makeSim } from './headless.mjs';
globalThis.__ww3prof = { now: () => performance.now(), t: {}, c: {} };
const names = ['updTowns', 'updTowers', 'hmTick', 'collateral', 'turfOf', 'townSmuggle', 'townRecruit', 'bribePrice', 'bribeOk', 'townBribe', 'updEnt', 'simUpdate', 'step'];
const { W } = makeSim(undefined, { prof: names });
const P = globalThis.__ww3prof;
W.start({ seed: 5, facs: ['IR','US','RU','CN','RS','DW','TR','EU'], map: 'kuwait', diff: 1 });
const t0 = performance.now(); let steps = 0;
for (let i = 0; i < 20; i++) { W.step(30); steps += 30; }
const wall = performance.now() - t0;
console.log('sim seconds', steps, 'wall ms', Math.round(wall), 'per sim-second ms', (wall / steps).toFixed(2));
for (const k of names) if (P.c[k]) console.log(k.padEnd(14), 'calls', String(P.c[k]).padStart(8), 'total ms', P.t[k].toFixed(1).padStart(9), 'per sim-second ms', (P.t[k] / steps).toFixed(3));
