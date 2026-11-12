// A5 FORCE LIMIT + ARMY TRADITION (laneA 2026-11-07, EU4-style; data rows in the ONE modifier engine 13k, no second upkeep system).
// Force limit = the army value a nation can field at normal upkeep. It starts 15% above each nation's opening army (realistic start)
// and grows/shrinks with the development it holds (conquest raises it, losing land lowers it); GMOD stat 'forceLimit' scales it.
// Over the limit: upkeep x1.5 (row 'fl_over'). Army tradition 0-100: battles raise it (winner +6, loser +2), it fades 2%/month;
// it raises every army's max morale (+1 per 10, hook in 13b gmMorMax) and at 50+/80+ adds manpower/war-support rows.
// State: N.fl0 (start limit), N.dv0 (start development), N.trad — all in GC.nat, so saves and determinism keep working.
function gfDev(c){let d=0;for(const p of GCM.P)if(p.land&&GC.prov[p.i]&&GC.prov[p.i].o===c)d+=p.dev||1;return d;}
function gfInit(c){const N=GC&&GC.nat[c];if(!N)return null;if(N.fl0===undefined){N.fl0=Math.max(4000,Math.round(geArmyVal(c)*1.15));N.dv0=Math.max(1,gfDev(c));}if(N.trad===undefined)N.trad=10;return N;}
function grFL(c){const N=gfInit(c);if(!N)return 0;return Math.round(N.fl0*Math.max(.25,gfDev(c)/N.dv0)*gmod('nation',c,'forceLimit',1));}
function gfOver(c){const N=GC&&GC.nat[c];return !!N&&!N.dead&&geArmyVal(c)>grFL(c);}
GMOD_COND.overfl=k=>gfOver(k);
GMOD_COND.trad=(k,arg)=>{const N=GC&&GC.nat[k];return !!N&&(N.trad|0)>=(+arg||0);};
GMOD_ROWS.push({id:'fl_over',src:'Over force limit',scope:'nation',stat:'upkeep',mul:1.5,cond:'overfl'},
  {id:'trad50',src:'Army tradition 50+',scope:'nation',stat:'manpower',add:.10,cond:'trad:50'},
  {id:'trad80',src:'Army tradition 80+',scope:'nation',stat:'warSupport',add:.03,cond:'trad:80'});
if(typeof GMOD_STATS==='object'){GMOD_STATS.upkeep=GMOD_STATS.upkeep||'Army upkeep';GMOD_STATS.manpower=GMOD_STATS.manpower||'Manpower';GMOD_STATS.forceLimit='Force limit';}
GMOD_HOOKS.push(()=>{for(const c of Object.keys(GC.nat)){const N=gfInit(c);if(N&&!N.dead)N.trad=Math.round(N.trad*.98*10)/10;}});
function gfBattle(b,win){for(const [c,w] of [[b.an,win==='att'],[b.dn,win!=='att']]){const N=gfInit(c);if(N)N.trad=Math.min(100,(N.trad||0)+(w?6:2));}}
function gfTradMor(o){const N=GC&&GC.nat[o];return N?Math.floor((N.trad||0)/10):0;}
// the top bar's army-strength chip (13c guTop draws it): value, limit, over the limit?, army tradition
function gfChip(){if(!GC||!GC.me||!GC.nat[GC.me])return null;const v=geArmyVal(GC.me),L=grFL(GC.me);return {v,L,over:v>L,trad:Math.round(GC.nat[GC.me].trad||0)};}
