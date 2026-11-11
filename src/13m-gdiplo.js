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
function gdWarscore(a,b){let s=0;const k=grWk(a,b);const t=GC.turn-((GC.wsT&&GC.wsT[k])||1);
  for(const ar of GC.armies){if(ar.fl)continue;if(ar.o===a&&GC.prov[ar.at]&&GC.prov[ar.at].o===b)s+=12;if(ar.o===b&&GC.prov[ar.at]&&GC.prov[ar.at].o===a)s-=12;}
  s+=Math.min(30,t*2);return s;}
// chance(action,a,b) -> {ok:bool, why:[[text,v]], cost, note}  (a = actor, b = target)
// ESCALATION LADDER (queue "Escalation ladder", slice 1: the rungs between peace and war). One crisis level per pair of nations, GC.esc[grWk(a,b)]={r,by,t,st:{}}:
//   0 Normal relations · 1 Public warning · 2 Red line declared · 3 Forces on alert ($GESC_ALERT a month for both sides; a side that cannot pay stands down to rung 2). Each step up: opinion -8, the target's public rallies (+2 war support).
//   Declaring war below rung 2 is a surprise attack: every other nation's opinion of the attacker -10 and the defender rallies (+6). At rung 2-3 the war was signalled: no extra penalty.
//   Off-ramps (gescDown): with a mediator (a major at peace with both and on good terms, found automatically; $GESC_MED, mediator gains +5 with both) the crisis steps down two rungs with no loss of face;
//   without one, the side that staked its word (st) backs down in public: war support -3, the other side +2. A crisis nobody touches for 12 months cools one rung.
//   AI: majors escalate against a hostile rival rarely (GESC_AI_P a month); AI wars now climb the ladder first (gescGate: warn, red line, then war), so wars are rarer and seen coming;
//   two nuclear-armed nations stop at the red line and go to war only at GESC_NUKE_P a month (deterrence). An AI that is warned answers by strength: holds firm, counter-escalates, or backs down.
//   Real base rates and sources: orch/REAL-2026.md "Escalation ladder". Deterministic (seed + turn); saved with GC.
const GESC_R=['Normal relations','Public warning','Red line declared','Forces on alert'];
const GESC_ALERT=150,GESC_MED=100,GESC_AI_P=.02,GESC_NUKE_P=.01,GESC_COOL=12;
function gescS(){return GC.esc||(GC.esc={});}
function gescOf(a,b){const e=GC&&GC.esc&&GC.esc[grWk(a,b)];return e?e.r:0;}
function gescWs(c,d){if(typeof wsN==='function'){const N=wsN(c);if(N)N.wsE+=d;}}
function gescUp(a,b){if(!GC||a===b||!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead||grAtWar(a,b)||grAllied(a,b))return false;const S=gescS(),k=grWk(a,b);const e=S[k]||(S[k]={r:0,by:'',t:0,st:{}});if(e.r>=3)return false;
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
function gescMonth(){if(!GC||!GC.nat)return;const S=gescS(),R=grRng((GC.seed|0)*389+GC.turn*23);
  for(const k of Object.keys(S).sort()){const e=S[k],[a,b]=k.split('|');if(!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead||grAtWar(a,b)||grAllied(a,b)){delete S[k];continue;}
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
  else if(act==='warn'){const r=gescOf(a,b);if(war)no('At war');else if(al)no('Allied');else if(r>=3)no('Already at the top rung short of war');W.push(['Now: '+GESC_R[r]+(r<3?' → next: '+GESC_R[r+1]:''),0]);W.push(['Their opinion of you -8; their public rallies; your word is at stake',-8]);if(r===2)W.push(['Forces on alert cost both sides $'+GESC_ALERT+' a month',0]);W.push(['A war after a red line is not a surprise attack (no -10 opinion everywhere)',0]);}
  else if(act==='deesc'){const r=gescOf(a,b);if(r<1)no('Already calm: no crisis with them');else{const m=gescMediator(a,b);if(m){cost=GESC_MED;W.push([gdN(m)+' mediates: two rungs down, nobody loses face',0]);}else W.push([(GC.esc[grWk(a,b)].st||{})[a]?'No mediator on good terms with both: backing down in public costs war support -3':'No mediator: one rung down',0]);}}
  else if(act==='war'){if(!war&&!al&&gescOf(a,b)<2)W.push(['No red line declared: a surprise attack, every nation\'s opinion of you -10',-10]);if(war)no('Already at war');else if(al)no('Break the alliance first');else if(gdTruce(a,b))no('Truce until '+grMonStr(GC.tr[grWk(a,b)]));
    else if(GC.ph!=='plan')no('Wait for the planning phase');if(gclJust(a,b))W.push(['Casus belli: your claim on '+gclList(a,b).map(x=>GCM.P[x[1]].n).join(', '),0]);else{W.push(['No casus belli: every nation\'s opinion of you -8, alarm +'+GCL_UNJUST_AE,0]);W.push(['Press a claim first to justify it',0]);}}
  else if(act==='peace'){if(!war)no('Not at war');const s=gdWarscore(a,b);W.push(['War score (armies on enemy land, war length)',s]);
    W.push(['Opens the peace-deal screen: war score buys provinces, tribute or a vassal',0]);}
  else if(act==='guarantee'){cost=300;if(war)no('At war');else if(GC.gu&&GC.gu.some(g=>g[0]===a&&g[1]===b))no('Already guaranteed');W.push(['Costs $300, +15 opinion, shows resolve',0]);}
  else if(act==='cyber'){cost=GPX_CYBER_COST;if(al)no('Allied: no hacking allies');else if(GC.cyT&&GC.turn-(GC.cyT[grWk(a,b)]??-99)<GPX_CYBER_CD)no('Cooling down: next strike in '+(GPX_CYBER_CD-(GC.turn-GC.cyT[grWk(a,b)]))+' month(s)');W.push(['Costs $'+GPX_CYBER_COST+'; their banks lose $'+GPX_CYBER_HIT+' this month',0]);W.push(['Attribution in 1 of 4 strikes: everyone\'s opinion of you -10, theirs -20 more',0]);}
  else if(act==='proxy'){cost=GPX_COST;if(war)no('At war');else if(al)no('Allied: no need for a proxy');else if(gpxHas(a,b))no('Already funded');W.push(['Costs $'+GPX_COST+' a month for 12 months, plus $'+GPX_SEC+' security costs to them',0]);W.push(['Each month a 6% chance it is traced back: their opinion of you -30, everyone else -5',0]);}
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
  else if(act==='warn'){N.cash+=c.cost;gescUp(a,b);}
  else if(act==='deesc'){N.cash+=c.cost;const e=gescDown(a,b);if(e)return e;}
  else if(act==='war'){const j=gclJust(a,b);grDeclare(a,b);GC.wsT=GC.wsT||{};GC.wsT[grWk(a,b)]=GC.turn;for(const o of Object.keys(GC.nat))if(o!==a&&o!==b)gdRel(a,o,j?-1:-8);if(!j)N.ae=(N.ae||0)+GCL_UNJUST_AE;gdRel(a,b,-30);}
  else if(act==='peace'){delete GC.war[grWk(a,b)];GC.tr=GC.tr||{};GC.tr[grWk(a,b)]=GC.turn+6;grLog('Peace between '+na+' and '+nb+' — truce for 6 months.',a);}
  try{grSave();}catch(e){}try{grandMapRefresh();}catch(e){}return '';}
// ---------- UI: replaces the Diplomacy tab of the nation panel ----------
(function(){
const chip=(c,onc)=>{const n=grNat(c),d=document.createElement('span');d.title=GCM.nats.get(c).name;d.style.cssText='display:inline-flex;align-items:center;gap:5px;margin:2px 4px 2px 0;padding:2px 7px 2px 3px;border:1px solid #3d5a73;border-radius:4px;background:#16273a;font-size:13px;cursor:pointer';
  d.innerHTML='<span style="width:18px;height:12px;border:1px solid #fff;background:'+n.color+'"></span>'+GCM.nats.get(c).name;d.onclick=onc;return d;};
const sel=c=>{GD.sel=c;npDraw();};
const col=v=>v>=25?'#9fe39f':v<=-25?'#ff9d8e':'#e8e4d8';
const ACTS=[['improve','Improve relations'],['aid','Send aid'],['claim','Press a claim'],['alliance','Propose alliance'],['guarantee','Guarantee'],['peace','Offer peace'],['break','Leave alliance'],['proxy','Arm a proxy militia'],['cyber','Cyber strike on banks'],['warn','Escalate (warn · red line · alert)'],['deesc','Step back from the crisis'],['war','Declare war']];
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
  mk('f',GD.flt,k=>GD.flt=k,[['all','All'],['near','Neighbours'],['war','At war'],['ally','Allies'],['great','Great powers']]);
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
  if(code!==me||GC.me===t){const n=document.createElement('div');n.style.cssText='opacity:.6;font-size:13px';n.textContent=code!==me?'Open your own panel to act.':'';R.appendChild(n);return;}
  const ab=document.createElement('div');ab.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
  for(const [k,n] of ACTS){const ch=gdChance(k,me,t);if(!ch.ok&&/^(Not allied|Not at war|Already)/.test(ch.note))continue;const b=document.createElement('button');b.type='button';b.textContent=n;
    b.title=ch.why.map(w=>(w[1]>0?'+':'')+(w[1]||'')+' '+w[0]).join('\n')+(ch.ok?'':'\n✖ '+ch.note);
    b.style.cssText='padding:5px 11px;border-radius:6px;border:1px solid '+(ch.ok?(k==='war'?'#b5605a':'#7aa84f'):'#3d4a58')+';background:#16273a;color:'+(ch.ok?'#fff':'#7d8794')+';cursor:pointer;font-size:14px';
    b.onclick=()=>{const e=gdAct(k,me,t);const m=document.createElement('div');m.style.cssText='margin-top:8px;font-size:13px;color:#ffb3a8';if(e){m.textContent=e;R.appendChild(m);}else npDraw();};ab.appendChild(b);}
  R.appendChild(ab);const hint=document.createElement('div');hint.style.cssText='margin-top:8px;font-size:12px;opacity:.55';hint.textContent='Hover a button to see the chance and why. Answers are fixed by the numbers — no dice.';R.appendChild(hint);});
})();
