/* ===== Leader abilities (leadersC; Abdullah 2026-11-07 22:38-22:58 "Think of a creative buff" -> "Make the ayatollah buff cooler" -> "Make the dear leader cooler as well") =====
   ONE shared system for the two leader units (unit kind 'cleric': the Ayatollah for IR / RS / DW, the Dear Leader for KP). Each has two passives,
   one active ability and one ultimate. Fictional leaders, military vs military only.
   State: T.ld (cooldown stamps, buff windows, Path-of-Hussein banners) - saved with the team by 07b-ckpt (generic team encode) and sent to clients in teamMsg ('ld').
   Per-unit buff stamps: u.insT (Inspired), u.ordT (Supreme Commander's Order). Actions: {t:'ldr',k:'a'|'u',x,y} through act() so multiplayer stays in sync.
   Hotkeys (the one key table in 08-ui): E = active ability, Shift+E = ultimate. FX reuse the pooled ping rings / banners: nothing is created per frame. */
const LD_R=260;
const LDS={ay:{n:'Ayatollah',a:{n:'Sermon',cd:120,r:320,dur:25},u:{n:'Call to Arms',cd:300,k:6,cap:24}},
  dl:{n:'Dear Leader',a:{n:"Supreme Commander's Order",cd:120,r:320,dur:25},u:{n:'Mass Mobilization',cd:300,dur:20,k:8,cap:24}}};
const LD_TIPS={
  ay:{p:'Steadfast: infantry near him recover from suppression twice as fast and take 15% less damage from artillery and aircraft. Path of Hussein: when one of your infantry falls near him a green banner rises for 20 s; comrades near a banner hit 8% harder (up to 3 banners).',
    a:'Sermon (120 s): he raises his hand and a green halo spreads 320 around him. For 25 s your ground units inside it are Inspired: +20% rate of fire, +15% speed, and they cannot be suppressed. [E]',
    u:'Call to Arms (300 s): drums and chant - 6 volunteer riflemen muster at him and at each of your barracks. [Shift+E]'},
  dl:{p:'On-the-spot guidance: a production building next to him builds 25% faster; artillery and rockets near him reload 15% faster. Unbreakable Spirit: wounded units near him keep full damage and speed, and damaged vehicles repair themselves slowly.',
    a:"Supreme Commander's Order (120 s): loudspeakers and red banners - pick a target; every artillery and rocket unit within 320 of him fires one free synchronized volley there, then fires 25% faster with +15% range for 25 s. [E]",
    u:'Mass Mobilization (300 s): siren and anthem - for 20 s infantry train 50% faster and 25% cheaper, and 8 Worker-Peasant Guards (militia) form at each of your barracks. [Shift+E]'}};
const LDU=[],LDKT=[];   // living leader unit per team / 'ay' | 'dl' | null per team (rebuilt by ldTick; host only)
let LD_ACC=0,LD_ACC2=0;
function ldKind(fac){return fac==='KP'?'dl':(typeof SHIA!=='undefined'&&SHIA[fac])?'ay':null;}
function ldState(T){if(!T.ld)T.ld={c1:0,c2:0,mm:0,ph:[]};return T.ld;}
function ldNear(e,R){const u=LDU[e.team];if(!u||u.dead)return null;const dx=u.x-e.x,dy=u.y-e.y;return Math.abs(dx)<R&&Math.abs(dy)<R&&dx*dx+dy*dy<R*R?u:null;}
/* ---- passives read by the sim ---- */
function ldTaken(e,wpn,src){if(e.isB||LDKT[e.team]!=='ay'||!isInf(e.s))return 1;
  if(!(wpn==='shell'||wpn==='missile'||wpn==='bomb'||wpn==='super'||(src&&src.s&&(src.s.cls==='arty'||src.s.dom==='air'||src.s.rocket))))return 1;return ldNear(e,LD_R)?.85:1;}
function ldSupp(u){return LDKT[u.team]==='ay'&&isInf(u.s)&&ldNear(u,LD_R)?2:1;}
function ldDmg(src){if(src.isB||LDKT[src.team]!=='ay')return 1;const ph=G.teams[src.team].ld;if(!ph||!ph.ph||!ph.ph.length)return 1;let n=0;
  for(const b of ph.ph)if(b.t>G.t&&Math.abs(b.x-src.x)<200&&Math.hypot(b.x-src.x,b.y-src.y)<200)n++;return 1+.08*Math.min(3,n);}
/* reload / fire-rate multiplier (smaller = faster, like the rest of rofMult) */
function ldRof(u){if(u.isB)return 1;let m=1;if(u.insT>G.t)m*=1/1.2;if(u.ordT>G.t)m*=.8;
  if(LDKT[u.team]==='dl'&&(u.s.cls==='arty'||u.s.rocket)&&ldNear(u,LD_R))m*=.87;return m;}
function ldProd(T,bl,s){if(LDKT[T.id]!=='dl')return 1;let m=1;const u=LDU[T.id];if(u&&!u.dead)for(const b of bl)if(Math.hypot(b.x-u.x,b.y-u.y)<120){m=1.25;break;}
  if(T.ld&&T.ld.mm>G.t&&s.from==='barracks'&&isInf(s))m*=1.5;return m;}
function ldCost(T,s){return(T.ld&&T.ld.mm>G.t&&s.from==='barracks'&&isInf(s))?.75:1;}
/* a soldier of ours fell near the Ayatollah: the martyr banner rises for 20 s (the existing banner system) and the comrades around it hit harder */
function ldFell(e){if(LDKT[e.team]!=='ay'||!isInf(e.s)||!ldNear(e,LD_R))return;const T=G.teams[e.team],L=ldState(T);
  L.ph=L.ph.filter(b=>b.t>G.t);if(L.ph.length<3)L.ph.push({x:e.x,y:e.y,t:G.t+20});else{const o=L.ph.reduce((a,b)=>a.t<b.t?a:b);o.x=e.x;o.y=e.y;o.t=G.t+20;}
  martyrBanner(e,20);FXE('txt',[e.x|0,e.y|0,'YA HUSSEIN!',e.team,-2]);}
function ldLeaderDied(e){const T=G.teams[e.team],dl=T.fac==='KP';FXE('vig',[e.team,dl?'#b3262c':'#2f8f55',dl?1:0],e.team);}
/* ---- per-tick: find the leaders, expire banners, Unbreakable Spirit ---- */
function ldTick(dt){if(MODE==='client'||!G.teams)return;LD_ACC+=dt;if(LD_ACC<.1)return;const d=LD_ACC;LD_ACC=0;
  for(const T of G.teams){LDKT[T.id]=T.reb||T.dummy?null:ldKind(T.fac);LDU[T.id]=null;}
  for(const e of G.ents)if(e.kind==='cleric'&&!e.dead&&!e.isB&&LDKT[e.team])LDU[e.team]=e;
  LD_ACC2+=d;if(LD_ACC2<.5)return;const dd=LD_ACC2;LD_ACC2=0;
  for(const T of G.teams){const k=LDKT[T.id];if(!k||!T.ld)continue;if(T.ld.ph.length)T.ld.ph=T.ld.ph.filter(b=>b.t>G.t);}
  const dl=LDU.findIndex((u,i)=>u&&!u.dead&&LDKT[i]==='dl');if(dl<0)return;const lu=LDU[dl];
  for(const e of G.ents){if(e.dead||e.isB||e.team!==dl||!e.s||e.s.dom!=='ground')continue;const dx=e.x-lu.x,dy=e.y-lu.y;if(dx*dx+dy*dy>LD_R*LD_R)continue;
    if(e.hp<e.max*.4&&e.crit)e.crit&=4;   /* Unbreakable Spirit: a wounded unit keeps full damage and speed (no engine / gun crits) */
    if(isVeh(e.s)&&e.hp<e.max*.6&&e.kind!=='harv')e.hp=Math.min(e.max*.6,e.hp+e.max*.01*dd);}}   /* ... and a damaged vehicle mends 1%/s up to 60% */
/* ---- the abilities ---- */
function ldSpawn(T,x,y,n){let made=0;for(let i=0;i<n;i++){const p=nearestPassXY('ground',x+rnd(-60,60),y+rnd(-60,60));if(!p)continue;const nu=addUnit(T.id,'inf',p[0],p[1]);if(nu)made++;}return made;}
function ldMuster(T,u,perB,cap){let made=ldSpawn(T,u.x,u.y,perB);const bl=G.ents.filter(e=>e.isB&&e.team===T.id&&e.kind==='barracks'&&e.built>=1&&!e.dead);
  for(const b of bl){if(made>=cap)break;made+=ldSpawn(T,b.x,b.y+(b.size||40)/2+30,Math.min(perB,cap-made));}return made;}
function ldCast(team,k,x,y){const T=G.teams[team],u=LDU[team];if(!T||!u||u.dead||!LDKT[team])return false;const S=LDS[LDKT[team]],L=ldState(T),ai=!!T.ai;
  if(G.conq&&G.t<G.setupEnd){if(!ai)log(team,'No fighting during the setup time.','w');return false;}
  const slot=k==='u'?'c2':'c1',A=S[k==='u'?'u':'a'];if(L[slot]>G.t){if(!ai)log(team,`${A.n}: ready in ${Math.ceil(L[slot]-G.t)} s.`,'w');return false;}
  const dl=LDKT[team]==='dl';
  if(k==='a'&&!dl){const r=S.a.r;let n=0;for(const e of G.ents){if(e.dead||e.isB||e.team!==team||!e.s||e.s.dom!=='ground'||e.kind==='harv'||e.kind==='dozer')continue;if(Math.hypot(e.x-u.x,e.y-u.y)<r){e.insT=G.t+S.a.dur;e.supp=0;n++;}}
    FXE('halo',[u.x|0,u.y|0,r,0x4fe08a],team);FXE('halo',[u.x|0,u.y|0,r*.55,0xa6ffc8],team);FXE('txt',[u.x|0,u.y|0,'SERMON',team,-2]);
    log(team,`The Ayatollah raises his hand: "Labbaik ya Hussein!" ${n} units are Inspired for ${S.a.dur} s: +20% rate of fire, +15% speed, no suppression.`,'r:hab');}
  else if(k==='a'){const r=S.a.r;if(!(x>0||y>0))return false;let n=0;for(const e of G.ents){if(e.dead||e.isB||e.team!==team||!e.s||!(e.s.cls==='arty'||e.s.rocket))continue;if(Math.hypot(e.x-u.x,e.y-u.y)>r)continue;
      n++;e.ordT=G.t+S.a.dur;addStrike(x+rnd(-55,55),y+rnd(-55,55),2.3+Math.min(1.6,n*.05),(e.s.splash||55)+6,Math.round((e.s.dmg||72)*3),team,'');}
    if(!n){if(!ai)log(team,"Supreme Commander's Order: no artillery or rocket units within reach of him.",'w');return false;}
    for(let i=0;i<4;i++){const a=i*1.571+.4;FXE('flag',[(u.x+Math.cos(a)*70)|0,(u.y+Math.sin(a)*70)|0,team,10],team);}
    FXE('halo',[u.x|0,u.y|0,r,0xe0402e],team);FXE('txt',[u.x|0,u.y|0,'SUPREME ORDER',team,-2]);
    log(team,`The Dear Leader gives the order. ${n} artillery units fire together, then fire faster and farther for ${S.a.dur} s.`,'r:hab');}
  else if(!dl){const n=ldMuster(T,u,S.u.k,S.u.cap);FXE('halo',[u.x|0,u.y|0,200,0x4fe08a],team);FXE('txt',[u.x|0,u.y|0,'CALL TO ARMS',team,-2]);
    log(team,`Call to Arms! ${n} volunteer riflemen muster around the Ayatollah and at our barracks.`,'r:hab');}
  else{L.mm=G.t+S.u.dur;const n=ldMuster(T,u,S.u.k,S.u.cap);FXE('halo',[u.x|0,u.y|0,260,0xe0402e],team);FXE('txt',[u.x|0,u.y|0,'MASS MOBILIZATION',team,-2]);
    log(team,`Mass Mobilization! For ${S.u.dur} s infantry train 50% faster and 25% cheaper; ${n} Worker-Peasant Guards have formed.`,'r:hab');}
  L[slot]=G.t+A.cd;return true;}
/* ---- AI: trains its leader once it can afford one and uses the abilities when the fight is on ---- */
function ldAI(id,T,mine,en){const k=LDKT[id];if(!k||T.ai.t%3)return;const u=LDU[id];
  if(!u){if((T.ai.d||0)>=1&&G.t>240&&(T.rebuy||0)<=G.t&&done(id,'barracks')&&T.credits>=stats(T.fac,'cleric').cost+900&&unitCount(id,'cleric')<1&&T.ai.t%9===0)enqueue(id,'cleric');return;}
  const L=ldState(T);const foes=G.ents.filter(e=>!e.dead&&!e.isB&&e.team!==id&&!ally(e.team,id)&&e.team!==G.reb&&e.s&&!e.s.noAttack&&seenBy(id,e)&&Math.hypot(e.x-u.x,e.y-u.y)<(k==='dl'?520:420));
  if(foes.length<3)return;
  if(L.c2<=G.t&&foes.length>=5)ldCast(id,'u');
  if(L.c1<=G.t){if(k==='ay'){if(foes.length>=4)ldCast(id,'a');}else{let best=null,bd=1e9;for(const e of foes){const d=Math.hypot(e.x-u.x,e.y-u.y);if(d<bd){bd=d;best=e;}}if(best)ldCast(id,'a',best.x,best.y);}}}
