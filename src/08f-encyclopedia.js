/* ---------- 08f-encyclopedia: main-menu "Encyclopedia" (Abdullah 2026-11-05) ----------
   Every unit and building of all 18 nations in 3D (drag = rotate, wheel = zoom), with stats read from 01-data (stats() /
   bstats(): cost, health, armour, speed, weapon, counters) and a short generic real-world note. Search + filter by
   nation and type. UI only: it has its own small renderer and scene and builds the same 3D objects the battle uses
   (makeObj) for a throw-away stand-in team; nothing of the game state is changed (G and SCN are swapped back at once). */
const ENC={on:false,f:'IR',q:'',type:'all',sel:null,r:null,scn:null,cam:null,obj:null,yaw:.6,pitch:.28,zoom:1,drag:null,raf:0,idle:0,seq:0,ov:null,all:null};
const ENC_TYPES=[['all','Everything'],['inf','Infantry'],['veh','Vehicles'],['air','Aircraft'],['sea','Naval'],['bld','Buildings']];
const ENC_NOTE={
  inf:'Rifle squads are the backbone of any army. Trained to fight from cover, they take ground, garrison buildings and screen the armour. They are cheap, flexible and decisive in towns and broken terrain, and very vulnerable in the open.',
  at:'Anti-tank teams carry shoulder-fired or tripod-mounted guided missiles and rockets that can kill an armoured vehicle from ambush. Modern infantry relies on them to stop tanks that would otherwise run it down.',
  hacker:'Electronic-warfare and cyber specialists disrupt enemy sensors, radios and networks. Armies keep small teams near the front to blind or disable equipment rather than to destroy it.',
  hero:'A marksman or sniper team: a trained shooter and a spotter pick off officers and crews from long range, using concealment rather than firepower.',
  champ:'Elite special forces are small, highly trained units used for raids, ambushes and high-value-target operations. They are expensive and few, and punch far above their numbers.',
  cleric:'A respected religious or political figure whose presence steadies the troops around him. Morale, belief and cohesion matter in combat as much as weapons do.',
  tank:'Main battle tanks combine a stabilised high-velocity gun, thick composite armour and a powerful engine. They lead armoured assaults and break enemy lines, but need infantry and air-defence cover in towns and against anti-tank missiles.',
  arty:'Self-propelled guns and rocket launchers shell targets many kilometres away, then move before counter-battery fire arrives. Superb against massed troops and buildings, nearly helpless once the enemy reaches them.',
  aa:'Mobile air-defence vehicles carry radar-guided guns or short-range missiles to protect columns and bases from helicopters, jets and drones.',
  harv:'Supply trucks are the logistics backbone: fuel, ammunition and food move by road. Armies lose more equipment to broken supply than to enemy fire.',
  dozer:'Combat engineers build bridges, fortifications and camps and clear obstacles, often under fire. The heavy construction vehicle is how an army digs in and builds forward.',
  heli:'Attack helicopters hunt armour from behind hills and tree lines with guided missiles and cannon. Fast and flexible, they are vulnerable to air defence and massed small-arms fire.',
  jet:'Strike fighters and fighter-bombers drop precision-guided bombs and fire missiles at targets far behind the line, then leave before air defences can react.',
  drone:'Armed strike drones and loitering munitions turned small, cheap aircraft into precision weapons: they find a target, circle, and dive onto it.',
  boat:'Fast attack craft and patrol boats guard coasts and shipping lanes with guns and anti-ship missiles, using speed instead of armour.',
  sub:'Submarines hunt ships quietly and strike with torpedoes or missiles from beneath the surface. Their greatest weapon is not being found.',
  ship:'Destroyers and frigates are the workhorses of the surface fleet: radar, missiles and guns protect task forces and shell coastlines.',
  lander:'Landing craft carry vehicles and troops from ship to beach, the slow, exposed link in any amphibious assault.',
  airlift:'Transport aircraft and heavy helicopters move troops and equipment quickly across terrain blocked by rivers, mountains or enemy fire.'};
const ENC_BNOTE={
  hq:'The command headquarters is the heart of an army\'s base: planning, communications and the engineers who build everything else. Lose it and the rest of the base is soon lost.',
  barracks:'Barracks house, train and equip infantry. Real armies train recruits in camps like this, then rotate squads to the front.',
  factory:'The war factory stands for the vehicle depots and armour plants that build, repair and refit tanks, trucks and artillery.',
  airfield:'Airfields give aircraft a runway, hangars, fuel and maintenance crews. A jet is only useful as long as its base survives.',
  shipyard:'The shipyard builds, repairs and launches naval vessels. It must sit on the coast, which makes it an obvious target.',
  turret:'Fixed gun positions cover approaches and chokepoints. Real defence lines combine such guns with mines, wire and observers.',
  sam:'Surface-to-air missile sites guard cities and bases from jets and helicopters, often with a radar nearby to cue the launchers.',
  coast:'Coastal missile batteries deny the sea near a shoreline to enemy ships, hiding mobile launchers among the hills and ports.',
  tunnel:'Tunnel networks let a defender hide, move and resupply under the enemy\'s air power, a method used by many armies in mountains and hills.',
  uplink:'The strike centre stands for the long-range missile and air-strike commands that plan and launch deep attacks far behind the front.',
  depot:'A forward supply depot stores fuel and ammunition near the fighting so trucks do not need to drive back to the main base.',
  fort:'A mountain fortress is a hardened position dug into rock, built to survive bombardment and to hold a pass for a long time.',
  econ:'Civil and commercial offices that keep an economy running during a war.'};
const ENC_BCOUNTER={hq:'Lose it and you cannot build any more: guard it with air defence and a strong garrison',barracks:'Takes damage from artillery and air strikes; protect it with defence guns',factory:'Weak to air strikes and artillery',airfield:'Weak to missiles and bombers; defend with SAM sites',shipyard:'Weak to naval gunfire and missiles',turret:'Beats infantry and light vehicles · Loses to artillery and tanks',sam:'Beats helicopters, jets and drones · Loses to tanks and artillery',coast:'Beats ships and boats near the coast · Loses to aircraft and artillery',tunnel:'Garrison fights from cover · Loses to heavy artillery and bunker-busting strikes',uplink:'Launches the nation\'s strike salvo · Loses to anything that reaches it, so guard it',depot:'Lets trucks unload far from the HQ · Unarmed, easy to snipe',fort:'Beats almost everything that attacks head-on · Loses to long-range missiles and sustained bombardment'};
const ENC_ARM={light:'Light (soldiers)',medium:'Medium',heavy:'Heavy (vehicle)',bld:'Structure',air:'Aircraft',ship:'Ship'};
function encType(s,b){if(b)return 'bld';const c=s.cls;if(['inf','at','hacker','hero','champ','cleric'].includes(c))return 'inf';if(['heli','jet','drone','airlift'].includes(c)||s.dom==='air')return 'air';if(['boat','sub','ship','lander'].includes(c)||(s.dom&&s.dom!=='ground'))return 'sea';return 'veh';}
function encEntries(){if(ENC.all)return ENC.all;const out=[];
  for(const f of FKEYS){const seen=new Set();for(const k of allUnits(f)){if(seen.has(k)||!BASE[k])continue;seen.add(k);const s=stats(f,k);out.push({f,k,b:0,s,t:encType(s,0),n:s.name||k});}
    for(const k of Object.keys(STRUCT)){if(k==='garrison'||k==='econ'||(k==='tunnel'||k==='fort')&&!FACTIONS[f].tunnels||k==='airfield'&&FACTIONS[f].noAir)continue;const s=bstats(f,k);out.push({f,k,b:1,s,t:'bld',n:s.name||k});}}
  return ENC.all=out;}
const encE=(t,c,x)=>{const d=document.createElement(t);if(c)d.className=c;if(x!=null)d.textContent=x;return d;};
// ----- the 3D part -----
function encStage(){const el=ENC.ov.querySelector('.ecv');if(ENC.r)return;
  const cv2=document.createElement('canvas');cv2.className='ecanvas';el.append(cv2);
  const r=new THREE.WebGLRenderer({canvas:cv2,antialias:true,alpha:false});r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.NoToneMapping;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFShadowMap;
  const sc=new THREE.Scene();sc.background=lin('#2a2e2a');
  sc.add(new THREE.HemisphereLight(lin('#c4d4ef'),lin('#4d3f2c'),1.0*LUX));
  const sun=new THREE.DirectionalLight(lin('#ffe2bd'),2.5*LUX);sun.position.set(-260,340,200);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const c=sun.shadow.camera;c.left=-160;c.right=160;c.top=160;c.bottom=-160;c.near=10;c.far=900;sc.add(sun);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(230,48).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:lin('#4a4d44'),roughness:1}));ground.receiveShadow=true;sc.add(ground);ENC.gnd=ground;
  const ring=new THREE.Mesh(new THREE.RingGeometry(150,153,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xc9a24a}));ring.position.y=.2;sc.add(ring);ENC.rng=ring;
  ENC.r=r;ENC.scn=sc;ENC.cam=new THREE.PerspectiveCamera(36,1,1,3000);
  const dn=e=>{ENC.drag={x:e.clientX,y:e.clientY};ENC.idle=0;cv2.setPointerCapture&&cv2.setPointerCapture(e.pointerId);};
  cv2.addEventListener('pointerdown',dn);cv2.addEventListener('pointermove',e=>{if(!ENC.drag)return;ENC.yaw-=(e.clientX-ENC.drag.x)*.01;ENC.pitch=Math.max(.02,Math.min(1.3,ENC.pitch+(e.clientY-ENC.drag.y)*.006));ENC.drag={x:e.clientX,y:e.clientY};});
  const up=()=>{ENC.drag=null;ENC.idle=performance.now();};cv2.addEventListener('pointerup',up);cv2.addEventListener('pointercancel',up);
  cv2.addEventListener('wheel',e=>{e.preventDefault();ENC.zoom=Math.max(.35,Math.min(2.6,ENC.zoom*(e.deltaY>0?1.1:.9)));ENC.idle=performance.now();},{passive:false});}
function encClear(){if(ENC.obj){ENC.scn.remove(ENC.obj);ENC.obj.traverse(o=>{if(o.isMesh&&o.geometry&&!o.geometry.userData.shared){}});ENC.obj=null;}}
// the same 3D object the battle builds, for a stand-in team (G and SCN are swapped for the one call, then put back)
function encBuild(en){const f=en.f,F=FACTIONS[f],T={id:0,fac:f,F,sup:F.sup,color:F.color,dark:shade(F.color,.45),credits:0,upg:{},pw:{},st:null};
  const e=en.b?{id:3,kind:en.k,team:0,isB:true,x:0,y:0,size:en.s.size,s:en.s,hp:en.s.hp,max:en.s.hp,built:1,ang:0}:{id:3,kind:en.k,team:0,isB:false,x:0,y:0,s:en.s,hp:en.s.hp,max:en.s.hp,ang:0,va:0};
  const g0=G,s0=SCN,sc=ENC.scn;const stub=Object.assign(Object.create(g0||null),{teams:[T],t:0,ents:[],byId:new Map(),map:(g0&&g0.map)||{theme:'temperate'}});
  G=stub;SCN=sc;let o=null;try{o=makeObj(e);}finally{G=g0;SCN=s0;}
  return o;}
async function encShow(en){const my=++ENC.seq;ENC.sel=en;encInfo(en);encClear();const st=ENC.ov.querySelector('.emsg');st.textContent='Loading 3D model…';st.hidden=false;
  try{await Promise.race([modelsFor([en.f]),new Promise(r=>setTimeout(r,6000))]);}catch(e){}
  if(my!==ENC.seq||!ENC.on)return;
  try{encStage();const o=encBuild(en);if(!o)throw new Error('no model');o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.frustumCulled=false;}});
    // fit: put the object's footprint centre at the origin, stand it on the ground and frame it
    o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(o),ctr=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3());
    const wrap=new THREE.Group();o.position.sub(new THREE.Vector3(ctr.x,bb.min.y-(o.position.y*0),ctr.z));wrap.add(o);wrap.userData.r=Math.max(sz.x,sz.y,sz.z)||40;
    ENC.scn.add(wrap);ENC.obj=wrap;{const k=Math.max(.35,wrap.userData.r/75);ENC.gnd.scale.setScalar(k);ENC.rng.scale.setScalar(k);ENC.gnd.position.y=ENC.rng.position.y-.2;}ENC.zoom=1;ENC.yaw=.7;ENC.pitch=.3;ENC.idle=performance.now();st.hidden=true;encStart();}
  catch(err){console.warn('encyclopedia 3D',err);st.textContent='3D preview is not available for this entry on this device.';st.hidden=false;}}
function encFrame(){ENC.raf=0;if(!ENC.on||!ENC.r)return;const o=ENC.obj,cv2=ENC.r.domElement,w=cv2.clientWidth,h=cv2.clientHeight;
  if(w>0&&h>0){const dp=Math.min(2,window.devicePixelRatio||1);if(cv2.width!==(w*dp|0)||cv2.height!==(h*dp|0)){ENC.r.setPixelRatio(dp);ENC.r.setSize(w,h,false);ENC.cam.aspect=w/h;ENC.cam.updateProjectionMatrix();}}
  if(o){if(!ENC.drag&&performance.now()-ENC.idle>1800)ENC.yaw+=.006;const R=o.userData.r*1.55*ENC.zoom+30,p=ENC.pitch;ENC.cam.position.set(Math.sin(ENC.yaw)*Math.cos(p)*R,Math.sin(p)*R+o.userData.r*.18,Math.cos(ENC.yaw)*Math.cos(p)*R);ENC.cam.lookAt(0,o.userData.r*.22,0);
    ENC.r.shadowMap.needsUpdate=true;try{ENC.r.render(ENC.scn,ENC.cam);}catch(e){}}
  encStart();}
function encStart(){if(!ENC.raf&&ENC.on)ENC.raf=requestAnimationFrame(encFrame);}
// ----- the facts -----
function encInfo(en){const P=ENC.ov.querySelector('.einfo'),s=en.s,F=FACTIONS[en.f];P.innerHTML='';
  const hd=encE('div','ehd');hd.append(encE('div','enat',F.name),encE('h2','',en.n));P.append(hd);
  const row=(a,b)=>{const r=encE('div','erow');r.append(encE('span','ek',a),encE('span','ev',b));P.append(r);};
  row('Cost','$'+(s.cost||0).toLocaleString('en-US')+(s.time&&!en.b?'  ·  trains in '+Math.round(s.time)+' s':en.b&&s.time?'  ·  builds in '+Math.round(s.time)+' s':''));
  row('Health',String(s.hp));
  row('Armour',en.b?'Structure':ENC_ARM[s.armor]||String(s.armor||'—'));
  if(!en.b)row('Speed',s.spd?Math.round(s.spd)+' (ground units/s'+(s.dom==='air'?', airborne':s.dom&&s.dom!=='ground'?', afloat':'')+')':'immobile');
  else row('Footprint',(s.size||0)+' m');
  if(s.dmg>0){const dps=s.dmg/Math.max(.05,s.rof||1);row('Weapon',(s.wpn?String(s.wpn)+' · ':'')+'damage '+Math.round(s.dmg)+' per shot · about '+Math.round(dps)+' per second');row('Range',Math.round(s.rng||0)+(s.splash?'  ·  blast radius '+Math.round(s.splash):''));
    const tg=[];if(s.aa)tg.push('aircraft');if(s.ground!==false)tg.push('ground');if(s.dom==='air'&&s.noAttack)tg.length=0;row('Hits',tg.join(' and ')||'ground');}
  else row('Weapon','unarmed');
  if(F.docShort)row('Nation',F.docShort);
  const cn=en.b?ENC_BCOUNTER[en.k]:COUNTER[s.cls];if(cn){const c=encE('div','esec');c.append(encE('div','ek','Counters'),encE('div','etx',cn));P.append(c);}
  const nt=en.b?ENC_BNOTE[en.k]:ENC_NOTE[en.k]||ENC_NOTE[s.cls];if(nt){const c=encE('div','esec');c.append(encE('div','ek','Real-world note'),encE('div','etx',nt));P.append(c);}
  if(s.desc){const c=encE('div','esec');c.append(encE('div','ek','In the game'),encE('div','etx',String(s.desc)));P.append(c);}}
// ----- the list -----
function encList(){const L=ENC.ov.querySelector('.elist'),q=ENC.q.trim().toLowerCase();L.innerHTML='';
  let A=encEntries().filter(x=>(ENC.f==='all'||x.f===ENC.f)&&(ENC.type==='all'||x.t===ENC.type)&&(!q||(x.n+' '+x.k+' '+FACTIONS[x.f].name+' '+x.f).toLowerCase().includes(q)));
  const tot=A.length;if(A.length>150)A=A.slice(0,150);
  for(const x of A){const b=encE('button','eit'+(ENC.sel&&ENC.sel.f===x.f&&ENC.sel.k===x.k&&ENC.sel.b===x.b?' on':''));b.append(encE('span','ec',x.f),encE('span','en',x.n),encE('span','ep','$'+(x.s.cost||0).toLocaleString('en-US')));b.onclick=()=>{encShow(x);for(const y of L.querySelectorAll('.eit.on'))y.classList.remove('on');b.classList.add('on');};L.append(b);}
  if(!A.length)L.append(encE('div','etx','Nothing matches. Try another search, nation or type.'));else if(tot>A.length)L.append(encE('div','etx','Showing '+A.length+' of '+tot+': narrow it with the filters.'));
  ENC.ov.querySelector('.ecount').textContent=tot+' entr'+(tot===1?'y':'ies');}
function encOpen(){if(!ENC.ov){const st=document.createElement('style');st.textContent=`
#enc{position:fixed;inset:0;z-index:90;background:rgba(8,11,9,.97);display:flex;flex-direction:column;color:#e8efe9;font-family:inherit}
#enc[hidden]{display:none}
#enc .etop{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid #2d4a3a}
#enc h1{margin:0 12px 0 0;font-size:22px;letter-spacing:.06em}#enc input,#enc select{font:inherit;font-size:15px;min-height:36px;padding:0 10px;background:#17211b;color:#e8efe9;border:1px solid #34503f;border-radius:6px}
#enc input{flex:1;min-width:200px;max-width:300px}#enc .ecount{opacity:.65;font-size:13px}
#enc .etypes{display:flex;gap:5px;flex-wrap:wrap}#enc .etypes button{font:inherit;font-size:14px;min-height:34px;padding:0 12px;border-radius:17px;background:#17211b;color:#cfe0d5;border:1px solid #34503f;cursor:pointer}#enc .etypes button.on{background:#c9892a;color:#17110a;border-color:#c9892a}
#enc .eclose{margin-left:auto;font:inherit;font-weight:700;min-height:36px;padding:0 18px;border-radius:6px;border:1px solid #6a7a70;background:#222d26;color:#fff;cursor:pointer}
#enc .ebody{flex:1;display:grid;grid-template-columns:minmax(220px,300px) 1fr minmax(260px,360px);min-height:0}
#enc .elist{overflow:auto;border-right:1px solid #2d4a3a;padding:6px}#enc .eit{display:flex;width:100%;gap:8px;align-items:center;padding:8px 9px;margin:2px 0;border:0;border-radius:6px;background:#141d18;color:#e8efe9;font:inherit;font-size:15px;text-align:left;cursor:pointer}
#enc .eit:hover{background:#1d2b23}#enc .eit.on{background:#2a4a38;outline:1px solid #53a977}#enc .ec{font-size:12px;font-weight:700;padding:2px 6px;border-radius:4px;background:#33443b;min-width:26px;text-align:center}#enc .en{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#enc .ep{opacity:.7;font-size:13px}
#enc .ecv{position:relative;min-width:0;min-height:260px}#enc .ecanvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;display:block}#enc .emsg{position:absolute;left:0;right:0;top:46%;text-align:center;opacity:.8;pointer-events:none;padding:0 20px}
#enc .ehint{position:absolute;left:12px;bottom:10px;font-size:13px;opacity:.6;pointer-events:none}
#enc .einfo{overflow:auto;border-left:1px solid #2d4a3a;padding:12px 14px}#enc .enat{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#c9a24a}#enc h2{margin:2px 0 10px;font-size:22px}
#enc .erow{display:flex;gap:10px;padding:5px 0;border-bottom:1px solid #223229;font-size:15px}#enc .ek{width:84px;flex:none;opacity:.6;font-size:13px;text-transform:uppercase;letter-spacing:.05em;padding-top:1px}#enc .ev{flex:1}
#enc .esec{margin-top:12px}#enc .esec .ek{width:auto}#enc .esec .etx{font-size:15px;line-height:1.45;margin-top:3px}#enc .etx{font-size:15px;opacity:.9;padding:6px}
@media(max-width:900px){#enc .ebody{grid-template-columns:1fr;grid-template-rows:180px 280px auto;overflow:auto}#enc .elist{border-right:0;border-bottom:1px solid #2d4a3a}#enc .einfo{border-left:0}}`;document.head.append(st);
    const ov=ENC.ov=encE('div');ov.id='enc';ov.hidden=true;
    const top=encE('div','etop');top.append(encE('h1','','📖 Encyclopedia'));
    const sq=encE('input');sq.type='search';sq.placeholder='Search units and buildings…';sq.setAttribute('aria-label','Search');sq.oninput=()=>{ENC.q=sq.value;encList();};top.append(sq);
    const ns=encE('select');ns.setAttribute('aria-label','Nation');{const o=encE('option','','All nations');o.value='all';ns.append(o);for(const f of FKEYS){const o2=encE('option','',FACTIONS[f].name);o2.value=f;ns.append(o2);}}ns.onchange=()=>{ENC.f=ns.value;encList();};top.append(ns);ENC.ns=ns;
    const ty=encE('div','etypes');for(const [v,l] of ENC_TYPES){const b=encE('button',v===ENC.type?'on':'',l);b.onclick=()=>{ENC.type=v;for(const x of ty.children)x.classList.toggle('on',x===b);encList();};ty.append(b);}top.append(ty,encE('span','ecount'));
    const cl=encE('button','eclose','Close ✕');cl.onclick=encClose;top.append(cl);ov.append(top);
    const body=encE('div','ebody'),cvw=encE('div','ecv');cvw.append(encE('div','emsg','Pick a unit or building from the list'),encE('div','ehint','Drag to rotate · wheel to zoom'));body.append(encE('div','elist'),cvw,encE('div','einfo'));ov.append(body);
    document.body.append(ov);addEventListener('keydown',e=>{if(ENC.on&&e.key==='Escape'){e.stopPropagation();encClose();}},true);}
  ENC.on=true;ENC.ov.hidden=false;ENC.f=ENC.f==='all'?'all':(typeof setup==='object'&&FACTIONS[setup.p]?setup.p:'IR');ENC.ns.value=ENC.f;encList();
  const first=encEntries().find(x=>x.f===ENC.f&&!x.b&&x.k==='tank')||encEntries().find(x=>x.f===ENC.f);
  if(first){encShow(first);setTimeout(encList,0);}encStart();}
function encClose(){ENC.on=false;ENC.seq++;if(ENC.ov)ENC.ov.hidden=true;encClear();}
function encMenu(){const row=document.getElementById('openMyb')||document.getElementById('openSettings');
  if(row&&!document.getElementById('openEnc')){const b=document.createElement('button');b.className='big ghost';b.id='openEnc';b.style.cssText='font-size:15px;padding:7px 16px;margin-left:6px';b.textContent='Encyclopedia';b.title='Browse every unit and building of all 18 nations in 3D';b.onclick=()=>{try{initAudio();}catch(e){}encOpen();};row.after(b);}}
try{encMenu();}catch(e){console.warn('encyclopedia menu',e);}
