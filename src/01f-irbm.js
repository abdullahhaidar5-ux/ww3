/* ---- IR Zolfaghar Missile Launcher (Abdullah 2026-11-15 00:19 "Give the Iranians something else besides a shahed truck what's the point" -> his pick: a BALLISTIC MISSILE TRUCK) ----
   A War Factory vehicle, separate from the Fateh-110 launcher (arty slot): far longer reach, ONE big guided missile per launch, slow reload, expensive, max 2.
   The shot is a G.strikes entry of kind 'bm' (flight time grows with distance, saved in checkpoints like every strike): it can be shot down in flight by
   missile-defence sites, Iron-Dome-type batteries and flak AA near the target (updStrikes in 03-sim). Military targets only (it fires at what the unit targets).
   The AI builds one only when rich (AI filter in 03-sim). Iran has no Shahed launcher truck: the Shahed-136 drone is its drone slot. */
BASE.bmt=Object.assign({},BASE.arty,{name:'Zolfaghar Missile Launcher',rocket:true,missile:true,rng:900,minr:260,dmg:760,splash:105,rof:32,hp:260,cost:1900,time:24,limit:2,
  desc:'One big guided ballistic missile per launch, from far beyond any gun. Reloads slowly, costs a lot, you can have two. Air defence (missile-defence sites, Iron Dome, flak) can shoot it down in flight. Fragile: hide it behind your lines.'});
if(typeof KINDS!=='undefined'&&!KINDS.includes('bmt'))KINDS.push('bmt');
{const F=FACTIONS.IR;if(F){F.extra=[...(F.extra||[]),'bmt'].filter((k,i,a)=>a.indexOf(k)===i);F.units=F.units||{};F.units.bmt=Object.assign({},F.units.bmt||{},{name:'Zolfaghar Missile Launcher'});}}
/* the launch: called from fire() for any unit whose stats say missile:true */
function bmLaunch(src,t,dmg,splash){const d=Math.hypot(t.x-src.x,t.y-src.y),ft=+(2.5+d/300).toFixed(2),r=splash||105;
  G.strikes.push({x:t.x,y:t.y,t:ft,r,dmg,team:src.team,kind:'bm'});
  FXE('strike',[t.x|0,t.y|0,ft,r|0,1,1],src.team);FXE('bmis',[src.x|0,src.y|0,t.x|0,t.y|0,ft,0]);
  if(t.team!=null&&t.team>=0&&G.teams[t.team]&&!ally(t.team,src.team)&&G.t-(G.teams[t.team].bmWarn??-99)>8){G.teams[t.team].bmWarn=G.t;log(t.team,'Warning: enemy ballistic missile inbound. Move your units!','r:msl',t.x,t.y);}}
