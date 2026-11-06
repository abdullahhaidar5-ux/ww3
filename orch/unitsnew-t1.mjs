// units-new probe: flares/chaff vs SAM, low-flying, call-in reinforcements, counter-battery ping, drone spread (headless sim).
import { makeSim } from './headless.mjs';
const { W } = makeSim();
W.start({ seed: 5, facs: ['US', 'RU'], map: 'fulda' });
W.step(5);
const R = [];
// 1) reinforcements: give points, buy, use after setup
console.log(W.ev(`(()=>{const T=G.teams[0];T.ai=null;T.rank=9;T.credits=9000;G.setupEnd=0;buyPower(0,'reinf');T.pw.reinf.cd=0;const n0=G.ents.filter(e=>e.team===0&&!e.isB).length;const ok=usePower(0,'reinf',0,0);window.__n0=n0;return 'used='+ok+' credits='+T.credits+' units0='+n0})()`));
W.step(14);
console.log(W.ev(`'units after='+G.ents.filter(e=>e.team===0&&!e.isB&&!e.dead).length+' (was '+window.__n0+') — setup-phase block: '+(()=>{G.setupEnd=1e9;const T=G.teams[0];T.pw.reinf.cd=0;return usePower(0,'reinf',0,0)})()`));
W.ev(`G.setupEnd=0`);
// 2) flares: heli in range of a SAM; fire 30 missiles
console.log(W.ev(`(()=>{const h=G.ents.find(e=>e.team===1&&e.isB&&e.kind==='hq');const u=addUnit(0,'heli',h.x+50,h.y+50);u.hp=u.max=1e9;let hit=0,dec=0;const d0=u.hp;for(let i=0;i<20;i++){u.fl=undefined;const p={tgt:u,wpn:'missile',x:0,y:0};if(flareDecoy(p))dec++;}u.fl=0;let d2=0;for(let i=0;i<20;i++){if(flareDecoy({tgt:u,wpn:'missile'}))d2++;}u.fl=FL_MAX;u.landed=true;return 'decoyed '+dec+'/20 with charges, '+d2+'/20 with none; charges='+u.fl;})()`));
// 3) low flying
console.log(W.ev(`(()=>{const sam=STRUCT.sam;const u=addUnit(0,'heli',500,500);const a=canTarget(sam,u);u.low=1;const b=canTarget(sam,u);const gun=stats('US','aa');return 'SAM can target high='+a+' low='+b+' ; AA gun can target low='+canTarget(gun,u)})()`));
W.step(30);
console.log(W.ev(`JSON.stringify({over:G.over,t:G.t|0})`));
