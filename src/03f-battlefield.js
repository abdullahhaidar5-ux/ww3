/* ---------- Battlefield: wounded & medics, damaged buildings & rubble clearing, dams & floods (Abdullah 2026-11-05 18:55) ----------
   WOUNDED: an infantryman killed by an ordinary bullet (not a blast) sometimes goes down wounded instead of being lost: G.wnd is a
   list of {id,x,y,team,kind,rank,xp,until,p}. A friendly Combat Medic (any nation, same numbers) kneeling beside him for 4 s revives
   him with his veterancy; a squad mate drags him to cover; an HQ / Supply Depot patches him up slowly. After ~32 s he bleeds out;
   a blast kills him at once. Enemy fire cannot target him. Same numbers for every nation.
   BUILDINGS: city blocks and garrisoned houses now show three stages (c.stg 0 whole, 1 cracked and smoking, 2 burning); at stage 2
   half the garrison bails out, and the collapse throws the rest clear. Rubble (rubble.md) is cleared by Construction Vehicles
   (idle ones do it on their own, or the "Clear rubble" button): the cell stops blocking tanks and the pile disappears.
   DAMS: maps with a river (Twin Rivers, Fulda Gap) have a dam at each end of the river (point-symmetric, so fair). G.dams = list of
   {i,x,y,a,w,hp,max,dead,t0}; shells, bombs, rockets and tank guns break one (neutral target, like an oil derrick). A breach floods
   the valley for ~3 minutes: the front runs downstream, the water rises (level 0..1), holds, then recedes. Flooded ground slows
   everything on foot or wheels, bridges become impassable (x0.1), infantry in the water take 3.5% of their health a second.
   Everything is derived from G.t and the dam list, so hosts, clients and checkpoints agree. */
const WND_T=32,WND_REV=4,WND_MAX=40,WND_BAD=new Set(['hero','champ','cleric','hacker','harv','dozer','officer','commissar']);
const BF_NB=[];
function wndInit(){if(!G.wnd){G.wnd=[];G.wndN=0;G.wndV=0;G.wndId=1;}}
function wndBump(){G.wndN=G.wnd.length;G.wndV=(G.wndV|0)+1;}
// called from applyDmg when a soldier's health ran out: returns a wound record (to be added after kill() ran) or null
function wndMake(e,wpn,splash){if(MODE==='client'||e.isB||!e.s||!isInf(e.s)||e.crew||e.mil||WND_BAD.has(e.kind)||splash||e.s.cost>600)return null;
  if(wpn!=='gun'&&wpn!=='snipe'&&wpn!=='tower')return null;if(e.hp<-e.max*.8)return null;wndInit();let n=0;for(const w of G.wnd)if(w.team===e.team)n++;if(n>=WND_MAX)return null;
  const R=mulberry((((G.seed|0)*2654435761)^(e.id*40503)^((G.t*60)|0))>>>0);if(R()>=.4)return null;
  return{id:G.wndId++,x:e.x,y:e.y,team:e.team,kind:e.kind,rank:e.rank|0,xp:e.xp||0,t0:G.t,until:G.t+WND_T,p:0,dr:0,md:0};}
function wndAdd(w){try{shout(w,'medic');}catch(_){}wndInit();G.wnd.push(w);wndBump();FXE('txt',[w.x|0,w.y|0,'WOUNDED',w.team,-2]);}
function wndDrop(i,why){const w=G.wnd[i];G.wnd.splice(i,1);wndBump();if(w.dr){const u=G.byId.get(w.dr);if(u)u.drg=0;}if(why)FXE('txt',[w.x|0,w.y|0,why,w.team,-2]);}
function wndRevive(w){const p=nearestPassXY('ground',w.x,w.y)||[w.x,w.y];const n=addUnit(w.team,w.kind,p[0],p[1]);if(!n)return false;n.rank=w.rank|0;n.xp=w.xp||0;n.hp=Math.max(1,n.max*.45);n.fear=0;n.mv=G.t;
  FXE('txt',[n.x|0,n.y|0,'REVIVED',w.team,-2]);FXE('heal',[n.x|0,n.y|0,40],w.team);return true;}
// a blast kills the wounded lying in it
function wndBlast(x,y,r){const L=G.wnd;if(!L||!L.length)return;for(let i=L.length-1;i>=0;i--){const w=L[i];if(Math.hypot(w.x-x,w.y-y)<r*.85)wndDrop(i,'KILLED');}}
function wndCoverSpot(w){let b=null,bd=170*170;for(const d of G.dug||[]){if(d.k==='hole'||!ally(d.team,w.team))continue;const q=(d.x-w.x)**2+(d.y-w.y)**2;if(q<bd&&passXY('ground',d.x,d.y)){bd=q;b=[d.x,d.y];}}if(b)return b;
  for(const r of [45,80,115,150])for(let k=0;k<12;k++){const a=k/12*6.283+w.id,x=w.x+Math.cos(a)*r,y=w.y+Math.sin(a)*r;if(x<30||y<30||x>MAPW-30||y>MAPH-30||!passXY('ground',x,y))continue;if((G.dugN&&dugCov(x,y))||(G.rubN&&rubAt(x,y))||coverAt(x,y))return[x,y];}return null;}
function wndFoes(x,y,team,R){nearby(x,y,R,BF_NB);for(const e of BF_NB)if(!e.dead&&!e.isB&&e.team!==team&&!ally(e.team,team)&&e.s&&e.s.dmg>0&&e.s.dom==='ground'&&Math.hypot(e.x-x,e.y-y)<R)return true;return false;}
function wndTick(dt){const L=G.wnd;if(!L||!L.length)return;const meds=[],aid=[];
  for(const e of G.ents){if(e.dead||e.inTun)continue;if(e.isB){if(e.built>=1&&(e.kind==='hq'||e.kind==='depot'||e.kind==='field'))aid.push(e);}else if(e.kind==='medic')meds.push(e);}
  G.wndS=(G.wndS||0)-dt;const scan=G.wndS<=0;if(scan)G.wndS=.5;
  if(scan)for(const m of meds){if(m.order||m.rout>G.t||G.t-(m.mv||-9)<.8||m.aband)continue;let b=null,bd=320*320;
    for(const w of L){if(!ally(w.team,m.team)||(w.md&&w.mdT>G.t&&w.md!==m.id))continue;const d=(w.x-m.x)**2+(w.y-m.y)**2;if(d<bd&&!wndFoes(w.x,w.y,w.team,120)){bd=d;b=w;}}
    if(b){m.order={type:'move',x:b.x,y:b.y};m.path=null;b.md=m.id;b.mdT=G.t+10;}}
  for(let i=L.length-1;i>=0;i--){const w=L[i];
    if(w.dr){const u=G.byId.get(w.dr);if(!u||u.dead||u.inTun||!u.order||u.order.drg!==w.id){if(u)u.drg=0;w.dr=0;}else{w.x=u.x-Math.cos(u.ang)*7;w.y=u.y-Math.sin(u.ang)*7;if(Math.hypot(u.x-w.tx,u.y-w.ty)<24){u.drg=0;u.order=null;w.dr=0;w.x=w.tx;w.y=w.ty;FXE('txt',[w.x|0,w.y|0,'IN COVER',w.team,-2]);}}}
    let rate=0;for(const m of meds)if(ally(m.team,w.team)&&Math.abs(m.x-w.x)<26&&Math.abs(m.y-w.y)<26&&Math.hypot(m.x-w.x,m.y-w.y)<24){rate=1/WND_REV;break;}
    if(!rate)for(const b of aid)if(ally(b.team,w.team)&&Math.hypot(b.x-w.x,b.y-w.y)<b.size/2+90){rate=1/10;break;}
    if(rate){w.p+=rate*dt;if(w.p>=1){if(wndRevive(w))wndDrop(i);else w.p=.95;continue;}}
    if(G.t>=w.until){wndDrop(i,'BLED OUT');continue;}
    if(scan&&!w.dr&&!rate&&G.t-w.t0>2.5&&!(w.md&&w.mdT>G.t)&&!coverAt(w.x,w.y)&&!(G.rubN&&rubAt(w.x,w.y))){   // nobody coming: a squad mate drags him to cover
      let best=null,bd=80*80;nearby(w.x,w.y,90,BF_NB);for(const u of BF_NB){if(u.dead||u.isB||u.team!==w.team||!u.s||!isInf(u.s)||u.s.noAttack||u.kind==='medic'||u.kind==='hacker'||u.order||u.target||u.drg||u.inTun||u.aband||u.rout>G.t||u.hp<u.max*.35)continue;
        const d=(u.x-w.x)**2+(u.y-w.y)**2;if(d<bd){bd=d;best=u;}}
      if(best){const sp=wndCoverSpot(w);if(sp){w.tx=sp[0];w.ty=sp[1];w.dr=best.id;best.drg=w.id;best.order={type:'move',x:sp[0],y:sp[1],drg:w.id};best.path=null;FXE('txt',[best.x|0,best.y|0,'DRAGGING WOUNDED',best.team,-2]);}}}}
}
// host -> client: the wounded I can see or that are mine, once a second and whenever the list changes
function wdPack(T){if(!G.wnd)return null;if(T.wdV===G.wndV&&G.t<(T.wdT||0))return null;T.wdV=G.wndV;T.wdT=G.t+1.2;
  return{wd:G.wnd.filter(w=>ally(w.team,T.id)||(visAt(w.x,w.y,10)>>T.id&1)).map(w=>[w.id,w.x|0,w.y|0,w.team,Math.round(w.p*100),Math.round(Math.max(0,w.until-G.t)*10)])};}
function wdApply(L){G.wnd=L.map(v=>({id:v[0],x:v[1],y:v[2],team:v[3],p:v[4]/100,until:G.t+v[5]/10,kind:'inf',rank:0,xp:0}));G.wndN=G.wnd.length;G.wndV=(G.wndV|0)+1;}

/* ---------- damaged buildings ---------- */
function civStage(c){if(c.dead||!c.max)return;const f=c.hp/c.max,s=f>.66?0:f>.33?1:2;if(s>(c.stg|0)){c.stg=s;if(!c.dug)FXE('civs',[c.i,s]);civBail(c,s);}}
function civBail(c,s){if(!c.occ||!c.occ.length)return;
  if(s===1){for(const u of c.occ)u.fear=(u.fear||0)+.12;return;}
  const n=Math.ceil(c.occ.length/2),out=c.occ.splice(c.occ.length-n,n);
  out.forEach((u,i)=>{const a=i/Math.max(1,out.length)*6.283+c.i;const p=nearestPassXY('ground',c.x+Math.cos(a)*34,c.y+Math.sin(a)*34)||[c.x,c.y];u.x=p[0];u.y=p[1];u.inTun=false;u.inGar=null;u.mv=G.t;u.order=null;u.target=null;u.hp*=.85;u.fear=(u.fear||0)+.4;G.ents.push(u);G.byId.set(u.id,u);});
  if(out.length)log(out[0].team,`A building we hold is about to fall - ${out.length} soldier${out.length>1?'s':''} bailed out.`,'w');}
/* ---------- rubble clearing ---------- */
function rubFind(u,R){if(!G.rubN)return-1;const cx0=Math.floor(u.x/CELL),cy0=Math.floor(u.y/CELL),rc=Math.ceil(R/CELL);let best=-1,bd=R*R;
  for(let j=cy0-rc;j<=cy0+rc;j++)for(let i=cx0-rc;i<=cx0+rc;i++){if(i<0||j<0||i>=GW||j>=GH)continue;const k=j*GW+i;if(!G.rub[k])continue;const x=i*CELL+CELL/2,y=j*CELL+CELL/2,d=(x-u.x)**2+(y-u.y)**2;if(d<bd){bd=d;best=k;}}
  return best;}
function rubClear(u,dt){const o=u.order;if(!o||o.type!=='clr')return false;if(!G.rub||!G.rub[o.k]){u.order=null;return false;}
  const x=(o.k%GW)*CELL+CELL/2,y=((o.k/GW)|0)*CELL+CELL/2,d=Math.hypot(x-u.x,y-u.y);if(d>CELL*1.3){navTo(u,x,y,dt);return true;}
  u.building=true;u.ang=Math.atan2(y-u.y,x-u.x);u.lastFire=G.t;o.p=(o.p||0)+dt;if(o.p>=7){rubDo(o.k);u.order=null;FXE('txt',[x|0,y|0,'ROAD CLEARED',u.team,-2]);}return true;}
function rubDo(k){if(!G.rub||!G.rub[k])return;G.rub[k]=0;G.rubN--;try{if(G.bfHulk&&G.bfHulk.length)hulkGone(k);}catch(_){}const c=G.civAt&&G.civAt.get(k);if(c&&c.dead&&!c.ruin){c.clr=1;if(G.cover)G.cover[c.k]=Math.max(0,(G.cover[c.k]||0)-2);FXE('rubc',[c.i]);}G.gridV=(G.gridV|0)+1;G.civDirty=true;}
// idle Construction Vehicles clear rubble nearby when no enemy is around it
function rubIdle(u){if(!G.rubN)return false;u.rcT=(u.rcT||0)-1;if(u.rcT>0)return false;u.rcT=3;const k=rubFind(u,280);if(k<0)return false;const x=(k%GW)*CELL+CELL/2,y=((k/GW)|0)*CELL+CELL/2;if(wndFoes(x,y,u.team,260))return false;u.order={type:'clr',k};u.path=null;return true;}

/* ---------- dams & floods ---------- */
const DAM_SITES={rivers:[[0,.12,1],[1,.88,-1]],fulda:[[0,.14,1],[0,.86,-1]]};   // [river index, fraction along it, flood direction]
const DAM_HP=3000,FL_RISE=25,FL_HOLD=85,FL_FALL=60,FL_LEN=1200,FL_EXTRA=230;
function riverAt(rv,f){const P=rv.pts;let L=0;const acc=[0];for(let i=1;i<P.length;i++){L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);acc.push(L);}const s=f*L;let i=1;while(i<P.length-1&&acc[i]<s)i++;const seg=acc[i]-acc[i-1]||1,t=(s-acc[i-1])/seg;
  const tx=P[i][0]-P[i-1][0],ty=P[i][1]-P[i-1][1],tl=Math.hypot(tx,ty)||1;return{x:P[i-1][0]+tx*t,y:P[i-1][1]+ty*t,tx:tx/tl,ty:ty/tl,L,f};}
function damTarget(d){const ALL=new Array(16).fill(true);return{dam:d,isB:true,kind:'dam',x:d.x,y:d.y,r:30,size:60,team:-1,vs:ALL,s:{name:'Dam',armor:'bld'},get dead(){return d.dead;},get hp(){return d.hp;},get max(){return d.max;}};}
function initDams(){G.dams=null;G.fln=0;const M=G.map,sites=DAM_SITES[G.mapKey];if(!sites||!M||!M.rivers||!M.rivers.length)return;const out=[];
  for(const [ri,f,dir] of sites){const rv=M.rivers[ri];if(!rv)continue;const q=riverAt(rv,f);if(q.x<80||q.y<80||q.x>MAPW-80||q.y>MAPH-80)continue;
    const hw=rv.hw(f,q.x),d={i:out.length,ri,x:Math.round(q.x),y:Math.round(q.y),tx:+q.tx.toFixed(3),ty:+q.ty.toFixed(3),w:Math.round(hw+34),hp:DAM_HP,max:DAM_HP,dead:false,t0:0,dir,f,fin:false};
    Object.defineProperty(d,'tg',{value:damTarget(d),writable:true,enumerable:false});damCells(d,rv);out.push(d);}
  if(out.length)G.dams=out;}
// the cells a breach can flood: near the river downstream of the dam, up to FL_LEN along it. Map of cell -> [distance along, shore distance]
function damCells(d,rv){const M=G.map,P=rv.pts,samples=[];let L=0,start=-1;const acc=[0];for(let i=1;i<P.length;i++){L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);acc.push(L);}
  const s0=d.f*L;for(let s=0;s<=FL_LEN;s+=36){const sp=s0+d.dir*s;if(sp<0||sp>L)break;let i=1;while(i<P.length-1&&acc[i]<sp)i++;const seg=acc[i]-acc[i-1]||1,t=(sp-acc[i-1])/seg;samples.push([P[i-1][0]+(P[i][0]-P[i-1][0])*t,P[i-1][1]+(P[i][1]-P[i-1][1])*t,s]);}
  const fc=new Map();let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const q of samples){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  const RR=rv.hw(d.f,d.x)+FL_EXTRA+60;
  for(let j=Math.max(0,Math.floor((y0-RR)/CELL));j<=Math.min(GH-1,Math.floor((y1+RR)/CELL));j++)for(let i=Math.max(0,Math.floor((x0-RR)/CELL));i<=Math.min(GW-1,Math.floor((x1+RR)/CELL));i++){const x=i*CELL+CELL/2,y=j*CELL+CELL/2;let bd=1e9,bs=0;
    for(const q of samples){const dd=(q[0]-x)**2+(q[1]-y)**2;if(dd<bd){bd=dd;bs=q[2];}}if(bd>RR*RR)continue;const e=M.edge(x,y);if(e<-FL_EXTRA-10)continue;
    fc.set(j*GW+i,[Math.round(bs),Math.round(e)]);}
  Object.defineProperty(d,'fc',{value:fc,writable:true,enumerable:false});}
function damLevel(d){if(!d.dead)return 0;const t=G.t-d.t0;if(t<0)return 0;if(t<FL_RISE)return t/FL_RISE;if(t<FL_RISE+FL_HOLD)return 1;const q=(t-FL_RISE-FL_HOLD)/FL_FALL;return q>=1?0:1-q;}
function damFront(d){return d.dead?Math.min(FL_LEN+150,60+70*(G.t-d.t0)):0;}
// how flooded this spot is, 0..1
function floodAt(x,y){const D=G.dams;if(!D)return 0;const k=Math.floor(y/CELL)*GW+Math.floor(x/CELL);let best=0;
  for(const d of D){if(!d.dead||d.fin||!d.fc)continue;const c=d.fc.get(k);if(!c)continue;const lv=damLevel(d);if(lv<=0)continue;const f=Math.max(0,Math.min(1,(c[1]+FL_EXTRA*lv)/40))*Math.max(0,Math.min(1,(damFront(d)-c[0])/120));if(f>best)best=f;}return best;}
function floodSlow(u){const f=floodAt(u.x,u.y);if(f<.25)return 1;const cx=Math.floor(u.x/CELL),cy=Math.floor(u.y/CELL);if(G.grid[cy*GW+cx]===2)return .1;return isInf(u.s)?.5:u.s.armor==='heavy'?.4:.5;}
function damBreach(d,team){if(d.dead)return;d.dead=true;d.t0=G.t;d.hp=0;G.fln=(G.fln|0)+1;G.damV=(G.damV|0)+1;FXE('dam',[d.i,d.x,d.y]);
  for(const T of G.teams)log(T.id,'THE DAM HAS BEEN BREACHED! A flood wave is racing down the valley - get off the low ground, bridges are closed.','w');}
function damDamage(d,dmg,team){if(d.dead||dmg<=0)return;const p=Math.floor(d.hp/d.max*10);d.hp-=dmg;if(d.hp<=0){damBreach(d,team);return;}if(Math.floor(d.hp/d.max*10)!==p)G.damV=(G.damV|0)+1;}
function damBlast(x,y,r,dmg,wpn,team){const D=G.dams;if(!D)return;const m=VS[wpn]&&VS[wpn].bld;if(!m)return;for(const d of D){if(d.dead)continue;// distance from the blast to the dam wall (a segment across the river)
    const nx=-d.ty,ny=d.tx,u=(x-d.x)*nx+(y-d.y)*ny,v=(x-d.x)*d.tx+(y-d.y)*d.ty,du=Math.max(0,Math.abs(u)-d.w),dist=Math.hypot(du,v);if(dist>r)continue;damDamage(d,dmg*m*(1-.5*dist/r),team);}}
function floodTick(dt){const D=G.dams;if(!D||!G.fln)return;G.flS=(G.flS||0)-dt;if(G.flS>0)return;const st=.5-G.flS;G.flS=.5;
  for(const d of D){if(d.dead&&!d.fin&&G.t-d.t0>FL_RISE+FL_HOLD+FL_FALL){d.fin=true;G.fln=Math.max(0,(G.fln|0)-1);G.damV=(G.damV|0)+1;for(const T of G.teams)log(T.id,'The flood has receded.','g');}}
  if(!G.fln)return;
  for(const e of G.ents){if(e.dead||e.isB||e.inTun||!e.s||e.s.dom!=='ground')continue;const f=floodAt(e.x,e.y);if(f<.3)continue;
    if(isInf(e.s)){e.hp-=e.max*.035*st*f;e.fear=(e.fear||0)+.01;if(e.hp<=0){FXE('txt',[e.x|0,e.y|0,'SWEPT AWAY',-2,e.team]);kill(e,null,null);}}
    else if(e.hp>e.max*.2)e.hp=Math.max(e.max*.2,e.hp-e.max*(e.s.armor==='heavy'?.004:.008)*st*f);}
  if(G.wnd&&G.wnd.length)for(let i=G.wnd.length-1;i>=0;i--){const w=G.wnd[i];if(floodAt(w.x,w.y)>.5)wndDrop(i,'SWEPT AWAY');}
  if(G.dug&&G.dug.length)for(let i=G.dug.length-1;i>=0;i--){const q=G.dug[i];if(q.k!=='sand'&&q.k!=='hole'&&floodAt(q.x,q.y)>.7){G.dug.splice(i,1);G.dugBd=1;}}if(G.dugBd){G.dugBd=0;dugBump();}}
function damPack(T){const D=G.dams;if(!D)return null;if(T.dmV===G.damV&&T.dmN)return null;T.dmV=G.damV;T.dmN=1;return{dm:D.map(d=>[d.i,d.dead?1:0,Math.round(d.hp/d.max*100),Math.round(d.t0*10),d.fin?1:0])};}
function damApply(L){if(!G.dams)return;for(const v of L){const d=G.dams[v[0]];if(!d)continue;const was=d.dead;d.dead=!!v[1];d.hp=v[2]/100*d.max;d.t0=v[3]/10;d.fin=!!v[4];if(d.dead&&!was){FXE('dam',[d.i,d.x,d.y]);}}G.damV=(G.damV|0)+1;}
// AI: blow the dam whose flood would catch more of the enemy than of us (or our friends); a few strong units go and shell it
function aiDam(T,mine){const D=G.dams;if(!D||T.ai.d<1||T.ai.t%7!==2||G.t<150)return;
  for(const d of D){if(d.dead||!d.fc)continue;if(d.aiT&&G.t<d.aiT)continue;let en=0,fr=0;for(const e of G.ents){if(e.dead||e.isB||e.inTun||!e.s||e.s.dom!=='ground'||e.kind==='harv')continue;const c=d.fc.get(Math.floor(e.y/CELL)*GW+Math.floor(e.x/CELL));if(!c||c[0]>FL_LEN)continue;if(ally(e.team,T.id))fr++;else en++;}
    if(en<5||en<fr*2)continue;const U=mine.filter(e=>!e.isB&&!e.dead&&!e.inTun&&e.s.dom==='ground'&&e.s.dmg>0&&!e.s.noAttack&&e.kind!=='harv'&&e.kind!=='dozer'&&canTarget(e.s,d.tg)&&(e.s.armor==='heavy'||e.s.cls==='arty'));if(!U.length)continue;
    U.sort((a,b)=>Math.hypot(a.x-d.x,a.y-d.y)-Math.hypot(b.x-d.x,b.y-d.y));d.aiT=G.t+60;for(const u of U.slice(0,6)){u.order={type:'attack',target:d.tg};u.guard=null;u.path=null;}return;}}
function bfTick(dt){bfeelTick(dt);if(G.wnd&&G.wnd.length)wndTick(dt);if(G.dams)floodTick(dt);}
function damSync(){if(!G.dams)return;const M=G.map;G.fln=0;for(const d of G.dams){const rv=M.rivers[d.ri];if(!d.tg)Object.defineProperty(d,'tg',{value:damTarget(d),writable:true,enumerable:false});if(rv&&!d.fc)damCells(d,rv);if(d.dead&&!d.fin)G.fln++;}}
function damAt(w){const D=G.dams;if(!D)return-1;for(const d of D){if(d.dead)continue;const nx=-d.ty,ny=d.tx,u=(w.x-d.x)*nx+(w.y-d.y)*ny,v=(w.x-d.x)*d.tx+(w.y-d.y)*d.ty;if(Math.abs(u)<d.w+20&&Math.abs(v)<46)return d.i;}return-1;}
// AI: keep a couple of Combat Medics with the infantry (same medic, same price as the player's)
function aiMedic(T,mine){if(T.ai.t%5!==3||T.credits<900)return;let inf=0,med=0;for(const e of mine)if(!e.isB&&!e.dead){if(e.kind==='medic')med++;else if(e.s&&isInf(e.s)&&!e.s.noAttack)inf++;}if(med>=2||inf<6)return;if(T.q&&T.q.barracks&&T.q.barracks.some(q=>q&&q.kind==='medic'))return;try{enqueue(T.id,'medic');}catch(_){}}
