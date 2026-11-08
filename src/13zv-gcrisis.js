// RG7 dynamic crises + RG43 border incidents (lane G). NO new engine: crises are rows in the ONE event engine (GEV_ROWS, 13p) with new conditions
// (gcrCond) and world-reaction functions (GCR_FN, called from the event effect ['fn',name]). Chain: unrest/rivalry -> incident -> choice -> clash/coup
// -> neighbours' opinion, market prices, war support, allies. Counter-play = every row has a de-escalating option that costs money or support.
const GCR_FN={
 clash:code=>{const l=gevNb(code).filter(o=>GC.nat[o]&&GC.rel&&((GC.rel[grWk(code,o)]||0)<=0));const w=l.length?l[0]:(gevNb(code)[0]||null);if(!w)return '';gdRel(code,w,-18);
  for(const c of [code,w]){const N=GC.nat[c];if(N&&N.e)N.e.man=Math.max(0,(N.e.man||0)-25);}
  grLog('Frontier clash between '+gdNatName(code)+' and '+gdNatName(w),code);
  for(const a of Object.keys(GC.nat).sort())if(a!==code&&a!==w&&!GC.nat[a].dead&&grAllied(a,w)&&!grAllied(a,code))gdRel(a,code,-5);
  return 'Clash with '+gdNatName(w)+': opinion -18, both lose manpower';},
 oilx:code=>{const mk=typeof mkSt==='function'?mkSt():null;if(!mk)return '';for(const g of ['grain','metals','wares'])mk.p[g]=Math.min(200,Math.round(mk.p[g]*1.1));grLog('Pipeline sabotage lifts world prices',code);return 'World goods prices +10%';},
 coupworld:code=>{for(const a of Object.keys(GC.nat).sort())if(a!==code&&!GC.nat[a].dead&&grNat(a).major)gdRel(a,code,-6);grLog('Army council takes power in '+gdNatName(code),code);return 'Foreign opinion -6 everywhere';}};
function gcrUn(code){let s=0,n=0;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===code){s+=GC.prov[p.i].un;n++;}return n?s/n:0;}
function gcrCond(c,code){
 if(c==='unrest')return gcrUn(code)>=30;
 if(c==='rival'){return gevNb(code).some(o=>!grAtWar(code,o)&&!grAllied(code,o)&&((GC.rel&&GC.rel[grWk(code,o)])||0)<=10);}
 return true;}
GEV_ROWS.push(
 {id:'bi_esc',t:'Border crisis deepens',x:'Troop movements on both sides of a tense frontier have everyone on edge. The general staff wants orders.',w:3,c:'rival',ai:1,o:[
  {t:'Mobilise the border brigades ($300)',fx:[['cash',-300],['mod','warSupport',.05,6],['rel','$nb',-12],['chain','bi_clash',3]]},
  {t:'Back down and talk',fx:[['rel','$nb',8],['un',3]]},
  {t:'Take it to the UN ($100)',fx:[['cash',-100],['rel','$nb',4]]}]},
 {id:'bi_clash',t:'Shots fired at the frontier',x:'A patrol has been ambushed. Both capitals blame each other and the press demands a response.',w:0,c:'always',o:[
  {t:'Retaliate with artillery',fx:[['fn','clash'],['mod','warSupport',.04,6]]},
  {t:'Use the hotline and stand down',fx:[['rel','$nb',10],['un',-2]]}]},
 {id:'cr_coup',t:'Officers plot a coup',x:'Unrest in the provinces has reached the barracks; a group of colonels is said to be meeting in secret.',w:4,c:'unrest',ai:1,o:[
  {t:'Purge the plotters ($300)',fx:[['cash',-300],['un',4]]},
  {t:'Concede reforms ($200)',fx:[['cash',-200],['un',-8]]},
  {t:'Hand power to an army council',fx:[['fn','coupworld'],['mod','warSupport',.06,12],['un',-6]]}]},
 {id:'cr_rising',t:'Uprising in the provinces',x:'Crowds have taken to the streets in a restless region and the police are overwhelmed.',w:3,c:'unrest',ai:1,o:[
  {t:'Send in the troops',fx:[['un',-5],['mod','warSupport',-.03,6]]},
  {t:'Negotiate local autonomy ($150)',fx:[['cash',-150],['un',-8]]}]},
 {id:'cr_pipe',t:'Pipeline sabotage',x:'An explosion has cut a major oil and gas pipeline; every market feels it.',w:1,c:'always',o:[
  {t:'Pay for emergency fuel ($400)',fx:[['cash',-400],['fn','oilx']]},
  {t:'Ration and wait',fx:[['un',4],['fn','oilx']]}]});
