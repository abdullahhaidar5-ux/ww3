// ===== 12-campaign: single-player mini-campaign for the Shia factions (IR, RS, DW) =====
// Five scripted missions on the real simulation and the existing maps. Scripting runs on the host of a single-player
// battle only (MODE 'single'); skirmish and online play never touch this. Randomness is a seeded mulberry (c.R).
// Fiction: the opposing side is always a generic "coalition" - no real people or real recent events are depicted.
const CAMP_KEY='ww3camp1',CAMP_DIFF=['Easy','Medium','Hard'],CAMP_MUL=[.7,1,1.4];
function campLoad(){try{return JSON.parse(localStorage.getItem(CAMP_KEY))||{};}catch(e){return {};}}
function campStore(id,diff,t){try{const s=campLoad();const r=s[id]||(s[id]={});const k=CAMP_DIFF[diff];if(!r[k]||t<r[k])r[k]=Math.round(t);localStorage.setItem(CAMP_KEY,JSON.stringify(s));}catch(e){}}

// ---------- helpers (all deterministic given the seed) ----------
const CH={
  ax(){const P=BASES[0],E=BASES[1];return{P,E,dx:E[0]-P[0],dy:E[1]-P[1]};},
  // a point along the line from our base (t=0) to the far base (t=1), o = sideways offset in world units
  pt(t,o,dom){const a=CH.ax(),L=Math.hypot(a.dx,a.dy)||1;let x=a.P[0]+a.dx*t-a.dy/L*(o||0),y=a.P[1]+a.dy*t+a.dx/L*(o||0);x=Math.max(60,Math.min(MAPW-60,x));y=Math.max(60,Math.min(MAPH-60,y));return nearestPassXY(dom||'ground',x,y)||[x,y];},
  has(fac,k){try{return !!stats(fac,k);}catch(e){return false;}},
  unit(team,kind,x,y){const f=G.teams[team].fac;if(!CH.has(f,kind))kind='inf';const p=nearestPassXY(stats(f,kind).dom||'ground',x,y)||[x,y];const u=addUnit(team,kind,p[0],p[1]);const c=G.camp;if(c&&c.ehp&&team===G.teams.length-1&&u)u.hp=u.max=Math.round(u.max*c.ehp);return u;},
  units(team,kind,n,x,y,spread){const c=G.camp,out=[];n=Math.max(0,Math.round(n));for(let i=0;i<n;i++)out.push(CH.unit(team,kind,x+(c.R()-.5)*2*(spread||60),y+(c.R()-.5)*2*(spread||60)));return out;},
  bld(team,kind,x,y){const f=G.teams[team].fac;if(kind!=='hq'&&!bldAllowed(f,kind))return null;for(let k=0;k<120;k++){const r=k*7,a=k*2.4,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(k===0||validSpot(team,kind,px,py))return addBld(team,kind,px,py,true);}return null;},
  base(team,x,y){const hq=CH.bld(team,'hq',x,y);if(!hq)return null;CH.unit(team,'harv',hq.x+120,hq.y+40);CH.unit(team,'dozer',hq.x+90,hq.y-100);return hq;},
  go(team,us,x,y,amove){us=us.filter(u=>u&&!u.dead);if(us.length)act(team,{t:'go',ids:us.map(u=>u.id),x,y,mode:amove?'amove':'move'});},
  alive(a){return a.filter(u=>u&&!u.dead);},
  combat(team){let n=0;for(const e of G.ents)if(e.team===team&&!e.dead&&!e.isB&&e.kind!=='harv'&&e.kind!=='dozer')n++;return n;},
  count(team,kind){let n=0;for(const e of G.ents)if(e.team===team&&!e.dead&&(kind==null||e.kind===kind))n++;return n;},
  blds(team){return G.ents.filter(e=>e.team===team&&e.isB&&!e.dead);},
  near(team,x,y,r){let n=0;for(const e of G.ents)if(e.team===team&&!e.dead&&!e.isB&&Math.hypot(e.x-x,e.y-y)<r)n++;return n;},
  say(m,k){try{log(0,m,k||'g');}catch(e){}},
  enemyName(team,name){const T=G.teams[team];T.F=Object.assign(Object.create(Object.getPrototypeOf(T.F)),T.F,{name});},
  tag(us,name,hp){for(const u of us){u.s=Object.assign({},u.s,{name});if(hp){u.hp=u.max=hp;}}}
};

// ---------- the five missions ----------
const CAMPAIGN=[
{id:'pass',n:1,title:'Hold the Pass',sub:'Lebanese Shia · Ridge defense',fac:'RS',enemy:'DE',enemyName:'Invasion Force',map:'khyber',
 brief:['An invasion force is pushing up the only road into our valleys. Our main columns are still two hours away on the mountain tracks.','You hold a ridge above the road with a small garrison: riflemen, anti-tank teams, two tanks and a few emplacements. Hold it. Every minute you stand buys the valley time.','When the reinforcements arrive, do not let the enemy rest: take the fight back down the pass and destroy their forward base.'],
 obj:[['hold','Hold the ridge until reinforcements arrive'],['reinf','Reinforcements arrive'],['crush','Destroy the enemy forward base']],
 win:'The pass is ours. The valley is safe, and the road is closed to the invaders.',lose:'The ridge has fallen. The valley will have to be defended from the next line.',
 setup(c){const d=c.mul;c.T=360;const R=CH.pt(.2,0),F=CH.pt(.1,0);c.ridge=R;c.focus=R;G.teams[0].credits=400;
  CH.base(0,BASES[0][0],BASES[0][1]);const g=[];
  g.push(...CH.units(0,'inf',Math.round(14/Math.max(.8,d)+2),R[0],R[1],70),...CH.units(0,'at',4,R[0],R[1],50),...CH.units(0,'tank',2,R[0],R[1],50));
  for(const o of [-120,0,120]){const p=CH.pt(.23,o);CH.bld(0,'turret',p[0],p[1]);}c.garrison=g;
  CH.base(1,BASES[1][0],BASES[1][1]);const q=CH.pt(.86,0);for(const o of [-130,0,130]){const p=CH.pt(.8,o);CH.bld(1,'turret',p[0],p[1]);}CH.bld(1,'barracks',q[0],q[1]);
  G.teams[1].credits=500;c.wave=0;c.nextWave=25;c.armies=[];},
 tick(c,dt){const d=c.mul;
  if(c.t<c.T+60&&c.t>=c.nextWave){c.nextWave+=Math.round(48/Math.max(.7,d)),c.wave++;const k=c.wave,s=CH.pt(.8,0);let us=[...CH.units(1,'inf',(5+k*1.6)*d,s[0],s[1],90),...CH.units(1,'at',1+k*.4*d,s[0],s[1],70)];if(k>=3)us.push(...CH.units(1,'tank',(k-1)*.7*d,s[0],s[1],70));if(k>=5)us.push(...CH.units(1,'arty',d>1?2:1,s[0],s[1],70));CH.go(1,us,c.ridge[0],c.ridge[1],true);if(k===1)CH.say('Contact! Enemy column on the road below the ridge.','w');}
  if(!c.o.reinf&&c.t>=c.T){c.o.hold=c.o.reinf=true;const b=CH.pt(.02,0);const r=[...CH.units(0,'inf',10,b[0],b[1],90),...CH.units(0,'tank',5,b[0],b[1],90),...CH.units(0,'at',3,b[0],b[1],60),...CH.units(0,'arty',2,b[0],b[1],60)];CH.go(0,r,c.ridge[0],c.ridge[1],true);CH.say('Reinforcements have arrived on the mountain track! Counter-attack - drive them off the pass.','g');G.teams[0].credits+=1500;}
  if(c.o.reinf&&!c.o.crush&&CH.blds(1).length===0)c.o.crush=true;
  if(c.o.crush)c.win();
  else if(!c.o.reinf&&c.t>5&&CH.combat(0)===0)c.lose('Every defender on the ridge has fallen.');
  else if(!CH.blds(0).some(b=>b.kind==='hq')&&CH.combat(0)===0)c.lose('Headquarters and garrison are gone.');
  c.status=c.o.reinf?null:'Reinforcements in '+campClock(c.T-c.t);}},

{id:'supply',n:2,title:'Supply Run',sub:'Zaidi Shia Movement · Convoy escort',fac:'DW',enemy:'US',enemyName:'Siege Force',map:'plateau',
 brief:['A highland town is surrounded. Its people have food for days, not weeks, and the road in is held by irregulars and raiders of the besieging force.','Six supply trucks are loaded at your depot. Escort them across the plateau to the town. Expect ambushes from the ridges and the dry riverbeds - they will hit the trucks first.','At least four trucks must reach the town. Scout ahead, keep the escort close, and do not drive blind into the narrows.'],
 obj:[['half','Cross the plateau to the halfway ridge'],['clear','Break the siege line around the town'],['deliver','Deliver at least 4 of 6 trucks to the town']],
 win:'The convoy has reached the town. The siege is broken and the people eat tonight.',lose:'The convoy is lost. The town is on its own.',
 setup(c){const d=c.mul;const B=BASES[0];G.teams[0].credits=600;CH.base(0,B[0],B[1]);const s=CH.pt(.07,0);c.focus=s;
  const esc=[...CH.units(0,'inf',8,s[0],s[1],110),...CH.units(0,'tank',4,s[0],s[1],110),...CH.units(0,'at',2,s[0],s[1],70),...CH.units(0,'aa',1,s[0],s[1],70)];
  c.trucks=CH.units(0,'dozer',6,s[0]-60,s[1]+30,60);CH.tag(c.trucks,'Supply Truck',420);
  const town=CH.pt(.86,0);c.town=town;c.half=CH.pt(.5,0);
  for(const o of [-90,90]){const p=CH.pt(.88,o);CH.bld(0,'turret',p[0],p[1]);}CH.units(0,'inf',4,town[0],town[1],60);
  CH.base(1,BASES[1][0],BASES[1][1]);G.teams[1].credits=300;
  c.siege=[];for(const o of [-200,-80,80,200]){const p=CH.pt(.77,o);c.siege.push(...CH.units(1,'inf',Math.round(4*d),p[0],p[1],60),...CH.units(1,'tank',Math.round(1*d),p[0],p[1],60));}
  for(const o of [-170,120]){const p=CH.pt(.8,o);CH.bld(1,'turret',p[0],p[1]);}
  c.amb=[];for(const [t,o] of [[.26,300],[.4,-320],[.6,290],[.68,-260]]){const p=CH.pt(t,o);c.amb.push({t,pos:p,fired:false,us:[...CH.units(1,'inf',Math.round(5*d),p[0],p[1],50),...CH.units(1,'at',Math.round(2*d),p[0],p[1],40),...(t>.5?CH.units(1,'tank',Math.round(1*d),p[0],p[1],40):[])]});}},
 tick(c,dt){const tr=CH.alive(c.trucks);
  for(const a of c.amb){if(a.fired)continue;let hit=null;for(const u of tr){if(Math.hypot(u.x-a.pos[0],u.y-a.pos[1])<420){hit=u;break;}}if(hit){a.fired=true;CH.go(1,a.us,hit.x,hit.y,true);CH.say('Ambush! Raiders are coming down from the ridge.','w');
    if(a.t>.5){const b=CH.pt(a.t-.12,0),us=CH.units(1,'inf',Math.round(4*c.mul),b[0],b[1],50);CH.go(1,us,hit.x,hit.y,true);}}}
  if(!c.o.half&&tr.some(u=>Math.hypot(u.x-c.half[0],u.y-c.half[1])<260)){c.o.half=true;CH.say('Halfway ridge passed. The besieged town is ahead.','g');}
  let got=0;for(const u of c.trucks){if(!u.dead&&Math.hypot(u.x-c.town[0],u.y-c.town[1])<190){u.delivered=true;}if(u.delivered)got++;}
  c.status='Trucks delivered '+got+'/6 · alive '+tr.length;
  if(!c.o.clear&&CH.alive(c.siege).length<=Math.round(2*c.mul))c.o.clear=true;
  if(got>=4){c.o.deliver=true;c.win();}
  else if(tr.length+0<4&&got+tr.length<4)c.lose('Too many supply trucks were lost.');
  else if(CH.combat(0)===0&&tr.length&&got<4)c.lose('The escort is gone.');}},

{id:'fortress',n:3,title:'Mountain Fortress',sub:'Iran · Build and defend',fac:'IR',enemy:'US',enemyName:'Coalition Task Force',map:'zagros',
 brief:['Our command post sits in a mountain valley that the enemy must take to open the road to the plains. They will come in waves - infantry first, then armor, then everything they have.','Build a Mountain Fortress: five thousand tons of rock-cut bunker, with room for twenty fighters. Garrison it, dig in, and keep the engineers repairing.','Late in the battle the enemy will bring bunker-busting bombs. Warnings will sound. Get the garrison out of the fortress before the bombs fall, repair what you can, and do not lose headquarters. Hold until relief arrives at twelve minutes.'],
 obj:[['fort','Build the Mountain Fortress'],['hold','Hold headquarters until relief arrives'],['bb','Survive the bunker-buster strikes']],
 win:'Relief columns have arrived. The valley held.',lose:'Headquarters has fallen. The valley is lost.',
 setup(c){const B=BASES[0];G.teams[0].credits=Math.round(7000/Math.max(.85,c.mul));c.T=720;c.focus=[B[0],B[1]];const hq=CH.base(0,B[0],B[1]);CH.unit(0,'dozer',B[0]+60,B[1]+110);
  for(const k of ['barracks','factory']){const p=sbSpot(0,k,hq,170,360);if(p)addBld(0,k,p[0],p[1],true);}
  CH.units(0,'inf',8,B[0]+160,B[1],90);CH.units(0,'at',3,B[0]+160,B[1],60);for(const o of [-150,150]){const p=CH.pt(.1,o);CH.bld(0,'turret',p[0],p[1]);}
  CH.base(1,BASES[1][0],BASES[1][1]);G.teams[1].credits=0;c.wave=0;c.next=45;c.bb=[[500,525],[640,665]];c.bbDone=0;},
 tick(c,dt){const d=c.mul,hq=CH.blds(0).find(b=>b.kind==='hq');
  if(c.t>=c.next&&c.t<c.T-30){c.wave++;c.next+=Math.round(62/Math.max(.75,d));const k=c.wave,s=CH.pt(.88,0);let us=[...CH.units(1,'inf',(5+k*1.7)*d,s[0],s[1],100)];if(k>=2)us.push(...CH.units(1,'at',k*.5*d,s[0],s[1],70));if(k>=3)us.push(...CH.units(1,'tank',(k-1)*.9*d,s[0],s[1],80));if(k>=7)us.push(...CH.units(1,'arty',2,s[0],s[1],70));if(k>=8)us.push(...CH.units(1,'heli',d>1?3:2,s[0],s[1],70));
   const T0=hq||{x:BASES[0][0],y:BASES[0][1]};CH.go(1,us,T0.x,T0.y,true);CH.say('Wave '+k+': enemy column approaching from the plains.','w');}
  const fort=G.ents.find(e=>e.team===0&&e.kind==='fort'&&!e.dead&&e.built>=1);if(fort)c.o.fort=true;if(fort)c.fortSeen=true;
  for(let i=0;i<c.bb.length;i++){const w=c.bb[i];if(c.bbDone===i&&c.t>=w[0]&&!w.warn){w.warn=true;CH.say('WARNING: bunker-buster aircraft inbound on the Fortress. Evacuate the garrison now!','bad');}
   if(c.bbDone===i&&c.t>=w[1]){c.bbDone++;const f=G.ents.find(e=>e.team===0&&e.kind==='fort'&&!e.dead);const tg=f||hq;if(tg){addStrike(tg.x,tg.y,3,POWERS.bb.r||150,1500,1,'bb');CH.say('Bunker-buster bombs falling!','bad');}}}
  if(c.bbDone>=c.bb.length&&c.t>c.bb[1][1]+8)c.o.bb=true;
  if(c.t>=c.T&&hq){c.o.hold=true;c.win();}
  else if(!hq)c.lose('Headquarters was destroyed.');
  c.status=c.t<c.T?'Relief in '+campClock(c.T-c.t)+' · wave '+c.wave:null;}},

{id:'town',n:4,title:'Retake the Town',sub:'Lebanese Shia + Zaidi Shia Movement · Street fight',fac:'RS',ally:'DW',enemy:'DE',enemyName:'Occupation Force',map:'aleppo',
 brief:['An occupation force has seized the old town at the crossroads. Its streets and rooftops are held by infantry and anti-tank teams, with armor in the squares.','Lebanese Shia and Zaidi Shia Movement fight side by side: our riflemen and mortars with their mobile technicals. The ally is controlled by its own commander - give it room and follow its lead on the flanks.','Clear the town street by street. Put infantry into buildings to hold ground you have taken - garrisoned riflemen are hard to dislodge. The enemy will counter-attack with reserves.'],
 obj:[['z0','Clear the southern approach'],['z1','Clear the west quarter'],['z2','Clear the east quarter'],['z3','Take the citadel square'],['z4','Clear the far gate'],['gar','Garrison a building to hold ground']],
 win:'The town is free. Both flags fly over the citadel.',lose:'The assault has failed. Our columns fall back.',
 setup(c){const d=c.mul,B=BASES[0],C=[MAPW/2,MAPH/2],E=BASES[1];const ang=Math.atan2(C[1]-B[1],C[0]-B[0]),nx=-Math.sin(ang),ny=Math.cos(ang),ux=Math.cos(ang),uy=Math.sin(ang);
  const Rt=290*WK;c.zr=Rt*.33;const zp=(f,s)=>{const x=C[0]-ux*Rt*f+nx*Rt*s,y=C[1]-uy*Rt*f+ny*Rt*s;return nearestPassXY('ground',x,y)||[x,y];};
  c.zones=[zp(.72,0),zp(.15,-.55),zp(.15,.55),[C[0],C[1]],zp(-.72,0)];c.focus=zp(1.3,0);
  G.teams[0].credits=1200;G.teams[1].credits=1000;c.ehp=1.7;
  const hq=CH.base(0,B[0],B[1]);const a=[B[0]+nx*420,B[1]+ny*420];CH.base(1,a[0],a[1]);
  const m0=zp(1.35,-.15),m1=zp(1.35,.35);
  c.me=[...CH.units(0,'inf',14,m0[0],m0[1],80),...CH.units(0,'at',4,m0[0],m0[1],60),...CH.units(0,'tank',2,m0[0],m0[1],60),...CH.units(0,'arty',2,m0[0],m0[1],50)];
  c.ally=[...CH.units(1,'inf',12,m1[0],m1[1],80),...CH.units(1,'tank',4,m1[0],m1[1],60),...CH.units(1,'at',3,m1[0],m1[1],50)];
  c.foe=[];c.zoneFoe=c.zones.map((p,i)=>{const us=[...CH.units(2,'inf',Math.round((9+i*1.5)*d),p[0],p[1],c.zr*.7),...CH.units(2,'at',Math.round(3*d),p[0],p[1],c.zr*.6),...(i>=2?CH.units(2,'tank',Math.round((i>=3?2.5:1)*d),p[0],p[1],c.zr*.5):[])];c.foe.push(...us);return us;});
  c.raid=[[150,.6],[300,.8],[450,1]];c.done=[false,false,false,false,false];c.nextOrder=8;},
 tick(c,dt){const d=c.mul;
  const gate=[()=>true,()=>c.done[0],()=>c.done[0],()=>c.done[1]&&c.done[2],()=>c.done[3]];
  for(let i=0;i<5;i++){if(c.done[i]||!gate[i]())continue;const p=c.zones[i];const foes=CH.near(2,p[0],p[1],c.zr*1.15),mine=CH.near(0,p[0],p[1],c.zr*1.4)+CH.near(1,p[0],p[1],c.zr*1.4);if(foes<=2&&mine>0&&CH.alive(c.zoneFoe[i]).length<=Math.round(c.zoneFoe[i].length*.15)){c.done[i]=true;c.o['z'+i]=true;CH.say(['Southern approach clear.','West quarter clear.','East quarter clear.','Citadel square taken!','Far gate clear.'][i],'g');}}
  if(!c.o.gar){for(const k of (G.civ||[]))if(k.occ&&k.occ.some(u=>u.team<2)){c.o.gar=true;break;}}
  for(const r of c.raid){if(!r.fired&&c.t>=r[0]){r.fired=true;const s=CH.pt(.96,0),us=[...CH.units(2,'inf',(10+r[1]*6)*d,s[0],s[1],90),...CH.units(2,'tank',(2+r[1]*3)*d,s[0],s[1],70)];c.foe.push(...us);const z=c.zones[c.done[3]?2:3];CH.go(2,us,z[0],z[1],true);CH.say('Enemy reserves are counter-attacking from the east!','w');}}
  if(c.t>=c.nextOrder){c.nextOrder+=26;const k=c.done.findIndex(x=>!x);if(k>=0){const z=c.zones[k],o=(k%2?1:-1)*c.zr*.5;CH.go(1,c.ally,z[0]+o,z[1]-o,true);}
   if(c.t%104<26)CH.go(1,CH.units(1,'inf',4,CH.ax().P[0]+300,CH.ax().P[1]+300,60).concat(c.ally),c.zones[Math.max(0,k)][0],c.zones[Math.max(0,k)][1],true);}
  c.ally=CH.alive(c.ally);
  const left=c.done.filter(x=>!x).length;c.status=left?left+' district'+(left>1?'s':'')+' left to clear':null;
  if(c.done.every(x=>x))c.win();
  else if(CH.combat(0)===0&&G.teams[0].credits<200)c.lose('Our assault force is spent.');
  else if(!CH.blds(0).some(b=>b.kind==='hq')&&CH.combat(0)===0)c.lose('Base and assault force lost.');}},

{id:'finale',n:5,title:'Combined Arms',sub:'Iran · Final assault',fac:'IR',enemy:'RU',enemyName:'Northern Group',map:'plateau',
 brief:['This is the strike that ends the offensive. The enemy has dug a fortified base on the plateau: air-defence sites on the approaches, armor in depth, a War Factory and a command post at the back.','You command a combined force: loitering drones, missile launchers, armor and infantry. Drones cannot survive the air defenses - break the SAM sites first with launchers and tanks, then let the drones tear the base apart.','Take out the air defenses, destroy the vehicle factory, then the headquarters. The enemy commander will fight back with everything he builds.'],
 obj:[['sam','Destroy the enemy air-defence sites'],['fac','Destroy the vehicle factory'],['hq','Destroy the enemy headquarters']],
 win:'The enemy command post is rubble. The offensive is over.',lose:'The assault force is destroyed.',
 setup(c){const d=c.mul,B=BASES[0];G.teams[0].credits=3500;const s=CH.pt(.14,0);c.focus=s;CH.base(0,B[0],B[1]);
  const hq=G.ents.find(e=>e.team===0&&e.kind==='hq');for(const k of ['barracks','factory']){const p=sbSpot(0,k,hq,170,360);if(p)addBld(0,k,p[0],p[1],true);}
  CH.units(0,'drone',8,s[0],s[1],90);CH.units(0,'arty',5,s[0],s[1],90);CH.units(0,'tank',8,s[0],s[1],110);CH.units(0,'inf',12,s[0],s[1],110);CH.units(0,'at',4,s[0],s[1],70);CH.units(0,'aa',2,s[0],s[1],70);
  const E=BASES[1];const T=G.teams[1];T.credits=3000;CH.base(1,E[0],E[1]);const ehq=G.ents.find(e=>e.team===1&&e.kind==='hq');
  for(const k of ['barracks','factory']){const p=sbSpot(1,k,ehq,170,320);if(p)addBld(1,k,p[0],p[1],true);}
  for(const o of [-260,-90,90,260]){const p=CH.pt(.8,o);CH.bld(1,'turret',p[0],p[1]);}
  for(const o of [-200,0,200]){const p=CH.pt(.9,o);CH.bld(1,'sam',p[0],p[1]);}
  const q=CH.pt(.85,0);CH.units(1,'tank',Math.round(5*d),q[0],q[1],140);CH.units(1,'inf',Math.round(10*d),q[0],q[1],140);CH.units(1,'at',Math.round(4*d),q[0],q[1],100);CH.units(1,'aa',2,q[0],q[1],100);
  T.ai=mkAI(c.diff);},
 tick(c,dt){const sam=CH.count(1,'sam'),fac=CH.count(1,'factory'),hq=CH.count(1,'hq');
  if(!c.o.sam&&sam===0){c.o.sam=true;CH.say('Air defenses down - the drones have a free sky.','g');}
  if(!c.o.fac&&fac===0)c.o.fac=true;if(!c.o.hq&&hq===0)c.o.hq=true;
  c.status=null;if(c.o.hq)c.win();
  else if(CH.combat(0)===0&&G.teams[0].credits<250)c.lose('The assault force is destroyed.');
  else if(!CH.blds(0).some(b=>b.kind==='hq')&&CH.combat(0)===0)c.lose('Base and force lost.');}}
];
function campClock(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

// ---------- engine hooks (called from newGame / simUpdate; host of a single-player battle only) ----------
function campSetup(o){
  const m=CAMPAIGN.find(x=>x.id===o.id);if(!m)return;
  const c=G.camp={m,id:m.id,diff:o.diff|0,mul:CAMP_MUL[o.diff|0],t:0,o:{},over:false,R:mulberry((G.seed|0)*31+m.n),status:null,focus:null,t0:0,
   win(){if(this.over)return;this.over=true;this.res='win';},lose(why){if(this.over)return;this.over=true;this.res='lose';this.why=why||'';}};
  for(const [k] of m.obj)c.o[k]=false;
  G.teams.forEach((T,i)=>{T.ai=null;});
  G.teams[0].camp=1;
  const en=G.teams.length-1;CH.enemyName(en,m.enemyName);
  m.setup(c);
  c.n0=CH.combat(0);
  G.camp.lost0=0;
}
function campTick(dt){
  const c=G.camp;if(!c||G.over)return;
  if(!c.started){c.started=1;if(c.focus&&typeof centerOn==='function'){try{centerOn(c.focus[0],c.focus[1]);}catch(e){}}}
  if(c.over){if(!c.fin){c.fin=1;campFinish();}return;}
  c.t+=dt;try{c.m.tick(c,dt);}catch(e){console.error('campaign tick',e);c.m.tickErr=1;}
}
function campFinish(){
  const c=G.camp,won=c.res==='win';G.over=true;
  if(won)campStore(c.id,c.diff,c.t);
  try{campDebrief(c,won);}catch(e){console.error(e);}
}

// ---------- UI: menu button, mission list, briefing, objectives panel, debrief ----------
function campEl(tag,css,html){const e=document.createElement(tag);if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;return e;}
const CAMP_CSS='position:fixed;inset:0;z-index:9000;background:rgba(6,8,10,.94);color:#e8e4d8;font-family:inherit;overflow:auto;padding:16px;box-sizing:border-box;';
function campClose(){const e=document.getElementById('campScreen');if(e)e.remove();}
function campShow(inner){campClose();const e=campEl('div',CAMP_CSS);e.id='campScreen';const w=campEl('div','max-width:760px;margin:0 auto;');w.appendChild(inner);e.appendChild(w);document.body.appendChild(e);return e;}
function campBtn(txt,fn,ghost){const b=campEl('button','font-size:18px;padding:14px 22px;margin:6px 8px 6px 0;border-radius:8px;border:1px solid #6b7a55;background:'+(ghost?'transparent':'#4f6b32')+';color:#fff;cursor:pointer;min-height:48px;',txt);b.type='button';b.onclick=fn;return b;}
function campMenu(){
  const s=campLoad(),root=campEl('div');
  root.appendChild(campEl('h1','margin:6px 0 4px;font-size:30px;letter-spacing:.04em;','MISSIONS'));
  root.appendChild(campEl('div','opacity:.75;margin-bottom:14px;','Five missions for the Shia factions. Replay any mission on Easy, Medium or Hard; your best times are saved on this device.'));
  for(const m of CAMPAIGN){const r=s[m.id]||{},done=Object.keys(r);const card=campEl('div','border:1px solid #3d4733;border-radius:10px;padding:12px 14px;margin:10px 0;background:rgba(40,48,32,.5);cursor:pointer;');
    card.innerHTML=`<div style="font-size:20px;font-weight:bold">${done.length?'✓ ':''}${m.n}. ${m.title}</div><div style="opacity:.8;font-size:15px">${m.sub}</div><div style="font-size:14px;opacity:.7;margin-top:4px">${done.length?CAMP_DIFF.filter(k=>r[k]).map(k=>k+' '+campClock(r[k])).join(' · '):'Not yet completed'}</div>`;
    card.onclick=()=>campBrief(m);root.appendChild(card);}
  root.appendChild(campBtn('Back',campClose,true));campShow(root);
}
function campBrief(m){
  let diff=1;const root=campEl('div');
  root.appendChild(campEl('div','opacity:.7;font-size:14px','MISSION '+m.n+' · '+m.sub));
  root.appendChild(campEl('h1','margin:2px 0 10px;font-size:30px;',m.title));
  root.appendChild(campEl('div','font-size:17px;line-height:1.5;',m.brief.map(p=>'<p style="margin:0 0 10px">'+p+'</p>').join('')));
  root.appendChild(campEl('div','font-weight:bold;margin:10px 0 4px','Objectives'));
  root.appendChild(campEl('div','font-size:16px;line-height:1.6;',m.obj.map(o=>'☐ '+o[1]).join('<br>')));
  const row=campEl('div','margin:12px 0');
  const bs=CAMP_DIFF.map((n,i)=>{const b=campBtn(n,()=>{diff=i;bs.forEach((x,j)=>x.style.background=j===i?'#4f6b32':'transparent');},i!==1);return b;});bs.forEach(b=>row.appendChild(b));root.appendChild(row);
  root.appendChild(campBtn('Begin mission',()=>{campClose();startCampaign(m.id,diff);}));
  root.appendChild(campBtn('Back',campMenu,true));campShow(root);
}
function startCampaign(id,diff){
  const m=CAMPAIGN.find(x=>x.id===id);if(!m)return;try{initAudio();}catch(e){}
  MODE='single';ME=0;const ally=!!m.ally,facs=ally?[m.fac,m.ally,m.enemy]:[m.fac,m.enemy];
  setup.p=m.fac;setup.d=diff;
  TERR_DEFER=true;try{newGame({seed:(m.n*7919+diff*104729+12345)|0,facs,ai:facs.map(()=>false),map:m.map,tm:ally?[0,0,1]:[0,1],bs:1,slot:0,st:[0,1],w:0,camp:{id,diff}});}finally{TERR_DEFER=false;}
  afterStart();
}
function campDebrief(c,won){
  const m=c.m,T=G.teams[0],root=campEl('div');
  root.appendChild(campEl('div','opacity:.7;font-size:14px','MISSION '+m.n+' · '+(won?'COMPLETE':'FAILED')+' · '+CAMP_DIFF[c.diff]));
  root.appendChild(campEl('h1','margin:2px 0 10px;font-size:30px;color:'+(won?'#9fd36b':'#e07a6a'),(won?'Victory - ':'Defeat - ')+m.title));
  root.appendChild(campEl('div','font-size:17px;line-height:1.5;margin-bottom:10px',won?m.win:(m.lose+(c.why?' '+c.why:''))));
  root.appendChild(campEl('div','font-size:16px;line-height:1.7;margin-bottom:10px',m.obj.map(o=>(c.o[o[0]]?'☑ ':'☐ ')+o[1]).join('<br>')+'<br><br>Time '+campClock(c.t)+' · Enemy destroyed '+(T.kills|0)+' · Our losses '+(T.lost|0)));
  root.appendChild(campBtn(won?'Play again':'Try again',()=>{campClose();startCampaign(m.id,c.diff);},won));
  const nx=CAMPAIGN[m.n];if(won&&nx)root.appendChild(campBtn('Next mission',()=>{campBrief(nx);campLeave();}));
  root.appendChild(campBtn('Missions',()=>{campLeave();campMenu();},true));
  root.appendChild(campBtn('Main menu',()=>{campLeave();campClose();},true));
  campShow(root);
}
function campLeave(){try{if(MODE!=='single')leaveNet();}catch(e){}MODE='single';ME=0;G=null;try{kcReset();}catch(e){}try{$('end').hidden=true;$('menu').hidden=false;renderGames();}catch(e){}}

// the mission objective is shown in the one goal line under the top bar (cqBanner, 08c-towns; 2026-11-13 orderfeel)
setInterval(()=>{try{if(G&&G.camp)cqBanner();}catch(e){}},400);
(function(){const sb=document.getElementById('sandbox');if(!sb||document.getElementById('campaign'))return;const b=document.createElement('button');b.className='big';b.id='campaign';b.type='button';b.textContent='Missions';b.title='Five single-player missions for Iran, the Lebanese Shia and the Zaidi Shia Movement';b.onclick=()=>{try{initAudio();}catch(e){}campMenu();};sb.parentNode.insertBefore(b,sb);})();
