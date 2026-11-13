// DRILL ORDER (EU4-style drilling; one rule set, no second readiness system). An army ordered to Drill stays put and gains
// drill 0-100 each month: +8 base, x1.5 on own-held ground with a base/airfield or the capital, x.5 when understrength (<70% hp)
// or when the nation is out of fuel. It costs training money, fuel and ammo (0.5% of the army's value per month). Not drilling,
// drill fades 1.5/month, 3/month while the nation is at war (attrition). Moving cancels it (player order or the move phase).
// Drill pays in battle (src/13a-gwar.js): a fully drilled army fights 8% stronger and loses morale 10% slower,
// and drilling armies lift army tradition (the professionalism the morale system already reads). The AI drills idle armies in peacetime.
// State: a.dr (0-100) and a.dg (1 = drilling) on the army record, so saves, host migration and the sync hash keep working.
const GDR_MAX=100;
function gdrOk(a){return !!a&&!a.fl&&a.u&&a.u.length>0&&!(a.path&&a.path.length);}
function gdrAtWar(c){return Object.keys(GC.war||{}).some(k=>GC.war[k]&&k.split('|').includes(c));}
function gdrBase(a){const N=GC.nat[a.o];if(!N||!GC.prov[a.at]||GC.prov[a.at].o!==a.o)return false;if(N.cap===a.at)return true;try{return geCount(a.at,'base')+geCount(a.at,'airfield')>0;}catch(e){return false;}}
function gdrStr(a){let s=0;for(const r of a.u)s+=r[1];return a.u.length?s/a.u.length/100:0;}
function gdrRate(a){let g=8;if(gdrBase(a))g*=1.5;if(gdrStr(a)<.7)g*=.5;try{if(geDry(a.o))g*=.5;}catch(e){}return g;}
function gdrCost(a){return Math.round(grArmyVal(a)*.005);}
function gdrPct(a){return Math.round(a&&a.dr||0);}
/* order: on=1 start drilling, 0 stop; returns an error text or '' */
function grDrill(aid,on){const a=GC.armies.find(x=>x.id===aid);if(!a||a.o!==GC.me||GC.ph!=='plan')return 'no army';if(a.fl)return 'Fleets cannot drill';
  if(on===undefined)on=a.dg?0:1;if(!on){a.dg=0;return '';}if(!gdrOk(a))return 'Army is moving or empty';a.dg=1;return '';}
GMOD_HOOKS.push(()=>{if(!GC)return;const seen={};
  for(const a of GC.armies.slice().sort((x,y)=>x.id-y.id)){if(a.fl)continue;const N=GC.nat[a.o];if(!N||N.dead)continue;
    const human=a.o===GC.me||(typeof GNT!=='undefined'&&GNT.hum&&GNT.hum[a.o]!==undefined);const war=gdrAtWar(a.o);
    if(!human&&!a.fr&&!war&&gdrOk(a)&&(a.dr||0)<90&&grArmyVal(a)>=2500)a.dg=1;else if(!human&&a.dg&&(war||a.fr))a.dg=0;   /* AI: drill idle armies in peacetime only */
    if(a.dg&&!gdrOk(a))a.dg=0;
    if(a.dg){const c=gdrCost(a);if(N.cash>=c){N.cash-=c;a.dr=Math.min(GDR_MAX,(a.dr||0)+gdrRate(a));seen[a.o]=(seen[a.o]||0)+1;}else a.dg=0;}
    else if(a.dr)a.dr=Math.max(0,a.dr-(war?3:1.5));}
  for(const c in seen)if(GC.nat[c].trad!==undefined)GC.nat[c].trad=Math.min(100,GC.nat[c].trad+.3*Math.min(3,seen[c]));});
/* a drilling army that is given a path (AI planners, fronts) gives the drill up and marches */
function gdrMove(a){if(a.dg&&a.path&&a.path.length)a.dg=0;}
function gdrTag(a){if(a.fl)return '';const d=gdrPct(a);return (a.dg||d)?' <span style="font-size:12px;color:#9fe0a0" title="Drill '+d+'%: at 100% the army fights 8% stronger and its morale holds 10% longer in battle. '+(a.dg?'Drilling costs about $'+gdrCost(a)+'/month and the army stays put; ordering a move stops it.':'Fades 1.5%/month (3% at war).')+'">⚔ Drill '+d+'%'+(a.dg?' ▲':'')+'</span>':'';}
function gdrBtn(a){return a.fl?'':'<button data-act="drill" title="Drill (T): the army stays put and trains — +drill each month for upkeep money">'+(a.dg?'Stop drill':'Drill')+'</button>';}
