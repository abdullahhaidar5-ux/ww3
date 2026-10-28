/* ================= SIMULATION (authoritative; runs in single-player and on the host) ================= */
let G=null,MODE='single',ME=0;
// Battle events and the end of a battle, kept here so the simulation runs on its own (a server needs only 01-03).
// FXE: in host mode every effect is queued for the clients (own: optional team that caused it, e.g. a general's power;
// its side always gets it, even into the fog; kept as a property of the event array, so JSON drops it). fxPlay (05-fx3d)
// then plays it on this screen; it is missing on a server.
function FXE(type,args,own){if(MODE==='host'&&G&&G.out){const v=[type,...args];if(own!=null)v.own=own;G.out.push(v);}if(typeof fxPlay==='function')fxPlay(type,args);}
function log(team,msg,kind){FXE('log',[team,msg,kind||'']);}
// Battle over: the host tells the clients right away; showEnd (08-ui) shows the result screen in a browser.
function endGame(winner,reason){if(!G||G.over)return;if(MODE==='host'&&G.out){G.out.push(['end',winner]);if(typeof NET!=='undefined')NET.evT=0;}G.over=true;if(typeof showEnd==='function')showEnd(winner,reason);}
// '#rrggbb' -> {r,g,b} in 0..1, the same values THREE.Color gives (no Three.js needed by the simulation)
function hexRGB(h){const n=parseInt(String(h).slice(1),16);return{r:(n>>16&255)/255,g:(n>>8&255)/255,b:(n&255)/255};}
// One battle scale for every game (the old Standard/Large/Massive choice is gone); AI strength comes from difficulty.
const BATTLE=1.75;
// AI difficulty: Easy is slow to build and attack with small waves and no tricks (and earns less). Hard earns exactly
// what Normal earns (Abdullah: smarter, never richer) but thinks faster and fights smarter: flanking columns that
// converge on the main attack's target, focus fire on weakened targets, infantry that take cover behind walls,
// woods and buildings while advancing, damaged vehicles pulled back earlier and further, and amphibious landings.
const DIFF=[{wave:4,inc:.7,first:420,think:1.6,flank:0,retreat:0,focus:0,cover:0,land:0,maxWave:10,q:1,nvAt:480,nvCap:1,nvShare:.08,nvShip:0,nvSortie:2},
  {wave:6,inc:1,first:270,think:1,flank:1,retreat:1,focus:0,cover:0,land:1,maxWave:22,q:2,nvAt:150,nvCap:4,nvShare:.15,nvShip:1,nvSortie:2},
  {wave:7,inc:1,first:170,think:.6,flank:2,retreat:2,focus:1,cover:1,land:2,maxWave:32,q:3,nvAt:90,nvCap:8,nvShare:.22,nvShip:1,nvSortie:3}];
// wave is scaled by the battle size here, so an AI made mid-game (host migration, a commander who never came back) matches a fresh one
function mkAI(d){d=Math.max(0,Math.min(2,d|0));const D=DIFF[d];return{bi:0,wave:Math.round(D.wave*((G&&G.bs)||BATTLE)),inc:D.inc,t:0,d};}
const setup={p:'IR',a:'US',d:1,n:1,bs:BATTLE};
function mkTeam(id,fac,ai){const F=FACTIONS[fac];return{id,fac,F,sup:F.sup,credits:3000,charge:0,tun:[],q:{hq:[],barracks:[],factory:[],airfield:[],shipyard:[]},rq:{},upg:{},rally:null,
  color:F.color,dark:shade(F.color,.45),built:0,lost:0,kills:0,gxp:0,rank:1,spent:0,pw:{},reveals:[],ai:ai?mkAI(setup.d):null};}
// Alliances: players on the same team never fight, share vision and win together.
// Allies can send each other money (in steps of $50, never more than you have).
function giveMoney(from,to,amt){const A=G.teams[from],B=G.teams[to];if(!A||!B||from===to||!ally(from,to)||B.out||A.out)return false;amt=Math.floor(Math.min(+amt||0,A.credits)/50)*50;if(amt<50)return false;
  A.credits-=amt;B.credits+=amt;A.gave=(A.gave||0)+amt;log(from,`Sent $${amt} to ${B.F.name}.`,'g');log(to,`${A.F.name} sent you $${amt}.`,'g');FXE('give',[from,to,amt]);return true;}
function ally(a,b){if(a===b)return true;if(a==null||b==null||a<0||b<0||!G||!G.teams[a]||!G.teams[b])return false;return G.teams[a].tm===G.teams[b].tm;}
function newGame(o){const N=o.facs.length;const mk=MAPS[o.map]&&N<=MAPS[o.map].max?o.map:'strait';setWorld(worldScaleFor(N));setBases(N,mk,mk===o.map?o.slot:-1);
  const M=mkMap(o.seed,mk);
  G={t:0,ents:[],byId:new Map(),proj:[],strikes:[],timers:[],planes:[],nid:1,sel:[],place:null,aim:null,amove:false,msgs:[],aiT:2,visT:0,endT:3,over:false,uiT:0,out:[],
     map:M,mapKey:mk,grid:M.grid,fields:M.fields.map(f=>({...f})),oil:M.oil.map(f=>({...f,cp:new Array(N).fill(0)})),seed:o.seed,N};for(const k of G_LATE)G[k]=undefined;initCiv();G.oil.forEach((o,i)=>{o.i=i;o.hp=o.max=OIL_HP;o.dead=false;o.burn=0;o.rep=0;o.tg=oilTarget(o);});
  G.bs=BATTLE;G.teams=o.facs.map((f,i)=>mkTeam(i,f,o.ai[i]));G.teams.forEach(T=>{T.credits=Math.round(3000*(1+(G.bs-1)*.8)/100)*100;});G.teams.forEach((T,i)=>{T.tm=Array.isArray(o.tm)&&o.tm[i]!=null?o.tm[i]|0:100+i;});
  {const ALT=['#e8e8e8','#d98c3a','#36c2c9','#d94fa0','#a3d13a','#8b6cf6','#f2d14a','#e2483d','#4a80e8','#3fae5c','#c97b4a'];const cd=(p,q)=>{const a=hexRGB(p),b=hexRGB(q);return Math.abs(a.r-b.r)+Math.abs(a.g-b.g)+Math.abs(a.b-b.b);};
   for(let i=1;i<N;i++){const T=G.teams[i];if(G.teams.slice(0,i).some(P=>cd(P.color,T.color)<.45)){const c=ALT.find(c=>G.teams.slice(0,i).every(P=>cd(P.color,c)>=.45))||ALT[i%ALT.length];T.color=c;T.dark=shade(c,.45);}}}
  paintTerrain(M);
  G.cover=new Uint8Array(GW*GH);for(const [x,y] of (G.treePos||[])){const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);if(cx>=0&&cy>=0&&cx<GW&&cy<GH)G.cover[cy*GW+cx]=Math.min(255,G.cover[cy*GW+cx]+1);}
  for(const b of (M.cityBlds||[])){const cx=Math.floor(b.x/CELL),cy=Math.floor(b.y/CELL);for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const X=cx+i,Y=cy+j;if(X>=0&&Y>=0&&X<GW&&Y<GH&&G.grid[Y*GW+X]!==3)G.cover[Y*GW+X]=Math.min(255,G.cover[Y*GW+X]+2);}}
  if(o.sandbox)G.sandbox=true;
  if(MODE!=='client'){
    for(let t=0;t<N;t++){const [bx,by]=BASES[t];const a=baseFacing(t),cx=Math.cos(a),cy=Math.sin(a);addBld(t,'hq',bx,by,true);addUnit(t,'harv',bx+cx*150-cy*60,by+cy*150+cx*60);addUnit(t,'dozer',bx+cx*120-cy*110,by+cy*120+cx*110);addUnit(t,'inf',bx+cx*130+cy*90,by+cy*130-cx*90);addUnit(t,'inf',bx+cx*150+cy*70,by+cy*150-cx*70);}
    if(G.sandbox)sandboxSetup();
    wallCost();regions('ground');regions('naval');   // route caches built now, behind the loading screen, not by the first long route search mid-battle (a 10-30 ms hitch)
  }
}
// Fields the battle adds to G as it runs. Declaring them all up front keeps G one fixed shape, so the engine's compiled
// code for the hot loops (which reads G everywhere) is not thrown away and rebuilt each time a new field appears.
const G_LATE=['pfTok','pfMs','pfN','wx','hash','bmaxH','rmax','mines','aur','cbrTeams','mT','prT','bg','bgSig','sg','ecT','aiTT','vsT','vsN','vsB','vsD','hqC','bocc','boccV'];
function baseFacing(t){const b=BASES[t]||BASES[0];return Math.atan2(MAPH/2-b[1],MAPW/2-b[0]);}
// Fields units and buildings pick up as the battle runs, declared (as undefined: same meaning as missing) when each is
// made, so every unit has the same shape. Units growing fields in different orders gave the engine dozens of shapes,
// and each new one threw away the compiled code of the hot loops (~80 times a game-minute): 10-30 ms hitches.
const U_LATE='fldT,field,path,pgx,pgy,prt,npW,npD,npT,hd,v,vt,mv,px,py,si,_vr,vis,hid,building,mT,odds,sur,rz,fear,scT,bt,ms,guard,ffx,ffy,ffP,ffw,ffwT,so,sbD,sbT,srp,gt,drop,dropT,retreat,supp,fw,lc,rt,rtTo,rout,cvT,tagT,hlT,hl,cbrT,aband,cp,cpT,last,crew,_dsT,_dsV,kx,ky,mark,stun,sq,inTun,flank,flT,amb,spT,landed,wxw,toT,dead'.split(','),B_LATE='_vr,vis,hid,nd,stall,scT,sn,lastFire,_dsT,_dsV,dead'.split(',');
function addUnit(team,kind,x,y){const T=G.teams[team],s0=stats(T.fac,kind),sm=kind===T.F.special?specMult(T):1,s=sm>1?Object.assign({},s0,{hp:Math.round(s0.hp*sm),dmg:s0.dmg*sm,name:s0.name+(sm>=1.4?' (Elite)':' (Veteran)')}):s0;const a=baseFacing(team);
  const u={id:G.nid++,isB:false,team,kind,s,x,y,ang:a,va:a,tang:a,hp:s.hp,max:s.hp,r:s.r,cd:0,order:null,target:null,lastHit:-99,lastFire:-99,state:'go',cargo:0,xp:0,rank:0,ammo:s.ammo||0,vs:new Array(G.teams.length).fill(false)};
  for(const k of U_LATE)u[k]=undefined;
  u.max=Math.round(s.hp*hpMult(team,kind));u.hp=u.max;G.ents.push(u);G.byId.set(u.id,u);return u;}
function addBld(team,kind,x,y,built){const T=G.teams[team],s=bstats(T.fac,kind);G.bdirty=true;
  const b={id:G.nid++,isB:true,team,kind,s,x,y,size:s.size,r:s.size/2,max:s.hp,hp:built?s.hp:s.hp*.1,built:built?1:0,cd:0,target:null,ang:baseFacing(team),lastHit:-99,dis:0,vs:new Array(G.teams.length).fill(false)};
  for(const k of B_LATE)b[k]=undefined;
  G.ents.push(b);G.byId.set(b.id,b);return b;}
const done=(t,k)=>G.ents.some(e=>e.isB&&e.team===t&&e.kind===k&&e.built>=1&&!e.dead);
const working=(t,k)=>G.ents.some(e=>e.isB&&e.team===t&&e.kind===k&&e.built>=1&&!e.dead&&!(e.dis>G.t));
const reqMet=(t,k)=>!STRUCT[k].req||(G&&G.sandbox&&t===0)||done(t,STRUCT[k].req);
function isInf(s){return s.armor==='light'&&s.dom==='ground';}
function isVeh(s){return s.armor==='heavy'&&s.dom==='ground';}
// Upgrade effects: each nation's own upgrades (UPG[k].fx = [stat, unit group, value]) folded into one multiplier per stat,
// cached per team and unit type and rebuilt whenever that team finishes an upgrade
function upgAgg(T,kind){const c=T._uk||(T._uk={});let r=c[kind];if(r)return r;r={hp:1,dmg:1,taken:1,mis:1,rng:1,rof:1,spd:1,build:1,splash:1,regen:0,courage:1};
  const b=!BASE[kind]&&!!STRUCT[kind],s=b?bstats(T.fac,kind):stats(T.fac,kind);if(s)for(const k in T.upg){const U=T.upg[k]&&UPG[k];if(!U||!U.fx)continue;for(const f of U.fx){const st=f[0];if(!(st in r)||!upgMatch(f[1],s,b))continue;if(st==='regen')r[st]+=f[2];else r[st]*=f[2];}}return c[kind]=r;}
function upgK(T,kind,st){return T?upgAgg(T,kind)[st]:(st==='regen'?0:1);}
// team-wide effects: harv (supply carried), xp (rank speed), detect (stealth detection range), camo, salvage
function upgT(T,st){const c=T._ut||(T._ut={});if(st in c)return c[st];let v=st==='salvage'?0:st==='camo'?false:1;for(const k in T.upg){const U=T.upg[k]&&UPG[k];if(!U||!U.fx)continue;for(const f of U.fx)if(f[0]===st){if(st==='salvage')v+=f[2];else if(st==='camo')v=true;else v*=f[2];}}return c[st]=v;}
function upgReset(T){T._uk=null;T._ut=null;}
function hpMult(team,kind){return upgK(G.teams[team],kind,'hp');}
// National special effects: auras (officer morale, commissar rate of fire, medic healing, raid leader), Iron Dome
// interception, EW jamming, counter-battery radar, laser marking, hidden mines and ambushes.
function auraNear(u,t){const L=G.aur&&G.aur[t];if(!L)return false;for(const a of L)if(a.team===u.team&&a.id!==u.id&&Math.abs(a.x-u.x)<a.r&&Math.hypot(a.x-u.x,a.y-u.y)<a.r)return true;return false;}
function auraProtect(e,t){const L=G.aur&&G.aur[t];if(!L)return false;for(const a of L)if(ally(a.team,e.team)&&Math.hypot(a.x-e.x,a.y-e.y)<a.r)return true;return false;}
function dmgOut(src){if(src.isB)return wxNow().acc;const T=G.teams[src.team],c=src.s.cls;let m=[1,1.2,1.35,1.5][src.rank||0]*wxNow().acc;if(isInf(src.s)&&auraNear(src,'morale'))m*=1.2;if(isVeh(src.s)&&auraNear(src,'raid'))m*=1.2;
  if((T.mart||0)>G.t)m*=1.1;if((T.fervor||0)>G.t&&(!T.fervInf||isInf(src.s)))m*=T.fervK||1.15;{const D=DOCT[T.fac];if(D){if(D.shock&&src.order&&(src.order.type==='amove'||src.order.type==='attack'||G.t-(src.mv||-9)<4))m*=1.15;
    if(D.ambush&&(isInf(src.s)||c==='drone')&&(G.t-(src.mv||-9)>3||coverAt(src.x,src.y)))m*=1.2;
    if(D.homeland){if(G.t-(src.hlT||-9)>2){src.hlT=G.t;src.hl=false;for(const b of nearby(src.x,src.y,700,MOR_H))if(b.isB&&b.team===src.team&&!b.dead){src.hl=true;break;}}if(src.hl)m*=1.15;}}}
  m*=upgK(T,src.kind,'dmg');return m;}
function dmgIn(e,wpn){if(e.isB){const TB=G.teams[e.team];return TB?upgK(TB,e.kind,'taken'):1;}const T=G.teams[e.team],s=e.s;let m=e.retreat?.7:1;if(e.digT){if(e.mv!=null&&G.t-e.mv<1)e.digT=0;else m*=.65;}if(G.shields&&G.shields.length)for(const S of G.shields)if(S.t>G.t&&S.team===e.team&&Math.hypot(e.x-S.x,e.y-S.y)<S.r){m*=S.k||.4;break;}if(T.F.mods.dugIn&&isInf(s)&&G.t-(e.mv||-9)>3)m*=T.F.mods.dugIn;if(e.rout>G.t)m*=1.25;m*=upgK(T,e.kind,'taken');
  if(wpn==='at'||wpn==='missile')m*=upgK(T,e.kind,'mis');return m;}
function rofMult(u){return upgK(G.teams[u.team],u.kind,'rof')*((u.rofT||0)>G.t?.8:1)*((u.supp||0)>.5?1.6:1)*(isInf(u.s)&&auraNear(u,'rof')?.8:1);}
function rngOf(e){return e.s.rng*upgK(G.teams[e.team],e.kind,'rng')*(e.s.droneSpot&&e.target&&droneSees(e.team,e.target)?1.4:1);}
const DS_N=[];function droneSees(team,t){if(t._dsT===G.t+team*.001)return t._dsV;let v=false;for(const o of nearby(t.x,t.y,360,DS_N)){if(!o.dead&&o.team===team&&(o.kind==='drone'||o.kind==='recon')&&Math.hypot(o.x-t.x,o.y-t.y)<360){v=true;break;}}t._dsT=G.t+team*.001;t._dsV=v;return v;}
function saSpotted(team,t){for(const o of nearby(t.x,t.y,500,DS_N)){if(!o.dead&&o.team===team&&o.s&&o.s.airSpot&&Math.hypot(o.x-t.x,o.y-t.y)<(o.s.vis||480))return true;}return false;}
function canTarget(s,e){if(!e||e.dead)return false;const air=!e.isB&&e.s.dom==='air'&&!e.landed;if(air)return s.aa>=(e.s.alt==='high'?2:1);return s.ground!==false;}
function seenBy(team,e){return e.team===team||(e.vs&&e.vs[team]);}
function visR(m){const k=(G.teams[m.team].F.mods.sight||1)*(m.isB?Math.max(.75,wxNow().vis):wxNow().vis);if(!m.isB&&m.s.vis)return m.s.vis*k;return (m.isB?340:m.s.dom==='air'?340:m.s.dom==='naval'?380:280)*k;}
function detR(team,m){return(m.isB?170:150)*upgT(G.teams[team],'detect');}
function hiddenNow(e){if((e.detT||0)>G.t)return false;if(e.stlT&&!e.isB){if(G.t-(e.mv||-99)<1&&e.mv!=null||e.lastFire>0)e.stlT=0;else return true;}if(!e.isB&&G.smokes&&G.smokes.length&&G.t-(e.lastFire||-9)>1.5)for(const S of G.smokes)if(S.t>G.t&&ally(S.team,e.team)&&Math.hypot(e.x-S.x,e.y-S.y)<S.r)return true;if(e.isB)return e.kind==='tunnel'&&e.built>=1&&G.t-(e.lastFire||-9)>3;if(e.s.camo&&G.t-e.lastFire>3&&G.t-(e.mv||-9)>3)return true;if(G.t-e.lastFire<=2.5||e.planting)return false;if(e.s.stealth)return true;return !!(upgT(G.teams[e.team],'camo')&&isInf(e.s)&&G.t-(e.mv||-9)>3);}

/* ---------- production, research, building ---------- */
function unitCount(team,kind){let n=0;for(const e of G.ents)if(!e.isB&&e.team===team&&e.kind===kind)n++;const q=G.teams[team].q[BASE[kind].from];for(const i of q)if(i.kind===kind)n++;return n;}
function enqueue(team,kind){const T=G.teams[team],s=stats(T.fac,kind);if(!allUnits(T.fac).includes(kind))return false;if(kind===T.F.special&&T.rank<SPEC_RANK){if(!T.ai)log(team,`${s.name} unlocks at general rank ${SPEC_RANK}.`,'w');return false;}if(T.credits<s.cost||!done(team,s.from))return false;
  if(s.limit&&unitCount(team,kind)>=s.limit){log(team,`Only one ${s.name} at a time.`,'w');return false;}const q=T.q[s.from];if(q.length>=9)return false;T.credits-=s.cost;q.push({kind,t:0});return true;}
function dequeue(team,kind){const T=G.teams[team],s=stats(T.fac,kind),q=T.q[s.from];for(let i=q.length-1;i>=0;i--)if(q[i].kind===kind){q.splice(i,1);T.credits+=s.cost;return;}}
function prodTime(T,s){let t=s.time/(1+((G&&G.bs)||1)*.6-.6);if(G&&G.sandbox&&T.id===0)t/=6;t*=upgK(T,s.kind,'build');return t;}
function production(dt){for(const T of G.teams){for(const cat of CATS){const q=T.q[cat];if(!q.length)continue;
    const bl=G.ents.filter(e=>e.isB&&e.team===T.id&&e.kind===cat&&e.built>=1&&!e.dead&&!(e.dis>G.t));if(!bl.length)continue;
    const it=q[0],s=stats(T.fac,it.kind);it.t+=dt*(1+.5*(bl.length-1));if(it.t>=prodTime(T,s)){q.shift();spawnFrom(T,bl[Math.floor(Math.random()*bl.length)],it.kind);}}
  for(const cat in T.rq){const r=T.rq[cat];if(!r)continue;if(!working(T.id,cat))continue;r.t+=dt;if(r.t>=UPG[r.key].time){T.rq[cat]=null;applyUpgrade(T,r.key);}}}}
function spawnFrom(T,b,kind){const s=stats(T.fac,kind);let a=Math.atan2(MAPH/2-b.y,MAPW/2-b.x),x=b.x+Math.cos(a)*(b.size/2+16),y=b.y+Math.sin(a)*(b.size/2+16);
  if(s.dom==='naval'){const w=nearestPassXY('naval',b.x,b.y);if(!w)return;x=w[0];y=w[1];}
  else if(s.dom==='ground'){const p=nearestPassXY('ground',x,y);if(p){x=p[0];y=p[1];}}
  const u=addUnit(T.id,kind,x,y);T.built++;(T.made=T.made||{})[kind]=(T.made[kind]||0)+1;
  if(kind==='jet'){u.state='park';u.landed=true;const p=padPos(b,u);u.x=p.x;u.y=p.y;u.ang=u.va=-1.57;}
  else if(s.dom==='naval'){const dp=G.map.deeper(x,y,120);const R=T.rally&&passXY('naval',T.rally.x,T.rally.y)?T.rally:{x:dp[0],y:dp[1]};setMove(u,R.x+rnd(-30,30),R.y+rnd(-30,30),'move');}
  else if(kind!=='harv'){const R=T.rally||{x:b.x+Math.cos(a)*(b.size/2+70),y:b.y+Math.sin(a)*(b.size/2+70)};setMove(u,R.x+rnd(-35,35),R.y+rnd(-35,35),'move');}
  log(T.id,`${s.name} ready.`);}
function padPos(b,u){const o=[[-26,-22],[26,-22],[-26,22],[26,22]][u.id%4];return{x:b.x+o[0],y:b.y+o[1]};}
function startResearch(team,key){const T=G.teams[team],U=UPG[key];if(!U||T.upg[key]||(U.fac&&U.fac!==T.fac))return false;if(T.rq[U.at]||!done(team,U.at)||T.credits<U.cost)return false;
  if(Object.values(T.rq).some(r=>r&&r.key===key))return false;T.credits-=U.cost;T.rq[U.at]={key,t:0};return true;}
function applyUpgrade(T,key){T.upg[key]=true;upgReset(T);log(T.id,`${upgName(T.fac,key)} complete.`,'g');
  for(const e of G.ents)if(!e.isB&&e.team===T.id){const nm=Math.round(e.s.hp*hpMult(T.id,e.kind));if(nm!==e.max){e.hp*=nm/e.max;e.max=nm;}}}
// Build rules. Every structure is built by a Construction Vehicle: returns 0 (not allowed) or 2 (allowed; a
// Construction Vehicle drives there and builds it). Near an enemy base a Construction Vehicle has to be on
// the spot before the foundation can even be laid.
const ZONE_R=460,ENEMY_R=380,FRONT_R=620,ONSITE_R=360;
// per-tick lists of live buildings and construction vehicles (validSpot is called 100+ times per AI placement search and
// used to scan every entity twice per call)
const VS_OFF=[[0,0],[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]];
function vsLists(){if(G.vsT!==G.t||G.vsN!==G.ents.length){G.vsT=G.t;G.vsN=G.ents.length;const B=G.vsB||(G.vsB=[]),D=G.vsD||(G.vsD=[]);B.length=0;D.length=0;for(const e of G.ents){if(e.dead)continue;if(e.isB)B.push(e);else if(e.kind==='dozer')D.push(e);}}return G;}
function validSpot(team,kind,x,y){validSpot.why='';const s=bstats(G.teams[team].fac,kind),size=s.size,h=size/2;const no=w=>{validSpot.why=w;return 0;};
  if(x<h+10||y<h+10||x>MAPW-h-10||y>MAPH-h-10)return no('Too close to the edge of the map.');
  for(const [ox,oy] of VS_OFF){const dx=ox*h,dy=oy*h,cx=Math.floor((x+dx)/CELL),cy=Math.floor((y+dy)/CELL);if(G.grid[cy*GW+cx]!==0)return no(STRUCT[kind].shore?'Shipyards go on dry land right next to the water.':'Cannot build on water or bridges.');}
  {let lo=1e9,hi=-1e9;for(const [ox,oy] of VS_OFF){const g=groundH(x+ox*h,y+oy*h);lo=Math.min(lo,g);hi=Math.max(hi,g);}if(hi-lo>7)return no('The ground is too rough there.');}
  let own=0,shoreOwn=false,enemy=1e9;vsLists();
  for(const e of G.vsB){if(e.dead||!e.isB)continue;const g=(e.size+size)/2+14;if(Math.abs(e.x-x)<g&&Math.abs(e.y-y)<g)return no('Too close to another building.');const d=Math.hypot(e.x-x,e.y-y);if(e.team===team){if(e.built>=1){if(d<ZONE_R)own=1;if(d<1300)shoreOwn=true;}}else if(!ally(e.team,team)&&d<enemy)enemy=d;}
  for(const f of G.fields)if(Math.hypot(f.x-x,f.y-y)<f.r+h+(kind==='depot'?6:16))return no('Too close to a supply field.');
  for(const o of G.oil)if(Math.hypot(o.x-x,o.y-y)<h+40)return no('Too close to an oil derrick.');
  if(STRUCT[kind].shore){let wet=false;for(let a=0;a<6.28;a+=.4){const px=x+Math.cos(a)*(h+60),py=y+Math.sin(a)*(h+60);if(passXY('naval',px,py)&&!passXY('ground',px,py)){wet=true;break;}}
    if(!wet)return no('Shipyards go on dry land right next to the water.');}
  const dz=G.vsD.filter(u=>u.team===team&&!u.dead);
  if(!dz.length)return no('You need a Construction Vehicle to build. Train one at your Command HQ.');
  if(enemy<FRONT_R&&!dz.some(u=>Math.hypot(u.x-x,u.y-y)<ONSITE_R))return no('Too close to an enemy base. Drive a Construction Vehicle there first.');
  return 2;}
function placeBld(team,kind,x,y,dzId){const T=G.teams[team],s=bstats(T.fac,kind);if(!bldAllowed(T.fac,kind))return false;if(!BUILD_ORDER.includes(kind)||!reqMet(team,kind)||T.credits<s.cost)return false;if(s.limit&&G.ents.filter(e=>!e.dead&&e.isB&&e.team===team&&e.kind===kind).length>=s.limit){log(team,`You can have at most ${s.limit} ${s.name}s.`,'w');return false;}
  let m=validSpot(team,kind,x,y);if(!m){log(team,validSpot.why||'Cannot build there.','w');return false;}if(m===2&&G.sandbox&&team===0)m=1;
  const b=addBld(team,kind,x,y,false);T.credits-=s.cost;
  if(m===2){b.nd=true;const dz=G.ents.filter(u=>u.kind==='dozer'&&u.team===team&&!u.dead);let pick=dz.find(u=>u.id===dzId);
    if(!pick){const idle=dz.filter(u=>!u.order||u.order.type!=='build');pick=(idle.length?idle:dz).reduce((p,q)=>Math.hypot(q.x-x,q.y-y)<Math.hypot(p.x-x,p.y-y)?q:p);}
    pick.order={type:'build',target:b};pick.path=null;log(team,`${pick.s.name} on the way to build the ${s.name}.`);}
  return true;}
function updDozer(u,dt){u.building=false;const o=u.order;
  if(o&&o.type==='build'){const b=o.target;if(b.dead||b.built>=1){u.order=null;return;}const d=Math.hypot(b.x-u.x,b.y-u.y);
    if(d>b.size/2+30){navTo(u,b.x,b.y,dt);return;}u.building=true;u.ang=Math.atan2(b.y-u.y,b.x-u.x);u.lastFire=G.t;return;}
  if(o&&o.type==='move'){if(Math.hypot(o.x-u.x,o.y-u.y)<14||stalled(u,o))u.order=null;else{navTo(u,o.x,o.y,dt,true);return;}}
  // idle: finish a nearby foundation, otherwise patch up damaged buildings close by
  const near=G.ents.find(b=>b.isB&&b.team===u.team&&!b.dead&&b.built<1&&b.nd&&Math.hypot(b.x-u.x,b.y-u.y)<320);if(near){u.order={type:'build',target:near};return;}
  const hurt=G.ents.find(b=>b.isB&&b.team===u.team&&!b.dead&&b.built>=1&&b.hp<b.max&&G.t-b.lastHit>4&&Math.hypot(b.x-u.x,b.y-u.y)<b.size/2+70);if(hurt){hurt.hp=Math.min(hurt.max,hurt.hp+hurt.max*.012*dt);u.building=true;}}

/* ---------- movement ---------- */
// Vehicle-style motion: each unit has a heading that turns at a limited rate, accelerates and brakes,
// slows down to turn, and eases into its final stop. Infantry turn and accelerate quickly; tanks pivot; ships are slow to answer the helm.
const MOVE={inf:[9,140],at:[9,140],hacker:[9,140],hero:[10,160],harv:[2.2,40],dozer:[2.2,40],tank:[1.7,34],aa:[2.1,42],arty:[1.8,32],boat:[1.6,40],ship:[.55,10],heli:[2.3,55],drone:[3,80]};
// Vehicle handling: tracked vehicles pivot on the spot, wheeled ones need speed to turn (a turning circle) and slow
// into tight corners; everything ground-based labours uphill and runs a little faster downhill.
const WHEELED=new Set(['harv','dozer','jeep','ew','cbr','raidlead','idome','aa']);
function isWheeled(u){const s=u.s;return WHEELED.has(u.kind)||(u.kind==='arty'&&s.rocket)||/Technical/.test(s.name||'');}
// Fixed-wing flight (Shahed-type drones): they never stop or hover - they hold cruise speed, turn in smooth arcs
// limited by bank angle, and tighten the turn only in the final dive onto a target.
function isFW(u){return u.kind==='drone'&&(u.fw??(u.fw=['IR','RS'].includes(G.teams[u.team].fac)));}
function flyFW(u,x,y,dt,terminal){const want=Math.atan2(y-u.y,x-u.x);if(u.hd==null)u.hd=u.ang||0;const cr=u.s.spd*(.75+.25*wxNow().air);if(u.v==null||u.v<cr*.5)u.v=cr*.7;
  u.v+=(cr-u.v)*Math.min(1,dt*1.2);const dg=Math.hypot(x-u.x,y-u.y),w=terminal?(dg<120?6:4):1.25;if(terminal&&dg<120)u.hd+=angDiff(u.hd,want)*Math.min(1,dt*10);u.hd+=Math.max(-w*dt,Math.min(w*dt,angDiff(u.hd,want)));u.ang=u.hd;
  u.x+=Math.cos(u.hd)*u.v*dt;u.y+=Math.sin(u.hd)*u.v*dt;u.x=Math.max(-60,Math.min(MAPW+60,u.x));u.y=Math.max(-60,Math.min(MAPH+60,u.y));u.mv=G.t;u.vt=G.t;}
// idle fixed-wing drones circle (loiter) around where they were left instead of hanging in the air
function loiter(u,dt){if(!u.lc||Math.hypot(u.lc.x-u.x,u.lc.y-u.y)>700)u.lc={x:u.x,y:u.y};const R=150,dc=Math.hypot(u.x-u.lc.x,u.y-u.lc.y),a=Math.atan2(u.y-u.lc.y,u.x-u.lc.x)+(dc>R*1.3?0:.55);const rr=dc>R*1.3?R*.6:R;flyFW(u,u.lc.x+Math.cos(a)*rr,u.lc.y+Math.sin(a)*rr,dt,false);}
function stepTo(u,x,y,dt,fin){if(u.s.dom==='air'&&isFW(u)){const t=u.target;let gx=x,gy=y;
    if(t&&!t.dead&&t.x===x&&t.y===y){const dd=Math.hypot(t.x-u.x,t.y-u.y);if(dd>420){const a=Math.atan2(t.y-u.y,t.x-u.x)+Math.PI/2,off=((u.id%5)-2)*Math.min(90,(dd-260)*.35);gx=t.x+Math.cos(a)*off;gy=t.y+Math.sin(a)*off;}}
    flyFW(u,gx,gy,dt,!!(t&&!t.dead&&Math.hypot(t.x-u.x,t.y-u.y)<260));return;}
  const want=Math.atan2(y-u.y,x-u.x),M=MOVE[u.s.cls]||[4,80],d=u.s.dom,dist2=Math.hypot(x-u.x,y-u.y);
  if(u.hd==null||(M[0]>=8&&G.t-(u.vt??-9)>.3))u.hd=u.ang;if(u.v==null)u.v=0;const err0=angDiff(u.hd,want);const whl=d==='ground'&&M[0]<8&&isWheeled(u);
  let tr=M[0]*dt;if(whl){tr*=Math.min(1.25,.25+u.v/Math.max(20,u.s.spd*.45));if(u.v<6&&Math.abs(err0)>.6)u.v=Math.max(u.v,7);}
  const err=err0;u.hd+=Math.max(-tr,Math.min(tr,err));
  const ae=Math.abs(angDiff(u.hd,want)),foot=M[0]>=8;let f=foot?(ae<1.2?1:.35):Math.max(.12,Math.cos(Math.min(ae,1.45)));
  if(whl)f=Math.max(.35,Math.cos(Math.min(ae,1.2)));let sl=1;if(d==='ground'){const ca=Math.cos(u.hd),sa=Math.sin(u.hd),g0=groundH(u.x,u.y),g1=groundH(u.x+ca*14,u.y+sa*14),gr=(g1-g0)/14;sl=Math.max(.45,Math.min(1.15,1-gr*(M[0]>=8?.9:1.6)));}
  const wx=wxNow();const UP=G.teams[u.team].upg;let top=u.s.spd*f*sl*upgK(G.teams[u.team],u.kind,'spd')*(d==='ground'?wx.spd:d==='air'?(.75+.25*wx.air):1)*((u.supp||0)>.5?.6:1)*(isVeh(u.s)&&auraNear(u,'raid')?1.2:1)*((G.teams[u.team].raidT||0)>G.t&&u.s.armor==='heavy'?1.35:1)*(G.smokes&&G.smokes.some(S=>S.t>G.t&&S.team===u.team&&Math.hypot(u.x-S.x,u.y-S.y)<S.r)?1.25:1)*(d==='ground'&&u.s.armor!=='heavy'&&G.t-(u.lastFire||-9)<3&&(DOCT[G.teams[u.team].fac]||{}).hitrun?1.25:1);if(u.order&&u.order.cap)top=Math.min(top,u.order.cap*f);if(fin){const brake=M[1]*1.4;top=Math.min(top,Math.sqrt(2*brake*Math.max(0,dist2-2))+4);}
  if(u.retreat)top*=1.15;
  if(d==='ground'&&!foot&&G.hash&&u.v>4){const la=u.r*2+12,px=u.x+Math.cos(u.hd)*la,py=u.y+Math.sin(u.hd)*la;for(const o of nearby(px,py,34,AV_N)){if(o===u||o.dead||o.isB||!o.s||o.s.dom!=='ground')continue;const dx=o.x-px,dy=o.y-py;if(dx*dx+dy*dy>(o.r+u.r*.8)*(o.r+u.r*.8))continue;
    if((o.v||0)>4&&Math.abs(angDiff(u.hd,o.ang||0))<.6)top=Math.min(top,Math.max(8,(o.v||0)*.95));else if(massOf(o)>=massOf(u)*.5){const ah=angDiff(u.hd,Math.atan2(o.y-u.y,o.x-u.x));u.hd-=Math.sign(ah||1)*Math.min(1.8*dt,.12);top*=.75;}break;}}
  const acc=(u.v<top?M[1]:M[1]*2.2)*dt;u.v+=Math.max(-acc,Math.min(acc,top-u.v));u.vt=G.t;
  const st=Math.min(u.v*dt,dist2+.5);const nx=u.x+Math.cos(u.hd)*st,ny=u.y+Math.sin(u.hd)*st;u.ang=u.hd;
  if(passXY(d,nx,ny)){u.x=nx;u.y=ny;}else if(passXY(d,nx,u.y)){u.x=nx;u.v*=.6;}else if(passXY(d,u.x,ny)){u.y=ny;u.v*=.6;}else{u.v*=.3;u.hd+=.6*dt*Math.sign(err||1);}
  if(st>.01)u.mv=G.t;}
// A move that stops making progress ends instead of pushing forever: close to the spot (crowded by other units or a
// building) it counts as arrived; further away the unit re-plans its route, then gives up after a while.
function stalled(u,o){const d=Math.hypot(o.x-u.x,o.y-u.y);if(u.so!==o){u.so=o;u.sbD=d;u.sbT=G.t;u.srp=0;return false;}
  if(d<u.sbD-4){u.sbD=d;u.sbT=G.t;return false;}const w=G.t-u.sbT;if(d<70&&w>2.5)return true;if(w>7&&!u.srp){u.srp=1;u.path=null;}if(w>16){u.srp=0;return true;}return false;}
function smoothP(d,x0,y0,P){if(!P||P.length<3)return P;const out=[];let cx=x0,cy=y0,i=0;while(i<P.length){let j=Math.min(P.length-1,i+14);while(j>i&&!los(d,cx,cy,P[j][0],P[j][1]))j--;out.push(P[j]);cx=P[j][0];cy=P[j][1];i=j+1;}return out;}
// group moves: one shared route for the whole group instead of one search per unit; each unit joins it and peels
// off to its own formation slot at the end
/* ---------- Flow fields ----------
   For a big group move, one search outward from the destination gives every grid cell its distance to the goal; each
   unit then just walks "downhill" (smoothed by line of sight), so a whole army costs one search instead of one per unit,
   and units spread over every good route instead of queueing on one. Same passability and costs as findPath.
   Fields are cached per destination and rebuilt when the map or buildings change. */
const FFC=new Map();let FFH=null,FFI=null;
function ffBuild(gx,gy){const g0=nearestPass('ground',Math.floor(gx/CELL),Math.floor(gy/CELL));if(!g0)return false;const goal=g0[1]*GW+g0[0];
  const d=new Float32Array(PN).fill(Infinity),cl=new Uint8Array(PN);if(!FFH||FFH.length<PN*8){FFH=new Float32Array(PN*8);FFI=new Int32Array(PN*8);}const HF=FFH,HI=FFI;let HN=0;
  const push=(f,i)=>{let k=HN++;while(k>0){const p=(k-1)>>1;if(HF[p]<=f)break;HF[k]=HF[p];HI[k]=HI[p];k=p;}HF[k]=f;HI[k]=i;};
  const pop=()=>{const top=HI[0];HN--;if(HN>0){const f=HF[HN],v=HI[HN];let k=0;for(;;){const l=2*k+1,r=l+1;let m=-1,mf=f;if(l<HN&&HF[l]<mf){m=l;mf=HF[l];}if(r<HN&&HF[r]<mf){m=r;}if(m<0)break;HF[k]=HF[m];HI[k]=HI[m];k=m;}HF[k]=f;HI[k]=v;}return top;};
  const WC=wallCost();d[goal]=0;push(0,goal);let it=0;
  while(HN>0&&HN<PN*8-9){const cur=pop();if(cl[cur])continue;cl[cur]=1;it++;const cx=cur%GW,cy=(cur/GW)|0,base=d[cur]+(WC?WC[cur]:0)*.5;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(!passC('ground',nx,ny))continue;if(dx&&dy&&(!passC('ground',cx+dx,cy)||!passC('ground',cx,cy+dy)))continue;
      const ni=ny*GW+nx;if(cl[ni])continue;const nd=d[cur]+(dx&&dy?1.414:1)*(WC?1+WC[ni]:1);if(nd<d[ni]){d[ni]=nd;push(nd,ni);}}}
  G.pfN=(G.pfN||0)+it;return {d,goal};}
function ffGet(gx,gy){const g0=nearestPass('ground',Math.floor(gx/CELL),Math.floor(gy/CELL));if(!g0)return false;const key=g0[1]*GW+g0[0];bocc();
  let F=FFC.get(key);if(F&&F.gv===(G.gridV|0)&&F.bv===(G.boccV|0)&&G.t-F.t<30&&F.pn===PN)return F.f;
  if((G.pfTok||0)<1||(G.pfMs||0)>=PF_MS||(G.pfN||0)>=PF_N)return F&&F.pn===PN?F.f:null;   // stale field is fine until there is budget to rebuild it
  G.pfTok-=2;const t0=performance.now();let f;P_B=true;try{f=ffBuild(gx,gy);}finally{P_B=false;}G.pfMs=(G.pfMs||0)+performance.now()-t0;
  FFC.delete(key);FFC.set(key,{f,gv:G.gridV|0,bv:G.boccV|0,t:G.t,pn:PN});while(FFC.size>8)FFC.delete(FFC.keys().next().value);return f;}
// next point for a unit following the field toward (x,y); null = fall back to an individual route (also used for the
// last 600 px, where each unit heads for its own formation slot rather than the group's centre)
function ffStep(u,x,y){const dd=Math.hypot(x-u.x,y-u.y);P_B=true;try{
    if(dd<520&&los('ground',u.x,u.y,x,y)){u.ffw=null;return [x,y,true];}
    // no progress for 3.5 s (wedged against something) -> individual routing and the unstick logic take over
    if(!u.ffP||dd<u.ffP.d-4){u.ffP={d:dd,t:G.t};}else if(G.t-u.ffP.t>3.5){u.ffx=null;u.ffP=null;return null;}
    if(u.ffw&&G.t<u.ffwT&&Math.hypot(u.ffw[0]-u.x,u.ffw[1]-u.y)>22)return [u.ffw[0],u.ffw[1],false];
    const F=ffGet(u.ffx,u.ffy);if(F===false){u.ffx=null;return null;}if(!F)return u.ffw?[u.ffw[0],u.ffw[1],false]:null;
    let cx=Math.floor(u.x/CELL),cy=Math.floor(u.y/CELL);if(!(F.d[cy*GW+cx]<Infinity)){const q=nearestPass('ground',cx,cy);if(!q||!(F.d[q[1]*GW+q[0]]<Infinity)){u.ffx=null;return null;}cx=q[0];cy=q[1];}
    const steps=[];for(let k=0;k<10;k++){const ci=cy*GW+cx;let best=-1,bd=F.d[ci];
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;const ni=ny*GW+nx;if(!(F.d[ni]<bd))continue;if(dx&&dy&&(!passC('ground',cx+dx,cy)||!passC('ground',cx,cy+dy)))continue;bd=F.d[ni];best=ni;}
      if(best<0)break;cx=best%GW;cy=(best/GW)|0;steps.push([cx*CELL+CELL/2,cy*CELL+CELL/2]);if(bd===0)break;}
    if(!steps.length){u.ffw=null;return [x,y,true];}
    let w=steps[0];for(let j=steps.length-1;j>0;j--)if(los('ground',u.x,u.y,steps[j][0],steps[j][1])){w=steps[j];break;}
    u.ffw=w;u.ffwT=G.t+.6;return [w[0],w[1],false];}finally{P_B=false;}}
function sharePath(us,x,y){const G0=us.filter(u=>u.s.dom==='ground'&&u.order&&!u.dead);if(G0.length<4)return;
  if(G0.length>=6){for(const u of G0){u.ffx=x;u.ffy=y;u.ffP=null;u.ffw=null;}return;}let cx=0,cy=0;for(const u of G0){cx+=u.x;cy+=u.y;}cx/=G0.length;cy/=G0.length;
  if(los('ground',cx,cy,x,y))return;let P;bocc();P_B=true;try{P=findPath('ground',cx,cy,x,y);}finally{P_B=false;}if(!P||P.length<2)return;P=smoothP('ground',cx,cy,P);
  for(const u of G0){if(Math.hypot(u.x-cx,u.y-cy)>260||!los('ground',u.x,u.y,P[0][0],P[0][1]))continue;const o=u.order;u.path=P.slice(0,-1).map(p=>[p[0],p[1]]).concat([[o.x,o.y]]);u.pgx=o.x;u.pgy=o.y;u.prt=G.t+3+Math.random();}}
// Route searches are budgeted per tick (a big army ordered at once used to search every unit's route in the same
// tick - a visible hitch); a unit waiting its turn keeps its current route, or briefly holds if it has none. Routes are
// re-planned every few seconds (that keeps a big army fanning out instead of queueing on one route) and when stuck.
// PF_N: route-search work per tick, in search steps (~4 ms of searching): the time budget alone does nothing where the
// clock stands still while code runs (a battle hosted on Cloudflare), so the work is counted too.
const PF_RATE=120,PF_BURST=12,PF_MS=4,PF_N=12000;
function navTo(u,x,y,dt,fin){const d=u.s.dom;if(d==='air'){stepTo(u,x,y,dt,fin);return;}
  if(d==='ground'&&u.ffx!=null){if(Math.hypot(u.ffx-x,u.ffy-y)>450||Math.hypot(x-u.x,y-u.y)<600)u.ffx=null;else{const r=ffStep(u,x,y);if(r){stepTo(u,r[0],r[1],dt,r[2]&&fin);return;}}}
  const goalMoved=!u.path||Math.hypot(u.pgx-x,u.pgy-y)>60;
  if(goalMoved||G.t>u.prt){
    if(los(d,u.x,u.y,x,y)){u.path=[[x,y]];u.pgx=x;u.pgy=y;u.prt=G.t+2.5+Math.random();}
    else if((G.pfTok||0)>=1&&(G.pfMs||0)<PF_MS&&(G.pfN||0)<PF_N){G.pfTok-=1;const t0=performance.now();if(d==='ground'){bocc();P_B=true;}try{u.path=smoothP(d,u.x,u.y,findPath(d,u.x,u.y,x,y))||[[x,y]];}finally{P_B=false;}G.pfMs=(G.pfMs||0)+performance.now()-t0;u.pgx=x;u.pgy=y;u.prt=G.t+2.5+Math.random();}
    else if(goalMoved){u.v=(u.v||0)*.85;return;}}
  const sk=(MOVE[u.s.cls]||[4])[0]>=8?12:26;while(u.path.length>1&&Math.hypot(u.path[0][0]-u.x,u.path[0][1]-u.y)<sk)u.path.shift();
  // unstick: no progress toward the next waypoint for 2.5s (jammed on a corner or in a crowd) -> sidestep, then re-plan
  {const wp=u.path[0],dd=Math.hypot(wp[0]-u.x,wp[1]-u.y);if(u.npW!==wp){u.npW=wp;u.npD=dd;u.npT=G.t;}else if(dd<u.npD-3){u.npD=dd;u.npT=G.t;}
   else if(G.t-u.npT>2.5&&dd>20){u.npT=G.t;const base=Math.atan2(wp[1]-u.y,wp[0]-u.x),sg=(u.id+(G.t|0))%2?1:-1;let ok=null;
     for(const [da,r] of [[1.57*sg,45],[-1.57*sg,45],[2.3*sg,60],[-2.3*sg,60],[1.57*sg,80]]){const x2=u.x+Math.cos(base+da)*r,y2=u.y+Math.sin(base+da)*r;if(passXY(d,x2,y2)&&los(d,u.x,u.y,x2,y2)){ok=[x2,y2];break;}}
     if(ok){u.path.unshift(ok);u.npW=ok;u.npD=1e9;}u.prt=Math.min(u.prt,G.t+1.2);}}
  stepTo(u,u.path[0][0],u.path[0][1],dt,u.path.length===1&&fin);}
// Formations: a group moving together lines up facing its destination - armour in front, infantry behind it, support
// (AA, artillery, builders) at the back. Squads (a.fm) also travel at the pace of their slowest member so they arrive together.
const FROW={tank:0,hero:1,inf:1,at:1,hacker:2,aa:2,drone:2,arty:3,harv:4,dozer:4,boat:0,ship:0,heli:0,jet:0};
function formMove(us,x,y,type,squad,colW){const n=us.length;if(!n)return;if(n===1){setMove(us[0],x,y,type);return;}
  const cx=us.reduce((s,u)=>s+u.x,0)/n,cy=us.reduce((s,u)=>s+u.y,0)/n,dir=Math.atan2(y-cy,x-cx),fx=Math.cos(dir),fy=Math.sin(dir),px=-fy,py=fx;
  const sorted=us.slice().sort((p,q)=>(FROW[p.s.cls]??2)-(FROW[q.s.cls]??2)||p.id-q.id);const cols=colW||Math.max(2,Math.ceil(Math.sqrt(n*1.6)));const sp=Math.max(26,...us.map(u=>u.r*2+8));
  let cap=Infinity;if(squad)for(const u of us)if(u.s.dom!=='air')cap=Math.min(cap,u.s.spd);
  sorted.forEach((u,i)=>{const row=Math.floor(i/cols),inRow=Math.min(cols,n-row*cols),col=i%cols-(inRow-1)/2;const tx=x+px*col*sp-fx*row*sp,ty=y+py*col*sp-fy*row*sp;setMove(u,tx,ty,type);if(squad&&u.s.dom!=='air'&&isFinite(cap))u.order.cap=cap*.97;u.sq=squad?1:0;});}
function setMove(u,x,y,type){if(u.s.dom!=='air'){const p=nearestPassXY(u.s.dom,x,y);if(p){x=p[0];y=p[1];}}u.order={type,x,y};u.target=null;u.guard=null;u.path=null;u.ffx=null;if(u.kind==='jet'&&u.state!=='fly'){u.state='fly';u.landed=false;}}

/* ---------- combat ---------- */
// Spatial hash (rebuilt every tick) so target searches and vision only look at nearby cells, not every entity on the map.
const HC=160;let HW=Math.ceil(MAPW/HC)+2;
// spatial hash in a flat array (cells looked up by index; it was a Map - the most used lookup in the simulation).
// Keys are exactly the old ones; the rare key outside the array (units off the map edge) goes to a small overflow map.
function buildHash(){const n=HW*(Math.ceil(MAPH/HC)+3);let H=G.hash;if(!H||H.n!==n){H=G.hash={A:new Array(n),n,O:new Map()};for(let i=0;i<n;i++)H.A[i]=[];}else{const A=H.A;for(let i=0;i<n;i++)if(A[i].length)A[i].length=0;if(H.O.size)H.O.clear();}
  let bm=0,rm=0;const A=H.A;for(const e of G.ents){if(e.dead)continue;if(e.isB){if(e.size>bm)bm=e.size;}else if(e.r>rm)rm=e.r;const k=Math.floor(e.x/HC)+1+(Math.floor(e.y/HC)+1)*HW;if(k>=0&&k<n)A[k].push(e);else{const a=H.O.get(k);if(a)a.push(e);else H.O.set(k,[e]);}}G.bmaxH=bm/2;G.rmax=rm||20;}
function nearby(x,y,R,out){out.length=0;const H=G.hash;if(!H){for(const e of G.ents)out.push(e);return out;}const x0=Math.floor((x-R)/HC)+1,x1=Math.floor((x+R)/HC)+1,y0=Math.floor((y-R)/HC)+1,y1=Math.floor((y+R)/HC)+1;
  const A=H.A,n=H.n;for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const k=cx+cy*HW,a=k>=0&&k<n?A[k]:(H.O.size?H.O.get(k):null);if(a)for(let i=0;i<a.length;i++)out.push(a[i]);}return out;}
const NB=[],NB2=[];
function nearestEnemy(src,range,s,minEff){s=s||src.s;let best=null,bd=1e9;for(const e of nearby(src.x,src.y,range+60,NB)){if(e.dead||e.aband||ally(e.team,src.team)||!canTarget(s,e)||!seenBy(src.team,e))continue;if(minEff&&effOn(s,e)<minEff)continue;
  const d=Math.hypot(e.x-src.x,e.y-src.y)-e.r;if(d>range)continue;
  // smart targeting: prefer what this weapon is good against, finish off damaged targets, answer units that can shoot back,
  // and leave buildings and supply trucks for last
  let sc=d;if(s.wpn){const ar=e.isB?'bld':(e.landed?'heavy':e.s.armor),eff=(VS[s.wpn]||{})[ar]||0;sc-=eff*90;}
  sc-=(1-Math.max(0,e.hp)/e.max)*70;if(!e.isB&&e.s.dmg&&canTarget(e.s,src))sc-=35;if(e.isB)sc+=e.kind==='turret'||e.kind==='sam'?60:180;if(e.kind==='harv'||e.kind==='dozer')sc+=30;
  if(sc<bd){bd=sc;best=e;}}return best;}
function fire(src,t,dmg,wpn,splash){if(!src.isB){const ss=src.s;if(ss.finisher&&!t.isB&&t.s&&isVeh(t.s)&&t.hp<t.max*.5)dmg*=1.4;if(ss.dom==='air'&&!t.isB&&saSpotted(src.team,t))dmg*=1.3;
  if(ss.ripple&&!src._rip){for(let k=1;k<ss.ripple;k++)G.timers.push({t:.16*k,fn:()=>{if(!src.dead&&!t.dead){src._rip=1;try{fire(src,t,dmg,wpn,splash);}finally{src._rip=0;}}}});}}
  if(!src.isB&&src.s.ambush&&hiddenNow(src)){dmg*=2;FXE('txt',[t.x|0,t.y|0,'AMBUSH',src.team,t.team]);}else if(!src.isB&&src.s.camo&&(DOCT[G.teams[src.team].fac]||{}).covert&&hiddenNow(src)){dmg*=1.5;FXE('txt',[t.x|0,t.y|0,'AMBUSH',src.team,t.team]);}src.lastFire=G.t;if(!src.isB&&(wpn==='shell'&&src.s.dom==='ground'||src.s.cls==='arty'))src.cbrT=G.t+10;
  const ang=src.isB?src.ang:((['tank','arty','aa','ship','boat'].includes(src.s.cls))?src.tang:Math.atan2(t.y-src.y,t.x-src.x));
  const len=src.isB?20:({inf:8,at:10,hero:10,tank:24,arty:27,aa:16,boat:16,ship:30,heli:14,jet:10}[src.s.cls]||10);
  const ox=src.x+Math.cos(ang)*len,oy=src.y+Math.sin(ang)*len,h=srcH(src);
  FXE('muz',[ox|0,oy|0,h|0,+ang.toFixed(2),wpn==='gun'||wpn==='snipe'?5:wpn==='at'||wpn==='missile'?8:wpn==='flak'?7:13]);
  if(wpn==='gun'||wpn==='tower'||wpn==='snipe'||wpn==='flak'){applyDmg(t,dmg,wpn,src.team,src);FXE('tr',[ox|0,oy|0,h|0,(t.x+rnd(-4,4))|0,(t.y+rnd(-4,4))|0,tgtH(t)|0,wpn==='flak'?1:0]);return;}
  if(src.kind==='heli')FXE('salvo',[ox|0,oy|0,h|0,t.x|0,t.y|0,+ang.toFixed(2)]);
  const d=Math.hypot(t.x-ox,t.y-oy),spd=wpn==='shell'?280:wpn==='at'||wpn==='missile'?430:wpn==='bomb'?380:640;
  const p={x:ox,y:oy,tx:t.x,ty:t.y,tgt:t,p:0,len:Math.max(d,1),spd,dmg,wpn,splash:splash||0,team:src.team,src};G.proj.push(p);
  FXE('pj',[ox|0,oy|0,h|0,t.x|0,t.y|0,tgtH(t)|0,spd,wpn,src.s.rocket?1:0]);}
function srcH(e){if(e.isB)return BH[e.kind]*.8+6;if(e.s.dom==='air')return e.landed?4:(e.s.alt==='high'?110:55);return e.s.dom==='naval'?10:8;}
function tgtH(e){if(e.oil)return 16;return e.isB?BH[e.kind]*.5:e.s.dom==='air'?(e.landed?4:(e.s.alt==='high'?110:55)):6;}
// Tactics: armour is thickest at the front (side hits x1.2, rear hits x1.6), infantry in woods or beside buildings take
// less damage, firing downhill helps and uphill hurts, moving targets are harder to hit, and infantry under heavy fire
// get suppressed (they shoot slower and move slower until it wears off).
function coverAt(x,y){const g=G.cover;if(!g)return 0;const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);let n=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const X=cx+i,Y=cy+j;if(X>=0&&Y>=0&&X<GW&&Y<GH)n+=g[Y*GW+X];}
  if(n>=2)return 1;for(const b of nearby(x,y,(G.bmaxH||160)+34,CV_N))if(b.isB&&!b.dead&&Math.abs(b.x-x)<b.size/2+34&&Math.abs(b.y-y)<b.size/2+34)return 1;return 0;}
const CV_N=[],MN_N=[],CV_U=[];
// AI tactics tally (flanks, cover, retreats, landings...): read by orch/aitourney.mjs; never feeds back into the battle
function aiStat(A,k,v){const S=A.st||(A.st={});S[k]=(S[k]||0)+(v==null?1:v);}
function tactic(e,wpn,src,splash){let m=1,tag=null;if(e.isB||!src||src.isB&&!src.s)return{m,tag};const air=e.s.dom==='air'&&!e.landed,sair=!src.isB&&src.s.dom==='air';
  if(!air&&(isVeh(e.s)||e.s.dom==='naval')&&!splash&&wpn!=='bomb'){const a=Math.atan2(e.y-src.y,e.x-src.x),rel=Math.abs(angDiff(e.hd??e.ang,a));
    if(rel<.95){m*=1.6;tag='REAR HIT';}else if(rel<2.1){m*=1.2;tag='SIDE HIT';}else m*=.8;}
  if(isInf(e.s)&&!air){if(coverAt(e.x,e.y)){m*=wpn==='shell'||wpn==='boom'||splash?.8:.65;tag=tag||'IN COVER';}if(e.supp>.5)m*=.9;}
  if(!air&&!sair){const dh=groundH(src.x,src.y)-groundH(e.x,e.y);if(dh>10){m*=1.15;tag=tag||'HIGH GROUND';}else if(dh<-10)m*=.9;}
  if(!air&&G.t-(e.mv||-9)<.35&&['cannon','at','tower','snipe','gun'].includes(wpn))m*=.85;
  return{m,tag};}
function specialMult(e,wpn,src){let m=1;if(e.mark>G.t)m*=1.25;if((wpn==='shell'||wpn==='missile'||wpn==='bomb'||wpn==='super'||src&&src.s&&src.s.rocket)&&auraProtect(e,'dome')){m*=.45;if(G.t-(e.domeT||-9)>1.2){e.domeT=G.t;FXE('boom',[(e.x+rnd(-20,20))|0,(e.y+rnd(-20,20))|0,6,0]);}}
  if(src&&!src.isB&&(src.s.dom==='air'||src.kind==='drone'||wpn==='missile')&&auraProtect(e,'jam'))m*=.5;return m;}
function applyDmg(e,d,wpn,team,src,splash){if(e.dead)return;if(e.civ&&e.kind==='civb'){const m=VS[wpn]&&VS[wpn].bld;if(m)damageCiv(e.civ,d*m,team);return;}if(e.oil){const m=VS[wpn]&&VS[wpn].bld;if(m)damageOil(e.oil,d*m,team);return;}if(e.isB&&team!=null&&!ally(team,e.team)){const V=G.teams[e.team];if(G.t-(V.atkWarn??-99)>25){V.atkWarn=G.t;log(e.team,'Our base is under attack!','w');}}const ar=e.isB?'bld':(e.landed?'heavy':e.s.armor);const m=VS[wpn][ar];if(!m)return;const tc=tactic(e,wpn,src,splash);const dd=d*m*dmgIn(e,wpn)*tc.m*specialMult(e,wpn,src);if(src&&!src.isB&&src.s.mark&&!e.isB)e.mark=G.t+6;e.hp-=dd;e.lastHit=G.t;
  if(!e.isB&&canRout(e)){e.fear=(e.fear||0)+dd/e.max*(isInf(e.s)?1.25:.7)*(coverAt(e.x,e.y)&&isInf(e.s)?.7:1)*(auraNear(e,'morale')?.5:1)+(splash?.05:.02);}
  if(!e.isB&&isInf(e.s)&&!auraNear(e,'morale')&&!auraNear(e,'rof')){const bk=team!=null&&G.teams[team]&&(DOCT[G.teams[team].fac]||{}).barrage&&(wpn==='shell'||wpn==='rocket'||splash)?1.5:1;e.supp=Math.min(1,(e.supp||0)+(dd/e.max*1.4+(wpn==='gun'||wpn==='tower'?.06:.12))*bk);if(bk>1&&canRout(e))e.fear=(e.fear||0)+.04;}
  if(tc.tag&&tc.m>1.05&&G.t-(e.tagT||-9)>1.6&&(tc.tag==='REAR HIT'||tc.tag==='SIDE HIT'||tc.tag==='HIGH GROUND')){e.tagT=G.t;FXE('txt',[e.x|0,e.y|0,tc.tag,team,e.team]);}
  if(e.hp<=0)kill(e,team,src);}
function kill(e,team,src){if(e.dead)return;if(e.kind==='garrison'&&e.civ){collapseCiv(e.civ,team);return;}e.dead=true;if(!e.isB&&e.s&&isInf(e.s)&&!e.s.noAttack&&(e.s.cost||0)<=600&&!e.crew&&Math.random()<.35){let md=null;for(const o of nearby(e.x,e.y,170,DS_N))if(!o.dead&&o.team===e.team&&o.s&&o.s.revive&&Math.hypot(o.x-e.x,o.y-e.y)<170){md=o;break;}if(md){const kd=e.kind,tm=e.team;G.timers.push({t:8,fn:()=>{if(md.dead||G.teams[tm].out)return;const p=nearestPassXY('ground',md.x+rnd(-14,14),md.y+rnd(-14,14));if(!p)return;const n=addUnit(tm,kd,p[0],p[1]);if(n){n.hp=n.max*.3;FXE('txt',[n.x|0,n.y|0,'BACK IN ACTION',tm,-2]);}}});}}if(e.kind==='cleric'){const T=G.teams[e.team];T.mart=G.t+30;T.clr=false;for(const O of G.teams)log(O.id,O.id===e.team||ally(O.id,e.team)?'Our Ayatollah has been martyred! His sacrifice steels our soldiers: no fear and +10% damage for 30 seconds.':`The enemy Ayatollah has fallen - expect his followers to fight harder for a while.`,O.id===e.team?'bad':'w');}if(!e.isB&&e.s.dom==='ground'){for(const o of nearby(e.x,e.y,240,MOR_K)){if(o.dead||o.isB||o===e||!canRout(o))continue;if(o.team===e.team)o.fear=(o.fear||0)+(isInf(e.s)?.16:.26);else if(team!=null&&ally(o.team,team))o.fear=Math.max(0,(o.fear||0)-.08);}}if(e.cargo&&e.cargo.length){log(e.team,`The ${e.s.name} was destroyed with ${e.cargo.length} aboard.`,'bad');for(const c of e.cargo){c.dead=true;G.teams[c.team].lost++;}e.cargo=[];}if(e.isB)G.bdirty=true;G.byId.delete(e.id);FXE('die',[e.id,e.x|0,e.y|0,KINDS.indexOf(e.kind),e.isB?1:0,e.team]);G.teams[e.team].lost++;
  if(!e.isB&&e.s){const V=G.teams[e.team];if(V&&V.pw&&V.pw.bounty&&((GPOW[V.fac]||{}).bounty||{}).fx==='salvage')V.credits+=Math.round((e.s.cost||0)*.15);}
  if(e.isB)log(e.team,`${e.s.name} destroyed.`,'w');
  if(team!=null&&!ally(team,e.team)){const T=G.teams[team],val=e.isB?(e.kind==='hq'?2000:Math.max(400,e.s.cost)):e.s.cost;T.kills++;T.gxp+=val;promoteGeneral(T);
    if(T.pw.bounty){const gb=(GPOW[T.fac]||{}).bounty||{};const b=Math.round(val*[.15,.22,.3][(T.pw.bounty.lv||1)-1]*(gb.m||1)/(gb.fx?1.1:1));T.credits+=b;}{const sv=upgT(T,'salvage');if(sv&&!e.isB&&e.s.armor==='heavy')T.credits+=Math.round(val*sv);}
    if(e.isB&&e.vs[team])log(team,`Enemy ${e.s.name} destroyed.`,'g');
    if(src&&!src.isB&&!src.dead){src.xp+=val*upgT(T,'xp');const base=Math.max(300,src.s.cost),need=[1,2.5,5];let r=0;while(r<3&&src.xp>=base*need[r])r++;if(r>src.rank){src.rank=r;src.hp=src.max;log(src.team,`${src.s.name} promoted to ${VET[r]}.`,'g');}}}}
function promoteGeneral(T){let r=1;while(r<RANKS.length&&T.gxp>=RANKS[r])r++;if(r>T.rank){T.rank=r;log(T.id,`General promoted to rank ${r}. Spend your new point in Powers.`,'g');}}
function explode(x,y,r,d,team,wpn,kind,src){for(const e of G.ents){if(e.dead||ally(e.team,team))continue;const air=!e.isB&&e.s.dom==='air'&&!e.landed;if(air&&!VS[wpn].air)continue;
  const dd=Math.hypot(e.x-x,e.y-y)-e.r;if(dd>r)continue;let m=1-.5*Math.max(0,dd)/r;if(kind==='sup')m*=(FACTIONS[G.teams[e.team].fac].mods.supResist||1);applyDmg(e,d*m,wpn,team,src,1);
  if(!e.isB&&!e.dead&&!air){const L=Math.hypot(e.x-x,e.y-y)||1;physImpulse(e,(e.x-x)/L,(e.y-y)/L,Math.min(d,900)*.55*(1-Math.max(0,dd)/r)*(kind==='sup'?1.6:1));}}
  if(G.civAt){const mm=VS[wpn]&&VS[wpn].bld;if(mm){const R=r+CELL,c0=Math.floor((x-R)/CELL),c1=Math.floor((x+R)/CELL),r0=Math.floor((y-R)/CELL),r1=Math.floor((y+R)/CELL);for(let cy=r0;cy<=r1;cy++)for(let cx=c0;cx<=c1;cx++){const c=G.civAt.get(cy*GW+cx);if(!c||c.dead||c.g)continue;const dd=Math.hypot(c.x-x,c.y-y)-16;if(dd>r)continue;damageCiv(c,d*(1-.5*Math.max(0,dd)/r)*mm,team);}}}
  for(const o of G.oil){if(o.dead)continue;const dd=Math.hypot(o.x-x,o.y-y)-18;if(dd>r)continue;const mm=VS[wpn]&&VS[wpn].bld;if(mm)damageOil(o,d*(1-.5*Math.max(0,dd)/r)*mm,team);}FXE('boom',[x|0,y|0,+(kind==='sup'?r*.62:Math.max(9,r*.42)).toFixed(1),kind==='sup'?1:0]);}

// Morale. Fear builds from damage taken, comrades dying nearby and being badly outnumbered, and drains away out of
// combat. When it passes the unit's courage it breaks: it drops its orders and runs for the nearest friendly
// building for a few seconds (ignoring commands), then rallies at reduced fear.
const MOR_K=[],MOR_N=[],MOR_H=[];const SEP_G={ground:[],naval:[],air:[]};
// morale as the player sees it: 0..1 plus a state word; null for units that never break
function moraleOf(e){if(!e||e.isB||e.dead)return null;if(MODE==='client'){if(e.aband||e.mor==null||e.mor<0)return null;if(e.mor>100)return{v:1,st:'fearless'};const v=e.mor/100;return{v,st:e.routV?'routing':e.lastV?'last':v>.66?'steady':v>.35?'shaken':'breaking'};}
  if(!e.s||!canRout(e)||e.aband)return null;const T=G.teams[e.team];if(fearlessT(T,e))return{v:1,st:'fearless'};if(e.last>G.t)return{v:1,st:'last'};if(e.rout>G.t)return{v:0,st:'routing'};const v=Math.max(0,Math.min(1,1-(e.fear||0)/courageOf(e)));return{v,st:v>.66?'steady':v>.35?'shaken':'breaking'};}
const MOR_COL={last:'#c98bff',fearless:'#5fd38a',steady:'#6fb2ff',shaken:'#e3b341',breaking:'#ef7a3a',routing:'#ea5a40'};
const MOR_TXT={last:'Last stand',fearless:'Fearless',steady:'Steady',shaken:'Shaken',breaking:'Breaking',routing:'Routing'};
function canRout(u){return u.s&&u.s.dom==='ground'&&!u.s.noAttack&&u.kind!=='hero'&&u.kind!=='harv'&&u.kind!=='dozer'&&u.kind!=='hacker'&&!u.inTun&&!G.teams[u.team].dummy;}
const NOBREAK={KP:1};
function fearlessT(T,u){return !!(NOBREAK[T.fac]||T.clr||(T.mart||0)>G.t||((T.fervor||0)>G.t&&(!T.fervInf||isInf(u.s))));}
// Rally zones: troops near their HQ, an Ayatollah, a friendly-held building or an officer steady themselves much faster
const RZ_N=[];
function rallyZone(u){for(const o of nearby(u.x,u.y,380,RZ_N)){if(o.dead||!ally(o.team,u.team))continue;const d=Math.hypot(o.x-u.x,o.y-u.y);if(o.kind==='cleric'&&d<380)return 'Ayatollah';if(o.kind==='hq'&&o.isB&&d<(o.size||80)/2+260)return 'HQ';if(o.kind==='garrison'&&o.civ&&o.civ.occ&&o.civ.occ.length&&d<210)return 'stronghold';}return auraNear(u,'morale')?'officer':null;}
function moraleTick(u,dt){const T0=G.teams[u.team];if(fearlessT(T0,u)){u.fear=0;u.last=0;if(u.rout){u.rout=0;FXE('txt',[u.x|0,u.y|0,'RALLIED',u.team,-2]);}return false;}const C=courageOf(u);let f=u.fear||0;
  u.mT=(u.mT||0)-dt;if(u.mT<=0){u.mT=1+(u.id%5)*.05;let fr=0,en=0,q=0,qn=0;for(const o of nearby(u.x,u.y,300,MOR_N)){if(o.dead||o.isB||o.s.dom==='air')continue;if(ally(o.team,u.team))fr+=o.s.cost||300;else{en+=o.s.cost||300;if(!o.s.noAttack){qn++;q|=1<<((o.x>u.x?1:0)+(o.y>u.y?2:0));}}}u.odds=en/Math.max(1,fr);
    u.sur=qn>=4&&((q&1)+(q>>1&1)+(q>>2&1)+(q>>3&1))>=3;u.rz=rallyZone(u);}
  if(u.rout>G.t){u.target=null;u.order=null;u.guard=null;const R=u.rtTo;if(R){if(Math.hypot(R.x-u.x,R.y-u.y)>30)navTo(u,R.x,R.y,dt,true);}f=Math.max(0,f-dt*(u.rz?.3:.04));u.fear=f;
    if(u.rz&&f<C*.6){u.rout=0;FXE('txt',[u.x|0,u.y|0,'RALLIED',u.team,-2]);return false;}return true;}
  if(u.rout){u.rout=0;u.fear=f=C*.45;FXE('txt',[u.x|0,u.y|0,'RALLIED',u.team,-2]);}
  if(u.last>G.t){u.fear=Math.min(f,C*.85);u.supp=Math.max(u.supp||0,.75);return false;}
  const calm=G.t-u.lastHit>4;f+=((u.odds||0)>2.2&&!calm?.03*Math.min(3,u.odds-1.2):0)*dt;f-=dt*(.025+(calm?.07:0)+(u.rz?(u.rz==='officer'?.1:.14):0)+(isInf(u.s)&&coverAt(u.x,u.y)?.02:0));u.fear=f=Math.max(0,f);
  if(f>C){const T=G.teams[u.team];
    // Last stand: surrounded with nowhere to run - they stop caring about fear but are pinned down
    if(u.sur){u.last=G.t+10;u.fear=C*.85;u.supp=Math.max(u.supp||0,.75);FXE('txt',[u.x|0,u.y|0,'LAST STAND',u.team,-2]);return false;}
    // Crews bail out of badly damaged vehicles; enemy infantry can then capture the hull
    if(isVeh(u.s)&&u.hp<u.max*.3&&!u.s.noCrew){bailOut(u);return true;}
    let best=null,bd=1e12;for(const b of G.ents){if(b.dead||!b.isB||b.team!==u.team||b.built<1)continue;const d=(b.x-u.x)**2+(b.y-u.y)**2;if(d<bd&&d>140*140){bd=d;best=b;}}
    if(!best){u.last=G.t+10;u.fear=C*.85;u.supp=Math.max(u.supp||0,.75);FXE('txt',[u.x|0,u.y|0,'LAST STAND',u.team,-2]);return false;}const a=Math.atan2(u.y-best.y,u.x-best.x);u.rtTo={x:best.x+Math.cos(a)*(best.size/2+60),y:best.y+Math.sin(a)*(best.size/2+60)};
    u.rout=G.t+Math.max(4,9-3*(C-.9));u.target=null;u.order=null;u.guard=null;FXE('txt',[u.x|0,u.y|0,'ROUTED',u.team,-2]);
    if(u.team===ME&&G.t-(T.routWarn??-99)>15){T.routWarn=G.t;log(u.team,`Our ${u.s.name} broke under fire and is falling back.`,'w');}return true;}
  return false;}
function bailOut(u){const T=G.teams[u.team];u.aband=1;u.cp=0;u.cpT=0;u.target=null;u.order=null;u.guard=null;u.rout=0;u.fear=0;u.last=0;
  FXE('txt',[u.x|0,u.y|0,'CREW BAILED OUT',u.team,-2]);
  try{const a=Math.random()*6.28,c=addUnit(u.team,'inf',u.x+Math.cos(a)*(u.r+10),u.y+Math.sin(a)*(u.r+10));if(c){c.hp=c.max*.5;c.crew=1;c.fear=courageOf(c)*1.05;}}catch(err){}
  if(u.team===ME)log(u.team,`The crew of our ${u.s.name} bailed out - send infantry to re-crew it before the enemy takes it.`,'w');}
const AB_N=[];
function updAband(u,dt){u.target=null;u.order=null;u.guard=null;u.cpT=(u.cpT||0)-dt;if(u.cpT>0)return;u.cpT=.5;let own=0,foe=-1;
  for(const o of nearby(u.x,u.y,u.r+50,AB_N)){if(o.dead||o.isB||!isInf(o.s)||o.s.noAttack||o.kind==='hacker'||o.inTun||o.aband)continue;if(Math.hypot(o.x-u.x,o.y-u.y)>u.r+42)continue;if(ally(o.team,u.team))own++;else if(foe===-1)foe=o.team;else if(foe>=0&&!ally(foe,o.team))foe=-2;}
  if(own&&foe===-1){u.cp=(u.cp||0)+.5;if(u.cp>=3){u.aband=0;u.cp=0;FXE('txt',[u.x|0,u.y|0,'RE-CREWED',u.team,-2]);}return;}
  if(foe>=0&&!own){u.cp=(u.cp||0)+.5;if(u.cp>=5){const prev=u.team,N=G.teams[foe],fr=u.hp/u.max;u.team=foe;try{const ns=stats(N.fac,u.kind);if(ns&&ns.hp){u.s=ns;u.max=ns.hp;u.hp=Math.max(1,ns.hp*fr);}}catch(err){}
      u.aband=0;u.cp=0;u.fear=0;u.rout=0;u.last=0;u.rank=0;u.sq=0;FXE('txt',[u.x|0,u.y|0,'CAPTURED',foe,-2]);log(foe,`Our infantry captured an abandoned enemy ${u.s.name}!`,'g');log(prev,`The enemy captured one of our abandoned vehicles.`,'w');}return;}
  u.cp=Math.max(0,(u.cp||0)-.25);}
// ---------- physics ----------
// Every ground unit has a mass. Explosions push units away with an impulse (lighter units fly further; infantry caught
// close to a big blast are thrown off their feet), the resulting momentum bleeds off with ground friction, collisions
// share the push by mass (a tank shoves soldiers aside, soldiers can't shove a tank), and heavy vehicles moving at speed
// crush enemy infantry they drive into. Everything runs in the deterministic host simulation, so multiplayer agrees.
function massOf(u){if(u.ms)return u.ms;const s=u.s;let m=1;if(s.dom==='ground'&&!(isInf(s)&&!['tank','aa','arty'].includes(s.cls)&&u.kind!=='harv'&&u.kind!=='dozer'))m=s.armor==='heavy'?12+s.hp/60:5+s.hp/120;if(s.dom==='naval')m=40;return u.ms=m;}
function physImpulse(e,nx,ny,J){if(e.isB||e.dead||!e.s||e.s.dom!=='ground')return;const m=massOf(e),kv=Math.min(240,J/m);if(kv<4)return;e.kx=(e.kx||0)+nx*kv;e.ky=(e.ky||0)+ny*kv;
  if(m<2&&kv>70){e.stun=Math.max(e.stun||0,G.t+.8+Math.min(.8,kv/300));FXE('toss',[e.id,Math.min(110,kv*.55)|0]);}}
function physTick(u,dt){if(!u.kx&&!u.ky)return;const d=u.s.dom==='ground'?(massOf(u)<2?5.5:7.5):6,k=Math.exp(-d*dt);const nx=u.x+u.kx*dt,ny=u.y+u.ky*dt;
  if(passXY(u.s.dom,nx,ny)){u.x=nx;u.y=ny;}else{u.kx*=-.3;u.ky*=-.3;}u.kx*=k;u.ky*=k;if(Math.abs(u.kx)+Math.abs(u.ky)<2){u.kx=u.ky=0;}}
function updUnit(u,dt){if(u.kx||u.ky)physTick(u,dt);if(u.aband)return updAband(u,dt);const s=u.s,T=G.teams[u.team],m=T.F.mods;if(u.stun>G.t){u.cd=Math.max(u.cd,.5);return;}u.cd-=dt;if(T.dummy&&!T.fight){const o=u.order;u.target=null;if(o&&(o.type==='move'||o.type==='amove')&&u.kind!=='jet'){if(Math.hypot(o.x-u.x,o.y-u.y)<14)u.order=null;else navTo(u,o.x,o.y,dt,true);}return;}if(u.supp)u.supp=Math.max(0,u.supp-dt*.22);
  if(G.t-u.lastHit>5&&u.hp<u.max){let rg=(m.regen||0)+(u.rank>=3?5:0)+upgK(T,u.kind,'regen');if(rg)u.hp=Math.min(u.max,u.hp+rg*dt);}
  if(u.kind==='harv')return updHarv(u,dt);if(u.kind==='dozer')return updDozer(u,dt);if(u.kind==='jet')return updJet(u,dt);if(u.kind==='hacker')return updHacker(u,dt);
  if(canRout(u)&&moraleTick(u,dt))return;
  let o=u.order;if(o&&o.type==='demo')return updDemo(u,dt);
  // transport helicopters' door gunners fire at nearby infantry, light vehicles and low aircraft while the helicopter
  // flies its route (it never stops or turns to fight)
  if(s.door&&!u.landed){const D=s.door;u.dgT=(u.dgT||0)-dt;if(u.dgT<=0){let t=u.dgTg;if(!t||t.dead||!canTarget(D,t)||Math.hypot(t.x-u.x,t.y-u.y)-t.r>D.rng)t=nearestEnemy(u,D.rng,D);u.dgTg=t;u.dgT=t?D.rof*rofMult(u)*(.85+Math.random()*.3):.25;if(t)fire(u,t,D.dmg*dmgOut(u),D.wpn,0);}}
  if(s.noAttack||s.mines){specialTick(u,dt,o);if(s.noAttack){if(o&&(o.type==='move'||o.type==='amove')){if(Math.hypot(o.x-u.x,o.y-u.y)<14||stalled(u,o))u.order=null;else navTo(u,o.x,o.y,dt,true);}else if(o&&o.type==='enter'){}else return;if(!o||o.type!=='enter')return;}}
  if(o&&o.type==='board'){const tr=o.target;if(!tr||tr.dead){u.order=null;return;}if(Math.hypot(tr.x-u.x,tr.y-u.y)<tr.r+(tr.s.dom==='naval'?95:40)){boardTransport(u,tr);return;}navTo(u,tr.x,tr.y,dt);return;}
  if(o&&o.type==='garrison'){const c=G.civ&&G.civ[o.ci];if(!c||c.dead||(c.g&&!ally(c.g.team,u.team))){u.order=null;return;}const gd=Math.hypot(c.x-u.x,c.y-u.y);if(gd<CELL*1.85||(gd<CELL*2.3&&G.t-(u.mv||-9)>.6)){enterGarrison(u,c);return;}if(stalled(u,o)&&gd>CELL*2.3){u.order=null;return;}navTo(u,c.x,c.y,dt);return;}
  if(o&&o.type==='enter'){const b=o.target;if(b.dead||b.built<1){u.order=null;return;}if(Math.hypot(b.x-u.x,b.y-u.y)<b.size/2+24){enterTunnel(u);return;}navTo(u,b.x,b.y,dt);return;}
  if(o&&o.type==='attack'){if(o.target.dead||!canTarget(s,o.target)||!seenBy(u.team,o.target)){u.order=o=null;u.target=null;}else u.target=o.target;}
  if(u.target&&(u.target.dead||!seenBy(u.team,u.target)||!canTarget(s,u.target)))u.target=null;
  if(!u.target&&(!o||o.type==='amove'||o.type==='move')&&((u.scT=(u.scT||0)-dt)<=0||u.lastHit>G.t-dt*1.5)){u.scT=.2+(u.id%7)*.02;autoEngage(u,o,T);}
  if(u.defend&&!o){const D=u.defend;if(!u.target&&((u.dfT=(u.dfT||0)-dt)<=0)){u.dfT=.4+(u.id%5)*.03;const e=nearestEnemy({x:D.x,y:D.y,team:u.team,s:u.s},D.r);if(e){u.target=e;u.guard={x:D.x,y:D.y};}}
    if(u.target&&Math.hypot(u.target.x-D.x,u.target.y-D.y)>D.r+160){u.target=null;}if(!u.target&&Math.hypot(u.x-D.x,u.y-D.y)>70&&(u.s.dom!=='air'||!isFW(u))){navTo(u,D.x,D.y,dt,true);return;}}
  if(unitBrain(u,dt,o))return;
  if(u.target){const t=u.target;
    if(!o&&u.guard&&Math.hypot(u.x-u.guard.x,u.y-u.guard.y)>420){u.target=null;setMove(u,u.guard.x,u.guard.y,'move');return;}
    /* AI ambush picket: fight only what is within its weapon range of its post; never chase, slip back into position */
    if(u.amb&&!o&&u.guard&&Math.hypot(t.x-u.guard.x,t.y-u.guard.y)-t.r>rngOf(u)+50){u.target=null;if(Math.hypot(u.x-u.guard.x,u.y-u.guard.y)>24)setMove(u,u.guard.x,u.guard.y,'move');return;}
    const d=Math.hypot(t.x-u.x,t.y-u.y)-t.r,R=rngOf(u);
    if(d>R){if(o&&o.type==='move'){u.target=null;navTo(u,o.x,o.y,dt,true);return;}navTo(u,t.x,t.y,dt);return;}
    if(!['tank','arty','aa','ship','boat'].includes(s.cls))u.ang=Math.atan2(t.y-u.y,t.x-u.x);
    if(s.minr&&d<s.minr){if(s.dom!=='naval')stepTo(u,u.x*2-t.x,u.y*2-t.y,dt);return;}
    if(s.wpn==='boom'){explode(u.x,u.y,s.splash*upgK(T,u.kind,'splash'),s.dmg*dmgOut(u),u.team,'boom',null,u);u.dead=true;G.byId.delete(u.id);FXE('die',[u.id,u.x|0,u.y|0,KINDS.indexOf(u.kind),0,u.team]);return;}
    if(u.cd<=0&&Math.abs(angDiff(u.tang,Math.atan2(t.y-u.y,t.x-u.x)))<.35){fire(u,t,s.dmg*dmgOut(u),s.wpn,(s.splash||0)*upgK(T,u.kind,'splash'));u.cd=s.rof*rofMult(u);}return;}
  if(o&&(o.type==='move'||o.type==='amove')){const od=Math.hypot(o.x-u.x,o.y-u.y);if(od<(isFW(u)?60:(MOVE[s.cls]||[4])[0]>=8?8:14)||(!isFW(u)&&od<40&&G.t-(u.mv||-9)>1.2)||(!isFW(u)&&stalled(u,o))){if(isFW(u))u.lc={x:o.x,y:o.y};if(u.wq&&u.wq.length){const n=u.wq.shift();setMove(u,n.x,n.y,n.m);}else{u.order=null;u.guard=null;u.retreat=0;}}else navTo(u,o.x,o.y,dt,true);}
  else if(!o&&!u.target&&isFW(u))loiter(u,dt);}
// Automatic engagement - units fight on their own when it makes tactical sense:
// - idle units engage enemies they can see and can actually hurt, and come to the aid of nearby friends under fire
// - they hold position (fire only at what is in range) instead of charging when heavily outnumbered
// - they ignore targets their weapons barely scratch (rifles vs tanks) unless nothing better is near
// - units on a plain move order keep moving, but turn and fight if ambushed while they clearly have the upper hand
//   (the move becomes an attack-move to the same spot, so they carry on afterwards)
const AE_N=[],AV_N=[];function hqCached(team){const C=G.hqC||(G.hqC={});const c=C[team];if(c&&G.t-c.t<1&&!(c.h&&c.h.dead))return c.h;const h=G.ents.find(e=>e.team===team&&e.kind==='hq'&&!e.dead)||null;C[team]={t:G.t,h};return h;}
function effOn(s,e){if(!s.wpn)return 0;const ar=e.isB?'bld':(e.landed?'heavy':e.s.armor);return (VS[s.wpn]||{})[ar]||0;}
function friendsUnderFire(u){for(const o of nearby(u.x,u.y,320,AE_N)){if(o.dead||o.isB||o===u||o.team!==u.team)continue;if(o.lastHit>G.t-2.5&&Math.hypot(o.x-u.x,o.y-u.y)<320)return true;}return false;}
function autoEngage(u,o,T){const s=u.s;if(s.noAttack||u.rout>G.t||u.retreat)return;if(u.amb&&!(T&&T.ai))u.amb=undefined;/* a player took back their side: no AI posts left */if(u.amb&&!o){const e=nearestEnemy(u,rngOf(u)+10);if(e){u.target=e;if(!u.guard)u.guard={x:u.x,y:u.y};}return;}/* lying in ambush: hold still, fire only at what is in range */if(u.stlT&&!(u.lastHit>G.t-1.5)&&!(o&&o.type==='amove'))return;const base=s.aggro*upgK(T,u.kind,'rng'),hit=u.lastHit>G.t-1.5,odds=u.odds||0;
  if(o&&o.type==='move'){if(o.hold||isVeh(s)&&u.hp<u.max*.3)return;
    // ambushed and clearly stronger: return fire at whoever is shooting
    if(hit&&odds<=.9){const e=nearestEnemy(u,rngOf(u));if(e&&effOn(s,e)>=.4)u.target=e;return;}
    // enemies in the unit's path: stop and shoot when it can hurt them and isn't outmatched - but not when it is
    // falling back toward its own base (a retreat), and never chase: once out of range the unit carries on moving
    if(odds>1.5)return;const hq=hqCached(u.team);if(hq&&Math.hypot(o.x-hq.x,o.y-hq.y)<Math.hypot(u.x-hq.x,u.y-hq.y)-200)return;
    const e=nearestEnemy(u,rngOf(u)+10,null,.5);if(!e||e.isB)return;if(massOf(u)>=10&&massOf(e)<2&&Math.hypot(e.x-u.x,e.y-u.y)<160)return;/* tanks just run infantry over */const ah=Math.atan2(o.y-u.y,o.x-u.x),ae=Math.atan2(e.y-u.y,e.x-u.x);
    if(Math.abs(angDiff(ah,ae))<1.05||hit)u.target=e;return;}
  const help=!o&&friendsUnderFire(u),R=base+(o?60:0)+(help?160:0);let e=nearestEnemy(u,R);if(!e)return;
  if(effOn(s,e)<.35&&!(e.isB&&s.wpn!=='gun')){const alt=nearestEnemy(u,R,null,.35);if(alt)e=alt;else if(!hit&&!(o&&o.type==='amove')&&Math.hypot(e.x-u.x,e.y-u.y)-(e.r||0)>rngOf(u)+10)return;}
  // (a weak match is still fought on attack-move, or when it is already within range - patrol boats duel, riflemen
  // shoot at a technical driving past - but idle units do not charge armour they can barely scratch)
  const d=Math.hypot(e.x-u.x,e.y-u.y)-(e.r||0);if(!o&&odds>2.6&&d>rngOf(u)+10)return; // outnumbered: hold and fire, don't charge
  u.target=e;if(!o&&!u.guard)u.guard={x:u.x,y:u.y};}
// Unit intelligence (applies whenever the player hasn't given a direct move order):
// - re-picks the best target every second (switches to a much better one in range)
// - dodges incoming artillery and missile strikes
// - badly damaged units pull back out of the fight toward home
// - infantry under fire look for cover in nearby woods
// - units that outrange their target keep their distance (kiting)
// - vehicles turn their thick front armour toward whoever is shooting at them
// hard AI: pick the enemy in range closest to dying (and that this unit can actually hurt)
const WNB=[];function weakestEnemy(u,R){let best=null,bv=1e9;for(const e of nearby(u.x,u.y,R+40,WNB)){if(e.dead||ally(e.team,u.team)||!seenBy(u.team,e)||!canTarget(u.s,e))continue;const d=Math.hypot(e.x-u.x,e.y-u.y)-(e.r||0);if(d>R)continue;const v=e.hp/(e.max||1)+(e.isB?.5:0)+d/(R*4);if(v<bv){bv=v;best=e;}}return best||nearestEnemy(u,R);}
function unitBrain(u,dt,o){const s=u.s;if(o&&o.type==='move'&&!o.auto)return false;u.bt=(u.bt||0)-dt;
  if(u.bt<=0){u.bt=.9+Math.random()*.3;
    if(s.dom!=='air'){for(const st of G.strikes){if(st.t<.4||st.team===u.team||ally(st.team,u.team))continue;const dd=Math.hypot(u.x-st.x,u.y-st.y);if(dd<st.r+26){const a=Math.atan2(u.y-st.y,u.x-st.x)||Math.random()*6.28,k=st.r+60-dd;setMove(u,u.x+Math.cos(a)*k,u.y+Math.sin(a)*k,'move');u.order.auto=1;return true;}}}
    const RAI=G.teams[u.team].ai,RD=RAI?DIFF[RAI.d??1].retreat:1,RH=RD>1?(isVeh(s)?.4:.3):.25;
    if(u.hp<u.max*RH&&!u.rt&&s.dom!=='air'&&G.t-u.lastHit<3&&u.target&&!(RAI&&!RD)){if(G.teams[u.team].ai&&u.kind!=='harv'&&u.kind!=='dozer'){const tn=G.ents.filter(b=>b.isB&&b.team===u.team&&b.kind==='tunnel'&&!b.dead&&b.built>=1&&dist(b,u)<750).sort((p,q)=>dist(p,u)-dist(q,u))[0];if(tn&&G.teams[u.team].tun.length<TUN_CAP){u.rt=G.t;u.order={type:'enter',target:tn,auto:1};u.target=null;u.path=null;return true;}}const home=G.ents.filter(b=>b.isB&&b.team===u.team&&!b.dead).sort((p,q)=>dist(p,u)-dist(q,u))[0];if(home&&dist(home,u)>260){u.rt=G.t;const a=Math.atan2(home.y-u.y,home.x-u.x),k=RD>1?Math.min(480,dist(home,u)-200):260;setMove(u,u.x+Math.cos(a)*k,u.y+Math.sin(a)*k,'move');u.order.auto=1;if(RAI)aiStat(RAI,'retreat');log(u.team,`${s.name} is badly damaged and pulling back.`);return true;}}
    if(u.rt&&G.t-u.rt>12)u.rt=0;
    const CAI=RAI&&DIFF[RAI.d??1].cover&&o&&o.type==='amove'&&!o.nv;
    if(isInf(s)&&(!o||CAI)&&G.t-u.lastHit<1.5&&!coverAt(u.x,u.y)&&G.cover&&G.t-(u.cvT||-9)>(CAI?9:6)){u.cvT=G.t;let best=null,bd=1e9;const cx=Math.floor(u.x/CELL),cy=Math.floor(u.y/CELL);for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){const X=cx+i,Y=cy+j;if(X<0||Y<0||X>=GW||Y>=GH||!G.cover[Y*GW+X])continue;const x=X*CELL+CELL/2,y=Y*CELL+CELL/2;if(!coverAt(x,y))continue;const d=Math.hypot(x-u.x,y-u.y);if(d<bd&&d<130){bd=d;best=[x,y];}}
      // Hard AI: the near side of a friendly or neutral building (or wall) counts too - a house corner, a bunker, sandbags
      if(CAI)for(const b of nearby(u.x,u.y,230,CV_U)){if(!b.isB||b.dead||(b.team>=0&&!ally(b.team,u.team)))continue;const a=Math.atan2(u.y-b.y,u.x-b.x),r=b.size/2+20,x=b.x+Math.cos(a)*r,y=b.y+Math.sin(a)*r;const d=Math.hypot(x-u.x,y-u.y);if(d<bd&&d<160&&passXY('ground',x,y)&&coverAt(x,y)){bd=d;best=[x,y];}}
      if(best){setMove(u,best[0],best[1],'move');u.order.auto=1;u.guard={x:best[0],y:best[1]};if(CAI)aiStat(RAI,'cover');return true;}}
    if(u.target&&(!o||o.type==='amove')){const AI=G.teams[u.team].ai;const b=AI&&DIFF[AI.d??1].focus?weakestEnemy(u,rngOf(u)+20):nearestEnemy(u,rngOf(u)+20);if(b&&b!==u.target)u.target=b;}}
  const t=u.target;if(!t||t.dead)return false;const d=Math.hypot(t.x-u.x,t.y-u.y)-t.r,R=rngOf(u);
  if(!t.isB&&t.s&&t.s.rng&&s.dom==='ground'&&!s.minr&&R>t.s.rng*1.3&&d<Math.min(R*.6,t.s.rng+30)&&canTarget(t.s,u)){const a=Math.atan2(u.y-t.y,u.x-t.x);stepTo(u,u.x+Math.cos(a)*60,u.y+Math.sin(a)*60,dt);if(u.cd<=0&&Math.abs(angDiff(u.tang,Math.atan2(t.y-u.y,t.x-u.x)))<.35){fire(u,t,s.dmg*dmgOut(u),s.wpn,s.splash||0);u.cd=s.rof*rofMult(u);}return true;}
  if((isVeh(s)||s.dom==='naval')&&d<=R&&G.t-(u.mv||-9)>.4){const want=Math.atan2(t.y-u.y,t.x-u.x),M=MOVE[s.cls]||[2,40];const e=angDiff(u.hd??u.ang,want);if(Math.abs(e)>.35){u.hd=(u.hd??u.ang)+Math.max(-M[0]*.5*dt,Math.min(M[0]*.5*dt,e));u.ang=u.hd;}}
  return false;}
function angDiff(a,b){return((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;}
function updHarv(u,dt){const T=G.teams[u.team];
  if(u.order){if(Math.hypot(u.order.x-u.x,u.order.y-u.y)<10)u.order=null;else{navTo(u,u.order.x,u.order.y,dt);return;}}
  if(u.state==='ret'){let best=u.drop&&!u.drop.dead&&G.t<(u.dropT||0)?u.drop:null,bd=best?dist(best,u):1e9;if(!best){for(const e of G.ents)if(e.isB&&e.team===u.team&&(e.kind==='hq'||e.kind==='depot')&&e.built>=1&&!e.dead){const d=dist(e,u);if(d<bd){bd=d;best=e;}}u.drop=best;u.dropT=G.t+1.5;}
    if(!best)return;if(bd<best.size/2+26){T.credits+=Math.round(u.cargo*(T.ai?T.ai.inc:1)*(G.bs||1));u.cargo=0;u.state='go';}else navTo(u,best.x,best.y,dt);return;}
  if(!u.field||u.field.amt<=0){if(G.t<(u.fldT||0))return;u.fldT=G.t+1.5;const drops=G.ents.filter(e=>e.isB&&e.team===u.team&&(e.kind==='hq'||e.kind==='depot')&&e.built>=1&&!e.dead);let best=null,bd=1e9;const gr=regions('ground'),rg=gr[Math.floor(u.y/CELL)*GW+Math.floor(u.x/CELL)];let bdd=0;for(const f of G.fields)if(f.amt>0){{const fr=gr[Math.floor(f.y/CELL)*GW+Math.floor(f.x/CELL)];if(rg&&fr&&fr!==rg)continue;}/* never a field this truck can't drive to */let dd=1e9;for(const b of drops)dd=Math.min(dd,dist(b,f));const d=dist(f,u)*.6+(drops.length?dd:0)+(los('ground',u.x,u.y,f.x,f.y)?0:900);if(d<bd){bd=d;best=f;bdd=dd;}}u.field=best;if(!best)return;if(T.ai&&bdd>900&&bdd<1e9)T.ai.depF=best;}
  const f=u.field;if(u.state==='go'){if(dist(f,u)<f.r+6){u.state='gather';u.gt=0;}else navTo(u,f.x,f.y,dt);}
  else if(u.state==='gather'){u.gt+=dt;if(u.gt>=3){const take=Math.min(Math.round(160*upgT(T,'harv')*(T.F.mods.harv||1)),f.amt);f.amt-=take;u.cargo=take;u.state='ret';}}}
function updHacker(u,dt){const T=G.teams[u.team],o=u.order;u.hacking=false;
  if(o&&o.type==='hack'){const t=o.target;if(t.dead||!seenBy(u.team,t)){u.order=null;return;}const d=Math.hypot(t.x-u.x,t.y-u.y)-t.r;
    if(d>u.s.rng){navTo(u,t.x,t.y,dt);u.hk=0;return;}u.ang=Math.atan2(t.y-u.y,t.x-u.x);u.hk=(u.hk||0)+dt;u.hacking=true;u.lastFire=G.t;
    if(u.hk>=4){t.dis=G.t+20;u.order=null;u.hk=0;log(u.team,`${t.s.name} disabled for 20 seconds.`,'g');log(t.team,`Warning: your ${t.s.name} has been hacked!`,'w');FXE('hack',[t.x|0,t.y|0]);}return;}
  if(o&&o.type==='move'){if(Math.hypot(o.x-u.x,o.y-u.y)<10||stalled(u,o))u.order=null;else{navTo(u,o.x,o.y,dt);u.still=0;return;}}
  u.still=(u.still||0)+dt;if(u.still>2){u.hacking=true;u.inc=(u.inc||0)+dt;if(u.inc>=1.5){u.inc=0;T.credits+=6;}}}
function updDemo(u,dt){const o=u.order,t=o.target;if(t.dead){u.order=null;u.planting=false;return;}const d=Math.hypot(t.x-u.x,t.y-u.y)-t.size/2;
  // close enough to plant once at the wall (buildings push units out to about their edge + the unit's own radius)
  if(d>u.r+22){navTo(u,t.x,t.y,dt);u.pt=0;u.planting=false;return;}u.planting=true;u.pt=(u.pt||0)+dt;if(u.pt>=2){t.charge={t:6,team:u.team,src:u};u.order=null;u.planting=false;log(u.team,'Charges planted. Detonation in 6 seconds.','g');log(t.team,`Warning: explosives planted on your ${t.s.name}!`,'w');}}
function updJet(u,dt){const s=u.s;if(wxNow().air===0&&u.state==='park'){if(u.order&&!u.wxw){u.wxw=1;log(u.team,'Jets are grounded until the storm passes.','w');}return;}u.wxw=0;const pads=G.ents.filter(b=>b.isB&&b.team===u.team&&b.kind==='airfield'&&b.built>=1&&!b.dead);
  const home=pads.length?pads.reduce((a,b)=>dist(a,u)<dist(b,u)?a:b):null;
  if(u.state!=='park'&&u.landed===false&&u.toT==null)u.toT=G.t;
  if(u.state==='park'){u.toT=null;if(!home){u.state='fly';u.landed=false;}else{const p=padPos(home,u);u.x=p.x;u.y=p.y;if(u.ammo<s.ammo){u.rt=(u.rt||0)+dt;if(u.rt>=4){u.ammo=s.ammo;u.rt=0;}}if(!u.order)return;u.state='fly';u.landed=false;}}
  let o=u.order,goal=null;
  if(o&&o.type==='attack'){if(o.target.dead||!seenBy(u.team,o.target)||!canTarget(s,o.target)){u.order=o=null;u.target=null;}else{u.target=o.target;goal=o.target;}}
  else if(o&&(o.type==='move'||o.type==='amove')){if(o.type==='amove'&&!u.target&&u.ammo>0){const e=nearestEnemy(u,s.aggro);if(e)u.target=e;}
    if(u.target&&(u.target.dead||!seenBy(u.team,u.target)))u.target=null;goal=u.target||o;if(!u.target&&Math.hypot(o.x-u.x,o.y-u.y)<70){o.hold=(o.hold||0)+dt;if(o.hold>8){u.order=null;}}}
  if(u.ammo<=0||!o){u.target=null;if(home){const p=padPos(home,u);goal=p;if(Math.hypot(p.x-u.x,p.y-u.y)<30){u.state='park';u.landed=true;u.order=null;u.ang=u.va=-1.57;return;}}else goal={x:u.x+Math.cos(u.ang+.6)*80,y:u.y+Math.sin(u.ang+.6)*80};}
  const want=Math.atan2(goal.y-u.y,goal.x-u.x),df=angDiff(u.ang,want);u.ang+=Math.max(-2.6*dt,Math.min(2.6*dt,df));u.va=u.ang;u.tang=u.ang;
  const near=!o&&home&&Math.hypot(goal.x-u.x,goal.y-u.y)<160;u.ld=(!o||u.ammo<=0)&&home?Math.max(0,Math.min(1,Math.hypot(goal.x-u.x,goal.y-u.y)/420)):1;const thr=u.toT!=null?Math.min(1,.3+(G.t-u.toT)/2.2):1;const sp=s.spd*upgK(G.teams[u.team],u.kind,'spd')*(near?.5:1)*thr;u.v=sp;u.x+=Math.cos(u.ang)*sp*dt;u.y+=Math.sin(u.ang)*sp*dt;u.x=Math.max(-100,Math.min(MAPW+100,u.x));u.y=Math.max(-100,Math.min(MAPH+100,u.y));
  if(u.target&&u.ammo>0&&u.cd<=0){const d=Math.hypot(u.target.x-u.x,u.target.y-u.y)-u.target.r;if(d<rngOf(u)&&Math.abs(angDiff(u.ang,Math.atan2(u.target.y-u.y,u.target.x-u.x)))<.5){fire(u,u.target,s.dmg*dmgOut(u),'bomb',s.splash);u.ammo--;u.cd=s.rof*rofMult(u);if(u.ammo<=0)u.order=null;}}}
function updBld(b,dt){if(b.kind==='garrison')return updGarrison(b,dt);if(G.teams[b.team].dummy&&!G.teams[b.team].fight&&b.built>=1)return;if(b.built<1){if(b.nd){b.stall=!G.ents.some(u=>u.kind==='dozer'&&u.team===b.team&&!u.dead&&Math.hypot(u.x-b.x,u.y-b.y)<b.size/2+48);if(b.stall)return;}const bk=G.sandbox&&b.team===0?6:1;b.built=Math.min(1,b.built+bk*dt/b.s.time);b.hp=Math.min(b.max,b.hp+bk*b.max*.9*dt/b.s.time);if(b.built>=1)log(b.team,`${b.s.name} complete.`,'g');return;}
  if(b.charge){b.charge.t-=dt;if(b.charge.t<=0){const c=b.charge;b.charge=null;applyDmg(b,3000,'demo',c.team,c.src);FXE('boom',[b.x|0,b.y|0,b.size*.5,1]);}}
  if(b.dis>G.t)return;
  if(b.kind!=='turret'&&b.kind!=='sam'&&b.kind!=='tunnel')return;b.cd-=dt;const t=b.target;
  if(t&&(t.dead||Math.hypot(t.x-b.x,t.y-b.y)-t.r>rngOf(b)||!seenBy(b.team,t)||!canTarget(b.s,t)))b.target=null;
  if(!b.target&&((b.scT=(b.scT||0)-dt)<=0||b.lastHit>G.t-dt*1.5)){b.scT=.2+(b.id%7)*.02;b.target=nearestEnemy(b,rngOf(b));}
  if(b.target){b.ang=Math.atan2(b.target.y-b.y,b.target.x-b.x);if(b.cd<=0){fire(b,b.target,b.s.dmg,b.s.wpn,0);b.cd=b.s.rof;}}}
function updProj(dt){for(const p of G.proj){if(p.wpn!=='shell'&&p.wpn!=='bomb'&&!p.tgt.dead){p.tx=p.tgt.x;p.ty=p.tgt.y;}
  const a=Math.atan2(p.ty-p.y,p.tx-p.x),st=p.spd*dt,rem=Math.hypot(p.tx-p.x,p.ty-p.y);p.p+=st;
  if(rem<=st){p.done=true;const src=p.src&&!p.src.dead?p.src:null;if(p.splash)explode(p.tx,p.ty,p.splash,p.dmg,p.team,p.wpn,null,src);else if(!p.tgt.dead){applyDmg(p.tgt,p.dmg,p.wpn,p.team,src);FXE('boom',[p.tx|0,p.ty|0,p.wpn==='at'||p.wpn==='missile'?9:7,0]);}}
  else{p.x+=Math.cos(a)*st;p.y+=Math.sin(a)*st;}}G.proj=G.proj.filter(p=>!p.done);}
function launch(team,x,y){const T=G.teams[team],S=T.sup;if(T.charge<S.charge||!working(team,'uplink'))return false;
  // missile nations: every missile visibly launches from the strike building and arcs through the sky onto its target
  // (same timing, damage and warning as before - only the visuals changed)
  const up=G.ents.find(e=>e.team===team&&e.kind==='uplink'&&!e.dead&&e.built>=1),sty=(UPLINK[T.fac]||[])[1],arc=up&&sty&&sty!=='air';
  for(let i=0;i<S.n;i++){const a=rnd(0,6.28),r=S.n>1?rnd(0,S.spread):0,tx=x+Math.cos(a)*r,ty=y+Math.sin(a)*r,t=3+i*.28;G.strikes.push({x:tx,y:ty,t,r:S.r,dmg:S.dmg,team,kind:'sup'});FXE('strike',[tx|0,ty|0,+t.toFixed(2),S.r|0,1,arc?1:0]);
    if(arc)FXE('bmis',[(up.x+rnd(-14,14))|0,(up.y+rnd(-14,14))|0,tx|0,ty|0,+t.toFixed(2),i]);}
  T.charge=0;log(team,`${S.name} launched.`,'g');for(const O of G.teams)if(O.id!==team)log(O.id,`Warning: enemy ${S.name} inbound. Move your units!`,'w');return true;}
function addStrike(x,y,t,r,dmg,team,kind){G.strikes.push({x,y,t,r,dmg,team,kind});FXE('strike',[x|0,y|0,+t.toFixed(2),r|0,kind==='sup'?1:0],team);}
function updStrikes(dt){for(const s of G.strikes){s.t-=dt;if(s.t<=0){s.done=true;explode(s.x,s.y,s.r,s.dmg,s.team,s.kind==='sup'?'super':'shell',s.kind);}}G.strikes=G.strikes.filter(s=>!s.done);}

/* ---------- general's powers ---------- */
function hqOf(team){return G.ents.find(e=>e.team===team&&e.kind==='hq'&&!e.dead)||G.ents.find(e=>e.team===team&&e.isB&&!e.dead);}
function natPower(team,P,x,y){const T=G.teams[team],hq=hqOf(team),en=e=>!e.dead&&!ally(e.team,team)&&e.team>=0;
  switch(P.type){
    case 'strafe':{const a=Math.atan2(y-(hq?hq.y:y),x-(hq?hq.x:x)),c=Math.cos(a),s=Math.sin(a);for(let i=0;i<9;i++){const d=-160+i*40;addStrike(x+c*d,y+s*d,1.2+i*.12,i%3===1?70:45,(i%3===1?380:200)*P.M,team,'bar');}FXE('plane',[(x-c*1200)|0,(y-s*1200)|0,x|0,y|0,team]);return true;}
    case 'drones':{if(!hq)return false;for(let i=0;i<P.n+2*(P.lv-1);i++){const u=addUnit(team,'drone',hq.x+rnd(-40,40),hq.y+rnd(-40,40));setMove(u,x+rnd(-60,60),y+rnd(-60,60),'amove');}return true;}
    case 'intel':{for(const O of G.teams)if(!ally(O.id,team))for(const b of G.ents)if(b.isB&&b.team===O.id&&!b.dead)T.reveals.push({x:b.x,y:b.y,r:90,t:20+5*P.lv});for(const e of G.ents)if(en(e)&&!e.isB&&Math.hypot(e.x-x,e.y-y)<P.r)e.mark=G.t+25;FXE('ping',[x|0,y|0,P.r],team);return true;}
    case 'supply':{T.credits+=Math.round(1200*P.M);for(const e of G.ents)if(e.team===team&&Math.hypot(e.x-x,e.y-y)<P.r)e.hp=Math.min(e.max,e.hp+e.max*.4);FXE('heal',[x|0,y|0,P.r],team);return true;}
    case 'partisans':{const p=nearestPassXY('ground',x,y);if(!p)return false;for(let i=0;i<P.n+3*(P.lv-1);i++){const q=nearestPassXY('ground',p[0]+rnd(-50,50),p[1]+rnd(-50,50))||p;const u=addUnit(team,i%3===2?'at':'inf',q[0],q[1]);u.guard={x:q[0],y:q[1]};}return true;}
    case 'thermo':{addStrike(x,y,3,P.r,900*P.M,team,'sup');return true;}
    case 'cash':{T.credits+=Math.round(2000*P.M);return true;}
    case 'mercs':{if(!hq)return false;for(const k of ['tank','tank','aa','aa','tank','arty','tank','aa'].slice(0,4+2*(P.lv-1))){const q=nearestPassXY('ground',hq.x+rnd(-140,140),hq.y+rnd(-140,140))||[hq.x,hq.y];addUnit(team,k,q[0],q[1]);}return true;}
    case 'emp':{addStrike(x,y,2.2,90,420,team,'sup');G.timers.push({t:2.3,fn:()=>{for(const e of G.ents){if(!en(e)||Math.hypot(e.x-x,e.y-y)>P.r)continue;if(e.isB)e.dis=Math.max(e.dis||0,G.t+10*P.M);else if(isVeh(e.s)||e.s.dom!=='ground')e.stun=G.t+10*P.M;}FXE('heal',[x|0,y|0,P.r],team);}});return true;}
    case 'shield':{(G.shields=G.shields||[]).push({team,x,y,r:P.r,t:G.t+20*P.M});FXE('heal',[x|0,y|0,P.r],team);return true;}
    case 'cyber':{for(const e of G.ents)if(en(e)&&e.isB&&Math.hypot(e.x-x,e.y-y)<P.r)e.dis=Math.max(e.dis||0,G.t+18*P.M);T.reveals.push({x,y,r:P.r,t:18*P.M});FXE('ping',[x|0,y|0,P.r],team);return true;}
    case 'wave':{if(!hq)return false;for(let i=0;i<Math.round(P.n*P.M);i++){const q=nearestPassXY('ground',hq.x+rnd(-120,120),hq.y+rnd(-120,120))||[hq.x,hq.y];const u=addUnit(team,'inf',q[0],q[1]);setMove(u,x+rnd(-80,80),y+rnd(-80,80),'amove');}return true;}
    case 'precise':{for(let i=0;i<Math.round(8*P.M);i++){const a=rnd(0,6.28),r=rnd(0,P.r);addStrike(x+Math.cos(a)*r,y+Math.sin(a)*r,1.4+i*.25,55,260,team,'bar');}return true;}
    case 'smoke':{(G.smokes=G.smokes||[]).push({team,x,y,r:P.r,t:G.t+20*P.M});FXE('smoke',[x|0,y|0,P.r],team);return true;}
    case 'fervor':{T.fervor=G.t+25*P.M;T.fervK=1.1+.05*P.lv;return true;}
    case 'labbayk':{T.fervor=G.t+25*P.M;T.fervK=1.15+.05*P.lv;T.fervInf=1;for(const e of G.ents)if(e.team===team&&!e.isB&&isInf(e.s))e.hp=Math.min(e.max,e.hp+e.max*.5);return true;}
    case 'raid':{T.raidT=G.t+25*P.M;T.reveals.push({x,y,r:P.r,t:25*P.M});FXE('ping',[x|0,y|0,P.r],team);return true;}}
  return false;}
function powCost(T,key){const w=T.pw[key];return !w?1:(w.lv||1)>=3?99:(w.lv||1)+1;}
function buyPower(team,key){const T=G.teams[team];if(!POWERS[key])return false;const c=powCost(T,key);if(T.rank-T.spent<c)return false;T.spent+=c;if(!T.pw[key]){T.pw[key]={cd:Math.max(0,POW_OPEN-G.t),lv:1};log(team,`${powInfo(key,T.fac).name} unlocked.`,'g');}else{T.pw[key].lv=(T.pw[key].lv||1)+1;log(team,`${powInfo(key,T.fac).name} upgraded to level ${T.pw[key].lv}.`,'g');}return true;}
// unique per-nation effects layered on the shared general powers (GPOW .fx)
function gpowFx(team,P,x,y,dur){const fx=P.fx,inR=e=>Math.hypot(e.x-x,e.y-y)<P.r;
  if(fx==='mark'){for(const e of G.ents)if(!e.dead&&!e.isB&&!ally(e.team,team)&&inR(e))e.mark=G.t+dur;}
  else if(fx==='detect'){for(const e of G.ents)if(!e.dead&&!ally(e.team,team)&&inR(e))e.detT=G.t+dur;}
  else if(fx==='fire'){let n=0;const tick=()=>{for(const e of G.ents)if(!e.dead&&!ally(e.team,team)&&!(e.s&&e.s.dom==='air')&&inR(e))applyDmg(e,(e.isB?14:22)*P.M,'boom',team,null,1);for(let q=0;q<3;q++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*P.r*.85;FXE('boom',[(x+Math.cos(a)*r)|0,(y+Math.sin(a)*r)|0,5,0],team);}if(n%3===0)FXE('smoke',[x|0,y|0,(P.r*.7)|0],team);if(++n<8)G.timers.push({t:1,fn:tick});};G.timers.push({t:4,fn:tick});}
  else if(fx==='emp'){G.timers.push({t:3.5,fn:()=>{for(const e of G.ents)if(!e.dead&&!e.isB&&e.s&&isVeh(e.s)&&!ally(e.team,team)&&inR(e))e.stun=Math.max(e.stun||0,G.t+4*P.M);}});}
  else if(fx==='smoke'){(G.smokes=G.smokes||[]).push({team,x,y,r:P.r,t:G.t+14*P.M});G.timers.push({t:3,fn:()=>FXE('smoke',[x|0,y|0,P.r|0],team)});}
  else if(fx==='rearm'){for(const e of G.ents)if(!e.dead&&!e.isB&&e.team===team&&inR(e))e.rofT=G.t+12*P.M;}
  else if(fx==='rally'){for(const e of G.ents)if(!e.dead&&!e.isB&&e.team===team&&inR(e)){e.fear=0;e.rout=0;e.last=G.t+15*P.M;e.supp=0;}}
  else if(fx==='shield'){(G.shields=G.shields||[]).push({team,x,y,r:P.r,t:G.t+12*P.M,k:.75});}}
function usePower(team,key,x,y){const T=G.teams[team],P0=powInfo(key,T.fac),w=T.pw[key];if(!P0||P0.passive||!w||w.cd>0)return false;const L=Math.max(1,Math.min(3,w.lv||1)),M=PLV[L-1],P=Object.assign({},P0,{lv:L,M,cd:Math.round(P0.cd*PCD[L-1]),r:P0.r?Math.round(P0.r*(1+.2*(L-1))):P0.r});
  if(key==='nat'){if(!natPower(team,P,x,y))return false;w.cd=P.cd;log(team,`${P.name}!`,'g');for(const O of G.teams)if(O.id!==team&&!ally(O.id,team))log(O.id,`Enemy ${T.F.name} used ${P.name}.`,'w');return true;}
  const dur=(25+10*(L-1))*(P.tm||1);if(P.fx)gpowFx(team,P,x,y,dur);
  if(key==='recon'){T.reveals.push({x,y,r:P.r,t:dur});FXE('ping',[x|0,y|0,P.r],team);}
  else if(key==='barrage'){const nS=Math.max(3,Math.round(10*M*(P.nm||1)));for(let i=0;i<nS;i++){const a=rnd(0,6.28),r=rnd(0,P.r);addStrike(x+Math.cos(a)*r,y+Math.sin(a)*r,1.5+i*.3*Math.min(1,10/nS*1.2),60,Math.round(230*(P.dm||1)),team,'bar');}for(const O of G.teams)if(O.id!==team&&G.ents.some(e=>e.team===O.id&&!e.dead&&Math.hypot(e.x-x,e.y-y)<P.r+300))log(O.id,'Warning: incoming artillery barrage!','w');}
  else if(key==='repair'){for(const e of G.ents)if(e.team===team&&Math.hypot(e.x-x,e.y-y)<P.r)e.hp=Math.min(e.max,e.hp+e.max*(.4+.2*L)*(P.pm||1));FXE('heal',[x|0,y|0,P.r],team);}
  else if(key==='para'){const p=nearestPassXY('ground',x,y);if(!p)return false;const bb=BASES[team]||BASES[0],sx=bb[0]<MAPW/2?-100:MAPW+100,sy=bb[1]<MAPH/2?-100:MAPH+100;FXE('plane',[sx,sy,p[0]|0,p[1]|0,team]);
    G.timers.push({t:2.6,fn:()=>{const R=roster(T.fac).barracks;(()=>{const mx=P.mix||['inf','inf','inf','at','at','inf','at','inf','inf','at','inf'],nP=Math.max(2,Math.round((2+3*L)*(P.nm||1)));return Array.from({length:nP},(_,i)=>mx[i%mx.length]);})().forEach((k,i)=>{const q=nearestPassXY('ground',p[0]+rnd(-40,40),p[1]+rnd(-40,40))||p;const n=addUnit(team,k,q[0],q[1]);if(n&&P.fx==='vet'){n.rank=Math.max(n.rank||0,1);n.xp=Math.max(300,n.s.cost);}if(n&&P.fx==='dig')n.digT=1;if(n&&P.fx==='stealth')n.stlT=1;});log(team,'Paratroopers have landed.','g');}});}
  w.cd=P.cd;log(team,`${P.name} used.`);return true;}

/* ---------- player actions (local input, AI and network commands all go through here) ---------- */
function act(team,a){if(!G||G.over)return;const own=ids=>(ids||[]).map(i=>G.byId.get(i)).filter(u=>u&&!u.isB&&u.team===team);if(a.ids&&a.t!=='def'&&['go','atk','stop','gar','tun','board','atkCiv','fld','line','ret'].includes(a.t))for(const u of own(a.ids)){u.defend=null;if(!a.q)u.wq=null;if(a.t!=='ret')u.retreat=0;if(a.t!=='line')u.faceA=null;}
  switch(a.t){
    case 'go':{const us=own(a.ids).filter(u=>!((u.kind==='harv'||u.kind==='dozer')&&a.mode==='amove'));const md=a.mode==='amove'?'amove':'move';
      if(a.q){const busy=us.filter(u=>u.order&&(u.order.type==='move'||u.order.type==='amove'));for(const u of busy){(u.wq=u.wq||[]).push({x:a.x,y:a.y,m:md});if(u.wq.length>8)u.wq.shift();}const idle=us.filter(u=>!busy.includes(u));if(idle.length)formMove(idle,a.x,a.y,md,!!a.fm);break;}
      for(const u of us)u.wq=null;formMove(us,a.x,a.y,md,!!a.fm);sharePath(us,a.x,a.y);break;}
    case 'atk':{const t=G.byId.get(a.tid);if(!t||ally(t.team,team))break;for(const u of own(a.ids)){
      if(u.kind==='hacker'){if(t.isB){u.order={type:'hack',target:t};u.hk=0;}continue;}
      if(u.s.demo&&t.isB){u.order={type:'demo',target:t};u.pt=0;continue;}
      if(u.kind==='harv'||u.kind==='dozer'||!canTarget(u.s,t))continue;u.order={type:'attack',target:t};u.guard=null;u.path=null;if(u.kind==='jet'){u.state='fly';u.landed=false;}}break;}
    case 'atkOil':{const o=G.oil[a.fi];if(!o||o.dead||ally(o.owner,team))break;for(const u of own(a.ids)){if(u.kind==='harv'||u.kind==='dozer'||u.kind==='hacker'||!canTarget(u.s,o.tg))continue;u.order={type:'attack',target:o.tg};u.guard=null;u.path=null;if(u.kind==='jet'){u.state='fly';u.landed=false;}}break;}
    case 'fld':{const f=G.fields[a.fi];if(f)for(const u of own(a.ids))if(u.kind==='harv'){u.field=f;u.state='go';u.order=null;}break;}
    case 'q':enqueue(team,a.k);break;
    case 'dq':dequeue(team,a.k);break;
    case 'bld':placeBld(team,a.k,a.x,a.y,a.dz);break;
    case 'bldGo':{const b=G.byId.get(a.tid);if(!b||!b.isB||b.team!==team||b.built>=1)break;for(const u of own(a.ids))if(u.kind==='dozer'){u.order={type:'build',target:b};u.path=null;}break;}
    case 'up':startResearch(team,a.k);break;
    case 'sup':launch(team,a.x,a.y);break;
    case 'buy':buyPower(team,a.k);break;
    case 'pow':usePower(team,a.k,a.x,a.y);break;
    case 'rally':G.teams[team].rally={x:a.x,y:a.y};break;
    case 'give':{giveMoney(team,a.to|0,a.amt);break;}
    case 'tun':{const b=G.byId.get(a.tid);if(!b||!b.isB||b.team!==team||b.kind!=='tunnel'||b.built<1)break;for(const u of own(a.ids))if(u.s.dom==='ground'&&u.kind!=='harv'&&u.kind!=='hacker'){u.order={type:'enter',target:b};u.target=null;u.path=null;}break;}
    case 'gar':{const c=G.civ&&G.civ[a.ci|0];if(!c||c.dead||(c.g&&!ally(c.g.team,team)))break;for(const u of own(a.ids))if(canGarrison(u)){u.order={type:'garrison',ci:c.i,x:c.x,y:c.y};u.target=null;u.guard=null;u.path=null;}break;}
    case 'atkCiv':{const c=G.civ&&G.civ[a.ci|0];if(!c||c.dead||c.g)break;const t=civTarget(c);for(const u of own(a.ids)){if(u.kind==='harv'||u.kind==='dozer'||u.kind==='hacker'||!canTarget(u.s,t))continue;u.order={type:'attack',target:t};u.guard=null;u.path=null;}break;}
    case 'ungar':{const b=G.byId.get(a.tid);if(b&&b.kind==='garrison'&&b.team===team&&b.civ)leaveGarrison(b.civ);break;}
    case 'unl':{const b=G.byId.get(a.tid);if(b&&b.isB&&b.team===team&&b.kind==='tunnel'&&b.built>=1)unloadTunnel(b);else if(b&&!b.isB&&b.team===team&&b.s.cap)unloadTransport(b);break;}
    case 'board':{const tr=G.byId.get(a.tid);if(!tr||tr.isB||tr.team!==team||!tr.s.cap)break;for(const u of own(a.ids))if(canBoard(tr,u)){u.order={type:'board',target:tr};u.target=null;u.path=null;}break;}
    case 'stop':for(const u of own(a.ids)){u.order=null;u.target=null;u.path=null;}break;
    // right-drag line formation: units spread evenly along the dragged line (extra units form ranks behind it),
    // assigned in order along the line so their paths do not cross
    case 'line':{const us=own(a.ids).filter(u=>!u.isB&&u.s&&u.s.spd>0&&u.kind!=='harv');const n=us.length;if(!n)break;const x2=a.x2,y2=a.y2,dx=x2-a.x,dy=y2-a.y,L=Math.max(1,Math.hypot(dx,dy)),ux=dx/L,uy=dy/L;
      const sp=Math.max(18,...us.map(u=>u.r*2.6)),per=Math.max(1,Math.floor(L/sp)+1);let cx=0,cy=0;for(const u of us){cx+=u.x;cy+=u.y;}cx/=n;cy/=n;
      let nx=-uy,ny=ux;if(((a.x+x2)/2-cx)*nx+((a.y+y2)/2-cy)*ny<0){nx=-nx;ny=-ny;}
      us.sort((p,q)=>((p.x-a.x)*ux+(p.y-a.y)*uy)-((q.x-a.x)*ux+(q.y-a.y)*uy)||p.id-q.id);
      for(let i=0;i<n;i++){const r=Math.floor(i/per),k=i%per,cnt=Math.min(per,n-r*per),len=Math.min(L,sp*(cnt-1)),off=(L-len)/2,t=cnt>1?k/(cnt-1):.5;
        let x=a.x+ux*(off+t*len)-nx*r*sp,y=a.y+uy*(off+t*len)-ny*r*sp;const u=us[i];if(u.s.dom==='ground'){const p=nearestPassXY('ground',x,y);if(p){x=p[0];y=p[1];}}
        setMove(u,x,y,a.mode==='amove'?'amove':'move');u.faceA=Math.atan2(ny,nx);}break;}
    // retreat (Company of Heroes style): selected units run back to the nearest HQ, barracks or factory, a little
    // faster and harder to hit, and do not stop to fight on the way
    case 'ret':for(const u of own(a.ids)){if(u.isB||!u.s||!(u.s.spd>0))continue;let best=null,bd=1e18;for(const e of G.ents){if(e.dead||!e.isB||e.team!==u.team||!(e.kind==='hq'||e.kind==='barracks'||e.kind==='factory'))continue;const d=(e.x-u.x)**2+(e.y-u.y)**2;if(d<bd){bd=d;best=e;}}
      if(!best)continue;let x=best.x+((u.id*37)%120-60),y=best.y+((u.id*53)%120-60);if(u.s.dom==='ground'){const p=nearestPassXY('ground',x,y);if(p){x=p[0];y=p[1];}}u.target=null;u.wq=null;setMove(u,x,y,'move');u.retreat=1;}break;
    // defend an area: go there, then hold it - engage anything that comes within range of the spot and return afterwards
    case 'def':{const us=own(a.ids).filter(u=>!u.s.noAttack&&u.kind!=='harv'&&u.kind!=='dozer');formMove(us,a.x,a.y,'amove',false);for(const u of us){u.defend={x:u.order?u.order.x:a.x,y:u.order?u.order.y:a.y,r:Math.max(260,(u.s.aggro||240)+80)};}break;}
  }}

/* ---------- vision ---------- */
const VISMAX=720;
// Fog of war, once every 0.2 s. Each team's allies are a bitmask, so every nearby spotter is checked once for all the
// teams it reveals to (instead of once per team): the cost no longer grows with the number of players.
function updateVis(){buildHash();const N=G.teams.length;for(const e of G.ents)if(!e.dead)e._vr=visR(e);
  const AM=new Array(N);for(let a=0;a<N;a++){let m=0;for(let b=0;b<N;b++)if(ally(a,b))m|=1<<b;AM[a]=m;}const ALL=(1<<N)-1;
  for(const e of G.ents){if(e.dead)continue;if(!e.vs||e.vs.length!==N)e.vs=new Array(N).fill(false);
    let seen=AM[e.team]|(1<<e.team);
    if(seen!==ALL){const hid=hiddenNow(e);const near=nearby(e.x,e.y,VISMAX+e.r,NB2);
      for(const m of near){const need=AM[m.team]&~seen;if(!need)continue;const dx=m.x-e.x,dy=m.y-e.y,d2=dx*dx+dy*dy;
        if(!hid){const R=m._vr+e.r;if(d2<R*R)seen|=need;}else{for(let o=0;o<N;o++)if(need&(1<<o)){const R=detR(o,m)+e.r;if(d2<R*R)seen|=1<<o;}}
        if(seen===ALL)break;}
      if(seen!==ALL)for(let o=0;o<N;o++){if(seen&(1<<o))continue;for(const r of G.teams[o].reveals){const dx=r.x-e.x,dy=r.y-e.y;if(dx*dx+dy*dy<r.r*r.r){seen|=1<<o;break;}}
        if(!(seen&(1<<o))&&e.cbrT>G.t&&(G.cbrTeams&(1<<o)))seen|=1<<o;}}
    for(let o=0;o<N;o++){const v=!!(seen&(1<<o));e.vs[o]=v;if(v&&e.isB&&o!==e.team)e.sn=(e.sn|0)|(1<<o);}}
  if(G.sandbox)for(const e of G.ents)if(e.vs)e.vs[0]=true;
  for(const e of G.ents){e.vis=e.vs[ME]||(e.isB&&!!((e.sn|0)&(1<<ME)));e.hid=hiddenNow(e);}}

/* ---------- AI ---------- */
const AIORDER=['barracks','factory','turret','tunnel','airfield','sam','uplink','shipyard','tunnel','turret','factory','barracks','sam','turret','turret'];
function aiFindSpot(id,kind,anchor){const s=bstats(G.teams[id].fac,kind);
  if(STRUCT[kind].shore){for(let k=0;k<160;k++){const x=anchor.x+rnd(-1200,1200),y=anchor.y+rnd(-1200,1200);if(validSpot(id,kind,x,y))return[x,y];}return null;}
  // Keep the supply lanes open: the AI used to drop barracks/factories/turrets between its HQ and its supply field with
  // only a 14 px gap between them, walling the trucks off (they ground against the wall and income stopped). For the
  // first 80 tries a spot must stay clear of every HQ/depot-to-field lane and leave a truck-wide gap to its other
  // buildings; after that any valid spot will do.
  const h=s.size/2,lanes=[],own=[];for(const e of G.ents){if(e.dead||!e.isB||e.team!==id)continue;own.push(e);if(e.kind==='hq'||e.kind==='depot')for(const f of G.fields)if(f.amt>0&&dist(e,f)<750)lanes.push([e.x,e.y,f.x,f.y]);}
  const roomy=(x,y)=>{for(const L of lanes)if(segDist(x,y,L[0],L[1],L[2],L[3])[0]<h+40)return false;for(const e of own){const g=(e.size+s.size)/2+44;if(Math.abs(e.x-x)<g&&Math.abs(e.y-y)<g)return false;}return true;};
  for(let k=0;k<110;k++){const a=rnd(0,6.28),r=rnd(130,k<50?430:720),x=anchor.x+Math.cos(a)*r,y=anchor.y+Math.sin(a)*r;if((k>=80||roomy(x,y))&&validSpot(id,kind,x,y))return[x,y];}return null;}
function aiExpand(T,mine,hq){const id=T.id,dz=mine.filter(e=>e.kind==='dozer'),hqs=mine.filter(e=>e.kind==='hq');
  if(hq&&dz.length<(G.t>150?2:1)&&T.credits>(dz.length?1400:800)&&!T.q.hq.some(i=>i.kind==='dozer')&&T.ai.t%4===0)enqueue(id,'dozer');
  T.ai.saveHq=false;if(mine.some(e=>e.isB&&e.nd&&e.built<1))return;const want=1+(G.t>230?1:0)+(G.t>700?1:0);
  if(!dz.length||hqs.length>=want)return;T.ai.saveHq=true;if(T.credits<bstats(T.fac,'hq').cost+150||T.ai.t%3)return;
  const dzr=dz.find(u=>!u.order)||dz[0];const blds=G.ents.filter(e=>e.isB&&!e.dead);
  const opts=G.fields.filter(f=>f.amt>2500&&blds.every(b=>Math.hypot(b.x-f.x,b.y-f.y)>650)).sort((p,q)=>dist(p,dzr)-dist(q,dzr));
  for(const f of opts.slice(0,4)){for(let k=0;k<30;k++){const a=rnd(0,6.28),r=rnd(150,260),x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;if(validSpot(id,'hq',x,y)===2){placeBld(id,'hq',x,y,dzr.id);T.ai.exp=(T.ai.exp||0)+1;return;}}}}
// Densest knot of enemy troops (buildings ignored): at least 4 units within 170 of one of them, or null. ok(a), when
// given, must accept the spot (see aiShellOk).
function aiTroops(team,ok){const P=G.ents.filter(e=>e.team===team&&!e.dead&&!e.isB&&e.s.dom==='ground');let best=null,bs=3;for(const a of P){let s=0;for(const b of P)if(Math.hypot(a.x-b.x,a.y-b.y)<170)s++;if(s>bs&&(!ok||ok(a))){bs=s;best=a;}}return best;}
// Is spot p safe for team id's Artillery Barrage? No: our own or allied ground troops are inside the area the shells
// can land in (the barrage radius at its current level, plus each shell's 60 burst, plus a 40 margin), e.g. when our
// infantry are mixed in with the enemy's. The AI then picks another target or holds fire.
function aiShellOk(id){const T=G.teams[id],P=powInfo('barrage',T.fac),w=T.pw.barrage,L=Math.max(1,Math.min(3,(w&&w.lv)||1)),R=((P&&P.r)||180)*(1+.2*(L-1))+100;
  return p=>!G.ents.some(e=>!e.dead&&!e.isB&&e.s.dom==='ground'&&ally(e.team,id)&&Math.abs(e.x-p.x)<R&&Math.abs(e.y-p.y)<R&&Math.hypot(e.x-p.x,e.y-p.y)<R);}
// Covert-operations doctrine (IL, AE): camouflaged infantry and AT teams go out in small groups to lie in wait, turn
// invisible once still, and open fire only on enemies inside their own range (the first shot from hiding hits 50%
// harder). When an enemy column is on its way in, a group is sent to a spot some 30% of the way out toward it, to be
// there first; otherwise (after the opening, and only with troops to spare beyond the next attack wave) pickets wait
// 300-460 out on the side facing the enemy base. Up to ~35% of the army (max 6, more in big battles) is out at once; a
// group that has seen no action for 2 minutes rejoins the army. Base defence and the attack waves leave them be.
// u.amb = game time the unit was posted.
function aiAmbush(T,army,anchor,pb){if(T.ai.t%2||!pb.length)return;const id=T.id;let n=0;
  for(const u of army)if(u.amb){if(G.t-u.amb>120&&G.t-(u.lastFire||-99)>40&&G.t-(u.lastHit||-99)>30)u.amb=undefined;else n++;}
  const cap=Math.min(Math.round(6*(G.bs||1)),Math.floor(army.length*.35));if(n+2>cap)return;
  const cand=army.filter(u=>!u.amb&&!u.order&&!u.target&&u.s.camo&&Math.hypot(u.x-anchor.x,u.y-anchor.y)<900);if(cand.length<2)return;
  let inc=null,bd=1800;for(const e of G.ents){if(e.dead||e.isB||ally(e.team,id)||e.s.dom!=='ground'||e.s.noAttack||!e.order)continue;const d=Math.hypot(e.x-anchor.x,e.y-anchor.y);if(d<=650||d>=bd)continue;
    const g=e.order.target||e.order;if(g.x==null||Math.hypot(g.x-anchor.x,g.y-anchor.y)>d-250)continue;bd=d;inc=e;}
  let x,y,sp;if(inc&&G.t-(T.ai.ambT||-99)>20){T.ai.ambT=G.t;const f=.3,ang=Math.atan2(inc.y-anchor.y,inc.x-anchor.x),side=rnd(-70,70);x=anchor.x+Math.cos(ang)*bd*f-Math.sin(ang)*side;y=anchor.y+Math.sin(ang)*bd*f+Math.cos(ang)*side;sp=ang;}
  else if(n+2<=Math.min(4,Math.floor((army.length-T.ai.wave)/2))&&G.t>DIFF[T.ai.d??1].first*.6){const t=pb.find(e=>e.kind==='hq')||pb[0],ang=Math.atan2(t.y-anchor.y,t.x-anchor.x)+rnd(-.6,.6),D=Math.min(rnd(300,460),Math.hypot(t.x-anchor.x,t.y-anchor.y)*.4);x=anchor.x+Math.cos(ang)*D;y=anchor.y+Math.sin(ang)*D;sp=ang+1.57;}
  else return;const p=nearestPassXY('ground',x,y);if(!p)return;
  cand.slice(0,Math.min(4,cap-n)).forEach((u,i)=>{const o=(i-1.5)*30;setMove(u,p[0]-Math.sin(sp)*o,p[1]+Math.cos(sp)*o,'move');u.amb=G.t;u.guard=undefined;});}
function aiCluster(team,ok){const P=G.ents.filter(e=>e.team===team&&!e.dead);let best=null,bs=-1;for(const a of P){let s=0;for(const b of P)if(Math.hypot(a.x-b.x,a.y-b.y)<170)s+=b.isB?3:1;if(s>bs&&(!ok||ok(a))){bs=s;best=a;}}return best;}
function aiFoe(T,anchor){const alive=G.teams.filter(O=>!ally(O.id,T.id)&&G.ents.some(e=>e.team===O.id&&e.isB&&!e.dead));if(!alive.length)return T.id===0?1:0;if(T.ai.foe!=null&&alive.some(O=>O.id===T.ai.foe)&&T.ai.t%20)return T.ai.foe;let best=alive[0].id,bd=1e9;for(const O of alive){const b=G.ents.find(e=>e.team===O.id&&e.isB&&!e.dead);const d=b?Math.hypot(b.x-anchor.x,b.y-anchor.y):1e9;if(d<bd){bd=d;best=O.id;}}return T.ai.foe=best;}
// ---- AI navy ----
// On maps with real water the AI builds a Shipyard on its own coast (earlier and bigger on Hard, a single patrol boat
// on Easy), keeps a fleet sized to its land army, and uses it: hunt enemy vessels on the same water, guard its own
// shoreline, and once the flotilla is big enough sail out to shell coastal enemy buildings. Water bodies come from the
// pathfinder's naval regions, so a fleet is never sent to water it cannot sail to.
const NV_MINW=110,NV_SEA=600;
function navSizes(){const a=regions('naval');if(G._nvs&&G._nvs.a===a)return G._nvs;const n=[];for(let i=0;i<a.length;i++)if(a[i])n[a[i]]=(n[a[i]]||0)+1;return G._nvs={a,n};}
function bodyAt(x,y){const a=regions('naval'),cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);for(let r=0;r<=2;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const X=cx+dx,Y=cy+dy;if(X<0||Y<0||X>=GW||Y>=GH)continue;const l=a[Y*GW+X];if(l)return l;}return 0;}
// nearest open-water point of body b within R of (x,y), or null
function coastSpot(b,x,y,R){const a=regions('naval'),rc=Math.ceil(R/CELL),cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);let best=null,bd=R*R;
  for(let Y=Math.max(0,cy-rc);Y<=Math.min(GH-1,cy+rc);Y++)for(let X=Math.max(0,cx-rc);X<=Math.min(GW-1,cx+rc);X++){const i=Y*GW+X;if(a[i]!==b||G.grid[i]!==1)continue;const px=X*CELL+CELL/2,py=Y*CELL+CELL/2,d=(px-x)**2+(py-y)**2;if(d<bd){bd=d;best=[px,py];}}return best;}
function aiNavyPlan(T,anchor){const C=G._nvp||(G._nvp={});let P=C[T.id];if(P&&T.ai.t-P.t<30&&P.ax===anchor.x&&P.ay===anchor.y)return P;
  const S=navSizes(),gr=regions('ground'),R=2100*WK,rc=Math.ceil(R/CELL),cx0=Math.floor(anchor.x/CELL),cy0=Math.floor(anchor.y/CELL),gh=nearestPassXY('ground',anchor.x,anchor.y),home=gh?gr[Math.floor(gh[1]/CELL)*GW+Math.floor(gh[0]/CELL)]:0,spots=[];
  for(let cy=Math.max(2,cy0-rc);cy<=Math.min(GH-3,cy0+rc);cy++)for(let cx=Math.max(2,cx0-rc);cx<=Math.min(GW-3,cx0+rc);cx++){const i=cy*GW+cx;if(G.grid[i]!==0||(home&&gr[i]!==home))continue;
    const px=cx*CELL+CELL/2,py=cy*CELL+CELL/2,d=Math.hypot(px-anchor.x,py-anchor.y);if(d>R)continue;let b=0;
    for(let dy=-2;dy<=2&&!b;dy++)for(let dx=-2;dx<=2;dx++){const k=(cy+dy)*GW+cx+dx;if(G.grid[k]===1&&S.n[S.a[k]]>=NV_MINW){b=S.a[k];break;}}
    if(b)spots.push([d,px,py,b]);}
  spots.sort((p,q)=>p[0]-q[0]);const b=spots.length?spots[0][3]:0,size=b?S.n[b]:0;
  let reach=false;if(b)for(const e of G.ents){if(e.dead||!e.isB||ally(e.team,T.id))continue;if(coastSpot(b,e.x,e.y,520)){reach=true;break;}}
  return C[T.id]={t:T.ai.t,ax:anchor.x,ay:anchor.y,b,big:size>=NV_SEA,ok:!!b&&(reach||size>=NV_SEA)&&!(P&&P.fail>4),fail:P?P.fail:0,
    spots:spots.filter(s=>s[3]===b).slice(0,90).map(s=>[s[1],s[2]]),home:b?coastSpot(b,anchor.x,anchor.y,2300*WK):null};}
function aiNavyBuild(T,mine,anchor){T.ai.nvW=false;const D=DIFF[T.ai.d??1],id=T.id;if(!G.map.hasWater||!D.nvCap||!bldAllowed(T.fac,'shipyard')||G.t<D.nvAt)return;
  if(mine.some(e=>e.kind==='shipyard')||!reqMet(id,'shipyard')||!mine.some(e=>e.kind==='dozer'))return;const P=aiNavyPlan(T,anchor);if(!P.ok)return;
  T.ai.nvW=true;if(mine.some(e=>e.isB&&e.built<1)||T.credits<bstats(T.fac,'shipyard').cost||T.ai.t%3)return;
  for(const [x,y] of P.spots)if(validSpot(id,'shipyard',x,y)){placeBld(id,'shipyard',x,y);if(!(T.ai.st&&T.ai.st.yardT))aiStat(T.ai,'yardT',Math.round(G.t));return;}if(++P.fail>4)P.ok=false;}
// what the Shipyard should build next (null = fleet is big enough)
function aiNavyPick(T,mine,opts,anchor){const D=DIFF[T.ai.d??1],P=(G._nvp||{})[T.id]||aiNavyPlan(T,anchor);
  const fleet=mine.filter(e=>!e.isB&&e.s.dom==='naval'&&!e.s.noAttack),land=mine.filter(e=>!e.isB&&e.s.dom==='ground'&&!e.s.noAttack&&e.kind!=='harv').length;
  const cap=Math.max(1,Math.floor(Math.min(D.nvCap*(P.big?1:.5)*(G.bs||1),1+land*D.nvShare)));if(fleet.length+T.q.shipyard.length>=cap)return null;
  const foeNav=G.ents.filter(e=>!e.dead&&!e.isB&&e.s.dom==='naval'&&!e.s.noAttack&&!ally(e.team,T.id)).length,ships=fleet.filter(e=>e.s.cls==='ship').length+T.q.shipyard.filter(i=>i.kind==='ship').length;
  return [D.nvShip&&opts.includes('ship')&&ships<Math.floor((fleet.length+1)*(foeNav>fleet.length?.25:.45))?'ship':'boat'];}
function aiNavyAct(T,mine){if(T.ai.t%2)return;const fleet=mine.filter(e=>!e.isB&&e.s.dom==='naval'&&!e.s.noAttack);if(!fleet.length)return;if(!(T.ai.st&&T.ai.st.fleetT))aiStat(T.ai,'fleetT',Math.round(G.t));
  const D=DIFF[T.ai.d??1],id=T.id,P=(G._nvp||{})[id],go=(u,x,y)=>{if(u.target)return;const o=u.order;if(o&&!o.nv)return;if(o&&Math.hypot(o.x-x,o.y-y)<160)return;if(!o&&Math.hypot(u.x-x,u.y-y)<120)return;setMove(u,x+rnd(-40,40),y+rnd(-40,40),'amove');u.order.nv=1;};
  const myB=mine.filter(m=>m.isB),byB=new Map();for(const u of fleet){const b=bodyAt(u.x,u.y);if(!b)continue;if(!byB.has(b))byB.set(b,[]);byB.get(b).push(u);}
  for(const [b,F] of byB){let cx=0,cy=0;for(const u of F){cx+=u.x;cy+=u.y;}cx/=F.length;cy/=F.length;
    // 1) enemy vessels on this water: go get them
    let foe=null,fd=1e18;for(const e of G.ents){if(e.dead||e.isB||e.s.dom!=='naval'||ally(e.team,id))continue;const d=(e.x-cx)**2+(e.y-cy)**2;if(d<fd&&bodyAt(e.x,e.y)===b){fd=d;foe=e;}}
    if(foe&&(F.length>=2||fd<900*900||foe.s.noAttack)){for(const u of F)go(u,foe.x,foe.y);continue;}
    // 2) enemies hitting our coastline: defend it
    let thr=null;if(P&&P.b===b)for(const e of G.ents){if(e.dead||e.isB||ally(e.team,id)||e.s.dom==='air')continue;if(!myB.some(m=>Math.abs(m.x-e.x)<600&&Math.abs(m.y-e.y)<600))continue;const w=coastSpot(b,e.x,e.y,240);if(w){thr=w;break;}}
    if(thr){for(const u of F)go(u,thr[0],thr[1]);continue;}
    // 3) flotilla strong enough: shell the nearest coastal enemy structure
    if(F.length>=D.nvSortie){if(!T.ai.nvTg||T.ai.nvTg.dead||T.ai.nvTb!==b||T.ai.t%20===0){T.ai.nvTg=null;const tg=G.ents.filter(e=>e.isB&&!e.dead&&!ally(e.team,id)).sort((p,q)=>((p.x-cx)**2+(p.y-cy)**2)-((q.x-cx)**2+(q.y-cy)**2));
        for(const e of tg.slice(0,40))if(coastSpot(b,e.x,e.y,470)){T.ai.nvTg=e;T.ai.nvTb=b;break;}}
      const t=T.ai.nvTg;if(t){const far=coastSpot(b,t.x,t.y,470),near=coastSpot(b,t.x,t.y,200);for(const u of F){const w=u.s.rng>=400?far:(near||far);if(w)go(u,w[0],w[1]);}continue;}}
    // 4) otherwise hold on our own coast
    if(P&&P.b===b&&P.home)for(const u of F)go(u,P.home[0],P.home[1]);}}
// Amphibious landings (Normal and Hard): on a map with open sea (not rivers), once the Shipyard stands and the army is big enough,
// the AI builds one Landing Craft, loads idle troops from home, sails to the open water closest to the enemy base and
// lands them there; they then storm the enemy HQ while the craft goes home for the next load. Hard starts sooner,
// lands more often and times the landing with its main attack. State lives in T.ai.ld (AI state; never checkpointed).
function aiLanding(T,mine,anchor,pb,launched){const D=DIFF[T.ai.d??1],id=T.id;if(!D.land||!G.map.hasWater||!pb.length||T.ai.t%2)return;
  const P=(G._nvp||{})[id];if(!P||!P.b||!P.big||!done(id,'shipyard'))return;/* open sea only: a river crossing is a bridge's job */const R=roster(T.fac);if(!(R.shipyard||[]).includes('lander'))return;
  let L=T.ai.ld;const tr=mine.find(e=>e.kind==='lander'&&!e.dead);
  if(L&&(L.ph==='load'||L.ph==='sail')&&!tr){aiStat(T.ai,'landLost');L=T.ai.ld={ph:'wait',t:G.t};}
  const tg=pb.find(e=>e.kind==='hq')||pb[0];
  if(!L||L.ph==='wait'){if(L&&G.t-L.t<(D.land>1?45:80))return;
    const army=mine.filter(e=>!e.isB&&e.s.dom==='ground'&&!e.s.noAttack&&!['harv','dozer','hacker'].includes(e.kind)).length;
    if(army<(D.land>1?8:12)||G.t<(D.land>1?240:360))return;
    if(!coastSpot(P.b,tg.x,tg.y,1100))return;
    if(tr){T.ai.ld={ph:'load',t:G.t,tr};return;}
    if(!T.q.shipyard.some(i=>i.kind==='lander')&&T.credits>=stats(T.fac,'lander').cost+300&&enqueue(id,'lander'))T.ai.ld={ph:'build',t:G.t};return;}
  if(L.ph==='build'){if(tr)T.ai.ld=L={ph:'load',t:G.t,tr};else{if(G.t-L.t>90)T.ai.ld={ph:'wait',t:G.t};return;}}
  if(L.tr!==tr){L.tr=tr;}
  if(L.ph==='load'){const cap=tr.s.cap,load=cargoLoad(tr);let want=cap-load;
    const pend=mine.filter(u=>u.order&&u.order.type==='board'&&u.order.target===tr);want-=pend.length;
    if(want>0&&!launched){const cand=mine.filter(u=>!u.isB&&!u.order&&!u.target&&!u.amb&&isInf(u.s)&&canBoard(tr,u)&&u.kind!=='hacker'&&Math.hypot(u.x-anchor.x,u.y-anchor.y)<1000).sort((p,q)=>dist(p,tr)-dist(q,tr));
      for(const u of cand.slice(0,want)){u.order={type:'board',target:tr,auto:1};u.target=null;u.path=null;}}
    // sail when full, or with a half load once the wait drags on (or the main attack just moved out, on Hard)
    if(load>=cap-1||load>=Math.ceil(cap/2)&&(G.t-L.t>50||D.land>1&&launched)){
      const w=coastSpot(P.b,tg.x,tg.y,1100);if(!w){T.ai.ld={ph:'wait',t:G.t};return;}
      for(const u of pend)u.order=null;
      setMove(tr,w[0],w[1],'move');L.ph='sail';L.w=w;L.t=G.t;aiStat(T.ai,'landSail');}
    else if(G.t-L.t>120){for(const u of pend)u.order=null;T.ai.ld={ph:'wait',t:G.t};}
    return;}
  if(L.ph==='sail'){const near=Math.hypot(tr.x-L.w[0],tr.y-L.w[1])<140;
    if(near||!tr.order&&G.t-L.t>4||G.t-L.t>150){const C=(tr.cargo||[]).slice();unloadTransport(tr);const off=C.filter(u=>!u.inTun);
      for(const u of off){setMove(u,tg.x+rnd(-80,80),tg.y+rnd(-80,80),'amove');u.flank=G.t;}
      if(off.length){aiStat(T.ai,'landed');aiStat(T.ai,'landTroops',off.length);}
      if(!(tr.cargo||[]).length){if(P.home)setMove(tr,P.home[0],P.home[1],'move');T.ai.ld={ph:'wait',t:G.t};}
      else if(G.t-L.t>150){if(P.home)setMove(tr,P.home[0],P.home[1],'move');T.ai.ld={ph:'load',t:G.t,tr};}}
    return;}}
// AI sends the nearest infantry to re-crew its own abandoned vehicles or capture the enemy's
function aiSalvage(T,mine){if(T.ai.t%3)return;for(const v of G.ents){if(v.dead||!v.aband)continue;let best=null,bd=650*650;for(const u of mine){if(u.isB||u.dead||!isInf(u.s)||u.s.noAttack||u.kind==='hacker'||u.rout>G.t||u.inTun)continue;const d=(u.x-v.x)**2+(u.y-v.y)**2;if(d<bd){bd=d;best=u;}}if(best&&!(best.order&&best.order.salv===v.id)){setMove(best,v.x,v.y,'move');best.order.salv=v.id;}}}
function aiThink(T){const id=T.id,mine=G.ents.filter(e=>e.team===id&&!e.dead);const hq=mine.find(e=>e.kind==='hq');const anchor=hq||mine.find(e=>e.isB);if(!anchor)return;T.ai.t++;aiSalvage(T,mine);const en=aiFoe(T,anchor);
  // HQ queue priorities: a supply truck if it has none, then a bulldozer if it has none (without one it can never build a
  // barracks again: a raid that killed its dozer used to leave it buying trucks forever and never fielding an army),
  // then trucks up to 3-4.
  const harvs=mine.filter(e=>e.kind==='harv').length,dzN=mine.filter(e=>e.kind==='dozer').length;
  if(hq&&!T.q.hq.length){if(!harvs)enqueue(id,'harv');else if(!dzN)enqueue(id,'dozer');else if(harvs<3+(G.t>300?1:0))enqueue(id,'harv');}
  aiExpand(T,mine,hq);
  {const fnd=mine.filter(e=>e.isB&&e.nd&&e.built<1);const dzs=mine.filter(e=>e.kind==='dozer');for(const b of fnd){if(dzs.some(u=>u.order&&u.order.type==='build'&&u.order.target===b))continue;const fr=dzs.filter(u=>!u.order||u.order.type!=='build').sort((p,q)=>dist(p,b)-dist(q,b))[0];if(fr){fr.order={type:'build',target:b};fr.path=null;}}}
  while(AIORDER[T.ai.bi]&&(!bldAllowed(T.fac,AIORDER[T.ai.bi])||AIORDER[T.ai.bi]==='shipyard'))T.ai.bi++;
  if(T.ai.bi>1&&!mine.some(e=>e.kind==='barracks'))T.ai.re='barracks';else if(T.ai.bi>2&&!mine.some(e=>e.kind==='factory'))T.ai.re='factory';else T.ai.re=null;
  if(T.ai.re&&!mine.some(e=>e.isB&&e.built<1)){const s=bstats(T.fac,T.ai.re);if(T.credits>=s.cost){const p=aiFindSpot(id,T.ai.re,anchor);if(p)placeBld(id,T.ai.re,p[0],p[1]);}}
  // Supply depots: next to rich fields near home, and - late in the game, when the near fields have run dry and the
  // trucks report a long haul (updHarv sets T.ai.depF) - right next to the field they now drive to, wherever it is,
  // as long as no enemy base is close to it. One depot cuts a 2-4 km round trip down to a few hundred metres.
  {const dps=mine.filter(e=>e.kind==='depot'||e.kind==='hq'),nDep=mine.filter(e=>e.kind==='depot').length,dF=T.ai.depF,dc=bstats(T.fac,'depot').cost;
   const haulF=dF&&dF.amt>800&&nDep<5&&dps.every(b=>dist(b,dF)>600)&&!G.ents.some(e=>e.isB&&!e.dead&&!ally(e.team,id)&&dist(e,dF)<800)?dF:null;
   if(T.ai.t%11===5&&dps.length&&(nDep<3||haulF)&&T.credits>dc+(haulF?100:400)&&!mine.some(e=>e.isB&&e.built<1)&&mine.some(e=>e.kind==='harv')){
     const far=haulF||G.fields.filter(f=>f.amt>2500&&dps.every(b=>dist(b,f)>520)&&dist(f,anchor)<1500).sort((p,q)=>dist(p,anchor)-dist(q,anchor))[0];if(haulF){T.ai.depF=null;aiStat(T.ai,'haulDepot');}if(far){const p=aiFindSpot(id,'depot',{x:far.x,y:far.y});if(p&&Math.hypot(p[0]-far.x,p[1]-far.y)<260)placeBld(id,'depot',p[0],p[1]);}}}
  {const ec=mine.filter(e=>e.kind==='econ').length,left=G.fields.reduce((a,f)=>a+Math.max(0,f.amt),0)/Math.max(1,G.fields.length*9000);
   if(T.ai.t%13===7&&ec<4&&reqMet(id,'econ')&&!mine.some(e=>e.isB&&e.built<1)&&(G.t>480+ec*240||left<.35)&&T.credits>bstats(T.fac,'econ').cost+(left<.35?200:900)){const p=aiFindSpot(id,'econ',anchor);if(p)placeBld(id,'econ',p[0],p[1]);}}
  if(T.ai.t%15===8&&T.credits>2500){const poor=G.teams.filter(O=>O.id!==id&&!O.out&&ally(O.id,id)&&O.credits<500).sort((a,b)=>(a.ai?1:0)-(b.ai?1:0))[0];if(poor)giveMoney(id,poor.id,Math.min(1500,Math.round(T.credits*.3)));}
  aiNavyBuild(T,mine,anchor);
  const nk=T.ai.re?null:AIORDER[T.ai.bi];if(nk&&!reqMet(id,nk)){if(++T.ai.rq>45){T.ai.bi++;T.ai.rq=0;}}else T.ai.rq=0;if(nk&&reqMet(id,nk)&&!mine.some(e=>e.isB&&e.built<1)){const s=bstats(T.fac,nk);if(T.credits>=s.cost){const p=aiFindSpot(id,nk,anchor);if(p){placeBld(id,nk,p[0],p[1]);T.ai.bi++;T.ai.nf=0;}else if(STRUCT[nk].shore||++T.ai.nf>8){T.ai.bi++;T.ai.nf=0;}}}
  // Saving up for the next building holds back unit purchases - but only for the Barracks and War Factory while the
  // army is thin. A poor AI used to hoard for its Strike Center/airfield/expansion with an empty field and get wiped
  // out; now it keeps fielding troops until it has a real army, and builds the extras from the surplus.
  const armyN=mine.filter(e=>!e.isB&&!e.s.noAttack&&e.s.dom!=='naval'&&!['harv','hacker','dozer'].includes(e.kind)).length,thin=armyN<Math.max(6,Math.round(T.ai.wave*.5));
  const reserve=Math.max((nk&&reqMet(id,nk)&&(!thin||nk==='barracks'||nk==='factory'))?bstats(T.fac,nk).cost*(T.ai.bi<6?1:.6):0,T.ai.saveHq&&!thin?bstats(T.fac,'hq').cost*.8:0,T.ai.nvW&&!thin?bstats(T.fac,'shipyard').cost*.8:0);
  const DC=DOCT[T.fac]||{},R=roster(T.fac),enemyAir=G.ents.filter(e=>e.team===en&&!e.isB&&e.s.dom==='air').length;
  // Combined arms: the barracks used to spend every dollar first (riflemen are always affordable), so the AI fielded
  // almost nothing but infantry and nations whose strength is armour (Merkava, Leclerc, Abrams) never used it. Once the
  // War Factory is up and there is a core army, the AI keeps about a third of its land army's value in vehicles: while
  // short, the factory picks first and the barracks leaves that vehicle's price in the bank. Pure sim state, no RNG.
  let vV=0,lV=0;for(const e of mine)if(!e.isB&&e.s.dom==='ground'&&!e.s.noAttack&&e.kind!=='harv'&&e.kind!=='dozer'&&e.kind!=='hacker'){lV+=e.s.cost;if(isVeh(e.s))vV+=e.s.cost;}
  for(const c of ['barracks','factory'])for(const it of T.q[c]){const s=stats(T.fac,it.kind);if(s.dom!=='ground'||s.noAttack)continue;lV+=s.cost;if(isVeh(s))vV+=s.cost;}
  const wantVeh=!thin&&done(id,'factory')&&vV<lV*.33;let vSv=0;
  for(const cat of wantVeh?['shipyard','factory','barracks','airfield']:['shipyard','barracks','factory','airfield']){if(!done(id,cat)||T.q[cat].length>=Math.ceil(DIFF[T.ai.d??1].q*(G.bs||1)))continue;let opts=R[cat].filter(k=>k!=='hacker'||unitCount(id,'hacker')<3).filter(k=>k!=='lander'&&k!=='airlift').filter(k=>!stats(T.fac,k).limit||unitCount(id,k)<1);
    if(cat==='factory'){opts=enemyAir>=2?['aa','aa',...opts]:opts.filter(k=>k!=='aa'||Math.random()<.2);
      // Heavy-barrage doctrine (RU, CN, KP): keep a real artillery park - about a fifth of the army, 2 to 8 guns
      if(DC.barrage&&opts.includes('arty')&&unitCount(id,'arty')<Math.min(Math.round(8*(G.bs||1)),Math.max(2,Math.round(armyN*.2))))opts=['arty','arty','arty',...opts];}
    if(cat==='airfield'&&Math.random()<.5)continue;if(cat==='shipyard'){opts=aiNavyPick(T,mine,opts,anchor)||[];}
    if(cat==='factory')opts=opts.filter(k=>k!=='drone'||Math.random()<.35);if(!opts.length)continue;
    const k=opts[Math.floor(Math.random()*opts.length)];const sv=(cat!=='shipyard'&&T.ai.nvSv>G.t-25?stats(T.fac,'ship').cost*.7:0)+(cat==='barracks'||cat==='airfield'?vSv:0);if(k&&T.credits-reserve-sv>=stats(T.fac,k).cost){enqueue(id,k);}else if(k==='ship')T.ai.nvSv=G.t;else if(wantVeh&&cat==='factory'&&isVeh(stats(T.fac,k))&&!stats(T.fac,k).noAttack)vSv=stats(T.fac,k).cost;}
  if(T.credits>1700&&T.ai.t%5===0){const ups=upgList(T.fac).filter(k=>!T.upg[k]&&done(id,UPG[k].at)&&!T.rq[UPG[k].at]);if(ups.length)startResearch(id,ups[Math.floor(Math.random()*ups.length)]);}
  if(T.rank-T.spent>0){{let did=false;for(const k of DC.barrage?['nat','barrage','bounty','repair','para','recon']:['nat','bounty','barrage','repair','para','recon'])if(!T.pw[k]){did=buyPower(id,k);break;}if(!did)for(const k of DC.barrage?['barrage','nat','repair']:['nat','barrage','repair'])if(T.pw[k]&&buyPower(id,k))break;}}
  if(T.pw.nat&&T.pw.nat.cd<=0&&T.ai.t%5===2){const N=natPow(T.fac);const c=aiCluster(en);const army=mine.filter(e=>!e.isB);
    if(N.self){if(N.type==='cash'||N.type==='mercs'||army.some(u=>u.target))usePower(id,'nat',0,0);}
    else if(N.type==='shield'||N.type==='smoke'||N.type==='supply'){const g=army.filter(u=>u.target);if(g.length>=4)usePower(id,'nat',g[0].x,g[0].y);}
    else if(N.type==='partisans'){if(c)usePower(id,'nat',c.x+rnd(-150,150),c.y+rnd(-150,150));}
    else if(c&&(N.type!=='cyber'&&N.type!=='intel'||true))usePower(id,'nat',c.x,c.y);}
  // Artillery Barrage: fired at the enemy's densest spot when our forces are near it. Barrage-doctrine nations also shell
  // any big enemy troop concentration, and if none shows up within 40 s of the barrage being ready, the enemy base.
  // Never where our own or allied troops are inside the target area (aiShellOk): the next-densest safe spot instead.
  if(T.pw.barrage&&T.pw.barrage.cd>0)T.ai.bw=null;/* the 40 s wait restarts whenever the barrage was used */if(T.pw.barrage&&T.pw.barrage.cd<=0&&T.ai.t%(DC.barrage?3:7)===0){const ok=aiShellOk(id),c=aiCluster(en,ok);if(c&&G.ents.some(e=>e.team===id&&Math.hypot(e.x-c.x,e.y-c.y)<900))usePower(id,'barrage',c.x,c.y);
    else if(DC.barrage){if(T.ai.bw==null)T.ai.bw=G.t;const u=aiTroops(en,ok);if(u)usePower(id,'barrage',u.x,u.y);else if(c&&G.t-T.ai.bw>40)usePower(id,'barrage',c.x,c.y);if(T.pw.barrage.cd>0)T.ai.bw=null;}}
  if(T.pw.repair&&T.pw.repair.cd<=0){const hurt=mine.filter(e=>!e.isB&&e.hp<e.max*.45);if(hurt.length>=4)usePower(id,'repair',hurt[0].x,hurt[0].y);}
  const army=mine.filter(e=>!e.isB&&e.s.dom!=='naval'&&!['harv','hacker','jet','dozer'].includes(e.kind));const pb=G.ents.filter(e=>e.team===en&&e.isB&&!e.dead);
  let threat=null;for(const e of G.ents){if(ally(e.team,id)||e.dead||e.isB)continue;if(mine.some(b=>b.isB&&Math.hypot(b.x-e.x,b.y-e.y)<560)){threat=e;break;}}
  if(threat)for(const u of army)if(!u.order&&!u.amb&&Math.hypot(u.x-anchor.x,u.y-anchor.y)<1100&&canTarget(u.s,threat))setMove(u,threat.x,threat.y,'amove');
  if(DC.covert)aiAmbush(T,army,anchor,pb);
  const idle=army.filter(u=>!u.order&&!u.target&&!u.amb);
  for(const u of idle)if(u.flT&&!u.flT.dead&&G.t-u.flank<150){setMove(u,u.flT.x+rnd(-60,60),u.flT.y+rnd(-60,60),'amove');u.flT=null;aiStat(T.ai,'flankIn');}else if(Math.hypot(u.x-anchor.x,u.y-anchor.y)>900&&pb.length){const t=pb.reduce((a,b)=>dist(a,u)<dist(b,u)?a:b);setMove(u,t.x,t.y,'amove');}
  const home=idle.filter(u=>Math.hypot(u.x-anchor.x,u.y-anchor.y)<=900&&u.s.dom!=='naval');
  let launched=false;if(home.length>=T.ai.wave&&pb.length&&G.t>DIFF[T.ai.d??1].first){launched=true;const t=pb.find(e=>e.kind==='hq')||pb[0];const ang=Math.atan2(t.y-anchor.y,t.x-anchor.x),D=Math.hypot(t.x-anchor.x,t.y-anchor.y);
      const FL=DIFF[T.ai.d??1].flank,fl=FL&&home.length>=6&&D>(FL>1?700:900)?home.filter((u,i)=>i%3===2&&isVeh(u.s)||i%4===3):[];const side=Math.random()<.5?1:-1;
      // Hard with a big wave: a pincer - the flanking force splits and swings round both sides. Flankers remember the
      // main attack's target and close on it from the side once they reach their swing point (see the idle loop).
      const pin=FL>1&&fl.length>=6;
      fl.forEach((u,i)=>{const sd=pin&&i%2?-side:side,fx=anchor.x+Math.cos(ang)*D*.62+Math.cos(ang+sd*1.57)*Math.min(650,D*.35),fy=anchor.y+Math.sin(ang)*D*.62+Math.sin(ang+sd*1.57)*Math.min(650,D*.35);
        setMove(u,fx+rnd(-50,50),fy+rnd(-50,50),'amove');u.flank=G.t;u.flT=FL>1?t:null;});if(fl.length){aiStat(T.ai,'flank');aiStat(T.ai,'flankers',fl.length);if(pin)aiStat(T.ai,'pincer');}const main=home.filter(u=>!fl.includes(u));const gnd=main.filter(u=>u.s.dom==='ground'),oth=main.filter(u=>u.s.dom!=='ground');if(gnd.length)formMove(gnd,t.x,t.y,'amove',1,4);for(const u of oth)setMove(u,t.x+rnd(-60,60),t.y+rnd(-60,60),'amove');
      if(fl.length)T.ai.flanks=(T.ai.flanks||0)+1;T.ai.wave=Math.min(T.ai.wave+Math.round(2*(G.bs||1)),Math.round(DIFF[T.ai.d??1].maxWave*(G.bs||1)));log(en,'Enemy attack force spotted moving out.','w');}
  aiNavyAct(T,mine);aiLanding(T,mine,anchor,pb,launched);
  if(T.ai.t%6===0)for(const u of mine)if(u.kind==='jet'&&u.state==='park'&&u.ammo>=u.s.ammo&&pb.length){const t=pb[Math.floor(Math.random()*pb.length)];u.order={type:'attack',target:t};u.state='fly';u.landed=false;}
  if(T.ai.t%4===0){const free=G.oil.filter(o=>!ally(o.owner,id)).sort((a,b)=>dist(a,anchor)-dist(b,anchor))[0];if(free){const inf=mine.find(u=>!u.isB&&u.kind==='inf'&&!u.order&&!u.target&&!u.amb);if(inf&&Math.hypot(free.x-anchor.x,free.y-anchor.y)<1700)setMove(inf,free.x,free.y,'move');}}
  if(T.ai.t%9===0){const tgt=G.oil.filter(o=>!o.dead&&o.owner>=0&&!ally(o.owner,id)).sort((p,q)=>dist(p,anchor)-dist(q,anchor))[0];if(tgt&&dist(tgt,anchor)<1500){const sq=army.filter(u=>!u.order&&!u.target&&!u.amb&&u.s.dom==='ground'&&canTarget(u.s,tgt.tg)).slice(0,4);for(const u of sq){u.order={type:'attack',target:tgt.tg};u.path=null;}}}
  if(T.tun.length&&T.ai.t%3===0){const tns=mine.filter(e=>e.kind==='tunnel'&&e.built>=1);let pick=null;
    for(const b of tns)if(G.ents.some(e=>!e.dead&&!ally(e.team,id)&&!e.isB&&e.s.dom==='ground'&&Math.hypot(e.x-b.x,e.y-b.y)<300)){pick=b;break;}
    if(!pick&&T.tun.every(u=>u.hp>=u.max*.9))pick=tns.sort((p,q)=>(pb.length?Math.min(...pb.map(e=>dist(e,p)))-Math.min(...pb.map(e=>dist(e,q))):0))[0];
    if(pick&&T.tun.length)unloadTunnel(pick);}
  if(T.charge>=T.sup.charge&&working(id,'uplink')){const c=aiCluster(en);if(c)launch(id,c.x,c.y);}}

// Realistic defeat. A nation doesn't have to lose every last truck - it capitulates when its war-fighting capacity
// is gone. Checked every second against the most it ever had:
//  - collapse: 90% of its base (by value) destroyed AND its army is down to a handful (4 or fewer combat units, or
//    under 12% of its largest army) -> 30 s warning, then it capitulates unless it recovers in time;
//  - cut off: no buildings and no bulldozer left to rebuild -> its remaining army has 45 s before it surrenders;
//  - wiped out: nothing left at all -> immediately.
// A war always has a winner: if the last sides would all fall on the same tick, the strongest of them is spared.
// The warning goes to everyone so the attacker knows to keep up the pressure and the defender knows to rebuild.
function forceOf(T){let bv=0,bn=0,uv=0,un=0,dz=0;for(const e of G.ents){if(e.dead||e.team!==T.id)continue;
    if(e.isB){if(e.kind==='garrison'||e.built<1)continue;bv+=e.kind==='hq'?2000:Math.max(300,e.s.cost||0);bn++;}
    else if(e.kind==='dozer')dz++;else if(!e.s.noAttack&&e.kind!=='harv'&&e.kind!=='hacker'&&!e.aband){uv+=e.s.cost||300;un++;}}
  for(const u of T.tun||[])if(!u.dead){uv+=u.s.cost||300;un++;}
  if(G.civ)for(const c of G.civ)if(!c.dead&&c.occ)for(const u of c.occ)if(!u.dead&&u.team===T.id){uv+=u.s.cost||300;un++;}
  return{bv,bn,uv,un,dz};}
function capitulate(T,why){T.out=true;T.whyOut=why;for(const O of G.teams)log(O.id,O.id===T.id?`We have capitulated: ${why}`:`${T.F.name} has capitulated - ${why}`,O.id===T.id?'bad':'w');
  for(const e of G.ents)if(!e.dead&&e.team===T.id&&e.kind!=='garrison'){if(e.isB)kill(e,null);else{e.dead=true;G.byId.delete(e.id);FXE('die',[e.id,e.x|0,e.y|0,KINDS.indexOf(e.kind),0,e.team]);}}
  if(T.tun)for(const u of T.tun)u.dead=true;if(G.civ)for(const c of G.civ)if(c.occ&&c.occ.some(u=>u.team===T.id)){for(const u of c.occ)if(u.team===T.id)u.dead=true;c.occ=c.occ.filter(u=>!u.dead);}FXE('elim',[T.id]);G.lastWhy=why;}
function checkEnd(){if(G.sandbox)return;const fall=[];
  for(const T of G.teams){if(T.out)continue;const F=forceOf(T);T.lastF=F;T.pkB=Math.max(T.pkB||0,F.bv);T.pkU=Math.max(T.pkU||0,F.uv);
    if(!F.bn&&!F.dz&&!F.un){fall.push([T,'every unit and building has been destroyed.']);continue;}
    const baseGone=(T.pkB||0)>=2000&&F.bv<=T.pkB*.1,armyGone=F.un<=4||F.uv<=(T.pkU||0)*.12;
    let cond=null,limit=0;if(!F.bn&&!F.dz){cond=`no base left and no way to rebuild - its last ${F.un} unit${F.un===1?'':'s'} ran out of supplies.`;limit=45;}
    else if(baseGone&&armyGone){cond=`${Math.round(100-F.bv/T.pkB*100)}% of its base destroyed and only ${F.un} combat unit${F.un===1?'':'s'} left.`;limit=30;}
    if(cond){if(T.colT==null){T.colT=G.t;for(const O of G.teams)log(O.id,O.id===T.id?(F.bn||F.dz?`Our nation is collapsing! 90% of our base is destroyed and our army is nearly gone - rebuild and reinforce within ${limit} seconds or we capitulate.`:`We have lost every building and bulldozer! Our army will surrender in ${limit} seconds.`):`${T.F.name} is collapsing and will capitulate in ${limit} seconds unless it recovers.`,O.id===T.id?'bad':'w');}
      else{const left=limit-(G.t-T.colT);if(T.id===ME&&left>0&&left<=10&&Math.abs(left-Math.round(left/5)*5)<.6&&T.colW!==Math.round(left)){T.colW=Math.round(left);log(T.id,`Capitulation in ${Math.round(left)} seconds!`,'bad');}if(left<=0)fall.push([T,cond]);}}
    else if(T.colT!=null){T.colT=null;T.colW=null;for(const O of G.teams)log(O.id,O.id===T.id?'We have recovered - the collapse is averted.':`${T.F.name} has recovered from the brink.`,O.id===T.id?'g':'w');}}
  // Decide every fall first, then apply them. If the last sides standing would all go down on the same tick (two
  // armies bleeding out together, both 45 s timers expiring at once), nobody may lose the war together: the side with
  // the most left on the field (base + army value, then kills, then the bigger peak force, then slot order) holds on
  // and wins. Pure sim state, no RNG, so host and every client agree.
  if(fall.length&&!G.teams.some(T=>!T.out&&!fall.some(f=>f[0]===T))){
    const sc=T=>{const F=T.lastF||{bv:0,uv:0,dz:0};return F.bv+F.uv+F.dz*500;};
    const better=(a,b)=>sc(a)!==sc(b)?sc(a)>sc(b):(a.kills|0)!==(b.kills|0)?(a.kills|0)>(b.kills|0):((a.pkB||0)+(a.pkU||0))>((b.pkB||0)+(b.pkU||0));
    let best=fall[0][0];for(const [T] of fall)if(better(T,best))best=T;
    for(const f of fall)if(ally(f[0].id,best.id)){f[2]=1;f[0].colT=null;f[0].colW=null;}}
  for(const [T,why,spared] of fall)if(!spared)capitulate(T,why);
  const alive=G.teams.filter(T=>!T.out).map(T=>T.id);
  if(alive.length<=1||alive.every(t=>ally(t,alive[0])))endGame(alive.length?alive[0]:-1,G.lastWhy?`The last enemy capitulated: ${G.lastWhy}`:'');}

function specialTick(u,dt,o){const s=u.s;u.spT=(u.spT||0)-dt;if(u.spT>0)return;u.spT=1.2;
  if(s.markAura){for(const e of G.ents)if(!e.dead&&!e.isB&&!ally(e.team,u.team)&&seenBy(u.team,e)&&Math.hypot(e.x-u.x,e.y-u.y)<s.markAura)e.mark=G.t+3;}
  if(s.mines&&!o&&!u.target&&G.t-(u.mineT||-9)>5&&G.t-u.lastHit>3){const mine=G.mines.filter(m=>m.team===u.team);if(mine.length<8&&!G.mines.some(m=>Math.hypot(m.x-u.x,m.y-u.y)<30)){u.mineT=G.t;G.mines.push({x:u.x|0,y:u.y|0,team:u.team,arm:G.t+2});}}}
function updMines(){for(const m of G.mines){if(m.arm>G.t)continue;for(const e of nearby(m.x,m.y,22+(G.rmax||40),MN_N)){if(e.dead||e.isB||ally(e.team,m.team)||e.s.dom!=='ground'||!isVeh(e.s))continue;if(Math.abs(e.x-m.x)<22&&Math.hypot(e.x-m.x,e.y-m.y)<22){m.done=true;explode(m.x,m.y,40,260,m.team,'at');FXE('txt',[m.x,m.y,'MINE',m.team,e.team]);break;}}}if(G.mines.some(m=>m.done))G.mines=G.mines.filter(m=>!m.done);}
const TUN_CAP=12;
// what is waiting in a team's tunnel network, by unit type (shown on every tunnel entrance)
function tunKinds(T){const o={};for(const u of T.tun||[])o[u.kind]=(o[u.kind]||0)+1;return o;}
// ---- transports ----
function canBoard(tr,u){return u.team===tr.team&&!u.dead&&u.s.dom==='ground'&&u.kind!=='harv'&&u.kind!=='dozer'&&(isInf(u.s)||(tr.s.carryVeh&&isVeh(u.s)));}
function cargoLoad(tr){return (tr.cargo||[]).reduce((a,u)=>a+(isInf(u.s)?1:3),0);}
function boardTransport(u,tr){const need=isInf(u.s)?1:3;if(cargoLoad(tr)+need>tr.s.cap){u.order=null;log(u.team,`The ${tr.s.name} is full.`,'w');return;}
  u.order=null;u.target=null;u.inTun=true;u.trn=tr.id;G.byId.delete(u.id);(tr.cargo=tr.cargo||[]).push(u);}
function unloadTransport(tr){const C=tr.cargo||[];if(!C.length)return;const dom='ground';let placed=0;
  for(let i=0;i<C.length;i++){const u=C[i];let p=null;for(const rr of [tr.r+16,tr.r+40,tr.r+70,tr.r+110,tr.r+160]){for(let k=0;k<10&&!p;k++){const a=(i*1.7+k*.63);const x=tr.x+Math.cos(a)*rr,y=tr.y+Math.sin(a)*rr;if(passXY(dom,x,y))p=[x,y];}if(p)break;}
    if(!p)continue;u.x=p[0];u.y=p[1];u.inTun=false;u.trn=0;u.mv=G.t;u.order=null;G.ents.push(u);G.byId.set(u.id,u);C[i]=null;placed++;}
  tr.cargo=C.filter(Boolean);if(placed)log(tr.team,`${placed} unit${placed>1?'s':''} unloaded.`,'g');if(tr.cargo.length)log(tr.team,'Move closer to land to unload the rest.','w');}
function enterTunnel(u){const T=G.teams[u.team];if(T.tun.length>=TUN_CAP){u.order=null;log(u.team,'The tunnel network is full (12 units).','w');return;}u.order=null;u.target=null;u.inTun=true;G.byId.delete(u.id);T.tun.push(u);}
function unloadTunnel(b){const T=G.teams[b.team];const n=T.tun.length;if(!n)return;T.tun.forEach((u,i)=>{const a=i/n*6.283+Math.random()*.3,r=b.size/2+22+(i%3)*16;const p=nearestPassXY('ground',b.x+Math.cos(a)*r,b.y+Math.sin(a)*r)||[b.x,b.y];u.x=p[0];u.y=p[1];u.inTun=false;u.mv=G.t;G.ents.push(u);G.byId.set(u.id,u);});
  T.tun=[];log(b.team,`${n} unit${n>1?'s':''} came out of the tunnel.`,'g');}
function wxNow(){return WEATHER[(G&&G.wx&&G.wx.k)||'clear']||WEATHER.clear;}
function weatherTick(dt){if(!G.wx)G.wx={k:'clear',t:0,next:150+Math.random()*90};const W=G.wx;W.t+=dt;if(W.t<W.next)return;W.t=0;const ks=weatherKinds(G.map.theme);
  if(W.k==='clear'){W.k=ks[1+Math.floor(Math.random()*(ks.length-1))];W.next=55+Math.random()*45;}else{W.k='clear';W.next=170+Math.random()*120;}
  for(const T of G.teams){const w=WEATHER[W.k];log(T.id,W.k==='clear'?'The weather is clearing.':`Weather: ${w.name}. ${w.tip}`,'w');}}
function simUpdate(dt){G.t+=dt;G.pfTok=Math.min(PF_BURST,(G.pfTok==null?PF_BURST:G.pfTok)+dt*PF_RATE);G.pfMs=0;G.pfN=0;if(!G.sandbox)weatherTick(dt);if(G.sandbox)sandboxTick(dt);production(dt);buildHash();if(!G.mines)G.mines=[];
  if(!G.aur)G.aur={morale:[],rof:[],heal:[],raid:[],dome:[],jam:[]};for(const k in G.aur)G.aur[k].length=0;G.cbrTeams=0;for(const e of G.ents){if(e.dead||e.isB)continue;const s=e.s;if(s.aura)G.aur[s.aura.t].push({team:e.team,x:e.x,y:e.y,r:s.aura.r,v:s.aura.v,id:e.id});if(s.intercept)G.aur.dome.push({team:e.team,x:e.x,y:e.y,r:s.intercept});if(s.jam)G.aur.jam.push({team:e.team,x:e.x,y:e.y,r:s.jam});if(s.cbr)G.cbrTeams|=1<<e.team;}
  if(G.aur.heal.length)for(const e of G.ents){if(e.dead||e.isB||e.hp>=e.max||e.s.dom==='air')continue;for(const a of G.aur.heal)if(a.team===e.team&&Math.hypot(a.x-e.x,a.y-e.y)<a.r){e.hp=Math.min(e.max,e.hp+a.v*dt);break;}}
  if(G.aur.jam.length)for(const e of G.ents){if(e.dead||e.kind!=='drone')continue;for(const a of G.aur.jam)if(!ally(a.team,e.team)&&Math.hypot(a.x-e.x,a.y-e.y)<a.r){applyDmg(e,30*dt,'flak',a.team,null);break;}}
  G.mT=(G.mT||0)-dt;if(G.mT<=0){G.mT=.2;updMines();}
  for(const T of G.teams){T._upl=false;T._tun=false;}for(const e of G.ents){if(!e.isB||e.dead||e.built<1)continue;const T=G.teams[e.team];if(!T)continue;if(e.kind==='tunnel')T._tun=true;else if(e.kind==='uplink'&&!(e.dis>G.t))T._upl=true;}
  for(const T of G.teams){if(!T.tun.length)continue;for(const u of T.tun)u.hp=Math.min(u.max,u.hp+12*dt);if(!T._tun){log(T.id,`Our last tunnel was destroyed. ${T.tun.length} units inside were lost.`,'w');T.tun=[];}}
  for(const T of G.teams){if(T._upl)T.charge=Math.min(T.sup.charge,T.charge+dt);for(const k in T.pw)if(T.pw[k].cd>0)T.pw[k].cd=Math.max(0,T.pw[k].cd-dt);
    {let j=0;for(const r of T.reveals){r.t-=dt;if(r.t>0)T.reveals[j++]=r;}T.reveals.length=j;}}
  // expired smoke screens and shields are dropped once a second (they were kept for the whole match and scanned every frame)
  if(!(G.prT>G.t)){G.prT=G.t+1;for(const k of ['smokes','shields'])if(Array.isArray(G[k])&&G[k].length){let j=0;const A=G[k];for(const S of A)if(S.t>G.t)A[j++]=S;A.length=j;}}
  for(const tm of G.timers){tm.t-=dt;if(tm.t<=0){tm.done=true;tm.fn();}}{let j=0;for(const t of G.timers)if(!t.done)G.timers[j++]=t;G.timers.length=j;}
  const n=G.ents.length;for(let i=0;i<n;i++){const e=G.ents[i];if(e.dead)continue;if(e.isB)updBld(e,dt);else{if(e.kind!=='jet'){e.va=lerpA(e.va,e.ang,dt*7);const tt=e.target&&!e.target.dead?Math.atan2(e.target.y-e.y,e.target.x-e.x):(e.order&&e.order.target&&!e.order.target.dead?Math.atan2(e.order.target.y-e.y,e.order.target.x-e.x):e.va);e.tang=lerpA(e.tang,tt,dt*8);}updUnit(e,dt);if(e.v&&e.vt!==G.t){const M=MOVE[e.s.cls]||[4,80];e.v=Math.max(0,e.v-M[1]*2.5*dt);if(e.v>1&&e.s.dom!=='air'&&e.kind!=='jet'){const nx=e.x+Math.cos(e.hd)*e.v*dt,ny=e.y+Math.sin(e.hd)*e.v*dt;if(passXY(e.s.dom,nx,ny)){e.x=nx;e.y=ny;e.mv=G.t;}}}}}
  updProj(dt);updStrikes(dt);separate();updOil(dt);
  {const E=G.ents;let j=0;for(let i=0;i<E.length;i++){const e=E[i];if(!e.dead&&!e.inTun)E[j++]=e;}E.length=j;}
  for(const T of G.teams)T.clr=false;for(const e of G.ents)if(e.kind==='cleric')G.teams[e.team].clr=true;
  {let thought=false;for(const T of G.teams)if(T.ai&&!T.out){if(!G.aiTT)G.aiTT=G.teams.map((_,i)=>i*.13);G.aiTT[T.id]-=dt;if(G.aiTT[T.id]<=0&&!thought){thought=true;G.aiTT[T.id]=DIFF[T.ai.d??1].think;aiThink(T);}}}
  G.visT-=dt;if(G.visT<=0){G.visT=.2;updateVis();}
  G.endT-=dt;if(G.endT<=0){G.endT=1;checkEnd();}}
const SEP_E=[];
function separate(){const groups=SEP_G;groups.ground.length=groups.naval.length=groups.air.length=0;let bn=0,bsum=0;for(const e of G.ents){if(e.dead)continue;if(e.isB){bn++;bsum+=e.id;continue;}if(!e.landed&&e.kind!=='jet')groups[e.s.dom].push(e);}const BC=160,BW=Math.ceil(MAPW/BC)+2,BG=G.bg||(G.bg=new Map());
  // buildings don't move: their grid is rebuilt only when the set of buildings changes (it was rebuilt every tick)
  const bsig=bn*1e7+bsum+BW;if(G.bgSig!==bsig){G.bgSig=bsig;for(const L of BG.values())L.length=0;for(const b of G.ents){if(!b.isB||b.dead)continue;const r=b.size/2+20,x0=Math.floor((b.x-r)/BC)+1,x1=Math.floor((b.x+r)/BC)+1,y0=Math.floor((b.y-r)/BC)+1,y1=Math.floor((b.y+r)/BC)+1;for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const k=xx+yy*BW,L=BG.get(k);if(L)L.push(b);else BG.set(k,[b]);}}}
  for(const dom in groups){const U=groups[dom],k=dom==='air'?.3:.5;for(let i=0;i<U.length;i++){const a=U[i];a.px=a.x;a.py=a.y;}
    const SG=G.sg||(G.sg=new Map()),SC=64,SW=Math.ceil(MAPW/SC)+2;for(const L of SG.values())L.length=0;for(let i=0;i<U.length;i++){const a=U[i];a.si=i;const k=Math.floor(a.x/SC)+1+(Math.floor(a.y/SC)+1)*SW;const L=SG.get(k);if(L)L.push(a);else SG.set(k,[a]);}
    for(let i=0;i<U.length;i++){const a=U[i];const cx=Math.floor(a.x/SC)+1,cy=Math.floor(a.y/SC)+1;for(let yy=cy-1;yy<=cy+1;yy++)for(let xx=cx-1;xx<=cx+1;xx++){const L=SG.get(xx+yy*SW);if(!L)continue;for(const b of L){if(b.si<=i)continue;const dx=b.x-a.x,dy=b.y-a.y,m=a.r+b.r;if(Math.abs(dx)>m||Math.abs(dy)>m)continue;const d=Math.hypot(dx,dy)||.01;if(d<m){const p=(m-d)*k*2,nx=dx/d,ny=dy/d,ma=massOf(a),mb=massOf(b),wa=mb/(ma+mb),wb=ma/(ma+mb);a.x-=nx*p*wa;a.y-=ny*p*wa;b.x+=nx*p*wb;b.y+=ny*p*wb;
          if(dom==='ground'&&(ma>=10||mb>=10)&&!ally(a.team,b.team)){const V=ma>=10?a:b,I=V===a?b:a;if(massOf(I)<2&&(V.v||0)>22&&!I.dead&&!I.inTun)applyDmg(I,I.max*3,'boom',V.team,V,0);}}}}
      if(dom==='ground')for(const b of (BG.get(Math.floor(a.x/BC)+1+(Math.floor(a.y/BC)+1)*BW)||SEP_E)){const h=b.size/2+a.r,dx=a.x-b.x,dy=a.y-b.y;if(Math.abs(dx)<h&&Math.abs(dy)<h){const px=h-Math.abs(dx),py=h-Math.abs(dy);if(px<py)a.x+=Math.sign(dx||1)*px;else a.y+=Math.sign(dy||1)*py;}}}
    if(dom!=='air')for(const a of U){if(!passXY(dom,a.x,a.y)){a.x=a.px;a.y=a.py;}}}
  for(const e of G.ents){if(e.kind==='jet')continue;e.x=Math.max(10,Math.min(MAPW-10,e.x));e.y=Math.max(10,Math.min(MAPH-10,e.y));}}

/* ---------- oil derricks (capture with infantry, Generals-style) ---------- */

/* ---------- oil derricks: capturable, and destructible ---------- */
const OIL_HP=1500;
/* ---------- City buildings: infantry can garrison them; any of them can be shot or shelled down ----------
   Each street-grid lot is one building. Up to 4-10 infantry (more in taller blocks) move in: they are safe inside
   and fire out at 20% longer range, while the building soaks up the damage. Rifles barely scratch it; shells,
   rockets, bombs and tank guns bring it down - and anyone inside is thrown out hurt. Rubble is passable. */
function initCiv(){const M=G.map;G.civ=[];G.civAt=new Map();(M.cityBlds||[]).forEach((b,i)=>{const k=Math.floor(b.y/CELL)*GW+Math.floor(b.x/CELL);let c=G.civAt.get(k);
    if(!c){c={i:G.civ.length,k,x:(k%GW)*CELL+CELL/2,y:Math.floor(k/GW)*CELL+CELL/2,b:[],h:0,dead:false,occ:[],g:null};G.civAt.set(k,c);G.civ.push(c);}c.b.push(i);c.h=Math.max(c.h,b.h);});
  for(const c of G.civ){c.max=c.hp=Math.round(600+c.h*16);c.cap=Math.min(10,4+Math.floor(c.h/18));}
  // ruined farmhouses in the countryside: low walls that 5 infantry can hold
  const R=mulberry((G.seed||1)*29+5),want=3+Math.round(2*WK);G.ruins=[];
  const ok=(x,y)=>{if(x<160||y<160||x>MAPW-160||y>MAPH-160)return false;if(Math.abs(M.depth(x,y))<M.hw(x)+120||M.mtn(x,y)>-60)return false;if(BASES.some(([bx,by])=>Math.hypot(x-bx,y-by)<560))return false;if(G.fields.some(f=>Math.hypot(f.x-x,f.y-y)<f.r+130))return false;if(G.oil.some(o=>Math.hypot(o.x-x,o.y-y)<150))return false;if(M.cityNear(x,y,90))return false;if(G.ruins.some(q=>Math.hypot(q.x-x,q.y-y)<500))return false;const k=Math.floor(y/CELL)*GW+Math.floor(x/CELL);return G.grid[k]===0;};
  for(let t=0;t<600&&G.ruins.length<want;t++){const x=R()*MAPW,y=R()*MAPH;if(!ok(x,y))continue;const c={i:G.civ.length,k:Math.floor(y/CELL)*GW+Math.floor(x/CELL),x,y,b:[],h:10,ruin:true,rot:R()*6.28,dead:false,occ:[],g:null,max:900,hp:900,cap:5};G.civ.push(c);G.ruins.push(c);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const kk=c.k+dy*GW+dx;if(!G.civAt.has(kk))G.civAt.set(kk,c);}}}
function civAtXY(x,y){if(!G.civAt)return null;const c=G.civAt.get(Math.floor(y/CELL)*GW+Math.floor(x/CELL));return c&&!c.dead?c:null;}
function canGarrison(u){return !u.isB&&!u.dead&&isInf(u.s)&&!u.s.noAttack&&u.kind!=='hacker'&&u.kind!=='harv'&&u.kind!=='dozer';}
function civTarget(c){const ALL=new Array(16).fill(true);return c.tg||(c.tg={civ:c,isB:true,kind:'civb',x:c.x,y:c.y,r:16,size:32,team:-1,vs:ALL,s:{name:'City building',armor:'bld'},get dead(){return c.dead||!!c.g;},get hp(){return c.hp;},get max(){return c.max;}});}
function damageCiv(c,d,team){if(c.dead||d<=0||c.g)return;c.hp-=d;c.hit=G.t;if(c.hp<=0)collapseCiv(c,team);}
function collapseCiv(c,team){if(c.dead)return;c.dead=true;c.hp=0;if(G.grid[c.k]===3)gridOpen(c.k);if(G.cover)G.cover[c.k]=Math.min(255,(G.cover[c.k]||0)+2);G.civDirty=true;
  const g=c.g;c.g=null;const occ=c.occ;c.occ=[];occ.forEach((u,i)=>{const a=i/Math.max(1,occ.length)*6.283;const p=nearestPassXY('ground',c.x+Math.cos(a)*30,c.y+Math.sin(a)*30)||[c.x,c.y];u.x=p[0];u.y=p[1];u.inTun=false;u.inGar=null;u.mv=G.t;u.order=null;u.target=null;u.hp*=.6;u.fear=(u.fear||0)+.5;G.ents.push(u);G.byId.set(u.id,u);});
  if(g&&!g.dead){g.dead=true;G.byId.delete(g.id);FXE('die',[g.id,g.x|0,g.y|0,KINDS.indexOf(g.kind),1,g.team]);}FXE('civd',[c.i]);if(occ.length)log(occ[0].team,`A building we held collapsed - ${occ.length} soldier${occ.length>1?'s':''} thrown clear.`,'w');}
function enterGarrison(u,c){if(c.dead){u.order=null;return;}if(c.g&&!ally(c.g.team,u.team)){u.order=null;return;}if(c.occ.length>=c.cap){u.order=null;log(u.team,`That building is full (${c.cap} troops).`,'w');return;}
  if(!c.g){const T=G.teams[u.team],s=bstats(T.fac,'garrison');const g={id:G.nid++,isB:true,team:u.team,kind:'garrison',s,civ:c,x:c.x,y:c.y,size:s.size,r:s.size/2,max:c.max,hp:c.hp,built:1,cd:0,target:null,ang:0,lastHit:-99,dis:0,vs:new Array(G.teams.length).fill(false)};G.ents.push(g);G.byId.set(g.id,g);c.g=g;}
  u.order=null;u.target=null;u.guard=null;u.inTun=true;u.inGar=c;u.x=c.x;u.y=c.y;G.byId.delete(u.id);c.occ.push(u);}
function leaveGarrison(c){const g=c.g;if(!g)return;const occ=c.occ;c.occ=[];occ.forEach((u,i)=>{const a=i/Math.max(1,occ.length)*6.283;const p=nearestPassXY('ground',c.x+Math.cos(a)*30,c.y+Math.sin(a)*30)||[c.x,c.y];u.x=p[0];u.y=p[1];u.inTun=false;u.inGar=null;u.mv=G.t;u.order=null;G.ents.push(u);G.byId.set(u.id,u);});
  c.hp=Math.max(1,g.hp);g.dead=true;G.byId.delete(g.id);c.g=null;FXE('gone',[g.id,g.x|0,g.y|0,-1,1]);}
// the soldiers inside shoot from the windows
function updGarrison(g,dt){const c=g.civ;if(!c||c.dead){g.dead=true;return;}c.hp=g.hp;if(!c.occ.length){leaveGarrison(c);return;}
  for(const u of c.occ){u.x=c.x;u.y=c.y;u.cd-=dt;u.hp=Math.min(u.max,u.hp+2*dt);u.fear=Math.max(0,(u.fear||0)-dt*.1);if(u.cd>0)continue;const R=u.s.rng*1.2;
    let t=u.target&&!u.target.dead&&Math.hypot(u.target.x-c.x,u.target.y-c.y)<R+u.target.r&&seenBy(u.team,u.target)?u.target:null;if(!t){t=nearestEnemy(u,R);u.target=t;}
    if(t){fire(u,t,u.s.dmg*dmgOut(u),u.s.wpn,u.s.splash||0);u.cd=u.s.rof*rofMult(u);g.lastFire=G.t;}}}
function oilTarget(o){const ALL=new Array(16).fill(true);return{oil:o,isB:true,kind:'derrick',x:o.x,y:o.y,r:18,size:36,team:-1,vs:ALL,s:{name:'Oil derrick',armor:'bld'},get dead(){return o.dead;},get hp(){return o.hp;},get max(){return o.max;}};}
function damageOil(o,d,team){if(o.dead||d<=0)return;if(team!=null&&ally(team,o.owner))return;o.hp-=d;o.hit=G.t;if(o.hp<=0)destroyOil(o,team);}
function destroyOil(o,team){const prev=o.owner;o.dead=true;o.hp=0;o.owner=-1;o.cp=o.cp.map(()=>0);o.burn=45;o.rep=0;
  FXE('boom',[o.x|0,o.y|0,30,1]);FXE('boom',[(o.x+14)|0,(o.y-6)|0,18,0]);
  if(team!=null&&team>=0)log(team,'Oil derrick destroyed.','g');if(prev>=0&&prev!==team)log(prev,'One of our oil derricks was destroyed!','w');}
const OILNB=[];let OIL_HERE=[];
function updOil(dt){const N=G.teams.length;const here=OIL_HERE.length===N?OIL_HERE:(OIL_HERE=new Array(N).fill(0));for(const o of G.oil){if(o.cp.length!==N)o.cp=new Array(N).fill(0);here.fill(0);for(const e of (G.hash?nearby(o.x,o.y,70,OILNB):G.ents)){if(e.dead||e.isB||e.s.dom!=='ground'||e.kind==='harv')continue;if(Math.abs(e.x-o.x)<60&&Math.abs(e.y-o.y)<60&&Math.hypot(e.x-o.x,e.y-o.y)<60)here[e.team]++;}
  const present=[];for(let t=0;t<N;t++)if(here[t])present.push(t);
  if(o.dead){o.burn=Math.max(0,o.burn-dt);if(present.length&&present.every(q=>ally(q,present[0]))){const t=present[0];o.cp[t]+=dt;if(o.cp[t]>=12){o.dead=false;o.hp=o.max*.4;o.owner=t;o.cp=o.cp.map(()=>0);log(t,'Oil derrick repaired and captured.','g');}}else for(let t=0;t<N;t++)if(!here[t])o.cp[t]=Math.max(0,o.cp[t]-dt*.5);continue;}
  for(let t=0;t<N;t++){if(here[t]&&present.every(q=>ally(q,t))&&!ally(o.owner,t)){o.cp[t]+=dt;if(o.cp[t]>=6){const prev=o.owner;o.owner=t;o.cp=o.cp.map(()=>0);log(t,'Oil derrick captured.','g');if(prev>=0&&prev!==t)log(prev,'An oil derrick was captured by the enemy!','w');}}else if(!here[t])o.cp[t]=Math.max(0,o.cp[t]-dt*.5);}
  if(o.hp<o.max&&G.t-(o.hit??-99)>8)o.hp=Math.min(o.max,o.hp+o.max*.01*dt);
  if(o.owner>=0){o.inc+=dt;if(o.inc>=2){o.inc=0;const T=G.teams[o.owner];T.credits+=Math.round(14*(T.F.mods.oil||1)*(G.bs||1));}}}
  econTick(dt);}
// income buildings pay every 2 seconds; a team's extra ones earn less each
function econTick(dt){G.ecT=(G.ecT||0)+dt;if(G.ecT<2)return;G.ecT-=2;const per={};for(const b of G.ents){if(b.dead||!b.isB||b.kind!=='econ'||b.built<1)continue;const k=per[b.team]=(per[b.team]||0)+1;const T=G.teams[b.team];if(T.dummy)continue;
  const v=b.s.inc*2*(ECON_RATE[k-1]||0)*((b.dis||0)>G.t?0:1);b.acc=(b.acc||0)+v;const w=Math.floor(b.acc);if(w>0){b.acc-=w;T.credits+=w;}}}

/* ---------- Test Range: unlimited money, everything unlocked and fast to build, and a passive target enemy ---------- */
function sbSpot(team,kind,anchor,r0,r1){for(let k=0;k<160;k++){const a=rnd(0,6.28),r=rnd(r0,r1),x=anchor.x+Math.cos(a)*r,y=anchor.y+Math.sin(a)*r;if(validSpot(team,kind,x,y))return[x,y];}return null;}
function sandboxSetup(){const P=G.teams[0],D=G.teams[1];P.credits=999999;P.gxp=RANKS[RANKS.length-1];promoteGeneral(P);D.dummy=true;D.fight=false;D.ai=null;
  const hq=G.ents.find(e=>e.team===0&&e.kind==='hq');for(const k of ['barracks','factory','airfield','shipyard']){if(!bldAllowed(P.fac,k))continue;const p=STRUCT[k].shore?sbSpot(0,k,hq,150,900):sbSpot(0,k,hq,170,420);if(p)addBld(0,k,p[0],p[1],true);}
  for(let i=0;i<2;i++)addUnit(0,'dozer',hq.x+rnd(-80,80),hq.y+rnd(-80,80));
  const dh=G.ents.find(e=>e.team===1&&e.kind==='hq');for(const k of ['barracks','factory','turret','sam']){const p=sbSpot(1,k,dh,170,380);if(p)addBld(1,k,p[0],p[1],true);}
  sandboxTargets();P.reveals.push({x:MAPW/2,y:MAPH/2,r:9999,t:1e12});log(0,'TEST RANGE: unlimited money, everything unlocked, builds 6x faster. The enemy does not fight back unless you switch it on.','g');}
function sandboxTargets(){const dh=G.ents.find(e=>e.team===1&&e.isB&&!e.dead)||{x:BASES[1][0],y:BASES[1][1]};const a=Math.atan2(MAPH/2-dh.y,MAPW/2-dh.x);
  const cx=dh.x+Math.cos(a)*330,cy=dh.y+Math.sin(a)*330;const put=(k,n)=>{for(let i=0;i<n;i++){const p=nearestPassXY(stats(G.teams[1].fac,k).dom,cx+rnd(-150,150),cy+rnd(-150,150));if(p){const u=addUnit(1,k,p[0],p[1]);u.ang=u.va=u.hd=a+Math.PI;}}};
  put('inf',6);put('at',2);put('tank',3);put('aa',1);put('arty',1);put('heli',1);if(G.map.hasWater){const w=nearestPassXY('naval',cx,cy);if(w){const u=addUnit(1,'boat',w[0],w[1]);}}
  if(!G.ents.some(e=>e.team===1&&e.kind==='hq'&&!e.dead)){const p=sbSpot(1,'hq',{x:BASES[1][0],y:BASES[1][1]},0,200);if(p)addBld(1,'hq',p[0],p[1],true);}}
function sandboxTick(dt){const P=G.teams[0];if(P.credits<900000)P.credits=999999;for(const k in P.pw)if(P.pw[k].cd>0)P.pw[k].cd=0;if(working(0,'uplink'))P.charge=P.sup.charge;
  const left=G.ents.filter(e=>e.team===1&&!e.dead&&!e.isB).length;if(left===0){G.sbT=(G.sbT||0)+dt;if(G.sbT>4){G.sbT=0;sandboxTargets();log(0,'New targets have arrived.','g');}}else G.sbT=0;}

