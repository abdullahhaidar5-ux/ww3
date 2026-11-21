// Same step-time benchmark as godot/sim/tests/battle_test.gd --bench, on the browser game's real simulation in Node:
// 300 units a side (same mix, same spots) attack-moving to the middle of bm_splitridge, AI off, 1200 ticks.
//   node tools-godot/js_bench.mjs [--n 600]
import { makeSim } from '../orch/headless.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('n', 600));
for (const pair of [['IR', 'US'], ['RS', 'IL']]) {
  const { W } = makeSim();
  W.start({ seed: 1, facs: pair, map: 'strait', battle: 1 });
  const units = W.ev(`(()=>{for(const T of G.teams)T.ai=null;const mix=['inf','inf','inf','at','tank','inf','arty','aa','inf','tank'];
    for(let side=0;side<2;side++){const [sx,sy]=BASES[side],tx=BASES[1-side][0];for(let k=0;k<${N}/2;k++){const kind=mix[k%mix.length];
      const p=nearestPassXY('ground',sx+(side===0?220:-220)+(k%15)*22*(side===0?1:-1),sy-300+Math.floor(k/15)*30);if(!p)continue;
      const u=addUnit(side,kind,p[0],p[1]);if(u)setMove(u,(sx+tx)/2,sy-300+Math.floor(k/15)*30,'amove');}}
    return G.ents.filter(e=>!e.isB&&!e.dead).length;})()`);
  const steps = 1200; let worst = 0; const t0 = performance.now();
  for (let i = 0; i < steps; i++) { const s0 = performance.now(); W.step(1 / 60); worst = Math.max(worst, performance.now() - s0); }
  const ms = performance.now() - t0;
  const alive = W.ev(`G.ents.filter(e=>!e.isB&&!e.dead).length`);
  console.log(`JS BENCH ${pair[0]} vs ${pair[1]}: ${units} units at start (${alive} alive after ${steps / 60} s): ${(ms / steps).toFixed(2)} ms/step mean, ${worst.toFixed(1)} ms worst`);
}
