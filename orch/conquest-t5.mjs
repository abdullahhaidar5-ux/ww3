// Tax-policy comparison (headless): team 0 plays a fixed policy vs the smart AI (team 1) on mirrored 2-player maps.
//   node orch/conquest-t5.mjs [--seeds 6] [--minutes 12] [--maps fulda,strait]
// Policies: smart (the AI's rear-High / front-Low), high (Extortionate-free "High everywhere"), low, normal.
// Prints per policy: revolts, total tax earned, towns held at the end, and the share of games team 0 is ahead (base+army value, 1.4x rule).
import { makeSim } from './headless.mjs';
const a = process.argv.slice(2), g = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const seeds = +g('seeds', 6), mins = +g('minutes', 12), maps = g('maps', 'fulda,strait').split(',');
const POL = { smart: null, high: 2, low: 0, normal: 1 };
const rows = {};
for (const pol of Object.keys(POL)) rows[pol] = { rev: 0, tax: 0, towns: 0, ahead: 0, behind: 0, n: 0, cr: 0 };
for (const map of maps) for (let seed = 1; seed <= seeds; seed++) for (const pol of Object.keys(POL)) {
  const { W } = makeSim();
  const facs = seed % 2 ? ['US', 'RU'] : ['RU', 'US'];
  W.start({ seed: 100 + seed, facs, map });
  W.ev(`G.teams[0].taxPol=${POL[pol] == null ? 'null' : POL[pol]};`);
  W.step(mins * 60);
  const r = JSON.parse(W.ev(`JSON.stringify({rev:G.teams[0].revN|0,tax:Math.round(G.teams[0].taxSum||0),towns:G.towns.filter(t=>t.ow===0).length,sc:G.teams.slice(0,2).map(T=>{const F=forceOf(T);return F.bv+F.uv}),taxE:Math.round(G.teams[1].taxSum||0),revE:G.teams[1].revN|0})`));
  const R = rows[pol]; R.n++; R.rev += r.rev; R.tax += r.tax; R.towns += r.towns; if (r.sc[0] > 1.4 * r.sc[1]) R.ahead++; else if (r.sc[1] > 1.4 * r.sc[0]) R.behind++;
  console.log(map, seed, pol, JSON.stringify(r));
}
console.log('\npolicy   games  revolts/game  tax earned/game  towns held  ahead  behind');
for (const [k, R] of Object.entries(rows)) console.log(k.padEnd(8), String(R.n).padStart(5), (R.rev / R.n).toFixed(2).padStart(12), String(Math.round(R.tax / R.n)).padStart(16), (R.towns / R.n).toFixed(1).padStart(11), String(R.ahead).padStart(6), String(R.behind).padStart(7));
