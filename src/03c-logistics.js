/* ---------- LOGISTICS: roads you build, supply network, cut-off towns (orch/logistics, 2026-11-05) ----------
   The static town roads (M.roadNet) and the roads engineers build form a graph: nodes = bases + towns/hamlets, edges = road
   polylines. Each team's SUPPLY NETWORK = every node reachable from its base over uncratered roads without crossing a node an
   enemy holds. An owned town outside it is CUT OFF (no ammo from its supply circle, tax -50%, unrest up). A town reached only
   through nodes you or allies hold gets the TRADE ROUTE bonus (+25% tax, calmer). Big shell / bomb / missile blasts on a road
   crater it (the link is cut for ~150 s, a friendly construction vehicle nearby repairs it 6x faster).
   Everything here is deterministic (no random numbers); the host computes, clients get G.lgd + the town flags in teamGlobals.
   State: G.lg (static graph, rebuilt from the map) and G.lgd (dynamic: built roads rb, craters cr, jobs job, blast damage dm). */
const LG_COST=.09,LG_SPD=60,LG_CRATER_T=150,LG_CRATER_HP=240,LG_TRADE=1.25,LG_CUT=.5;
function lgInit(){const M=G.map,L=G.lg={N:[],E:[],reach:null,trade:null,sig:'',ref:null,tn:{}};G.lgd={v:0,rb:[],cr:{},job:[],dm:{},id:1};
  BASES.forEach((b,i)=>L.N.push({x:b[0],y:b[1],b:i,t:-1}));
  for(const c of (M.cities||[])){let ti=-1;for(const t of G.towns)if(t.x===c.x&&t.y===c.y){ti=t.i;break;}L.N.push({x:c.x,y:c.y,b:-1,t:ti});if(ti>=0)L.tn[ti]=L.N.length-1;}
  const nodeAt=p=>{let b=-1,bd=300;L.N.forEach((n,i)=>{const d=Math.hypot(n.x-p[0],n.y-p[1]);if(d<bd){bd=d;b=i;}});return b;};
  for(const rp of (M.roadNet||[])){if(!rp||rp.length<2)continue;const a=nodeAt(rp[0]),b=nodeAt(rp[rp.length-1]);if(a<0||b<0||a===b)continue;L.E.push(lgEdge(a,b,rp,-1));}
  L.n0=L.E.length;}
function lgEdge(a,b,pts,team){const cum=[0];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i<pts.length;i++){if(i)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));x0=Math.min(x0,pts[i][0]);y0=Math.min(y0,pts[i][1]);x1=Math.max(x1,pts[i][0]);y1=Math.max(y1,pts[i][1]);}return{a,b,pts,cum,len:cum[cum.length-1],team,bb:[x0,y0,x1,y1]};}
// stamp a polyline into the road mask (same footprint as the map's roads) so units drive faster on it and the ground shows gravel
function lgStamp(pts){const rm=G.roadMask;if(!rm)return;const C=rm.C,w=rm.w,h=rm.h;
  const cells=[];for(let i=1;i<pts.length;i++){const L=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]),k=Math.max(1,Math.ceil(L/8));for(let j=(i>1?1:0);j<=k;j++)cells.push([(pts[i-1][0]+(pts[i][0]-pts[i-1][0])*j/k)/C|0,(pts[i-1][1]+(pts[i][1]-pts[i-1][1])*j/k)/C|0]);}
  for(const [ci,cj] of cells){for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const x=ci+i,y=cj+j;if(x>=0&&y>=0&&x<w&&y<h&&Math.hypot(i,j)<=2)rm.d[y*w+x]=1;}}
  if(rm.f)for(const [ci,cj] of cells){for(let i=-7;i<=7;i++)for(let j=-7;j<=7;j++){const x=ci+i,y=cj+j;if(x<0||y<0||x>=w||y>=h)continue;const v=1-Math.max(0,(Math.hypot(i,j)-2)/5);if(v>rm.f[y*w+x])rm.f[y*w+x]=v;}}
  G.roadV=(G.roadV|0)+1;}
// rebuild the derived edge list after the dynamic state changed (new built road, checkpoint restore, client update)
function lgSync(){const L=G.lg,D=G.lgd;if(!L||!D)return;L.E.length=L.n0;for(const r of D.rb)L.E.push(lgEdge(r.a,r.b,r.pts,r.team));
  const keep=L.ref===D?(L.stamped|0):0;for(let i=keep;i<D.rb.length;i++)lgStamp(D.rb[i].pts);L.stamped=D.rb.length;L.ref=D;L.sig='';}
function lgNodeOwn(n,k){if(n.b>=0)return n.b<G.teams.length&&!G.teams[n.b].reb&&ally(n.b,k)&&!G.teams[n.b].out;if(n.t>=0){const t=G.towns[n.t];return t.ow>=0&&ally(t.ow,k);}return false;}
function lgNodeFoe(n,k){if(n.b>=0)return n.b!==k&&n.b<G.teams.length&&!ally(n.b,k)&&!G.teams[n.b].reb&&!G.teams[n.b].out;if(n.t>=0){const t=G.towns[n.t];return t.reb>G.t||(t.ow>=0&&!ally(t.ow,k));}return false;}
// recompute reach (permissive: over neutral nodes too) and trade (own nodes only) per team; only when something changed
function lgCompute(){const L=G.lg,D=G.lgd,n=L.N.length,Nt=G.teams.length;
  L.reach=[];L.trade=[];const adj=L.N.map(()=>[]);L.E.forEach((e,i)=>{if(D.cr[i]&&D.cr[i].t>G.t)return;adj[e.a].push(e.b);adj[e.b].push(e.a);});
  for(let k=0;k<Nt;k++){const T=G.teams[k];if(T.reb||T.out){L.reach.push(null);L.trade.push(null);continue;}
    for(const mode of [0,1]){const seen=new Uint8Array(n),q=[];for(let i=0;i<n;i++)if(L.N[i].b>=0&&lgNodeOwn(L.N[i],k)){seen[i]=1;q.push(i);}
      while(q.length){const i=q.pop();for(const j of adj[i]){if(seen[j])continue;const nd=L.N[j];if(mode?!lgNodeOwn(nd,k):lgNodeFoe(nd,k))continue;seen[j]=1;q.push(j);}}
      (mode?L.trade:L.reach).push(seen);}}
  for(const t of G.towns){const ni=L.tn[t.i];t.cut=0;t.trade=0;if(t.ow<0||ni==null)continue;if(!L.reach[t.ow])continue;
    if(!L.reach[t.ow][ni])t.cut=1;else if(L.trade[t.ow][ni])t.trade=1;}
  G.lgv=(G.lgv|0)+1;}
function lgTick(st){if(!G.towns||!G.lg||!G.lgd)return;const L=G.lg,D=G.lgd;if(L.ref!==D||L.E.length!==L.n0+D.rb.length)lgSync();
  // craters heal on their own, six times faster with a friendly construction vehicle next to them
  for(const k of Object.keys(D.cr)){const c=D.cr[k];let rate=1;for(const e of G.ents)if(e.kind==='dozer'&&!e.dead&&Math.hypot(e.x-c.x,e.y-c.y)<170){rate=6;break;}c.t-=(rate-1)*st;if(c.t<=G.t){delete D.cr[k];D.v++;D.dm[k]=0;}}
  let s='';for(const t of G.towns)s+=(t.ow+1)+(t.reb>G.t?'r':'')+',';for(const k of Object.keys(D.cr))s+='c'+k;for(const t2 of G.teams)s+=t2.out?'o':'';s+='|'+D.rb.length;
  if(s!==L.sig||!L.reach){L.sig=s;const c0=G.towns.map(t=>t.cut|0);lgCompute();
    for(const t of G.towns){if(t.ow>=0&&t.cut&&!c0[t.i]){log(t.ow,`${t.name} is CUT OFF from your supply network - reconnect the road, retake the link or build a bypass.`,'bad');FXE('tping',[t.ow,t.x|0,t.y|0,0]);}
      else if(t.ow>=0&&!t.cut&&c0[t.i])log(t.ow,`${t.name} is back on your supply network.`,'g');}}
  lgJobs(st);}
// ---- building roads ----
function lgPathTo(team,ti){const L=G.lg,tn=L.tn[ti];if(tn==null)return null;const to=L.N[tn];
  // start from the nearest node already on the team's trade network (own base / own towns joined to it)
  let from=-1,bd=1e18;const tr=L.trade&&L.trade[team];for(let i=0;i<L.N.length;i++){if(i===tn)continue;const nd=L.N[i];const ok=nd.b===team||(tr&&tr[i]&&lgNodeOwn(nd,team)&&nd.t>=0);if(!ok)continue;const d=Math.hypot(nd.x-to.x,nd.y-to.y);if(d<bd){bd=d;from=i;}}
  if(from<0)return null;const fn=L.N[from];let pts=roadRoute(G.grid,fn.x,fn.y,to.x,to.y,60000);if(!pts||pts.length<2)return null;
  pts=pts.map(p=>[Math.round(p[0]),Math.round(p[1])]);pts[0]=[Math.round(fn.x),Math.round(fn.y)];pts[pts.length-1]=[Math.round(to.x),Math.round(to.y)];return{a:from,b:tn,pts};}
function lgRoadCmd(team,a){if(!G.lg||!G.lgd||!G.conq)return;const t=G.towns[a.ti|0];if(!t||t.ow<0||!ally(t.ow,team))return;const L=G.lg,D=G.lgd,tn=L.tn[t.i];if(tn==null)return;
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
      const nt=G.lg.N[j.b].t;if(nt>=0)log(j.team,`Road to ${G.towns[nt].name} finished.`,'g');for(const u of G.ents)if(u.order&&u.order.type==='road'&&u.order.job===j.id)u.order=null;}
    else if(G.t-(j.t||G.t)>200&&!G.ents.some(u=>!u.dead&&u.order&&u.order.type==='road'&&u.order.job===j.id)){j.dead=1;ch=1;}}
  if(ch){D.job=D.job.filter(j=>!j.done&&!j.dead);D.v++;}}
// ---- road warfare: big blasts crater a road ----
function lgBlast(x,y,r,dmg,wpn){const L=G.lg,D=G.lgd;if(!L||!D||!G.conq||r<22||dmg<25)return;const K=wpn==='bomb'||wpn==='super'||wpn==='missile'||wpn==='shell'||wpn==='boom'?1:.35;
  for(let i=0;i<L.E.length;i++){const e=L.E[i],b=e.bb,m=r*.7+14;if(x<b[0]-m||x>b[2]+m||y<b[1]-m||y>b[3]+m)continue;if(D.cr[i])continue;let bd=1e9,bx=0,by=0;const P=e.pts;
    for(let j=1;j<P.length;j++){const ax=P[j-1][0],ay=P[j-1][1],dx=P[j][0]-ax,dy=P[j][1]-ay,l2=dx*dx+dy*dy||1;const f=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/l2)),px=ax+dx*f,py=ay+dy*f,d=Math.hypot(px-x,py-y);if(d<bd){bd=d;bx=px;by=py;}}
    if(bd>m)continue;D.dm[i]=(D.dm[i]||0)+Math.min(300,dmg)*K;
    if(D.dm[i]>=LG_CRATER_HP){D.dm[i]=0;D.cr[i]={x:Math.round(bx),y:Math.round(by),t:G.t+LG_CRATER_T};D.v++;FXE('boom',[bx|0,by|0,18,1]);
      for(const k of [L.N[e.a],L.N[e.b]]){const t=k&&k.t>=0?G.towns[k.t]:null;if(t&&t.ow>=0)log(t.ow,`The road at ${t.name} is cratered - supply link cut.`,'w');}}}}
// ---- AI: builds roads to its towns ----
function lgAI(T){if(!G.conq||!G.lgd||T.ai.d<1||T.ai.t%7!==3||T.credits<900||G.t<150)return;const D=G.lgd;if(D.job.some(j=>j.team===T.id))return;
  let best=null,bd=1e18;for(const t of G.towns){if(t.ow!==T.id||t.reb>G.t)continue;const tn=G.lg.tn[t.i];if(tn==null||(G.lg.trade&&G.lg.trade[T.id]&&G.lg.trade[T.id][tn]))continue;const d=Math.hypot(t.x-BASES[T.id][0],t.y-BASES[T.id][1]);if(d<bd&&!(t.fr>0)){bd=d;best=t;}}
  if(best&&bd<6500)lgRoadCmd(T.id,{ti:best.i,ids:[]});}
// ---- network packs (host -> clients, only the dynamic part; lives in teamGlobals) ----
function lgPack(){const D=G.lgd;if(!D)return 0;return{rb:D.rb.map(r=>[r.a,r.b,r.team,r.pts.flat()]),cr:Object.keys(D.cr).map(k=>[+k,D.cr[k].x,D.cr[k].y,Math.round(D.cr[k].t-G.t)]),jb:D.job.map(j=>[j.id,j.team,j.a,j.b,Math.round(j.len),Math.round(j.prog/20)*20,j.pts.flat()]),cu:G.towns.filter(t=>t.cut).map(t=>t.i),tr:G.towns.filter(t=>t.trade).map(t=>t.i)};}
function lgApply(d){const D=G.lgd;if(!D||!d||typeof d!=='object')return;const un=a=>{const o=[];for(let i=0;i+1<a.length;i+=2)o.push([a[i],a[i+1]]);return o;};
  if((d.rb||[]).length!==D.rb.length){D.rb=d.rb.map(r=>({a:r[0],b:r[1],team:r[2],pts:un(r[3])}));D.v++;lgSync();}
  D.cr={};for(const c of d.cr||[])D.cr[c[0]]={x:c[1],y:c[2],t:G.t+c[3]};D.job=(d.jb||[]).map(j=>({id:j[0],team:j[1],a:j[2],b:j[3],len:j[4],prog:j[5],pts:un(j[6]),done:0}));
  const cu=new Set(d.cu||[]),tr=new Set(d.tr||[]);for(const t of G.towns){t.cut=cu.has(t.i)?1:0;t.trade=tr.has(t.i)?1:0;}G.lgv=(G.lgv|0)+1;}
