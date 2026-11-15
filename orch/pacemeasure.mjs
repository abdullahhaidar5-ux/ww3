// pacecap: how long does an AI-vs-AI Battle game last? node orch/pacemeasure.mjs [--maps a,b] [--n 2] [--games 3] [--minutes 50] [--nations US,RU,...]
// Plays equal-nation mirror 1v1 (or 2v2 at --n 4) games through the real simulation (orch/headless.mjs) and prints game-minutes to the kill plus peak unit counts.
import { makeSim } from './headless.mjs';
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
globalThis.__ww3prof = { now: () => performance.now(), t: {}, c: {} };
const { W, P } = (() => { const s = makeSim(undefined, { prof: [] }); return { W: s.W, P: globalThis.__ww3prof }; })();
const N = +argS('n', 2), GAMES = +argS('games', 3), MIN = +argS('minutes', 50), NAT = argS('nations', 'US,RU,CN,IR,FR,DE').split(',');
const maps = argS('maps', '').split(',').filter(Boolean);
const keys = maps.length ? maps : JSON.parse(JSON.stringify(P.ev('BM_KEYS.filter(k=>MAPS[k].max>=' + N + ')'))).slice(0, 4);
const out = [];
for (const k of keys) for (let g = 0; g < GAMES; g++) {
  const f = NAT[g % NAT.length], tm = N === 2 ? [0, 1] : [0, 0, 1, 1], st = Array.from({ length: N }, (_, i) => i);
  W.start({ seed: 9000 + g * 131 + k.length * 7, map: k, facs: new Array(N).fill(f), tm, st, diff: 1, battle: 1 });
  let s, peak = 0, t = 0;
  for (; t < MIN * 60; t += 30) { s = W.step(30); if (s.over) break; peak = Math.max(peak, +P.ev('Math.max(...G.teams.filter(T=>!T.reb).map(T=>popUsed(T.id,1)))')); }
  const info = W.info(); const r = { map: k, n: N, nat: f, over: !!s.over, min: +(info.t / 60).toFixed(1), peakPop: peak }; out.push(r); console.log(JSON.stringify(r));
}
const ts = out.filter(r => r.over).map(r => r.min).sort((a, b) => a - b); console.log('MEDIAN game-min (finished ' + ts.length + '/' + out.length + '):', ts.length ? ts[ts.length >> 1] : 'none');
process.exit(0);
