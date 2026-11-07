// WORLD TICK (lane G): the one per-turn driver for the government/diplomacy/event modules (hooked from grEndTurn) + AI diplomacy that the
// Diplomacy tab (13m) does not do by itself: allies/guarantors join wars, AI-vs-AI peace, AI peace offers to the player, AI pacts.
// Uses 13m's state only: GC.tr truces, GC.gu guarantees [[by,for]], GC.wsT war start turns, GC.alz blocs. Deterministic (seeded by turn).
let GLG_D=0;
function glgWarLen(a,b){GC.wsT=GC.wsT||{};const k=grWk(a,b);if(GC.wsT[k]==null)GC.wsT[k]=GC.turn;return GC.turn-GC.wsT[k];}
function glgScore(a,b){let x=0,y=0;for(const p of GCM.P){if(!p.land)continue;const s=GC.prov[p.i];if(s.o===a&&s.o0===b)x++;else if(s.o===b&&s.o0===a)y++;}return [x,y];}
function glgPeace(a,b){const k=grWk(a,b);delete GC.war[k];if(GC.wsT)delete GC.wsT[k];GC.tr=GC.tr||{};GC.tr[k]=GC.turn+8;gdRel(a,b,15);
  for(const ar of GC.armies){const e=ar.o===a?b:ar.o===b?a:null;if(e&&GCM.P[ar.at].land&&GC.prov[ar.at].o===e){const d=grNearOwn(ar.o,ar.at);if(d>=0){ar.at=d;ar.path=[];ar.pg=0;ar.from=-1;}}}
  grLog('Peace between '+gnName(a)+' and '+gnName(b)+' — truce for 8 turns.',a);}
// a war was declared: the victim's allies and guarantors (AI nations and the player's allies) join against the aggressor, depth-limited
function glgDeclare(a,b){GC.wsT=GC.wsT||{};GC.wsT[grWk(a,b)]=GC.turn;if(GLG_D>0)return;GLG_D++;
  try{const call=(GC.alz||[]).filter(z=>z[1].includes(b)&&!z[1].includes(a)).flatMap(z=>z[1]).concat((GC.gu||[]).filter(g=>g[1]===b).map(g=>g[0]));
    for(const g of Array.from(new Set(call)).sort()){if(g===a||g===b||!GC.nat[g]||GC.nat[g].dead||grAtWar(g,a)||grAllied(g,a)||gdTruce(g,a))continue;
      GC.war[grWk(g,a)]=1;GC.wsT[grWk(g,a)]=GC.turn;grLog(gnName(g)+' joins the war against '+gnName(a)+' to defend '+gnName(b)+'.',g);}}finally{GLG_D--;}}
function glgTurn(){if(!GC||!GC.nat)return;
  try{gevTurn();}catch(e){console.error('gevTurn',e);}try{gachTurn();}catch(e){console.error('gachTurn',e);}try{gmisTurn();}catch(e){console.error('gmisTurn',e);}try{ggTurn();}catch(e){console.error('ggTurn',e);}try{gpTurn();}catch(e){console.error('gpTurn',e);}
  GC.off=GC.off||[];
  for(const k of Object.keys(GC.war).sort()){const [a,b]=k.split('|');if(!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead){delete GC.war[k];continue;}
    const len=glgWarLen(a,b);if(len<8)continue;const [x,y]=glgScore(a,b);const loser=x>y?b:y>x?a:null;if(!loser&&len<14)continue;const lo=loser||a,wi=loser?(loser===a?b:a):b;
    if(wi===GC.me&&GC.nat[lo].ai){if(!GC.off.some(o=>o[0]===lo&&o[1]===wi))GC.off.push([lo,wi,GC.turn]);}
    else if(lo===GC.me||wi===GC.me){continue;}
    else if(GC.nat[lo].ai&&GC.nat[wi].ai&&(GC.turn+len)%3===0)glgPeace(lo,wi);}
  GC.off=GC.off.filter(o=>grAtWar(o[0],o[1])&&GC.turn-o[2]<8);
  const R=grRng((GC.seed|0)*53+GC.turn*17);for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];const r=R(),r2=R();if(N.dead||!N.ai||!grNat(c).major||r>.06||gdAllies(c).length>=3)continue;
    const l=Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&grNat(o).major&&!grAllied(c,o)&&!grAtWar(c,o)&&gdOp(o,c)>=20&&gdAllies(o).length<4).sort();if(!l.length)continue;const t=l[Math.floor(r2*l.length)];
    GC.alz=GC.alz||[];const g=GC.alz.find(x=>x[1].includes(c));if(g&&!g[1].includes(t))g[1].push(t);else if(!g)GC.alz.push([gnName(c)+'–'+gnName(t)+' Pact',[c,t]]);gdRel(c,t,15);grLog(gnName(c)+' and '+gnName(t)+' formed an alliance.',c);}}
// alert: an AI nation asks the player for peace (accepting = same as the Diplomacy tab's peace, no strings)
if(typeof alAdd==='function')alAdd('peaceoffer','🕊','Peace offer',c=>{const o=(GC.off||[]).filter(x=>x[1]===c);return o.length?{n:o.length,tip:o.map(x=>gnName(x[0])).join(', ')+' ask for peace',go:()=>{const w=o[0][0];guConfirm(gnName(w)+' asks for peace','Accept a truce of 8 turns with '+gnName(w)+'? Their armies leave your land and yours leave theirs.',()=>glgAcceptPeace(w,c),()=>{GC.off=GC.off.filter(x=>x!==o[0]);try{guTop();}catch(e){}});}}:null;});
function glgAcceptPeace(a,b){glgPeace(a,b);GC.off=(GC.off||[]).filter(o=>!(o[0]===a&&o[1]===b));try{guTop();grandMapRefresh();}catch(e){}}
