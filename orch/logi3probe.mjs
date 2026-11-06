// Logistics stage 5b-9 probe: depots as nodes, mines, checkpoints, bridge demolish/rebuild, pontoon, airlift, port blockade.
// node orch/logi3probe.mjs   (headless, ~1-2 min)
import { makeSim } from './headless.mjs';
const { W } = makeSim();
const ok = (n, v, x) => console.log((v ? 'OK   ' : 'FAIL ') + n + (x !== undefined ? ' ' + JSON.stringify(x) : ''));
W.start({ seed: 3, facs: ['US', 'RU'], map: 'fulda' });
W.ev('G.teams.forEach(T=>{T.ai=null;T.credits=50000;})');W.ev('G.setupEnd=0');
W.step(3);
// ---- bridges: demolish ----
const nb = W.ev('G.map.bridges.length');ok('bridges on fulda', nb >= 3, nb);
W.ev(`(()=>{const b=G.map.bridges[0];const p=nearestPassXY('ground',b.a[0]-b.n[0]*60,b.a[1]-b.n[1]*60);G.dz0=addUnit(0,'dozer',p[0],p[1]).id;})()`);
const crossE = W.ev(`G.lg.E.map((e,i)=>e.br&&e.br.includes(0)?i:-1).filter(i=>i>=0)`);
W.ev(`act(0,{t:'lg',k:'demo',x:G.map.bridges[0].x,y:G.map.bridges[0].y,ids:[G.dz0]})`);
for (let i = 0; i < 12 && !W.ev('!!(G.lgd.bd[0]&&G.lgd.bd[0].ch)'); i++) W.step(3);
ok('charges set', W.ev('!!(G.lgd.bd[0]&&G.lgd.bd[0].ch)'));
W.step(32);
ok('bridge down', W.ev('!!G.map.bridges[0].dead'));
ok('grid cells now blown (4)', W.ev('lgBrCells(G.map.bridges[0]).every(c=>G.grid[c]===4)'), W.ev('lgBrCells(G.map.bridges[0]).length'));
ok('ground regions rebuilt', W.ev(`(()=>{const R=regions('ground');return R&&R.length===GW*GH})()`));
ok('roads over it blocked', crossE.length === 0 || W.ev(`${JSON.stringify(crossE)}.every(i=>lgBlk(i,0))`), crossE);
// ---- rebuild ----
W.ev(`act(0,{t:'lg',k:'fixb',x:G.map.bridges[0].x,y:G.map.bridges[0].y,ids:[G.dz0]})`);
for (let i = 0; i < 30 && W.ev('!!G.map.bridges[0].dead'); i++) W.step(3);
ok('bridge rebuilt', !W.ev('G.map.bridges[0].dead'), W.ev('G.t|0'));
ok('grid back to deck (2)', W.ev('lgBrCells(G.map.bridges[0]).every(c=>G.grid[c]===2)'));
// ---- pontoon ----
const spot = W.ev(`(()=>{const rv=G.map.rivers[0];for(let f=.05;f<.98;f+=.01){const target=f*rv.len;let k=0;const P=rv.pts;while(k<P.length-2&&rv.acc[k+1]<target)k++;const x=(P[k][0]+P[k+1][0])/2,y=(P[k][1]+P[k+1][1])/2;if(x<100||y<100||x>MAPW-100||y>MAPH-100)continue;if(lgPontPlan(x,y))return[x|0,y|0];}return null;})()`);
ok('pontoon spot found', !!spot, spot);
if (spot) {
  W.ev(`(()=>{const p=lgPontPlan(${spot[0]},${spot[1]});const b=lgBrObj({x:p.x,y:p.y,h:p.h,nx:p.n[0],ny:p.n[1]});const q=nearestPassXY('ground',b.a[0]-p.n[0]*50,b.a[1]-p.n[1]*50);const u=G.byId.get(G.dz0);u.x=q[0];u.y=q[1];u.path=null;})()`);
  W.ev(`act(0,{t:'lg',k:'pont',x:${spot[0]},y:${spot[1]},ids:[G.dz0]})`);
  for (let i = 0; i < 25 && W.ev('G.lgd.pt.length') === 0; i++) W.step(3);
  ok('pontoon laid', W.ev('G.lgd.pt.length') === 1, W.ev('G.map.bridges.length'));
  ok('pontoon deck cells', W.ev('(()=>{const b=G.map.bridges[G.map.bridges.length-1];const c=lgBrCells(b);return c.length>0&&c.every(i=>G.grid[i]===2)})()'));
  const fp = W.ev(`(()=>{const b=G.map.bridges[G.map.bridges.length-1];const p=findPath('ground',b.a[0]-b.n[0]*40,b.a[1]-b.n[1]*40,b.b[0]+b.n[0]*40,b.b[1]+b.n[1]*40);if(!p)return -1;let L=0,x=b.a[0]-b.n[0]*40,y=b.a[1]-b.n[1]*40;for(const q of p){L+=Math.hypot(q[0]-x,q[1]-y);x=q[0];y=q[1];}return L|0})()`);
  ok('route uses pontoon (short crossing)', fp > 0 && fp < 1200, fp);
}
// ---- mine ----
const road = W.ev(`(()=>{const e=G.lg.E[0];const p=lgPoint(e,e.len*.5);return[p[0]|0,p[1]|0]})()`);
W.ev(`(()=>{const q=nearestPassXY('ground',${road[0]}+40,${road[1]});const u=G.byId.get(G.dz0);u.x=q[0];u.y=q[1];u.path=null;u.order=null;})()`);
W.ev(`act(0,{t:'lg',k:'mine',x:${road[0]},y:${road[1]},ids:[G.dz0]})`);
for (let i = 0; i < 12 && W.ev('G.lgd.mn.length') === 0; i++) W.step(2);
ok('mine laid', W.ev('G.lgd.mn.length') === 1, W.ev('G.lgd.mn[0]'));
W.ev(`(()=>{const m=G.lgd.mn[0];const u=addUnit(1,'tank',m.x+150,m.y);G.tk=u.id;G.tkhp=u.hp;setMove(u,m.x-150,m.y,'move');})()`);
for (let i = 0; i < 20 && W.ev('G.lgd.mn.length') === 1; i++) W.step(.5);
ok('enemy vehicle hit the mine', W.ev('G.lgd.mn.length') === 0 && W.ev('(()=>{const u=G.byId.get(G.tk);return !u||u.dead||u.hp<G.tkhp})()'), W.ev('(()=>{const u=G.byId.get(G.tk);return u?[u.hp|0,G.tkhp,u.dead]:"gone"})()'));
// ---- checkpoint ----
W.ev(`(()=>{const t=G.byId.get(G.tk);if(t&&!t.dead)kill(t,0,null);const q=nearestPassXY('ground',${road[0]}+40,${road[1]});G.dz0=addUnit(0,'dozer',q[0],q[1]).id;})()`);
W.ev(`act(0,{t:'lg',k:'ckpt',x:${road[0]},y:${road[1]},ids:[G.dz0]})`);
console.log('dz', W.ev('(()=>{const u=G.byId.get(G.dz0);return u?[u.dead,u.x|0,u.y|0,JSON.stringify(u.order)]:null})()'));
for (let i = 0; i < 15 && W.ev('G.lgd.ck.length') === 0; i++) W.step(2);
ok('checkpoint up', W.ev('G.lgd.ck.length') === 1, W.ev('G.lgd.ck[0]&&G.lgd.ck[0].dg.length'));
ok('road closed to enemy, open to owner', W.ev('(()=>{const q=G.lgd.ck[0];return lgBlk(q.ei,1)&&!lgBlk(q.ei,0)})()'));
// ---- depot as node ----
const dep = W.ev(`(()=>{const e=G.lg.E[1]||G.lg.E[0];const p=lgPoint(e,e.len*.5);const q=nearestPassXY('ground',p[0]+90,p[1]+60);const b=addBld(0,'depot',q[0],q[1],1);b.built=1;return b.id})()`);
W.step(2);
ok('depot is a node', W.ev(`G.lg.en[${dep}]!=null`), W.ev('G.lg.N.length'));
ok('depot linked to roads', W.ev(`(G.lg.dl[G.lg.en[${dep}]]||[]).length>0`), W.ev(`G.lg.dl[G.lg.en[${dep}]]`));
// ---- airlift ----
W.ev(`(()=>{const B=BASES[0];const ts=[...G.towns].sort((a,b)=>Math.hypot(a.x-B[0],a.y-B[1])-Math.hypot(b.x-B[0],b.y-B[1]));G.tw=ts[0].i;for(const c of ts[0].cells)if(c.key)c.ow=0;G.civDirty=true;})()`);
W.step(2);
W.ev(`(()=>{const h=addUnit(0,'airlift',BASES[0][0],BASES[0][1]);G.hl=h.id;act(0,{t:'lg',k:'alift',ids:[h.id],ti:G.tw,tid:0});})()`);
for (let i = 0; i < 30 && !W.ev('G.towns[G.tw].air>G.t'); i++) W.step(2);
ok('airlift delivered', W.ev('G.towns[G.tw].air>G.t'), W.ev('[G.towns[G.tw].ow,G.towns[G.tw].name]'));
// ---- pack round trip ----
ok('pack ok', W.ev('(()=>{const p=lgPack();return p.mn&&p.ck&&p.bd&&Array.isArray(p.pt)})()'));
console.log('errors', W.ev('(G.errs||[]).length'), 'credits', W.ev('G.teams[0].credits|0'));
// client apply (last: it overwrites host-only fields)
ok('client apply runs', W.ev('(()=>{try{lgApply(JSON.parse(JSON.stringify(lgPack())));return G.lgd.pt.length===1&&G.map.bridges.length===5}catch(e){return String(e)}})()'));
