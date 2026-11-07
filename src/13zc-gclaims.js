// 13zc-gclaims.js — Lane G B6: claims & casus belli (EU4). GC.cl = [[claimer, provIdx, untilTurn]]. A claim on a neighbour's province costs $400,
// lasts 24 months, makes a war on that nation JUSTIFIED (no world-opinion hit, no alarm) and halves that province's price in the peace-deal screen.
// An unjustified war sours every nation (-8) and adds alarm. Counter-play: the owner's opinion falls (-5), garrison/alliances, truce, coalitions.
const GCL_COST=400, GCL_LEN=24, GCL_UNJUST_AE=8;
function gclList(a,b){return (GC.cl||[]).filter(x=>x[0]===a&&x[2]>GC.turn&&GC.prov[x[1]]&&(b==null||GC.prov[x[1]].o===b));}
function gclHas(a,pi){return (GC.cl||[]).some(x=>x[0]===a&&x[1]===pi&&x[2]>GC.turn);}
function gclJust(a,b){return gclList(a,b).length>0;}
// the best province of b that a could claim: land, adjacent to a province a owns, not yet claimed, richest first
function gclPick(a,b){const c=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===b&&!gclHas(a,p.i)&&p.adj.some(j=>GCM.P[j].land&&GC.prov[j].o===a)).sort((x,y)=>y.dev-x.dev||x.i-y.i);return c[0]||null;}
function gclFab(a,b){const p=gclPick(a,b);if(!p)return 'No province of theirs borders yours';GC.cl=(GC.cl||[]).filter(x=>x[2]>GC.turn);GC.cl.push([a,p.i,GC.turn+GCL_LEN]);gdRel(b,a,-5);
  grLog(gdNatName(a)+' presses a claim on '+p.n+' ('+gdNatName(b)+').',a);return '';}
function gclTaken(a,pi){GC.cl=(GC.cl||[]).filter(x=>!(x[0]===a&&x[1]===pi));}
// AI: every month a major with a rival (an enemy-of-friend / bad blood) at the border claims its richest border province, at most one claim per target
function gclMonth(){if(!GC)return;for(const a of Object.keys(GC.nat).sort()){const N=GC.nat[a];if(N.dead||a===GC.me||!grNat(a).major||N.cash<GCL_COST*2||grOverlord(a))continue;
  let best=null,bv=0;for(const b of Object.keys(GC.nat).sort()){if(b===a||GC.nat[b].dead||grAllied(a,b)||gclList(a,b).length)continue;if(!gdNear(a,b))continue;const v=-gdOp(a,b);if(v>bv&&v>=20){bv=v;best=b;}}
  if(best&&gclPick(a,best)){N.cash-=GCL_COST;gclFab(a,best);}}}
GMOD_HOOKS.push(gclMonth);
alAdd('claims','📜','Claims',c=>{if(c!==GC.me)return null;const n=gclList(c).length;return n?{n,tip:n+' claim'+(n>1?'s':'')+' ready — a war on that nation is justified',go:()=>npOpen(c,'dip')}:null;});
