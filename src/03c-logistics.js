/* ---------- LOGISTICS: roads you build, supply network, cut-off towns (orch/logistics, 2026-11-05) ----------
   The static town roads (M.roadNet) and the roads engineers build form a graph: nodes = bases + towns/hamlets, edges = road
   polylines. Each team's SUPPLY NETWORK = every node reachable from its base over uncratered roads without crossing a node an
   enemy holds. An owned town outside it is CUT OFF (no ammo from its supply circle, tax -50%, unrest up). A town reached only
   through nodes you or allies hold gets the TRADE ROUTE bonus (+25% tax, calmer). Big shell / bomb / missile blasts on a road
   crater it (the link is cut for ~150 s, a friendly construction vehicle nearby repairs it 6x faster).
   Everything here is deterministic (no random numbers); the host computes, clients get G.lgd + the town flags in teamGlobals.
   State: G.lg (static graph, rebuilt from the map) and G.lgd (dynamic: built roads rb, craters cr, jobs job, blast damage dm). */
const LG_COST=.09,LG_SPD=60,LG_CRATER_T=150,LG_CRATER_HP=240,LG_TRADE=1.25,LG_CUT=.5;
function lgInit(){const M=G.map,L=G.lg={N:[],E:[],reach:null,trade:null,sig:'',ref:null,tn:{}};G.lgd={v:0,rb:[],cr:{},job:[],dm:{},id:1,mn:[],ck:[],bd:{},pt:[],bv:0};
  BASES.forEach((b,i)=>L.N.push({x:b[0],y:b[1],b:i,t:-1}));
  for(const c of (M.cities||[])){let ti=-1;for(const t of G.towns)if(t.x===c.x&&t.y===c.y){ti=t.i;break;}L.N.push({x:c.x,y:c.y,b:-1,t:ti});if(ti>=0)L.tn[ti]=L.N.length-1;}
  const nodeAt=p=>{let b=-1,bd=300;L.N.forEach((n,i)=>{const d=Math.hypot(n.x-p[0],n.y-p[1]);if(d<bd){bd=d;b=i;}});return b;};
  for(const rp of (M.roadNet||[])){if(!rp||rp.length<2)continue;const a=nodeAt(rp[0]),b=nodeAt(rp[rp.length-1]);if(a<0||b<0||a===b)continue;L.E.push(lgEdge(a,b,rp,-1));}
  L.n0=L.E.length;L.nS=L.N.length;L.nB0=(M.bridges||[]).length;L.bvA=0;L.en={};L.dsig='';L.dl=[];}
function lgEdge(a,b,pts,team){const cum=[0];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i<pts.length;i++){if(i)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));x0=Math.min(x0,pts[i][0]);y0=Math.min(y0,pts[i][1]);x1=Math.max(x1,pts[i][0]);y1=Math.max(y1,pts[i][1]);}return{a,b,pts,cum,len:cum[cum.length-1],team,bb:[x0,y0,x1,y1]};}
// stamp a polyline into the road mask (same footprint as the map's roads) so units drive faster on it and the ground shows gravel
function lgStamp(pts){const rm=G.roadMask;if(!rm)return;const C=rm.C,w=rm.w,h=rm.h;
  const cells=[];for(let i=1;i<pts.length;i++){const L=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]),k=Math.max(1,Math.ceil(L/8));for(let j=(i>1?1:0);j<=k;j++)cells.push([(pts[i-1][0]+(pts[i][0]-pts[i-1][0])*j/k)/C|0,(pts[i-1][1]+(pts[i][1]-pts[i-1][1])*j/k)/C|0]);}
  for(const [ci,cj] of cells){for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const x=ci+i,y=cj+j;if(x>=0&&y>=0&&x<w&&y<h&&Math.hypot(i,j)<=2)rm.d[y*w+x]=1;}}
  if(rm.f)for(const [ci,cj] of cells){for(let i=-7;i<=7;i++)for(let j=-7;j<=7;j++){const x=ci+i,y=cj+j;if(x<0||y<0||x>=w||y>=h)continue;const v=1-Math.max(0,(Math.hypot(i,j)-2)/5);if(v>rm.f[y*w+x])rm.f[y*w+x]=v;}}
  G.roadV=(G.roadV|0)+1;}
// rebuild the derived edge list after the dynamic state changed (new built road, checkpoint restore, client update)
function lgSync(){const L=G.lg,D=G.lgd;if(!L||!D)return;lgPontSync();L.E.length=L.n0;for(const r of D.rb)L.E.push(lgEdge(r.a,r.dp?(L.en[r.dp]??r.a):r.b,r.pts,r.team));{const nN=L.N.length;for(const e of L.E)if(!(e.a>=0&&e.a<nN&&e.b>=0&&e.b<nN))e.a=e.b=0;}   /* a road whose depot node is gone (depot destroyed, node list rebuilt) becomes inert instead of crashing the sim */
  lgLinks();lgBrApply();
  const keep=L.ref===D?(L.stamped|0):0;for(let i=keep;i<D.rb.length;i++)lgStamp(D.rb[i].pts);L.stamped=D.rb.length;L.ref=D;L.sig='';}
function lgNodeOwn(n,k){if(n.e)return ally(n.tm,k);if(n.b>=0)return n.b<G.teams.length&&!G.teams[n.b].reb&&ally(n.b,k)&&!G.teams[n.b].out;if(n.t>=0){const t=G.towns[n.t];return t.ow>=0&&ally(t.ow,k);}return false;}
function lgNodeFoe(n,k){if(n.e)return !ally(n.tm,k);if(n.b>=0)return n.b!==k&&n.b<G.teams.length&&!ally(n.b,k)&&!G.teams[n.b].reb&&!G.teams[n.b].out;if(n.t>=0){const t=G.towns[n.t];return t.reb>G.t||(t.ow>=0&&!ally(t.ow,k));}return false;}
// recompute reach (permissive: over neutral nodes too) and trade (own nodes only) per team; only when something changed
function lgCompute(){const L=G.lg,D=G.lgd,n=L.N.length,Nt=G.teams.length;
  L.reach=[];L.trade=[];const adj=L.N.map(()=>[]);const ad=(a,b,i)=>{if(a===b||a==null||b==null)return;adj[a].push([b,i]);adj[b].push([a,i]);};
  L.E.forEach((e,i)=>ad(e.a,e.b,i));for(let j=L.nS;j<n;j++)for(const [m,i] of (L.dl[j]||[]))ad(j,m,i);
  for(let k=0;k<Nt;k++){const T=G.teams[k];if(T.reb||T.out){L.reach.push(null);L.trade.push(null);continue;}
    for(const mode of [0,1]){const seen=new Uint8Array(n),q=[];for(let i=0;i<n;i++){const nd=L.N[i];if((nd.b>=0||(nd.port&&!lgPortBlk(nd)))&&lgNodeOwn(nd,k)){seen[i]=1;q.push(i);}}
      while(q.length){const i=q.pop();for(const [j,ei] of adj[i]){if(seen[j])continue;if(ei>=0&&lgBlk(ei,k))continue;const nd=L.N[j];if(mode?!lgNodeOwn(nd,k):lgNodeFoe(nd,k))continue;seen[j]=1;q.push(j);}}
      (mode?L.trade:L.reach).push(seen);}}
  for(const t of G.towns){const ni=L.tn[t.i];t.cut=0;t.trade=0;t.al=0;if(t.ow<0||ni==null)continue;if(!L.reach[t.ow])continue;
    if(!L.reach[t.ow][ni]){if(t.air>G.t)t.al=1;else t.cut=1;}else if(L.trade[t.ow][ni])t.trade=1;}
  for(let j=L.nS;j<n;j++){const nd=L.N[j],e=G.byId.get(nd.e);if(!e)continue;const r=L.reach[nd.tm];e.lcut=r&&!r[j]&&!(e.air>G.t)?1:0;}
  G.lgv=(G.lgv|0)+1;}
// is road edge i closed for team k: cratered, over a blown bridge, or held by an enemy checkpoint
function lgBlk(i,k){const D=G.lgd,c=D.cr[i];if(c&&c.t>G.t)return true;const e=G.lg.E[i],B=G.map.bridges;if(e&&e.br)for(const b of e.br)if(B[b]&&B[b].dead)return true;
  if(D.ck)for(const q of D.ck)if(q.ei===i&&!ally(q.team,k))return true;return false;}
function lgPortBlk(nd){if(MODE==='client')return !!(G.lgPb&&G.lgPb.has(nd.e));const e=G.byId.get(nd.e);return !!(e&&e.blk);}
function lgTick(st){if(!G.towns||!G.lg||!G.lgd)return;const L=G.lg,D=G.lgd;lgFix(D);if(L.ref!==D||L.E.length!==L.n0+D.rb.length)lgSync();lgDyn();lgBridges(st);lgPorts();lgCkTick();lgAirTick();
  // craters heal on their own, six times faster with a friendly construction vehicle next to them
  for(const k of Object.keys(D.cr)){const c=D.cr[k];let rate=1;for(const e of G.ents)if(e.kind==='dozer'&&!e.dead&&Math.hypot(e.x-c.x,e.y-c.y)<170){rate=6;break;}c.t-=(rate-1)*st;if(c.t<=G.t){delete D.cr[k];D.v++;D.dm[k]=0;}}
  let s='';for(const t of G.towns)s+=(t.ow+1)+(t.reb>G.t?'r':'')+',';for(const k of Object.keys(D.cr))s+='c'+k;for(const t2 of G.teams)s+=t2.out?'o':'';s+='|'+D.rb.length+'|'+L.dsig+'|'+D.bv+'|';for(const q of D.ck)s+=q.id+',';for(let j=L.nS;j<L.N.length;j++)s+=lgPortBlk(L.N[j])?'b':'.';for(const t of G.towns)if(t.air>G.t)s+='a'+t.i;
  if(s!==L.sig||!L.reach){L.sig=s;const c0=G.towns.map(t=>t.cut|0);lgCompute();
    for(const t of G.towns){if(t.ow>=0&&t.cut&&!c0[t.i]){log(t.ow,`${t.name} is CUT OFF from your supply network - reconnect the road, retake the link or build a bypass.`,'bad');FXE('tping',[t.ow,t.x|0,t.y|0,0]);}
      else if(t.ow>=0&&!t.cut&&c0[t.i])log(t.ow,`${t.name} is back on your supply network.`,'g');}
    for(let j=L.nS;j<L.N.length;j++){const e=G.byId.get(L.N[j].e);if(!e||e.kind!=='depot')continue;if(e.lcut&&!e.lcut0)log(e.team,'A forward Supply Depot is CUT OFF from your supply network - half range until a road links it again.','bad');else if(!e.lcut&&e.lcut0)log(e.team,'Your forward Supply Depot is back on the supply network.','g');e.lcut0=e.lcut;}}
  lgJobs(st);lgConvoys(st);lgToll(st);terrUpdate();}
// ---- building roads ----
function lgPathTo(team,ti){const L=G.lg,tn=L.tn[ti];if(tn==null)return null;const to=L.N[tn];
  // start from the nearest node already on the team's trade network (own base / own towns joined to it)
  let from=-1,bd=1e18;const tr=L.trade&&L.trade[team];for(let i=0;i<L.N.length;i++){if(i===tn)continue;const nd=L.N[i];const ok=nd.b===team||(tr&&tr[i]&&lgNodeOwn(nd,team)&&nd.t>=0);if(!ok)continue;const d=Math.hypot(nd.x-to.x,nd.y-to.y);if(d<bd){bd=d;from=i;}}
  if(from<0)return null;const fn=L.N[from];let pts=roadRoute(G.grid,fn.x,fn.y,to.x,to.y,60000);if(!pts||pts.length<2)return null;
  pts=pts.map(p=>[Math.round(p[0]),Math.round(p[1])]);pts[0]=[Math.round(fn.x),Math.round(fn.y)];pts[pts.length-1]=[Math.round(to.x),Math.round(to.y)];return{a:from,b:tn,pts};}
function lgRoadCmd(team,a){if(G.grand)return;if(!G.lg||!G.lgd||!G.conq)return;const t=G.towns[a.ti|0];if(!t||t.ow<0||!ally(t.ow,team))return;const L=G.lg,D=G.lgd,tn=L.tn[t.i];if(tn==null)return;
  if(L.trade&&L.trade[team]&&L.trade[team][tn])return;   // already joined to your network by your own towns
  let job=D.job.find(j=>j.team===team&&j.b===tn&&!j.done);
  if(!job){const p=lgPathTo(team,t.i);if(!p){log(team,'No route for a road to there.','w');return;}let len=0;for(let i=1;i<p.pts.length;i++)len+=Math.hypot(p.pts[i][0]-p.pts[i-1][0],p.pts[i][1]-p.pts[i-1][1]);
    job={id:D.id++,team,a:p.a,b:p.b,pts:p.pts,len,prog:0,done:0,t:G.t};D.job.push(job);D.v++;log(team,`Road to ${t.name}: ${Math.round(len/10)} m, about $${Math.round(len*LG_COST)}. Engineers build it - protect them.`,'g');}
  let us=(a.ids||[]).map(i=>G.byId.get(i)).filter(u=>u&&!u.dead&&u.team===team&&u.kind==='dozer');
  if(!us.length){let best=null,bd=1e18;for(const u of G.ents)if(u.team===team&&u.kind==='dozer'&&!u.dead&&!(u.order&&u.order.type==='road')){const d=Math.hypot(u.x-job.pts[0][0],u.y-job.pts[0][1]);if(d<bd){bd=d;best=u;}}if(best)us=[best];}
  for(const u of us){u.order={type:'road',job:job.id};u.target=null;u.path=null;u.wl=null;}}
function lgPoint(job,s){const P=job.pts;let acc=0;for(let i=1;i<P.length;i++){const L=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);if(acc+L>=s){const f=L?(s-acc)/L:0;return[P[i-1][0]+(P[i][0]-P[i-1][0])*f,P[i-1][1]+(P[i][1]-P[i-1][1])*f];}acc+=L;}return P[P.length-1];}
function dozeRoad(u,dt){const o=u.order;if(!o||o.type!=='road')return false;const D=G.lgd,job=D&&D.job.find(j=>j.id===o.job);if(!job||job.done){u.order=null;return false;}
  const fp=lgPoint(job,job.prog),d=Math.hypot(fp[0]-u.x,fp[1]-u.y);if(d>70){navTo(u,fp[0],fp[1],dt);return true;}
  const T=G.teams[u.team],cost=LG_COST*LG_SPD*dt;if(T.credits<cost){u.rn=(u.rn||0)+dt;if(u.rn>8){u.order=null;log(u.team,'Not enough supplies to keep building the road.','w');}return true;}u.rn=0;
  T.credits-=cost;job.prog=Math.min(job.len,job.prog+LG_SPD*dt);job.t=G.t;u.building=true;u.ang=Math.atan2(fp[1]-u.y,fp[0]-u.x);u.lastFire=G.t;return true;}
function lgJobs(st){const D=G.lgd;let ch=0;for(const j of D.job){if(j.done)continue;if(j.prog>=j.len-.5){j.done=1;ch=1;D.rb.push({a:j.a,b:j.b,pts:j.pts,team:j.team});D.v++;lgSync();
      const nd=G.lg.N[j.b],nt=nd?nd.t:-1;if(nt>=0&&G.towns[nt])log(j.team,`Road to ${G.towns[nt].name} finished.`,'g');for(const u of G.ents)if(u.order&&u.order.type==='road'&&u.order.job===j.id)u.order=null;}
    else if(G.t-(j.t||G.t)>200&&!G.ents.some(u=>!u.dead&&u.order&&u.order.type==='road'&&u.order.job===j.id)){j.dead=1;ch=1;}}
  if(ch){D.job=D.job.filter(j=>!j.done&&!j.dead);D.v++;}}
// ---- road warfare: big blasts crater a road ----
function lgBlast(x,y,r,dmg,wpn,team){const L=G.lg,D=G.lgd;if(!L||!D||!G.conq||r<22||dmg<25)return;const K=wpn==='bomb'||wpn==='super'||wpn==='missile'||wpn==='shell'||wpn==='boom'?1:.35;lgFix(D);
  {const B=G.map.bridges||[],KB=wpn==='bomb'||wpn==='super'||wpn==='missile'?1:wpn==='shell'||wpn==='boom'?.45:.15;for(let i=0;i<B.length;i++){const b=B[i];if(b.dead)continue;const dx=x-b.x,dy=y-b.y;
    if(Math.abs(dx*b.t[0]+dy*b.t[1])>44+r*.3||Math.abs(dx*b.n[0]+dy*b.n[1])>b.h+r*.3)continue;const s=D.bd[i]||(D.bd[i]={});if(s.hp==null)s.hp=lgBrMax(b);s.hp-=Math.min(400,dmg)*KB;D.v++;if(s.hp<=0)lgBridgeDown(i,team==null?-1:team);}}
  for(let i=0;i<L.E.length;i++){const e=L.E[i],b=e.bb,m=r*.7+14;if(x<b[0]-m||x>b[2]+m||y<b[1]-m||y>b[3]+m)continue;if(D.cr[i])continue;let bd=1e9,bx=0,by=0;const P=e.pts;
    for(let j=1;j<P.length;j++){const ax=P[j-1][0],ay=P[j-1][1],dx=P[j][0]-ax,dy=P[j][1]-ay,l2=dx*dx+dy*dy||1;const f=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/l2)),px=ax+dx*f,py=ay+dy*f,d=Math.hypot(px-x,py-y);if(d<bd){bd=d;bx=px;by=py;}}
    if(bd>m)continue;D.dm[i]=(D.dm[i]||0)+Math.min(300,dmg)*K;
    if(D.dm[i]>=LG_CRATER_HP){D.dm[i]=0;D.cr[i]={x:Math.round(bx),y:Math.round(by),t:G.t+LG_CRATER_T};D.v++;FXE('boom',[bx|0,by|0,18,1]);
      for(const k of [L.N[e.a],L.N[e.b]]){const t=k&&k.t>=0?G.towns[k.t]:null;if(t&&t.ow>=0)log(t.ow,`The road at ${t.name} is cratered - supply link cut.`,'w');}}}}
// ---- AI: builds roads to its towns ----
function lgAI(T){lgAI2(T);if(!G.conq||!G.lgd||T.ai.d<1||T.ai.t%7!==3||T.credits<900||G.t<150)return;const D=G.lgd;if(D.job.some(j=>j.team===T.id))return;
  let best=null,bd=1e18;for(const t of G.towns){if(t.ow!==T.id||t.reb>G.t)continue;const tn=G.lg.tn[t.i];if(tn==null||(G.lg.trade&&G.lg.trade[T.id]&&G.lg.trade[T.id][tn]))continue;const d=Math.hypot(t.x-BASES[T.id][0],t.y-BASES[T.id][1]);if(d<bd&&!(t.fr>0)){bd=d;best=t;}}
  if(best&&bd<6500)lgRoadCmd(T.id,{ti:best.i,ids:[]});}
/* AI for stages 5b-9 (every nation the same; Normal and up; Hard also blows bridges in front of an enemy push):
   airlift to cut-off towns, link cut depots by road, checkpoints and mines on roads at its frontier, rebuild bridges in its land. */
function lgAI2(T){if(!G.conq||!G.lgd||!G.lg.reach||T.ai.d<1||G.t<200)return;const D=G.lgd,L=G.lg,id=T.id,t=T.ai.t;lgFix(D);
  const idleDoz=()=>G.ents.filter(u=>u.team===id&&u.kind==='dozer'&&!u.dead&&!u.order);
  // airlift: a cut-off town and a free Transport Helicopter (or build one when there is an airfield and money)
  if(t%5===2){const cut=G.towns.find(q=>q.ow===id&&q.cut&&!(q.air>G.t));if(cut){const h=G.ents.find(u=>u.team===id&&u.kind==='airlift'&&!u.dead&&!u.alq&&!u.order&&!cargoLoad(u));
      if(h&&T.credits>=LG_AIRC+200)lgCmd(id,{k:'alift',ids:[h.id],ti:cut.i,tid:0});
      else if(!h&&T.credits>2200&&t%15===2&&!G.ents.some(u=>u.team===id&&u.kind==='airlift'&&!u.dead)&&G.ents.some(b=>b.isB&&b.team===id&&b.kind==='airfield'&&b.built>=1&&!b.dead))enqueue(id,'airlift');}}
  // a forward depot that is cut off or not linked: build a road to it
  if(t%17===8&&T.credits>1000&&!D.job.some(j=>j.team===id)){for(let j=L.nS;j<L.N.length;j++){const nd=L.N[j];if(nd.tm!==id||nd.port)continue;const e=G.byId.get(nd.e);if(e&&e.lcut){lgCmd(id,{k:'droad',tid:e.id,ids:[]});break;}}}
  // rebuild a blown bridge in its own (or neutral) land
  if(t%9===4&&T.credits>1300){const B=G.map.bridges;for(let i=0;i<B.length;i++){const b=B[i];if(!b.dead)continue;const o=terrAt(b.x,b.y);if(o>=0&&o!==id)continue;
      if(G.ents.some(u=>u.order&&u.order.type==='lgj'&&u.order.bi===i))continue;const dz=idleDoz();if(dz.length){lgCmd(id,{k:'fixb',x:b.x,y:b.y,ids:[dz[0].id]});break;}}}
  // checkpoints and mines on the roads leaving its towns toward land it does not hold
  if((t%11===5&&T.credits>1500&&D.ck.filter(q=>q.team===id).length<2)||(t%13===7&&T.credits>1700&&D.mn.filter(m=>m.team===id).length<4)){const ck=t%11===5;
    const dz=idleDoz();if(dz.length){let best=null,bs=1e18;
      for(let i=0;i<L.E.length;i++){const e=L.E[i];if(e.a===e.b||lgBlk(i,id))continue;for(const [mn,on] of [[e.a,e.b],[e.b,e.a]]){const A=L.N[mn],Bn=L.N[on];if(!(A.t>=0&&lgNodeOwn(A,id))||lgNodeOwn(Bn,id))continue;if(!ck&&!lgNodeFoe(Bn,id))continue;
          const f=ck?.3:.45,sp=mn===e.a?e.len*f:e.len*(1-f),p=lgPoint(e,sp);if(terrEnemy(id,p[0],p[1]))continue;if(D.ck.some(q=>Math.hypot(q.x-p[0],q.y-p[1])<300)||D.mn.some(m=>Math.hypot(m.x-p[0],m.y-p[1])<200))continue;
          const sc=Math.hypot(p[0]-dz[0].x,p[1]-dz[0].y)+i;if(sc<bs){bs=sc;best=p;}}}
      if(best)lgCmd(id,{k:ck?'ckpt':'mine',x:best[0],y:best[1],ids:[dz[0].id]});}}
  // Hard: blow a bridge in its own land when a big enemy force is about to cross and few of its own troops are near
  if(T.ai.d>=2&&t%10===6&&T.credits>800){const B=G.map.bridges;for(let i=0;i<B.length;i++){const b=B[i],s=D.bd[i];if(b.dead||(s&&s.ch)||terrAt(b.x,b.y)!==id)continue;let en=0,fr=0;
      for(const e of nearby(b.x,b.y,700,LG_N)){if(e.dead||e.isB||!e.s||e.s.dom!=='ground'||e.team==null||e.team<0)continue;if(ally(e.team,id)){if(Math.hypot(e.x-b.x,e.y-b.y)<400)fr++;}else en++;}
      if(en>=6&&fr<3&&!G.ents.some(u=>u.order&&u.order.type==='lgj'&&u.order.bi===i)){const dz=G.ents.filter(u=>u.team===id&&u.kind==='dozer'&&!u.dead&&Math.hypot(u.x-b.x,u.y-b.y)<1600);if(dz.length){lgCmd(id,{k:'demo',x:b.x,y:b.y,ids:[dz[0].id]});break;}}}}}

// ---- CONVOYS (stage 3): supply trucks that drive the road network on their own ----
/* Every ~20 s each team's HQ sends a convoy (an ordinary Supply Truck unit with u.cv set, $60 per trip) to the held town on its supply network that
   has gone longest without a delivery. It follows the roads (Dijkstra over uncratered edges, never through enemy-held nodes), unloads (the town is
   STOCKED for 4 min = its supply circle refills ammo at full range; an unstocked town only reaches half as far), drives home and disappears.
   Trucks can be shot like any truck (an ambush); armed friendly units within 200 units escort it (45% less damage). A convoy also resupplies
   units it passes (the normal truck supply circle). Host-only and deterministic (no random numbers). */
const CVY_COST=60,CVY_MAX=3,CVY_STOCK=240,CVY_EVERY=20,CVY_ESC=200;const CVY_N=[];
function lgRoute(team,fromN,toN){const L=G.lg,n=L.N.length;if(toN==null||toN<0||toN>=n)return null;const dist=new Array(n).fill(1e18),prev=new Array(n).fill(null),done=new Uint8Array(n);dist[fromN]=0;
  const adj=L.N.map(()=>[]);L.E.forEach((e,i)=>{if(e.a===e.b||lgBlk(i,team))return;adj[e.a].push([e.b,i,1,e.len]);adj[e.b].push([e.a,i,0,e.len]);});
  for(let j=L.nS;j<n;j++)for(const [m,i,sp] of (L.dl[j]||[])){if(i>=0&&lgBlk(i,team))continue;const e=i>=0?L.E[i]:null,len=(e?(m===e.a?sp:e.len-sp):Math.hypot(L.N[m].x-L.N[j].x,L.N[m].y-L.N[j].y))+60;adj[m].push([j,i,2,len,sp,m]);adj[j].push([m,i,3,len,sp,m]);}
  for(;;){let u=-1,bd=1e18;for(let i=0;i<n;i++)if(!done[i]&&dist[i]<bd){bd=dist[i];u=i;}if(u<0||u===toN)break;done[u]=1;
    for(const q of adj[u]){const v=q[0];if(done[v])continue;if(v!==toN&&lgNodeFoe(L.N[v],team))continue;const d=dist[u]+q[3];if(d<dist[v]){dist[v]=d;prev[v]=[u,q];}}}
  if(dist[toN]>=1e17)return null;const legs=[];for(let v=toN;v!==fromN;){const p=prev[v];legs.push([p[0],v,p[1]]);v=p[0];}legs.reverse();
  // a spur from road node m to depot node j along road i (up to the point nearest the depot, then off-road to it)
  const spur=(m,j,i,sp)=>{const nd=L.N[j];if(i<0)return[[L.N[m].x,L.N[m].y,-1],[nd.x,nd.y,-1]];const e=L.E[i],P=e.pts,o=[];
    if(m===e.a){for(let k=0;k<P.length&&e.cum[k]<sp;k++)o.push([P[k][0],P[k][1],i]);}else{for(let k=P.length-1;k>=0&&e.cum[k]>sp;k--)o.push([P[k][0],P[k][1],i]);}const q=lgPoint(e,sp);o.push([q[0],q[1],i]);o.push([nd.x,nd.y,-1]);return o;};
  const pts=[];for(const [u,v,q] of legs){const ei=q[1],f=q[2];let A;
    if(f===0||f===1){const P=L.E[ei].pts;A=(f?P:P.slice().reverse()).map(p=>[p[0],p[1],ei]);}else if(f===2)A=spur(u,v,ei,q[4]);else A=spur(v,u,ei,q[4]).reverse();
    for(let i=pts.length?1:0;i<A.length;i++)pts.push(A[i]);}
  return{pts,len:dist[toN]};}
function lgConvoys(st){const D=G.lgd,L=G.lg;if(!G.conq||!L.reach)return;
  for(const t of G.towns){if(t.dlo!==t.ow){t.dlo=t.ow;t.dl=t.ow>=0?G.t+120:0;}}
  if(!D.cvl)D.cvl=[];
  for(const id of D.cvl){const u=G.byId.get(id);if(u&&u.dead&&u.cv&&!u.cv.rep){u.cv.rep=1;D.v++;const tw=G.towns[u.cv.ti];log(u.team,`Our supply convoy to ${tw?tw.name:'the front'} was destroyed!`,'bad');FXE('tping',[u.team,u.x|0,u.y|0,0]);}}
  D.cvl=D.cvl.filter(id=>{const u=G.byId.get(id);return u&&!u.dead;});
  D.cvt=(D.cvt||0)+st;if(D.cvt<CVY_EVERY)return;D.cvt=0;
  for(const T of G.teams){if(T.reb||T.out||T.credits<CVY_COST+200||!L.reach[T.id])continue;let cnt=0;const busy=new Set();for(const id of D.cvl){const u=G.byId.get(id);if(u&&u.team===T.id){cnt++;busy.add(u.cv.dp?'d'+u.cv.dp:u.cv.ti);}}if(cnt>=CVY_MAX)continue;
    const hq=G.ents.find(e=>e.isB&&e.team===T.id&&e.kind==='hq'&&e.built>=1&&!e.dead);if(!hq)continue;
    let best=null,bs=1e18,bn=-1;
    for(let j=L.nS;j<L.N.length;j++){const nd=L.N[j];if(nd.tm!==T.id||nd.port||!L.reach[T.id][j])continue;const e=G.byId.get(nd.e);if(!e||e.lcut||busy.has('d'+e.id)||(e.dl||0)>G.t+CVY_STOCK*.55)continue;
      const sc=(e.dl||0)-200+Math.hypot(e.x-hq.x,e.y-hq.y)*.002;if(sc<bs){bs=sc;best=e;bn=j;}}
    for(const t of G.towns){if(t.ow!==T.id||t.cut||t.reb>G.t||busy.has(t.i))continue;const tn=L.tn[t.i];if(tn==null||!L.reach[T.id][tn])continue;
      if((t.dl||0)>G.t+CVY_STOCK*.55)continue;const sc=(t.dl||0)-(t.fr>0?400:0)+Math.hypot(t.x-hq.x,t.y-hq.y)*.002;if(sc<bs){bs=sc;best=t;bn=tn;}}
    if(!best)continue;const r=lgRoute(T.id,T.id,bn);if(!r||r.pts.length<2)continue;
    T.credits-=CVY_COST;const u=addUnit(T.id,'harv',r.pts[0][0],r.pts[0][1]);u.cv={ti:best.isB?-1:best.i,dp:best.isB?best.id:0,pts:r.pts,i:1,ret:0,esc:0,w:0,k:0};D.cvl.push(u.id);D.v++;}}
function updConvoy(u,dt){const c=u.cv;if(c.cav)return ecCaravan(u,dt);c.k+=dt;
  if(c.k>=1){c.k=0;let n=0;for(const e of nearby(u.x,u.y,CVY_ESC,CVY_N))if(!e.dead&&!e.isB&&e!==u&&e.team>=0&&ally(e.team,u.team)&&e.s&&!e.s.noAttack&&e.kind!=='harv')n++;c.esc=n>0?1:0;}
  const P=c.pts;if(c.i>=P.length){c.rep=1;u.dead=true;return;}
  const tp=P[c.i],E=G.lgd.cr[tp[2]];if(E&&E.t>G.t){c.w+=dt;if(c.w>20&&!c.ret){c.ret=1;c.pts=P.slice(0,c.i).reverse();c.i=0;c.w=0;}return;}c.w=0;
  if(Math.hypot(tp[0]-u.x,tp[1]-u.y)<(c.ret&&c.i===P.length-1?140:46)){c.i++;if(c.i>=P.length&&!c.ret){const t=G.towns[c.ti];
      if(c.dp){const e=G.byId.get(c.dp);if(e&&!e.dead&&e.team===u.team){e.dl=G.t+CVY_STOCK;G.lgd.v++;log(u.team,'Convoy delivered to the forward depot - it is stocked and patches up troops around it.','g');
        for(const q of nearby(e.x,e.y,SUP_R.depot,CVY_N))if(!q.isB&&!q.dead&&q.team===u.team&&q.am!==undefined)q.am=q.amx;}}
      if(t&&t.ow===u.team){t.dl=G.t+CVY_STOCK;G.lgd.v++;log(u.team,`Convoy delivered to ${t.name} - its supply circle is stocked.`,'g');
        for(const e of nearby(t.x,t.y,SUP_R.town,CVY_N))if(!e.isB&&!e.dead&&e.team===u.team&&e.am!==undefined)e.am=e.amx;}
      c.ret=1;c.pts=P.slice().reverse();c.i=0;}return;}
  navTo(u,tp[0],tp[1],dt);}

// ---- TERRITORY + FRONT LINE (stage 5) ----
/* Influence field on a coarse grid: every base (HQ), held town/hamlet and finished Supply Depot pushes influence out to a radius (stronger near the
   source, weaker if the town is CUT OFF). A cell belongs to the team with the most influence there (neutral below 0.08). The FRONT LINE is the border
   between cells of teams that are not allied. You cannot build (depots excepted) in cells where an enemy has more influence than you
   ("Enemy territory"), and a forward depot extends your territory, which is how you push the front. Same code on host and clients (display only
   on clients; the host's check in validSpot decides). */
const TR_CELL=80,TR_R={hq:1000,depot:560,town:520,ham:340};
function terrBuild(){const T=G.terr||(G.terr={sig:'',cw:0,ch:0,own:null,seg:[],v:0});return T;}
function terrSources(){const o=[];
  for(const e of G.ents){if(e.dead||!e.isB||e.built<1||e.team==null||e.team<0||e.team>=G.teams.length||G.teams[e.team].reb)continue;
    if(e.kind==='hq')o.push([e.team,e.x,e.y,TR_R.hq,1]);else if(e.kind==='depot')o.push([e.team,e.x,e.y,TR_R.depot,e.lcut?.45:.9]);}
  if(G.towns)for(const t of G.towns){if(t.ow<0||t.ow>=G.teams.length||G.teams[t.ow].reb||t.reb>G.t)continue;o.push([t.ow,t.x,t.y,t.ham?TR_R.ham:TR_R.town,t.cut?.45:.85]);}
  return o;}
function terrUpdate(force){if(!G.conq||!G.towns)return null;const T=terrBuild();const src=terrSources();
  let sg='';for(const q of src)sg+=q[0]+':'+(q[1]|0)+','+(q[2]|0)+','+q[4]+';';if(!force&&sg===T.sig&&T.own)return T;
  T.sig=sg;const cw=Math.ceil(MAPW/TR_CELL),ch=Math.ceil(MAPH/TR_CELL),n=cw*ch,own=new Int8Array(n).fill(-1),Nt=G.teams.length;T.cw=cw;T.ch=ch;
  const inf=new Float32Array(n*Nt);
  for(const [tm,x,y,R,w] of src){const x0=Math.max(0,Math.floor((x-R)/TR_CELL)),x1=Math.min(cw-1,Math.floor((x+R)/TR_CELL)),y0=Math.max(0,Math.floor((y-R)/TR_CELL)),y1=Math.min(ch-1,Math.floor((y+R)/TR_CELL));
    for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){const d=Math.hypot((i+.5)*TR_CELL-x,(j+.5)*TR_CELL-y);if(d>=R)continue;const v=w*(1-d/R),k=(j*cw+i)*Nt+tm;if(v>inf[k])inf[k]=v;}}
  for(let c=0;c<n;c++){let b=-1,bv=.08;for(let k=0;k<Nt;k++){const v=inf[c*Nt+k];if(v>bv){bv=v;b=k;}}own[c]=b;}
  T.own=own;T.inf=inf;T.Nt=Nt;
  // border segments between cells held by teams that are not allied (as [x1,y1,x2,y2] on cell edges)
  const seg=[],H=TR_CELL;const en=(a,b)=>a>=0&&b>=0&&a!==b&&!ally(a,b);
  for(let j=0;j<ch;j++)for(let i=0;i<cw;i++){const a=own[j*cw+i];if(i+1<cw&&en(a,own[j*cw+i+1]))seg.push([(i+1)*H,j*H,(i+1)*H,(j+1)*H]);if(j+1<ch&&en(a,own[(j+1)*cw+i]))seg.push([i*H,(j+1)*H,(i+1)*H,(j+1)*H]);}
  T.seg=seg;T.v++;return T;}
// who holds this spot: team id of the strongest influence, -1 neutral
function terrAt(x,y){const T=G.terr;if(!T||!T.own)return -1;const i=Math.floor(x/TR_CELL),j=Math.floor(y/TR_CELL);if(i<0||j<0||i>=T.cw||j>=T.ch)return -1;return T.own[j*T.cw+i];}
function terrEnemy(team,x,y){const o=terrAt(x,y);return o>=0&&!ally(o,team);}
// ---- network packs (host -> clients, only the dynamic part; lives in teamGlobals) ----
function lgPack(){const D=G.lgd;if(!D)return 0;lgFix(D);const L=G.lg,B=G.map.bridges||[],dy=[];for(let j=L.nS;j<L.N.length;j++){const e=G.byId.get(L.N[j].e);if(e)dy.push(e);}return{rb:D.rb.map(r=>[r.a,r.b,r.team,r.pts.flat(),r.dp||0]),mn:D.mn.map(m=>[m.id,m.team,m.x,m.y]),ck:D.ck.map(q=>[q.id,q.team,q.x,q.y,q.ei]),pt:D.pt.map(p=>[p.x,p.y,p.h,p.nx,p.ny,p.team]),bv:D.bv,bd:Object.keys(D.bd).map(k=>{const q=D.bd[k],c=q.ch;return[+k,q.dead?1:0,q.hp==null?100:Math.round(100*q.hp/lgBrMax(B[k])),c?Math.max(0,Math.ceil(c.t-G.t)):-1,c?c.team:-1,c?c.x:0,c?c.y:0];}),dc:dy.filter(e=>e.lcut).map(e=>e.id),ds:dy.filter(e=>e.dl>G.t).map(e=>e.id),pb:dy.filter(e=>e.blk).map(e=>e.id),al:G.towns.filter(t=>t.al).map(t=>t.i),cr:Object.keys(D.cr).map(k=>[+k,D.cr[k].x,D.cr[k].y,Math.round(D.cr[k].t-G.t)]),jb:D.job.map(j=>[j.id,j.team,j.a,j.b,Math.round(j.len),Math.round(j.prog/20)*20,j.pts.flat()]),cu:G.towns.filter(t=>t.cut).map(t=>t.i),tr:G.towns.filter(t=>t.trade).map(t=>t.i),cv:G.ents.filter(e=>e.cv&&!e.cv.cav&&!e.dead).map(e=>e.id),sk:G.towns.filter(t=>t.ow>=0&&t.dl>G.t).map(t=>t.i)};}
function lgApply(d){const D=G.lgd;if(!D||!d||typeof d!=='object')return;const un=a=>{const o=[];for(let i=0;i+1<a.length;i+=2)o.push([a[i],a[i+1]]);return o;};
  lgFix(D);let rs=0;if((d.rb||[]).length!==D.rb.length){D.rb=d.rb.map(r=>({a:r[0],b:r[1],team:r[2],pts:un(r[3]),dp:r[4]||0}));D.v++;rs=1;}
  D.mn=(d.mn||[]).map(m=>({id:m[0],team:m[1],x:m[2],y:m[3]}));D.ck=(d.ck||[]).map(q=>({id:q[0],team:q[1],x:q[2],y:q[3],ei:q[4],dg:[]}));
  if((d.pt||[]).length!==D.pt.length){D.pt=(d.pt||[]).map(p=>({x:p[0],y:p[1],h:p[2],nx:p[3],ny:p[4],team:p[5]}));rs=1;}
  D.bd={};for(const b of d.bd||[])D.bd[b[0]]={dead:b[1],hpp:b[2],ch:b[3]>=0?{t:G.t+b[3],team:b[4],x:b[5],y:b[6]}:null};if((d.bv|0)!==D.bv){D.bv=d.bv|0;rs=1;}
  G.lgDc=new Set(d.dc||[]);G.lgDs=new Set(d.ds||[]);G.lgPb=new Set(d.pb||[]);if(rs)lgSync();
  D.cr={};for(const c of d.cr||[])D.cr[c[0]]={x:c[1],y:c[2],t:G.t+c[3]};D.job=(d.jb||[]).map(j=>({id:j[0],team:j[1],a:j[2],b:j[3],len:j[4],prog:j[5],pts:un(j[6]),done:0}));
  if(MODE==='client'&&G.lg.nS!=null){lgDyn();lgCompute();for(let j=G.lg.nS;j<G.lg.N.length;j++){const e=G.byId.get(G.lg.N[j].e);if(e)e.lcut=G.lgDc.has(e.id)?1:0;}}
  const cu=new Set(d.cu||[]),tr=new Set(d.tr||[]);for(const t of G.towns){t.cut=cu.has(t.i)?1:0;t.trade=tr.has(t.i)?1:0;}const al=new Set(d.al||[]);for(const t of G.towns)t.al=al.has(t.i)?1:0;G.lgCv=new Set(d.cv||[]);const sk=new Set(d.sk||[]);for(const t of G.towns)t.sk=sk.has(t.i)?1:0;G.lgv=(G.lgv|0)+1;}

/* ---------- LOGISTICS stage 5b-9 (orch/logistics3, 2026-11-05) ----------
   5b DEPOTS + PORTS as network nodes: every finished Supply Depot and Shipyard is a node. It joins the road graph on its own when it stands
      within 240 of a road (linked to both ends of that road) or 320 of a town/base; otherwise build a road to it (depot panel). A depot that
      can't reach your base is CUT OFF (half supply range, weaker territory). Convoys also deliver to depots: a STOCKED depot patches up
      troops and vehicles around it. The depot panel can make it the army's rally point (new units gather there).
   6  ROAD WARFARE (Construction Vehicle): MINES on a road (hidden from the enemy, blow up the first enemy vehicle; enemy engineers clear them),
      CHECKPOINTS (sandbags both sides of a road: enemy supply can't use that road while it stands; it collects a toll while the road is
      on your network).
   7  BRIDGES: every bridge has hit points (bombs / missiles / shells wear it down) and engineers can rig one with charges that blow after
      30 s (enemy infantry or engineers standing on the charges for 5 s clear them). A blown bridge drops everything on it into the river,
      closes the crossing for ground units (the path grid flips its cells to water, the route caches rebuild, ships can pass) and cuts
      any road over it. Engineers rebuild it (40 s) or lay a PONTOON bridge across any narrow river away from other bridges (20 s).
   8  PORTS + BLOCKADE: an unblockaded port is a supply source for the road network and earns sea trade; enemy warships near it with none
      of yours = BLOCKADED (no trade, no sea supply).
   9  AIRLIFT: a Transport Helicopter flies supplies to one of your towns or depots: it is stocked, and a cut-off one counts as supplied for 2 min.
   All host-side and deterministic (no random numbers); clients get it all in the lg pack. Same numbers for every nation. */
const LGC={mine:100,ckpt:250,demo:200,fixb:500,pont:300},LGT={mine:3,ckpt:8,demo:4,fixb:40,pont:20};
const LG_MINE_MAX=8,LG_CK_MAX=3,LG_PONT_MAX=2,LG_CHG=30,LG_TOLL=.8,LG_SEA=1.2,LG_AIRC=150,LG_AIRT=120,LG_N=[];
function lgFix(D){if(!D.mn){D.mn=[];D.ck=[];D.bd={};D.pt=[];D.bv=0;}}
function lgBrMax(b){return b&&b.pont?800:2400;}
// closest point of a road polyline: distance, arc-length position, point, direction
function lgProj(e,x,y){const P=e.pts;let bd=1e18,bs=0,bx=0,by=0,ba=0;for(let j=1;j<P.length;j++){const ax=P[j-1][0],ay=P[j-1][1],dx=P[j][0]-ax,dy=P[j][1]-ay,l2=dx*dx+dy*dy||1;
    const f=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/l2)),px=ax+dx*f,py=ay+dy*f,d=Math.hypot(px-x,py-y);if(d<bd){bd=d;bs=e.cum[j-1]+Math.sqrt(l2)*f;bx=px;by=py;ba=Math.atan2(dy,dx);}}
  return{d:bd,s:bs,x:bx,y:by,a:ba};}
function lgEdgeBr(e,B){const o=[];for(let i=0;i<B.length;i++){const b=B[i],bb=e.bb,m=b.h+50;if(b.x<bb[0]-m||b.x>bb[2]+m||b.y<bb[1]-m||b.y>bb[3]+m)continue;const P=e.pts;let hit=false;
    for(let j=1;j<P.length&&!hit;j++){const L=Math.hypot(P[j][0]-P[j-1][0],P[j][1]-P[j-1][1]),k=Math.max(1,Math.ceil(L/16));for(let q=0;q<=k;q++){const x=P[j-1][0]+(P[j][0]-P[j-1][0])*q/k,y=P[j-1][1]+(P[j][1]-P[j-1][1])*q/k,dx=x-b.x,dy=y-b.y;
        if(Math.abs(dx*b.t[0]+dy*b.t[1])<40&&Math.abs(dx*b.n[0]+dy*b.n[1])<b.h-20){hit=true;break;}}}if(hit)o.push(i);}return o;}
// implicit links of depot / port nodes: to both ends of any road passing within 240, and to towns / bases within 320
function lgLinks(){const L=G.lg,B=(G.map&&G.map.bridges)||[];L.dl=[];for(const e of L.E)e.br=lgEdgeBr(e,B);
  for(let j=L.nS;j<L.N.length;j++){const nd=L.N[j],o=[];
    for(let i=0;i<L.E.length;i++){const e=L.E[i],b=e.bb;if(e.a===e.b||e.a===j||e.b===j)continue;if(nd.x<b[0]-240||nd.x>b[2]+240||nd.y<b[1]-240||nd.y>b[3]+240)continue;const q=lgProj(e,nd.x,nd.y);if(q.d<240){o.push([e.a,i,q.s]);o.push([e.b,i,q.s]);}}
    for(let m=0;m<L.nS;m++)if(Math.hypot(L.N[m].x-nd.x,L.N[m].y-nd.y)<320)o.push([m,-1,0]);
    L.dl[j]=o;}}
// dynamic nodes: finished depots and shipyards (rebuilt only when that set changes)
function lgDyn(){const L=G.lg;if(L.nS==null)return;const list=[];for(const e of G.ents){if(e.dead||!e.isB||(e.kind!=='depot'&&e.kind!=='shipyard')||e.built<1||e.team==null||e.team<0||e.team>=G.teams.length||G.teams[e.team].reb)continue;list.push(e);}
  list.sort((a,b)=>a.id-b.id);let sg='';for(const e of list)sg+=e.id+',';if(sg===L.dsig)return;L.dsig=sg;L.N.length=L.nS;L.en={};
  for(const e of list){L.N.push({x:e.x,y:e.y,b:-1,t:-1,e:e.id,tm:e.team,port:e.kind==='shipyard'?1:0});L.en[e.id]=L.N.length-1;}
  lgSync();L.sig='';}
// ---- bridges ----
function lgBrObj(p){const n=[p.nx,p.ny],t=[p.ny,-p.nx];return{x:p.x,y:p.y,h:p.h,n,t,a:[p.x-n[0]*p.h,p.y-n[1]*p.h],b:[p.x+n[0]*p.h,p.y+n[1]*p.h],pont:1,team:p.team};}
function lgPontSync(){const L=G.lg,D=G.lgd,B=G.map&&G.map.bridges;if(!B||L.nB0==null)return;for(let i=B.length-L.nB0;i<D.pt.length;i++)B.push(lgBrObj(D.pt[i]));}
// the path-grid cells a bridge deck covers (same rule the map uses when it lays the bridges)
function lgBrCells(b){if(b._c)return b._c;const o=[],M=G.map,R=b.h+60;const x0=Math.max(0,Math.floor((b.x-R)/CELL)),x1=Math.min(GW-1,Math.floor((b.x+R)/CELL)),y0=Math.max(0,Math.floor((b.y-R)/CELL)),y1=Math.min(GH-1,Math.floor((b.y+R)/CELL));
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const x=cx*CELL+CELL/2,y=cy*CELL+CELL/2;if(!M.isWater(x,y))continue;const dx=x-b.x,dy=y-b.y;if(Math.abs(dx*b.t[0]+dy*b.t[1])<36&&Math.abs(dx*b.n[0]+dy*b.n[1])<b.h+10)o.push(cy*GW+cx);}
  return b._c=o;}
// write the bridge states into the path grid (2 = deck, 4 = blown: water for ships, closed to ground units); idempotent, only on change
function lgBrApply(){const D=G.lgd,L=G.lg,B=G.map&&G.map.bridges,g=G.grid;if(!B||!g||!D||L.bvA===D.bv)return;L.bvA=D.bv;
  for(let i=0;i<B.length;i++){const s=D.bd[i];B[i].dead=s&&s.dead?1:0;}
  for(let i=0;i<B.length;i++)if(B[i].dead)for(const c of lgBrCells(B[i]))if(g[c]===2)g[c]=4;
  for(let i=0;i<B.length;i++)if(!B[i].dead)for(const c of lgBrCells(B[i]))if(g[c]===4||g[c]===1)g[c]=2;
  G.gridV=(G.gridV|0)+1;if(L.E)for(const e of L.E)e.br=lgEdgeBr(e,B);L.sig='';}
function lgNearBr(x,y,R){const B=G.map.bridges||[];let bi=-1,bd=R;for(let i=0;i<B.length;i++){const b=B[i],dx=x-b.x,dy=y-b.y,u=Math.max(0,Math.abs(dx*b.n[0]+dy*b.n[1])-b.h),w=Math.abs(dx*b.t[0]+dy*b.t[1]),d=Math.hypot(u,w);if(d<bd){bd=d;bi=i;}}return bi;}
function lgNearRoad(x,y,R){const L=G.lg;let best=null;for(let i=0;i<L.E.length;i++){const e=L.E[i],b=e.bb;if(x<b[0]-R||x>b[2]+R||y<b[1]-R||y>b[3]+R)continue;const q=lgProj(e,x,y);if(q.d<R&&(!best||q.d<best.d)){best=q;best.i=i;}}
  if(best&&!passXY('ground',best.x,best.y))return null;return best;}
// a pontoon crossing: perpendicular to the nearest river, short enough, not next to another bridge
function lgPontPlan(x,y){const M=G.map;if(!M.isWater(x,y))return null;let bt=null,bd=1e18;for(const rv of M.rivers||[]){const P=rv.pts;for(let i=1;i<P.length;i++){const ax=P[i-1][0],ay=P[i-1][1],dx=P[i][0]-ax,dy=P[i][1]-ay,l2=dx*dx+dy*dy||1,f=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/l2)),d=Math.hypot(ax+dx*f-x,ay+dy*f-y);if(d<bd){bd=d;const l=Math.sqrt(l2);bt=[dx/l,dy/l];}}}
  if(!bt||bd>420)return null;const n=[+(-bt[1]).toFixed(4),+bt[0].toFixed(4)];let h=40;while(h<300&&(M.edge(x+n[0]*h,y+n[1]*h)>-8||M.edge(x-n[0]*h,y-n[1]*h)>-8))h+=8;if(h>=300)return null;h+=26;
  for(const b of M.bridges)if(Math.hypot(b.x-x,b.y-y)<260)return null;
  for(const s of [-1,1])if(!passXY('ground',x+n[0]*h*s,y+n[1]*h*s)&&!nearestPassXY('ground',x+n[0]*h*s,y+n[1]*h*s))return null;
  return{x:Math.round(x),y:Math.round(y),h,n};}
function lgBridgeDown(i,team){const D=G.lgd,b=G.map.bridges[i];if(!b)return;const s=D.bd[i]||(D.bd[i]={});if(s.dead)return;s.dead=1;s.hp=0;s.ch=null;D.bv++;D.v++;lgBrApply();
  const cs=new Set(lgBrCells(b));for(const e of G.ents){if(e.dead||e.isB||!e.s||e.s.dom!=='ground'||e.inTun)continue;const c=Math.floor(e.y/CELL)*GW+Math.floor(e.x/CELL);if(cs.has(c))applyDmg(e,e.hp+999,'bomb',team,null,1);else if(e.path&&Math.abs(e.x-b.x)<2600&&Math.abs(e.y-b.y)<2600)e.path=null;}
  for(const f of [-.6,0,.6])FXE('boom',[Math.round(b.x+b.n[0]*b.h*f),Math.round(b.y+b.n[1]*b.h*f),26,1]);
  for(const T of G.teams)if(!T.reb&&!T.out){log(T.id,(b.pont?'A pontoon bridge':'A bridge')+' has been destroyed - that crossing is closed to ground forces.',team>=0&&ally(T.id,team)?'g':'bad');FXE('tping',[T.id,b.x|0,b.y|0,0]);}}
function lgBridges(st){const D=G.lgd;for(const k of Object.keys(D.bd)){const s=D.bd[k],c=s.ch;if(!c||s.dead)continue;let df=false;
    for(const e of nearby(c.x,c.y,60,LG_N))if(!e.dead&&!e.isB&&e.team!=null&&e.team>=0&&!ally(e.team,c.team)&&e.s&&e.s.dom==='ground'&&(e.kind==='dozer'||isInf(e.s))&&Math.hypot(e.x-c.x,e.y-c.y)<60){df=true;break;}
    if(df){c.df=(c.df||0)+st;if(c.df>=5){s.ch=null;D.v++;log(c.team,'The enemy cleared our charges from the bridge.','w');FXE('txt',[c.x|0,c.y|0,'CHARGES CLEARED',c.team,-2]);continue;}}else c.df=0;
    if(G.t>=c.t)lgBridgeDown(+k,c.team);}}
// ---- ports + blockade ----
function lgPorts(){for(const e of G.ents){if(e.dead||!e.isB||e.kind!=='shipyard'||e.built<1)continue;let en=0,fr=0;
    for(const u of nearby(e.x,e.y,650,LG_N)){if(u.dead||u.isB||!u.s||u.s.dom!=='naval'||u.team==null||u.team<0)continue;if(Math.hypot(u.x-e.x,u.y-e.y)>650)continue;if(ally(u.team,e.team))fr++;else en++;}
    const b=en>0&&fr===0?1:0;if(b!==(e.blk|0)){e.blk=b;G.lgd.v++;if(G.conq){log(e.team,b?'Your port is BLOCKADED by enemy warships - no sea trade and no supply by sea until you break it.':'The blockade of your port is broken - sea trade resumes.',b?'bad':'g');if(b)FXE('tping',[e.team,e.x|0,e.y|0,0]);}}}}
// ---- checkpoints, tolls, sea trade, stocked depots ----
function lgCkTick(){const D=G.lgd;if(!D.ck.length)return;const ids=new Set();for(const d of G.dug||[])ids.add(d.id);const n0=D.ck.length;
  D.ck=D.ck.filter(q=>{const ok=q.dg.some(i=>ids.has(i));if(!ok)log(q.team,'One of your road checkpoints was destroyed.','w');return ok;});if(D.ck.length!==n0)D.v++;}
function lgToll(st){if(!G.conq||!G.lg.reach)return;const L=G.lg,D=G.lgd,got={};
  for(const q of D.ck){const T=G.teams[q.team];if(!T||T.out||T.reb)continue;const e=L.E[q.ei],r=L.reach[q.team];if(e&&r&&r[e.a]&&r[e.b])T.credits+=LG_TOLL*st;}
  for(let j=L.nS;j<L.N.length;j++){const nd=L.N[j];if(!nd.port)continue;const e=G.byId.get(nd.e);if(!e||e.blk)continue;const gk=got[nd.tm]|0;got[nd.tm]=gk+1;const T=G.teams[nd.tm];if(T&&!T.out&&!T.reb){const v=LG_SEA*(gk?.5:1)*(G.bs||1);T.credits+=v*st;T._sr=(T._sr||0)+v;}}
  for(const T of G.teams){T.seaR=T._sr||0;T._sr=0;}
  for(let j=L.nS;j<L.N.length;j++){const nd=L.N[j];if(nd.port)continue;const e=G.byId.get(nd.e);if(!e||!(e.dl>G.t))continue;
    for(const u of nearby(e.x,e.y,SUP_R.depot,LG_N))if(!u.dead&&!u.isB&&u.team===e.team&&u.hp<u.max&&u.s&&u.s.dom==='ground'&&G.t-(u.lastHit||-99)>6&&Math.hypot(u.x-e.x,u.y-e.y)<SUP_R.depot)u.hp=Math.min(u.max,u.hp+u.max*.006*st);}}
// ---- mines: checked every step (vehicles are fast) ----
function lgMines(dt){const D=G.lgd;if(!D||!D.mn||!D.mn.length)return;for(let i=D.mn.length-1;i>=0;i--){const m=D.mn[i];let hit=null,clr=false;
    for(const e of nearby(m.x,m.y,70,LG_N)){if(e.dead||e.isB||e.team==null||e.team<0||ally(e.team,m.team)||!e.s||e.s.dom!=='ground'||e.inTun)continue;const d=Math.hypot(e.x-m.x,e.y-m.y);
      if(e.kind==='dozer'){if(d<70){m.cl=(m.cl||0)+dt;if(m.cl>3){clr=e.team;break;}}continue;}if(isInf(e.s))continue;if(d<e.r+14){hit=e;break;}}
    if(clr!==false){D.mn.splice(i,1);D.v++;log(clr,'Engineers cleared an enemy mine from the road.','g');log(m.team,'The enemy cleared one of our road mines.','w');FXE('txt',[m.x|0,m.y|0,'MINE CLEARED',clr,-2]);continue;}
    if(hit){D.mn.splice(i,1);D.v++;const ht=hit.team;explode(m.x,m.y,34,230,m.team,'boom','mine');log(ht,'A vehicle hit a mine on the road!','bad');log(m.team,'One of our road mines hit an enemy vehicle.','g');}}}
// ---- airlift ----
function lgAirTick(){for(const u of G.ents){if(!u.alq)continue;if(u.dead){u.alq=null;continue;}const q=u.alq,o=u.order;if(Math.hypot(u.x-q.x,u.y-q.y)<170){u.alq=null;lgAirDrop(u,q);continue;}
    if(!o||o.type!=='move'||Math.hypot(o.x-q.x,o.y-q.y)>90){u.alq=null;log(u.team,'Airlift canceled.','w');}}}
function lgAirDrop(u,q){let tg=null,nm='';if(q.dp){const e=G.byId.get(q.dp);if(e&&!e.dead&&e.team===u.team){tg=e;nm='the forward depot';}}else{const t=G.towns[q.ti];if(t&&t.ow===u.team){tg=t;nm=t.name;}}
  if(!tg)return;const T=G.teams[u.team];if(T.credits<LG_AIRC){log(u.team,`Not enough supplies to unload the airlift ($${LG_AIRC}).`,'w');return;}T.credits-=LG_AIRC;
  tg.dl=G.t+CVY_STOCK;tg.air=G.t+LG_AIRT;G.lgd.v++;G.lg.sig='';for(const e of nearby(tg.x,tg.y,SUP_R.town,LG_N))if(!e.isB&&!e.dead&&e.team===u.team&&e.am!==undefined)e.am=e.amx;
  log(u.team,`Airlift delivered to ${nm}: stocked, and supplied for 2 min even if it is cut off.`,'g');FXE('txt',[tg.x|0,tg.y|0,'AIRLIFT',u.team,-2]);}
// ---- roads to depots / ports ----
function lgRoadTo(team,tn,name,ids,dp){const L=G.lg,D=G.lgd;if(tn==null)return;if(L.reach&&L.reach[team]&&L.reach[team][tn]&&L.trade&&L.trade[team]&&L.trade[team][tn]){log(team,'Already joined to your network.','w');return;}
  let job=D.job.find(j=>j.team===team&&j.dp===dp&&!j.done);const to=L.N[tn];
  if(!job){let from=-1,bd=1e18;const tr=L.trade&&L.trade[team];for(let i=0;i<L.nS;i++){const nd=L.N[i];const ok=nd.b===team||(tr&&tr[i]&&lgNodeOwn(nd,team)&&nd.t>=0);if(!ok)continue;const d=Math.hypot(nd.x-to.x,nd.y-to.y);if(d<bd){bd=d;from=i;}}
    if(from<0){log(team,'No route for a road to there.','w');return;}const fn=L.N[from];let pts=roadRoute(G.grid,fn.x,fn.y,to.x,to.y,60000);if(!pts||pts.length<2){log(team,'No route for a road to there.','w');return;}
    pts=pts.map(p=>[Math.round(p[0]),Math.round(p[1])]);pts[0]=[Math.round(fn.x),Math.round(fn.y)];pts[pts.length-1]=[Math.round(to.x),Math.round(to.y)];let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
    job={id:D.id++,team,a:from,b:-1,dp,pts,len,prog:0,done:0,t:G.t};D.job.push(job);D.v++;log(team,`Road to ${name}: ${Math.round(len/10)} m, about $${Math.round(len*LG_COST)}. Engineers build it - protect them.`,'g');}
  let us=(ids||[]).map(i=>G.byId.get(i)).filter(u=>u&&!u.dead&&u.team===team&&u.kind==='dozer');
  if(!us.length){let best=null,b2=1e18;for(const u of G.ents)if(u.team===team&&u.kind==='dozer'&&!u.dead&&!(u.order&&(u.order.type==='road'||u.order.type==='lgj'))){const d=Math.hypot(u.x-job.pts[0][0],u.y-job.pts[0][1]);if(d<b2){b2=d;best=u;}}if(best)us=[best];}
  for(const u of us){u.order={type:'road',job:job.id};u.target=null;u.path=null;u.wl=null;}}
// ---- the 'lg' command: engineer jobs, roads to depots, airlift ----
function lgCost(o){return o.k==='fixb'&&G.map.bridges[o.bi]&&G.map.bridges[o.bi].pont?LGC.pont:LGC[o.k];}
function lgCmd(team,a){const D=G.lgd,L=G.lg;if(!D||!L||!G.conq)return;lgFix(D);const k=a.k,T=G.teams[team];if(!T)return;
  if(k==='droad'){const e=G.byId.get(a.tid);if(e&&!e.dead&&e.isB&&e.team===team&&(e.kind==='depot'||e.kind==='shipyard'))lgRoadTo(team,L.en[e.id],e.kind==='depot'?'the forward depot':'the port',a.ids,e.id);return;}
  if(k==='alift'){const hs=(a.ids||[]).map(i=>G.byId.get(i)).filter(u=>u&&!u.dead&&u.team===team&&u.kind==='airlift');if(!hs.length)return;let q=null,nm='';
    if(a.tid>0){const e=G.byId.get(a.tid);if(e&&!e.dead&&e.isB&&e.team===team&&e.kind==='depot'){q={dp:e.id,x:e.x,y:e.y};nm='the forward depot';}}else{const t=G.towns[a.ti];if(t&&t.ow===team){q={ti:t.i,x:t.x,y:t.y};nm=t.name;}}
    if(!q){log(team,'Airlift: pick one of your towns or Supply Depots.','w');return;}if(T.credits<LG_AIRC){log(team,`Not enough supplies for an airlift ($${LG_AIRC}).`,'w');return;}
    const h=hs[0];setMove(h,q.x,q.y,'move');h.alq=q;log(team,`Transport Helicopter flying supplies to ${nm} ($${LG_AIRC} on delivery).`,'g');return;}
  let o=null;
  if(k==='mine'||k==='ckpt'){const q=lgNearRoad(a.x,a.y,110);if(!q){log(team,'Pick a spot on a road.','w');return;}
    if(k==='ckpt'&&D.ck.some(c=>Math.hypot(c.x-q.x,c.y-q.y)<180)){log(team,'There is already a checkpoint there.','w');return;}o={type:'lgj',k,x:Math.round(q.x),y:Math.round(q.y),ei:q.i,a:+q.a.toFixed(3)};}
  else if(k==='demo'||k==='fixb'){const i=lgNearBr(a.x,a.y,260);if(i<0){log(team,'Pick a bridge.','w');return;}const b=G.map.bridges[i],s=D.bd[i];
    if(k==='demo'&&(b.dead||(s&&s.ch))){log(team,b.dead?'That bridge is already down.':'Charges are already set on that bridge.','w');return;}if(k==='fixb'&&!b.dead){log(team,'That bridge is not destroyed.','w');return;}o={type:'lgj',k,bi:i};}
  else if(k==='pont'){if(D.pt.filter(p=>p.team===team).length>=LG_PONT_MAX){log(team,`At most ${LG_PONT_MAX} pontoon bridges per army.`,'w');return;}const p=lgPontPlan(a.x,a.y);
    if(!p){log(team,'A pontoon needs a narrow river crossing away from other bridges - click on the river.','w');return;}o={type:'lgj',k,pb:p};}
  if(!o)return;const c=lgCost(o);if(T.credits<c){log(team,`Not enough supplies ($${c} needed).`,'w');return;}
  let dz=(a.ids||[]).map(i=>G.byId.get(i)).filter(u=>u&&!u.dead&&u.team===team&&u.kind==='dozer');const tx=o.x!=null?o.x:o.pb?o.pb.x:G.map.bridges[o.bi].x,ty=o.y!=null?o.y:o.pb?o.pb.y:G.map.bridges[o.bi].y;
  if(!dz.length){let best=null,bd=1e18;for(const u of G.ents)if(u.team===team&&u.kind==='dozer'&&!u.dead&&!(u.order&&u.order.type!=='move')){const d=Math.hypot(u.x-tx,u.y-ty);if(d<bd){bd=d;best=u;}}if(best)dz=[best];}
  if(!dz.length){log(team,'No free Construction Vehicle for that job.','w');return;}
  const u=dz[0];u.order=Object.assign({p:0,age:0},o);u.target=null;u.path=null;u.wl=null;
  log(team,{mine:'Engineers on the way to mine the road.',ckpt:'Engineers on the way to set up a checkpoint.',demo:'Engineers on the way to rig the bridge.',fixb:'Engineers on the way to rebuild the bridge.',pont:'Engineers on the way to lay a pontoon bridge.'}[k]+` ($${c})`,'g');}
function lgDoze(u,dt){const o=u.order;if(!o||o.type!=='lgj')return false;const D=G.lgd,B=G.map.bridges;if(!D){u.order=null;return true;}o.age+=dt;if(o.age>360){u.order=null;return true;}
  if(o.bi!=null){const b=B[o.bi],s=D.bd[o.bi];if(!b||(o.k==='demo'&&(b.dead||(s&&s.ch)))||(o.k==='fixb'&&!b.dead)){u.order=null;return true;}}
  if(o.x==null){const p=o.bi!=null?B[o.bi]:lgBrObj({x:o.pb.x,y:o.pb.y,h:o.pb.h,nx:o.pb.n[0],ny:o.pb.n[1]});const A=p.a,Bp=p.b,pick=Math.hypot(A[0]-u.x,A[1]-u.y)<=Math.hypot(Bp[0]-u.x,Bp[1]-u.y)?A:Bp;
    const q=nearestPassXY('ground',pick[0],pick[1])||pick;o.x=Math.round(q[0]);o.y=Math.round(q[1]);o.cx=p.x;o.cy=p.y;}
  const d=Math.hypot(o.x-u.x,o.y-u.y);if(d>(o.k==='mine'?26:64)){navTo(u,o.x,o.y,dt);return true;}
  if(!o.paid){const T=G.teams[u.team],c=lgCost(o);if(T.credits<c){log(u.team,`Not enough supplies ($${c} needed).`,'w');u.order=null;return true;}T.credits-=c;o.paid=1;}
  o.p+=dt;u.building=true;u.ang=Math.atan2((o.cy!=null?o.cy:o.y)-u.y,(o.cx!=null?o.cx:o.x)-u.x);u.lastFire=G.t;if(o.p<LGT[o.k])return true;
  u.order=null;lgDone(u,o);return true;}
function lgDone(u,o){const D=G.lgd,L=G.lg,team=u.team,k=o.k;
  if(k==='mine'){const my=D.mn.filter(m=>m.team===team);if(my.length>=LG_MINE_MAX)D.mn.splice(D.mn.indexOf(my[0]),1);D.mn.push({id:D.id++,team,x:o.x,y:o.y});D.v++;
    log(team,'Mine laid on the road: the first enemy vehicle over it is hit. Enemy engineers can clear it.','g');}
  else if(k==='ckpt'){const my=D.ck.filter(c=>c.team===team);if(my.length>=LG_CK_MAX)D.ck.splice(D.ck.indexOf(my[0]),1);
    const nx=-Math.sin(o.a),ny=Math.cos(o.a),dg=[];for(const off of [-58,-34,34,58]){const d=dugAdd(team,'trench',o.x+nx*off,o.y+ny*off,o.a);if(d)dg.push(d.id);}
    D.ck.push({id:D.id++,team,x:o.x,y:o.y,ei:o.ei,dg});D.v++;L.sig='';log(team,`Checkpoint up: enemy supply can't use this road while it stands, and it collects a toll ($${Math.round(LG_TOLL*60)}/min) while the road is on your network.`,'g');}
  else if(k==='demo'){const b=G.map.bridges[o.bi];const s=D.bd[o.bi]||(D.bd[o.bi]={hp:lgBrMax(b)});s.ch={team,t:G.t+LG_CHG,x:o.x,y:o.y,df:0};D.v++;
    for(const T of G.teams)if(!T.reb&&!T.out){const fr=ally(T.id,team);log(T.id,fr?`Charges set - the bridge blows in ${LG_CHG} s.`:`Enemy engineers have rigged a bridge to blow in ${LG_CHG} s! Put infantry or a Construction Vehicle on the charges to clear them.`,fr?'g':'bad');FXE('tping',[T.id,o.x|0,o.y|0,0]);}}
  else if(k==='fixb'){const b=G.map.bridges[o.bi];if(!b||!b.dead)return;D.bd[o.bi]={hp:lgBrMax(b)};D.bv++;D.v++;lgBrApply();for(const e of G.ents)if(!e.isB&&e.path&&e.s&&e.s.dom!=='air')e.path=null;
    for(const T of G.teams)if(!T.reb&&!T.out)log(T.id,'A bridge has been rebuilt - the crossing is open again.',ally(T.id,team)?'g':'w');}
  else if(k==='pont'){const p=o.pb;if(G.map.bridges.some(b=>Math.hypot(b.x-p.x,b.y-p.y)<240)||D.pt.filter(q=>q.team===team).length>=LG_PONT_MAX){G.teams[team].credits+=LGC.pont;log(team,'Pontoon canceled - the crossing is taken.','w');return;}
    D.pt.push({x:p.x,y:p.y,h:p.h,nx:p.n[0],ny:p.n[1],team});lgPontSync();D.bd[G.map.bridges.length-1]={hp:800};D.bv++;D.v++;lgSync();for(const e of G.ents)if(!e.isB&&e.path&&e.s&&e.s.dom!=='air')e.path=null;
    for(const T of G.teams)if(!T.reb&&!T.out){log(T.id,ally(T.id,team)?'Pontoon bridge laid - ground forces can cross here now.':'The enemy has laid a pontoon bridge across the river!',ally(T.id,team)?'g':'bad');if(!ally(T.id,team))FXE('tping',[T.id,p.x,p.y,0]);}}}
