// A6 OCCUPATION REACTION BY STYLE (laneA 2026-11-07; Abdullah 2026-11-06 18:29 pick 12). World-sim chain:
//  who reacts  = the occupied PEOPLE (the province's original owner st.o0, by its ONE morale style in MSTYLES) and their home
//                nation's war support (B4b meter); the occupier's treasury, garrison and unrest (the grand-map side of the ONE
//                Locals system: unrest -> the existing revolts in grFinishTurn).
//  2nd order   = unrest cuts income and triggers revolts; resistance news hardens the homeland's war support; lost garrison
//                units regrow from the occupier's manpower.
//  counter-play= keep an army in the province (cells/partisans shrink, sabotage halves), lower the tax (the existing AI does this
//                at high unrest), or give the land back in a peace deal (st.o===st.o0 ends it).
//  cost        = every style costs the occupier about the same per month (orch/occtest.mjs measures it), in a different currency:
//                Zealous = resistance cells raid the garrison + unrest; Professional = orderly but officials work to rule (income
//                withheld); Home defenders = partisans in mountains/jungle/snow (raids), little in open land; Firepower-reliant =
//                comply but sabotage (cash for repairs).
// State: st.rc (cells/bands 0..max) per province, GC.occ[nation] = {c: running cost} — in GC, so saves and determinism keep working.
const OCC_STY={   // one row per morale style: the data, not code paths
 zeal:{n:'Resistance cells',ic:'🕯',max:4,grow:.55,raid:.14,un:1.6,ws:.25,inc:0,calm:0,tip:'The faithful run resistance cells: raids and bombs on your garrison.'},
 prof:{n:'Work to rule',ic:'🗂',max:0,grow:0,raid:0,un:0,ws:0,inc:.42,calm:3,tip:'Orderly and quiet, but officials work to rule: part of the income never arrives.'},
 home:{n:'Partisans',ic:'🌲',max:3,maxOpen:1,grow:.5,raid:.17,un:1.2,ws:.15,inc:0,calm:0,rough:'mjs',tip:'Partisans fight from the hills and forests; open land stays mostly quiet.'},
 fire:{n:'Sabotage',ic:'🔧',max:0,grow:0,raid:0,un:0,ws:0,inc:.33,sab:.35,calm:3,tip:'They comply on the surface but sabotage roads, depots and power lines.'}};
const OCC_UNIT=110, OCC_WS=440;   // OCC_WS: $440 of occupation losses (raided garrisons, withheld income) = -1 war support for the occupier at home (A6 slice 3)   // money value of one raided garrison unit (for the cost ledger + equal-cost check)
function ocStyle(c){try{const n=grNat(c);return MORALE_STYLE[n.fac]||MORALE_STYLE[c]||'home';}catch(e){return 'home';}}
// OCCUPIED LAND IS NOT YOURS UNTIL PEACE (Abdullah 2026-11-12 20:29 "Go", item 1 of orch/reports/eu4-gap.md). ONE field: st.ow = the legal owner of a
// province that an enemy army holds; st.o stays "who controls it" (all the military code keeps working). st.ow exists only while holder and owner are at war:
//   who reacts  = the owner still counts it as his (claims, alarm, peace price); the holder gets a military administration: GOC_TAX of the taxes, no recruits,
//                 no manpower, no core status, slower supply through it (GOC_SUP), unrest +GOC_UN on top of the people's reaction by morale style (ocMonth below).
//   2nd order   = alarm (13y-gcoal) rises only when land is really signed over, so a war is judged at the table; long occupations drain the holder (ocMonth).
//   counter-play= retake it (st.ow clears), or make peace: whatever the deal does not hand over goes back to its owner the same day (ocSweep).
//   collapse    = a nation that holds nothing any more has collapsed: the holders annex what they stand on (the only way land changes owner without a deal).
// Saved inside GC.prov (old saves have no st.ow: every province is simply owned by its holder). Deterministic, no dice.
const GOC_TAX=.4, GOC_SUP=1.4, GOC_UN=10;
function ocOwner(pi){const st=GC&&GC.prov[pi];return st?(st.ow||st.o):'';}
function ocHeld(pi){const st=GC&&GC.prov[pi];return !!(st&&st.ow);}
function ocOwns(c,pi){const st=GC.prov[pi];return !!st&&st.o===c&&!st.ow;}
function ocHeldBy(a,b){return GCM.P.filter(p=>p.land&&GC.prov[p.i].o===a&&GC.prov[p.i].ow===b);}
// an army took the province (grCapture): remember whose it is; taking back your own land ends the occupation
function ocTake(pi,taker,prevO){const st=GC.prov[pi];if(!st.ow)st.ow=prevO;if(st.ow===taker){delete st.ow;ocCapBack(pi,taker);return false;}delete st.coring;return true;}
function ocCapBack(pi,c){const st=GC.prov[pi],N=GC.nat[c];if(st.cp){if(st.cp===c&&N&&!N.dead)N.cap=pi;delete st.cp;}}
// the land goes back to its owner (peace, or the holder and the owner are no longer at war); the holder's troops leave
function ocReturn(pi){const st=GC.prov[pi],c=st.ow,was=st.o;if(!c)return;st.o=c;delete st.ow;st.rq=[];st.bq=[];st.gar=[];st.cv=0;st.rc=0;st.un=Math.max(0,st.un-25);delete st.coring;delete st.sf;ocCapBack(pi,c);
  for(const ar of GC.armies){if(ar.at!==pi||ar.fl||ar.o===c||grAllied(ar.o,c))continue;if(grAtWar(ar.o,c))continue;const d=grNearOwn(ar.o,pi);if(d>=0){ar.at=d;ar.path=[];ar.pg=0;ar.from=-1;}}}
// the land is signed over (peace deal) or its owner collapsed: the holder now owns it
function ocAnnex(pi){const st=GC.prov[pi];delete st.ow;delete st.cp;}
// the invariant, enforced once a month and after every peace: occupation only between nations at war; a collapsed owner loses the land to whoever holds it
function ocSweep(){if(!GC||!GC.prov)return 0;let n=0;for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i];if(!st.ow)continue;const O=GC.nat[st.ow];
    if(st.ow===st.o){delete st.ow;continue;}if(!O||O.dead){ocAnnex(p.i);n++;continue;}if(!grAtWar(st.o,st.ow)){ocReturn(p.i);n++;}}return n;}
function ocHeldLine(pi){const st=GC&&GC.prov[pi];if(!st||!st.ow)return '';const O=GCM.nats.get(st.ow),H=GCM.nats.get(st.o);
  return '<div title="Occupied land pays '+Math.round(GOC_TAX*100)+'% of its taxes, gives no recruits and slows supply. It changes owner only in a peace deal — or if '+(O?O.name:st.ow)+' collapses." style="margin-top:4px;color:#ffd9a0">▨ Occupied by '+(H?H.name:st.o)+' — still '+(O?O.name:st.ow)+' land until a peace deal</div>';}
function ocOccupied(pi){const st=GC&&GC.prov[pi];return !!st&&!!st.o0&&st.o!==st.o0&&GCM.P[pi].land;}
function ocRow(pi){return OCC_STY[ocStyle(GC.prov[pi].o0)];}
function ocInc(p,st){try{return Math.max(0,geProvInc(p,st,st.o)*GR_TAXK[st.tax]*(1-Math.min(.8,st.un/160))*.7*(st.ow?GOC_TAX:1));}catch(e){return 0;}}
function ocMonth(){if(!GC||!GC.prov)return;GC.occ=GC.occ||{};const P=GCM.P;
  for(const p of P){if(!p.land)continue;const st=GC.prov[p.i];
    if(!ocOccupied(p.i)){if(st.rc)st.rc=0;continue;}
    const S=ocRow(p.i),c=st.o,R=grRng(GC.seed*29+GC.turn*977+p.i*13),L=GC.occ[c]=GC.occ[c]||{c:0};
    const guard=GC.armies.some(a=>a.at===p.i&&a.o===c&&a.u.length);
    let cost=0;
    // cells / partisan bands grow (rough terrain only for partisans), an army in the province rolls them up
    const max=S.rough&&!S.rough.includes(p.t)?(S.maxOpen|0):S.max;
    if(max>0){st.rc=st.rc|0;if(guard)st.rc=Math.max(0,st.rc-1);else if(st.rc<max&&R()<S.grow)st.rc++;if(st.rc>max)st.rc=max;
      for(let k=0;k<st.rc;k++)if(st.gar.length&&R()<S.raid){st.gar.pop();cost+=OCC_UNIT;}
      st.un=Math.min(100,st.un+S.un*st.rc);
      if(st.rc>=2&&GC.turn%3===0)grLog(S.n+' strike the '+GCM.nats.get(c).name+' garrison in '+p.n+'.',c===GC.me?c:'');
      const H=GC.nat[st.o0];if(S.ws&&st.rc&&H&&!H.dead&&typeof wsN==='function'){const W=wsN(st.o0);if(W)W.ws=Math.min(100,W.ws+S.ws*st.rc/4);}}
    // withheld income / sabotage repairs: a share of what the province pays, halved while an army guards it
    const inc=S.inc+(S.sab&&R()<S.sab?S.inc*.6:0);
    if(inc>0){const lose=Math.round(ocInc(p,st)*inc*(guard&&S.sab?.5:1));const N=GC.nat[c];const take=N?Math.min(lose,Math.max(0,Math.floor(N.cash))):0;if(take>0){N.cash-=take;cost+=take;}}
    if(S.calm)st.un=Math.max(0,st.un-S.calm);
    L.c+=cost;L.ws=(L.ws||0)+cost/OCC_WS;
    if(cost&&typeof wsN==='function'){const W=wsN(c);if(W)W.ws=Math.max(0,W.ws-cost/OCC_WS);}}   /* slice 3: the occupation's cost wears down the occupier's war support at home (same rate for every style, so equal cost stays equal) */
  ocSpread();ocAI();}
// slice 2: insurgency spreads — a province with 3+ cells seeds a cell next door (same people, same occupier, terrain permitting)
function ocSpread(){const P=GCM.P,R=grRng(GC.seed*31+GC.turn*733),seed=[];
  for(const p of P){if(!p.land||!ocOccupied(p.i))continue;const st=GC.prov[p.i];if((st.rc|0)<3)continue;
    for(const j of p.adj){const q=P[j];if(!q.land||!ocOccupied(j))continue;const s2=GC.prov[j];if(s2.o!==st.o||s2.o0!==st.o0||(s2.rc|0))continue;
      const S=ocRow(j),max=S.rough&&!S.rough.includes(q.t)?(S.maxOpen|0):S.max;if(max>0&&R()<.3&&!seed.includes(j))seed.push(j);}}
  for(const j of seed){GC.prov[j].rc=1;const st=GC.prov[j];grLog(ocRow(j).n+' spread to '+GCM.P[j].n+'.',st.o===GC.me?st.o:'');}}
// slice 2: the AI answers like a real occupier — the nearest idle army (2 marches or less) goes to the worst cell province
function ocAI(){const P=GCM.P;
  for(const p of P.filter(p=>p.land&&ocOccupied(p.i)&&(GC.prov[p.i].rc|0)>=2).sort((x,y)=>(GC.prov[y.i].rc|0)-(GC.prov[x.i].rc|0)||x.i-y.i)){
    const c=GC.prov[p.i].o,N=GC.nat[c];if(!N||!N.ai||N.dead||c===GC.me)continue;
    if(GC.armies.some(a=>a.o===c&&(a.at===p.i||(a.path.length&&a.path[a.path.length-1]===p.i))))continue;
    let best=null,bd=9;for(const a of GC.armies.filter(a=>a.o===c&&!a.fl&&!a.path.length&&a.u.length&&a.at!==GC.nat[c].cap).sort((x,y)=>x.id-y.id)){
      let r=null;try{r=grPath(c,a.at,p.i);}catch(e){}if(!r||r.decl||!r.path||r.path.length>2)continue;if(r.path.length<bd){bd=r.path.length;best=[a,r.path];}}
    if(best)best[0].path=best[1].slice();}}
if(typeof GMOD_HOOKS==='object')GMOD_HOOKS.push(ocMonth);
// province panel line (13c hook) — shown to everyone so a player sees what holding the land will cost before taking it
function ocLine(pi){if(!GC)return '';if(!ocOccupied(pi))return ocHeldLine(pi);const st=GC.prov[pi],S=ocRow(pi),O=GCM.nats.get(st.o0),sty=MSTYLES[ocStyle(st.o0)];
  const lvl=S.max?(' <b>'+(st.rc|0)+'</b>'):'';
  return '<div title="'+S.tip+' Counter: keep an army here'+(S.max?' (rolls them up)':S.sab?' (halves sabotage)':'')+', lower the tax, or give the land back in a peace deal." style="margin-top:4px;color:#ffc58e">'+S.ic+' Occupied '+(O?O.name:st.o0)+' land ('+sty.n+'): '+S.n+lvl+(GC.occ&&GC.occ[st.o]&&GC.occ[st.o].ws>=.5?' · war support at home −'+GC.occ[st.o].ws.toFixed(0):'')+'</div>'+ocHeldLine(pi);}
if(typeof alAdd==='function')alAdd('occ','🕯','Occupation unrest',c=>{const L=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c&&(GC.prov[p.i].rc|0)>=2).sort((x,y)=>(GC.prov[y.i].rc|0)-(GC.prov[x.i].rc|0)||x.i-y.i);
  return L.length?{n:L.length,tip:'Resistance or partisans are raiding your garrisons — station an army there',go:()=>alFly(L[0].i)}:null;});
