// ===== 13b-grandbattle: "Fight it" - a Conquest battle that holds EXACTLY the armies' real units =====
// Abdullah 2026-11-05 21:22 + 2026-11-06 ("Army only"): no free base, no $10,000, nothing is built or bought in the battle
// (03-sim act() ignores production orders while G.grand is set). Attackers and defenders start with the unit records of
// their armies (type, health %, experience, ammo %); the defender also gets the province's garrison and a few forts.
// Friendly armies in neighbouring provinces arrive as timed reinforcement waves from the map edge behind their side.
// WIN CONDITION (no base to destroy): the side with no units left loses; at 15:00 the side with the greater surviving force
// (cost x health) wins, the defender on a tie; the player may also Retreat. Survivors, wounds and experience are written back
// into the very same records, the dead are removed (grandBattleEnd -> grBattleDone).
const GB_LIMIT=900;
function grMapFor(p,b){const ok=k=>k&&MAPS[k]&&(MAPS[k].min||2)<=2;if(ok(p.map))return p.map;if(b&&b.river&&ok('rivers'))return 'rivers';if(b&&b.mtn&&ok('khyber'))return 'khyber';
  return {d:'oasis',m:'zagros',f:'heartland',u:'mesopotamia',j:'caribbean',s:'arctic',c:'harbour',r:'rivers'}[p.t]||'oasis';}
function grFacKind(fac,k){return grHasKind(fac,k)?k:'inf';}
// lay a block of units out behind point (cx,cy) facing angle a
function grandPlace(team,recs,cx,cy,a,gr){const fac=G.teams[team].fac,ord={tank:0,champ:1,heli:2,at:3,inf:4,aa:5,arty:6};const L=recs.slice().sort((p,q)=>(ord[p[0]]??4)-(ord[q[0]]??4));
  const n=L.length,cols=Math.max(3,Math.ceil(Math.sqrt(n*1.8))),ca=Math.cos(a),sa=Math.sin(a);
  L.forEach((rec,i)=>{const row=Math.floor(i/cols),col=i%cols,along=-row*34,side=(col-(cols-1)/2)*34;const x=cx+ca*along-sa*side,y=cy+sa*along+ca*side;
    const k=grFacKind(fac,rec[0]),dom=stats(fac,k).dom||'ground';const p=dom==='air'?[Math.max(60,Math.min(MAPW-60,x)),Math.max(60,Math.min(MAPH-60,y))]:(nearestPassXY(dom,x,y)||[x,y]);
    const u=addUnit(team,k,p[0],p[1]);if(!u)return;u.hp=Math.max(1,Math.round(u.max*rec[1]/100));u.xp=rec[2];u.rank=grRankOf(rec[0],fac,rec[2]);if(u.s&&u.s.ammo)u.ammo=Math.max(1,Math.round(u.s.ammo*rec[3]/100));
    u.gr=rec;gr.ents.push([rec,u,team]);});}
function grandBattleSetup(g){const gr=G.grand={b:g.bi,t0:0,limit:GB_LIMIT,att:g.att,pn:g.pn,ents:[],waves:g.waves||[],wi:0,aiT:1,fin:0,res:null,n0:[0,0],v0:[0,0],ret:0,fort:g.fort|0,mir:g.mir||null,gp:g.gp||null,hero:g.hero||[]};
  G.teams.forEach(T=>{T.ai=null;T.credits=0;});
  for(const t of [0,1]){const B=BASES[t],a=baseFacing(t),side=g.sides[t];const dx=Math.cos(a)*110,dy=Math.sin(a)*110;grandPlace(t,side,B[0]+dx,B[1]+dy,a,gr);}
  // the defender's forts: a few Defense Guns in front of its block (+ a SAM site for a capital)
  if(g.fort){const t=g.att===0?1:0,B=BASES[t],a=baseFacing(t);let placed=0;for(let k=0;k<90&&placed<g.fort;k++){const r=170+k*9,ang=a+((k%5)-2)*.45,px=B[0]+Math.cos(ang)*r,py=B[1]+Math.sin(ang)*r;
      const kind=(g.sam&&placed===0)?'sam':'turret';if(!bldAllowed(G.teams[t].fac,kind))continue;const q=nearestPassXY('ground',px,py);if(!q||Math.hypot(q[0]-px,q[1]-py)>60)continue;
      if(G.ents.some(e=>e.isB&&Math.hypot(e.x-q[0],e.y-q[1])<70))continue;addBld(t,kind,q[0],q[1],true);placed++;}}
  try{gmApply();}catch(e){console.error('gmApply',e);}try{gmilApplyPerks(gr,g.gp);}catch(e){console.error('gmilApplyPerks',e);}   /* grand3: the general's trait perks */
  if(g.fuel)G.teams.forEach((T,t)=>{if(g.fuel[t]!=null)T.fuel=Math.max(0,Math.min(1,g.fuel[t]));});   // fuel comes from the army's stock on the map (grand2)
  for(let t=0;t<2;t++){gr.n0[t]=G.ents.filter(e=>e.team===t&&!e.isB).length;gr.v0[t]=grandForce(t);}
  gr.ctr=[(BASES[0][0]+BASES[1][0])/2,(BASES[0][1]+BASES[1][1])/2];
  try{if(typeof centerOn==='function'){const B=BASES[0];setTimeout(()=>{try{centerOn(B[0],B[1]);}catch(e){}},50);}}catch(e){}}
function grandForce(t){let v=0;for(const e of G.ents)if(e.team===t&&!e.isB&&!e.dead)v+=(e.s.cost||400)*(.35+.65*e.hp/e.max);for(const w of G.grand.waves)if(!w.done&&w.side===t)for(const r of w.recs)v+=grCost(G.teams[t].fac,r[0]);return v;}
function grandAlive(t){let n=0;for(const e of G.ents)if(e.team===t&&!e.isB&&!e.dead)n++;for(const w of G.grand.waves)if(!w.done&&w.side===t)n+=w.recs.length;return n;}
function grandRoutAt(t,g){const m=msOf((G.teams[t]||{}).fac);if(!m)return .15;if(m.rout===0)return 0;return (m.routHome!=null&&t!==g.att)?m.routHome:(m.rout!=null?m.rout:.15);}   // from the ONE morale table (MSTYLES)
function grandTick(dt){const g=G.grand;if(!g||g.fin)return;g.t0+=dt;
  for(const T of G.teams)if(T.credits)T.credits=0;   // army only: no battle money at all (Abdullah 20:10 "why is money generating if I can't build units"); the empire's money lives on the grand map
  // a side with nobody left on the field never waits for a timer (Abdullah 2026-11-06 19:56 "I was killed, shouldn't it end immediately"):
  // its next reinforcement wave arrives at once; with no waves left, the wipe check below ends the battle this tick
  for(let s=0;s<2;s++){let f=0;for(const e of G.ents)if(e.team===s&&!e.isB&&!e.dead){f=1;break;}
    if(!f){let nw=null;for(const w of g.waves)if(!w.done&&w.side===s&&(!nw||w.t<nw.t))nw=w;if(nw&&nw.t>g.t0)nw.t=g.t0;}}
  for(const w of g.waves)if(!w.done&&g.t0>=w.t){w.done=1;const t=w.side,B=BASES[t],a=baseFacing(t),back=260;const cx=Math.max(80,Math.min(MAPW-80,B[0]-Math.cos(a)*back)),cy=Math.max(80,Math.min(MAPH-80,B[1]-Math.sin(a)*back));
    grandPlace(t,w.recs,cx,cy,a,g);try{log(t,'Reinforcements arrive: '+w.label,'g');}catch(e){}
    const fresh=G.ents.filter(e=>e.team===t&&!e.isB&&!e.dead&&e.gr&&w.recs.includes(e.gr));if(fresh.length&&t===1)act(1,{t:'go',ids:fresh.map(u=>u.id),x:g.ctr[0],y:g.ctr[1],mode:'amove'});}
  g.aiT-=dt;if(g.aiT<=0){g.aiT=3;grandAI(1);}
  const n0=grandAlive(0),n1=grandAlive(1);let win=-1,how='';
  if(!n0&&!n1){win=g.att===0?1:0;how='wipe';}else if(!n0){win=1;how='wipe';}else if(!n1){win=0;how='wipe';}
  else if(g.t0>=g.limit){const v0=grandForce(0),v1=grandForce(1);win=v0>v1*1.0001?0:v1>v0*1.0001?1:(g.att===0?1:0);how='time';}
  // rout (Abdullah 2026-11-06 20:09 "why haven't I won this round yet" — 24 vs 4): a side below its morale style's rout share of the other's strength
  // (reinforcements on the way included) for 10 s breaks and flees; checked every 2 s, sim time only (deterministic)
  if(win<0){g.rtT=(g.rtT||0)-dt;if(g.rtT<=0){g.rtT=2;const v0=grandForce(0),v1=grandForce(1),lo=v0<v1?0:1,r=Math.min(v0,v1)/Math.max(1,Math.max(v0,v1));
    if(r<grandRoutAt(lo,g)){if(g.rtS!==lo){g.rtS=lo;g.rtA=g.t0;}else if(g.t0-g.rtA>=10){win=1-lo;how='rout';}}else g.rtS=-1;}}
  if(win>=0){g.fin=1;g.res={win,how};G.over=true;G.winner=win;try{grandBattleEnd();}catch(e){console.error('grandBattleEnd',e);}}}
// the enemy side: attackers advance on the other force, defenders hold until something comes within reach
function grandAI(t){const g=G.grand,mine=G.ents.filter(e=>e.team===t&&!e.isB&&!e.dead&&!e.s.noAttack&&(!e.order||e.order.type===undefined));if(!mine.length)return;
  const foe=G.ents.filter(e=>e.team!==t&&!e.isB&&!e.dead&&e.team!==G.reb);if(!foe.length)return;let fx=0,fy=0;for(const e of foe){fx+=e.x;fy+=e.y;}fx/=foe.length;fy/=foe.length;
  let cx=0,cy=0;for(const e of mine){cx+=e.x;cy+=e.y;}cx/=mine.length;cy/=mine.length;
  const attacker=g.att===t,close=Math.hypot(fx-cx,fy-cy)<720;
  if(attacker||close){const idle=mine.filter(e=>!e.order);if(idle.length)act(t,{t:'go',ids:idle.map(u=>u.id),x:fx,y:fy,mode:'amove'});}}
function grandBattleStart(b){   // called by the grand-map UI: build the two unit lists and start the battle
  const P=GCM.P[b.p],pst=GC.prov[b.p],me=GC.me,meAtt=b.an===me||(b.dn!==me&&b.att.some(id=>(GC.armies.find(a=>a.id===id)||{}).o===me));
  const S=grSideUnits(b,'att'),D=grSideUnits(b,'def'),flat=L=>{const o=[];for(const s of L)o.push(...s.u);return o;};
  const side0=meAtt?flat(S):flat(D),side1=meAtt?flat(D):flat(S);
  const nat0=meAtt?b.an:b.dn,nat1=meAtt?b.dn:b.an;const f0=grNat(nat0).fac,f1=grNat(nat1).fac;
  // reinforcement waves: idle armies in neighbouring provinces of either side's nation (never an army already in this battle)
  const used=new Set([...b.att,...b.def]),waves=[],rf=[];let wn=[0,0];
  for(const a of GC.armies.slice().sort((x,y)=>x.id-y.id)){if(used.has(a.id)||a.path.length||!GCM.P[b.p].adj.includes(a.at)||!GCM.P[a.at].land)continue;
    const side=a.o===nat0?0:a.o===nat1?1:-1;if(side<0||!a.u.length)continue;if(wn[side]>=3)continue;if(GCM.P[a.at].land&&GC.prov[a.at].o!==a.o&&!grAtWar(a.o,GC.prov[a.at].o)&&GC.prov[a.at].o!==a.o)continue;
    const recs=a.u.slice(0,24);wn[side]++;waves.push({t:70+wn[side]*50,side,recs,label:a.nm,done:0,aid:a.id});rf.push(a.id);}
  const attTeam=meAtt?0:1,from=b.att.map(id=>(GC.armies.find(a=>a.id===id)||{}).from).find(f=>f>=0),gm=P.sea?{key:'coral',real:0,tp:null}:gmMap(b.p,from),   /* a sea zone is fought on a naval map */
    cfg={bi:{p:b.p},att:attTeam,pn:P.n,sides:[side0,side1],waves,fort:0,sam:false,fuel:[geSideFuel(meAtt?S:D,b.p),geSideFuel(meAtt?D:S,b.p)],mir:P.sea?null:{pi:b.p,real:gm.real,tp:gm.tp,nat:[nat0,nat1]},gp:null,hero:[]};
  /* grand3: each side's best general stands in the battle as the hero squad (the army's own if it has one, else a fresh one) */
  try{const gp=[gmilPerk(meAtt?S:D),gmilPerk(meAtt?D:S)];cfg.gp=gp;[[side0,f0],[side1,f1]].forEach(([L,fc],t)=>{if(gp[t]&&grHasKind(fc,'champ')&&!L.some(r=>r[0]==='champ')){const r=['champ',100,Math.round(gp[t].lv*40),100];L.push(r);cfg.hero[t]=r;}});}catch(e){console.error('gmil hero',e);}   // forts / SAM / airfield... come from the province's buildings (gmApply)
  GB_CUR={b,cfg,meAtt,nat0,nat1,rf};
  try{initAudio();}catch(e){}
  MODE='single';ME=0;setup.p=f0;setup.d=1;TERR_DEFER=true;
  try{newGame({seed:(GC.seed*31+GC.turn*977+b.p*13)|0,facs:[f0,f1],ai:[false,false],map:gm.key||grMapFor(P,b),tm:[0,1],bs:1,slot:0,st:gm.real?[0,1]:(attTeam===0?[0,1]:[1,0]),w:0,grand:cfg});}finally{TERR_DEFER=false;}
  afterStart();}
let GB_CUR=null;
// write the survivors back and show the result
function grandWriteBack(){const g=G.grand;try{const sd=GB_CUR.meAtt?['att','def']:['def','att'];sd.forEach((side,t)=>{const T=G.teams[t];if(!T||T.fuel==null)return;for(const s of grSideUnits(GB_CUR.b,side))if(s.arr)s.arr.fu=Math.round(T.fuel*100);});}catch(e){}try{gmWriteBack();}catch(e){console.error('gmWriteBack',e);}for(const [rec,e,team] of g.ents){const dead=e.dead||!G.byId.has(e.id);if(dead){rec.dead=1;if(rec[0]==='champ'&&g.gp&&g.gp[team]){try{gmilHeroFell(g.gp[team].gid);}catch(e){}}continue;}rec[1]=Math.max(1,Math.round(e.hp/e.max*100));rec[2]=Math.round(e.xp||rec[2]);if(e.s&&e.s.ammo)rec[3]=Math.max(0,Math.min(100,Math.round((e.ammo||0)/e.s.ammo*100)));}
  const strip=arr=>{for(let i=arr.length-1;i>=0;i--)if(arr[i].dead)arr.splice(i,1);};const b=GB_CUR.b;
  for(const s of grSideUnits(b,'att').concat(grSideUnits(b,'def')))strip(s.u);
  for(const id of GB_CUR.rf){const a=GC.armies.find(x=>x.id===id);if(a)strip(a.u);}}
function grandBattleEnd(){const g=G.grand,c=GB_CUR;grandWriteBack();const T0=g.res.win===0,won=T0;
  const lost0=g.n0[0]-G.ents.filter(e=>e.team===0&&!e.isB&&!e.dead).length,lost1=g.n0[1]-G.ents.filter(e=>e.team===1&&!e.isB&&!e.dead).length;
  const root=campEl('div');root.appendChild(campEl('div','opacity:.7;font-size:14px','BATTLE FOR '+g.pn.toUpperCase()+' · '+(g.res.how==='time'?'TIME ELAPSED':g.res.how==='retreat'?'WITHDRAWAL':g.res.how==='rout'?(won?'ENEMY ROUTED':'YOUR FORCE ROUTED'):'FORCE DESTROYED')));
  root.appendChild(campEl('h1','margin:2px 0 10px;font-size:30px;color:'+(won?'#9fd36b':'#e07a6a'),won?'Victory':g.res.how==='retreat'?'Withdrawn':'Defeat'));
  root.appendChild(campEl('div','font-size:17px;line-height:1.6;margin-bottom:10px','Your losses: <b>'+lost0+'</b> of '+g.n0[0]+' units · Enemy losses: <b>'+lost1+'</b> of '+g.n0[1]+' units<br>Survivors keep their wounds and experience on the map; the dead are gone.'));
  root.appendChild(campBtn('Return to the map',()=>{campClose();grandLeaveBattle();grBattleDone(c.b,(c.meAtt===won)?'att':'def',g.res.how==='retreat'?'retreat':'live');grandMapRefresh();}));
  campShow(root);}
function grandLeaveBattle(){try{if(MODE!=='single')leaveNet();}catch(e){}MODE='single';ME=0;G=null;try{kcReset();}catch(e){}try{$('end').hidden=true;}catch(e){}const h=document.getElementById('gbHud');if(h)h.hidden=true;grandScreenShow(true);}
function grandRetreat(){const g=G&&G.grand;if(!g||g.fin)return;g.fin=1;g.res={win:1,how:'retreat'};G.over=true;grandBattleEnd();}
// test hook: end the live battle now with team `win` winning (survivors are whatever is alive)
function grandTestFinish(win){const g=G.grand;if(!g||g.fin)return false;g.fin=1;g.res={win,how:'wipe'};G.over=true;grandBattleEnd();return true;}
function grandHud(){let el=document.getElementById('gbHud');const on=!!(G&&G.grand&&!G.grand.fin);document.body.classList.toggle('gbat',on);if(!on){if(el)el.hidden=true;return;}const g=G.grand;
  if(!document.getElementById('gbCss')){const st=document.createElement('style');st.id='gbCss';st.textContent='body.gbat .tabs button[data-tab="build"],body.gbat .tabs button[data-tab="upg"],body.gbat .tabs button[data-tab="pow"]{display:none!important}body.gbat #panel>*{display:none!important}body.gbat #panel::after{content:"Army only: nothing can be built or bought in this battle. Command the units you brought.";padding:14px;opacity:.8;font-size:15px;line-height:1.5}';document.head.appendChild(st);}
  if(!g.tabd){const t=document.querySelector('.tabs button[data-tab="units"]');if(t){t.click();g.tabd=1;}}
  if(!el){el=campEl('div','position:fixed;left:10px;top:92px;z-index:600;max-width:min(320px,70vw);background:rgba(12,16,10,.86);border:1px solid #5d6e49;border-radius:8px;padding:8px 10px;color:#efe9d6;font-size:15px;line-height:1.5;');el.id='gbHud';
    el.innerHTML='<div id="gbTxt"></div>';const b=campEl('button','margin-top:4px;padding:6px 12px;border-radius:6px;border:1px solid #8a5a4a;background:#6b3a2c;color:#fff;cursor:pointer;pointer-events:auto','Retreat');b.type='button';b.id='gbRet';b.onclick=()=>{if(confirm('Withdraw from '+G.grand.pn+'? The enemy keeps the field.'))grandRetreat();};el.appendChild(b);document.body.appendChild(el);}
  el.hidden=false;const left=Math.max(0,g.limit-g.t0),n0=grandAlive(0),n1=grandAlive(1),wv=g.waves.filter(w=>!w.done&&w.side===0).length;
  document.getElementById('gbTxt').innerHTML='<b>'+g.pn+'</b> <span style="opacity:.7">· '+(g.att===0?'attacking':'defending')+'</span><br>Time '+campClock(left)+' · You '+n0+' · Enemy '+n1+(wv?'<br><span style="opacity:.8">'+wv+' reinforcement'+(wv>1?'s':'')+' on the way</span>':'')+'<br><span style="opacity:.7;font-size:13px">Army only: nothing can be built here. At 0:00 the stronger force wins.</span>';}
setInterval(()=>{try{grandHud();}catch(e){}},1000);
