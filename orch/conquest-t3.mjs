// Setup-phase + base-destroyed probe (headless).
import { makeSim } from './headless.mjs';
const { W } = makeSim();
W.start({ seed: 5, facs: ['US', 'RU'], map: 'strait' });
W.ev(`G.cntFire=0;const _f=applyDmg;applyDmg=function(e,d,w,t,s,sp){if(t!==G.reb&&e.team!==G.reb&&!(e.team===t))G.cntFire++;return _f.apply(this,arguments);}`);
console.log('start', W.ev(`JSON.stringify({conq:G.conq,setup:G.setupEnd,cr:G.teams.map(t=>t.credits|0)})`));
W.step(85); console.log('t=85 hostile damage events:', W.ev('G.cntFire'));
W.step(120); console.log('t=205 hostile damage events:', W.ev('G.cntFire'), W.ev('JSON.stringify(G.bse)'));
// destroy all of team 1's production
W.ev(`for(const e of G.ents)if(e.isB&&e.team===1&&['hq','barracks','factory','airfield','shipyard'].includes(e.kind)&&!e.dead)kill(e,0,null)`);
W.step(10); console.log('after razing:', W.ev(`JSON.stringify({over:G.over,out:G.teams.map(t=>!!t.out),why:G.teams[1].whyOut})`));
