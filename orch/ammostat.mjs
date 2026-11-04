// Ammo/supply sanity: runs a few AI-vs-AI battles in plain Node and prints, per 2-minute step, how many combat units are
// empty / low / out of supply and how many towns are held.   node orch/ammostat.mjs [map] [minutes] [seed]
import { makeSim } from './headless.mjs';
globalThis.__ww3prof = { now: () => performance.now(), t: {}, c: {} };
const map = process.argv[2] || 'fulda', min = Number(process.argv[3] || 10), seed = Number(process.argv[4] || 1);
const { W } = makeSim(undefined, { prof: [] }); const P = globalThis.__ww3prof;
W.start({ seed, map, facs: ['US', 'RU'], diff: 1 });
for (let t = 0; t < min * 60; t += 120) { const st = W.step(120);
  const r = P.ev(`(()=>{let n=0,z=0,l=0,o=0;for(const u of G.ents)if(!u.dead&&!u.isB&&u.am!==undefined){n++;if(u.am<=0)z++;else if(u.am<u.amx*.3)l++;if(!u.sup)o++;}const tw=[0,0];for(const c of G.civ||[])if(c.ow>=0)tw[c.ow]++;return {n,z,l,o,tw,civ:(G.civ||[]).length};})()`);
  console.log('t=' + (t + 120), JSON.stringify(r)); if (st.over) { console.log('over'); break; } }
process.exit(0);
