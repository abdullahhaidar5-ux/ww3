// Stage-1 probe: AI-vs-AI battle with towns: who owns what, tax, revolts, rebels (headless).
import { makeSim } from './headless.mjs';
const { W } = makeSim();
const a = process.argv.slice(2), g = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const facs = g('facs', 'US,RU,IR,CN').split(','), map = g('map', 'fulda'), mins = +g('minutes', 10), seed = +g('seed', 4);
W.start({ seed, facs, map });
W.ev(`G.cnt={rev:0,cap:0};const _l=log;log=function(t,m,k){if(/REVOLTED/.test(m))G.cnt.rev++;if(/captured - we seized/.test(m))G.cnt.cap++;return _l.apply(this,arguments);}`);
for (let m = 1; m <= mins; m++) {
  const r = W.step(60);
  if (m % 2 === 0 || r.over) console.log(W.ev(`'min ${m} '+JSON.stringify({own:G.towns.map(t=>t.ow<0?(t.reb>G.t?'R':'.'):t.ow).join(''),un:G.towns.filter(t=>t.ow>=0).map(t=>Math.round(t.un)).join(','),rates:G.towns.filter(t=>t.ow>=0).map(t=>t.rate).join(''),terr:G.teams.filter(T=>!T.reb).map(T=>+T.terr.toFixed(1)),cr:G.teams.filter(T=>!T.reb).map(T=>T.credits|0),rev:G.cnt.rev,cap:G.cnt.cap,reb:G.ents.filter(e=>e.team===G.reb&&!e.dead).length,over:G.over})`));
  if (r.over) break;
}
