// ===== 13a-gwar: battles, sieges and sea fights resolved ON the campaign map, day by day (prefix gw*) =====
// Abdullah 2026-11-11 23:57 "Abandon battles in grand campaign. Turn it into eu 4 rules" (23:58 "No and now"): the grand
// campaign never opens the real-time battle. This file is the ONE resolver for every land, sea and air fight (orch/SYSTEMS.md
// "Campaign battles"). Rules and ideas in the style of Europa Universalis IV,
// translated to 2026 - no text, names, art or layouts are taken from that game.
//
// BATTLE  Armies at war in one province fight for DAYS on the campaign clock; the map keeps running. Days alternate in
//   three-day phases: FIRES (artillery, rockets, air, drones, missiles) then ASSAULT (maneuver and close combat). At the start
//   of each phase both sides roll one die (0-9, seeded) and add: the general's skill for that phase, terrain for the defender
//   (mountains, urban, jungle, snow, river crossing, landing from the sea, fort guns), supply, air sorties, one-way drones,
//   leaders, war support. COMBAT WIDTH (by terrain) limits how many units fight; a support row of long-range and air units
//   fires from behind; the rest are reserves that fill gaps. The side with more fast units outflanks a front that is narrower.
//   Each day both sides lose strength and MORALE from: roll x fighting strength x quality x discipline. Unit strength is the
//   existing unit value (grUnitVal: price, health, rank, ammunition) and the roles come from the existing unit stats (range,
//   speed, armor, domain) - there is no second stat table.
//   A side whose morale reaches zero falls back to a friendly neighbor (a shattered retreat if it broke in the first days);
//   hopelessly outnumbered with broken morale = destroyed. ZEALOUS nations never break: they fight on at heavier losses
//   until destroyed or the enemy leaves (msOf(..).rout===0). The other styles keep their MSTYLES thresholds.
// SIEGE   A province with a fort, a Mountain Fortress or a nation's own capital cannot be taken by walking in. The
//   garrison stays behind the walls; the besieger needs enough troops, and every 10 days rolls 1-14 for progress and adds: supplies running
//   out inside, breaches, artillery, blockade, air strikes, the general's siege skill, minus 3 per fort level; 14 or more ends it. Assault = costly shortcut.
// SEA     Fleets in one sea zone fight the same way (no terrain; hidden submarines and home waters help the defender).
//   Troops caught at sea without an escort are sunk.
// Deterministic: every draw comes from grRng(campaign seed, battle id, day). State lives in the campaign save:
//   GC.bt battles, GC.sg sieges, GC.bid next id, GC.bd battle days already run this month, GC.br recent results, army.bt.
// Open (noted for later): zones of control around forts, strait crossings (no land-land strait edges on the map yet).
const GW_W={f:20,d:20,r:18,c:16,s:14,j:12,u:12,m:10,w:16};   /* combat width by terrain (units in the front line) */
const GW_TB={m:2,u:1,j:1,s:1};                               /* defender's die bonus by terrain */
const GW_TN={m:'Mountains',u:'Urban ground',j:'Jungle',s:'Snow and tundra'};
const GW_SLOT=300;                                           /* one place in the line = this much unit price, so cheap and costly armies field equal fronts */
const GW_K=.05,GW_MK=3.4,GW_MINDAY=6,GW_SG_DAYS=10,GW_WIPE=1/6,GW_LAST=2.6,GW_LASTX=3,GW_SG_WIN=14;
const GW_PH=['Fires','Assault'];
const GW_RC={};
function gwS(){if(!GC.bt)GC.bt=[];if(!GC.sg)GC.sg=[];if(!GC.bid)GC.bid=1;if(!GC.br)GC.br=[];if(GC.bd===undefined)GC.bd=0;return GC;}
function gwRng(id,d,k){return grRng((GC.seed*7+id*7919+d*131+(k|0)*977)|0);}
/* a unit's role, read from its existing stats: long range or air = support row and strong in Fires; heavy armor = strong in Assault; fast = maneuver */
function gwRole(fac,k){const key=fac+'|'+k;let r=GW_RC[key];if(r)return r;let s=null;try{s=stats(fac,k);}catch(e){}s=s||{};
  const air=s.dom==='air',far=(s.rng||0)>=300,heavy=s.armor==='heavy',aa=s.ground===false,nav=s.dom==='naval',no=!!s.noAttack;
  r={f:no?0:aa?.3:air?1.3:far?1.6:heavy?.8:.6,a:no?0:aa?.3:far?.4:air?.9:heavy?1.4:1,mv:!far&&!aa&&!no&&(s.spd||0)>=55?1:0,back:(far||air||aa)&&!nav?1:0,aa:aa||k==='aa'?1:0,air:air?1:0,nav:nav?1:0,arty:far&&!air&&!aa&&!nav?1:0};
  return GW_RC[key]=r;}
function gwZeal(nat){try{return msOf(grNat(nat).fac).rout===0;}catch(e){return false;}}
function gwMS(nat){try{return msOf(grNat(nat).fac)||{};}catch(e){return {};}}
function gwStyle(nat){try{return MORALE_STYLE[grNat(nat).fac]||'home';}catch(e){return 'home';}}
function gwBattleAt(pi){return gwS().bt.find(B=>B.p===pi)||null;}
function gwSiegeAt(pi){return gwS().sg.find(S=>S.p===pi)||null;}
function gwOf(a){return a&&a.bt?gwS().bt.find(B=>B.id===a.bt)||null:null;}
/* is this army tied down (fighting, or part of a siege)? AI planners and the move phase leave it alone */
function gwBusy(a){if(!a)return false;if(a.bt&&gwOf(a))return true;const S=!a.fl&&gwSiegeAt(a.at);return !!(S&&gwBesiegers(S).includes(a));}
/* fort level of a province: a fort 1 (two or more intact forts 2), Mountain Fortress +2, a nation's own capital +1 (defended in depth), 3 at most */
function gwFort(pi){const p=GCM.P[pi],st=GC.prov[pi];if(!p||!p.land||!st)return 0;let L=0;try{const f=geEff(pi,'fort');if(f>.05)L+=1;if(f>=2)L+=1;if(geEff(pi,'mfort')>.05)L+=2;}catch(e){}
  const N=GC.nat[st.o];if(N&&N.cap===pi&&st.o0===st.o)L+=1;return Math.min(3,L);}
/* the two sides as unit groups; sim = work on copies (odds preview), never touching the campaign */
function gwCtx(B,sim){const mk=side=>grSideUnits(B,side).map(s=>({fac:s.fac,u:sim?s.u.map(r=>r.slice()):s.u,arr:s.arr,nat:s.arr?s.arr.o:GC.prov[B.p].o}));return {A:mk('att'),D:mk('def'),sim:!!sim};}
function gwVal(L){let v=0;for(const g of L)v+=grForce(g.fac,g.u);return v;}
function gwCount(L){let n=0;for(const g of L)n+=g.u.length;return n;}
/* who stands in the line today: front row (up to the combat width), support row behind it, the rest in reserve.
   The width is counted in unit price (GW_SLOT per place), so an army of many cheap units and one of few costly units put the same weight in the line. */
function gwLine(L,B,isDef){const sea=!!B.sea,W=GW_W[GCM.P[B.p].t]||16,cap=W*GW_SLOT*(sea?3:1),fr=[],bk=[];let n=0,mv=0,aa=0,nav=0,val=0;
  L.forEach((g,gi)=>{let gm=1;try{if(g.arr){const q=gmilGen(g.arr);gm=gmilMul(g.arr,isDef?1:0)/(q?1+.025*q.lv:1)*(1+.08*((g.arr.dr||0)/100));}}catch(e){}   /* the general's trait and the army's drill; his level counts on the die (gwPips), not twice */
    g.u.forEach((r,i)=>{const ro=gwRole(g.fac,r[0]);n++;if(sea&&!ro.nav)return;if(ro.nav)nav++;const v=grUnitVal(g.fac,r)*gm;val+=v;if(ro.mv)mv++;if(ro.aa)aa++;(ro.back?bk:fr).push({g,r,ro,v,gi,i,c:Math.max(50,grCost(g.fac,r[0]))});});});
  /* the line is a fair sample of the army: each kind is spread evenly through the order (tanks among the infantry, not all in front) */
  const mix=A=>{const n={},k={};for(const e of A)n[e.r[0]]=(n[e.r[0]]||0)+1;for(const e of A){k[e.r[0]]=(k[e.r[0]]||0)+1;e.o=(k[e.r[0]]-.5)/n[e.r[0]];}A.sort((x,y)=>x.o-y.o||y.c-x.c||x.gi-y.gi||x.i-y.i);};mix(fr);mix(bk);
  const fill=A=>{const o=[];let u=0;for(const e of A){if(u>=cap)break;o.push(e);u+=e.c;}return [o,u];};
  let [front,fu]=fill(fr),[back]=fill(bk);if(!front.length){front=back;back=[];fu=front.reduce((s,e)=>s+e.c,0);}
  return {front,back,n,mv,aa,nav,val,W,cap,fu,res:Math.max(0,fr.length+bk.length-front.length-back.length)};}
function gwPow(Ln,ph,foeAA){let p=0;const air=1-Math.min(.6,.12*foeAA),k=ph?'a':'f';for(const e of Ln.front)p+=e.v*e.ro[k]*(e.ro.air?air:1);for(const e of Ln.back)p+=e.v*e.ro[k]*(e.ro.air?air:1)*(ph?.5:1);return p;}
/* a general's skills 0-2 for Fires, Assault, Maneuver, Siege: from his level (0-4) and his trait - nothing new is stored, so old saves have them too */
function gwPips(g){if(!g)return [0,0,0,0];const t=[[0,1,1,0],[1,0,0,1],[0,0,1,1],[0,1,1,0]][g.tr|0]||[0,0,0,0];return t.map(x=>Math.min(2,Math.floor((g.lv|0)/2)+x));}
function gwLead(L){let best=null;for(const g of L){let q=null;try{q=gmilGen(g.arr);}catch(e){}if(q&&!q.st&&(!best||q.lv>best.lv||(q.lv===best.lv&&q.id<best.id)))best=q;}return best;}
function gwGenName(g){try{return gmilTitle(g)+' '+g.nm;}catch(e){return g?g.nm:'';}}
function gwAmmo(L){let s=0,n=0;for(const g of L){if(!g.arr)continue;for(const r of g.u){s+=r[3];n++;}}return n?s/n:100;}
function gwCut(L){let c=0,n=0;for(const g of L){if(!g.arr||g.arr.fl)continue;n+=g.u.length;let cut=g.arr.sup>0;try{if(!cut&&typeof gsupLine==='function'){const l=gsupLine(g.arr);cut=!!(l&&l.cut);}}catch(e){}if(cut)c+=g.u.length;}return n>0&&c*2>n;}
function gwFuel(L){let s=0,n=0;for(const g of L){if(!g.arr||g.arr.fl)continue;s+=(g.arr.fu===undefined?100:g.arr.fu)*g.u.length;n+=g.u.length;}return n?s/n:100;}
/* everything added to one side's die this phase, as [plain words, number] rows (the battle window lists them); real = spend the sorties and drones */
function gwMods(B,X,side,ph,real){const isDef=side==='def',L=isDef?X.D:X.A,F=isDef?X.A:X.D,nat=isDef?B.dn:B.an,foe=isDef?B.an:B.dn,p=GCM.P[B.p],st=GC.prov[B.p],M=[];
  const g=gwLead(L);if(g){const v=gwPips(g)[ph];if(v)M.push([gwGenName(g)+' ('+GW_PH[ph].toLowerCase()+' skill)',v]);}
  if(B.sea){if(isDef){let m=0;try{m=Math.round((gmilSeaDef(B)-1)*8);}catch(e){}if(m>0)M.push(['Home waters and hidden submarines',Math.min(2,m)]);}
    /* at sea positioning takes the place of maneuver: the fleet with more fast craft gets the better position */
    const fc=Q=>{let n=0;for(const q of Q)for(const r of q.u){const ro=gwRole(q.fac,r[0]);if(ro.nav&&ro.mv)n++;}return n;};if(fc(L)>fc(F))M.push(['Better position (more fast craft)',1]);}
  else if(isDef&&!B.relief){const t=GW_TB[p.t]|0;if(t)M.push([GW_TN[p.t],t]);if(B.river)M.push(['Enemy crossing a river',1]);if(B.amph)M.push(['Enemy landing from the sea',2]);
    if(st&&st.o===nat&&gwFort(B.p)>0)M.push(['Fort guns',1]);}
  if(!B.sea){const am=gwAmmo(L);if(gwCut(L))M.push(['Cut off from supply',-3]);else if(am<35)M.push(['Ammunition nearly gone',-3]);else if(am<60)M.push(['Short of ammunition',-1]);
    if(ph===1&&gwFuel(L)<25)M.push(['Short of fuel',-1]);
    if(ph===0){let n=0;try{if(grHasKind(grNat(nat).fac,'jet'))n=Math.min(4,geSortieStock(nat,B.p,280));}catch(e){}
      if(n>0){let aa=0;for(const q of F)for(const r of q.u)if(gwRole(q.fac,r[0]).aa)aa++;try{if(st&&st.o!==nat&&grAtWar(nat,st.o)&&geEff(B.p,'aa')>0)n=Math.floor(n/2);}catch(e){}if(aa>=2)n--;
        if(n>0){M.push([n+' air sorties',n>=3?2:1]);if(real){try{const E=GC.nat[nat].e;E.fuel=Math.max(0,E.fuel-6*n);}catch(e){}}}}
      let dr=0;try{dr=gmilDrAvail(nat,B.p);}catch(e){}if(dr>=4){M.push(['One-way drone salvo',1]);if(real){try{const Q=gmilN(nat);Q.dr=Math.max(0,(Q.dr|0)-4);}catch(e){}}}
      if(gwStyle(nat)==='fire')M.push(['Heavy fire support',1]);}
    if(ph===1){let ld=false;try{ld=ldrFervour(nat,B.p);}catch(e){}if(ld)M.push(['The leader is with the troops',1]);}}
  try{const N=wsN(nat);if(N&&N.ws<25)M.push(['Low war support at home',-1]);}catch(e){}
  return M;}
/* nation-wide strength multipliers (doctrine, fire support, capital defended in depth) */
function gwNatMul(B,side,ph){const nat=side==='def'?B.dn:B.an;let m=1;try{m*=gmod('nation',nat,side==='def'?'defense':'attack',1);if(ph===0)m*=gmod('nation',nat,'fires',1);}catch(e){}
  if(side==='def'&&!B.sea){try{m*=1+grDepth(B.p,B.an,B.dn);}catch(e){}}return m;}
function gwMorMul(B,side,X){const nat=side==='def'?B.dn:B.an,s=gwStyle(nat),st=GC.prov[B.p];let m=s==='home'&&st&&(st.o===nat||st.o0===nat)?.9:1;
  let d=0,n=0;for(const g of (side==='def'?X.D:X.A)){if(g.arr){d+=(g.arr.dr||0)*g.u.length;}n+=g.u.length;}if(n)m*=1-.1*(d/n/100);return m;}
/* spread one day's damage (in unit value) over a row: half evenly (the same share of health for every unit), half on a few hard-hit units; units at 12% health or less are lost */
function gwHit(row,dmg,R,ph){if(!row.length||dmg<=0)return 0;let tc=0;for(const e of row)tc+=e.c;const even=100*dmg*.5/tc,nh=Math.max(1,Math.ceil(row.length/5)),hard=dmg*.5/nh,pick=new Set();
  for(let i=0;i<nh*3&&pick.size<nh;i++)pick.add(Math.floor(R()*row.length));let dead=0;
  row.forEach((e,i)=>{e.r[1]-=even+(pick.has(i)?100*hard/e.c:0);e.r[3]=Math.max(0,e.r[3]-(ph?1:2));e.r[2]+=3;
    if(e.r[1]<=12){const j=e.g.u.indexOf(e.r);if(j>=0)e.g.u.splice(j,1);dead++;}else e.r[1]=Math.round(e.r[1]*10)/10;});
  return dead;}
/* ONE DAY of one battle. Returns null (it goes on) or {win:'att'|'def',how}. R = seeded draw for this battle and day. */
function gwStep(B,X,R){B.d++;const ph=Math.floor((B.d-1)/3)%2;B.ph=ph;
  if(B.sea&&B.d===1){const na=gwLine(X.A,B,0).nav,nd=gwLine(X.D,B,1).nav;if(!na&&nd)return {win:'def',how:'sunk'};if(!nd&&na)return {win:'att',how:'sunk'};if(!na&&!nd)return {win:'def',how:'left'};}
  if((B.d-1)%3===0||!B.dice){B.dice=[Math.floor(R()*10),Math.floor(R()*10)];B.mo=[gwMods(B,X,'att',ph,!X.sim),gwMods(B,X,'def',ph,!X.sim)];
    B.rl=[0,1].map(i=>Math.max(0,B.dice[i]+B.mo[i].reduce((s,m)=>s+m[1],0)));}
  const LA=gwLine(X.A,B,0),LD=gwLine(X.D,B,1);
  if(!LA.n||(B.sea&&!LA.nav))return {win:'def',how:'wipe'};if(!LD.n||(B.sea&&!LD.nav))return {win:'att',how:'wipe'};
  let pa=gwPow(LA,ph,LD.aa)*gwNatMul(B,'att',ph),pd=gwPow(LD,ph,LA.aa)*gwNatMul(B,'def',ph);
  /* outflanking: the fuller line with more fast units wraps a front that cannot fill the width */
  B.fl=0;if(!B.sea){if(LD.fu<LD.cap*.85&&LA.fu>LD.fu*1.15&&LA.mv>LD.mv){pa*=1.2+.05*gwPips(gwLead(X.A))[2];B.fl=1;}else if(LA.fu<LA.cap*.85&&LD.fu>LA.fu*1.15&&LD.mv>LA.mv){pd*=1.2+.05*gwPips(gwLead(X.D))[2];B.fl=2;}   /* +20%, and 5% more per point of the general's Maneuver skill */}
  const floor=.004*Math.min(B.va0,B.vd0),za=gwZeal(B.an),zd=gwZeal(B.dn),sa=gwMS(B.an),sd=gwMS(B.dn);
  if(ph===0){pa*=sa.sup||1;pd*=sd.sup||1;}
  /* a Zealous side whose morale is spent makes its LAST STAND: it never leaves the field, hits harder, and is ground down where it stands */
  if(B.lsa)pa*=GW_LAST;if(B.lsd)pd*=GW_LAST;
  let dD=Math.max(floor,pa*GW_K*(3+B.rl[0])/7.5),dA=Math.max(floor,pd*GW_K*(3+B.rl[1])/7.5);
  /* once one side is making its last stand the other no longer wavers: it has won the field and is clearing it */
  if(!B.lsd)B.ma-=100*dA/Math.max(1,B.va0)*GW_MK*gwMorMul(B,'att',X);if(!B.lsa)B.md-=100*dD/Math.max(1,B.vd0)*GW_MK*gwMorMul(B,'def',X);
  dA*=(sa.taken||1)*(B.lsa?GW_LASTX:1);dD*=(sd.taken||1)*(B.lsd?GW_LASTX:1);
  if(za&&B.ma<=0){B.ma=0;B.lsa=1;}if(zd&&B.md<=0){B.md=0;B.lsd=1;}
  B.la+=gwHit(LA.front,dA*(LA.back.length?.85:1),R,ph)+gwHit(LA.back,dA*.15,R,ph);B.ld+=gwHit(LD.front,dD*(LD.back.length?.85:1),R,ph)+gwHit(LD.back,dD*.15,R,ph);
  B.ma=Math.round(B.ma*10)/10;B.md=Math.round(B.md*10)/10;
  if(!X.sim){for(const g of X.A.concat(X.D))if(g.arr)g.arr.fo=GC.turn;}   /* fought this month: burns extra fuel and ammunition (13zl-gsupply.js) */
  const va=gwVal(X.A),vd=gwVal(X.D),na=gwCount(X.A),nd=gwCount(X.D);B.va=Math.round(va);B.vd=Math.round(vd);
  if(!na&&!nd)return {win:'def',how:'wipe'};if(!na)return {win:'def',how:'wipe'};if(!nd)return {win:'att',how:'wipe'};
  /* who breaks: morale at zero, or (by morale style) too weak against what faces them. Zealous sides never break. */
  const thr=(nat,home)=>{try{const m=msOf(grNat(nat).fac);return m.rout===0?0:(home&&m.routHome!=null?m.routHome:(m.rout!=null?m.rout:.15));}catch(e){return .15;}};
  const st=GC.prov[B.p],bd=!zd&&(B.md<=0||vd<va*thr(B.dn,st&&st.o===B.dn)),ba=!za&&(B.ma<=0||va<vd*thr(B.an,false));
  if(ba&&bd&&B.md<B.ma)return {win:'att',how:B.d<=GW_MINDAY?'shatter':'rout'};   /* both lines give way on the same day: the one in worse shape leaves, the defender on a tie */
  if(ba)return {win:'def',how:(va<vd*GW_WIPE)?'wipe':B.d<=GW_MINDAY?'shatter':'rout'};
  if(bd)return {win:'att',how:(vd<va*GW_WIPE)?'wipe':B.d<=GW_MINDAY?'shatter':'rout'};
  return null;}
function gwMorOf(B,side){let w=0,m=0;for(const s of grSideUnits(B,side)){const n=Math.max(1,s.u.length);w+=n;let q=90;try{if(s.arr)q=gmMor(s.arr);}catch(e){}m+=n*q;}return w?m/w:90;}
/* a queue entry from the move phase (b = {p,an,dn,att,def,garr,river,mtn,sea}) becomes a running battle, joins the battle already there, or starts a siege */
function gwOpen(b){gwS();const P=GCM.P[b.p],ids=id=>GC.armies.find(a=>a.id===id);const ex=gwBattleAt(b.p);
  if(ex){for(const id of b.att.concat(b.def)){const a=ids(id);if(a&&!a.bt)gwJoin(ex,a);}b.done=1;return ex;}
  const fort=!b.sea?gwFort(b.p):0;if(fort>0)b.garr=false;
  b.att=b.att.filter(id=>{const a=ids(id);return a&&a.u.length&&!a.bt;});b.def=b.def.filter(id=>{const a=ids(id);return a&&a.u.length&&!a.bt;});
  if(!b.att.length){b.done=1;return null;}
  if(!b.def.length&&!b.garr){b.done=1;if(fort>0&&GC.prov[b.p]&&grAtWar(b.an,GC.prov[b.p].o))gwSiegeOpen(b.p,b.an);return null;}
  const B={id:GC.bid++,p:b.p,an:b.an,dn:b.dn,att:b.att.slice(),def:b.def.slice(),garr:!!b.garr,river:!!b.river,mtn:!!b.mtn,sea:!!b.sea,done:0,d:0,ph:0,t0:GC.turn,la:0,ld:0,fl:0};
  B.amph=!B.sea&&B.att.some(id=>{const a=ids(id);return a&&a.from>=0&&GCM.P[a.from]&&GCM.P[a.from].sea;})?1:0;
  const S=gwSiegeAt(b.p);B.relief=S&&B.def.some(id=>gwBesiegers(S).some(a=>a.id===id))?1:0;
  B.ma=Math.round(gwMorOf(B,'att'));B.md=Math.round(gwMorOf(B,'def'));B.ma0=B.ma;B.md0=B.md;
  const X=gwCtx(B,0);B.va0=Math.round(gwVal(X.A));B.vd0=Math.round(gwVal(X.D));B.va=B.va0;B.vd=B.vd0;B.na0=gwCount(X.A);B.nd0=gwCount(X.D);
  try{B.v0=geBV(B);}catch(e){B.v0=B.va0+B.vd0;}
  for(const id of B.att.concat(B.def)){const a=ids(id);if(a){a.bt=B.id;a.path=[];a.pg=0;}}
  GC.bt.push(B);b.done=1;if(GC.prov[b.p])GC.prov[b.p].hot=GC.turn;
  const me=GC.me&&(B.an===GC.me||B.dn===GC.me||X.A.concat(X.D).some(g=>g.arr&&g.arr.o===GC.me));
  grLog('Battle of '+P.n+': '+GCM.nats.get(B.an).name+' attacks '+GCM.nats.get(B.dn).name+'.',me?GC.me:B.an);return B;}
/* a fresh army reaches a running battle: it joins the side it is at war with the other of, on the day it arrives */
function gwJoin(B,a){if(!a.u.length||a.bt)return false;const hostA=grAtWar(a.o,B.an),hostD=grAtWar(a.o,B.dn);let side='';
  if((a.o===B.an||!hostA)&&hostD)side='att';else if((a.o===B.dn||!hostD)&&hostA)side='def';if(!side)return false;
  const v=grArmyVal(a),n=a.u.length;let m=90;try{m=gmMor(a);}catch(e){}
  if(side==='att'){B.ma=Math.round((B.ma*B.va+m*v)/Math.max(1,B.va+v));B.va0+=Math.round(v);B.na0+=n;B.att.push(a.id);}
  else{B.md=Math.round((B.md*B.vd+m*v)/Math.max(1,B.vd+v));B.vd0+=Math.round(v);B.nd0+=n;B.def.push(a.id);}
  B.v0=(B.v0||0)+v;a.bt=B.id;a.path=[];a.pg=0;
  grLog(a.nm+' ('+GCM.nats.get(a.o).name+') joins the battle of '+GCM.P[B.p].n+'.',a.o===GC.me||B.an===GC.me||B.dn===GC.me?GC.me:a.o);return true;}
/* keep the last results for the result cards; n = running number (cards show each result once) */
function gwCard(R){GC.brn=(GC.brn|0)+1;R.n=GC.brn;GC.br.push(R);if(GC.br.length>12)GC.br.shift();return R;}
function gwClose(B){const i=GC.bt.indexOf(B);if(i>=0)GC.bt.splice(i,1);for(const a of GC.armies)if(a.bt===B.id)a.bt=0;B.done=1;}
/* the battle is over: write morale back, record the result card, then the ONE settle (grSettle: retreats, logs, tradition, war support, generals, salvage) */
function gwEnd(B,win,how){const P=GCM.P[B.p],att=GC.armies.filter(a=>B.att.includes(a.id)),def=GC.armies.filter(a=>B.def.includes(a.id)),losers=win==='att'?def:att;
  for(const a of att)a.mor=Math.max(0,Math.min(gmMorMax(a),Math.round(B.ma)));for(const a of def)a.mor=Math.max(0,Math.min(gmMorMax(a),Math.round(B.md)));
  if(how==='wipe'||how==='sunk')for(const a of losers)a.u.length=0;
  const gen=side=>{const g=gwLead(grSideUnits(B,side));return g?gwGenName(g):'';};
  const R={id:B.id,p:B.p,pn:P.n,an:B.an,dn:B.dn,win,how,d:B.d,t:GC.turn,day:GC.bd|0,na0:B.na0,nd0:B.nd0,la:B.la,ld:B.ld,va0:B.va0,vd0:B.vd0,va:B.va|0,vd:B.vd|0,ga:gen('att'),gd:gen('def'),sea:B.sea?1:0,wa:[...new Set([B.an,...att.map(a=>a.o)])],who:[...new Set([B.an,B.dn,...att.map(a=>a.o),...def.map(a=>a.o)])]};
  if(how==='wipe'||how==='sunk'){if(win==='att')R.ld=B.nd0;else R.la=B.na0;}
  gwCard(R);
  gwClose(B);grSettle(B,win,how);
  if(how==='shatter')for(const a of losers){if(GC.armies.includes(a)){a.mor=0;for(const r of a.u)r[1]=Math.max(13,Math.round(r[1]*.9));}}
  gwScanAt(B.p);return R;}
/* the player (or a friend online) pulls one army out of a running battle - an order, not a rout; allowed once the lines have met for GW_MINDAY days */
function gwWithdraw(aid){const a=GC.armies.find(x=>x.id===aid);if(!a||a.o!==GC.me)return 'no army';const B=gwOf(a);if(!B)return 'This army is not in a battle.';
  if(B.d<GW_MINDAY)return 'The army is locked in combat: it can break contact in '+(GW_MINDAY-B.d)+' day'+(GW_MINDAY-B.d>1?'s':'')+'.';
  const isAtt=B.att.includes(a.id),to=a.fl?gmilFleetRetreat(a,B.p):(isAtt&&a.from>=0&&a.from!==B.p)?a.from:grRetreatTo(a,B.p);if(to<0)return 'There is no friendly province to fall back to.';
  if(isAtt)B.att=B.att.filter(i=>i!==a.id);else B.def=B.def.filter(i=>i!==a.id);a.bt=0;a.at=to;a.path=[];a.pg=0;a.sup=0;try{a.mor=Math.max(5,gmMor(a)-15);}catch(e){}
  grLog(a.nm+' withdrew from the battle of '+GCM.P[B.p].n+'.',a.o);
  const left=grSideUnits(B,isAtt?'att':'def').some(s=>s.u.length);if(!left)gwEnd(B,isAtt?'def':'att','retreat');return '';}
/* one day for every battle and siege (id order) */
function gwTick(){gwS();for(const B of GC.bt.slice().sort((x,y)=>x.id-y.id)){if(!GC.bt.includes(B))continue;
    if(!grAtWar(B.an,B.dn)){gwClose(B);grLog('The guns fall silent at '+GCM.P[B.p].n+': the war is over.',B.an);continue;}
    B.att=B.att.filter(id=>GC.armies.some(a=>a.id===id&&a.at===B.p&&a.u.length));B.def=B.def.filter(id=>GC.armies.some(a=>a.id===id&&a.at===B.p&&a.u.length));
    if(B.garr&&GC.prov[B.p]&&GC.prov[B.p].o!==B.dn)B.garr=false;
    if(!B.att.length){gwEnd(B,'def','left');continue;}if(!B.def.length&&!(B.garr&&GC.prov[B.p].gar.length)){gwEnd(B,'att','left');continue;}
    if(GC.prov[B.p])GC.prov[B.p].hot=GC.turn;const r=gwStep(B,gwCtx(B,0),gwRng(B.id,B.d+1,0));if(r)gwEnd(B,r.win,r.how);}
  for(const S of GC.sg.slice().sort((x,y)=>x.id-y.id))if(GC.sg.includes(S))gwSiegeDay(S);}
/* run the battle days of this month up to `day` (1..30): the real-time clock calls it as days pass, the month end catches up the rest */
function gwTo(day){gwS();day=Math.max(0,Math.min(30,day|0));while(GC.bd<day){GC.bd++;gwTick();}}
function gwMonthEnd(){gwTo(30);GC.bd=0;}
/* armies standing with an enemy and no fight going (a battle just ended, a war just began): start the battle or the siege */
function gwScanAt(pi){const P=GCM.P[pi];if(!P||gwBattleAt(pi))return;const here=GC.armies.filter(a=>a.at===pi&&a.u.length&&!a.bt).sort((x,y)=>x.id-y.id);if(!here.length)return;
  if(P.land){const st=GC.prov[pi],own=st.o,foes=here.filter(a=>!a.fl&&grAtWar(a.o,own));
    if(foes.length){const an=foes[0].o,att=foes.filter(a=>a.o===an||!grAtWar(a.o,an)),def=here.filter(a=>!att.includes(a)&&grAtWar(a.o,an));
      if(def.length||(st.gar.length&&!gwFort(pi))){gwOpen({p:pi,an,dn:def.length?(def.some(a=>a.o===own)?own:def[0].o):own,att:att.map(a=>a.id),def:def.map(a=>a.id),garr:st.gar.length>0,river:false,mtn:P.t==='m',sea:false,done:0});return;}
      if(gwFort(pi)>0&&!gwSiegeAt(pi))gwSiegeOpen(pi,an);return;}}
  for(const a of here){const def=here.filter(x=>x!==a&&grAtWar(x.o,a.o));if(!def.length)continue;if(!P.land&&!(a.fl||def.some(x=>x.fl)))continue;
    const att=here.filter(x=>x.o===a.o);gwOpen({p:pi,an:a.o,dn:def[0].o,att:att.map(x=>x.id),def:def.map(x=>x.id),garr:false,river:false,mtn:P.t==='m',sea:!P.land,done:0});return;}}
function gwScan(){const seen=new Set();for(const a of GC.armies.slice().sort((x,y)=>x.id-y.id)){if(seen.has(a.at))continue;seen.add(a.at);gwScanAt(a.at);}}

// ---------- sieges ----------
function gwBesiegers(S){const st=GC.prov[S.p];if(!st)return [];return GC.armies.filter(a=>a.at===S.p&&!a.fl&&a.u.length&&!a.bt&&grAtWar(a.o,st.o)).sort((x,y)=>x.id-y.id);}
function gwSiegeOpen(pi,an){gwS();let S=gwSiegeAt(pi);if(S)return S;const st=GC.prov[pi];S={id:GC.bid++,p:pi,an,dn:st.o,d:0,nx:GW_SG_DAYS,st:0,br:0,as:0,t0:GC.turn,last:'The siege begins.',roll:0,tot:0};GC.sg.push(S);st.hot=GC.turn;
  grLog(GCM.nats.get(an).name+' lays siege to '+GCM.P[pi].n+' ('+GCM.nats.get(st.o).name+').',an===GC.me||st.o===GC.me?GC.me:an);return S;}
function gwSiegeNeed(S){return 4*Math.max(1,gwFort(S.p));}
/* what is added to the besieger's siege roll (1-14), as [plain words, number] rows */
function gwSiegeMods(S){const L=gwBesiegers(S),M=[],st=GC.prov[S.p],fort=gwFort(S.p);if(S.st)M.push(['Garrison supplies running down',S.st]);if(S.br)M.push(['Breaches in the defenses',S.br]);
  const g=gwLead(L.map(a=>({arr:a})));if(g){const v=gwPips(g)[3];if(v)M.push([gwGenName(g)+' (siege skill)',v]);}
  let ar=0;for(const a of L){const fac=grNat(a.o).fac;for(const r of a.u)if(gwRole(fac,r[0]).arty)ar++;}if(ar>=2)M.push(['Artillery and rockets ('+ar+')',ar>=9?3:ar>=5?2:1]);
  let port=false;try{port=gmilHasPort(S.p);}catch(e){}if(port){let bk=false;try{bk=gmilBk(S.p);}catch(e){}M.push(bk?['Port blockaded',1]:['Resupplied by sea',-2]);}
  let so=0;try{if(grHasKind(grNat(S.an).fac,'jet'))so=geSortieStock(S.an,S.p,280);}catch(e){}if(so>=2)M.push(['Air strikes on the fort',1]);
  M.push(['Fort level '+fort,-3*fort]);if(gwZeal(st.o))M.push(['Garrison sworn to hold',-1]);return M;}
function gwSiegeBonus(S){return gwSiegeMods(S).reduce((s,m)=>s+m[1],0);}
/* chance (0-100) that the next roll ends the siege */
function gwSiegeChance(S){if(!GC.prov[S.p].gar.length)return 100;if(gwCount(gwBesiegers(S).map(a=>({u:a.u})))<gwSiegeNeed(S))return 0;const b=gwSiegeBonus(S);let n=0;for(let r=2;r<=14;r++)if(r+b>=GW_SG_WIN)n++;return Math.round(n/14*100);}
function gwSiegeDay(S){const st=GC.prov[S.p],P=GCM.P[S.p];
  if(!st||st.o!==S.dn||!gwFort(S.p)){GC.sg.splice(GC.sg.indexOf(S),1);gwScanAt(S.p);return;}
  if(gwBattleAt(S.p))return;   /* a field battle outside the walls pauses the siege */
  const L=gwBesiegers(S);if(!L.length){GC.sg.splice(GC.sg.indexOf(S),1);grLog('The siege of '+P.n+' is lifted.',S.dn===GC.me||S.an===GC.me?GC.me:S.dn);return;}
  if(!L.some(a=>a.o===S.an))S.an=L[0].o;S.d++;st.hot=GC.turn;for(const a of L)a.fo=GC.turn;if(S.d<S.nx)return;S.nx=S.d+GW_SG_DAYS;
  const me=S.dn===GC.me||L.some(a=>a.o===GC.me)?GC.me:S.an;
  if(!st.gar.length){gwSiegeEnd(S,'The fort at '+P.n+' stood empty and fell.');return;}
  let n=0;for(const a of L)n+=a.u.length;if(n<gwSiegeNeed(S)){S.roll=0;S.tot=0;S.last='Too few troops to seal the fort (needs '+gwSiegeNeed(S)+' units).';return;}
  const R=gwRng(S.id,S.d,3),roll=1+Math.floor(R()*14),tot=roll+gwSiegeBonus(S);S.roll=roll;S.tot=tot;
  if(roll===1){for(const a of L)for(const r of a.u)r[1]=Math.max(13,Math.round(r[1]*.96));S.last='Raids and sickness bleed the besiegers.';return;}
  if(tot>=GW_SG_WIN){gwSiegeEnd(S,gwZeal(st.o)?'The garrison of '+P.n+' fought to the last; the fort has fallen.':'The garrison of '+P.n+' surrendered.');return;}
  if(roll===14&&S.br<3){S.br++;S.last='The defenses are breached.';}
  else if(tot>=GW_SG_WIN-4){S.st=Math.min(12,S.st+3);const k=Math.max(1,Math.round(st.gar.length*.1));st.gar.length=Math.max(1,st.gar.length-k);S.last=gwZeal(st.o)?'The garrison is bleeding but holds.':'Defenders are slipping away.';}
  else if(tot>=GW_SG_WIN-8){S.st=Math.min(12,S.st+2);S.last='Food is running short inside.';}
  else if(tot>=GW_SG_WIN-15){S.st=Math.min(12,S.st+1);S.last='Supplies are running short inside.';}
  else S.last='No progress.';
  /* AI besiegers storm a breached or weakly held fort */
  const lead=L.find(a=>a.o===S.an);if(lead&&GC.nat[S.an]&&GC.nat[S.an].ai){const q=gwAssaultOdds(S);if(q.ok&&(q.ratio>=3||(S.br>=1&&q.ratio>=1.6)))gwAssaultDo(S);}}
function gwSiegeEnd(S,txt){const st=GC.prov[S.p],L=gwBesiegers(S),me=S.dn===GC.me||L.some(a=>a.o===GC.me)?GC.me:S.an;const i=GC.sg.indexOf(S);if(i>=0)GC.sg.splice(i,1);
  st.gar=[];st.sf=1;grLog(txt,me);for(const a of L)for(const r of a.u)r[2]+=30;
  gwCard({id:S.id,p:S.p,pn:GCM.P[S.p].n,an:S.an,dn:S.dn,win:'att',how:'siege',d:S.d,t:GC.turn,day:GC.bd|0,na0:gwCount(L.map(a=>({u:a.u}))),nd0:0,la:0,ld:0,ga:'',gd:'',sg:1,txt,wa:[...new Set([S.an,...L.map(a=>a.o)])],who:[...new Set([S.an,S.dn,...L.map(a=>a.o)])]});
  try{gfBattle({an:S.an,dn:S.dn},'att');}catch(e){}try{wsBattle({an:S.an,dn:S.dn,p:S.p,att:L.map(a=>a.id),def:[]},'att');}catch(e){}
  grCapture(S.p);}
/* storming the walls: only line troops (not the support row) go in; the garrison fights from cover, breaches help */
function gwAssaultOdds(S){const st=GC.prov[S.p],L=gwBesiegers(S),fort=gwFort(S.p);let av=0,n=0;for(const a of L){const fac=grNat(a.o).fac;for(const r of a.u){const ro=gwRole(fac,r[0]);if(!ro.back&&!ro.nav){av+=grUnitVal(fac,r);n++;}}}
  const gv=grForce(grNat(st.o).fac,st.gar)*(2+fort)/(1+.5*S.br);return {ok:n>0&&st.gar.length>0,av,gv,n,ratio:gv>0?av/gv:99,loss:gv>0?Math.max(.1,Math.min(.6,.45*gv/Math.max(1,av))):0};}
function gwAssaultDo(S){const st=GC.prov[S.p],P=GCM.P[S.p],L=gwBesiegers(S),q=gwAssaultOdds(S);if(!q.ok)return 'There are no line troops to send in.';S.as=(S.as|0)+1;const R=gwRng(S.id,S.d,10+S.as);
  const win=q.ratio*(.85+R()*.3)>=1,f=win?q.loss:.5;let lost=0;
  for(const a of L){const fac=grNat(a.o).fac;a.fo=GC.turn;for(let i=a.u.length-1;i>=0;i--){const r=a.u[i],ro=gwRole(fac,r[0]);if(ro.back||ro.nav)continue;if(R()<f*.6){a.u.splice(i,1);lost++;}else{r[1]=Math.max(13,Math.round(r[1]*(1-f*.5)));r[2]+=25;}}}
  for(const a of GC.armies.slice())if(!a.u.length&&a.at===S.p)grDrop(a);
  const me=S.dn===GC.me||L.some(a=>a.o===GC.me)?GC.me:S.an;
  if(win){gwSiegeEnd(S,'The fort at '+P.n+' was stormed ('+lost+' units lost in the assault).');return '';}
  const k=Math.min(st.gar.length-1,Math.round(st.gar.length*.25*Math.min(1,q.ratio)));if(k>0)st.gar.length=st.gar.length-k;S.last='The assault was thrown back ('+lost+' units lost).';
  grLog('The assault on '+P.n+' was thrown back; '+lost+' units were lost.',me);return '';}
/* order: storm the fort this army is besieging */
function gwAssault(aid){const a=GC.armies.find(x=>x.id===aid);if(!a||a.o!==GC.me)return 'no army';const S=gwSiegeAt(a.at);if(!S||!gwBesiegers(S).includes(a))return 'This army is not besieging a fort.';
  if(gwBattleAt(S.p))return 'A battle is being fought outside the walls.';return gwAssaultDo(S);}

// ---------- odds (the same rules, played forward on copies) ----------
/* expected outcome of a running battle B or of a queue-style entry b: {pct (attacker's chance 0-100), days, la, ld} from n seeded play-throughs */
function gwOdds(b,n){gwS();n=n||16;let B=b;if(B.d===undefined){B={id:0,p:b.p,an:b.an,dn:b.dn,att:b.att.slice(),def:(b.def||[]).slice(),garr:!!b.garr&&!gwFort(b.p),river:!!b.river,mtn:!!b.mtn,sea:!!b.sea,d:0,ph:0,la:0,ld:0,amph:b.amph|0,relief:0};
    B.ma=Math.round(gwMorOf(B,'att'));B.md=Math.round(gwMorOf(B,'def'));const X=gwCtx(B,1);B.va0=Math.round(gwVal(X.A));B.vd0=Math.round(gwVal(X.D));B.va=B.va0;B.vd=B.vd0;B.na0=gwCount(X.A);B.nd0=gwCount(X.D);}
  let w=0,days=0,la=0,ld=0;const js=JSON.stringify(B);
  for(let i=0;i<n;i++){const C=JSON.parse(js),X=gwCtx(C,1);let r=null,g=0;while(!r&&g++<400)r=gwStep(C,X,grRng((GC.seed*31+C.id*7919+C.d*131+i*7717+B.p)|0));
    if(r&&r.win==='att')w++;days+=C.d-(B.d|0);la+=(r&&r.win==='def'&&(r.how==='wipe'||r.how==='sunk'))?C.na0:C.la;ld+=(r&&r.win==='att'&&(r.how==='wipe'||r.how==='sunk'))?C.nd0:C.ld;}
  return {pct:Math.round(w/n*100),days:Math.round(days/n),la:Math.round(la/n),ld:Math.round(ld/n)};}
/* odds for marching army ids `att` (nation an) into province pi right now - what the map shows before the order */
function gwOddsAt(an,attIds,pi){const P=GCM.P[pi],st=P.land?GC.prov[pi]:null,here=GC.armies.filter(a=>a.at===pi&&a.u.length&&grAtWar(a.o,an));
  const garr=!!(st&&grAtWar(an,st.o)&&st.gar.length&&!gwFort(pi));if(!here.length&&!garr)return {none:1,siege:st&&grAtWar(an,st.o)?gwFort(pi):0};
  const a0=GC.armies.find(a=>a.id===attIds[0]),from=a0?a0.at:-1;
  const o=gwOdds({p:pi,an,dn:garr?st.o:here[0].o,att:attIds,def:here.map(a=>a.id),garr,river:from>=0&&P.land&&grRiver(from,pi),mtn:P.t==='m',sea:!P.land,amph:from>=0&&P.land&&GCM.P[from].sea?1:0},12);
  o.siege=st&&grAtWar(an,st.o)?gwFort(pi):0;return o;}
function gwHashStr(){if(!GC||!((GC.bt&&GC.bt.length)||(GC.sg&&GC.sg.length)))return '';let s='|B';   /* nothing running = nothing added, so a campaign that has the (empty) lists and one that does not yet hash the same */
  for(const B of GC.bt||[])s+=B.id+':'+B.p+':'+B.d+':'+B.ma+':'+B.md+';';for(const S of GC.sg||[])s+='S'+S.id+':'+S.p+':'+S.d+':'+S.st+':'+S.br+';';return s;}
