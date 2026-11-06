/* ================= BATTLEFEEL (Abdullah 2026-11-05 19:01): wind, drifting smoke, wildfires, wreck cover, shouts, auto-build =================
   Authoritative sim on the host only (clients get effects through FXE 'bfx' / 'bfh' / 'shout' and the team panel 'au').
   WIND      one wind per battle, a pure function of the seed, the game clock and the weather: bfWind() -> {x,y,s}. No state.
   SMOKE     coarse grid (80 px cells, G.bfD). Sources: smoke grenades/screens (G.smokes, whose discs now drift too), burning
             wrecks (G.bfHulk), wildfires. Advected by the wind, thinning over time. smokeBlock(a,b) is the line-of-sight
             check used by updateVis (a spotter on the ground cannot see through a thick cloud; aircraft can).
   WILDFIRE  fuel grid on the 40 px terrain cells (forest 3, grass 1-2, none on roads/snow/water/buildings); big blasts ignite
             it (more in summer/dry/sandstorm, none in rain-soaked or snowy weather), fire spreads downwind on a 1 s step, burns
             out and leaves scorched ground. Burning cells hurt and frighten infantry, slow every ground unit, and make smoke.
   HULKS     a destroyed tank/vehicle stays as a burned-out wreck: its cell joins the rubble grid (G.rub: tanks must route
             around it, infantry cross it) and adds cover; smokes ~75 s; at most BF_HULK_MAX kept (oldest fades); the rubble
             clearing orders of Construction Vehicles/Dozers remove it (rubDo -> hulkGone).
   AUTO-BUILD T.auto = {on, list:[{k,n}]}: standing "keep n of kind k" orders, topped up through enqueue() like a click.
   SHOUTS    short combat callouts triggered by real sim events, throttled, sent as FXE('shout',[type,x,y,team,medic]).
   Saves/host migration: G.bfFire, G.bfScorch, G.bfHulk, G.bfSmS (sparse smoke cells, refreshed every tick) and the timers are in CK_G;
   the dense grids are rebuilt by bfSync() and every random draw is a pure hash (bfRnd), so a loaded save replays exactly. */
const BF_SC=80,BF_HULK_MAX=36,BF_FIRE_MAX=420;
const BF_SHOUT=['rpg','manDown','reload','grenade','contact','tank','medic'];
// stateless seeded random in [0,1): a pure function of (seed, game clock, a, b), so a loaded save or a migrated host replays exactly
function bfRnd(a,b){let h=((((G.seed||1)|0)^Math.imul(a|0,0x9E3779B1)^Math.imul(b|0,0x85EBCA6B)^Math.imul((G.t*20)|0,0xC2B2AE35))>>>0);h^=h>>>15;h=Math.imul(h,0x2C1B3C6D);h^=h>>>12;h=Math.imul(h,0x297A2D39);h^=h>>>15;return (h>>>0)/4294967296;}
function bfWind(){const wk=(G.wx&&G.wx.k)||'clear',base=({clear:8,rain:12,fog:3,sandstorm:34,snow:10,blizzard:38})[wk]||8;const s0=(((G.seed||1)*2654435761)>>>0);
  const a=(s0%6283)/1000+.8*Math.sin(G.t/210)+.35*Math.sin(G.t/57+1.3),sp=base*(1+.35*Math.sin(G.t/91+(s0%7)));return{x:Math.cos(a)*sp,y:Math.sin(a)*sp,s:sp};}
function bfInit(){if(G.bfD&&G.bfD.g===G)return;G.bfW=Math.ceil(MAPW/BF_SC);G.bfH=Math.ceil(MAPH/BF_SC);G.bfD=new Float32Array(G.bfW*G.bfH);G.bfD.g=G;G.bfD2=new Float32Array(G.bfW*G.bfH);G.bfN=0;
  G.bfFire=G.bfFire||[];G.bfScorch=G.bfScorch||[];G.bfHulk=G.bfHulk||[];G.bfT=G.bfT||0;G.bfFN=G.bfFire.length;}
// ---------- smoke grid ----------
function bfSmokeAt(x,y){const D=G.bfD;if(!D)return 0;const i=Math.floor(x/BF_SC),j=Math.floor(y/BF_SC);return i>=0&&j>=0&&i<G.bfW&&j<G.bfH?D[j*G.bfW+i]:0;}
// optical depth along a segment; true when a spotter cannot see through it (close targets are always visible)
function smokeBlock(x0,y0,x1,y1){if(!G.bfN)return false;const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy);if(L<100)return false;const n=Math.min(24,Math.ceil(L/50)),st=L/n/BF_SC;let sum=0;
  for(let i=1;i<n;i++){sum+=bfSmokeAt(x0+dx*i/n,y0+dy*i/n)*st;if(sum>=.55)return true;}return false;}
function bfSmkStep(dt,w){const W=G.bfW,H=G.bfH,A=G.bfD,B=G.bfD2,ax=w.x*dt/BF_SC,ay=w.y*dt/BF_SC,wk=(G.wx&&G.wx.k)||'clear',dec=Math.pow(wk==='rain'?.93:wk==='sandstorm'?.985:.96,dt);let n=0;const S=[];
  const g=(x,y)=>x<0||y<0||x>=W||y>=H?0:A[y*W+x];
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const sx=i-ax,sy=j-ay,x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;
    let v=g(x0,y0)*(1-fx)*(1-fy)+g(x0+1,y0)*fx*(1-fy)+g(x0,y0+1)*(1-fx)*fy+g(x0+1,y0+1)*fx*fy;
    const nb=(g(i-1,j)+g(i+1,j)+g(i,j-1)+g(i,j+1))*.25;v=(v*.9+nb*.1)*dec-.002;if(v<.01)v=0;else if(v>1.5)v=1.5;B[j*W+i]=v;if(v>0)S.push(j*W+i,v);if(v>.08)n++;}
  B.g=G;G.bfD=B;G.bfD2=A;G.bfN=n;G.bfSmS=S;}
function bfSmkAdd(x,y,v){const i=Math.floor(x/BF_SC),j=Math.floor(y/BF_SC);if(i<0||j<0||i>=G.bfW||j>=G.bfH)return;const k=j*G.bfW+i;G.bfD[k]=Math.min(1.5,G.bfD[k]+v);}
// ---------- wildfire ----------
function bfDry(){const s=G.ssn===3?0:G.ssn===2?.35:1,wk=(G.wx&&G.wx.k)||'clear',w=({clear:1,rain:.08,fog:.6,sandstorm:1.3,snow:0,blizzard:0})[wk];return s*(w==null?1:w);}
function bfFuel(){if(G.bfFuel&&G.bfFuel.g===G)return G.bfFuel;const F=new Uint8Array(GW*GH);F.g=G;const th=(MAPS[G.mapKey]||{}).theme,rm=G.roadMask,M=G.map;
  for(let k=0;k<GW*GH;k++){if(G.grid[k]!==0)continue;const h=((k*2654435761)>>>0)%100;F[k]=th==='snow'?0:th==='green'?(h<70?1:h<85?2:0):(h<38?1:h<48?2:0);}
  for(const w of (M&&M.woods)||[]){const r=w.r*WK*1.05,x0=Math.max(0,Math.floor((w.x*WK-r)/CELL)),x1=Math.min(GW-1,Math.floor((w.x*WK+r)/CELL)),y0=Math.max(0,Math.floor((w.y*WK-r)/CELL)),y1=Math.min(GH-1,Math.floor((w.y*WK+r)/CELL));
    for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){const k=j*GW+i;if(G.grid[k]!==0)continue;const dx=i*CELL+CELL/2-w.x*WK,dy=j*CELL+CELL/2-w.y*WK;if(dx*dx+dy*dy<r*r)F[k]=th==='snow'?0:3;}}
  if(rm&&rm.d)for(let k=0;k<GW*GH;k++){const x=(k%GW)*CELL+CELL/2,y=((k/GW)|0)*CELL+CELL/2;if(rm.d[((y/rm.C)|0)*rm.w+((x/rm.C)|0)])F[k]=0;}
  for(const k of (G.bfScorch||[]))F[k]=0;G.bfFuel=F;return F;}
function bfBurning(){if(!G.bfBurn||G.bfBurn.g!==G){G.bfBurn=new Map();G.bfBurn.g=G;for(const f of G.bfFire)G.bfBurn.set(f.k,f);}return G.bfBurn;}
function fireAt(x,y){if(!G.bfFN)return 0;const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);return cx>=0&&cy>=0&&cx<GW&&cy<GH&&bfBurning().has(cy*GW+cx)?1:0;}
function fireIgnite(k){const B=bfBurning();if(B.has(k)||G.bfFire.length>=BF_FIRE_MAX)return false;const F=bfFuel();if(!F[k])return false;if(G.bocc&&G.bocc[k])return false;
  const fu=F[k],wk=(G.wx&&G.wx.k)||'clear',f={k,e:+(G.t+(fu*14+8)*(wk==='rain'?.5:1)).toFixed(1),h:fu};G.bfFire.push(f);B.set(k,f);G.bfFN=G.bfFire.length;return true;}
const BF_HOT={sup:.9,thermo:1,bomb:.4,boom:.35,super:.55,shell:.16,missile:.2,bb:.2,demo:.1,at:.05};
// called from explode(): a blast may light the ground it lands on
function fireHit(x,y,r,wpn){if(MODE==='client')return;const dry=bfDry();if(dry<=.02)return;const p=(BF_HOT[wpn]||.08)*dry;if(p<=.01)return;bfInit();const F=bfFuel(),R=Math.min(80,Math.max(20,r*.9)),
    x0=Math.floor((x-R)/CELL),x1=Math.floor((x+R)/CELL),y0=Math.floor((y-R)/CELL),y1=Math.floor((y+R)/CELL);
  for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){if(i<0||j<0||i>=GW||j>=GH)continue;const k=j*GW+i,dx=i*CELL+CELL/2-x,dy=j*CELL+CELL/2-y;if(dx*dx+dy*dy>R*R||!F[k])continue;if(bfRnd(k,(x|0)+3)<p*F[k]/2.2)fireIgnite(k);}}
function fireSlow(u){if(!G.bfFN)return 1;return fireAt(u.x,u.y)?(isInf(u.s)?.5:.78):1;}
function fireTick(dt,w){const L=G.bfFire;if(!L.length)return;const B=bfBurning(),F=bfFuel(),dry=bfDry(),wk=(G.wx&&G.wx.k)||'clear',ws=Math.min(1.6,w.s/10),wl=Math.hypot(w.x,w.y)||1,ux=w.x/wl,uy=w.y/wl;let j=0;
  const NB=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  for(let q=0;q<L.length;q++){const f=L[q];const x=(f.k%GW)*CELL+CELL/2,y=((f.k/GW)|0)*CELL+CELL/2;
    if(G.t>=f.e||(wk==='rain'&&bfRnd(f.k,99)<.05*dt)||G.ssn===3){B.delete(f.k);F[f.k]=0;G.bfScorch.push(f.k);(G.bfNewSc=G.bfNewSc||[]).push(f.k);continue;}
    L[j++]=f;bfSmkAdd(x,y,.3*dt*(f.h>=3?1.4:1));
    if(dry>.05)for(let n=0;n<8;n++){const cx=(f.k%GW)+NB[n][0],cy=((f.k/GW)|0)+NB[n][1];if(cx<0||cy<0||cx>=GW||cy>=GH)continue;const k=cy*GW+cx;if(!F[k]||B.has(k))continue;
      const dl=Math.hypot(NB[n][0],NB[n][1]),al=(NB[n][0]*ux+NB[n][1]*uy)/dl,wf=Math.max(.12,1+.95*al*ws),pr=.085*F[k]/dl*dry*wf*dt;if(bfRnd(k,100+f.k+n)<pr)fireIgnite(k);}
    nearby(x,y,34,BF_NB);for(const e of BF_NB){if(e.dead||e.isB||!e.s||e.s.dom!=='ground'||Math.hypot(e.x-x,e.y-y)>30)continue;if(isInf(e.s)){applyDmg(e,5*dt,'gun',null,null,false);e.fear=(e.fear||0)+.05*dt;}else if(e.s.armor==='light')applyDmg(e,1.5*dt,'gun',null,null,false);}}
  L.length=j;G.bfFN=j;}
// ---------- hulks ----------
function hulkAdd(e){if(MODE==='client'||!e.s||e.s.dom!=='ground'||!isVeh(e.s))return;bfInit();const k=Math.floor(e.y/CELL)*GW+Math.floor(e.x/CELL);if(k<0||k>=GW*GH||G.grid[k]!==0)return;
  for(const h of G.bfHulk)if(h.k===k)return;
  // never wall in a narrow pass: at least 6 of the 8 neighbours must be open ground
  let open=0;const cx=k%GW,cy=(k/GW)|0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){if(!i&&!j)continue;const X=cx+i,Y=cy+j;if(X>=0&&Y>=0&&X<GW&&Y<GH&&G.grid[Y*GW+X]===0&&!(G.rub&&G.rub[Y*GW+X]))open++;}if(open<6)return;
  if(G.bfHulk.length>=BF_HULK_MAX)hulkGone(G.bfHulk[0].k,true);
  if(!G.rub||G.rub.length!==GW*GH){G.rub=new Uint8Array(GW*GH);G.rubN=0;}if(G.rub[k])return;G.rub[k]=1;G.rubN++;G.gridV=(G.gridV|0)+1;
  if(G.cover)G.cover[k]=Math.min(255,G.cover[k]+3);G.bfHulk.push({k,x:e.x|0,y:e.y|0,t:+G.t.toFixed(1)});
  if(bfDry()>.05&&bfRnd(k,5)<.3*bfDry())fireIgnite(k);}
function hulkGone(k,fade){const L=G.bfHulk;if(!L)return;const i=L.findIndex(h=>h.k===k);if(i<0)return;L.splice(i,1);if(G.cover)G.cover[k]=Math.max(0,G.cover[k]-3);
  if(G.rub&&G.rub[k]){G.rub[k]=0;G.rubN--;G.gridV=(G.gridV|0)+1;}FXE('bfh',[k,fade?1:0]);}
function bfSync(){G.bfD=null;bfInit();G.bfFN=G.bfFire.length;G.bfBurn=null;G.bfFuel=null;const S=G.bfSmS||[];let n=0;for(let i=0;i+1<S.length;i+=2){G.bfD[S[i]]=S[i+1];if(S[i+1]>.08)n++;}G.bfN=n;
  if(!G.bfHulk.length)return;if(!G.rub||G.rub.length!==GW*GH){G.rub=new Uint8Array(GW*GH);G.rubN=0;}let c=0;for(const h of G.bfHulk){if(!G.rub[h.k]){G.rub[h.k]=1;G.rubN++;c++;}if(G.cover)G.cover[h.k]=Math.min(255,G.cover[h.k]+3);}if(c)G.gridV=(G.gridV|0)+1;}
// ---------- the one tick (1 s steps) ----------
function bfeelTick(dt){if(MODE==='client'||!G||G.over||!G.ents)return;bfInit();G.bfT+=dt;if(G.bfT<1)return;const st=G.bfT;G.bfT=0;const w=bfWind();G.bfWd=w;
  // grenade/screen smoke drifts with the wind (its disc is what hides units inside it) and feeds the grid
  if(G.smokes)for(const S of G.smokes){if(S.t<=G.t)continue;S.x=Math.max(0,Math.min(MAPW,S.x+w.x*st*.7));S.y=Math.max(0,Math.min(MAPH,S.y+w.y*st*.7));const R=Math.ceil(S.r/BF_SC);
    for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++)if(i*i+j*j<=R*R+1)bfSmkAdd(S.x+i*BF_SC*.9,S.y+j*BF_SC*.9,.55*st);}
  for(const h of G.bfHulk){const age=G.t-h.t;if(age<75)bfSmkAdd(h.x,h.y,(age<40?.16:.09)*st);}
  fireTick(st,w);bfSmkStep(st,w);
  if(G.bfScorch.length>1500)G.bfScorch.splice(0,G.bfScorch.length-1500);
  // effects for every screen (small): wind + densest smoke cells, burning cells, new scorch, every ~2 s
  G.bfFxT=(G.bfFxT||0)-st;if(G.bfFxT<=0){G.bfFxT=2;let sm=[];const D=G.bfD;for(let k=0;k<D.length;k++)if(D[k]>.12)sm.push([k,Math.round(D[k]*20)]);
    if(sm.length>130){sm.sort((a,b)=>b[1]-a[1]);sm.length=130;}sm=sm.flat();
    const fi=[];for(const f of G.bfFire)if(fi.length<240)fi.push(f.k,f.h|0);const sc=(G.bfNewSc||[]).splice(0,80);
    if(sm.length||fi.length||sc.length||G.bfSent)FXE('bfx',[+w.x.toFixed(1),+w.y.toFixed(1),sm,fi,sc]);G.bfSent=sm.length||fi.length;}
  bfAutoTick();}
// ---------- shouts ----------
function shout(e,type){if(MODE==='client'||!e||e.dead||e.isB||e.team==null||G.noShout)return;const T=G.teams[e.team];if(!T)return;const t=G.t;
  if(t-(T._shT||-9)<1.6||t-(e._shT||-99)<9)return;const ty=BF_SHOUT.indexOf(type);if(ty<0)return;const m=T._shM||(T._shM={});if(t-(m[type]||-99)<(type==='contact'?14:type==='tank'?11:type==='medic'?7:8))return;
  T._shT=t;e._shT=t;m[type]=t;FXE('shout',[ty,e.x|0,e.y|0,e.team]);}
// called at the top of fire(): infantry callouts
function bfShoutFire(src,t,wpn,splash){if(src.isB||!src.s||!isInf(src.s)||G.noShout)return;
  if(wpn==='at'){shout(src,'rpg');if(t&&!t.isB&&t.s&&isVeh(t.s)&&t.team!==src.team)for(const o of nearby(src.x,src.y,120,DS_N))if(!o.dead&&!o.isB&&o!==src&&o.team===src.team&&isInf(o.s)){shout(o,'tank');break;}return;}
  if(splash&&src.s.cls!=='arty'){shout(src,'grenade');return;}
  if(src.am!==undefined&&src.am===0)shout(src,'reload');
  else if(t&&!t.isB&&t.s&&isVeh(t.s)&&t.team!==src.team)shout(src,'tank');
  else if(t&&!t.isB&&G.t-(src._lfS||-99)>5&&G.t-(src.lastFire||-99)>4){src._lfS=G.t;shout(src,'contact');}
  else src._lfS=G.t;}
function bfShoutDown(e){if(e.isB||!e.s||!isInf(e.s)||e.crew||G.noShout||MODE==='client')return;for(const o of nearby(e.x,e.y,150,DS_N))if(!o.dead&&!o.isB&&o!==e&&o.team===e.team&&o.s&&isInf(o.s)&&!o.s.noAttack){shout(o,'manDown');return;}}
// ---------- smart auto-build ----------
function bfAuPack(T){const A=T.auto;return A&&A.list&&A.list.length?[A.on?1:0,A.list.map(i=>[i.k,i.n])]:0;}
function bfAuUnpack(d){if(!d||!Array.isArray(d[1]))return null;return{on:!!d[0],list:d[1].map(([k,n])=>({k,n}))};}
function autoCmd(team,a){const T=G.teams[team];if(!T||T.out)return;const A=T.auto||(T.auto={on:true,list:[]});const k=a.k;
  if(k==='_on'){A.on=!!a.ti;return;}if(k==='_clr'){A.list.length=0;return;}
  if(typeof k!=='string'||!allUnits(T.fac).includes(k))return;
  const i=A.list.findIndex(x=>x.k===k),n=Math.max(0,Math.min(80,a.ti|0));
  if(a.ci===1||a.ci===2){if(i<0)return;const j=a.ci===1?i-1:i+1;if(j<0||j>=A.list.length)return;const t=A.list[i];A.list[i]=A.list[j];A.list[j]=t;return;}
  if(n===0){if(i>=0)A.list.splice(i,1);return;}if(i>=0)A.list[i].n=n;else if(A.list.length<10)A.list.push({k,n});}
// every 2 s per human team: the first entry (by priority) that is short and affordable gets one more unit queued per factory
function bfAutoTick(){G.auT=(G.auT||0)-1;if(G.auT>0)return;G.auT=2;
  for(const T of G.teams){const A=T.auto;if(!A||!A.on||!A.list.length||T.out||T.ai)continue;const used={};
    for(const it of A.list){const k=it.k;if(!allUnits(T.fac).includes(k))continue;const s=stats(T.fac,k);if(!done(T.id,s.from))continue;if(unitCount(T.id,k)>=it.n)continue;
      if(s.limit&&unitCount(T.id,k)>=s.limit)continue;
      const cst=Math.round(s.cost*gdCostK(T,s,false));if(T.credits<cst)break;   // save up for the higher priority
      if(used[s.from]||T.q[s.from].length>=3)continue;if(enqueue(T.id,k))used[s.from]=1;}}}
