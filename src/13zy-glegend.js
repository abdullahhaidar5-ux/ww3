// A5b NAMED BATTLES (laneA 2026-11-07): a clash of big armies becomes a legend. Rows in the ONE modifier engine (13k), no second system.
// Chain: who reacts = the winner's people (war support up, army max morale up), the loser's nation remembers (smaller "never again" rally);
// second order = war support feeds recruits/income/peace pressure (13v), army morale feeds Fight-it starts (13b gmMorMax);
// counter-play = take the province back or win a bigger battle (the legend row is per battle, expires); cost = needs a real battle (both
// sides >= 3000 army value and the weaker >= 30% of the stronger), 1 legend per province per year, so no cheap farming.
// Style flavour (name only, EQUAL value for all four styles): Zealous martyr shrine · Professional regimental honours ·
// Home defenders "never again" site · Firepower-reliant victory monument.
const GLEG_NAME={zeal:'Martyrs’ shrine',prof:'Regimental honors',home:'“Never again” memorial',fire:'Victory monument'};
const GLEG_MIN=3000,GLEG_RATIO=.3,GLEG_MONTHS=12;
function glStyle(c){try{return MORALE_STYLE[grNat(c).fac]||MORALE_STYLE[c]||'home';}catch(e){return 'home';}}
function glSide(ids){let v=0;for(const a of GC.armies)if(ids.includes(a.id))v+=grArmyVal(a);return v;}
// call BEFORE the battle is settled (armies still at full strength). Returns the legend or null.
function glBattle(b,win){if(!GC||!b)return null;const va=glSide(b.att||[]),vd=glSide(b.def||[]),hi=Math.max(va,vd),lo=Math.min(va,vd);
  if(hi+lo<GLEG_MIN*2||lo<hi*GLEG_RATIO)return null;
  if(!GC.leg)GC.leg=[];if(GC.leg.some(l=>l.p===b.p&&GC.turn-l.t<12))return null;
  const w=win==='att'?b.an:b.dn,l=win==='att'?b.dn:b.an;if(!w||!l)return null;
  const pn=GCM.P[b.p]?GCM.P[b.p].n:'?',st=glStyle(w),nm='Battle of '+pn,until=GC.turn+GLEG_MONTHS;
  GC.leg.push({p:b.p,t:GC.turn,w,l,nm,st});if(GC.leg.length>60)GC.leg.shift();
  gmodAdd({id:'leg_w_'+b.p+'_'+GC.turn,src:nm+' — '+GLEG_NAME[st],scope:'nation',stat:'warSupport',add:.04,t:w,until});
  gmodAdd({id:'leg_a_'+b.p+'_'+GC.turn,src:nm+' — '+GLEG_NAME[st],scope:'nation',stat:'armyMor',add:2,t:w,until});
  gmodAdd({id:'leg_l_'+b.p+'_'+GC.turn,src:nm+' — rally to avenge it',scope:'nation',stat:'warSupport',add:.02,t:l,until:GC.turn+6});
  try{grLog(nm+': '+(grNat(w).n||w)+' win a battle that will be remembered — '+GLEG_NAME[st].toLowerCase()+' raised.',w);}catch(e){}
  return GC.leg[GC.leg.length-1];}
function glMor(o){try{return Math.round(gmod('nation',o,'armyMor',0));}catch(e){return 0;}}
if(typeof GMOD_STATS==='object')GMOD_STATS.armyMor='Army max morale';
