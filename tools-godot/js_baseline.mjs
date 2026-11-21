// JS reference run for the Godot port: the real browser simulation (src/, loaded by orch/headless.mjs) plays an
// AI-vs-AI Battle headless and logs per game-minute: units / buildings / money per side, plus CPU ms per sim step.
//   node tools-godot/js_baseline.mjs [--facs IR,US] [--map strait] [--seed 1] [--minutes 10] [--out tools-godot/out/js.json]
import fs from 'node:fs';
import path from 'node:path';
import { makeSim } from '../orch/headless.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const facs = arg('facs', 'IR,US').split(','), map = arg('map', 'strait'), seed = Number(arg('seed', 1)), minutes = Number(arg('minutes', 10));
const out = arg('out', 'tools-godot/out/js_' + facs.join('-') + '_' + map + '_s' + seed + '.json');
const { W } = makeSim();
W.start({ seed, facs, map, battle: 1, diff: 1 });
const rows = [];
const snap = (ms, steps) => {
  const i = W.info();
  const ex = W.ev(`G.teams.map(T=>({inc:Math.round(T.earned||0)}))`);
  rows.push({ min: Math.round(i.t / 60), over: i.over, winner: i.winner, ents: i.ents, msPerStep: steps ? +(ms / steps).toFixed(3) : 0,
    per: i.per.map((p, k) => ({ fac: p.fac, units: p.units, blds: p.blds, credits: p.credits, built: p.built, lost: p.lost, kills: p.kills })) });
  const r = rows[rows.length - 1];
  console.log(`min ${String(r.min).padStart(2)}  ${r.per.map(p => `${p.fac} ${p.units}u ${p.blds}b $${p.credits}`).join('  |  ')}  ents ${r.ents}  ${r.msPerStep} ms/step`);
};
snap(0, 0);
for (let m = 1; m <= minutes; m++) { const r = W.step(60); snap(r.ms, r.steps); if (r.over) break; }
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ engine: 'js', facs, map, seed, rows }, null, 1));
console.log('wrote', out);
