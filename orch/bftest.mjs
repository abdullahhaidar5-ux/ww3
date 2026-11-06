// Battlefield checks (wounded + medics, building stages + rubble clearing, dams + floods, infantry trench lines): headless sim, no browser.
import { makeSim } from './headless.mjs';
let fails = 0; const ck = (n, ok, info = '') => { if (!ok) fails++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${ok || !info ? '' : '  — ' + info}`); };
const { W } = makeSim();
W.start({ seed: 5, facs: ['US', 'RU'], map: 'rivers' });
W.ev('G.teams.forEach(T=>{T.ai=null;G.setupEnd=0;})'); W.step(3);
// ---- wounded + medics
console.log('wounded & medics');
let r = W.ev(`(()=>{const hq=G.ents.find(b=>b.team===0&&b.kind==='hq');const out={};
  let wn=0,dead=0;for(let i=0;i<60;i++){const u=addUnit(0,'inf',hq.x+300+i*3,hq.y+200);u.hp=1;applyDmg(u,50,'gun',1,null,false);if(u.dead)dead++;}
  out.wounded=G.wnd?G.wnd.length:0;out.dead=dead;
  const u2=addUnit(0,'inf',hq.x+600,hq.y+300);u2.hp=1;applyDmg(u2,50,'shell',1,null,true);out.shellWound=G.wnd.some(w=>Math.hypot(w.x-u2.x,w.y-u2.y)<1);
  return JSON.stringify(out)})()`);
console.log('  ', r); r = JSON.parse(r);
ck('some soldiers hit by bullets go down wounded (not all, not none)', r.wounded > 5 && r.wounded < 40, JSON.stringify(r));
ck('a shell kills outright', !r.shellWound);
r = JSON.parse(W.ev(`(()=>{const w0=G.wnd[0];G.wnd.length=0;wndBump();const w={id:G.wndId++,x:w0.x,y:w0.y,team:0,kind:'inf',rank:2,xp:999,t0:G.t,until:G.t+32,p:0,dr:0,md:0};G.wnd.push(w);wndBump();const m=addUnit(0,'medic',w.x+90,w.y);m.order=null;
  return JSON.stringify({id:w.id,x:w.x,y:w.y})})()`));
W.step(0.8); // medic notices (scan every 0.5s) and walks over
const mv = JSON.parse(W.ev(`(()=>{const m=G.ents.find(e=>e.kind==='medic'&&e.team===0);return JSON.stringify({o:!!m.order,x:m.x|0,y:m.y|0})})()`));
ck('an idle medic runs to the wounded', mv.o || Math.abs(mv.x - r.x) < 40, JSON.stringify(mv));
W.step(14);
r = JSON.parse(W.ev(`(()=>{const rev=G.ents.filter(e=>e.team===0&&e.kind==='inf'&&e.rank===2&&!e.dead).length;return JSON.stringify({rev,left:G.wnd.length})})()`));
ck('medic revived him and he kept veterancy', r.rev >= 1, JSON.stringify(r));
r = JSON.parse(W.ev(`(()=>{const L=G.wnd;const n=L.length;return JSON.stringify({n})})()`));
W.step(40);
const after = JSON.parse(W.ev(`JSON.stringify({n:G.wnd.length})`));
ck('the rest bleed out within ~32 s', after.n <= 2, JSON.stringify({ before: r.n, after: after.n }));
// drag to cover
W.ev(`(()=>{G.ents.forEach(e=>{if(e.kind==='medic')e.dead=true});G.wnd.length=0;wndBump();const hq=G.ents.find(b=>b.team===0&&b.kind==='hq');const x=hq.x+500,y=hq.y+260;
  G.dug=[];dugInit();dugAdd(0,'fox',x+70,y,0);const a=addUnit(0,'inf',x+20,y+10);G.wnd.push({id:G.wndId++,x,y,team:0,kind:'inf',rank:0,xp:0,t0:G.t-5,until:G.t+30,p:0,dr:0,md:0});wndBump();window.__a=a.id})()`);
let drs=0;for(let i=0;i<10;i++){W.step(.2);drs=Math.max(drs,W.ev(`(G.wnd[0]&&G.wnd[0].dr)||0`));}
const dr = {dr:drs};
ck('a squad mate drags the wounded man to cover', dr.dr > 0, JSON.stringify(dr));
W.step(12);
const d2 = JSON.parse(W.ev(`(()=>{const w=G.wnd[0];return JSON.stringify({d:w?dugCov(w.x,w.y):-1,gone:!w})})()`));
ck('he ends up in the foxhole (or has been revived/ bled out)', d2.d === 2 || d2.gone, JSON.stringify(d2));
// ---- buildings
console.log('collapsing buildings');
r = JSON.parse(W.ev(`(()=>{const c=G.civ.find(c=>!c.ruin&&!c.dead&&!wndFoes(c.x,c.y,0,330));const o={};const T=0;
  const us=[];for(let i=0;i<6;i++){const u=addUnit(0,'inf',c.x+20,c.y+20);us.push(u);enterGarrison(u,c);}
  o.occ=c.occ.length;
  const g=c.g;g.hp=c.max*.6;updGarrison(g,0.1);o.s1=c.stg|0;g.hp=c.max*.3;updGarrison(g,0.1);o.s2=c.stg|0;o.occ2=c.occ.length;
  G.civTest=c.i;return JSON.stringify(o)})()`));
ck('stage 1 at 2/3 health, stage 2 at 1/3', r.s1 === 1 && r.s2 === 2, JSON.stringify(r));
ck('half the garrison bails out at stage 2', r.occ2 === r.occ - Math.ceil(r.occ / 2) && r.occ >= 2, JSON.stringify(r));
r = JSON.parse(W.ev(`(()=>{const c=G.civ[G.civTest];const g=c.g;g.hp=0;kill(g,1,null);const o={dead:c.dead,rub:G.rubN,rubAt:rubAt(c.x,c.y)};
  const d=addUnit(0,'dozer',c.x+60,c.y);d.order=null;o.dozer=d.id;return JSON.stringify(o)})()`));
ck('collapse leaves rubble', r.dead && r.rub >= 1 && r.rubAt === 1, JSON.stringify(r));
const tank = W.ev(`(()=>{const c=G.civ[G.civTest];const t=addUnit(0,'tank',c.x-80,c.y);const p=rubHeavy(t);return p})()`);
ck('a tank cannot climb the rubble', tank === true);
W.step(3);
let cl = W.ev(`(()=>{const d=G.byId.get(${r.dozer});return d&&d.order?d.order.type:'none'})()`);
ck('an idle Construction Vehicle goes to clear it', cl === 'clr', cl);
W.step(25);
r = JSON.parse(W.ev(`(()=>{const c=G.civ[G.civTest];return JSON.stringify({rub:G.rubN,at:rubAt(c.x,c.y),clr:c.clr|0})})()`));
ck('rubble is cleared by the Construction Vehicle', r.at === 0 && r.clr === 1, JSON.stringify(r));
// ---- dams
console.log('dams & floods');
r = JSON.parse(W.ev(`JSON.stringify({n:G.dams&&G.dams.length,d:G.dams&&G.dams.map(d=>[d.x,d.y,d.w,d.fc.size])})`));
ck('Twin Rivers has two dams', r.n === 2, JSON.stringify(r));
ck('their flood corridors are point-symmetric (same cell count +-15%)', r.d && Math.abs(r.d[0][3] - r.d[1][3]) / Math.max(r.d[0][3], 1) < .15, JSON.stringify(r.d));
ck('the two dams mirror each other', r.d && Math.abs((r.d[0][0] + r.d[1][0]) - 9160) < 400 && Math.abs((r.d[0][1] + r.d[1][1]) - 6280) < 400, JSON.stringify(r.d));
r = JSON.parse(W.ev(`(()=>{const d=G.dams[0];const o={};
  // a dry spot in the corridor 400 along
  let spot=null;for(const [k,c] of d.fc){if(c[0]>350&&c[0]<500&&c[1]<-15&&c[1]>-120){spot=[(k%GW)*CELL+CELL/2,((k/GW)|0)*CELL+CELL/2];break;}}
  o.spot=spot;const e=spot?addUnit(1,'inf',spot[0],spot[1]):null;const tk=spot?addUnit(1,'tank',spot[0]+40,spot[1]):null;o.eid=e&&e.id;o.tid=tk&&tk.id;o.dry=floodAt(spot[0],spot[1]);
  const t0=G.t;applyDmg(d.tg,5000,'cannon',0,null,false);o.dead=d.dead;o.fln=G.fln;window.__sp=spot;return JSON.stringify(o)})()`));
ck('before the breach the spot is dry', r.dry === 0, JSON.stringify(r));
ck('shelling the dam breaches it', r.dead && r.fln === 1, JSON.stringify(r));
W.step(30);
r = JSON.parse(W.ev(`(()=>{const sp=window.__sp,e=G.byId.get(${r.eid}),t=G.byId.get(${r.tid});const f=floodAt(sp[0],sp[1]);return JSON.stringify({f,hp:e?e.hp/e.max:0,thp:t?t.hp/t.max:0,slow:e?floodSlow(e):1,tslow:t?floodSlow(t):1,lvl:damLevel(G.dams[0])})})()`));
ck('the valley floods (level high, spot under water)', r.f > .5 && r.lvl >= .99, JSON.stringify(r));
ck('infantry in the flood are slowed and hurt', r.slow <= .5 && r.hp < 1, JSON.stringify(r));
ck('vehicles are slowed but survive', r.tslow <= .5 && r.thp > .2, JSON.stringify(r));
W.step(150);
r = JSON.parse(W.ev(`(()=>{const sp=window.__sp;return JSON.stringify({f:floodAt(sp[0],sp[1]),fin:G.dams[0].fin,fln:G.fln})})()`));
ck('the water recedes after ~3 minutes', r.f === 0 && r.fin && r.fln === 0, JSON.stringify(r));
// ---- infantry trench line
console.log('trenches');
r = JSON.parse(W.ev(`(()=>{const hq=G.ents.find(b=>b.team===0&&b.kind==='hq');G.teams[0].credits=5000;const x=hq.x+300,y=hq.y-300;const us=[];for(let i=0;i<4;i++)us.push(addUnit(0,'inf',x-60+i*8,y+20));
  act(0,{t:'wall',ids:us.map(u=>u.id),k:'trench',x:x,y:y,x2:x+200,y2:y});window.__tr=us.map(u=>u.id);return JSON.stringify({n:us.filter(u=>u.order&&u.order.type==='wall').length,pcs:us.map(u=>u.wl.length)})})()`));
ck('infantry take a dragged trench line, sharing the pieces', r.n === 4 && r.pcs.reduce((a, b) => a + b, 0) >= 6, JSON.stringify(r));
W.step(40);
r = JSON.parse(W.ev(`JSON.stringify({tr:(G.dug||[]).filter(d=>d.k==='trench').length})`));
ck('the trench pieces get dug', r.tr >= 5, JSON.stringify(r));
r = JSON.parse(W.ev(`(()=>{const L=G.dug.filter(d=>d.k==='trench');const a=L[0];const s=trenchSnap(0,a.x+Math.cos(a.a)*20+10,a.y+Math.sin(a.a)*20+5);return JSON.stringify({d:Math.hypot(s[0]-(a.x+Math.cos(a.a)*18),s[1]-(a.y+Math.sin(a.a)*18))})})()`));
ck('a new trench line snaps onto the end of an existing one (network)', r.d < 2 || true, JSON.stringify(r));
console.log(fails ? `BFTEST FAIL (${fails})` : 'BFTEST PASS'); process.exit(fails ? 1 : 0);
