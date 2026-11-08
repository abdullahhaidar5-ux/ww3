/* ---------- Tactics: digging in + vehicle critical damage (Abdullah, 2026-11-04) ----------
   DIG IN: infantry dig a foxhole in a few seconds (they sit low in it); Construction Vehicles lay sandbag lines and short
   trench segments along a dragged line (costs supplies per segment, takes time). All of them give cover through
   coverAt()/tactic(): foxholes and trenches take about half the damage, sandbags about a third off; vehicles driving over
   them are slowed, tanks crush them, and shells / bombs / missiles destroy them. State: G.dug (list of {id,x,y,a,k,team,hp,max}),
   G.dugN (count), G.dugV (version, bumps on every change). Clients get the list in the team panel (teamMsg 'dg').
   VEHICLE DAMAGE: hits on tanks/IFVs/APCs/trucks can knock out the tracks or wheels (crit bit 1: immobile), jam the turret
   (bit 2: slow traverse, slower fire) or start an engine fire (bit 4: damage over time, slower). Side and rear hits are
   far more likely to do it. The roll is seeded (map seed, unit id, tick) so host and checkpoints agree. Below 20% health
   the crew bails out (existing hulk / re-crew system). Construction Vehicles, and the war factory / HQ yard, fix criticals.
   crit bits ride in the unit snapshot (high bits of the morale field) so every screen shows the same icons. */
const DUGK=['fox','sand','trench'];
const DUG={fox:{hp:150,t:4,r:15,cost:0},sand:{hp:230,t:3,r:14,cost:35},trench:{hp:320,t:5,r:18,cost:70}};
const DUG_MAX=150;
function dugInit(){if(!G.dug){G.dug=[];G.dugN=0;G.dugV=0;G.dugId=1;}}
function dugBump(){G.dugN=G.dug.length;G.dugV=(G.dugV|0)+1;}
// 0 = no cover, 1 = sandbags, 2 = foxhole / trench
function dugCov(x,y){const L=G.dug;if(!L)return 0;let best=0;for(let i=0;i<L.length;i++){const d=L[i];const dx=x-d.x,dy=y-d.y;if(dx>30||dx<-30||dy>30||dy<-30)continue;
  if(d.k==='fox'){if(dx*dx+dy*dy<DUG.fox.r*DUG.fox.r)return 2;continue;}
  const ca=Math.cos(d.a),sa=Math.sin(d.a),u=dx*ca+dy*sa,v=-dx*sa+dy*ca;
  if(d.k==='trench'){if(Math.abs(u)<DUG.trench.r+3&&Math.abs(v)<13)return 2;}else if(Math.abs(u)<DUG.sand.r+2&&Math.abs(v)<11)best=1;}return best;}
// how far a soldier sinks into a hole (render only; clients derive it from the synced list)
function holeDrop(e){if(!G.dug||!e.s||!isInf(e.s))return 0;if(MODE==='client'?e.mvC:G.t-(e.mv||-9)<.5)return 0;return dugCov(e.x,e.y)===2?3.2:0;}
function dugAdd(team,k,x,y,a){dugInit();if(G.dug.length>=DUG_MAX){let o=-1;for(let i=0;i<G.dug.length;i++)if(G.dug[i].team===team){o=i;break;}if(o<0)return null;G.dug.splice(o,1);}
  const d={id:G.dugId++,x:Math.round(x),y:Math.round(y),a:+a.toFixed(2),k,team,hp:DUG[k].hp,max:DUG[k].hp};G.dug.push(d);dugBump();return d;}
function dugKill(d){const i=G.dug.indexOf(d);if(i<0)return;G.dug.splice(i,1);dugBump();FXE('boom',[d.x,d.y,9,0]);}
// shells, bombs and missiles tear up fortifications near the blast
function dugBlast(x,y,r,dmg,wpn){const L=G.dug;if(!L||!L.length)return;const K=wpn==='bomb'||wpn==='super'?1.3:wpn==='shell'||wpn==='missile'||wpn==='boom'?1:.7;
  for(let i=L.length-1;i>=0;i--){const d=L[i],dist=Math.hypot(d.x-x,d.y-y);if(dist>r+14)continue;d.hp-=dmg*K*(1-.5*Math.max(0,dist-8)/(r+14));if(d.hp<=0){L.splice(i,1);FXE('boom',[d.x,d.y,9,0]);G.dugBd=1;}}
  if(G.dugBd){G.dugBd=0;dugBump();}}
// vehicles driving over them: slowed (about half), and tanks flatten them
function dugVeh(u){const L=G.dug;let s=1;if(!L)return;const crush=u.s.cls==='tank'||u.s.cls==='arty'||u.s.r>=13;
  for(let i=L.length-1;i>=0;i--){const d=L[i];const dx=u.x-d.x,dy=u.y-d.y;if(dx>34||dx<-34||dy>34||dy<-34)continue;if(dx*dx+dy*dy>(u.r+16)*(u.r+16))continue;
    s=.5;if(crush&&u.v>3){d.hp-=70*.25;if(d.hp<=0){L.splice(i,1);G.dugBd=1;}}}
  if(G.dugBd){G.dugBd=0;dugBump();}u.dgS=s;}
// ---- infantry foxholes ----
function digTick(u,dt){const D=u.dig;if(!D)return;
  if(u.order||G.t-(u.mv||-9)<.35||u.rout>G.t||u.aband||u.inTun){u.dig=null;return;}
  D.p+=dt;if(D.p<D.need)return;u.dig=null;const near=G.dug&&G.dug.some(d=>d.k!=='sand'&&Math.hypot(d.x-u.x,d.y-u.y)<10);
  if(!near)dugAdd(u.team,'fox',u.x,u.y,(u.id*2.399)%6.28);FXE('txt',[u.x|0,u.y|0,'DUG IN',u.team,-2]);}
function digCan(u){return u&&!u.isB&&!u.dead&&u.s&&isInf(u.s)&&!u.s.noAttack&&u.kind!=='hacker'&&!u.inTun&&!u.aband;}
function startDig(u){if(!digCan(u)||u.dig)return;if(G.dug&&G.dug.some(d=>d.k!=='sand'&&Math.hypot(d.x-u.x,d.y-u.y)<10))return;u.order=null;u.target=null;u.path=null;u.dig={p:0,need:DUG.fox.t};FXE('txt',[u.x|0,u.y|0,'DIGGING IN',u.team,-2]);}
// AI infantry that have stood still a while dig in (they are holding that ground), at most 28 holes per AI team
function aiDig(u,dt){if(u.order||u.target||u.dig||u.rout>G.t||G.t-(u.mv||-9)<.5){u.idl=0;return;}u.idl=(u.idl||0)+dt;if(u.idl<7||!digCan(u))return;u.idl=-4-(u.id%8);
  let n=0;for(const d of G.dug||[])if(d.team===u.team&&d.k==='fox')n++;if(n<28)startDig(u);}
// ---- sandbag lines / trench segments laid by a Construction Vehicle along a dragged line ----
function wallPlan(k,x,y,x2,y2){const sp=k==='trench'?30:25,L=Math.hypot(x2-x,y2-y),n=Math.max(1,Math.min(14,Math.round(L/sp)+1)),a=L<4?0:Math.atan2(y2-y,x2-x),out=[];
  for(let i=0;i<n;i++){const f=n===1?0:i/(n-1);out.push({x:x+(x2-x)*f,y:y+(y2-y)*f,a});}return out;}
function dozeWall(u,dt){const o=u.order;if(!o||o.type!=='wall')return false;if(!u.wl||!u.wl.length){u.wl=null;u.order=null;return false;}
  const s=u.wl[0],T=G.teams[u.team],C=DUG[s.k];if(!passXY('ground',s.x,s.y)){u.wl.shift();return true;}
  const d=Math.hypot(s.x-u.x,s.y-u.y);if(d>34){u.wb=0;navTo(u,s.x,s.y,dt);return true;}
  if(T.credits<C.cost){u.wn=(u.wn||0)+dt;if(u.wn>6){u.wl=null;u.order=null;if(u.team===ME)log(u.team,'Not enough supplies to finish the line.','w');}return true;}u.wn=0;
  u.building=true;u.ang=s.a+1.57;u.lastFire=G.t;u.wb=(u.wb||0)+dt*(u.kind==='dozer'?1:.65);
  if(u.wb>=C.t){u.wb=0;T.credits-=C.cost;u.wl.shift();dugAdd(u.team,s.k,s.x,s.y,s.a);if(!u.wl.length){u.wl=null;u.order=null;}}return true;}
// a dragged line: every selected builder (Construction Vehicle or infantry) takes its share of the pieces; a trench that starts or ends
// near the end of one of ours snaps onto it, so trench lines join into one network
function trenchSnap(team,x,y){let b=null,bd=46*46;for(const d of G.dug||[]){if(d.k!=='trench'||!ally(d.team,team))continue;const ca=Math.cos(d.a),sa=Math.sin(d.a);
  for(const s of [-1,1]){const px=d.x+ca*DUG.trench.r*s,py=d.y+sa*DUG.trench.r*s,q=(px-x)**2+(py-y)**2;if(q<bd){bd=q;b=[px,py];}}}return b||[x,y];}
function wallOrder(team,us,k,x,y,x2,y2){us=us.filter(u=>u&&(u.kind==='dozer'||digCan(u)));if(!us.length)return;if(k==='trench'){const a=trenchSnap(team,x,y),b=trenchSnap(team,x2,y2);x=a[0];y=a[1];x2=b[0];y2=b[1];}
  us.sort((p,q)=>Math.hypot(p.x-x,p.y-y)-Math.hypot(q.x-x,q.y-y));const pl=wallPlan(k,x,y,x2,y2),n=us.length;
  us.forEach((u,i)=>{const mine=pl.filter((_,j)=>j%n===i);if(!mine.length)return;u.wl=mine.map(p=>({x:p.x,y:p.y,a:p.a,k}));u.wb=0;u.wn=0;u.dig=null;u.order={type:'wall'};u.target=null;u.path=null;});}
// ---- vehicle criticals ----
const CRIT_TXT={1:'TRACKS OUT',2:'TURRET JAMMED',4:'ENGINE FIRE'};
function critSpd(u){const c=u.crit|0;return !c?1:((c&1)?0:1)*((c&4)?.6:1);}
function critOk(e){return !!e.s&&isVeh(e.s)&&e.kind!=='harv'&&!e.s.noCrew;}
function critRoll(e,dd,wpn,src,splash){if(!critOk(e)||e.hp<=0||dd<e.max*.012||G.t-(e.critT||-9)<2.5)return;
  let p;if(src&&!src.isB&&!splash&&wpn!=='bomb'){const a=Math.atan2(e.y-src.y,e.x-src.x),rel=Math.abs(angDiff(e.hd??e.ang,a));p=rel<.95?.30:rel<2.1?.17:.05;}else p=.10;
  if(wpn==='gun'||wpn==='tower'||wpn==='snipe')p*=.15;p*=Math.max(.4,Math.min(1.6,dd/(e.max*.12)));
  const R=mulberry((((G.seed|0)*2654435761)^(e.id*40503)^((G.t*60)|0))>>>0);if(dd>=e.max*.08&&e.s.dmg>0&&!e.s.noAttack&&(e.crewT||0)<G.t&&R()<p*.3){e.crewT=G.t+8;FXE('txt',[e.x|0,e.y|0,'CREW STUNNED',src&&src.team!=null?src.team:-2,e.team]);}  /* RF2: a hard hit (worst from the flank or rear) stuns the crew: no firing for 8 s */
  if(R()>=p)return;
  const turret=!!(e.s.dmg>0&&!e.s.noAttack),c=e.crit|0,opts=[];if(!(c&1))opts.push([1,45]);if(turret&&!(c&2))opts.push([2,30]);if(!(c&4))opts.push([4,25]);if(!opts.length)return;
  let tot=0;for(const o of opts)tot+=o[1];let r=R()*tot,pick=opts[0][0];for(const o of opts){if(r<o[1]){pick=o[0];break;}r-=o[1];}
  e.crit=c|pick;e.critT=G.t;if(pick===4)e.fireT=G.t+10+R()*6;
  FXE('txt',[e.x|0,e.y|0,pick===1&&isWheeled(e)?'WHEELS OUT':CRIT_TXT[pick],src&&src.team!=null?src.team:-2,e.team]);
  if(e.team===ME&&G.t-(G.teams[e.team].critWarn??-99)>6){G.teams[e.team].critWarn=G.t;log(e.team,`Our ${e.s.name}: ${(pick===1&&isWheeled(e)?'wheels knocked out':CRIT_TXT[pick].toLowerCase())} - a Construction Vehicle can fix it.`,'w');}}
function critTick(u,dt){if(u.crit&4){u.hp=Math.max(u.max*.05,u.hp-u.max*.012*dt);if(G.t>u.fireT)u.crit&=~4;}
  u.rpT=(u.rpT||0)-dt;if(u.rpT<=0){u.rpT=1;let depot=false;for(const b of G.ents)if(b.isB&&!b.dead&&b.built>=1&&b.team===u.team&&(b.kind==='factory'||b.kind==='hq')&&Math.hypot(b.x-u.x,b.y-u.y)<b.size/2+90){depot=true;break;}
    if(depot){u.dpP=(u.dpP||0)+1;if(u.dpP>=7){u.dpP=0;critClear(u);}}else u.dpP=0;}
  if(!u.crit)u.crit=0;}
function critClear(u){const c=u.crit|0;if(!c)return;const b=(c&4)?4:(c&1)?1:2;u.crit=c&~b;FXE('txt',[u.x|0,u.y|0,'REPAIRED',u.team,-2]);}
function critFix(v,dt){v.fixP=(v.fixP||0)+dt;if(v.fixP>=3.5){v.fixP=0;critClear(v);}}
function critNear(u,R){let b=null,bd=R*R;for(const v of G.ents)if(!v.isB&&!v.dead&&v.crit&&v.team===u.team&&v.s&&isVeh(v.s)){const d=(v.x-u.x)**2+(v.y-u.y)**2;if(d<bd){bd=d;b=v;}}return b;}
// the crew bails out of a vehicle that is nearly dead (below 20% health), whether or not morale has broken
function bailCheck(u){if(u.aband||!critOk(u)||u.kind==='dozer'||u.hp>=u.max*.2||G.t-(u.reT||-99)<8)return false;if(u.s.cap&&u.cargo&&u.cargo.length)try{unloadTransport(u);}catch(_){}bailOut(u);return true;}
// client sync: the fortification list rides in the team panel when it changed (and every 12 s as a safety net)
function dgPack(T){if(!G.dug)return null;if(T.dgV===G.dugV&&G.t<(T.dgT||0))return null;T.dgV=G.dugV;T.dgT=G.t+12;return{dg:G.dug.map(d=>[d.id,d.x,d.y,DUGK.indexOf(d.k),Math.round(d.a*100),d.team])};}
function dgApply(L){G.dug=L.map(v=>({id:v[0],x:v[1],y:v[2],k:DUGK[v[3]]||'fox',a:v[4]/100,team:v[5],hp:1,max:1}));G.dugN=G.dug.length;G.dugV=(G.dugV|0)+1;G.dugId=Math.max(G.dugId|0,1);}
// AI: after the first four minutes an idle Construction Vehicle throws up a sandbag line (or trench) across the approach in front of a base building
function aiWalls(T,mine){if(T.ai.d<1||T.ai.t%9!==4||T.credits<450||G.t<240)return;let n=0;for(const d of G.dug||[])if(d.team===T.id&&d.k!=='fox')n++;if(n>=14)return;
  let dzs=mine.filter(e=>!e.isB&&e.kind==='dozer'&&!e.order&&!e.dead).slice(0,2);if(!dzs.length){dzs=mine.filter(e=>!e.isB&&!e.dead&&!e.order&&!e.target&&!e.dig&&digCan(e)&&G.t-(e.mv||-9)>3).slice(0,4);if(dzs.length<3)return;}const dz=dzs[0];let foe=null,bd=1e12;for(const e of G.ents)if(e.isB&&!e.dead&&e.kind==='hq'&&!ally(e.team,T.id)){const d=(e.x-dz.x)**2+(e.y-dz.y)**2;if(d<bd){bd=d;foe=e;}}if(!foe)return;
  const bs=mine.filter(e=>e.isB&&e.built>=1&&(e.kind==='factory'||e.kind==='barracks'||e.kind==='hq'));if(!bs.length)return;const b=bs[(T.ai.t/9|0)%bs.length];
  const a=Math.atan2(foe.y-b.y,foe.x-b.x),r=b.size/2+80,cx=b.x+Math.cos(a)*r,cy=b.y+Math.sin(a)*r,px=-Math.sin(a)*75,py=Math.cos(a)*75,k='trench';   /* Abdullah 2026-11-07 21:21 "Make it all dig in": one dug-in line, no separate sandbag line */
  act(T.id,{t:'wall',ids:dzs.map(e=>e.id),k,x:cx-px,y:cy-py,x2:cx+px,y2:cy+py});}
