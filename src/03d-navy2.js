/* ---------- Navy 2: sonar, naval mines, fast-boat swarms (orch/reports/navy2.md) ----------
   Owners: sonar/detection = the stealth code in 03-sim (hiddenNow/updateVis call sonarOf here); mines = G.mines (land mines
   live there too, naval ones carry nav:1 and a per-team detection map dt); swarm/CIWS = specialMult hook (navalMult).
   All of it is deterministic (no RNG, no wall clock) and the mines ride in the checkpoint with G.mines. */
const N2B=[];
const PING_CD=18,PING_SHOW=6,MINE_CAP=14,MINE_TRIG=26,MINE_DMG=360,MINE_SPL=75,SWEEP_CLEAR=85,MINE_SEEN=3.5;
// how far m hears a submerged boat: ships/boats/coast batteries by their sonar stat, helicopters only while hovering (dipping sonar)
function sonarOf(m){if(!m.s)return 0;if(m.s.dip)return(!m.isB&&m.s.dom==='air'&&!m.landed&&G.t-(m.mv||-9)>1)?m.s.sonar:0;return m.s.sonar||0;}
// Active sonar ping: every submerged enemy inside the ping range shows for a few seconds; a sub that pings gives itself away,
// a surface ship that pings tells enemy sub captains roughly where it is.
function sonarPing(u){if(!u||u.dead||u.isB||!u.s||u.s.dom!=='naval'||!u.s.sonar||(u.pingT||0)>G.t)return false;
  u.pingT=G.t+PING_CD;const R=u.s.sonar*1.7,T=G.teams[u.team];let n=0;
  for(const e of G.ents){if(e.dead||e.isB||!e.s.sub||ally(e.team,u.team))continue;if(Math.hypot(e.x-u.x,e.y-u.y)<R+e.r){e.detT=G.t+PING_SHOW;T.reveals.push({x:e.x,y:e.y,r:70,t:PING_SHOW});n++;FXE('ping',[e.x|0,e.y|0,46],u.team);}}
  if(u.s.sub)u.detT=G.t+PING_SHOW;
  else for(const O of G.teams){if(O.out||ally(O.id,u.team))continue;for(const e of G.ents)if(!e.dead&&!e.isB&&e.team===O.id&&e.s.sub&&Math.hypot(e.x-u.x,e.y-u.y)<R*1.6){O.reveals.push({x:u.x,y:u.y,r:90,t:PING_SHOW});break;}}
  FXE('ping',[u.x|0,u.y|0,R|0],u.team);log(u.team,n?`Sonar ping: ${n} submarine contact${n>1?'s':''}!`:'Sonar ping: no contacts.',n?'w':'g');return true;}
// ---- mines ----
function navMines(team){let n=0;for(const m of G.mines)if(m.nav&&m.team===team)n++;return n;}
function mineKnown(m,team){return ally(m.team,team)||!!(m.dt&&m.dt[team]>G.t);}
function layNavMine(u){if(navMines(u.team)>=MINE_CAP)return false;for(const m of G.mines)if(m.nav&&Math.hypot(m.x-u.x,m.y-u.y)<45)return false;
  G.mines.push({x:u.x|0,y:u.y|0,team:u.team,arm:G.t+3,nav:1,dt:{}});return true;}
// minelayer / minesweeper behaviour, called from specialTick (every 1.2 s per unit)
function navy2Special(u,o){const s=u.s;
  if(s.minelay&&o&&o.type==='amove'&&G.t-(u.mineT||-9)>1)if(layNavMine(u))u.mineT=G.t;
  if(s.sweep){const R=s.mdet;for(const m of G.mines){if(!m.nav||ally(m.team,u.team))continue;const d=Math.hypot(m.x-u.x,m.y-u.y);if(d>R)continue;
      if(d<SWEEP_CLEAR){m.done=true;FXE('txt',[m.x,m.y,'MINE CLEARED',u.team,-1]);FXE('boom',[m.x|0,m.y|0,10,0]);}else markMine(m,u.team);}}}
function markMine(m,team){m.dt=m.dt||{};for(const T of G.teams)if(ally(T.id,team))m.dt[T.id]=G.t+MINE_SEEN;}
// sonar-carrying ships/boats feel for mines only very close; sweepers see a long way (above). Runs 2x/s from updMines.
function navy2Detect(){if(!G.mines.some(m=>m.nav))return;for(const e of G.ents){if(e.dead||e.isB||e.s.dom!=='naval'||e.s.sweep)continue;const R=e.s.mdet||(e.s.sonar?90:0);if(!R)continue;
    for(const m of G.mines)if(m.nav&&!ally(m.team,e.team)&&Math.hypot(m.x-e.x,m.y-e.y)<R)markMine(m,e.team);}}
// naval mine detonation, called from updMines for each armed naval mine; returns true if it blew up
function navMineBlast(m){for(const e of nearby(m.x,m.y,MINE_TRIG+40,N2B)){if(e.dead||e.isB||e.s.dom!=='naval'||e.s.sweep||ally(e.team,m.team))continue;
    if(Math.hypot(e.x-m.x,e.y-m.y)<MINE_TRIG+e.r*.5){m.done=true;FXE('txt',[m.x,m.y,'MINE',m.team,e.team]);FXE('boom',[m.x|0,m.y|0,34,0]);
      for(const v of G.ents){if(v.dead||v.isB||v.s.dom!=='naval'||ally(v.team,m.team))continue;const dd=Math.hypot(v.x-m.x,v.y-m.y)-v.r;if(dd>MINE_SPL)continue;applyDmg(v,MINE_DMG*(1-.5*Math.max(0,dd)/MINE_SPL),'torp',m.team,null,1);}
      return true;}}return false;}
// swarm bonus (fast boats hit harder with sister boats close by) and the counters: ship CIWS and helicopters shred small boats
function navalMult(e,src){let m=1;if(!src||src.isB||!src.s)return m;
  if(src.s.swarm){let n=0;for(const o of nearby(src.x,src.y,130,N2B))if(o!==src&&!o.dead&&o.team===src.team&&o.s&&o.s.swarm)n++;m*=1+Math.min(.45,n*.07);}
  if(!e.isB&&e.s&&e.s.swarm){if(src.s.cls==='ship')m*=1.3;else if(src.s.cls==='heli')m*=1.6;else if(src.s.aa&&src.s.dom==='naval')m*=1.15;}
  return m;}
// ---- AI: builds fast boats, one minelayer and one sweeper; sends them where they matter ----
function aiNavy2Pick(T,mine,opts,fleet){const has=k=>mine.some(e=>!e.dead&&!e.isB&&e.kind===k)||qItems(T,'shipyard').some(i=>i.kind===k);
  const foeLay=G.ents.some(e=>!e.dead&&!e.isB&&e.kind==='minel'&&!ally(e.team,T.id)),known=G.mines.some(m=>m.nav&&!ally(m.team,T.id)&&m.dt&&m.dt[T.id]>G.t);
  if(opts.includes('sweep')&&fleet.length>=2&&!has('sweep')&&(known||(foeLay&&G.t>420)))return['sweep'];
  if(opts.includes('minel')&&fleet.length>=2&&!has('minel')&&G.t>300&&navMines(T.id)<MINE_CAP-4)return['minel'];
  const nf=fleet.filter(e=>e.kind==='fast').length+qItems(T,'shipyard').filter(i=>i.kind==='fast').length;
  if(opts.includes('fast')&&fleet.length>=1&&nf<Math.max(1,Math.floor(fleet.length*.4)))return['fast'];return null;}
function aiNavy2(T,mine){const id=T.id,yd=mine.find(e=>e.isB&&e.kind==='shipyard'&&e.built>=1&&!e.dead);
  for(const u of mine){if(u.dead||u.isB)continue;
    if(u.s.minelay&&yd){if(u.order)continue;const foe=G.ents.find(e=>e.isB&&e.kind==='hq'&&!e.dead&&!ally(e.team,id));if(!foe)continue;
      if(navMines(id)>=MINE_CAP){if(Math.hypot(u.x-yd.x,u.y-yd.y)>220)setMove(u,yd.x,yd.y,'move');continue;}
      const out=u.mlOut!==false;const k=out?.42:.0,tx=yd.x+(foe.x-yd.x)*k,ty=yd.y+(foe.y-yd.y)*k,w=out?nearestPassXY('naval',tx,ty):nearestPassXY('naval',yd.x,yd.y);
      if(w&&bodyAt(w[0],w[1])===bodyAt(u.x,u.y)){setMove(u,w[0],w[1],'amove');u.mlOut=!out;}else u.mlOut=!out;}
    else if(u.s.sweep){if(u.order)continue;let best=null,bd=1e18;for(const m of G.mines)if(m.nav&&!ally(m.team,id)&&m.dt&&m.dt[id]>G.t){const d=(m.x-u.x)**2+(m.y-u.y)**2;if(d<bd){bd=d;best=m;}}
      if(best&&bodyAt(best.x,best.y)===bodyAt(u.x,u.y))setMove(u,best.x,best.y,'amove');
      else{const f=mine.find(e=>!e.dead&&!e.isB&&e.s.dom==='naval'&&!e.s.noAttack);if(f&&Math.hypot(f.x-u.x,f.y-u.y)>260)setMove(u,f.x,f.y,'move');}}}
  // answer a torpedo / ping: a hurt ship pings for subs
  for(const u of mine)if(!u.dead&&!u.isB&&u.s.dom==='naval'&&u.s.sonar&&!u.s.sub&&G.t-(u.lastHit||-99)<4&&(u.pingT||0)<=G.t){sonarPing(u);break;}}
