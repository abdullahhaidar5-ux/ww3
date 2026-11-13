// 13m-gdiplo.js — Lane G B6: EU4-style diplomacy. ONE opinion = grOpinion (13i) + these factor lines; actions are DETERMINISTIC
// (accept when score >= threshold, no dice) and always show WHY. State lives in GC (saved with the campaign): GC.rel pair opinions,
// GC.alz alliances, GC.tr truces {pairKey:untilTurn}, GC.gu guarantees [[by,for]], GC.wsT war start turns {pairKey:turn}.
const GD={sel:'',flt:'all',sort:'op',q:''};
function gdTruce(a,b){return !!(GC&&GC.tr&&GC.tr[grWk(a,b)]>GC.turn);}
function gdRel(a,b,d){GC.rel=GC.rel||{};const k=grWk(a,b);GC.rel[k]=Math.max(-100,Math.min(100,(GC.rel[k]||0)+d));}
function gdEnemies(c){return Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&grAtWar(c,o));}
function gdAllies(c){return Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&grAllied(c,o));}
function gdNear(a,b){return GCM.P.some(p=>p.land&&GC.prov[p.i].o===a&&p.adj.some(j=>GCM.P[j].land&&GC.prov[j].o===b));}
// factor lines [text, value] explaining the opinion between a and b
function gdWhy(a,b){const L=[],base=(GC.rel&&GC.rel[grWk(a,b)])||0;if(base)L.push([base>0?'Friendly history':'Bad blood',base]);
  if(grAllied(a,b))L.push(['Allied',40]);if(gdTruce(a,b))L.push(['Truce in force',5]);
  const se=gdEnemies(a).filter(e=>grAtWar(b,e));if(se.length)L.push(['Shared enemies ('+se.map(e=>GCM.nats.get(e).name).join(', ')+')',20*se.length]);
  const ea=gdEnemies(a).filter(e=>grAllied(b,e)),eb=gdEnemies(b).filter(e=>grAllied(a,e));if(ea.length||eb.length)L.push(['Allied with the other\'s enemy',-25*(ea.length+eb.length)]);
  if(GC.gu&&GC.gu.some(g=>g[0]===a&&g[1]===b))L.push(['You guarantee them',10]);
  if(GC.gu&&GC.gu.some(g=>g[0]===b&&g[1]===a))L.push(['They guarantee you',10]);
  return L;}
function gdOp(a,b){if(grAtWar(a,b))return -100;const w=gdWhy(a,b);let v=0;for(const x of w)v+=x[1];return Math.max(-100,Math.min(100,v));}
// ---- WAR RECORD, WAR AIM AND AN HONEST WAR SCORE (Abdullah 2026-11-12 20:29 "Go", item 2 of orch/reports/eu4-gap.md) ----
// Every war has ONE record GC.wr[grWk(a,b)] = {by: who declared, g: the stated aim {t,p}, gt: aim clock, bw: {nation: battle points}} (start month stays in GC.wsT).
// The score is counted, never rolled, and it is the same number for both sides with the sign flipped:
//   battles won (GWS.bat each, GWS.big for a force destroyed or scattered, net capped at GWS.batCap) · land occupied (share of the enemy's development held,
//   up to GWS.occ, +GWS.capB for his capital) · ports blockaded (GWS.port each, capped) · the stated aim (held: +GWS.aimUp a month up to GWS.aimCap for the
//   attacker; not held after GWS.holdAfter months: the defender is holding out, -1 a month down to -GWS.holdCap).
// Exhaustion is NOT in the score: war support (13v) is the one exhaustion measure and enters only when a side decides to sign (gpWill, 13z-gpeace.js).
// Who reacts: the AI signs or refuses by these numbers, and the peace table shows them row by row. Counter-play: win battles, take or free land, break
// a blockade, deny the aim. Cost: all of it costs men, money and war support. Saved in GC, deterministic.
const GWS={bat:3,big:5,batCap:40,occ:60,capB:10,port:3,portCap:12,aimUp:2,aimCap:25,holdAfter:6,holdCap:15};
const GWG={sup:['Show superiority','win clearly more battles than you lose'],prov:['Take a province','hold the named province'],cap:['Take the capital','hold the enemy capital'],def:['Defend the homeland','keep every enemy soldier off your land'],lib:['Free occupied land','drive the occupier out of the named nation\'s land']};
const GD_NOWAR=Object.freeze({by:'',g:Object.freeze({t:'sup'}),gt:0,bw:Object.freeze({})});
function gdWarRec(a,b){return (GC&&GC.wr&&GC.wr[grWk(a,b)])||GD_NOWAR;}
function gdWarMk(a,b){GC.wr=GC.wr||{};const k=grWk(a,b);if(!GC.wr[k])GC.wr[k]={by:'',g:{t:'sup'},gt:0,bw:{}};return GC.wr[k];}
// the aim a nation would state against b when nobody chose one: its claimed province, else land it once owned, else a show of superiority
function gdAimPick(a,b){let c=null;try{c=gclList(a,b)[0];}catch(e){}if(c)return {t:'prov',p:c[1]};
  const lost=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===b&&!GC.prov[p.i].ow&&GC.prov[p.i].o0===a).sort((x,y)=>y.dev-x.dev||x.i-y.i)[0];if(lost)return {t:'prov',p:lost.i};return {t:'sup'};}
function gdWarStart(a,b,g){const w=gdWarMk(a,b);w.by=a;w.g=g||gdAimPick(a,b);w.gt=0;w.bw={};return w;}
function gdAimText(a,b){const w=gdWarRec(a,b),g=w.g,by=w.by;if(!by)return 'No stated aim (the war grew out of another war)';
  const nm=g.t==='prov'&&GCM.P[g.p]?'Take '+GCM.P[g.p].n:g.t==='lib'&&g.n&&GCM.nats.get(g.n)?'Free the occupied land of '+GCM.nats.get(g.n).name:GWG[g.t][0];return gdN(by)+': '+nm;}
// is the declarer's aim met right now? (the defender's aim is always the mirror: deny it)
function gdAimHeld(a,b){const w=gdWarRec(a,b),g=w.g,by=w.by;if(!by)return false;const foe=by===a?b:a;
  if(g.t==='prov')return !!GC.prov[g.p]&&GC.prov[g.p].o===by;
  if(g.t==='cap')return GC.prov.some(st=>st.cp===foe&&st.o===by);
  if(g.t==='def')return !GC.prov.some(st=>st.ow===by&&st.o===foe);
  if(g.t==='lib')return !GC.prov.some(st=>st.ow===g.n&&st.o===foe)&&GC.prov.some(st=>st.o===g.n||st.ow===g.n);
  return ((w.bw[by]|0)-(w.bw[foe]|0))>=GWS.bat*3;}
// a battle between the two nations of a war ended (from grSettle)
function gdWarBattle(b,win){if(!b||!grAtWar(b.an,b.dn))return;const w=gdWarMk(b.an,b.dn),c=win==='att'?b.an:b.dn;w.bw[c]=(w.bw[c]|0)+((b.how==='wipe'||b.how==='shatter'||b.how==='sunk')?GWS.big:GWS.bat);}
// monthly: the aim clock moves, records of finished wars are dropped
function gdWarMonth(){if(!GC||!GC.wr)return;for(const k of Object.keys(GC.wr).sort()){if(!GC.war[k]){delete GC.wr[k];continue;}const w=GC.wr[k];if(!w.by)continue;const [a,b]=k.split('|'),len=GC.turn-((GC.wsT&&GC.wsT[k])||GC.turn);
    if(gdAimHeld(a,b))w.gt=Math.min(GWS.aimCap,Math.max(0,w.gt)+GWS.aimUp);else if(w.gt>0)w.gt=Math.max(0,w.gt-GWS.aimUp);else if(len>=GWS.holdAfter)w.gt=Math.max(-GWS.holdCap,w.gt-1);}}
if(typeof GMOD_HOOKS==='object')GMOD_HOOKS.push(gdWarMonth);
// the score of a against b as rows [label, points, hint]; gdWarscore = their sum, -100..100
function gdWarRows(a,b){const w=gdWarRec(a,b),R=[],P=GCM.P;
  const net=Math.max(-GWS.batCap,Math.min(GWS.batCap,(w.bw[a]|0)-(w.bw[b]|0)));R.push(['Battles won',net,'+'+GWS.bat+' for each battle won, +'+GWS.big+' when the enemy force is destroyed or scattered (most '+GWS.batCap+')']);
  let dA=0,dB=0,hA=0,hB=0,cA=0,cB=0;for(const p of P){if(!p.land)continue;const st=GC.prov[p.i],ow=st.ow||st.o,d=p.dev||1;if(ow===b){dB+=d;if(st.o===a&&st.ow===b){hA+=d;if(st.cp===b)cA=1;}}else if(ow===a){dA+=d;if(st.o===b&&st.ow===a){hB+=d;if(st.cp===a)cB=1;}}}
  const occ=Math.round((dB?GWS.occ*hA/dB:0)+cA*GWS.capB-(dA?GWS.occ*hB/dA:0)-cB*GWS.capB);R.push(['Land occupied',occ,'the share of the enemy\'s land you hold (by development, most '+GWS.occ+'), +'+GWS.capB+' for his capital; minus what he holds of yours']);
  let pa=0,pb=0;const M=GC.mil;if(M&&M.bk)for(const i of Object.keys(M.bk)){const o=GC.prov[i].o;if(o!==a&&o!==b)continue;const e=o===a?b:a;if(P[i].adj.some(j=>P[j].sea&&GC.armies.some(x=>x.fl&&x.at===j&&x.o===e&&x.u.length))){if(o===b)pa++;else pb++;}}
  const port=Math.min(GWS.portCap,pa*GWS.port)-Math.min(GWS.portCap,pb*GWS.port);R.push(['Ports blockaded',port,'+'+GWS.port+' for each enemy port your fleets close (most '+GWS.portCap+')']);
  if(w.by){const sg=w.by===a?1:-1,held=gdAimHeld(a,b);R.push([w.gt>=0?(held?'War aim held':'War aim (not held)'):'Time: the defender holds out',sg*w.gt,gdAimText(a,b)+' — held: +'+GWS.aimUp+' a month for the attacker (most '+GWS.aimCap+'); not held after '+GWS.holdAfter+' months: -1 a month (most -'+GWS.holdCap+')']);}
  return R;}
function gdWarscore(a,b){if(!grAtWar(a,b))return 0;let s=0;for(const r of gdWarRows(a,b))s+=r[1];return Math.max(-100,Math.min(100,s));}
// chance(action,a,b) -> {ok:bool, why:[[text,v]], cost, note}  (a = actor, b = target)
// ESCALATION LADDER (queue "Escalation ladder", slice 1: the rungs between peace and war). One crisis level per pair of nations, GC.esc[grWk(a,b)]={r,by,t,st:{}}:
//   0 Normal relations · 1 Public warning · 2 Red line declared · 3 Forces on alert ($GESC_ALERT a month for both sides; a side that cannot pay stands down to rung 2). Each step up: opinion -8, the target's public rallies (+2 war support).
//   Declaring war below rung 2 is a surprise attack: every other nation's opinion of the attacker -10 and the defender rallies (+6). At rung 2-3 the war was signalled: no extra penalty.
//   Off-ramps (gescDown): with a mediator (a major at peace with both and on good terms, found automatically; $GESC_MED, mediator gains +5 with both) the crisis steps down two rungs with no loss of face;
//   without one, the side that staked its word (st) backs down in public: war support -3, the other side +2. A crisis nobody touches for 12 months cools one rung.
//   AI: majors escalate against a hostile rival rarely (GESC_AI_P a month); AI wars now climb the ladder first (gescGate: warn, red line, then war), so wars are rarer and seen coming;
//   two nuclear-armed nations stop at the red line and go to war only at GESC_NUKE_P a month (deterrence). An AI that is warned answers by strength: holds firm, counter-escalates, or backs down.
//   Real base rates and sources: orch/REAL-2026.md "Escalation ladder". Deterministic (seed + turn); saved with GC.
const GESC_R=['Normal relations','Public warning','Red line declared','Forces on alert','Limited war','Blockade','Strategic strikes','Nuclear alert'];
const GESC_ALERT=150,GESC_MED=100,GESC_AI_P=.02,GESC_NUKE_P=.01,GESC_COOL=12;
function gescS(){return GC.esc||(GC.esc={});}
function gescOf(a,b){const e=GC&&GC.esc&&GC.esc[grWk(a,b)];return e?((e.r>=4&&!grAtWar(a,b))?0:e.r):0;}
function gescWs(c,d){if(typeof wsN==='function'){const N=wsN(c);if(N)N.wsE+=d;}}
function gescUp(a,b){if(!GC||a===b||!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead||grAtWar(a,b)||grAllied(a,b))return false;const S=gescS(),k=grWk(a,b);if(S[k]&&S[k].r>=4)delete S[k];const e=S[k]||(S[k]={r:0,by:'',t:0,st:{}});if(e.r>=3)return false;
  e.r++;e.by=a;e.t=GC.turn;e.an=-1;e.st[a]=1;gdRel(a,b,-8);gescWs(b,2);
  grLog(gdN(a)+(e.r===1?' publicly warns '+gdN(b)+'.':e.r===2?' declares a red line against '+gdN(b)+'.':' puts its forces on alert against '+gdN(b)+'.'),(b===GC.me||a===GC.me)?GC.me:a);return true;}
function gdN(c){return GCM.nats.get(c).name;}
function gescMediator(a,b){const rl=(x,y)=>(GC.rel&&GC.rel[grWk(x,y)])||0;let best='',bv=-1;for(const m of Object.keys(GC.nat).sort()){if(m===a||m===b||GC.nat[m].dead||!grNat(m).major||grAtWar(m,a)||grAtWar(m,b))continue;
    const ra=rl(m,a),rb=rl(m,b);if(ra<0||rb<0)continue;const v=ra+rb;if(v>bv){bv=v;best=m;}}return best;}
function gescDown(a,b){const S=gescS(),k=grWk(a,b),e=S[k];if(!e||e.r<1)return 'No crisis to step back from.';const m=gescMediator(a,b);
  if(m){if(GC.nat[a].cash<GESC_MED)return 'Mediation costs $'+GESC_MED+'.';GC.nat[a].cash-=GESC_MED;e.r=Math.max(0,e.r-2);gdRel(m,a,5);gdRel(m,b,5);gdRel(a,b,6);grLog(gdN(m)+' mediates between '+gdN(a)+' and '+gdN(b)+': both step back without losing face.',(b===GC.me||a===GC.me)?GC.me:a);}
  else{e.r--;if(e.st[a]){gescWs(a,-3);gescWs(b,2);}gdRel(a,b,4);grLog(gdN(a)+' steps back in its crisis with '+gdN(b)+(e.st[a]?'. At home it looks like backing down.':'.'),(b===GC.me||a===GC.me)?GC.me:a);}
  e.t=GC.turn;e.an=GC.turn;delete e.st[a];if(e.r<=0)delete S[k];return '';}
// called by grDeclare: was the war signalled?
function gescDeclared(a,b){const S=gescS(),k=grWk(a,b),r=S[k]?S[k].r:0;delete S[k];
  if(r<2){for(const o of Object.keys(GC.nat))if(o!==a&&o!==b&&!GC.nat[o].dead)gdRel(a,o,-10);gescWs(b,6);grLog(gdN(a)+' attacked '+gdN(b)+' without warning. The world condemns the surprise attack.',(b===GC.me||a===GC.me)?GC.me:a);}}
// AI war gate (13-grand grAIPlan): climb the ladder first; nuclear pairs stop at the red line
function gescGate(c,b,R){const r=gescOf(c,b),nk=grNuk(c)&&grNuk(b);if(nk){if(r<2){gescUp(c,b);return false;}return R()<GESC_NUKE_P;}if(r<2){gescUp(c,b);return false;}return true;}
// WARTIME RUNGS (queue "Escalation ladder", slice 2). The same GC.esc level goes on inside a war: 4 Limited war (armies, fleets and strikes on them) · 5 Blockade (a fleet closes the enemy's ports) ·
//   6 Strategic strikes (missiles, raids or drones on industry, power, ports deep inside the country) · 7 Nuclear alert. A war with no entry stands at rung 4.
//   The side that crosses a rung FIRST pays: every outside nation's opinion of it drops (GESC_WOP; its own allies half) and the victim's public rallies (GESC_WRALLY). Matching a rung the enemy already reached is free (tit for tat).
//   Limits (act 'deesc' in a war): the enemy accepts when it is not clearly winning or a mediator is found ($GESC_MED) -> one rung down and a GESC_LIM-month pact; the side that crosses again inside the pact pays double.
//   A rung nobody uses for GESC_WCOOL months cools by one. Nuclear alert (act 'warn' in a war, needs warheads): $GESC_NALERT a month; a nuclear enemy matches it; a non-nuclear enemy looks for a nuclear protector
//   (who draws a red line against the alerter) or, when not winning, asks for a truce. AI: crosses to strategic strikes rarely (GESC_AI_X a month, GESC_AI_XL when losing, GESC_AI_XN between nuclear powers);
//   its last-resort nuclear strike (13zz) now needs a month on nuclear alert first, so the occupier can leave the capital or make peace. Sources: orch/REAL-2026.md "Escalation inside a war".
const GESC_WOP=[0,0,0,0,0,-3,-6,-12],GESC_WRALLY=[0,0,0,0,0,2,3,4],GESC_NALERT=200,GESC_WCOOL=6,GESC_LIM=6,GESC_AI_X=.06,GESC_AI_XL=.25,GESC_AI_XN=.02,GESC_AI_NA=.1;
function gescWarOf(a,b){if(!GC||!grAtWar(a,b))return gescOf(a,b);const e=GC.esc&&GC.esc[grWk(a,b)];return e&&e.r>=4?e.r:4;}
function gescMeSee(a,b){return (b===GC.me||a===GC.me)?GC.me:a;}
// a crosses (or keeps using) rung r against b. Returns true when this was a first crossing.
function gescWar(a,b,r){if(!GC||!GC.nat[a]||!GC.nat[b]||!grAtWar(a,b)||r<5||r>7)return false;const S=gescS(),k=grWk(a,b);if(S[k]&&S[k].r<4)delete S[k];const e=S[k]||(S[k]={r:4,by:'',t:GC.turn,st:{}});
  if(e.r>=r){if(e.r===r)e.t=GC.turn;return false;}
  const brk=(e.lim|0)>GC.turn,op=GESC_WOP[r]*(brk?2:1);delete e.lim;e.r=r;e.by=a;e.t=GC.turn;e.an=-1;
  for(const o of Object.keys(GC.nat))if(o!==a&&o!==b&&!GC.nat[o].dead&&!grAtWar(o,b))gdRel(a,o,grAllied(o,a)?Math.round(op/2):op);
  gescWs(b,GESC_WRALLY[r]);if(r===7)gescWs(a,-2);
  grLog(gdN(a)+(r===5?' blockades the ports of ':r===6?' strikes industry and cities deep inside ':' puts its nuclear forces on alert against ')+gdN(b)+'. The war climbs to: '+GESC_R[r].toLowerCase()+(brk?' — breaking the limits both sides had agreed.':'.'),gescMeSee(a,b));return true;}
// may AI nation c cross to rung r against b this month? (true at once when the war is already there)
function gescWarAI(c,b,r,R){if(gescWarOf(c,b)>=r)return true;const e=GC.esc&&GC.esc[grWk(c,b)];let p=(grNuk(c)&&grNuk(b))?GESC_AI_XN:gdWarscore(c,b)<-10?GESC_AI_XL:GESC_AI_X;if(e&&(e.lim|0)>GC.turn)p*=.25;return R()<p;}
// nuclear alert. force: an AI's last resort (pays what it can)
function gescNAlert(a,b,force){if(!GC||!grAtWar(a,b))return 'Only against a nation you are at war with.';if(!grNuk(a))return 'No nuclear warheads.';if(gescWarOf(a,b)>=7&&((GC.esc[grWk(a,b)].na||{})[a]))return 'Already on nuclear alert.';
  const N=GC.nat[a];if(!force&&N.cash<GESC_NALERT)return 'Costs $'+GESC_NALERT+' a month.';N.cash-=Math.min(Math.max(0,N.cash),GESC_NALERT);
  if(!gescWar(a,b,7))grLog(gdN(a)+' answers with its own nuclear alert against '+gdN(b)+'.',gescMeSee(a,b));const e=GC.esc[grWk(a,b)];e.na=e.na||{};e.na[a]=1;e.t=GC.turn;return '';}
// limits offered by a to b inside a war
function gescLimit(a,b){const S=gescS(),k=grWk(a,b),e=S[k];if(!e||e.r<5)return 'The war is already limited.';const m=gescMediator(a,b);
  if(!m&&b!==GC.me&&gdWarscore(b,a)>10)return gdN(b)+' refuses: it is winning and sees no reason to hold back.';
  if(m){if(GC.nat[a].cash<GESC_MED)return 'Mediation costs $'+GESC_MED+'.';GC.nat[a].cash-=GESC_MED;gdRel(m,a,5);gdRel(m,b,5);}
  e.r--;e.t=GC.turn;e.lim=GC.turn+GESC_LIM;if(e.r<7)delete e.na;
  grLog((m?gdN(m)+' brokers limits between ':'Limits agreed between ')+gdN(a)+' and '+gdN(b)+': the war steps down to '+GESC_R[e.r].toLowerCase()+' for at least '+GESC_LIM+' months.',gescMeSee(a,b));return '';}
// who blockades whom this month (ports with an enemy fleet next to them and no fleet of their own there)
function gescBlockades(){if(!GC.armies||typeof gmilHasPort!=='function')return;const at={};for(const f of GC.armies){if(!f.fl||!f.u||!f.u.length)continue;(at[f.at]||(at[f.at]=[])).push(f.o);}
  const seen={};for(const p of GCM.P){if(!p.land||!gmilHasPort(p.i))continue;const o=GC.prov[p.i].o;if(!GC.nat[o]||GC.nat[o].dead)continue;
    for(const j of p.adj){const f=at[j];if(!f||!GCM.P[j].sea||f.includes(o))continue;for(const x of f)if(x!==o&&grAtWar(x,o)&&!seen[x+'>'+o]){seen[x+'>'+o]=1;}}}
  for(const q of Object.keys(seen).sort()){const [x,o]=q.split('>');gescWar(x,o,5);}}
function gescWarMonth(k,e,a,b,R){const S=gescS(),r1=R(),r2=R();
  if(e.r===7){e.na=e.na||{};for(const c of [a,b]){if(!e.na[c])continue;const N=GC.nat[c];if(c===GC.me&&N.cash<GESC_NALERT){delete e.na[c];grLog(gdN(c)+' cannot pay for the nuclear alert and stands its forces down.',c);}else N.cash-=Math.min(Math.max(0,N.cash),GESC_NALERT);}
    const x=e.by===a?b:a;
    if(e.by&&x!==GC.me&&e.an!==e.t&&e.t<GC.turn&&!e.na[x]){e.an=e.t;   // the AI side answers a nuclear alert
      if(grNuk(x))gescNAlert(x,e.by,1);
      else{let pr='';for(const m of Object.keys(GC.nat).sort()){if(m===x||m===e.by||GC.nat[m].dead||!grNuk(m)||grAllied(m,e.by)||grAtWar(m,x))continue;if(((GC.rel&&GC.rel[grWk(m,x)])||0)>=20||grAllied(m,x)){pr=m;break;}}
        if(pr&&!grAtWar(pr,e.by)){while(gescOf(pr,e.by)<2&&gescUp(pr,e.by)){}grLog(gdN(pr)+' warns '+gdN(e.by)+': a nuclear strike on '+gdN(x)+' would not go unanswered.',gescMeSee(e.by,x));}
        else if(gdWarscore(x,e.by)<=0&&r1<.3){delete GC.war[k];GC.tr=GC.tr||{};GC.tr[k]=GC.turn+6;delete S[k];grLog(gdN(x)+' asks for a truce under the nuclear threat. '+gdN(e.by)+' gains nothing but the end of the fighting — truce for 6 months.',gescMeSee(e.by,x));return;}}}
    if(!Object.keys(e.na).length){e.r=6;e.t=GC.turn;}}
  else for(const c of [a,b]){const o=c===a?b:a;if(c!==GC.me&&grNuk(c)&&gdWarscore(c,o)<-30&&(c===a?r1:r2)<GESC_AI_NA){gescNAlert(c,o,1);return;}}   // a nuclear power that is losing badly rattles the sabre (rare)
  if(GC.turn-e.t>=GESC_WCOOL){e.r--;e.t=GC.turn;delete e.na;if(k.split('|').includes(GC.me))grLog('The war between '+gdN(a)+' and '+gdN(b)+' cools to: '+GESC_R[e.r].toLowerCase()+'.',GC.me);}
  if(e.r<=4&&!((e.lim|0)>GC.turn))delete S[k];}
function gescMonth(){if(!GC||!GC.nat)return;const S=gescS(),R=grRng((GC.seed|0)*389+GC.turn*23);gescBlockades();
  for(const k of Object.keys(S).sort()){const e=S[k],[a,b]=k.split('|');if(!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead||grAllied(a,b)||(e.r>=4)!==!!grAtWar(a,b)){delete S[k];continue;}
    if(e.r>=4){gescWarMonth(k,e,a,b,R);continue;}
    if(e.r>=3){if(GC.nat[a].cash<GESC_ALERT||GC.nat[b].cash<GESC_ALERT)e.r=2;else{GC.nat[a].cash-=GESC_ALERT;GC.nat[b].cash-=GESC_ALERT;}}   // a side that cannot pay for the alert stands its forces down
    const x=e.by===a?b:a,r1=R(),r2=R();
    if(e.by&&x!==GC.me&&e.an!==e.t&&e.t<GC.turn){e.an=e.t;const sr=grMilOf(x)/Math.max(.05,grMilOf(e.by)),nk=grNuk(x)&&grNuk(e.by);   // the AI side answers last month's step
      const pUp=sr>=1?.25:.1,pBack=(sr<.6&&!grNuk(x)&&!gdAllies(x).length)?.3:.08;
      if(r1<pUp&&e.r<(nk?2:3)){gescUp(x,e.by);}
      else if(r1<pUp+pBack){e.r=0;gescWs(x,-3);gescWs(e.by,2);gdRel(x,e.by,5);grLog(gdN(x)+' backs down in its crisis with '+gdN(e.by)+'.',(e.by===GC.me)?GC.me:x);delete S[k];continue;}
      else{e.st[x]=1;gdRel(x,e.by,-3);if(e.by===GC.me)grLog(gdN(x)+' holds firm: it rejects the '+GESC_R[e.r].toLowerCase()+' from '+gdN(e.by)+'.',GC.me);}}
    else if(e.by&&e.by!==GC.me&&GC.turn-e.t>=4&&r2<.2){gescDown(e.by,x);continue;}   // AI looks for an off-ramp after a few months
    if(S[k]&&GC.turn-e.t>=GESC_COOL){e.r--;e.t=GC.turn;if(e.r<=0)delete S[k];}}
  for(const a of Object.keys(GC.nat).sort()){const N=GC.nat[a];if(N.dead||a===GC.me||!grNat(a).major)continue;const r=R(),r2=R();if(r>=GESC_AI_P||gdEnemies(a).length)continue;
    const c=Object.keys(GC.nat).sort().filter(b=>b!==a&&!GC.nat[b].dead&&grNat(b).major&&!grAllied(a,b)&&!grAtWar(a,b)&&((GC.rel&&GC.rel[grWk(a,b)])||0)<=-40&&gescOf(a,b)<(grNuk(a)&&grNuk(b)?2:3));
    if(c.length)gescUp(a,c[Math.floor(r2*c.length)]);}}
if(typeof GMOD_HOOKS!=='undefined')GMOD_HOOKS.push(gescMonth);
if(typeof alAdd==='function')alAdd('esc','⚠','Crisis',c=>{if(!GC||!GC.esc)return null;const ks=Object.keys(GC.esc).filter(k=>k.split('|').includes(c)).sort((x,y)=>GC.esc[y].r-GC.esc[x].r||(x<y?-1:1));if(!ks.length)return null;const o=ks[0].split('|').find(x=>x!==c);
  return {n:GESC_R[GC.esc[ks[0]].r],tip:'crisis with '+gdN(o)+': '+GESC_R[GC.esc[ks[0]].r].toLowerCase()+' — open Diplomacy to escalate or step back',go:()=>{GD.sel=o;npOpen(c,'dip');}};});
function gdChance(act,a,b){const W=[],cash=GC.nat[a].cash,op=gdOp(b,a),war=grAtWar(a,b),al=grAllied(a,b),big=(c)=>grRealClass(c);let ok=true,cost=0,note='';
  const no=m=>{ok=false;note=m;};
  if((a==='BI'||b==='BI')&&act!=='war'&&act!=='break'){no('Outlaw movement: nobody makes treaties with them');W.push(['Everyone\'s enemy',-100]);return {ok:false,why:W,cost:0,note};}   // nation-obbd: BI can make no alliances, peace or aid
  if(act==='improve'){cost=200;if(war)no('At war');W.push(['Costs $200, adds +10 opinion',0]);}
  else if(act==='aid'){cost=600;if(war)no('At war');W.push(['Costs $600, adds +20 opinion',0]);}
  else if(act==='alliance'){if(war)no('At war');else if(al)no('Already allied');
    const se=gdEnemies(a).filter(e=>grAtWar(b,e)).length;let s=op*0.5-15;W.push(['Their opinion of you',Math.round(op*0.5)]);W.push(['Baseline caution',-15]);
    if(se){W.push(['Shared enemies',15*se]);s+=15*se;}
    if(!grNat(b).major){W.push(['Minor nations rarely join blocs',-10]);s-=10;}
    if(gdAllies(b).some(x=>grAtWar(a,x))){W.push(['Their ally is your enemy',-40]);s-=40;}
    if(s<10&&ok)no('They decline (need 10, have '+Math.round(s)+')');W.push(['Total',Math.round(s)]);}
  else if(act==='claim'){cost=GCL_COST;if(war)no('At war');else if(al)no('Already allied');else if(!gclPick(a,b))no('No province of theirs borders yours');else W.push(['Claim on '+gclPick(a,b).n+' ($'+GCL_COST+', lasts '+GCL_LEN+' months)',0]);W.push(['Justifies war and halves that province\'s price at peace',0]);W.push(['Their opinion of you -5',0]);}
  else if(act==='warn'&&war){const r=gescWarOf(a,b);cost=GESC_NALERT;W.push(['Now: '+GESC_R[r]+' → Nuclear alert',0]);if(!grNuk(a))no('At war: the next rungs come from what you do (a blockade, strikes on industry). Nuclear alert needs warheads');else if(r>=7&&((GC.esc[grWk(a,b)].na||{})[a]))no('Already on nuclear alert');W.push(['$'+GESC_NALERT+' a month; every outside nation\'s opinion of you '+GESC_WOP[7]+' (allies half); their public rallies, yours is frightened',GESC_WOP[7]]);W.push(['A nuclear enemy answers in kind; others look for a nuclear protector or a truce',0]);}
  else if(act==='warn'){const r=gescOf(a,b);if(war)no('At war');else if(al)no('Allied');else if(r>=3)no('Already at the top rung short of war');W.push(['Now: '+GESC_R[r]+(r<3?' → next: '+GESC_R[r+1]:''),0]);W.push(['Their opinion of you -8; their public rallies; your word is at stake',-8]);if(r===2)W.push(['Forces on alert cost both sides $'+GESC_ALERT+' a month',0]);W.push(['A war after a red line is not a surprise attack (no -10 opinion everywhere)',0]);}
  else if(act==='deesc'&&war){const r=gescWarOf(a,b);if(r<5)no('Already a limited war');else{const m=gescMediator(a,b);if(m)cost=GESC_MED;W.push(['Offer limits: '+GESC_R[r]+' → '+GESC_R[r-1]+' for '+GESC_LIM+' months'+(m?' ('+gdN(m)+' mediates)':''),0]);if(!m&&gdWarscore(b,a)>10)no('They are winning and will refuse (no mediator on good terms with both)');W.push(['Whoever crosses the rung again inside the pact pays double in world opinion',0]);}}
  else if(act==='deesc'){const r=gescOf(a,b);if(r<1)no('Already calm: no crisis with them');else{const m=gescMediator(a,b);if(m){cost=GESC_MED;W.push([gdN(m)+' mediates: two rungs down, nobody loses face',0]);}else W.push([(GC.esc[grWk(a,b)].st||{})[a]?'No mediator on good terms with both: backing down in public costs war support -3':'No mediator: one rung down',0]);}}
  else if(act==='war'){if(!war&&!al&&gescOf(a,b)<2)W.push(['No red line declared: a surprise attack, every nation\'s opinion of you -10',-10]);if(war)no('Already at war');else if(al)no('Break the alliance first');else if(gdTruce(a,b))no('Truce until '+grMonStr(GC.tr[grWk(a,b)]));
    else if(GC.ph!=='plan')no('Wait for the planning phase');if(gclJust(a,b))W.push(['Casus belli: your claim on '+gclList(a,b).map(x=>GCM.P[x[1]].n).join(', '),0]);else{W.push(['No casus belli: every nation\'s opinion of you -8, alarm +'+GCL_UNJUST_AE,0]);W.push(['Press a claim first to justify it',0]);}}
  else if(act==='peace'){if(!war)no('Not at war');const s=gdWarscore(a,b);W.push(['War score (battles, occupied land, blockades, the war aim)',s]);
    W.push(['Opens the peace-deal screen: war score buys provinces, tribute or a vassal',0]);}
  else if(act==='guarantee'){cost=300;if(war)no('At war');else if(GC.gu&&GC.gu.some(g=>g[0]===a&&g[1]===b))no('Already guaranteed');W.push(['Costs $300, +15 opinion, shows resolve',0]);}
  else if(act==='cyber'){cost=GPX_CYBER_COST;if(al)no('Allied: no hacking allies');else if(GC.cyT&&GC.turn-(GC.cyT[grWk(a,b)]??-99)<GPX_CYBER_CD)no('Cooling down: next strike in '+(GPX_CYBER_CD-(GC.turn-GC.cyT[grWk(a,b)]))+' month(s)');W.push(['Costs $'+GPX_CYBER_COST+'; their banks lose $'+GPX_CYBER_HIT+' this month',0]);W.push(['Attribution in 1 of 4 strikes: everyone\'s opinion of you -10, theirs -20 more',0]);}
  else if(act==='proxy'){cost=GPX_COST;if(war)no('At war');else if(al)no('Allied: no need for a proxy');else if(gpxHas(a,b))no('Already funded');W.push(['Costs $'+GPX_COST+' a month for 12 months, plus $'+GPX_SEC+' security costs to them',0]);W.push(['Starts as funds only (change to arms and advisers in Subjects): each month a few percent chance it is traced back (their opinion of you -30, everyone else -5, trade losses); the militia drifts out of your control and a rival can buy it',0]);}
  else if(act==='break'){if(!al)no('Not allied');else if(typeof grInResBloc==='function'&&grInResBloc(a,b))no('The Resistance bloc is permanent while the Ayatollah leads it');W.push(['Opinion -25',0]);}
  if(typeof grOverlord==='function'&&ok){const ov=grOverlord(a);if(ov&&(act==='war'||act==='alliance'||act==='guarantee'||act==='peace'||act==='break'))no('Your overlord, '+GCM.nats.get(ov).name+', decides this');const sv=grOverlord(b);if(act==='break'&&sv===a)no(GCM.nats.get(b).name+' is your vassal');if(act==='war'&&sv)no(GCM.nats.get(b).name+' is a vassal of '+GCM.nats.get(sv).name+' — declare war on its overlord');}
  if(cost&&cash<cost&&ok)no('Not enough cash ($'+cost+')');
  if(GC.me!==a)no('Only your own nation acts');
  return {ok,why:W,cost,note};}
function gdAct(act,a,b){const c=gdChance(act,a,b);if(!c.ok)return c.note;const N=GC.nat[a],na=GCM.nats.get(a).name,nb=GCM.nats.get(b).name;N.cash-=c.cost;
  if(act==='improve'){gdRel(a,b,10);}
  else if(act==='aid'){gdRel(a,b,20);grLog(na+' sent aid to '+nb+'.',a);}
  else if(act==='proxy'){gpxStart(a,b);}
  else if(act==='cyber'){gpxCyber(a,b);}
  else if(act==='guarantee'){GC.gu=GC.gu||[];GC.gu.push([a,b]);gdRel(a,b,15);grLog(na+' guarantees the independence of '+nb+'.',a);}
  else if(act==='alliance'){GC.alz=GC.alz||[];const g=GC.alz.find(x=>x[1].includes(a));if(g&&!g[1].includes(b))g[1].push(b);else if(!g)GC.alz.push([na+'–'+nb+' Pact',[a,b]]);gdRel(a,b,15);grLog(na+' and '+nb+' formed an alliance.',a);}
  else if(act==='break'){for(const g of GC.alz||[])if(g[1].includes(a)&&g[1].includes(b))g[1]=g[1].filter(x=>x!==b);GC.alz=(GC.alz||[]).filter(x=>x[1].length>1);gdRel(a,b,-25);grLog(na+' left its alliance with '+nb+'.',a);}
  else if(act==='claim'){const e=gclFab(a,b);if(e)return e;}
  else if(act==='warn'&&grAtWar(a,b)){N.cash+=c.cost;const e=gescNAlert(a,b);if(e)return e;}
  else if(act==='warn'){N.cash+=c.cost;gescUp(a,b);}
  else if(act==='deesc'&&grAtWar(a,b)){N.cash+=c.cost;const e=gescLimit(a,b);if(e)return e;}
  else if(act==='deesc'){N.cash+=c.cost;const e=gescDown(a,b);if(e)return e;}
  else if(act==='war'){const j=gclJust(a,b);grDeclare(a,b);for(const o of Object.keys(GC.nat))if(o!==a&&o!==b)gdRel(a,o,j?-1:-8);if(!j)N.ae=(N.ae||0)+GCL_UNJUST_AE;gdRel(a,b,-30);}
  else if(act==='peace'){delete GC.war[grWk(a,b)];GC.tr=GC.tr||{};GC.tr[grWk(a,b)]=GC.turn+6;grLog('Peace between '+na+' and '+nb+' — truce for 6 months.',a);}
  try{grSave();}catch(e){}try{grandMapRefresh();}catch(e){}return '';}
// ---------- UI: replaces the Diplomacy tab of the nation panel ----------
(function(){
const chip=(c,onc)=>{const n=grNat(c),d=document.createElement('span');d.title=GCM.nats.get(c).name;d.style.cssText='display:inline-flex;align-items:center;gap:5px;margin:2px 4px 2px 0;padding:2px 7px 2px 3px;border:1px solid #3d5a73;border-radius:4px;background:#16273a;font-size:13px;cursor:pointer';
  d.innerHTML='<span style="width:18px;height:12px;border:1px solid #fff;background:'+n.color+'"></span>'+GCM.nats.get(c).name;d.onclick=onc;return d;};
const sel=c=>{GD.sel=c;npDraw();};
const col=v=>v>=25?'#9fe39f':v<=-25?'#ff9d8e':'#e8e4d8';
const ACTS=[['improve','Improve relations'],['aid','Send aid'],['claim','Press a claim'],['alliance','Propose alliance'],['guarantee','Guarantee'],['peace','Offer peace'],['break','Leave alliance'],['proxy','Arm a proxy militia'],['cyber','Cyber strike on banks'],['warn','Escalate'],['deesc','Step back'],['war','Declare war']];
npTab('dip','🤝','Diplomacy',(code,body)=>{const me=GC.me;if(!GD.sel||GD.sel===code||!GC.nat[GD.sel])GD.sel=Object.keys(GC.nat).find(c=>c!==code&&!GC.nat[c].dead&&grNat(c).major)||'';
  const row=(t,L)=>{const d=document.createElement('div');d.style.cssText='margin-bottom:4px';d.innerHTML='<span style="display:inline-block;width:92px;opacity:.7;font-size:13px">'+t+'</span>';if(!L.length)d.innerHTML+='<span style="opacity:.4">—</span>';for(const c of L)d.appendChild(chip(c,()=>sel(c)));return d;};
  const top=document.createElement('div');top.style.cssText='margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #2c4258';
  const gu=(GC.gu||[]).filter(g=>g[0]===code).map(g=>g[1]),gb=(GC.gu||[]).filter(g=>g[1]===code).map(g=>g[0]);
  const tr=Object.keys(GC.tr||{}).filter(k=>GC.tr[k]>GC.turn&&k.split('|').includes(code)).map(k=>k.split('|').find(x=>x!==code));
  top.appendChild(row('Enemies',gdEnemies(code)));top.appendChild(row('Allies',gdAllies(code)));top.appendChild(row('Guarantees',gu));top.appendChild(row('Guaranteed by',gb));top.appendChild(row('Truces',tr));body.appendChild(top);
  const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap';body.appendChild(wrap);
  const L=document.createElement('div');L.style.cssText='flex:1.1;min-width:300px';wrap.appendChild(L);const R=document.createElement('div');R.style.cssText='flex:1;min-width:300px';wrap.appendChild(R);
  const bar=document.createElement('div');bar.style.cssText='display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;align-items:center';
  const mk=(lab,cur,set,opts)=>{for(const [k,n] of opts){const b=document.createElement('button');b.type='button';b.textContent=n;b.style.cssText='padding:3px 9px;border-radius:12px;border:1px solid '+(cur===k?'#c9a35a':'#34506a')+';background:'+(cur===k?'#2a3a4c':'#15222f')+';color:#dfe8f0;cursor:pointer;font-size:13px';b.onclick=()=>{set(k);npDraw();};bar.appendChild(b);}};
  mk('f',GD.flt,k=>GD.flt=k,[['all','All'],['near','Neighbors'],['war','At war'],['ally','Allies'],['great','Great powers']]);
  {const wb=document.createElement('button');wb.type='button';wb.textContent='Web ◎';wb.title='Who is allied or at war with whom';wb.style.cssText='padding:3px 9px;border-radius:12px;border:1px solid #5b8bb0;background:#15222f;color:#9ec8ff;cursor:pointer;font-size:13px';wb.onclick=()=>{if(typeof gwebOpen==='function')gwebOpen();};bar.appendChild(wb);}
  const q=document.createElement('input');q.placeholder='Search…';q.value=GD.q;q.style.cssText='padding:3px 8px;border-radius:12px;border:1px solid #34506a;background:#0f1a26;color:#e8e4d8;font-size:13px;width:110px';q.oninput=()=>{GD.q=q.value;lst();};bar.appendChild(q);
  const so=document.createElement('button');so.type='button';so.textContent='Sort: '+(GD.sort==='op'?'opinion':GD.sort==='pw'?'power':'name');so.style.cssText='padding:3px 9px;border-radius:12px;border:1px solid #34506a;background:#15222f;color:#dfe8f0;cursor:pointer;font-size:13px';so.onclick=()=>{GD.sort=GD.sort==='op'?'pw':GD.sort==='pw'?'nm':'op';npDraw();};bar.appendChild(so);L.appendChild(bar);
  const box=document.createElement('div');box.style.cssText='max-height:340px;overflow:auto;border:1px solid #2c4258;border-radius:6px';L.appendChild(box);
  function lst(){box.innerHTML='';let cs=Object.keys(GC.nat).filter(c=>c!==code&&!GC.nat[c].dead&&(grNat(c).major||GD.flt!=='all'||GD.q));
    if(GD.flt==='near')cs=cs.filter(c=>{try{return gdNear(code,c);}catch(e){return false;}});if(GD.flt==='war')cs=cs.filter(c=>grAtWar(code,c));if(GD.flt==='ally')cs=cs.filter(c=>grAllied(code,c));if(GD.flt==='great')cs=cs.filter(c=>/power/.test(grRealClass(c))&&!/Small|Regional/.test(grRealClass(c)));
    const q2=GD.q.trim().toLowerCase();if(q2)cs=cs.filter(c=>GCM.nats.get(c).name.toLowerCase().includes(q2));
    const pw=c=>npStat(c).army;cs.sort((x,y)=>GD.sort==='op'?gdOp(code,y)-gdOp(code,x):GD.sort==='pw'?pw(y)-pw(x):GCM.nats.get(x).name.localeCompare(GCM.nats.get(y).name));
    for(const c of cs.slice(0,60)){const o1=gdOp(code,c),o2=gdOp(c,code),r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:8px;padding:4px 8px;cursor:pointer;border-bottom:1px solid #1d3042;'+(GD.sel===c?'background:#2a3a4c':'');
      r.innerHTML='<span style="width:20px;height:13px;border:1px solid #fff;background:'+grNat(c).color+'"></span><span style="flex:1"><b>'+GCM.nats.get(c).name+'</b> <span style="opacity:.55;font-size:12px">'+grRealClass(c)+'</span></span>'+(grAtWar(code,c)?'<span style="color:#ff9d8e;font-size:12px">war</span>':grAllied(code,c)?'<span style="color:#9fe39f;font-size:12px">ally</span>':'')+'<b title="Their opinion of you" style="color:'+col(o1)+';min-width:34px;text-align:right">'+(o1>0?'+':'')+o1+'</b>';
      r.onclick=()=>sel(c);box.appendChild(r);}
    if(!cs.length)box.innerHTML='<div style="padding:10px;opacity:.6">No nation matches.</div>';}
  lst();
  const t=GD.sel;if(!t){R.textContent='Select a nation.';return;}
  R.innerHTML='<div style="font-size:19px;font-weight:bold;margin-bottom:2px">'+GCM.nats.get(t).name+'</div><div style="opacity:.75;font-size:13px;margin-bottom:6px">'+grRealClass(t)+' · opinion of '+GCM.nats.get(code).name+' <b style="color:'+col(gdOp(t,code))+'">'+gdOp(t,code)+'</b></div>';
  const ws=gdWhy(t,code),wl=document.createElement('div');wl.style.cssText='font-size:13px;margin-bottom:8px;line-height:1.5';for(const [x,v] of ws)wl.innerHTML+='<div><b style="color:'+(v>0?'#9fe39f':v<0?'#ff9d8e':'#aaa')+';display:inline-block;width:34px">'+(v>0?'+':'')+v+'</b>'+x+'</div>';if(!ws.length)wl.innerHTML='<div style="opacity:.5">No history yet.</div>';R.appendChild(wl);
  {const lv=gescWarOf(code,t);if(lv>0){const d=document.createElement('div');d.style.cssText='font-size:13px;margin-bottom:8px';d.title='The ladder: '+GESC_R.join(' → ');d.innerHTML='<span style="opacity:.7">'+(lv>=4?'War level':'Crisis level')+'</span> <b style="color:'+(lv>=6?'#ff9d8e':'#f0c674')+'">'+GESC_R[lv]+'</b>'+(((GC.esc[grWk(code,t)]||{}).lim|0)>GC.turn?' <span style="opacity:.6">· limits agreed until '+grMonStr(GC.esc[grWk(code,t)].lim)+'</span>':'');R.appendChild(d);}}
  if(code!==me||GC.me===t){const n=document.createElement('div');n.style.cssText='opacity:.6;font-size:13px';n.textContent=code!==me?'Open your own panel to act.':'';R.appendChild(n);return;}
  const ab=document.createElement('div');ab.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
  for(const [k,n] of ACTS){const ch=gdChance(k,me,t);if(!ch.ok&&/^(Not allied|Not at war|Already)/.test(ch.note))continue;const b=document.createElement('button');b.type='button';b.textContent=n;
    b.title=ch.why.map(w=>(w[1]>0?'+':'')+(w[1]||'')+' '+w[0]).join('\n')+(ch.ok?'':'\n✖ '+ch.note);
    b.style.cssText='padding:5px 11px;border-radius:6px;border:1px solid '+(ch.ok?(k==='war'?'#b5605a':'#7aa84f'):'#3d4a58')+';background:#16273a;color:'+(ch.ok?'#fff':'#7d8794')+';cursor:pointer;font-size:14px';
    b.onclick=()=>{const e=gdAct(k,me,t);const m=document.createElement('div');m.style.cssText='margin-top:8px;font-size:13px;color:#ffb3a8';if(e){m.textContent=e;R.appendChild(m);}else npDraw();};ab.appendChild(b);}
  R.appendChild(ab);const hint=document.createElement('div');hint.style.cssText='margin-top:8px;font-size:12px;opacity:.55';hint.textContent='Hover a button to see the chance and why. Answers are fixed by the numbers — no dice.';R.appendChild(hint);});
})();
