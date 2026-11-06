let WALKSIGN=1;
/* ================= ART ASSETS: real 3D models (Quaternius, Kenney, Zsky, KolosStudios, Alex Safayan, angelo raffaele Catalano, jeremy, Jarlan Perez via Poly Pizza) ================= */
const MODELS={ready:false,proto:{},tinted:{},loading:null,flipX:{}};
const MCFG={
  tank:{m:'tank',fit:'z',size:38},harv:{m:'truck',fit:'z',size:34},dozer:{m:'truck',fit:'z',size:34,extra:'crane'},
  mortar:{m:'soldier',fit:'y',size:14.0,squad:[[3,-5],[-3,5]],extra:'mortar'},recon:{m:'soldier',fit:'y',size:14.0,squad:[[3,-4],[-3,4]],tint:'#4a5242',tk:.5},officer:{m:'soldier',fit:'y',size:15.7,tint:'#3d4a36',tk:.5},medic:{m:'soldier',fit:'y',size:14.0,squad:[[3,-4],[-3,4]],tint:'#e8e4da',tk:.35},
  commissar:{m:'soldier',fit:'y',size:15.7,tint:'#5b4a3a',tk:.5},sapper:{m:'soldier',fit:'y',size:14.0,squad:[[3,-4],[-3,4]],tint:'#6a5a3c',tk:.4},guer:{m:'soldier',fit:'y',size:14.0,squad:[[5,0],[-4,-7],[-4,7]],tint:'#4c5a3a',tk:.55},atk:{m:'soldier',fit:'y',size:14.0,squad:[[3,-5],[-3,5]],tint:'#3c4434',tk:.5},
  idome:{m:'truck',fit:'z',size:36,extra:'samtruck'},ew:{m:'truck',fit:'z',size:35,extra:'dish'},cbr:{m:'truck',fit:'z',size:35,extra:'dish'},jeep:{m:'truck',fit:'z',size:26},atgm:{m:'truck',fit:'z',size:27,extra:'samtruck',tint:'#55603f',tk:.4},saka:{m:'soldier',fit:'y',size:14.0,squad:[[5,0],[-4,-7],[-4,7]],tint:'#a08a5c',tk:.5},raidlead:{m:'truck',fit:'z',size:28,extra:'mg'},
  inf:{m:'soldier',fit:'y',size:14.0,squad:[[5,0],[-4,-7],[-4,7]]},at:{m:'soldier',fit:'y',size:14.0,squad:[[3,-5],[-3,5]]},hacker:{m:'soldier',fit:'y',size:13.1,squad:[[3,-4],[-3,4]]},
  hero:{m:'soldier',fit:'y',size:15.7,tint:'#2c302b',tk:.6},champ:{m:'soldier',fit:'y',size:19.5,tint:'#262a26',tk:.62},heli:{m:'heli',fit:'z',size:54},airlift:{m:'heli',fit:'z',size:72,tint:'#59604f',tk:.5},lander:{m:'boat',fit:'z',size:52,tint:'#6f7478',tk:.5},drone:{m:'drone',fit:'z',size:18,tint:'#7d8287',tk:.8},jet:{m:'jet',fit:'z',size:46},boat:{m:'boat',fit:'z',size:42,tint:'#7a8590',tk:.9},ship:{m:'ship',fit:'z',size:118,tint:'#7d8792',tk:.88},
};
// Realistic models (Objaverse / Sketchfab, CC-BY - authors credited in the menu): each nation fields the hardware it
// actually flies and drives where a licensed model exists.
const RMOD={t90:{m:'m_t90',fit:'z',size:40},hilux:{m:'m_hilux',fit:'z',size:30,extra:'dshk'},d7r:{m:'m_d7r',fit:'z',size:34},jd550:{m:'m_jd550',fit:'z',size:33},apache:{m:'m_apache',fit:'z',size:58},mi24:{m:'m_mi24',fit:'z',size:62},
  f15:{m:'m_f15',fit:'z',size:50},f18:{m:'m_f18',fit:'z',size:48},su35:{m:'m_su35',fit:'z',size:54},rafale:{m:'m_rafale',fit:'z',size:46},typhoon:{m:'m_typhoon',fit:'z',size:46},j10:{m:'m_j10',fit:'z',size:46},mig29:{m:'m_mig29',fit:'z',size:48},f16:{m:'m_f16',fit:'z',size:46},g6:{m:'m_g6',fit:'z',size:40},ozelot:{m:'m_ozelot',fit:'z',size:34},zu:{m:'m_hilux',fit:'z',size:30,extra:'zu23'},
  abrams:{m:'m_abrams',fit:'z',size:40},merkava:{m:'m_merkava',fit:'z',size:41},kf51:{m:'m_kf51',fit:'z',size:41},msta:{m:'m_msta',fit:'z',size:42},
  oplot:{m:'m_oplot',fit:'z',size:40},t72:{m:'m_t72',fit:'z',size:40},t62:{m:'m_t62',fit:'z',size:39},t55:{m:'m_t55',fit:'z',size:37},leo2:{m:'m_leo2',fit:'z',size:41},
  ural:{m:'m_ural',fit:'z',size:36},m35:{m:'m_m35',fit:'z',size:36},humvee:{m:'m_humvee',fit:'z',size:27},uh60:{m:'m_uh60',fit:'z',size:70},mi8:{m:'m_mi8',fit:'z',size:76}};
const RMAP={tank:{RU:'t90',KP:'t90',IR:'t90',UA:'t90',CN:'t90',IN:'t90',EG:'t90',PK:'t90',CU:'t90',RS:'hilux',DW:'hilux'},dozer:{},
  heli:{US:'apache',IL:'apache',EU:'apache',SA:'apache',AE:'apache',EG:'apache',KR:'apache',TR:'apache',IN:'apache',PK:'apache',RU:'mi24',KP:'mi24',IR:'mi24',CN:'mi24',UA:'mi24',CU:'mi24',RS:'mi24',DW:'mi24'},
  jet:{US:'f18',IL:'f16',TR:'f16',EU:'rafale',UA:'typhoon',RU:'su35',IR:'mig29',SA:'f15',AE:'f16',PK:'j10',IN:'rafale',CN:'j10',KP:'mig29',KR:'f15',EG:'rafale',CU:'mig29',RS:'mig29',DW:'mig29'}};
for(const f of ['US','TR','IL','EU','UA','RU','IR','SA','AE','PK','IN','CN','KP','KR','EG','CU','RS','DW'])RMAP.dozer[f]='jd550';
// Graphics Phase 2: Western-equipped armies drive the M1 Abrams (Israel the Merkava, Europe and Turkey a Leopard-family
// tank), M35 trucks, Humvees and fly the UH-60 Black Hawk; Soviet/Chinese-equipped ones (and the militias) Ural trucks
// and the Mi-8. Self-propelled guns: the G6 in the West, the 2S19 Msta in the East (militias keep rocket trucks).
const WESTVEH=['US','TR','IL','EU','SA','AE','KR','EG'],EASTVEH=['RU','KP','IR','UA','CN','IN','CU','PK','RS','DW'];
Object.assign(RMAP.tank,{US:'abrams',SA:'abrams',AE:'abrams',KR:'abrams',EG:'abrams',IL:'merkava',EU:'kf51',TR:'kf51'});
// Graphics Phase 2b, more national tank silhouettes: Ukraine the T-84 Oplot, Iran the T-72, North Korea a T-62 (its
// Chonma-ho is built on it), Cuba the T-55, Turkey the Leopard 2A4 (no free Type 99, K2 or Altay model exists yet:
// China keeps the T-90, South Korea the Abrams-like K1 stand-in)
Object.assign(RMAP.tank,{UA:'oplot',IR:'t72',KP:'t62',CU:'t55',TR:'leo2'});
RMAP.arty={};RMAP.airlift={};RMAP.jeep={SA:'humvee'};RMAP.raidlead={DW:'hilux'};
for(const k of ['harv','idome','ew','cbr','atgm','aa'])RMAP[k]={};
for(const f of WESTVEH){RMAP.arty[f]='g6';RMAP.airlift[f]='uh60';for(const k of ['harv','idome','ew','cbr','atgm','aa'])RMAP[k][f]='m35';}
for(const f of EASTVEH){if(f!=='RS'&&f!=='DW')RMAP.arty[f]='msta';RMAP.airlift[f]='mi8';for(const k of ['harv','idome','ew','cbr','atgm','aa'])RMAP[k][f]='ural';}
// Faction-unique helicopters and warships (Objaverse / Sketchfab, CC BY, authors in the menu credits): Russia flies the Mi-28,
// Egypt the Ka-52, Turkey, Pakistan and Iran an AH-1 Cobra-type gunship; Western navies a Type 45 destroyer (Germany an F123
// frigate), Russia/China/North Korea/Ukraine/India/Pakistan/Cuba/Iran a Russian-style destroyer; the Shia nations'
// patrol boats are a camouflaged fast boat. Visual only: the simulation does not know about these.
Object.assign(RMOD,{ka52:{m:'m_ka52',fit:'z',size:56,tint:'#5a6450',tk:.55},mi28:{m:'m_mi28',fit:'z',size:56},ah1:{m:'m_ah1',fit:'z',size:56},
  frw:{m:'m_frw',fit:'z',size:118},frg:{m:'m_frg',fit:'z',size:118},fre:{m:'m_fre',fit:'z',size:118},spb:{m:'m_spb',fit:'z',size:42,tint:'#7a8590',tk:.15}});
Object.assign(RMAP.heli,{RU:'mi28',EG:'ka52',TR:'ah1',PK:'ah1',IR:'ah1'});
RMAP.ship={};RMAP.boat={IR:'spb',RS:'spb',DW:'spb'};
// submarines (CC-BY Sketchfab models via Objaverse, visual only): Western attack boat, Eastern diesel boat, small coastal sub for IR/RS/DW; dy sinks the hull so it floats awash
Object.assign(RMOD,{subw:{m:'m_subw',fit:'z',size:84,dy:-2.6,tint:'#2f363b',tk:.82},sube:{m:'m_sube',fit:'z',size:80,dy:-2.4,tint:'#242b31',tk:.7},subm:{m:'m_subm',fit:'z',size:58,dy:-2,tint:'#303a38',tk:.95},cbat:{m:'m_cbat',fit:'z',size:40}});
RMAP.sub={};for(const f of WESTVEH)RMAP.sub[f]='subw';for(const f of ['RU','KP','UA','CN','IN','CU','PK'])RMAP.sub[f]='sube';for(const f of ['IR','RS','DW'])RMAP.sub[f]='subm';
RMAP.coast={};for(const f of [...WESTVEH,...EASTVEH])RMAP.coast[f]='cbat';
for(const f of ['US','IL','TR','KR','SA','AE','EG'])RMAP.ship[f]='frw';RMAP.ship.EU='frg';
for(const f of ['RU','CN','KP','UA','IN','PK','CU','IR','RS','DW'])RMAP.ship[f]='fre';
// the nation's own truck model, if it has arrived (AA trucks and rocket launchers are built on it)
// their paint textures are dark (woodland camo, weathering): brightened so the national paint reads like the other vehicles'
const TEXB={m_abrams:2,m_merkava:2,m_kf51:1.6,m_msta:2.2,m_ural:1.9,m_m35:2.2,m_oplot:2.2,m_t72:1.3};
// untextured models in a light primer (the T-62, Leopard 2A4) would come out pale under the paint: toned down to match
const UNTEX={m_t62:.62,m_leo2:.6,m_t55:.95};
// Infantry: three realistic rigged soldiers (Western desert-camo marine, Eastern green-camo, Middle-Eastern/militia woodland
// fatigues) shared by the 18 nations; national colour is a tint over the camo. 'soldier' is the old stand-in.
const SOLV={US:'sol_w',EU:'sol_w',IL:'sol_w',UA:'sol_w',KR:'sol_w',TR:'sol_w',SA:'sol_w',AE:'sol_w',EG:'sol_w',RU:'sol_e',CN:'sol_e',KP:'sol_e',CU:'sol_e',IN:'sol_e',PK:'sol_e',IR:'sol_m',RS:'sol_m',DW:'sol_m'};
// Middle Eastern architecture (mud-brick barracks, sandstone HQ, walled workshop-factory) for the Arab and Shia nations
const MEFAC=new Set(['IR','RS','DW','SA','AE','EG']),BME={hq:{m:'b_hq_me',size:58},barracks:{m:'b_barr_me',size:54},factory:{m:'b_fact_me',size:62}};
function isSol(k){return k==='soldier'||(typeof k==='string'&&k.startsWith('sol_'));}
function solKey(f){return SOLV[f]||'sol_w';}
function truckKey(f){const rk=RMAP.harv[f];return rk&&MODELS.proto[RMOD[rk].m]?RMOD[rk].m:'truck';}
const MIL_TANK={RS:{m:'technical',fit:'z',size:29},DW:{m:'technical',fit:'z',size:29},IM:{m:'toontank',fit:'z',size:32}};
for(const f of ['US','IL','EU','SA','AE','EG','KR','TR','CN','PK','IN'])MIL_TANK[f]={m:'tankE',fit:'long',size:37};
const PROPS={container:{fit:'x',size:28},containerG:{fit:'x',size:30},crate:{fit:'y',size:8},barrel:{fit:'y',size:8},sandbag:{fit:'x',size:16},watertower:{fit:'y',size:56},tent:{fit:'x',size:50},pallet:{fit:'x',size:10},fence:{fit:'x',size:24},missile:{fit:'y',size:26},sam:{fit:'y',size:24}};
// The models are separate files next to the page (models/<key>.<hash>.glb.gz, listed in MODEL_FILES by orch/build.py).
// A battle only waits for the models it can show: the shared ones (buildings, props, trees, infantry, generic vehicles)
// and the national hardware of the nations actually in it (modelsFor, called from the battle's loading screen). While
// the menu is up the rest are downloaded quietly in the background (two at a time, paused whenever a battle needs
// files or is being played) and only unpacked when a battle needs them. A file that fails to arrive just leaves that
// model out (units fall back to a stand-in model or simple shapes, and the battle log says so); a stalled file is
// given up on after 30 seconds. Nothing in the simulation reads model state, so host and clients stay in sync.
// Unzipping uses the browser's own DecompressionStream (all current browsers). Very old browsers without it skip the
// models and use the simple shapes (no extra library is loaded from another host).
function gunzipU8(u){if(typeof DecompressionStream==='undefined')return Promise.reject(new Error('no DecompressionStream'));
  return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
function fetchModel(url){const ac=typeof AbortController!=='undefined'?new AbortController():null,tm=setTimeout(()=>{if(ac)ac.abort();},30000);
  return fetch(url,ac?{signal:ac.signal}:undefined).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status+' '+url);return r.arrayBuffer();})
    .finally(()=>clearTimeout(tm));}
// a failed file is forgotten, so the next battle tries it again (flaky phone connections)
// MQ: per file, the download (bytes, still zipped) and the unpacked model; need = battles currently waiting for files
const MQ={bytes:{},parsed:{},need:0,ld:null,bg:[],bgRun:0};MODELS.failed=[];
// a nation's own hardware: its tank, militia technical, helicopter, jet and bulldozer models
function nationModelKeys(f){const s=new Set();for(const kind in RMAP){const rk=RMAP[kind][f];if(rk&&RMOD[rk])s.add(RMOD[rk].m);}
  if(MIL_TANK[f])s.add(MIL_TANK[f].m);if(f==='RS'||f==='DW')s.add(RMOD.zu.m);s.add(solKey(f));if(MEFAC.has(f))for(const k in BME)s.add(BME[k].m);return s;}
// every model that belongs to some nation (or to no unit yet, like the spare realistic models) is loaded only for a
// battle with that nation; everything else is shared and always loaded
function modelKeysFor(facs){if(typeof MODEL_FILES==='undefined')return[];const nat=new Set();
  for(const f of Object.keys(FLOOK))for(const k of nationModelKeys(f))nat.add(k);
  const want=new Set();for(const f of facs||[])for(const k of nationModelKeys(f))want.add(k);
  return Object.keys(MODEL_FILES).filter(k=>want.has(k)||!nat.has(k)&&!/^m_/.test(k));}
function modelBytes(k){const url=MODEL_FILES[k];return MQ.bytes[url]=MQ.bytes[url]||fetchModel(url);}
// Older spec/gloss materials (the Apache): Three.js dropped them from GLTFLoader after r128. Read them as plain standard
// materials (diffuse colour + texture, roughness from glossiness: what plainStd() made of them before), so the model
// keeps its paint. Glass with "transmission" (F-16 canopy) becomes see-through glass in parseModel: real transmission
// would draw the whole scene a second time every frame.
class SpecGloss{constructor(p){this.parser=p;this.name='KHR_materials_pbrSpecularGlossiness';}
  extendMaterialParams(i,P){const d=this.parser.json.materials[i],x=d&&d.extensions&&d.extensions[this.name];if(!x)return Promise.resolve();
    const f=x.diffuseFactor;if(Array.isArray(f)){P.color=new THREE.Color(f[0],f[1],f[2]);P.opacity=f[3];}
    P.userData=Object.assign(P.userData||{},{sgGloss:x.glossinessFactor!=null?x.glossinessFactor:1});
    return x.diffuseTexture?this.parser.assignTexture(P,'map',x.diffuseTexture,THREE.SRGBColorSpace):Promise.resolve();}}
function parseModel(k){if(MQ.parsed[k])return MQ.parsed[k];return MQ.parsed[k]=(async()=>{try{
    if(!THREE.GLTFLoader)throw new Error('no GLTFLoader');const ld=MQ.ld=MQ.ld||new THREE.GLTFLoader().register(p=>new SpecGloss(p));
    let b=await modelBytes(k);const u=new Uint8Array(b);if(u[0]===0x1f&&u[1]===0x8b)b=await gunzipU8(u);
    const g=await new Promise((res,rej)=>{try{ld.parse(b,'',res,rej);}catch(e){rej(e);}});const P={scene:g.scene,anims:g.animations};
    P.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;m.roughness=Math.max(.5,m.roughness??.8);m.metalness=Math.min(.35,m.metalness??0);if(m.userData.sgGloss!=null){m.roughness=Math.min(1,Math.max(.35,1-m.userData.sgGloss*.7));m.metalness=.15;}if(m.transmission>0){m.opacity*=1-m.transmission;m.transmission=0;}}}});
    try{mergeProto(P);}catch(e){console.warn('merge',k,e);}
    MODELS.proto[k]=P;MODELS.ready=true;{const i=MODELS.failed.indexOf(k);if(i>=0)MODELS.failed.splice(i,1);}delete MQ.bytes[MODEL_FILES[k]];
    // the effects module keeps a list of model geometry it must never free; a model added later must join it
    try{GC_PROTO=null;}catch(e){}return true;}
  catch(e){MODELS.err=String(e&&e.message||e);if(!MODELS.failed.includes(k))MODELS.failed.push(k);delete MQ.bytes[MODEL_FILES[k]];setTimeout(()=>{delete MQ.parsed[k];},0);console.warn('3D model '+k+' failed to load:',e);return false;}})();}
// Load (download if needed, then unpack) every model a battle with these nations shows. Resolves with {n, bad} once
// they are all in or have failed, or after maxMs at the latest (a late model then shows on units built after it lands).
// onProg(done,total) reports progress for the loading screen.
function modelsFor(facs,onProg,maxMs){const ks=modelKeysFor(facs);let done=0;MQ.need++;const T0=performance.now();
  const all=Promise.all(ks.map(k=>parseModel(k).then(ok=>{done++;if(onProg)try{onProg(done,ks.length);}catch(e){}return ok?null:k;})));
  return Promise.race([all,new Promise(r=>setTimeout(()=>r(null),maxMs||40000))]).then(res=>{MQ.need=Math.max(0,MQ.need-1);setTimeout(bgPump,0);
    const bad=res?res.filter(Boolean):ks.filter(k=>!MODELS.proto[k]);MODELS.loadMs=Math.round(performance.now()-T0);
    try{navigator.serviceWorker.ready.then(g=>{if(g.active)g.active.postMessage({t:'models',urls:ks.filter(k=>MODELS.proto[k]).map(k=>MODEL_FILES[k])});}).catch(()=>{});}catch(e){} // keep this battle's models for offline play (sw.js)
    console.log('3D models for '+(facs||[]).join('/')+': '+(ks.length-bad.length)+' of '+ks.length+' ready in '+MODELS.loadMs+' ms'+(bad.length?' (missing: '+bad.join(', ')+')':''));
    return{n:ks.length,bad};});}
// background downloads while the menu is up: shared models first (unpacked straight away, since every battle uses
// them), then the player's nation, then the rest (downloaded only)
function bgBusy(){const mn=document.getElementById('menu');return MQ.need>0||!!window.LOADING||typeof G!=='undefined'&&!!G&&!G.over&&!!mn&&mn.hidden;}
function bgPump(){if(bgBusy()){clearTimeout(MQ.bgT);MQ.bgT=setTimeout(bgPump,2000);return;}
  while(MQ.bgRun<2&&MQ.bg.length){const [k,parse]=MQ.bg.shift();if(MODELS.proto[k]||MQ.parsed[k]||!parse&&MQ.bytes[MODEL_FILES[k]])continue;MQ.bgRun++;
    (parse?parseModel(k):modelBytes(k)).catch(()=>{}).then(()=>{MQ.bgRun--;bgPump();});}
  if(!MQ.bg.length&&!MQ.bgRun&&MQ.bgDone){const d=MQ.bgDone;MQ.bgDone=null;d();}}
function loadModels(){if(MODELS.loading)return MODELS.loading;if(typeof MODEL_FILES==='undefined'||!THREE.GLTFLoader)return MODELS.loading=Promise.resolve(false);
  const shared=modelKeysFor([]),me=typeof setup!=='undefined'&&setup&&setup.p?[...nationModelKeys(setup.p)].filter(k=>MODEL_FILES[k]):[];
  MQ.bg=[...shared.map(k=>[k,1]),...me.map(k=>[k,0]),...Object.keys(MODEL_FILES).filter(k=>!shared.includes(k)&&!me.includes(k)).map(k=>[k,0])];
  // MODELS.loading settles once the background queue has drained (the test scripts wait on it); battles never wait on it
  MODELS.loading=new Promise(r=>{MQ.bgDone=()=>{if(!MODELS.ready&&!MODELS.err)MODELS.err='no models parsed';r(MODELS.ready);};});setTimeout(bgPump,0);return MODELS.loading;}
// Imported models arrive as dozens to hundreds of separate pieces (the militia technical 328, the Mi-24 157), and every
// piece is its own draw call in every pass - the biggest rendering cost in a large battle. At load time the pieces of each
// model that never move on their own are baked into one mesh per material. Animated (skinned) models and named moving
// parts (rotors, turrets, guns, barrels, propellers) are left as they are.
const MERGE_KEEP=/rotor|turret|gun|barrel|prop/i;
// un-indexed float copy of a geometry (models may store positions/uvs/colours as normalized integers)
function floatGeo(src,names){const idx=src.index?src.index.array:null,n=idx?idx.length:src.attributes.position.count,g=new THREE.BufferGeometry();
  for(const nm of names){const A=src.attributes[nm],sz=A.itemSize,a=A.array,o=new Float32Array(n*sz);const den=!A.normalized||a instanceof Float32Array?1:a instanceof Int8Array?127:a instanceof Uint8Array?255:a instanceof Int16Array?32767:a instanceof Uint16Array?65535:1;
    const io=A.isInterleavedBufferAttribute;for(let i=0;i<n;i++){const v=idx?idx[i]:i;for(let c=0;c<sz;c++){let x=io?A.getComponent?A.getComponent(v,c):[A.getX(v),A.getY(v),A.getZ(v),A.getW(v)][c]:a[v*sz+c];if(den!==1)x=Math.max(x/den,-1);o[i*sz+c]=x;}}
    g.setAttribute(nm,new THREE.BufferAttribute(o,sz));}return g;}
function mergeProto(P){const root=P.scene;if(!root||(P.anims&&P.anims.length))return;let skinned=false;root.traverse(o=>{if(o.isSkinnedMesh)skinned=true;});if(skinned)return;
  root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),M=new THREE.Matrix4(),groups=new Map(),take=[];
  const kept=o=>{for(let q=o;q&&q!==root;q=q.parent)if(MERGE_KEEP.test(q.name||''))return true;return false;};
  root.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||!o.geometry||!o.geometry.attributes.position||kept(o))return;const g=o.geometry,names=Object.keys(g.attributes).filter(n=>['position','normal','uv','color'].includes(n)).sort();
    if(!names.includes('normal'))return;const key=o.material.uuid+'|'+names.join(',')+'|'+(o.castShadow?1:0);let L=groups.get(key);if(!L){L={mat:o.material,names,items:[],cs:o.castShadow,rs:o.receiveShadow};groups.set(key,L);}L.items.push(o);});
  let before=0,after=0;
  for(const L of groups.values()){before+=L.items.length;if(L.items.length<2){after+=L.items.length;continue;}
    const parts=L.items.map(o=>{const g=floatGeo(o.geometry,L.names);M.multiplyMatrices(inv,o.matrixWorld);g.applyMatrix4(M);if(M.determinant()<0){const pa=g.attributes.position.array;for(let i=0;i<pa.length;i+=9)for(let c=0;c<3;c++){const t=pa[i+3+c];pa[i+3+c]=pa[i+6+c];pa[i+6+c]=t;}for(const n of L.names)if(n!=='position'){const A=g.attributes[n],sz=A.itemSize,a=A.array;for(let i=0;i<a.length;i+=sz*3)for(let c=0;c<sz;c++){const t=a[i+sz+c];a[i+sz+c]=a[i+2*sz+c];a[i+2*sz+c]=t;}}}return g;});
    const out=new THREE.BufferGeometry();for(const n of L.names){const sz=parts[0].attributes[n].itemSize;let len=0;for(const g of parts)len+=g.attributes[n].array.length;const arr=new Float32Array(len);let off=0;for(const g of parts){arr.set(g.attributes[n].array,off);off+=g.attributes[n].array.length;}out.setAttribute(n,new THREE.BufferAttribute(arr,sz,false));}
    out.computeBoundingBox();out.computeBoundingSphere();const m=new THREE.Mesh(out,L.mat);m.castShadow=L.cs;m.receiveShadow=L.rs;m.name='merged';
    for(const o of L.items){if(o.parent)o.parent.remove(o);}root.add(m);after++;for(const g of parts)g.dispose();}
  P.merged=[before,after];}
const WX_COMMON=`varying vec3 vWP;float wh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float wn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(wh(i),wh(i+vec3(1,0,0)),f.x),mix(wh(i+vec3(0,1,0)),wh(i+vec3(1,1,0)),f.x),f.y),mix(mix(wh(i+vec3(0,0,1)),wh(i+vec3(1,0,1)),f.x),mix(wh(i+vec3(0,1,1)),wh(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
const WXE={value:new THREE.Vector4(.42,.36,.27,0)};// rgb = ground grime colour (mud/sand/snow), w = 1 snow
function wxEnv(){const th=typeof G!=='undefined'&&G&&G.map?G.map.theme:'';WXE.value.set(...(th==='snow'?[.80,.82,.86,1]:th==='green'?[.30,.24,.17,0]:[.52,.43,.31,0]));}
function weather(m,amt,camo){if(!m||m.userData.wx)return;m.userData.wx=1;amt=amt||1;camo=camo||0;if(camo)m.extensions=Object.assign(m.extensions||{},{derivatives:true});
  m.onBeforeCompile=sh=>{sh.uniforms.wAmt={value:amt};sh.uniforms.wEnv=WXE;sh.uniforms.wKind={value:m.userData.wk||0};sh.uniforms.wCamo={value:camo};sh.uniforms.wRefl={value:m.userData.refl||0};sh.uniforms.wCA={value:m.userData.camoA||new THREE.Color(.30,.25,.17)};sh.uniforms.wCB={value:m.userData.camoB||new THREE.Color(.13,.15,.10)};sh.uniforms.wPat={value:m.userData.camoP||0};sh.uniforms.wSc={value:m.userData.camoS||1};sh.uniforms.wCC={value:m.userData.camoC||new THREE.Color(.5,.45,.35)};sh.uniforms.wTrim={value:m.userData.trimC||new THREE.Color(.5,.5,.5)};sh.uniforms.wWall={value:m.userData.wall||0};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vOP;varying float vOY;varying vec3 vWN;').replace('#include <project_vertex>','#include <project_vertex>\nvec4 wq=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nwq=instanceMatrix*wq;\n#endif\nvWP=(modelMatrix*wq).xyz;vOP=position;vOY=(modelMatrix*vec4(0.,0.,0.,1.)).y;vWN=normalize(mat3(modelMatrix)*objectNormal+vec3(0.,1e-4,0.));');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float wAmt;uniform vec4 wEnv;uniform float wKind;uniform float wCamo;uniform float wRefl;uniform vec3 wCA;uniform vec3 wCB;uniform float wPat;uniform float wSc;uniform vec3 wCC;uniform vec3 wTrim;uniform float wWall;varying vec3 vOP;varying float vOY;varying vec3 vWN;\n'+WX_COMMON).replace('#include <color_fragment>',`#include <color_fragment>
      float gn=wn(vWP*.11)*.55+wn(vWP*.43)*.3+wn(vWP*1.7)*.15;float st=smoothstep(.55,.85,wn(vWP*vec3(.6,.08,.6)));
      vec3 dust=vec3(.42,.38,.30);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*(.78+.36*gn),wAmt);
      diffuseColor.rgb=mix(diffuseColor.rgb,dust*(.8+.3*gn),wAmt*(.10+.16*(1.-gn)));diffuseColor.rgb*=1.-wAmt*.18*st;if(wCamo>0.){vec3 base=diffuseColor.rgb;float lum=dot(base,vec3(.3,.59,.11));
        if(lum>.035){vec3 p=vOP*wCamo*wSc;float k=.62+lum*1.25;vec3 paint=base;
          if(wPat<2.5||wPat>3.5){
            // organic, hand-painted shapes: domain-warped noise with crisp anti-aliased edges
            vec3 q=p;if(wPat>1.5&&wPat<2.5)q*=vec3(.42,2.4,2.4);if(wPat>3.5&&wPat<4.5)q*=2.3;
            q+=(vec3(wn(q*.55+3.1),wn(q*.55+7.7),wn(q*.55+1.9))-.5)*1.5;
            float n1=wn(q*.9)*.62+wn(q*2.1)*.38,n2=wn(q*1.05+11.3)*.62+wn(q*2.4+4.1)*.38,n3=wn(q*1.4+23.7)*.6+wn(q*3.1+8.2)*.4;
            if(wPat>.5&&wPat<1.5){vec3 r=q*1.9;n1=wn(r*.9)*.55+wn(r*2.4)*.45;n2=wn(r*1.05+11.3)*.55+wn(r*2.7+4.1)*.45;n3=wn(r*1.4+23.7)*.55+wn(r*3.3+8.2)*.45;}
            if(wPat>4.5&&wPat<5.5){float a=dot(p.xz,vec2(.8,.6))+p.y*.3+wn(p*.6)*1.4;n1=.5+.5*sin(a*2.6);n2=.5+.5*sin(dot(p.xz,vec2(-.5,.86))*2.9+wn(p*.5)*2.);n3=0.;}
            if(wPat>5.5){n1=wn(q*.8)*.7+wn(q*1.9)*.3;n2=wn(p*5.5)*.8+wn(p*11.)*.2;n3=wn(p*5.5+9.)*.8+wn(p*11.+3.)*.2;}
            float caA=max(fwidth(n1),.002),caB=max(fwidth(n2),.002),caC=max(fwidth(n3),.002);
            float ctA=wPat>5.5?.6:.56,ctB=wPat>5.5?.74:.6,ctC=wPat>5.5?.76:.64;
            float cmA=smoothstep(ctA-caA,ctA+caA,n1),cmB=smoothstep(ctB-caB,ctB+caB,n2),cmC=smoothstep(ctC-caC,ctC+caC,n3);
            paint=mix(paint,wCA*k,cmA*.92);paint=mix(paint,wCB*k,cmB*.92);paint=mix(paint,wCC*k,cmC*.85);}
          // weathering: dust and mud up the lower hull, fine paint chips, faint rain streaks
          float hh=vWP.y-vOY;float dust=(1.-smoothstep(.5,5.5,hh))*.5+wn(p*3.7)*.08;paint=mix(paint,vec3(.40,.34,.26)*(.8+lum*.5),clamp(dust,0.,.6)*step(wKind,1.5));
          float ch=wn(p*16.+5.)*.7+wn(p*33.)*.3;paint=mix(paint,vec3(.16,.16,.15),smoothstep(.74,.76,ch)*.55);
          float st=wn(vec3(p.x*9.,p.y*.7,p.z*9.));paint*=1.-.08*smoothstep(.55,.85,st);
          paint*=mix(.72,1.06,smoothstep(-.7,.85,vWN.y))*mix(.86,1.,smoothstep(0.,3.,hh));
          diffuseColor.rgb=paint;}}
      if(wWall>.5){float hh=vWP.y-vOY,vert=1.-abs(vWN.y);if(vert>.6){vec3 base=diffuseColor.rgb;float lum=dot(base,vec3(.3,.59,.11));
        if(wWall<1.5){float b=step(9.,hh)*step(hh,13.);float tl=step(.5,fract((vWP.x+vWP.z)*.35))*.25;diffuseColor.rgb=mix(base,wTrim*(.85+tl),b*.85);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.92,.88,.78),step(13.,hh)*step(hh,13.8)*.8);}
        else if(wWall<2.5){float g=max(1.-smoothstep(0.,.25,abs(fract(hh/6.)-.5)*6.),1.-smoothstep(0.,.25,abs(fract((vWP.x+vWP.z)/8.)-.5)*8.));diffuseColor.rgb*=1.-.22*g;diffuseColor.rgb=mix(diffuseColor.rgb,wTrim*.9,step(2.,hh)*step(hh,3.4)*.8);}
        else if(wWall<3.5){diffuseColor.rgb=mix(base,wTrim*(.8+lum*.4),step(4.,hh)*step(hh,6.)*.85);}
        else if(wWall<4.5){float cr=1.-smoothstep(0.,.2,abs(fract(hh/2.4)-.5)*2.4);float of=1.-smoothstep(0.,.2,abs(fract((vWP.x+vWP.z)/5.+step(.5,fract(hh/4.8))*.5)-.5)*5.);diffuseColor.rgb*=1.-.16*max(cr,of*step(.5,1.-cr));diffuseColor.rgb=mix(diffuseColor.rgb,wTrim,step(1.,hh)*step(hh,2.2)*.75);}
        else{float b=step(7.,hh)*step(hh,11.);diffuseColor.rgb=mix(base,wTrim,b*.9);float tx=step(.55,fract((vWP.x+vWP.z)*.5))*step(8.,hh)*step(hh,10.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.95),tx*b*.8);}}}float dh=1.-smoothstep(1.,9.,vWP.y-vOY);diffuseColor.rgb=mix(diffuseColor.rgb,wEnv.rgb*(.85+.3*gn),dh*wAmt*.55);
      {float hq=vWP.y-vOY;vec3 b0=diffuseColor.rgb;float l0=dot(b0,vec3(.3,.59,.11));
       if(wKind>1.5){/*aircraft: panel lines, sun-faded top, exhaust soot streaks*/vec3 pp=vOP*.9;float pl=1.-smoothstep(0.,.05,abs(fract(pp.x*.55)-.5)*2.-.9)*0.;float gx=min(abs(fract(pp.x*.42)-.5),abs(fract(pp.z*.37)-.5));diffuseColor.rgb*=1.-.16*(1.-smoothstep(.0,.012,gx))*step(.04,l0);float so=wn(vec3(pp.x*.5,pp.y*2.,pp.z*14.));diffuseColor.rgb*=1.-.22*smoothstep(.55,.85,so);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.12+vec3(.03),smoothstep(.5,1.,vWN.y)*.25);}
       else if(wKind>.5){/*ships: rust runs, salt stain, waterline grime*/float rs=wn(vec3(vOP.x*3.,vOP.y*.35,vOP.z*3.));float rr=smoothstep(.62,.8,rs)*(1.-smoothstep(0.,6.,hq));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.34,.17,.09)*(.7+.5*gn),rr*.6);float sl=1.-smoothstep(0.,2.4,hq);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.07,.08,.07),sl*.55);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.78,.74),smoothstep(.6,.85,wn(vWP*vec3(.9,.2,.9)))*(1.-sl)*.12);}
       else{/*ground: sun-faded top, rust streaks, mud on lower hull, snow settling on up-facing*/diffuseColor.rgb=mix(diffuseColor.rgb,vec3(l0)*1.08+vec3(.03,.025,.015),smoothstep(.55,1.,vWN.y)*.18*wAmt);float rs=wn(vec3(vOP.x*4.,vOP.y*.5,vOP.z*4.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.30,.16,.09)*(.7+.5*gn),smoothstep(.72,.9,rs)*.28*wAmt*step(.04,l0));if(wEnv.w>.5)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.88,.92),smoothstep(.62,.95,vWN.y)*.42*wAmt);}}`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(.5-gn)*.25*wAmt,.3,1.);').replace('#include <dithering_fragment>','#include <dithering_fragment>\n{vec3 vv=normalize(vViewPosition);float rim=pow(1.-clamp(dot(normalize(normal),vv),0.,1.),3.);gl_FragColor.rgb+=vec3(.55,.62,.75)*rim*.22*wAmt*(1.-.6*wRefl);if(wRefl>0.){vec3 Vw=normalize(cameraPosition-vWP),Nw=normalize(vWN+vec3(0.,1e-4,0.));float ndv=clamp(dot(Nw,Vw),0.,1.);vec3 Rw=reflect(-Vw,Nw);vec3 env=Rw.y>0.?mix(vec3(.6,.64,.68),vec3(.33,.48,.74),smoothstep(0.,.6,Rw.y)):vec3(.23,.2,.16);float fr=.04+.96*pow(1.-ndv,5.);float sp=pow(max(dot(Rw,vec3(-.66,.57,-.46)),0.),70.);float lu=dot(gl_FragColor.rgb,vec3(.33));gl_FragColor.rgb=mix(gl_FragColor.rgb,env*(.5+.5*lu),clamp(fr*.5*wRefl,0.,.6))+vec3(1.,.93,.8)*sp*.5*wRefl;}if(wCamo>0.){float up=clamp(vWN.y/max(length(vWN),1e-4),0.,1.);gl_FragColor.rgb+=vec3(.42,.5,.62)*rim*.18+vec3(.06,.07,.08)*up*up;}}');};
  m.customProgramCacheKey=()=>'wx'+(m.userData.wk||0)+amt+'_'+camo+'_'+(m.userData.camoP||0)+'_'+(m.userData.wall||0);}
function normScale(obj,fit,size){obj.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(obj),sz=bb.getSize(new THREE.Vector3());const dim=fit==='y'?sz.y:fit==='x'?sz.x:(fit==='xz'||fit==='long')?Math.max(sz.x,sz.z):sz.z;const s=size/Math.max(.001,dim);const c=bb.getCenter(new THREE.Vector3());return{s,cx:c.x,cz:c.z,my:bb.min.y,xl:sz.x>sz.z};}
const CAMOK={};function camoFreq(key){if(CAMOK[key]!==undefined)return;if(!['tank','tankE','tankW','truck','technical','toontank'].includes(key)){CAMOK[key]=0;return;}const P=MODELS.proto[key];P.scene.updateMatrixWorld(true);let mx=0;P.scene.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox,sz=b.getSize(new THREE.Vector3());mx=Math.max(mx,sz.x,sz.y,sz.z);}});CAMOK[key]=mx>0?4/mx:0;}
/* ---------- per-country looks: vehicle paint, camo blotches, uniform colour and national flag ---------- */
const FLOOK={
  US:{veh:'#b8a47e',ca:'#7a6040',cb:'#4b4630',uni:'#a79a78',pat:1}, TR:{veh:'#5f6345',ca:'#4a3a26',cb:'#2a2c20',uni:'#5d6248',pat:1},
  IL:{veh:'#8c8a7a',ca:'#6f6c60',cb:'#56544a',uni:'#6f6b4e',pat:3}, EU:{veh:'#55603f',ca:'#4b3d2a',cb:'#1e201b',uni:'#5c6447',pat:4},
  UA:{veh:'#5a6340',ca:'#3e3a2a',cb:'#2c3024',uni:'#6a6b4c',pat:1}, RU:{veh:'#5d6a3e',ca:'#2b2b25',cb:'#a89a6e',uni:'#65684a',pat:0},
  IR:{veh:'#b5a072',ca:'#8a7651',cb:'#5c5240',uni:'#6f7a4a',pat:0}, SA:{veh:'#c2ac80',ca:'#a18a62',cb:'#7d6a4b',uni:'#b19c74',pat:3},
  AE:{veh:'#c6b088',ca:'#a58e66',cb:'#83704f',uni:'#b6a27c',pat:0}, PK:{veh:'#6b6a48',ca:'#8b7a55',cb:'#3d3a2a',uni:'#77714f',pat:0},
  IN:{veh:'#6a6d48',ca:'#4b3e2a',cb:'#9e9468',uni:'#6f6f4f',pat:4}, CN:{veh:'#5c6a46',ca:'#3f4a33',cb:'#7d8662',uni:'#5e6a4c',pat:1},
  KP:{veh:'#4e5636',ca:'#3a3826',cb:'#2a2a20',uni:'#575c3e',pat:3}, KR:{veh:'#535d3c',ca:'#45392a',cb:'#2a2b23',uni:'#5d6347',pat:1},
  EG:{veh:'#c1a97b',ca:'#9d855b',cb:'#7a6644',uni:'#ae976d',pat:3}, CU:{veh:'#59603f',ca:'#3e3a28',cb:'#7d7a55',uni:'#5f6345',pat:3},
  RS:{veh:'#8c7356',ca:'#5c4a37',cb:'#3a3027',uni:'#4a4f34',pat:2}, DW:{veh:'#c4a774',ca:'#9a7f56',cb:'#6e5b3e',uni:'#b7a47a',pat:2},
  IM:{veh:'#6a6a58',ca:'#4d4b3f',cb:'#8a8672',uni:'#6c6b57'}};
// Each nation's own camouflage (pattern 0 blotch, 1 digital, 2 tiger stripe, 3 plain paint, 4 flecktarn dots,
// 5 splinter, 6 chocolate-chip) at its own scale with a third colour, and its own building trim and wall finish
// (wall 1 glazed-tile band, 2 concrete panels, 3 painted stripe, 4 stone courses, 5 slogan band).
const CAMOX={US:{p:1,s:1.15,c:'#d6c9a4',t:'#3e5a8a',w:3},TR:{p:1,s:.85,c:'#6f6a4a',t:'#c8102e',w:4},IL:{p:3,s:1,c:'#8f8c7c',t:'#1f5fbf',w:4},EU:{p:4,s:1,c:'#2b3a22',t:'#2c4fa0',w:3},
  UA:{p:1,s:1.35,c:'#7a7a52',t:'#e1b80d',w:3},RU:{p:0,s:.7,c:'#8a8f6a',t:'#b22222',w:2},IR:{p:0,s:1.2,c:'#c4b48c',t:'#1f8a8a',w:1},SA:{p:6,s:1,c:'#e3d6b4',t:'#0f6b3a',w:4},
  AE:{p:3,s:1,c:'#cbb991',t:'#00843d',w:4},PK:{p:0,s:.95,c:'#5a6a3c',t:'#0b6b2b',w:4},IN:{p:5,s:1,c:'#7d7653',t:'#e07b14',w:4},CN:{p:1,s:1.6,c:'#46553a',t:'#c8102e',w:2},
  KP:{p:3,s:1,c:'#4c5434',t:'#c8102e',w:5},KR:{p:1,s:1.1,c:'#3c4530',t:'#1f3f9a',w:2},EG:{p:6,s:1.1,c:'#ddd0aa',t:'#b8862b',w:4},CU:{p:0,s:1.5,c:'#4a5a34',t:'#1e4fa0',w:3},
  RS:{p:2,s:1,c:'#2a2620',t:'#c9a227',w:1},DW:{p:2,s:.8,c:'#7c5a36',t:'#4a2f1c',w:1},IM:{p:3,s:1,c:'#6a6a58',t:'#888',w:0}};
/* Each air force's real paint (Abdullah: realistic, never bright): b = base, p = pattern (0 blotch camo, 1 digital,
   3 plain), a/m/c = the camo colours; h = the helicopter scheme. Grey jets for the western/Gulf/Asian air forces,
   blue-grey splinter on Russian Sukhois, pixel grey-blue on Ukrainian ones, desert three-tone for Iran, the militias
   and Israel, olive for North Korea and Cuba. */
const AIRX={US:{b:'#7f878d',p:3,h:{b:'#3e4335',p:3}},RU:{b:'#8f9ead',p:0,a:'#6c7f92',m:'#a9b6c2',c:'#5c6e80',s:1,h:{b:'#59603f',p:0,a:'#6b5c42',m:'#454a33',c:'#59603f'}},
  UA:{b:'#8a949e',p:1,a:'#5f6b77',m:'#a8b1b9',c:'#717c86',s:1.2,h:{b:'#5b6141',p:0,a:'#6a5c40',m:'#44492f',c:'#5b6141'}},
  IR:{b:'#b29d74',p:0,a:'#8a6d48',m:'#6e6b4e',c:'#c7b48c',s:1,h:{b:'#a99470',p:0,a:'#7d6644',m:'#646349',c:'#b9a47c'}},
  RS:{b:'#a8936c',p:0,a:'#7a6343',m:'#5e5d44',c:'#bba57e',s:1,h:{b:'#6b6a4c',p:0,a:'#5a4a34',m:'#4a4b36',c:'#7b7656'}},
  DW:{b:'#b49d72',p:0,a:'#8d7148',m:'#6c6648',c:'#c8b388',s:1.1,h:{b:'#a08b66',p:0,a:'#7a6444',m:'#5f5d44',c:'#b39e78'}},
  IL:{b:'#a99a7b',p:0,a:'#7e6a4c',m:'#6b6d52',c:'#bba985',s:1,h:{b:'#5f6050',p:3}},
  KP:{b:'#596040',p:3,h:{b:'#4f5639',p:3}},CU:{b:'#666a4c',p:0,a:'#5a4c36',m:'#454a33',c:'#787a5a',s:1,h:{b:'#565c3e',p:3}},
  CN:{b:'#7c8a97',p:3,h:{b:'#59624a',p:3}},IN:{b:'#878d91',p:3,h:{b:'#575d47',p:3}},PK:{b:'#8a9095',p:3,h:{b:'#5b6045',p:3}},
  TR:{b:'#838a8e',p:3,h:{b:'#575d47',p:3}},EU:{b:'#80878b',p:3,h:{b:'#4b5143',p:3}},KR:{b:'#858b8f',p:3,h:{b:'#4f5541',p:3}},
  SA:{b:'#8b9194',p:3,h:{b:'#b8a37e',p:3}},AE:{b:'#b7a17a',p:0,a:'#8f7a57',m:'#a08a64',c:'#c6b38f',s:1.1,h:{b:'#b8a37e',p:3}},EG:{b:'#8d9396',p:3,h:{b:'#b09a74',p:3}}};
const AIRKEY=/^(jet|heli)$|^m_(su35|f15|f16|f18|j10|mig29|rafale|typhoon|ah1|apache|ka52|mi24|mi28|mi8|uh60)$/,HELIKEY=/^heli$|^m_(ah1|apache|ka52|mi24|mi28|mi8|uh60)$/;
function airScheme(key,team){if(!team||!team.fac||!AIRKEY.test(key))return null;const X=AIRX[team.fac];if(!X)return null;return HELIKEY.test(key)?X.h:X;}
function airCamoFreq(key){const P=MODELS.proto[key];if(!P)return 0;if(P._acf!=null)return P._acf;P.scene.updateMatrixWorld(true);let mx=0;P.scene.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const sz=o.geometry.boundingBox.getSize(new THREE.Vector3());mx=Math.max(mx,sz.x,sz.y,sz.z);}});return P._acf=mx>0?3.2/mx:0;}
const FLAGTEX={};
// Militia emblems, drawn on a 120x72 canvas: Mountain Shias carry the Zulfiqar (the forked double-bladed sword),
// Coffee Shias a lion standing over a jambiya dagger.
function drawEmblem(x,fac,bg){const W=120,H=72;
  if(fac==='RS'){if(bg){x.fillStyle='#111';x.fillRect(0,0,W,H);x.fillStyle='#b3262c';x.fillRect(0,H*.7,W,H*.3);}
    x.save();x.translate(60,32);x.rotate(-.12);const sil='#e9e7e1',gold='#d6b24a',dk='#2a2a2a';
    // blade with the forked tip
    x.fillStyle=sil;x.beginPath();x.moveTo(-26,-4);x.lineTo(14,-5.5);x.quadraticCurveTo(34,-8,47,-14);x.lineTo(40,-6.5);x.quadraticCurveTo(30,-3,20,-1);x.lineTo(20,1);x.quadraticCurveTo(30,3,40,6.5);x.lineTo(47,14);x.quadraticCurveTo(34,8,14,5.5);x.lineTo(-26,4);x.closePath();x.fill();
    x.strokeStyle='#9a9890';x.lineWidth=1;x.beginPath();x.moveTo(-24,0);x.lineTo(18,0);x.stroke();
    // crossguard, grip, pommel
    x.fillStyle=gold;x.beginPath();x.moveTo(-26,-13);x.quadraticCurveTo(-31,0,-26,13);x.lineTo(-30,13);x.quadraticCurveTo(-35,0,-30,-13);x.closePath();x.fill();
    x.fillStyle=dk;x.fillRect(-46,-3.2,17,6.4);x.fillStyle=gold;for(let i=0;i<4;i++)x.fillRect(-44+i*4,-3.2,1.2,6.4);x.beginPath();x.arc(-48,0,4.2,0,7);x.fill();x.restore();}
  else if(fac==='DW'){if(bg){x.fillStyle='#4a2f1c';x.fillRect(0,0,W,H);x.fillStyle='#c8a46e';x.fillRect(0,H-12,W,12);}
    const gold='#e2b64a',dk='#2b1c10';
    // lion, facing right
    x.fillStyle=gold;x.beginPath();x.ellipse(54,30,22,9,0,0,7);x.fill();
    for(const [lx,ly] of [[38,36],[46,36],[62,36],[70,36]]){x.fillRect(lx-2.5,ly,5,12);x.fillRect(lx-3,ly+10,7,3);}
    x.save();x.translate(80,22);x.fillStyle='#b8862e';x.beginPath();for(let i=0;i<=18;i++){const a=i/18*6.283,r=i%2?8:12.5;x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.closePath();x.fill();x.fillStyle=gold;x.beginPath();x.arc(2,1,7,0,7);x.fill();x.fillRect(5,1,7,5);x.fillStyle=dk;x.beginPath();x.arc(4,-1.5,1.3,0,7);x.fill();x.restore();
    x.strokeStyle=gold;x.lineWidth=2.6;x.lineCap='round';x.beginPath();x.moveTo(33,27);x.quadraticCurveTo(20,20,24,10);x.stroke();x.fillStyle='#b8862e';x.beginPath();x.arc(24,9,3,0,7);x.fill();
    // jambiya: wide hilt and a sharply curved blade
    x.save();x.translate(60,58);x.fillStyle='#d9d4c8';x.beginPath();x.moveTo(-6,-2.5);x.lineTo(16,-3);x.quadraticCurveTo(30,-3,33,-11);x.quadraticCurveTo(30,2,14,3);x.lineTo(-6,2.5);x.closePath();x.fill();
    x.fillStyle=gold;x.fillRect(-9,-5,3,10);x.fillStyle=dk;x.fillRect(-24,-3,15,6);x.fillStyle=gold;x.beginPath();x.moveTo(-24,-3);x.lineTo(-30,-7);x.lineTo(-30,7);x.lineTo(-24,3);x.closePath();x.fill();x.restore();}}
function emblemCanvas(fac,size){const c=document.createElement('canvas');c.width=size*2;c.height=size*2;const x=c.getContext('2d');x.fillStyle=fac==='RS'?'#111':'#4a2f1c';x.fillRect(0,0,c.width,c.height);const k=size*2/120;x.scale(k,k);x.translate(0,24);drawEmblem(x,fac,true);return c;}
function flagTex(fac){if(FLAGTEX[fac])return FLAGTEX[fac];const W=120,H=72,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const rect=(col,a,b,w,h)=>{x.fillStyle=col;x.fillRect(a,b,w,h);};const hs=(cols)=>cols.forEach((col,i)=>rect(col,0,i*H/cols.length,W,H/cols.length+1));const vs=(cols)=>cols.forEach((col,i)=>rect(col,i*W/cols.length,0,W/cols.length+1,H));
  const star=(cx,cy,r,col,n=5)=>{x.fillStyle=col;x.beginPath();for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,rr=i%2?r*.42:r;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}x.closePath();x.fill();};
  const circ=(cx,cy,r,col)=>{x.fillStyle=col;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();};
  const crescent=(cx,cy,r,col,bg,off)=>{circ(cx,cy,r,col);circ(cx+r*off,cy,r*.82,bg);};
  switch(fac){
    case 'US':for(let i=0;i<13;i++)rect(i%2?'#ffffff':'#b22234',0,i*H/13,W,H/13+1);rect('#3c3b6e',0,0,W*.42,H*7/13);x.fillStyle='#fff';for(let r=0;r<5;r++)for(let q=0;q<6;q++)circ(5+q*8.2,4.5+r*7.4,1.3,'#fff');break;
    case 'TR':rect('#e30a17',0,0,W,H);crescent(44,36,19,'#fff','#e30a17',.25);star(70,36,9,'#fff');break;
    case 'IL':rect('#fff',0,0,W,H);rect('#0038b8',0,8,W,10);rect('#0038b8',0,H-18,W,10);x.strokeStyle='#0038b8';x.lineWidth=3;for(const f of [1,-1]){x.beginPath();x.moveTo(60,36-14*f);x.lineTo(60+12,36+7*f);x.lineTo(60-12,36+7*f);x.closePath();x.stroke();}break;
    case 'EU':rect('#003399',0,0,W,H);for(let i=0;i<12;i++){const a=i/12*6.283;star(60+Math.cos(a)*22,36+Math.sin(a)*22,4.2,'#ffcc00');}break;
    case 'UA':hs(['#0057b7','#ffd700']);break;
    case 'RU':hs(['#ffffff','#0039a6','#d52b1e']);break;
    case 'IR':hs(['#239f40','#ffffff','#da0000']);circ(60,36,7,'#da0000');circ(60,36,4,'#ffffff');rect('#da0000',59,30,2,12);break;
    case 'SA':rect('#006c35',0,0,W,H);x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();for(let i=0;i<=40;i++){const px=26+i*1.7,py=28+Math.sin(i*.9)*4;i?x.lineTo(px,py):x.moveTo(px,py);}x.stroke();rect('#fff',30,46,62,3);rect('#fff',88,43,3,9);break;
    case 'AE':hs(['#00732f','#ffffff','#000000']);rect('#ff0000',0,0,30,H);break;
    case 'PK':rect('#ffffff',0,0,30,H);rect('#01411c',30,0,W-30,H);crescent(76,38,18,'#fff','#01411c',.3);star(86,28,7,'#fff');break;
    case 'IN':hs(['#ff9933','#ffffff','#138808']);x.strokeStyle='#000080';x.lineWidth=2;x.beginPath();x.arc(60,36,9,0,7);x.stroke();for(let i=0;i<12;i++){const a=i/12*6.283;x.beginPath();x.moveTo(60,36);x.lineTo(60+Math.cos(a)*9,36+Math.sin(a)*9);x.stroke();}break;
    case 'CN':rect('#de2910',0,0,W,H);star(22,20,12,'#ffde00');for(const [a,b] of [[42,8],[50,16],[50,28],[42,36]])star(a,b,4,'#ffde00');break;
    case 'KP':rect('#024fa2',0,0,W,H);rect('#fff',0,13,W,4);rect('#fff',0,H-17,W,4);rect('#ed1c27',0,17,W,H-34);circ(40,36,14,'#fff');star(40,36,13,'#ed1c27');break;
    case 'KR':rect('#fff',0,0,W,H);x.fillStyle='#cd2e3a';x.beginPath();x.arc(60,36,15,Math.PI,0);x.fill();x.fillStyle='#0047a0';x.beginPath();x.arc(60,36,15,0,Math.PI);x.fill();circ(52.5,36,7.5,'#cd2e3a');circ(67.5,36,7.5,'#0047a0');
      x.save();for(const [cx,cy,ang] of [[24,14,.59],[96,58,.59],[96,14,-.59],[24,58,-.59]]){x.save();x.translate(cx,cy);x.rotate(ang);for(let b=0;b<3;b++)rect('#000',-9,-7+b*5,18,3);x.restore();}x.restore();break;
    case 'EG':hs(['#ce1126','#ffffff','#000000']);x.fillStyle='#c09300';x.beginPath();x.moveTo(60,27);x.lineTo(68,36);x.lineTo(64,46);x.lineTo(56,46);x.lineTo(52,36);x.closePath();x.fill();break;
    case 'CU':for(let i=0;i<5;i++)rect(i%2?'#ffffff':'#002a8f',0,i*H/5,W,H/5+1);x.fillStyle='#cf142b';x.beginPath();x.moveTo(0,0);x.lineTo(54,36);x.lineTo(0,H);x.closePath();x.fill();star(17,36,10,'#fff');break;
    case 'RS':drawEmblem(x,'RS',true);break;
    case 'DW':drawEmblem(x,'DW',true);break;
    case 'IM':rect('#4d5a3a',0,0,W,H);x.fillStyle='#e8e6dc';x.beginPath();x.moveTo(30,54);x.lineTo(55,20);x.lineTo(66,36);x.lineTo(76,26);x.lineTo(92,54);x.closePath();x.fill();break;
    default:rect('#888',0,0,W,H);}
  x.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<W;i+=6)x.fillRect(i,0,3,H);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return FLAGTEX[fac]=t;}
// A soft sky/ground environment for reflections on painted metal (vehicles, aircraft, ships) and glass/steel on
// buildings, so they pick up a sheen and catch the light instead of looking flat.
let ENVT=null;function envTex(){if(window.NOENV)return null;if(ENVT||typeof R3==='undefined'||!R3||!THREE.PMREMGenerator)return ENVT;try{const sc=new THREE.Scene();const g=new THREE.SphereGeometry(50,32,16);
  const m=new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 d;void main(){float y=d.y;vec3 sky=mix(vec3(.75,.72,.66),vec3(.38,.55,.85),smoothstep(0.,.7,y));vec3 gr=mix(vec3(.42,.36,.28),vec3(.22,.19,.15),smoothstep(0.,-.6,y));vec3 c=y>0.?sky:gr;c+=vec3(1.,.9,.75)*pow(max(dot(d,normalize(vec3(-.55,.55,-.4))),0.),48.)*6.;gl_FragColor=vec4(c,1.);}'});
  sc.add(new THREE.Mesh(g,m));const pm=new THREE.PMREMGenerator(R3);ENVT=pm.fromScene(sc,.02).texture;pm.dispose();}catch(e){console.warn('env',e);}return ENVT;}
function tintedProto(key,team,kk){wxEnv();camoFreq(key);const LK=team&&team.fac?FLOOK[team.fac]:null;const id=key+'|'+(team?team.color:'none')+(kk||'')+(LK?team.fac:'');if(MODELS.tinted[id])return MODELS.tinted[id];const P=MODELS.proto[key];if(!P)return null;
  const tc=team?new THREE.Color(team.color).convertSRGBToLinear():null;const map=new Map();const root=P.scene;
  const k=kk||(isSol(key)?.0:key==='inf'||key==='hero'?.1:.16);
  const clone=(THREE.SkeletonUtils&&root.getObjectByProperty('type','SkinnedMesh'))?THREE.SkeletonUtils.clone(root):root.clone(true);
  clone.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];const nm=ms.map(m=>{if(!map.has(m)){const c=plainStd(m.clone());if(key==='heli'&&/Gray_Aircraft/.test(m.name||'')){c.visible=false;}const isB=/^b_/.test(key);if(isB&&c.color){const hs={};c.color.getHSL(hs);c.color.setHSL(hs.h,hs.s*.55,hs.l*.95);}c.userData.wk=(key==='boat'||key==='ship'||/^m_(fr[egw]|spb|sub[emw])$/.test(key))?1:(/^(jet|heli|drone)$|^m_(su35|f15|f16|f18|j10|mig29|rafale|typhoon|ah1|apache|ka52|mi24|mi28|mi8|uh60)$/.test(key)?2:0);const AS=airScheme(key,team);weather(c,['tree1','tree2','tree3','tree4'].includes(key)?.5:(key==='boat'||key==='ship')?.15:isB?1.35:1,AS&&AS.p!==3?airCamoFreq(key):CAMOK[key]?CAMOK[key]:0);const VK=['tank','tankE','tankW','truck','technical','toontank','m_t90','m_hilux','m_ozelot','m_abrams','m_merkava','m_kf51','m_msta','m_g6','m_ural','m_m35','m_humvee','m_oplot','m_t72','m_t62','m_t55','m_leo2'];if(isB)c.userData.refl=.35;{const LV={m_su35:.7,m_j10:.75,m_f18:.45,m_typhoon:.15,m_f15:.2,m_f16:.15,m_rafale:.15,m_mig29:.2};const lv=LV[key];if(lv&&c.color){const l=c.color.r*.3+c.color.g*.59+c.color.b*.11;c.color.lerp(new THREE.Color(.18,.2,.22).multiplyScalar(.7+l*1.6),lv);}}if(VK.includes(key)||/^m_|^(jet|heli|drone|boat|ship)$/.test(key))c.userData.refl=/^m_(f|su|ra|ty|j1|mig)|^jet$/.test(key)?1:.75;if(LK&&c.color){const lum=c.color.r*.3+c.color.g*.59+c.color.b*.11;if(lum>.012){if(key==='soldier')c.color.lerp(new THREE.Color(LK.uni).convertSRGBToLinear(),.6);else if(isSol(key)){c.color.lerp(new THREE.Color(LK.uni).lerp(new THREE.Color('#ffffff'),.4).convertSRGBToLinear(),.5);c.color.multiplyScalar(1.8);}else if(VK.includes(key)){const tgt=new THREE.Color(LK.veh).convertSRGBToLinear().multiplyScalar(Math.min(1.6,.55+lum*2.2));c.color.lerp(tgt,.85);if(c.map&&TEXB[key])c.color.multiplyScalar(TEXB[key]);else if(!c.map&&UNTEX[key])c.color.multiplyScalar(UNTEX[key]);}}if(VK.includes(key)){const X=CAMOX[team.fac]||{};c.userData.camoA=new THREE.Color(LK.ca).convertSRGBToLinear();c.userData.camoB=new THREE.Color(LK.cb).convertSRGBToLinear();c.userData.camoP=X.p!=null?X.p:(LK.pat||0);c.userData.camoS=X.s||1;c.userData.camoC=new THREE.Color(X.c||LK.ca).convertSRGBToLinear();}}if(AS&&c.color&&!/glass|canopy|cockpit|window|light|lamp/i.test(m.name||'')){const lum=c.color.r*.3+c.color.g*.59+c.color.b*.11;if(lum>.04){const bc=new THREE.Color(AS.b).convertSRGBToLinear(),bl=bc.r*.3+bc.g*.59+bc.b*.11;
        if(c.map)c.color.lerp(bc.multiplyScalar(Math.min(4,(.35+lum*.65)/bl)),.7);else c.color.lerp(bc.multiplyScalar(Math.min(1.6,.6+lum*1.4)),.82);
        if(AS.p!==3){c.userData.camoA=new THREE.Color(AS.a).convertSRGBToLinear();c.userData.camoB=new THREE.Color(AS.m).convertSRGBToLinear();c.userData.camoC=new THREE.Color(AS.c).convertSRGBToLinear();c.userData.camoP=AS.p;c.userData.camoS=AS.s||1;}}}
      if(tc&&c.color&&!['tree1','tree2','tree3','tree4'].includes(key))c.color.lerp(tc,LK&&(isSol(key)||VK.includes(key)||AS)?Math.min(k,AS?.03:.06):k);if(isB&&c.color){c.color.multiply(new THREE.Color(1.08,1.0,.84));const rg=team&&team.fac&&FACTIONS[team.fac]?FACTIONS[team.fac].music:null,BW={west:'#9aa3a8',mideast:'#d2b48a',slavic:'#8f9686',southasia:'#c9a27a',eastasia:'#a8a196',latin:'#d9c9a8'}[rg];if(BW){const lum=c.color.r*.3+c.color.g*.59+c.color.b*.11;if(lum>.05&&lum<.85)c.color.lerp(new THREE.Color(BW).convertSRGBToLinear().multiplyScalar(.6+lum*.9),.32);}}{if(c.isMeshStandardMaterial&&['tank','tankE','tankW','truck','technical','toontank','heli','jet','ship','boat','drone','sam'].includes(key)){c.metalness=Math.min(Math.max(c.metalness||0,.12),.3);c.roughness=Math.min(Math.max(c.roughness??.7,.5),.7);c.userData.sheen=1;}}
      if(isB&&team&&team.fac&&CAMOX[team.fac]){const X=CAMOX[team.fac];c.userData.trimC=new THREE.Color(X.t).convertSRGBToLinear();c.userData.wall=X.w||0;}map.set(m,c);}return map.get(m);});o.material=Array.isArray(o.material)?nm:nm[0];});
  if(!(P.anims&&P.anims.length))try{mergeTinted(clone);}catch(err){console.warn('mergeTinted',key,err);}
  MODELS.tinted[id]={scene:clone,anims:P.anims};return MODELS.tinted[id];}
// Graphics Phase 5: a vehicle model still drew one mesh per paint colour (hull, tracks, wheels, hatches, lights... each
// its own plain untextured material, so mergeProto could not join them) - 5 to 20 draw calls per vehicle in every pass,
// times hundreds of vehicles. Once a model is painted for a team, the parts whose materials differ ONLY in colour are
// merged into one mesh: the colour moves into the vertices (material colour x vertex colour is the same paint, and the
// weathering/camo shader works on the colour after that multiply), so it looks identical. Moving parts (turret, gun,
// rotors) and textured, see-through or hidden parts stay as they were.
function matSig(m){if(!m||!m.isMeshStandardMaterial||m.isMeshPhysicalMaterial||!m.visible||m.transparent||m.wireframe)return null;
  for(const t of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','lightMap','displacementMap','envMap'])if(m[t])return null;
  const u=m.userData,cc=c=>c&&c.isColor?c.getHexString():'';
  return [m.side,m.alphaTest,+m.roughness.toFixed(4),+m.metalness.toFixed(4),m.emissive.getHexString(),m.emissiveIntensity,m.flatShading?1:0,m.depthWrite?1:0,m.depthTest?1:0,m.fog?1:0,m.polygonOffset?m.polygonOffsetFactor+'/'+m.polygonOffsetUnits:0,m.envMapIntensity,
    m.customProgramCacheKey?m.customProgramCacheKey():'',u.wx||0,u.refl||0,u.sheen||0,cc(u.camoA),cc(u.camoB),cc(u.camoC),u.camoP||0,u.camoS||0,cc(u.trimC),u.wall||0].join('|');}
// Only rotors and propellers are animated by name (main_rotor / tail_rotor); a model's turret and gun nodes never move
// on their own (the whole vehicle turns to its target), so they merge too. A future turret animation must keep them.
const MOVE_KEEP=/rotor|prop/i;
function mergeTinted(root){if(root.getObjectByProperty('type','SkinnedMesh'))return;
  root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),M=new THREE.Matrix4(),groups=new Map();
  const kept=o=>{for(let q=o;q&&q!==root;q=q.parent)if(MOVE_KEEP.test(q.name||''))return true;return false;};
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||Array.isArray(o.material)||!o.visible||o.morphTargetInfluences||!o.geometry||!o.geometry.attributes.position||!o.geometry.attributes.normal||kept(o))return;
    const sg=matSig(o.material);if(sg===null)return;const vc=!!(o.material.vertexColors&&o.geometry.attributes.color);
    const key=sg+'|'+(o.castShadow?1:0)+(o.receiveShadow?1:0)+'|'+o.renderOrder+'|'+o.layers.mask+'|'+(o.frustumCulled?1:0);
    let L=groups.get(key);if(!L){L={mat:o.material,items:[]};groups.set(key,L);}L.items.push([o,vc]);});
  for(const L of groups.values()){if(L.items.length<2)continue;
    const parts=L.items.map(([o,vc])=>{const g=floatGeo(o.geometry,vc?['position','normal','color']:['position','normal']);M.multiplyMatrices(inv,o.matrixWorld);g.applyMatrix4(M);
      const n=g.attributes.position.count,col=new Float32Array(n*3),mc=o.material.color;
      if(vc){const C=g.attributes.color,sz=C.itemSize,a=C.array;for(let i=0;i<n;i++){col[i*3]=a[i*sz]*mc.r;col[i*3+1]=a[i*sz+1]*mc.g;col[i*3+2]=a[i*sz+2]*mc.b;}g.deleteAttribute('color');}
      else for(let i=0;i<n;i++){col[i*3]=mc.r;col[i*3+1]=mc.g;col[i*3+2]=mc.b;}
      g.setAttribute('color',new THREE.BufferAttribute(col,3));
      if(M.determinant()<0){for(const nm of ['position','normal','color']){const a=g.attributes[nm].array;for(let i=0;i<a.length;i+=9)for(let c=0;c<3;c++){const t=a[i+3+c];a[i+3+c]=a[i+6+c];a[i+6+c]=t;}}}
      return g;});
    const out=new THREE.BufferGeometry();for(const nm of ['position','normal','color']){let len=0;for(const g of parts)len+=g.attributes[nm].array.length;const arr=new Float32Array(len);let off=0;for(const g of parts){arr.set(g.attributes[nm].array,off);off+=g.attributes[nm].array.length;}out.setAttribute(nm,new THREE.BufferAttribute(arr,3));}
    out.computeBoundingBox();out.computeBoundingSphere();for(const g of parts)g.dispose();
    const src=L.mat,mat=src.clone();mat.color.setRGB(1,1,1);mat.vertexColors=true;mat.userData=src.userData;mat.onBeforeCompile=src.onBeforeCompile;mat.customProgramCacheKey=src.customProgramCacheKey;mat.needsUpdate=true;
    const f=L.items[0][0],m=new THREE.Mesh(out,mat);m.name='vmerged';m.castShadow=f.castShadow;m.receiveShadow=f.receiveShadow;m.renderOrder=f.renderOrder;m.layers.mask=f.layers.mask;m.frustumCulled=f.frustumCulled;
    for(const [o] of L.items)if(o.parent)o.parent.remove(o);root.add(m);}}
// Some models (the Apache) use the older spec/gloss material type, which works only through its own shader hook; the
// weathering hook replaced it, leaving the shader without its specular-map slot, so the hull failed to draw every frame
// (only the tinted canopy and the shadow showed). Such materials become plain standard ones before weathering.
function plainStd(m){if(!m||!m.isMeshStandardMaterial||!(m.isGLTFSpecularGlossinessMaterial||'glossiness' in m||m.specularMap!==undefined&&m.specularMap!==null))return m;
  const n=new THREE.MeshStandardMaterial({name:m.name,color:m.color?m.color.clone():0xffffff,map:m.map||null,normalMap:m.normalMap||null,aoMap:m.aoMap||null,emissive:m.emissive?m.emissive.clone():0x000000,emissiveMap:m.emissiveMap||null,
    alphaMap:m.alphaMap||null,transparent:m.transparent,opacity:m.opacity,side:m.side,alphaTest:m.alphaTest||0,vertexColors:!!m.vertexColors,roughness:m.glossiness!=null?Math.min(1,Math.max(.35,1-m.glossiness*.7)):.75,metalness:.15});
  if(m.normalScale&&n.normalScale)n.normalScale.copy(m.normalScale);n.userData=Object.assign({},m.userData);return n;}
function instModel(key,team,fit,size,ys,kk){wxEnv();const T=tintedProto(key,team,kk);if(!T)return null;const src=T.scene;const skinned=!!src.getObjectByProperty('type','SkinnedMesh');
  const inner=skinned&&THREE.SkeletonUtils?THREE.SkeletonUtils.clone(src):src.clone(true);const n=normScale(src,fit,size);const wrap=new THREE.Group();const sy=n.s*(ys||1);inner.scale.set(n.s,sy,n.s);inner.position.set(-n.cx*n.s,-n.my*sy,-n.cz*n.s);if(fit==='long'&&n.xl){const r=new THREE.Group();r.rotation.y=(MODELS.flipX&&MODELS.flipX[key])?-Math.PI/2:Math.PI/2;r.add(inner);wrap.add(r);}else wrap.add(inner);// (kept out of JSON: Object3D.clone() deep-copies userData through JSON, which serialised the whole model, its
  // textures and animations every time a model was cloned, about 2 s of the battle start on a phone)
  for(const [k,v] of [['anims',T.anims],['inner',inner]])Object.defineProperty(wrap.userData,k,{value:v,writable:true,configurable:true,enumerable:false});return wrap;}
const TANKBOX={};function tankBox(key,yaw){if(TANKBOX[key]!==undefined)return TANKBOX[key];yaw.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(yaw.matrixWorld).invert(),v=new THREE.Vector3(),M=new THREE.Matrix4();let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],sm=[0,0,0],n=0;
  yaw.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;M.multiplyMatrices(inv,o.matrixWorld);const p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=1){v.fromBufferAttribute(p,i).applyMatrix4(M);const a=[v.x,v.y,v.z];for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],a[k]);mx[k]=Math.max(mx[k],a[k]);sm[k]+=a[k];}n++;}});
  if(!n)return TANKBOX[key]=null;const ax=(mx[0]-mn[0])>=(mx[2]-mn[2])?'x':'z',i=ax==='x'?0:2,j=2-i,c=sm[i]/n;const rear=(c-mn[i])<(mx[i]-c)?mx[i]:mn[i];
  // hull length: measure from rear to just past centroid on the far side
  const L=(mx[i]-mn[i])*.82,W=mx[j]-mn[j],H=mx[1]-mn[1];const fwd=rear<c?1:-1,span=mx[i]-mn[i];let dk=mn[1];yaw.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;M.multiplyMatrices(inv,o.matrixWorld);const p=o.geometry.attributes.position;for(let q=0;q<p.count;q++){v.fromBufferAttribute(p,q).applyMatrix4(M);const a=[v.x,v.y,v.z];if(Math.abs(a[i]-rear)<span*.16)dk=Math.max(dk,a[1]);}});
  return TANKBOX[key]={L,W,H:H*.62,rear,ax,fwd,y0:mn[1],deck:dk-mn[1]};}
// Procedural walk cycle for the soldier rig: thighs swing about the hip axis (left-right line through both hips),
// knees bend on the forward swing, arms counter-swing a little. Axes are worked out per bone in its parent's space.
// Kit on every soldier so squads read like real infantry: a national helmet (rounded western, flared Soviet-style,
// or a militia cap / shemagh), a field pack with bedroll, ammo pouches and a canteen. Pieces ride on the skeleton's
// head and chest bones so they move with the walk; sizes are given in world units and converted to bone space.
const GEARM={};function gearMat(c){return GEARM[c]||(GEARM[c]=(()=>{const m=new THREE.MeshStandardMaterial({color:lin(c),roughness:.8,metalness:.05});if(typeof weather==='function')weather(m,.8,0);return m;})());}
// Each soldier's kit (helmet, pack, bedroll, pouches, canteen) was ~10 separate meshes - every one a draw call in every
// pass, times 3 soldiers per squad. It is merged into one vertex-coloured mesh per bone (head, chest, hips), and the
// merged shapes are shared by every soldier of the same nation and type.
const GEARG={};let GEARVM=null;
function gearVCMat(){return GEARVM||(GEARVM=(()=>{const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.05});if(typeof weather==='function')weather(m,.8,0);return m;})());}
function mergeGear(B,key){for(const bn of ['head','chest','hips']){const bone=B[bn];if(!bone)continue;const gear=bone.children.filter(c=>c.userData.gear);if(!gear.length)continue;
    let geo=GEARG[key+'|'+bn];
    if(!geo){bone.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(bone.matrixWorld).invert(),parts=[];for(const g of gear)g.traverse(q=>{if(q.isMesh&&q.geometry&&q.geometry.attributes.normal){const M=new THREE.Matrix4().multiplyMatrices(inv,q.matrixWorld);const fg=floatGeo(q.geometry,['position','normal']);fg.applyMatrix4(M);parts.push([fg,q.material.color||new THREE.Color(1,1,1)]);}});
      if(!parts.length)continue;let n=0;for(const [g] of parts)n+=g.attributes.position.count;const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;
      for(const [g,c] of parts){const cnt=g.attributes.position.count;P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);for(let i=0;i<cnt;i++){C[(o+i)*3]=c.r;C[(o+i)*3+1]=c.g;C[(o+i)*3+2]=c.b;}o+=cnt;g.dispose();}
      geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));geo.setAttribute('color',new THREE.BufferAttribute(C,3));geo.computeBoundingSphere();GEARG[key+'|'+bn]=geo;}
    for(const g of gear)bone.remove(g);const mesh=new THREE.Mesh(geo,gearVCMat());mesh.castShadow=true;mesh.userData.gear=2;bone.add(mesh);}}
function soldierGear(m,fac,kind){const inner=m.userData.inner;if(!inner)return;inner.updateMatrixWorld(true);const B={};inner.traverse(o=>{if(o.isBone)B[o.name]=o;});if(!B.head||!B.chest)return;
  const LK=(typeof FLOOK!=='undefined'&&FLOOK[fac])||{uni:'#6b6a4c'},uni=new THREE.Color(LK.uni),hc='#'+uni.clone().multiplyScalar(.72).getHexString(),pk='#'+uni.clone().lerp(new THREE.Color('#5a5040'),.5).multiplyScalar(.85).getHexString();
  const style=({RU:'sov',CN:'sov',KP:'sov',CU:'sov',RS:'cap',DW:'shemagh'})[fac]||'west';
  const attach=(bone,obj,wx,wy,wz)=>{const bp=new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld),ws=new THREE.Vector3();bone.getWorldScale(ws);const bq=new THREE.Quaternion();bone.getWorldQuaternion(bq);
    const p=new THREE.Vector3(bp.x+wx,bp.y+wy,bp.z+wz);bone.worldToLocal(p);obj.position.copy(p);obj.quaternion.copy(bq.invert());obj.scale.set(1/ws.x,1/ws.y,1/ws.z);obj.traverse(q=>{if(q.isMesh){q.castShadow=true;}});obj.userData.gear=1;bone.add(obj);};
  const hp=new THREE.Vector3().setFromMatrixPosition(B.head.matrixWorld),cp=new THREE.Vector3().setFromMatrixPosition(B.chest.matrixWorld),k=Math.max(.5,(hp.y-(new THREE.Vector3().setFromMatrixPosition((B.hips||B.chest).matrixWorld)).y)/5.2);
  // helmet / headgear
  {const g=new THREE.Group();if(style==='west'){const d=new THREE.Mesh(new THREE.SphereGeometry(1.02*k,14,8,0,Math.PI*2,0,Math.PI*.55),gearMat(hc));d.scale.set(1,.92,1.08);g.add(d);const r=new THREE.Mesh(new THREE.CylinderGeometry(1.06*k,1.1*k,.16*k,16),gearMat(hc));r.position.y=.06*k;g.add(r);}
   else if(style==='sov'){const d=new THREE.Mesh(new THREE.SphereGeometry(.98*k,14,8,0,Math.PI*2,0,Math.PI*.5),gearMat(hc));g.add(d);const sk=new THREE.Mesh(new THREE.CylinderGeometry(.98*k,1.16*k,.42*k,16,1,true),gearMat(hc));sk.position.y=-.16*k;g.add(sk);}
   else if(style==='cap'){const d=new THREE.Mesh(new THREE.SphereGeometry(.92*k,12,8,0,Math.PI*2,0,Math.PI*.5),gearMat('#1d1d1b'));d.scale.y=.85;g.add(d);}
   else{const d=new THREE.Mesh(new THREE.SphereGeometry(.98*k,12,8,0,Math.PI*2,0,Math.PI*.58),gearMat('#d9d0b8'));g.add(d);const t=new THREE.Mesh(new THREE.BoxGeometry(.5*k,1.4*k,1.2*k),gearMat('#c9bfa6'));t.position.set(-.7*k,-.7*k,0);g.add(t);const band=new THREE.Mesh(new THREE.TorusGeometry(.95*k,.1*k,6,16),gearMat('#8a2a24'));band.rotation.x=Math.PI/2;band.position.y=.18*k;g.add(band);}
   attach(B.head,g,0,.62*k,0);}
  // field pack + bedroll on the back, pouches on the front, canteen at the hip
  if(kind!=='hero'){const g=new THREE.Group();const pack=new THREE.Mesh(new THREE.BoxGeometry(1.7*k,1.9*k,.9*k),gearMat(pk));g.add(pack);const roll=new THREE.Mesh(new THREE.CylinderGeometry(.34*k,.34*k,1.9*k,8),gearMat('#5d5a4a'));roll.rotation.z=Math.PI/2;roll.position.set(0,1.15*k,0);g.add(roll);
    attach(B.chest,g,0,-.3*k,-1.05*k);
    const f=new THREE.Group();for(const sx of [-.5,0,.5]){const p=new THREE.Mesh(new THREE.BoxGeometry(.42*k,.5*k,.3*k),gearMat(pk));p.position.set(sx*k,0,0);f.add(p);}attach(B.chest,f,0,-1.2*k,.62*k);
    if(B.hips){const cn=new THREE.Mesh(new THREE.CylinderGeometry(.24*k,.24*k,.6*k,8),gearMat('#4a4d3c'));attach(B.hips,cn,.75*k,-.2*k,-.35*k);}}
  mergeGear(B,fac+'|'+kind+'|'+k.toFixed(3));}

// Kit for the realistic soldiers: they already wear their own helmet, vest and boots, so only the rifle is added (merged into
// the chest bone like the old kit) and the arms are posed holding it. Two-bone arm solve toward grip points, then aim each bone.
// Offsets are in the soldier's own frame (faces +z, its left is +x), turned into the world by its rotation: it sits in its
// unit's yaw group (turned 90 degrees), so raw world axes posed the rifle and arms sideways, hands out to one side.
function solAim(bone,child,tgt){const bp=new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld),cp=new THREE.Vector3().setFromMatrixPosition(child.matrixWorld),cur=cp.sub(bp).normalize(),want=tgt.clone().sub(bp).normalize();
  const dq=new THREE.Quaternion().setFromUnitVectors(cur,want),bq=new THREE.Quaternion();bone.getWorldQuaternion(bq);const pq=new THREE.Quaternion();bone.parent.getWorldQuaternion(pq);
  bone.quaternion.copy(pq.invert().multiply(dq).multiply(bq));bone.updateMatrixWorld(true);}
function solArm(B,sd,T,pole){const sh=B['arm'+sd],fo=B['forearm'+sd],ha=B['hand'+sd];if(!sh||!fo||!ha)return;
  const S=new THREE.Vector3().setFromMatrixPosition(sh.matrixWorld),E0=new THREE.Vector3().setFromMatrixPosition(fo.matrixWorld),H0=new THREE.Vector3().setFromMatrixPosition(ha.matrixWorld);
  const a=S.distanceTo(E0),b=E0.distanceTo(H0),d=Math.min(a+b-.01,Math.max(Math.abs(a-b)+.01,S.distanceTo(T))),dir=T.clone().sub(S).normalize();
  const x=(a*a-b*b+d*d)/(2*d),h=Math.sqrt(Math.max(0,a*a-x*x)),pp=pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const E=S.clone().add(dir.clone().multiplyScalar(x)).add(pp.multiplyScalar(h));solAim(sh,fo,E);solAim(fo,ha,T);}
// Hand twist: turn the hand about its own length (wrist to knuckles = bone +y) until the palm (bone +z, the thumb's side
// on this rig) faces `want`.
function solTwist(ha,want){const hq=new THREE.Quaternion();ha.getWorldQuaternion(hq);const ax=new THREE.Vector3(0,1,0).applyQuaternion(hq),cur=new THREE.Vector3(0,0,1).applyQuaternion(hq);
  const w=want.clone().sub(ax.clone().multiplyScalar(want.dot(ax)));cur.sub(ax.clone().multiplyScalar(cur.dot(ax)));if(w.lengthSq()<1e-8||cur.lengthSq()<1e-8)return;
  const dq=new THREE.Quaternion().setFromUnitVectors(cur.normalize(),w.normalize()),pq=new THREE.Quaternion();ha.parent.getWorldQuaternion(pq);ha.quaternion.copy(pq.invert().multiply(dq).multiply(hq));ha.updateMatrixWorld(true);}
// Curl the fingers (and a little of the thumb) toward the palm so the hand closes round the grip / handguard.
function solCurl(B,side,a){if(!B['hand'+side])return;const pre=(side==='R'?'Right':'Left')+'Hand',q=new THREE.Quaternion(),X=new THREE.Vector3(1,0,0);let sg=0;
  for(const f of ['Index','Middle','Ring','Pinky'])for(let i=1;i<=3;i++){const b=B[pre+f+i];if(!b)continue;
    if(!sg){// which way is "toward the palm" for this rig: try +a and keep it if the fingertip moves to the palm side (+z)
      const tip=B[pre+f+4]||b,ha=B['hand'+side],t0=ha.worldToLocal(tip.getWorldPosition(new THREE.Vector3())).z;b.quaternion.multiply(q.setFromAxisAngle(X,a));b.updateMatrixWorld(true);
      sg=ha.worldToLocal(tip.getWorldPosition(new THREE.Vector3())).z>=t0?1:-1;if(sg<0)b.quaternion.multiply(q.setFromAxisAngle(X,-2*a));continue;}
    b.quaternion.multiply(q.setFromAxisAngle(X,sg*a*(i===1?.8:1)));}
  for(let i=2;i<=3;i++){const b=B[pre+'Thumb'+i];if(b)b.quaternion.multiply(q.setFromAxisAngle(X,sg*.35));}
  B['hand'+side].updateMatrixWorld(true);}
// Rifle, in its own frame: +z toward the muzzle, +y up, sizes in units of k (k ~ 1/5 of the soldier's head-to-hips height).
// Chunky enough to read at battle zoom: receiver, stock, pistol grip, magazine, handguard, barrel, sight. RGRIP / RFORE are
// where the right palm (on the pistol grip) and the left palm (under the handguard) go.
const RGRIP=[-.2,-.44,1.0],RFORE=[0,-.4,2.75];
function solRifle(k){const g=new THREE.Group(),bl=gearMat('#1c1d1c'),wd=gearMat('#3a3228'),mg=gearMat('#2a2b26');
  const bx=(w,h,l,x,y,z,m,rx)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(w*k,h*k,l*k),m);q.position.set(x*k,y*k,z*k);if(rx)q.rotation.x=rx;g.add(q);return q;};
  bx(.42,.56,2.4,0,0,.9,bl);bx(.32,.66,1.5,0,-.12,-1.05,wd,-.12);bx(.26,.74,.36,0,-.58,.95,bl,.22);bx(.3,.9,.42,0,-.6,1.75,mg,-.2);bx(.4,.42,1.5,0,-.02,2.7,wd);
  const br=new THREE.Mesh(new THREE.CylinderGeometry(.1*k,.1*k,1.8*k,6),bl);br.rotation.x=Math.PI/2;br.position.set(0,.04*k,4.3*k);g.add(br);bx(.14,.24,.18,0,.38,3.3,bl);bx(.16,.2,.5,0,.36,.6,bl);return g;}
// Per-soldier look variety (seeded by unit id + slot, so a soldier always looks the same): 4 variants per nation, each a few
// cheap low-poly pieces (head cover, goggles, headset, scarf / balaclava, vest, pouches, backpack) that are merged into the
// head / chest gear meshes below - no extra draw calls. Shia nations get their own looks first.
const KITV={IR:[['scrimOl','pouch'],['beret','scarf','pouch'],['goggles','headset','pack'],['balaclava','vest','pouch']],
 RS:[['scarf','pouch'],['bandana','vest'],['headset','pack','pouch'],['balaclava','pouch']],
 DW:[['pouch'],['pack'],['vest','scarfRed'],['pouch','pack']],
 W:[['scrimSand','goggles'],['headset','pouch'],['pack','pouch'],['vest','scarfRed']],
 E:[['pouch'],['pack'],['scrimOl','pouch'],['vest','headset']]};
const KITF={IR:'IR',RS:'RS',DW:'DW',RU:'E',CN:'E',KP:'E',CU:'E',IN:'E',PK:'E'};
function kitPieces(fac,vr){return (KITV[KITF[fac]||'W']||KITV.W)[vr&3];}
function addKitVariant(B,attach,hp,cp,V,k,fac,vr,mq){const L=kitPieces(fac,vr),has=n=>L.indexOf(n)>=0;
  const mk=(geo,col,x,y,z,sx,sy,sz,g)=>{const o=new THREE.Mesh(geo,gearMat(col));o.position.set(x*k,y*k,z*k);if(sx!==undefined)o.scale.set(sx,sy,sz);g.add(o);return o;};
  const H=new THREE.Group(),Cg=new THREE.Group(),shia=fac==='IR'||fac==='RS'||fac==='DW';
  const dark=shia?'#2c2e22':'#3b3d33',olive=shia?'#4f5336':'#566040',sand='#a4916a',cloth=fac==='RS'?'#3a3f2c':'#50533a';
  // head (origin = middle of the skull)
  if(has('scrimOl')||has('scrimSand')){mk(new THREE.SphereGeometry(1.1*k,9,5,0,Math.PI*2,0,Math.PI*.52),has('scrimSand')?sand:olive,0,.12,0,1,.9,1.08,H);}
  if(has('beret')){mk(new THREE.SphereGeometry(1.08*k,9,5,0,Math.PI*2,0,Math.PI*.5),fac==='IR'?'#5a6040':'#2d3224',.15,.22,0,1.05,.36,1.12,H);}
  if(has('bandana')){mk(new THREE.SphereGeometry(1.0*k,9,5,0,Math.PI*2,0,Math.PI*.5),'#1d1e1a',0,.1,0,1,.8,1.05,H);mk(new THREE.BoxGeometry(.5*k,1.1*k,.5*k),'#1d1e1a',-.2,-.45,-.95,1,1,1,H);}
  if(has('goggles')){const st=new THREE.TorusGeometry(1.02*k,.07*k,5,12);const t=mk(st,'#1a1a18',0,.05,0,1,1,1.0,H);t.rotation.x=Math.PI/2;mk(new THREE.BoxGeometry(.8*k,.5*k,.2*k),'#26303a',-.42,.2,.98,1,1,1,H);mk(new THREE.BoxGeometry(.8*k,.5*k,.2*k),'#26303a',.42,.2,.98,1,1,1,H);}
  if(has('headset')){for(const sx of[-1,1]){mk(new THREE.CylinderGeometry(.42*k,.42*k,.28*k,8),'#1d1e1c',sx*1.05,-.15,.05,1,1,1,H).rotation.z=Math.PI/2;}}
  if(has('balaclava')){mk(new THREE.BoxGeometry(1.7*k,.85*k,.25*k),dark,0,-.55,.92,1,1,1,H);mk(new THREE.CylinderGeometry(.98*k,1.0*k,.7*k,9),dark,0,-.6,0,1,1,1,H);}
  if(has('scarf')||has('scarfRed')){const t=mk(new THREE.TorusGeometry(.95*k,.26*k,5,10),has('scarfRed')?'#8a3a2c':(fac==='IR'?'#c8c2b0':'#bdb59a'),0,-1.25,.05,1,1,1,H);t.rotation.x=Math.PI/2;}
  if(H.children.length)attach(B.head,H,hp.clone().add(V(0,1.35*k,0)));
  // chest
  if(has('vest')){mk(new THREE.BoxGeometry(2.5*k,1.9*k,1.9*k),shia?'#38402c':'#454a38',0,.2,0,1,1,1,Cg);}
  if(has('pouch')){for(const x of[-.75,0,.75])mk(new THREE.BoxGeometry(.6*k,.8*k,.45*k),dark,x,-.2,1.05,1,1,1,Cg);}
  if(has('pack')){mk(new THREE.BoxGeometry(2.0*k,2.4*k,1.0*k),fac==='IR'?'#3f4430':olive,0,.1,-1.15,1,1,1,Cg);mk(new THREE.BoxGeometry(1.7*k,.7*k,.9*k),dark,0,-1.5,-1.1,1,1,1,Cg);}
  if(Cg.children.length)attach(B.chest,Cg,cp.clone().add(V(0,.2*k,0)));}
function newSoldierKit(m,fac,kind,key,vr){vr=vr|0;const inner=m.userData.inner;if(!inner)return;m.updateWorldMatrix(true,true);const mq=new THREE.Quaternion();m.getWorldQuaternion(mq);const V=(x,y,z)=>new THREE.Vector3(x,y,z).applyQuaternion(mq);const B={};inner.traverse(o=>{if(o.isBone)B[o.name]=o;});if(!B.head||!B.chest||!B.hips)return;
  const hp=new THREE.Vector3().setFromMatrixPosition(B.head.matrixWorld),hv=new THREE.Vector3().setFromMatrixPosition(B.hips.matrixWorld),k=Math.max(.5,(hp.y-hv.y)/5.2);
  const cp=new THREE.Vector3().setFromMatrixPosition(B.chest.matrixWorld);
  if(kind==='hero'){const base=cp.clone().add(V(-.15*k,-.95*k,0));solArm(B,'R',base.clone().add(V(-.35*k,-.05*k,1.9*k)),V(-.5,-1,-.2));solArm(B,'L',base.clone().add(V(.35*k,.12*k,4.3*k)),V(.6,-1,-.1));return;}
  // Rifle at low-ready across the body, muzzle a little down. Its frame: the soldier's (faces +z, its left is +x) pitched.
  const rq=mq.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.16));
  const attach=(bone,obj,wp,q)=>{const bq=new THREE.Quaternion(),ws=new THREE.Vector3();bone.getWorldQuaternion(bq);bone.getWorldScale(ws);const p=wp.clone();bone.worldToLocal(p);obj.position.copy(p);obj.quaternion.copy(bq.invert().multiply(q||mq));obj.scale.set(1/ws.x,1/ws.y,1/ws.z);obj.userData.gear=1;bone.add(obj);};
  // the rifle goes on first; the palm spots are read back from it, so the hands follow wherever the rifle really is
  const rf=solRifle(k);attach(B.chest,rf,cp.clone().add(V(-.18*k,-1.0*k,.15*k)),rq);rf.updateMatrixWorld(true);const RP=a=>rf.localToWorld(new THREE.Vector3(a[0]*k,a[1]*k,a[2]*k)),TR=RP(RGRIP),TL=RP(RFORE);
  // The hands are posed by their palms, not their wrists (the old pose put the wrists on the grip points, so the hands
  // floated in front of a rifle hidden under the forearms): a two-bone arm solve aims the wrist, the hand is turned so the
  // palm faces the rifle (right palm against the grip from the right, left palm up under the handguard), the fingers
  // close, and the wrist target is corrected by how far the palm still is from its spot (converges in a few passes).
  const palm=sd=>{const ha=B['hand'+sd],mid=B[(sd==='R'?'Right':'Left')+'HandMiddle1'];const p=mid?mid.position.clone().multiplyScalar(.5):new THREE.Vector3(0,ha.position.length()*.17,0);p.z+=p.length()*.25;return p;};
  const hand=(sd,T,pole,face)=>{const ha=B['hand'+sd];if(!ha||!B['arm'+sd]||!B['forearm'+sd])return;const P=palm(sd),W=T.clone(),c=new THREE.Vector3();
    for(let i=0;i<6;i++){solArm(B,sd,W,pole);solTwist(ha,face);c.copy(P).applyMatrix4(ha.matrixWorld);W.add(T.clone().sub(c));}return P;};
  const PR=hand('R',TR,V(-.5,-1,-.35),V(1,.15,0)),PL=hand('L',TL,V(.7,-1,-.1),V(-.15,1,0));
  solCurl(B,'R',1.15);solCurl(B,'L',.95);
  // where the palms belong on the rifle (chest frame) and where the palm sits in each hand (hand frame): orch/walktest.mjs
  // checks every soldier's palms stay on their spots through idle, walk and jog
  {const lc=p=>B.chest.worldToLocal(p.clone());m.userData.rg={b:B.chest,k,g:lc(TR),f:lc(TL),pR:PR,pL:PL};}
  if(fac==='DW'){const g=new THREE.Group(),d=new THREE.Mesh(new THREE.SphereGeometry(.98*k*.82,12,8,0,Math.PI*2,0,Math.PI*.58),gearMat('#d9d0b8'));g.add(d);const t=new THREE.Mesh(new THREE.BoxGeometry(.5*k,1.1*k,1.0*k),gearMat('#c9bfa6'));t.position.set(-.55*k,-.55*k,0);g.add(t);const band=new THREE.Mesh(new THREE.TorusGeometry(.8*k,.09*k,6,14),gearMat('#8a2a24'));band.rotation.x=Math.PI/2;band.position.y=.14*k;g.add(band);attach(B.head,g,hp.clone().add(V(0,1.35*k,0)));g.scale.multiplyScalar(1.15);}/* head bone is at the neck; the skull spans 0..2.19k above it, so the cap sits at 1.35k (was .55k = at the neck) */
  if(kind!=='hero')addKitVariant(B,attach,hp,cp,V,k,fac,vr,mq);
  mergeGear(B,key+'|'+fac+'|'+kind+'|'+k.toFixed(3)+'|v'+vr);}
// Massive columns: every soldier was 7 skinned meshes (rifle, magazine and uniform parts, one per material colour) plus
// 3 kit meshes on its bones - 10 draw calls per soldier in every pass (picture + shadow), ~30 per squad. They are merged
// into ONE skinned, vertex-coloured mesh per soldier (kit rides its bone as a rigidly skinned part), so a squad costs 3.
// The merged shape is built once per nation / team colour / unit type and shared by every soldier that looks the same.
const SOLM={};
// Distant soldier: the merged soldier mesh is thinned by vertex clustering (nearby vertices snap together, tiny triangles vanish)
// into a cheap skinned mesh on the same skeleton. Shown instead of the full one when the camera is far (see 06-view), so big
// crowds cost far fewer vertices to skin and shade. Built once per shape, shared like the full mesh.
function lowSoldierGeo(g){const pa=g.attributes.position,n=pa.count,ix=g.index.array;g.computeBoundingBox();const bb=g.boundingBox,h=Math.max(.001,bb.max.y-bb.min.y),cs=h/17,map=new Map(),rep=new Int32Array(n),first=[],sum=[];
  for(let i=0;i<n;i++){const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i),k=Math.floor((x-bb.min.x)/cs)+','+Math.floor((y-bb.min.y)/cs)+','+Math.floor((z-bb.min.z)/cs);let r=map.get(k);if(r===undefined){r=first.length;map.set(k,r);first.push(i);sum.push([0,0,0,0]);}rep[i]=r;const q=sum[r];q[0]+=x;q[1]+=y;q[2]+=z;q[3]++;}
  const m=first.length,P=new Float32Array(m*3),idx=[];for(let r=0;r<m;r++){const q=sum[r];P[r*3]=q[0]/q[3];P[r*3+1]=q[1]/q[3];P[r*3+2]=q[2]/q[3];}
  const seen=new Set();for(let t=0;t<ix.length;t+=3){const a=rep[ix[t]],b=rep[ix[t+1]],c=rep[ix[t+2]];if(a===b||b===c||a===c)continue;const key=[a,b,c].sort((u,v)=>u-v).join('_');if(seen.has(key))continue;seen.add(key);idx.push(a,b,c);}
  const lo=new THREE.BufferGeometry();lo.setAttribute('position',new THREE.BufferAttribute(P,3));
  for(const nm of ['color','uv','skinIndex','skinWeight']){const A=g.attributes[nm];if(!A)continue;const sz=A.itemSize,arr=new (nm==='skinIndex'?Uint16Array:Float32Array)(m*sz);for(let r=0;r<m;r++)for(let k=0;k<sz;k++)arr[r*sz+k]=A.getComponent(first[r],k);lo.setAttribute(nm,new THREE.BufferAttribute(arr,sz));}
  // normals: rebuilt from the thinned faces, so the rounded far soldier still shades smoothly
  lo.setIndex(new THREE.BufferAttribute(m>65535?new Uint32Array(idx):new Uint16Array(idx),1));lo.computeVertexNormals();return lo;}
function mergeSoldier(m,key){const inner=m.userData.inner;if(!inner)return false;const sk=[];inner.traverse(o=>{if(o.isSkinnedMesh)sk.push(o);});if(!sk.length)return false;
  const skel=sk[0].skeleton;if(!skel||sk.some(o=>!o.skeleton||o.skeleton.bones.length!==skel.bones.length||o.skeleton.bones.some((b,i)=>b!==skel.bones[i])||Array.isArray(o.material)||!o.geometry.attributes.skinIndex))return false;
  const gear=[];skel.bones.forEach((b,bi)=>{for(const c of b.children)if(c.isMesh&&c.userData.gear&&!c.isSkinnedMesh)gear.push([c,bi]);});
  // The realistic soldiers are ONE textured skinned mesh, so this used to bail out (nothing to merge) and the rifle stayed a
  // separate mesh - one more draw call per soldier, hidden when zoomed out past 480 (the default view is 560), so in a real
  // battle nobody held a rifle. The rifle now joins that mesh too: the texture stays, rifle vertices get a uv far outside
  // the texture (-4) and the shader takes their colour from the vertex colour alone.
  if(sk.length<2&&!gear.length)return false;const tex=sk[0].material.map||null;if(sk.some(o=>(o.material.map||null)!==tex||(tex&&!o.geometry.attributes.uv)))return false;
  let E=SOLM[key];
  if(!E){const parts=[];let nv=0,ni=0;const nm=new THREE.Matrix3(),M=new THREE.Matrix4(),v=new THREE.Vector3(),col=new THREE.Color();
    // each part may carry its own inverse-bind matrices (same joints, offset by a constant): fold that offset into its vertices
    for(const o of sk){const X=new THREE.Matrix4().copy(skel.boneInverses[0]).invert().multiply(o.skeleton.boneInverses[0]);for(let j=1;j<skel.bones.length;j++){const Y=new THREE.Matrix4().copy(skel.boneInverses[j]).invert().multiply(o.skeleton.boneInverses[j]);if(Y.elements.some((x,k)=>Math.abs(x-X.elements[k])>1e-3))return false;}
      parts.push({g:o.geometry,M:X.multiply(o.bindMatrix),c:o.material.color||new THREE.Color(1,1,1),sk:true});}
    for(const [c,bi] of gear){c.updateMatrix();parts.push({g:c.geometry,M:new THREE.Matrix4().copy(skel.boneInverses[bi]).invert().multiply(c.matrix),c:c.material.color||new THREE.Color(1,1,1),bi});}
    for(const p of parts){nv+=p.g.attributes.position.count;ni+=p.g.index?p.g.index.count:p.g.attributes.position.count;}
    const P=new Float32Array(nv*3),N=new Float32Array(nv*3),C=new Float32Array(nv*3),UV=tex?new Float32Array(nv*2):null,SI=new Uint16Array(nv*4),SW=new Float32Array(nv*4),I=nv>65535?new Uint32Array(ni):new Uint16Array(ni);let ov=0,oi=0;
    for(const p of parts){const g=p.g,pa=g.attributes.position,na=g.attributes.normal,ca=g.attributes.color,n=pa.count;nm.getNormalMatrix(p.M);
      for(let i=0;i<n;i++){v.fromBufferAttribute(pa,i).applyMatrix4(p.M);P[(ov+i)*3]=v.x;P[(ov+i)*3+1]=v.y;P[(ov+i)*3+2]=v.z;
        if(na){v.fromBufferAttribute(na,i).applyMatrix3(nm).normalize();}else v.set(0,1,0);N[(ov+i)*3]=v.x;N[(ov+i)*3+1]=v.y;N[(ov+i)*3+2]=v.z;
        col.copy(p.c);if(ca)col.multiply(new THREE.Color(ca.getX(i),ca.getY(i),ca.getZ(i)));C[(ov+i)*3]=col.r;C[(ov+i)*3+1]=col.g;C[(ov+i)*3+2]=col.b;
        if(UV){const ua=p.sk&&g.attributes.uv;UV[(ov+i)*2]=ua?ua.getX(i):-4;UV[(ov+i)*2+1]=ua?ua.getY(i):-4;}
        if(p.sk){const a=g.attributes.skinIndex,w=g.attributes.skinWeight;for(let k=0;k<4;k++){SI[(ov+i)*4+k]=a.getComponent(i,k);SW[(ov+i)*4+k]=w.getComponent(i,k);}}else{SI[(ov+i)*4]=p.bi;SW[(ov+i)*4]=1;}}
      if(g.index){const ix=g.index.array;for(let i=0;i<ix.length;i++)I[oi+i]=ix[i]+ov;oi+=ix.length;}else{for(let i=0;i<n;i++)I[oi+i]=ov+i;oi+=n;}ov+=n;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));geo.setAttribute('color',new THREE.BufferAttribute(C,3));if(UV)geo.setAttribute('uv',new THREE.BufferAttribute(UV,2));
    geo.setAttribute('skinIndex',new THREE.BufferAttribute(SI,4));geo.setAttribute('skinWeight',new THREE.BufferAttribute(SW,4));geo.setIndex(new THREE.BufferAttribute(I,1));
    // one material for the whole soldier: the uniform's (most triangles among the coloured parts), white so the baked
    // vertex colours show, keeping its weathering shader hook
    let src=sk[0].material,best=-1;for(const o of sk){const c=o.material.color,t=o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count;if(c&&c.r*.3+c.g*.59+c.b*.11>.02&&t>best){best=t;src=o.material;}}
    const mat=src.clone();mat.onBeforeCompile=src.onBeforeCompile;mat.customProgramCacheKey=src.customProgramCacheKey;mat.vertexColors=true;if(mat.color)mat.color.setRGB(1,1,1);mat.map=tex;
    if(tex){const ob=src.onBeforeCompile,ck=src.customProgramCacheKey;mat.onBeforeCompile=(sh,r)=>{if(ob)ob.call(src,sh,r);sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\nvec4 sampledDiffuseColor=texture2D(map,vMapUv);if(vMapUv.x<-2.)sampledDiffuseColor=vec4(1.);diffuseColor*=sampledDiffuseColor;\n#endif');};
      mat.customProgramCacheKey=()=>(ck?ck.call(src):'')+'|solgear';}
    E=SOLM[key]={geo,mat,gn:parts.reduce((n,p)=>n+(p.sk?0:p.g.attributes.position.count),0)};}
  if(!E.lo)try{E.lo=lowSoldierGeo(E.geo);}catch(er){E.lo=null;}
  if(E.lo){const lm=new THREE.SkinnedMesh(E.lo,E.mat);lm.name='soldierLo';lm.userData.lo=1;lm.userData.gearN=E.gn;lm.castShadow=true;lm.receiveShadow=sk[0].receiveShadow;lm.frustumCulled=sk[0].frustumCulled;lm.visible=false;sk[0].parent.add(lm);lm.bind(skel,new THREE.Matrix4());}
  const mm=new THREE.SkinnedMesh(E.geo,E.mat);mm.name='soldier';mm.userData.gearN=E.gn;mm.castShadow=true;mm.receiveShadow=sk[0].receiveShadow;mm.frustumCulled=sk[0].frustumCulled;
  sk[0].parent.add(mm);mm.bind(skel,new THREE.Matrix4());for(const o of sk)o.parent.remove(o);for(const [c] of gear)c.parent.remove(c);return true;}
function setupWalk(m){const inner=m.userData.inner;if(!inner)return null;const B={};inner.traverse(o=>{if(o.isBone)B[o.name]=o;});
  if(!B.uplegL||!B.uplegR||!B.legL||!B.legR||!B.footL)return null;
  // Everything is measured in the soldier's own frame (m). The soldier is built inside its unit's yaw group (turned 90
  // degrees) before that group's world matrices were ever updated, so the hips used to be read without the turn while
  // the bones' parent rotations included it: the swing axis came out 90 degrees off and the legs swung sideways.
  const hip=()=>{m.updateWorldMatrix(true,true);const pl=m.worldToLocal(new THREE.Vector3().setFromMatrixPosition(B.uplegL.matrixWorld)),pr=m.worldToLocal(new THREE.Vector3().setFromMatrixPosition(B.uplegR.matrixWorld));return[pl,pr];};
  let [pl,pr]=hip();
  // the rifle-ready stance has the hips turned ~20 degrees; square them to the direction of travel (the model faces +z)
  {const a=Math.atan2(pr.z-pl.z,pr.x-pl.x),tg=Math.abs(a)>Math.PI/2?Math.sign(a)*Math.PI:0,th=a-tg;if(Math.abs(th)>.02){inner.rotation.y+=th;[pl,pr]=hip();}}
  const mq=new THREE.Quaternion();m.getWorldQuaternion(mq);const lat=pr.clone().sub(pl).normalize().applyQuaternion(mq),up=new THREE.Vector3(0,1,0).applyQuaternion(mq);const q=new THREE.Quaternion();
  // each joint keeps its rest rotation and two axes in its parent's frame: lat (the soldier's left-right line: pitch, legs
  // swing forward/back about it) and up (yaw)
  const mk=b=>{if(!b)return null;b.parent.getWorldQuaternion(q);q.invert();return{b,q0:b.quaternion.clone(),ax:lat.clone().applyQuaternion(q).normalize(),up:up.clone().applyQuaternion(q).normalize()};};
  const W={uL:mk(B.uplegL),uR:mk(B.uplegR),lL:mk(B.legL),lR:mk(B.legR),hip:mk(B.hips),sp:mk(B.spine),ch:mk(B.chest),fL:mk(B.footL),fR:mk(B.footR)};
  // the rest leg in the soldier's side view (z forward, y up): hip->knee and knee->ankle, so the hip height that keeps a
  // planted foot on the ground can be worked out exactly for any thigh angle and knee bend (walkPose)
  const lp=b=>m.worldToLocal(new THREE.Vector3().setFromMatrixPosition(b.matrixWorld)),h=lp(B.uplegL),kn=lp(B.legL),an=lp(B.footL);
  W.hz=kn.z-h.z;W.hy=kn.y-h.y;W.kz=an.z-kn.z;W.ky=an.y-kn.y;W.D0=-(W.hy+W.ky);
  return W;}
// Gait. The soldier's legs, hips and upper body follow one phase u (0..1 per two steps, left foot lands at 0, right at .5).
// A planted foot sweeps back in a straight line at exactly the ground speed (no sliding); the free foot swings forward
// with the knee bent. Speed sets everything (see gaitStep in 06-view): slow = walk, the usual infantry speed = a jog with a
// short airborne moment, forward lean and a longer stride. The rifle stays in both hands at low-ready; it only bobs
// up/down and fore-aft with the steps (chest pitch) - nothing in the upper body sways sideways, and the body never rolls.
const WQ=new THREE.Quaternion(),WQ2=new THREE.Quaternion();
function wSet(j,a,y){if(!j)return;WQ.setFromAxisAngle(j.ax,a);if(y){WQ2.setFromAxisAngle(j.up,y);WQ.multiply(WQ2);}j.b.quaternion.copy(WQ).multiply(j.q0);}
// Side view of one leg (z forward, y up, from the rest leg measured in setupWalk): ankle forward offset and depth below
// the hip for a thigh angle th (forward +) and knee bend kn.
function gFz(W,th,kn){return W.hz*Math.cos(th)-W.hy*Math.sin(th)+W.kz*Math.cos(th-kn)-W.ky*Math.sin(th-kn);}
function gDepth(W,th,kn){return-(W.hz*Math.sin(th)+W.hy*Math.cos(th)+W.kz*Math.sin(th-kn)+W.ky*Math.cos(th-kn));}
// how far the body travels per planted step (the foot's sweep from landing to push-off): sets the cadence (06-view)
function gSweep(W,a,run){return gFz(W,a,.1+.18*run)-gFz(W,-a,0);}
// One leg at phase u (0..1; the foot lands at 0) with stance fraction s. Planted (u<s): the ankle moves back in a straight
// line at constant speed (thigh solved for it, two Newton steps) with the knee landing slightly bent and giving a little
// mid-stance. Swinging: heel kicks up, knee stays bent while the thigh comes through, then reaches out to land.
const GL={th:0,kn:0},GR={th:0,kn:0};
function gLeg(W,u,s,a,run,o){const KC=.1+.18*run;
  if(u<s){const t=u/s,kn=KC*(1-t)+run*.2*Math.sin(Math.PI*t),z0=gFz(W,a,KC),zt=z0+(gFz(W,-a,0)-z0)*t;let th=a*(1-2*t);
    for(let i=0;i<2;i++)th-=(gFz(W,th,kn)-zt)/Math.max(1,gDepth(W,th,kn));o.th=th;o.kn=kn;return;}
  const w=(u-s)/(1-s),KM=.85+.8*run;o.th=-a*Math.cos(Math.PI*Math.min(1,w/.8));
  o.kn=w<.4?KM*Math.sin(Math.PI/2*w/.4):w<.78?KM:KC+(KM-KC)*(.5+.5*Math.cos(Math.PI*(w-.78)/.22));}
// u: phase, amt: 0..1 blend from standing, a: thigh swing (radians), s: stance fraction, run: 0 walk .. 1 jog, br: breath.
// Poses the bones and returns the hip height (0 = standing) that keeps the planted foot on the ground: lower with the leg
// swung out or the knee bent, a little higher while both feet are off the ground (jogging). Two bobs per stride.
function walkPose(m,u,amt,a,s,run,br){const W=m.userData.legs;if(!W||!W.uL)return 0;a*=amt;run*=amt;const uR=(u+.5)%1;
  gLeg(W,u,s,a,run,GL);gLeg(W,uR,s,a,run,GR);
  wSet(W.uL,GL.th,0);wSet(W.uR,GR.th,0);wSet(W.lL,-GL.kn,0);wSet(W.lR,-GR.kn,0);
  // ankles: a planted foot lies flat on the ground; a swinging foot only half follows the shin (toes don't point at the sky)
  wSet(W.fL,(GL.kn-GL.th)*(u<s?1:.5),0);wSet(W.fR,(GR.kn-GR.th)*(uR<s?1:.5),0);
  // pelvis turns a little with the forward leg; the spine turns it back so the chest (and rifle) stays square; the body
  // leans into the run (negative = forward about the left-right axis)
  const pv=a>.01?(GL.th-GR.th)/a*.035:0;wSet(W.hip,0,pv);wSet(W.sp,-(.05*amt+.13*run),-pv);
  // rifle carry: the chest dips as each foot lands (twice per stride), plus a slow breath when standing
  wSet(W.ch,-.045*run*Math.cos(4*Math.PI*(u-s*.5))+br,0);
  if(u<s)return gDepth(W,GL.th,GL.kn)-W.D0;if(uR<s)return gDepth(W,GR.th,GR.kn)-W.D0;
  const w=((u-s)%.5)/Math.max(.01,.5-s),y1=gDepth(W,-a,0)-W.D0,y0=gDepth(W,a,.1+.18*run)-W.D0;return y1+(y0-y1)*w+run*.25*4*w*(1-w);}
// Posture (realism): soldiers crouch in cover, go prone when pinned down, pause to reload and now and then lob a grenade.
// Render only (the sim is untouched): ps 0 stand .. .5 crouch .. 1 prone, blended per soldier so a squad drops in a ripple.
function postApply(m,ud,e,k,dt,tg,moving,fire){const W=ud.legs;if(!W||!W.uL)return;const h=((e.id*7+k*13)%10)/10;let T=tg;if(T>=1&&h<.25)T=.5;else if(T>0&&T<1&&h>.85)T=0;
  const ps=ud.ps=(ud.ps||0)+Math.max(-1,Math.min(1,(T-(ud.ps||0))*8))*dt*(1.1+h*.9);
  if(!moving&&fire&&!(ud.at>0)&&ps<.75){if(Math.random()<dt*.16){ud.at=.9;ud.ak=1;}else if(ps<.2&&Math.random()<dt*.05){ud.at=1.15;ud.ak=2;}}
  let rl=0,gr=0;if(ud.at>0){if(moving||ps>.75)ud.at=0;else{ud.at-=dt;const q=ud.ak===1?1-ud.at/.9:1-ud.at/1.15;if(ud.ak===1)rl=Math.sin(Math.PI*Math.max(0,Math.min(1,q)));else gr=q;
    if(ud.ak===2&&ud.at<=0&&!ud.gth){ud.gth=1;}}}
  if(ud.ak===2&&gr>.42&&gr<.6&&!ud.gth2){ud.gth2=1;try{const a=(e.va||0)+(Math.random()-.5)*.5,sp=55+Math.random()*35,gx=e.x+Math.cos(a)*sp*.8,gy=e.y+Math.sin(a)*sp*.8;part({x:e.x,y:e.y,h:groundH(e.x,e.y)+8,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,vh:55,grav:1,c:[.16,.18,.1],s:1.3,f:1,d:.8});setTimeout(()=>{try{if(!G||G.over)return;part({x:gx,y:gy,h:groundH(gx,gy)+2,vx:0,vy:0,rise:14,c:[.3,.28,.25],c2:[.5,.48,.44],ck:.3,s:rnd(3,4.5),g:6,d:.9,a:.5});for(let q=0;q<4;q++)part({x:gx,y:gy,h:groundH(gx,gy)+2,vx:rnd(-40,40),vy:rnd(-40,40),vh:rnd(30,70),grav:1,add:true,c:C_SPARK,s:1,f:.6,d:rnd(.2,.4)});}catch(_){}},800);}catch(_){}}if(gr===0)ud.gth2=0;
  if(ps<.01&&!rl&&!gr){ud.pp=0;return 0;}
  const cr=Math.min(1,ps*2),pr=Math.max(0,ps*2-1),c1=cr*(1-pr),thL=.8*c1,knL=1.5*c1,thR=1.0*c1,knR=1.85*c1;
  wSet(W.uL,thL,0);wSet(W.uR,thR,0);wSet(W.lL,-knL,0);wSet(W.lR,-knR,0);wSet(W.fL,knL-thL,0);wSet(W.fR,knR-thR,0);
  // grenade: wind back, then snap forward; reload: chest bows to the rifle
  const gl=gr>0?(gr<.42?-.32*(gr/.42):gr<.6?-.32+.9*((gr-.42)/.18):.58*(1-(gr-.6)/.4)):0;
  wSet(W.sp,-(.2*c1+.1*rl+.0)+(gr>0?-gl*.5:0),0);wSet(W.ch,-(.12*c1+.22*rl)-(gr>0?gl:0),0);
  const y=0.5*(gDepth(W,thL,knL)+gDepth(W,thR,knR))-W.D0;
  m.position.y=y*(1-pr)+pr*1.25;m.rotation.x=pr*1.5;if(ud.bz===undefined)ud.bz=m.position.z;m.position.z=ud.bz-pr*3.6;ud.pp=1;return 1;}
// Drones are built by hand so each nation's looks right: a Shahed-style delta wing with a pusher propeller
// (Iran, Mountain Shias), a Kargu-style quadcopter (Turkey) and a small X-frame FPV racer (Ukraine and others).
// Iran and the two Shia militias fly Shahed-style deltas (stencilled Shahed / Ababil / Qasef), Turkey a Bayraktar-style
// light-grey drone, the US and Israel an MQ-9 / Hermes-style grey drone, Russia a Lancet-style dark loitering munition,
// China and Korea a bigger quadcopter, everyone else taped-up FPV racers.
function droneType(fac){return fac==='IR'||fac==='RS'||fac==='DW'?'delta':fac==='TR'?'tb2':fac==='US'||fac==='IL'?'mq':fac==='RU'?'lancet':fac==='CN'||fac==='KR'?'kargu':'fpv';}
// Drones are built once per nation and then cloned (shared geometry and materials), so a swarm of dozens appears
// without a hitch.
const DPROTO={};
function droneModel(e){const T=G.teams[e.team],ty=droneType(T.fac),key=ty+'|'+T.fac+'|'+T.color;
  if(!DPROTO[key]){const p=buildDrone(e);SCN.remove(p);const meta={props:p.userData.parts.props.map(q=>q.ax)};p.userData={};p.children[0].userData={};let i=0;p.traverse(c=>{if(c.userData&&c.userData.dprop!=null)return;});DPROTO[key]={p,meta};}
  const D=DPROTO[key],o=D.p.clone(),yaw=o.children[0],props=[];kitAdopt(o);o.traverse(c=>{if(c.name==='dprop')props.push({m:c,ax:c.userData.ax||'y'});});
  o.userData={parts:{body:yaw,props},model:true,dtype:ty};SCN.add(o);return o;}
function buildDrone(e){const T=G.teams[e.team],ty=droneType(T.fac),o=new THREE.Group(),yaw=new THREE.Group();o.add(yaw);o.userData.parts={body:yaw,props:[]};o.userData.model=true;o.userData.dtype=ty;
  const B=Bld(),dk='#2a2c28',tc=T.color;
  if(ty==='delta'){
    // Shahed-136 pattern: ~3.5 m long and ~2.5 m span (longer than wide), cylindrical body with a rounded warhead nose,
    // cropped-delta wing running most of the body length, vertical fins at the wingtips reaching above and below the
    // wing, small two-stroke engine in the tail driving a two-blade pusher propeller.
    const sk=T.fac==='RS'?'#6a665a':T.fac==='DW'?'#a6aaa4':'#c4c2b8',sk2=T.fac==='RS'?'#5a564b':T.fac==='DW'?'#92968f':'#aeaca2';
    B.cyl(1.25,1.25,15,12,-1.5,0,0,sk,0,0,-Math.PI/2);B.sph(1.25,6,0,0,sk,1.9,1,1);B.cyl(.55,1.25,2.6,10,-10.3,0,0,sk2,0,0,-Math.PI/2);
    B.box(4.5,.9,1.6,-1,1.15,0,sk2);
    const wing=new THREE.Shape();wing.moveTo(5.5,0);wing.lineTo(-4.6,8.6);wing.lineTo(-8.8,8.6);wing.lineTo(-8.4,0);wing.lineTo(-8.8,-8.6);wing.lineTo(-4.6,-8.6);wing.closePath();
    const wg=new THREE.ExtrudeGeometry(wing,{depth:.45,bevelEnabled:true,bevelThickness:.12,bevelSize:.12,bevelSegments:1});wg.rotateX(Math.PI/2);B._p.push({g:wg,m:new THREE.Matrix4().makeTranslation(0,.25,0),c:lin(sk)});
    for(const sd of [-1,1]){const fin=new THREE.Shape();fin.moveTo(-4.4,-2);fin.lineTo(-3.2,2.8);fin.lineTo(-6.2,3.1);fin.lineTo(-9.2,2.8);fin.lineTo(-9.2,-2.2);fin.lineTo(-6.6,-2.4);fin.closePath();
      const fg=new THREE.ExtrudeGeometry(fin,{depth:.3,bevelEnabled:false});B._p.push({g:fg,m:new THREE.Matrix4().makeTranslation(0,0,8.6*sd-.15),c:lin(sk2)});}
    B.box(1.4,.35,1.1,1.5,1.62,0,tc);B.box(.6,.6,.6,-11.7,0,0,dk);
    const pr=new THREE.Group();const P=Bld();P.box(.35,6.2,.8,0,0,0,dk);P.sph(.45,0,0,0,dk);pr.add(mesh(P.geo()));pr.position.set(-12.1,0,0);pr.name='dprop';pr.userData.ax='x';yaw.add(pr);o.userData.parts.props.push({m:pr,ax:'x'});
    const disc=new THREE.Mesh(new THREE.CircleGeometry(3.1,20),new THREE.MeshBasicMaterial({color:0x222222,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.y=Math.PI/2;disc.position.set(-12.2,0,0);yaw.add(disc);}
  else if(ty==='tb2'||ty==='mq'){
    // Bayraktar TB2 (light grey, inverted-V tail) / MQ-9-Hermes style (darker grey, bulbous nose, Y tail): long straight
    // wing, slim fuselage, pusher propeller, sensor ball under the nose
    const mq=ty==='mq',sk=mq?'#8b9196':'#b9bdbf',sk2=mq?'#7a8085':'#a7abad';
    B.cyl(mq?1.2:.95,mq?1.2:.95,9,12,0,0,0,sk,0,0,Math.PI/2);B.sph(mq?1.2:.95,4.4,mq?.15:0,0,sk,mq?1.7:1.9,mq?1.15:1,1);B.cyl(mq?1.2:.95,.35,3.4,10,-6.2,0,0,sk2,0,0,Math.PI/2);B.sph(.62,3.3,-1.15,0,'#2a2c2d');
    const wing=new THREE.Shape();wing.moveTo(1.2,0);wing.lineTo(.9,11);wing.lineTo(-.4,11);wing.lineTo(-.7,0);wing.lineTo(-.4,-11);wing.lineTo(.9,-11);wing.closePath();
    const wg=new THREE.ExtrudeGeometry(wing,{depth:.28,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:1});wg.rotateX(Math.PI/2);B._p.push({g:wg,m:new THREE.Matrix4().makeTranslation(.3,mq?.25:.75,0),c:lin(sk)});
    for(const sd of [-1,1]){const a=mq?.75:-.68;B.box(1.9,3.8,.14,-7,Math.sin(Math.abs(a))*1.7*(mq?1:-1),sd*1.55,sk2,sd*(mq?-.82:.82),0,0);}if(mq)B.box(1.5,2.2,.14,-7,-1.2,0,sk2);
    B.sph(.18,.25,0,11,'#c22a1e');B.sph(.18,.25,0,-11,'#c22a1e');B.sph(.18,.6,.75,-11,'#c22a1e');B.sph(.18,.6,.75,11,'#2bc24a');B.sph(.16,-7.9,.4,0,'#f2f2ee');
    const pr=new THREE.Group();const P=Bld();P.box(.3,5,.55,0,0,0,dk);P.sph(.4,0,0,0,dk);pr.add(mesh(P.geo()));pr.position.set(-8.1,0,0);pr.name='dprop';pr.userData.ax='x';yaw.add(pr);o.userData.parts.props.push({m:pr,ax:'x'});
    const disc=new THREE.Mesh(new THREE.CircleGeometry(2.6,20),new THREE.MeshBasicMaterial({color:0x222222,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.y=Math.PI/2;disc.position.set(-8.2,0,0);yaw.add(disc);}
  else if(ty==='lancet'){
    // Lancet-style loitering munition: dark slim body with two sets of X wings (front and rear), small pusher prop
    const sk='#3c403a',sk2='#2f322d';B.cyl(.8,.8,12,10,0,0,0,sk,0,0,Math.PI/2);B.cyl(0,.8,2.2,10,7.1,0,0,sk2,0,0,-Math.PI/2);B.cyl(.8,.4,1.4,10,-6.7,0,0,sk2,0,0,Math.PI/2);B.sph(.35,7.4,-.35,0,'#151515');
    for(const [x,ch,sp] of [[3.2,2.6,3.6],[-4.4,2.8,4.4]])for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;B.box(ch,sp,.12,x,Math.cos(a)*(sp/2+.6),Math.sin(a)*(sp/2+.6),sk,a,0,0);}
    B.sph(.16,-4.4,0,5.3,'#2bc24a');B.sph(.16,-4.4,0,-5.3,'#c22a1e');
    const pr=new THREE.Group();const P=Bld();P.box(.25,3.2,.45,0,0,0,dk);pr.add(mesh(P.geo()));pr.position.set(-7.6,0,0);pr.name='dprop';pr.userData.ax='x';yaw.add(pr);o.userData.parts.props.push({m:pr,ax:'x'});
    const disc=new THREE.Mesh(new THREE.CircleGeometry(1.7,16),new THREE.MeshBasicMaterial({color:0x222222,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.y=Math.PI/2;disc.position.set(-7.7,0,0);yaw.add(disc);}
  else{const big=ty==='kargu',arm=big?7.5:5.5,bc=big?'#7c8076':'#3b3f37';B.cyl(big?2.4:1.6,big?2.4:1.6,big?3:1.6,10,0,0,0,bc);if(big)B.sph(1.6,2,-.6,0,'#1b1c1a');else B.box(1.4,1.2,1.2,2,.5,0,'#111');B.box(1.6,.6,1.2,0,big?1.8:1.1,0,tc);
    for(const a of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]){const x=Math.cos(a)*arm,z=Math.sin(a)*arm;B.box(arm*1.05,.5,.7,x/2,0,z/2,bc,0,-a,0);B.cyl(.7,.7,1.2,8,x,.4,z,dk);
      const pr=new THREE.Group();const P=Bld();P.box(big?6:4.4,.15,.6,0,0,0,'#151515');pr.add(mesh(P.geo()));pr.position.set(x,1.1,z);pr.name='dprop';pr.userData.ax='y';yaw.add(pr);o.userData.parts.props.push({m:pr,ax:'y'});
      const disc=new THREE.Mesh(new THREE.CircleGeometry(big?3:2.2,16),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.set(x,1.15,z);yaw.add(disc);}
    if(big)for(const s of [-1,1])B.box(.4,2.4,.4,0,-1.6,1.4*s,dk);
    if(!big){B.cyl(.55,.55,2.6,8,-.6,1.55,0,'#2d3a52',0,0,Math.PI/2);for(const t of [-.5,.4])B.cyl(.6,.6,.35,8,-.6+t,1.55,0,'#151515',0,0,Math.PI/2);for(const s of [-1,1])B.cyl(.06,.06,3.2,4,-2.6,2.4,.5*s,dk,.3*s,0,1.1);}
    B.sph(.2,arm*.72,.6,arm*.72,'#2bc24a');B.sph(.2,arm*.72,.6,-arm*.72,'#c22a1e');B.sph(.2,-arm*.72,.6,arm*.72,'#e8e8e2');B.sph(.2,-arm*.72,.6,-arm*.72,'#e8e8e2');}
  // drones get their own plain painted-metal material: the shared one adds ground dust to everything near the model's
  // origin, which turned every drone sand-coloured whatever its paint
  if(!DPROTO._mat)DPROTO._mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.25});
  const dm=new THREE.Mesh(B.geo(),DPROTO._mat);dm.castShadow=true;const dP=ty!=='fpv'&&ty!=='kargu'?kitMeshProbe(dm):null;yaw.add(dm);const sc=ty==='delta'?.95:ty==='kargu'?.95:ty==='tb2'||ty==='mq'?.9:.85;yaw.scale.setScalar(sc);
  if(!(typeof SET!=='undefined'&&SET.gfx==='low')&&dP)try{const K=kitBuilder(),f=T.fac,dd=(face,sg,a,b,w,h,cell,sub,o)=>{const r=kitDec(dP,face,sg,a,b,w,h,cell,sub,o);if(r)K.quadN(r);return !!r;};
    // drone markings are tiny stencils, fitted to the fuselage / wing surface like every other decal
    if(ty==='delta'){const nm=f==='RS'?'ababil':f==='DW'?'qasef':'shahed',dg=f==='IR'?'p:':'a:',sn=String(100+(KFAC.indexOf(f)*47)%800);
      for(const zz of [3.6,-3.6])dd('top',1,-4.4,zz,3.0,.95,'s:'+nm,[.04,.1,.96,.9],{fa:.7,fb:.7,maxh:1.2,tag:'stencil'});
      for(const sc of [1,.8,.6]){const rs=[0,1,2].map(i=>kitDec(dP,'top',1,-6.6+(i-1)*.62*sc,6.2,.45*sc,.62*sc,dg+sn[i],[.25,.1,.75,.9],{minS:.9,tag:'serial'}));if(rs.every(r=>r&&r.w>=.45*sc*.97)){rs.forEach(r=>K.quadN(r));break;}}}
    else{const x=ty==='lancet'?-1.5:-2.4;for(const yy of ty==='mq'?[.3,0,.6]:[0,.2]){let n=0;for(const sg of [1,-1])if(dd('side',sg,x,yy,1.1,.66,'f:'+f,null,{fa:.6,fb:.6,maxw:1.3,tag:'flag'}))n++;if(n)break;}}
    const g=K.geo();if(g){g.userData.P=dP;yaw.add(kitMarker('drone|'+ty+'|'+f,g));}}catch(err){console.warn('drone kit',err);}
  SCN.add(o);return o;}
// The Ayatollah: a senior cleric - layered black turban (amamah), full white beard, round spectacles, a pale grey
// qaba robe to the ground under a dark brown aba cloak with thin gold edging, hands folded holding prayer beads.
// North Korea's supreme leader: a generic heavy-set figure in a grey-black buttoned tunic suit with two escort generals (visual only)
function dlBuild(o,yaw,B,P,T){
  const skin='#d8b48e',suit='#2c2f31',hair='#141210';
  const man=(x,z,k)=>{const sk=skin,body=k?'#5c6140':suit,cap=k?'#5c6140':suit,s=k?.92:1;
    for(const sd of [-1,1]){B.cyl(.75*s,.85*s,6.4*s,10,x,3.4*s,z+1.05*sd*s,body);B.box(1.5,.45,.8,x+.35,.22,z+1.05*sd*s,'#141414');}
    B.cyl(2.5*s,3.0*s,6.2*s,18,x,9.2*s,z,body);B.sph(2.9*s,x,8.6*s,z,body,1,1.05,1.05);
    for(const sd of [-1,1]){B.cyl(.8*s,.95*s,5.4*s,10,x,9.2*s,z+3.0*sd*s,body,0,0,.12*sd);B.sph(.6*s,x+.2,6.5*s,z+3.35*sd*s,sk);}
    B.cyl(.8,.9,.9,10,x,12.3*s,z,body);B.cyl(.75,.75,.5,10,x,12.8*s,z,sk);
    {const g=new THREE.SphereGeometry(1.45*s,18,14);g.scale(1,1.1,1.05);P(g,x,14.1*s,z,sk);}
    for(const sd of [-1,1])B.sph(.14,x+1.3*s,14.3*s,z+.45*sd,'#1a1410');
    if(!k){B.sph(1.5,x-.1,14.55,z,hair,1,.8,1.05);B.box(.35,.35,2.3,x-1.35,13.5,z,hair);
      for(let q=0;q<5;q++)B.sph(.2,x+1.55,10.8-q*1.05,z+.05,'#8a8e90');
      B.box(.12,.5,.8,x+2.55,10.6,z+1.1,'#b3202a');B.sph(.2,x+2.7,10.6,z+1.1,'#d9b24a');}
    else{B.cyl(1.9,1.7,.8,16,x,15.6*s,z,cap);B.cyl(2.6,2.6,.45,18,x+.1,16.3*s,z,cap);B.box(1.5,.18,2.2,x+1.8,15.3*s,z,'#141414');B.box(.3,.5,1.2,x+2.1,16.3*s,z,'#d9b24a');
      const mc=['#b3202a','#d9b24a','#2f6fb3','#d9b24a'];for(let r=0;r<3;r++)for(let c=0;c<3;c++)B.box(.1,.38,.7,x+2.55*s,10.6*s-r*.5,z-1.0+c*.8,mc[(r+c)%4]);
      B.box(.1,.4,1.4,x+2.6*s,12*s,z+1.4,'#d9b24a');}
  };
  man(0,0,0);man(-.6,5.6,1);man(-.6,-5.6,1);
  const body=mesh(B.geo());body.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});body.castShadow=true;body.receiveShadow=true;yaw.add(body);yaw.scale.setScalar(.888);/* same height as a soldier (MCFG.inf.size 14) */
  const ring=new THREE.Mesh(new THREE.RingGeometry(7,7.8,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(T.color),transparent:true,opacity:.32,depthWrite:false}));ring.position.y=1.2;ring.renderOrder=2;o.add(ring);o.userData.parts.tring=ring;
  SCN.add(o);return o;}
function clericModel(e){const T=G.teams[e.team],o=new THREE.Group(),yaw=new THREE.Group();o.add(yaw);o.userData.parts={body:yaw};o.userData.model=true;o.userData.cleric=true;
  const DL=T&&T.fac==='KP',B=Bld(),skin=DL?'#d8b48e':'#c69a78',robe=DL?'#3a3d3f':'#a8a397',aba=DL?'#2a2c2e':'#3b2d23',trim=DL?'#2a2c2e':'#b8963e',tur='#101010',beard=DL?(DL?'#d8b48e':'#ecebe6'):'#ecebe6',P=(g,x,y,z,c,rx=0,ry=0,rz=0)=>{const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1));B._p.push({g,m,c:lin(c)});};
  if(DL)return dlBuild(o,yaw,B,P,T);
  // qaba: smooth lathe from hem to shoulders, with soft folds
  {const pts=[];for(let k=0;k<=12;k++){const y=k/12*11.6;const r=3.05-1.05*Math.pow(k/12,.9)+(k===12?-.4:0);pts.push(new THREE.Vector2(r,y));}const g=new THREE.LatheGeometry(pts,24);const pa=g.attributes.position;for(let q=0;q<pa.count;q++){const x=pa.getX(q),z=pa.getZ(q),y=pa.getY(q),a=Math.atan2(z,x),f=1+.05*Math.sin(a*9)*(1-y/11.6);pa.setX(q,x*f);pa.setZ(q,z*f);}g.computeVertexNormals();P(g,0,0,0,robe);}
  // aba: open-fronted cloak hanging from the shoulders, slightly wider, gold edge down the opening
  {const pts=[];for(let k=0;k<=12;k++){const y=.4+k/12*11.4;const r=3.5-1.2*Math.pow(k/12,1.1);pts.push(new THREE.Vector2(r,y));}const g=new THREE.LatheGeometry(pts,26,Math.PI*.5+.5,Math.PI*2-1);const pa=g.attributes.position;for(let q=0;q<pa.count;q++){const x=pa.getX(q),z=pa.getZ(q),y=pa.getY(q),a=Math.atan2(z,x),f=1+.06*Math.sin(a*7+1)*(1-y/12);pa.setX(q,x*f);pa.setZ(q,z*f);}g.computeVertexNormals();const m2=g.clone();P(g,0,0,0,aba);
   for(const sd of [-1,1]){const a0=Math.PI*.5+.5+(sd>0?Math.PI*2-1:0);for(let k=0;k<12;k++){const y=.9+k*.95,r=3.42-1.18*Math.pow((y-.4)/11.4,1.1);B.box(.22,1,.22,Math.cos(a0)*r,y,-Math.sin(a0)*r,trim);}}}
  B.cyl(2.25,2.5,.9,20,0,11.5,0,aba);B.sph(2.3,0,11.6,0,aba,1,.45,1);
  // sleeves and folded hands with prayer beads
  for(const sd of [-1,1]){B.cyl(.85,1.15,4.6,10,.9,8.9,1.95*sd,aba,0,0,.55);B.cyl(.95,.95,1.6,10,2.1,7.1,1.3*sd,robe,0,0,1.25);}
  B.sph(.62,2.75,6.75,.45,skin,1.2,.8,1);B.sph(.62,2.75,6.75,-.45,skin,1.2,.8,1);for(let q=0;q<9;q++){const a=q/9*6.28;B.sph(.14,3.1+Math.cos(a)*.15,6.1+Math.sin(a)*.6,Math.sin(a*2)*.25,'#5a3a1c');}
  // neck, head, face
  B.cyl(.7,.8,1,12,0,12.4,0,skin);
  {const g=new THREE.SphereGeometry(1.35,18,14);g.scale(1,1.2,.98);P(g,0,13.9,0,skin);}
  {const g=new THREE.ConeGeometry(.28,.75,8);g.rotateZ(-Math.PI/2);P(g,1.55,13.75,0,'#b98c6a');}
  for(const sd of [-1,1]){B.sph(.16,1.25,14.25,.45*sd,'#1a1410');B.box(.2,.18,.65,1.28,14.62,.47*sd,'#e7e5df');}
  // round spectacles
  for(const sd of [-1,1]){const g=new THREE.TorusGeometry(.36,.05,6,16);g.rotateY(Math.PI/2);P(g,1.42,14.25,.45*sd,'#3a3226');}B.box(.06,.06,.3,1.44,14.3,0,'#3a3226');
  // full white beard from ear to ear, longer at the chin, and moustache
  {const g=new THREE.SphereGeometry(1.35,16,12,0,Math.PI*2,Math.PI*.42,Math.PI*.58);g.scale(1.05,1.55,1.08);P(g,.12,13.55,0,beard);}
  {const g=new THREE.ConeGeometry(.9,2.2,10);g.rotateZ(Math.PI);P(g,.65,11.95,0,beard);}B.box(.35,.32,1.1,1.38,13.32,0,'#e2e0d9');
  for(const sd of [-1,1])B.sph(.42,.25,14.05,1.2*sd,beard,.7,1.3,.6);
  // amamah: wrapped layers of black cloth and a rounded crown
  for(let k=0;k<4;k++){const g=new THREE.TorusGeometry(1.32-k*.06,.38,8,24);g.rotateX(Math.PI/2);P(g,-.05,14.95+k*.42,0,k%2?'#161616':tur,0,0,(k%2?.06:-.05));}
  B.sph(1.35,-.05,16.1,0,tur,1,.62,1);B.sph(.5,.25,16.5,.3,'#1b1b1b',1.2,.6,1.4);
  // shoes peeking out of the hem
  for(const sd of [-1,1])B.box(1.3,.45,.7,1.7,.22,.75*sd,'#1c1a18');
  const body=mesh(B.geo());body.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});body.castShadow=true;body.receiveShadow=true;yaw.add(body);yaw.scale.setScalar(.826);/* same height as a soldier (MCFG.inf.size 14) */
  const ring=new THREE.Mesh(new THREE.RingGeometry(4.4,5,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(T.color),transparent:true,opacity:.32,depthWrite:false}));ring.position.y=1.2;ring.renderOrder=2;o.add(ring);o.userData.parts.tring=ring;
  // a faint green halo of light marks him on the battlefield
  const glow=new THREE.Mesh(new THREE.RingGeometry(5.2,6.2,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x5fd38a,transparent:true,opacity:.18,depthWrite:false}));glow.position.y=1.3;glow.renderOrder=2;o.add(glow);
  SCN.add(o);return o;}
// Graphics Phase 5: every unit's team-colour ring and every ground vehicle's soft contact shadow were a mesh of their
// own (own geometry, own material) - one draw call each, i.e. one or two per unit on screen. They are now plain marker
// objects inside the unit (so they still move, turn, hide and die with it), and all the visible ones of a kind are
// drawn by ONE instanced mesh, refilled each frame from the markers' positions just before the scene is drawn.
const DECAL={sets:{}};
function decalSet(k){let S=DECAL.sets[k];if(S)return S;let geo,mat,ro;
  if(k==='blob'){if(!window.BLOBTEX){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,4,32,32,31);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.6,'rgba(0,0,0,.25)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);window.BLOBTEX=new THREE.CanvasTexture(c);}
    geo=new THREE.PlaneGeometry(1.5,1).rotateX(-Math.PI/2);mat=new THREE.MeshBasicMaterial({map:BLOBTEX,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});ro=1;}
  else{geo=k==='ringS'?new THREE.RingGeometry(.5,.56,28):new THREE.RingGeometry(.36,.41,28);geo.rotateX(-Math.PI/2);mat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.24,depthWrite:false});ro=2;}
  return DECAL.sets[k]=S={geo,mat,ro,im:null,cap:0,list:new Set(),col:k!=='blob'};}
// faction kit, ship radars and drone stencils are drawn as instances (one draw call per kit shape for the whole
// battle, not one per unit): each unit only carries an empty marker whose world matrix feeds the instanced mesh
function kitMarker(id,g){const k='kit:'+id;let S=DECAL.sets[k];if(!S)S=DECAL.sets[k]={geo:g,mat:kitMat(),ro:0,im:null,cap:0,list:new Set(),col:false};
  const m=new THREE.Object3D();m.name='kitInst';m.userData.kid=id;S.list.add(m);if(SCN&&SCN.onBeforeRender!==decalUpdate)SCN.onBeforeRender=decalUpdate;return m;}
function kitAdopt(o){o.traverse(q=>{if(q.name==='kitInst'&&q.userData.kid){const S=DECAL.sets['kit:'+q.userData.kid];if(S)S.list.add(q);}});}
function decal(k,color){const S=decalSet(k),m=new THREE.Object3D();m.name='decal_'+k;if(color)m.userData.dc=color;S.list.add(m);
  if(SCN&&SCN.onBeforeRender!==decalUpdate)SCN.onBeforeRender=decalUpdate;return m;}
function decalUpdate(){for(const k in DECAL.sets){const S=DECAL.sets[k];let n=0;
    if(S.im&&S.im.parent!==SCN){if(S.im.parent)S.im.parent.remove(S.im);S.im.dispose();S.im=null;S.cap=0;}
    for(const m of S.list){let q=m,v=true;while(q.parent){if(!q.visible)v=false;q=q.parent;}if(q!==SCN){if((m.userData.off=(m.userData.off||0)+1)>3600)S.list.delete(m);continue;}m.userData.off=0;if(v)n++;}
    if(n>S.cap){if(S.im){SCN.remove(S.im);S.im.dispose();}S.cap=Math.max(64,Math.ceil(n*1.5));const im=new THREE.InstancedMesh(S.geo,S.mat,S.cap);im.name='decals_'+k;im.frustumCulled=false;im.renderOrder=S.ro;im.castShadow=im.receiveShadow=false;im.matrixAutoUpdate=false;
      if(S.col)im.setColorAt(0,new THREE.Color(1,1,1));S.im=im;SCN.add(im);}
    if(!S.im)continue;const im=S.im;let i=0;
    for(const m of S.list){let q=m,v=true;while(q.parent){if(!q.visible){v=false;break;}q=q.parent;}if(!v||q!==SCN)continue;im.setMatrixAt(i,m.matrixWorld);if(S.col&&m.userData.dc)im.setColorAt(i,m.userData.dc);i++;}
    im.count=i;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;}}
const CHAMP_TINT={US:'#5b5442',RU:'#454d33',IR:'#3a3b2b',RS:'#4b4a38',DW:'#6a5a3c',KP:'#485836',CN:'#3d5033',IL:'#4f5240',TR:'#4a4636',EU:'#3f4636',UA:'#4a5030',SA:'#6a5d44',AE:'#6a5d44',PK:'#43502f',IN:'#444a35',KR:'#41493a',EG:'#6a5f42',CU:'#2e3a2c'};   // hero squad uniform colours
function modelFor(e){if(!MODELS.ready||e.isB)return null;if(e.kind==='drone')return droneModel(e);const T=G.teams[e.team];let c=MCFG[e.kind];if(e.kind==='champ')c=Object.assign({},c,{tint:CHAMP_TINT[T.fac]||c.tint});if(e.kind==='tank'&&MIL_TANK[T.fac])c=MIL_TANK[T.fac];{const rk=e.kind==='aa'?(/Technical/.test(e.s.name||'')?'zu':'ozelot'):RMAP[e.kind]&&RMAP[e.kind][T.fac];if(rk&&MODELS.proto[RMOD[rk].m])c=Object.assign({},c,RMOD[rk],{extra:RMOD[rk].extra||(e.kind==='dozer'?null:c&&c.extra)});}
  if(e.kind==='aa'&&MODELS.proto.sam&&MODELS.proto[truckKey(T.fac)])c={m:truckKey(T.fac),fit:'z',size:34,extra:'samtruck'};
  if(e.kind==='arty'&&!(e.s&&e.s.rocket)&&RMAP.arty[T.fac]&&MODELS.proto[RMOD[RMAP.arty[T.fac]].m])c=RMOD[RMAP.arty[T.fac]];
  else if(e.kind==='arty'){if(e.s&&e.s.rocket||!MIL_TANK[T.fac]&&!MODELS.proto.tank)c={m:truckKey(T.fac),fit:'z',size:34,extra:'mlrs'};else{const tc=MIL_TANK[T.fac]&&MIL_TANK[T.fac].m!=='technical'&&MIL_TANK[T.fac].m!=='toontank'?MIL_TANK[T.fac]:MCFG.tank;c=Object.assign({},tc,{size:tc.size*1.08,extra:'gun'});if(MIL_TANK[T.fac]&&(MIL_TANK[T.fac].m==='technical'||MIL_TANK[T.fac].m==='toontank'))c={m:truckKey(T.fac),fit:'z',size:34,extra:'mlrs'};}}
  if(c&&(c.m==='boat'||c.m==='ship')&&T&&T.fac)c=Object.assign({},c,{tint:navyPaint(T.fac,c.m),tk:e.kind==='lander'?.6:.88});
  if(c&&!MODELS.proto[c.m]){const alt={soldier:'inf',tankE:'tank',tankW:'tank',drone:null,technical:'tank',toontank:'tank'}[c.m];if(alt&&MODELS.proto[alt])c=Object.assign({},c,{m:alt});}
  if(!c||!MODELS.proto[c.m])return null;
  const o=new THREE.Group();o.userData.parts={};const sq=c.squad||[[0,0]];const yaw=new THREE.Group();yaw.rotation.y=Math.PI/2+(c.flip?Math.PI:0);o.add(yaw);
  for(const [px,pz] of sq){const VR=Math.abs((e.id*31+Math.round(px*3)*17+Math.round(pz*5)*7)|0)%4;const SK=c.m==='soldier'&&MODELS.proto[solKey(T.fac)]?solKey(T.fac):null;const m=instModel(SK||c.m,c.tint?{color:c.tint}:T,c.fit,c.size,1,c.m==='soldier'&&!c.tint?[.03,.07,.11][(e.id+px*3)%3|0]:c.tk);if(!m)return null;m.position.set(-pz,c.dy||0,px);m.rotation.y=(Math.random()-.5)*(c.m==='soldier'?.08:.3);yaw.add(m);if(c.m==='soldier'){m.userData.legs=setupWalk(m);m.userData.wsign=WALKSIGN;try{if(SK)newSoldierKit(m,T.fac,e.kind,SK,VR);else soldierGear(m,T.fac||(G.teams[e.team]&&G.teams[e.team].fac),e.kind);}catch(err){console.warn('kit',err);}try{mergeSoldier(m,(SK||c.m)+'|'+(c.tint||T.color)+'|'+((c.m==='soldier'&&!c.tint?[.03,.07,.11][(e.id+px*3)%3|0]:c.tk)||0)+'|'+(T.fac||'')+'|'+e.kind+'|v'+(SK?VR:0));}catch(err){console.warn('mergeSoldier',err);}}
    if(m.userData.anims&&m.userData.anims.length){const mix=new THREE.AnimationMixer(m.userData.inner);(o.userData.mixers=o.userData.mixers||[]).push({mix,anims:m.userData.anims,cur:null});}}
  o.userData.parts.body=yaw;o.userData.model=true;if(c.m==='soldier'){o.userData.mixers=null;o.userData.walker=true;}
  {const ring=decal(c.squad?'ringS':'ringV',new THREE.Color(T.color));ring.scale.setScalar(c.size);ring.position.y=1.2;if(!['heli','jet'].includes(e.kind))o.add(ring);o.userData.parts.tring=ring;}
  // soft contact shadow so ground vehicles sit in the terrain instead of floating on it
  if(T&&e.s&&e.s.dom==='ground'&&!isInf(e.s)){const bs=(c.size||30)*.62,bl=decal('blob');bl.scale.set(bs,1,bs);bl.position.y=.35;yaw.add(bl);}
  const rotary=e.kind==='heli'||e.kind==='airlift'&&/^m_/.test(c.m),ownRotor=rotary?yaw.getObjectByName('main_rotor'):null;if(ownRotor){o.userData.parts.blades=ownRotor;const tr0=yaw.getObjectByName('tail_rotor');if(tr0)o.userData.parts.tailR0=tr0;}
  if(rotary&&!ownRotor){
    // main rotor on a mast just above the cabin roof and a tail rotor on the tail boom, both placed from the model's
    // real bounding box so every nation's helicopter gets correctly sized, visibly spinning rotors
    o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(yaw),ok=isFinite(bb.max.y)&&bb.max.y>2,top=ok?bb.max.y:13,L=ok?Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z):50,alongX=!ok||(bb.max.x-bb.min.x)>=(bb.max.z-bb.min.z);
    const R=Math.max(16,L*.46),bm=new THREE.MeshStandardMaterial({color:0x1d1f1c,roughness:.6,metalness:.3});
    const disc=new THREE.Mesh(new THREE.CircleGeometry(R,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.13,depthWrite:false}));disc.position.y=top+1.6;o.add(disc);o.userData.parts.rotor=disc;
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.7,.9,2.2,8),bm);mast.position.y=top+.6;o.add(mast);
    const bl=new THREE.Group();bl.position.y=top+1.7;for(let k=0;k<4;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(R,.3,1.5),bm);b.position.x=R/2;b.rotation.x=.06;const pv=new THREE.Group();pv.rotation.y=k*Math.PI/2;pv.add(b);bl.add(pv);}
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,1.2,8),bm);bl.add(hub);bl.traverse(c=>{if(c.isMesh)c.castShadow=true;});o.add(bl);o.userData.parts.blades=bl;
    const tr=new THREE.Group(),tl=R*.2;for(let k=0;k<2;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(.9,tl,.25),bm);b.position.y=tl/2;const pv=new THREE.Group();pv.rotation.z=k*Math.PI;pv.add(b);tr.add(pv);}
    const tdisc=new THREE.Mesh(new THREE.CircleGeometry(tl,16),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));tr.add(tdisc);
    if(alongX){tr.position.set(ok?bb.min.x+tl*.9:-24,ok?bb.min.y+(bb.max.y-bb.min.y)*.62:8,(ok?bb.max.z:2)*.15+1.2);}else{tr.rotation.y=Math.PI/2;tr.position.set((ok?bb.max.x:2)*.15+1.2,ok?bb.min.y+(bb.max.y-bb.min.y)*.62:8,ok?bb.min.z+tl*.9:-24);}
    o.add(tr);o.userData.parts.tailR=tr;}
  if(e.kind==='jet'){mats();o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(yaw),ok=isFinite(bb.min.x);const tx=ok?bb.min.x+.6:-22,ty=ok?bb.min.y+(bb.max.y-bb.min.y)*.42:1;
    // engine exhaust at each real nozzle (found by ray probes from behind; twin-engine jets get two). A soft additive
    // plume - hot white-yellow core fading to orange and nothing - plus a red-hot nozzle ring. In cruise only a short faint
    // heat glow shows; the full afterburner plume with shock diamonds only on take-off / hard climbs (06-view scales it).
    let nz=null;try{if(ok)nz=jetNozzles(o,yaw,bb);}catch(err){}if(!nz||!nz.length)nz=[{x:tx,y:ty,z:0,r:1.5}];
    const ex=new THREE.Group();ex.name='exhaust';for(const n of nz){const g=new THREE.Mesh(jetPlumeGeo(),jetPlumeMat());g.position.set(n.x,n.y,n.z);g.scale.setScalar(n.r);g.userData.r=n.r;g.renderOrder=3;g.frustumCulled=false;ex.add(g);}
    o.add(ex);o.userData.parts.glow=ex;}
  if(c.extra==='zu23'){const B=Bld(),D='#2a2c28',S='#4f5446';B.box(7,1.6,6,-5,9.6,0,S);B.cyl(1.4,1.6,1.6,10,-5,11,0,D);B.box(4,3.2,4.6,-5,13,0,S);B.box(.4,3,5.4,-3,13.6,0,S);for(const z of [-1.1,1.1]){B.cyl(.32,.32,13,8,1.2,16.2,z,D,0,0,Math.PI/2-.42);B.cyl(.5,.5,1.6,8,-3.2,13.6,z,D,0,0,Math.PI/2-.42);}const g=mesh(B.geo());g.castShadow=true;o.add(g);o.userData.parts.turret=g;}
  if(c.extra==='dshk'){const B=Bld();B.cyl(.5,.6,6,8,-6,9,0,'#2b2d2a');B.box(3,1.6,2.2,-6,12.6,0,'#33352f');B.cyl(.35,.35,9,8,-1.5,13,0,'#1e1f1d',0,0,Math.PI/2);B.box(.4,2.2,2.6,-6.8,13.4,0,'#4a4d45');const g=mesh(B.geo());g.castShadow=true;o.add(g);}
  if(c.extra==='samtruck'){const sp=instModel('sam',{color:'#62664f'},'y',13,1,.6);if(sp){sp.position.set(-7,9,0);sp.rotation.y=Math.PI/2;o.add(sp);o.userData.parts.turret=sp;}}
  if(c.extra==='mlrs'){const B=Bld();B.box(15,1.5,11,0,0,0,'#4c5048');for(let i=0;i<2;i++)for(let j=0;j<3;j++)B.cyl(1.4,1.4,16,8,0,2.4+i*3,-3.2+j*3.2,'#5b6152',0,0,Math.PI/2);B.box(16,6.2,10.4,0,4,0,'#596050');const g=new THREE.Group();const m=mesh(B.geo());m.rotation.z=.32;g.add(m);g.position.set(-6,10,0);o.add(g);o.userData.parts.turret=g;}
  if(c.extra==='crane'){const B=Bld(),Y='#d9a21f',D='#3a3a34';B.box(9,4,10,-7,9,0,Y);B.cyl(2.2,2.6,3,10,-7,12,0,D);B.box(2,2,2,-7,14,0,D);const g=new THREE.Group();const arm=mesh((()=>{const A=Bld();A.box(26,2.2,2.2,13,0,0,Y);A.box(2,6,1,25,-3,0,D);A.box(1.2,1.2,1.2,25,-6.5,0,'#222');return A.geo();})());arm.rotation.z=.42;g.add(arm);g.position.set(-7,14,0);g.rotation.y=.5;o.add(g);o.userData.parts.crane=g;
    B.box(2.4,6.5,20,17,3.2,0,Y);B.box(1,1,18,18.6,0.6,0,D);B.box(5,1.2,1.2,14.5,4.2,-6,D);B.box(5,1.2,1.2,14.5,4.2,6,D);B.box(1.6,1.6,1.6,1,17.5,-4,'#f0a020');o.add(mesh(B.geo()));}
  if(c.extra==='dish'){const B=Bld();B.box(12,5,10,-6,9,0,'#4f5448');B.cyl(.8,.8,9,6,-6,15,0,'#2c2e29');const g=new THREE.Group();const d=mesh((()=>{const A=Bld();A.cyl(9,1,2,14,0,0,0,'#b8bcb4',Math.PI/2.4,0,0);A.cyl(.6,.6,6,6,0,1,3,'#2c2e29',Math.PI/2.4,0,0);return A.geo();})());g.add(d);g.position.set(-6,20,0);o.add(mesh(B.geo()));o.add(g);o.userData.parts.crane=g;}
  if(c.extra==='mg'){const B=Bld();B.box(3,3,3,-4,11,0,'#2c2e29');B.box(12,1.2,1.2,2,12,0,'#1e1f1b');B.box(1,6,8,-8,13,0,'#3a3a34');o.add(mesh(B.geo()));}
  if(c.extra==='mortar'){const B=Bld();B.cyl(.9,1.1,8,8,4,3,6,'#2c2e29',0,0,.6);B.box(4,.6,4,6,0,6,'#3a3a34');o.add(mesh(B.geo()));}
  if(c.extra==='gun'){const B=Bld();B.cyl(1.1,1.4,30,10,15,0,0,'#3b3e36',0,0,Math.PI/2);B.cyl(1.7,1.7,3,10,29,0,0,'#2c2e29',0,0,Math.PI/2);B.box(7,4,6,1,0,0,'#4a4d44');const m=mesh(B.geo());m.position.set(4,11.5,0);m.rotation.z=.12;o.add(m);}
  if(e.kind==='tank'&&c.m!=='technical'&&!/^m_/.test(c.m)){const TB=tankBox(c.m,yaw);if(TB){const B=Bld(),{L,W,H,rear,ax,fwd,y0}=TB;
    // positions in "hull frame": u along hull (+u = toward gun), v across, h up
    const P=(u,v)=>ax==='x'?[u,v]:[v,u];const add=(f,u,h,v)=>{const [x,z]=P(u,v);f(x,h+y0,z);};
    const bx=(w,hh,d,u,h,v,col)=>add((x,y,z)=>{const [ww,dd]=ax==='x'?[w,d]:[d,w];B.box(ww,hh,dd,x,y,z,col);},u,h,v);
    const cy=(r1,r2,len,seg,u,h,v,col)=>add((x,y,z)=>B.cyl(r1,r2,len,seg,x,y,z,col),u,h,v);
    const ru=rear+fwd*L*.07;
    cy(.08,.13,H*.9,4,ru+fwd*L*.06,H*.95+H*.45,W*.3,'#2a2b27');cy(.08,.13,H*.75,4,ru+fwd*L*.1,H*.9+H*.37,-W*.28,'#2a2b27');
    
    for(const v of [-1,1])bx(L*.2,H*.12,W*.08,rear+fwd*L*.35,H*.5,v*W*.47,'#4d4a3c');
    // national pennant on the rear antenna
    {const [x,z]=P(ru+fwd*L*.06,W*.3);const fl=new THREE.Mesh(new THREE.PlaneGeometry(H*.75,H*.45,6,1),new THREE.MeshStandardMaterial({map:idFlagTex(G.teams[e.team]),side:THREE.DoubleSide,roughness:.9}));
     fl.geometry.translate(-H*.375,0,0);fl.position.set(x,y0+H*.95+H*.82,z);fl.rotation.y=ax==='x'?(fwd>0?0:Math.PI):(fwd>0?-Math.PI/2:Math.PI/2);yaw.add(fl);o.userData.parts.pennant=fl;fl.userData.base=Float32Array.from(fl.geometry.attributes.position.array);}
    
    const m=mesh(B.geo());yaw.add(m);}}
  if(e.kind==='harv'){const B=Bld();for(const [x,z] of [[-9,-4],[-2,-4],[-9,3],[-2,3]])B.box(6,5,6,x,20,z,'#c99a2e');const cg=mesh(B.geo());o.add(cg);o.userData.parts.cargo=cg;}
  try{factionKit(e,c,o,yaw,yaw.children[0],T);}catch(err){console.warn('factionKit',err);}
  SCN.add(o);return o;}
function playAnim(o,name,dt){const L=o.userData.mixers;if(!L)return;for(const M of L){if(M.cur!==name){const clip=M.anims.find(a=>a.name.toLowerCase().includes(name))||M.anims[0];if(clip){M.mix.stopAllAction();M.mix.clipAction(clip).play();}M.cur=name;}M.mix.update(dt);}}
function propObj(key,x,z,rot,parent){const c=PROPS[key];if(!c||!MODELS.proto[key])return;const m=instModel(key,null,c.fit,c.size);if(!m)return;m.position.set(x,0,z);m.rotation.y=rot||0;m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});parent.add(m);return m;}
function decorateBld(e,o){if(!MODELS.ready)return;const h=e.size/2;const P=new THREE.Group();o.add(P);
  const T=G.teams[e.team];if(T&&MEFAC.has(T.fac)&&(e.kind==='turret'||e.kind==='sam')){propObj('crate',h+6,h+4,.3,P);return;}// HESCO ring instead of sandbag props
  if(e.kind==='hq'){propObj('watertower',-h-14,-h+6,0,P);propObj('container',h+20,-h+18,Math.PI/2,P);propObj('containerG',h+20,-h+52,Math.PI/2,P);propObj('barrel',-h-8,h+6,0,P);propObj('barrel',-h-14,h+10,0,P);propObj('fence',-14,h+16,0,P);}
  else if(e.kind==='barracks'){propObj('tent',0,h+30,0,P);propObj('sandbag',-h-6,h-8,Math.PI/2,P);propObj('sandbag',h+6,h-8,Math.PI/2,P);propObj('crate',h+8,-h+6,.3,P);propObj('crate',h+12,-h+14,0,P);}
  else if(e.kind==='factory'){propObj('container',-h-18,0,Math.PI/2,P);propObj('barrel',h+8,h-4,0,P);propObj('barrel',h+8,h-12,0,P);propObj('barrel',h+14,h-8,0,P);propObj('pallet',-h+6,h+10,0,P);propObj('crate',-h+6,h+10,0,P);}
  else if(e.kind==='airfield'){propObj('crate',h+6,h-6,0,P);propObj('barrel',h+6,h-16,0,P);propObj('containerG',-h-18,10,Math.PI/2,P);}
  else if(e.kind==='shipyard'){propObj('container',-10,-h-14,0,P);propObj('containerG',22,-h-14,0,P);propObj('crate',h+6,0,0,P);}
  else if(e.kind==='turret'){propObj('sandbag',-h-2,0,Math.PI/2,P);propObj('sandbag',h+2,0,Math.PI/2,P);propObj('sandbag',-5,h+3,.08,P);propObj('sandbag',5,-h-3,-.06,P);}
  // anti-air sites and tunnel mouths get a low sandbag wall and some supplies too (render only)
  else if(e.kind==='sam'){propObj('sandbag',-h-3,4,Math.PI/2,P);propObj('sandbag',h+3,-4,Math.PI/2,P);propObj('sandbag',2,h+3,.1,P);propObj('crate',h+6,h+4,.3,P);}
  else if(e.kind==='tunnel'){propObj('sandbag',-h-2,-6,Math.PI/2+.1,P);propObj('sandbag',-h-2,8,Math.PI/2-.08,P);propObj('sandbag',h+2,0,Math.PI/2,P);propObj('barrel',h+5,h-4,0,P);propObj('crate',-h-4,h+4,.5,P);}
  else if(e.kind==='depot'){propObj('containerG',-h-12,8,Math.PI/2,P);propObj('pallet',h+5,h-8,0,P);propObj('crate',h+7,-h+10,.4,P);propObj('barrel',-h+6,h+6,0,P);}
  else if(e.kind==='uplink'){propObj('barrel',h+8,h,0,P);propObj('fence',0,h+14,0,P);}}
const BMOD={hq:{slab:1,list:[{m:'b_hq',fit:'xz',size:70,ys:.62,x:6,z:4},{m:'b_radar',fit:'y',size:30,x:-30,z:-30,part:'dish',col:'#8a908c',k:.82}]},
  barracks:{slab:1,list:[{m:'b_barr',fit:'xz',size:46,ys:.52,x:-4,z:-4}]},
  factory:{slab:1,list:[{m:'b_fact',fit:'xz',size:72,x:0,z:-2}]},
  airfield:{list:[{m:'b_pad',fit:'xz',size:34,x:24,z:-28,y:2.6}]},
  coast:{slab:1,list:[{m:'m_cbat',fit:'z',size:31,x:-1,z:0,y:2.4,part:'gun',col:'#ffffff',k:.02}]},
  shipyard:{slab:1,list:[{m:'b_dock',fit:'xz',size:66,x:0,z:0},{m:'b_crane',fit:'y',size:48,x:22,z:20,part:'crane'}]},
  turret:{slab:1,list:[{m:'b_turret',fit:'xz',size:30,part:'gun',col:'#5a5d4c',k:.85}]},
  sam:{slab:1,list:[{m:'sam',fit:'y',size:24,part:'gun',col:'#62664f',k:.6}]},
  uplink:{list:[{m:'b_radar',fit:'y',size:30,x:-26,z:26,part:'dish',col:'#8a908c',k:.82}]}};
function bldModel(e,o,T){let cfg=MODELS.ready&&BMOD[e.kind];if(cfg&&MEFAC.has(T.fac)&&BME[e.kind]&&MODELS.proto[BME[e.kind].m])cfg=Object.assign({},cfg,{list:cfg.list.map((q,i)=>i?q:Object.assign({},q,{m:BME[e.kind].m,size:BME[e.kind].size,ys:1}))});if(cfg&&e.kind==='shipyard'&&MEFAC.has(T.fac))cfg={list:cfg.list.filter(q=>q.part).map(q=>Object.assign({},q,{y:4}))};// ME naval base: code-built quay (04-gfx meGeo), keep the crane model
  if(!cfg||!cfg.list.every(q=>MODELS.proto[q.m]))return false;const P=o.userData.parts;
  if(!['turret','sam'].includes(e.kind)){const fg=new THREE.Group(),h2=e.size/2;fg.position.set(-h2+4,0,h2-4);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,30,6),new THREE.MeshStandardMaterial({color:0x8a8d90,metalness:.6,roughness:.4}));pole.position.y=15;pole.castShadow=true;fg.add(pole);
    const fgeo=new THREE.PlaneGeometry(15,9,8,1);fgeo.translate(7.5,0,0);const fl=new THREE.Mesh(fgeo,new THREE.MeshStandardMaterial({map:idFlagTex(T),side:THREE.DoubleSide,roughness:.85,emissive:new THREE.Color(T.color),emissiveIntensity:.04}));{const tb=new THREE.Mesh(new THREE.BoxGeometry(.9,7,.9),new THREE.MeshStandardMaterial({color:new THREE.Color(T.color),roughness:.6}));tb.position.set(0,26.5,0);fg.add(tb);}fl.position.y=26.5;fl.castShadow=true;fg.add(fl);o.add(fg);P.flag=fl;fl.userData.base=fgeo.attributes.position.array.slice();}
  if(cfg.slab){const s=e.size,B=Bld(),tc='#'+new THREE.Color(T.color).lerp(new THREE.Color('#5a5c54'),.3).getHexString();B.box(s,2.4,s,0,1.2,0,'#a0937c');B.box(s-2,.7,3,0,2.5,s/2-3,tc);B.box(s-2,.7,3,0,2.5,-s/2+3,tc);B.box(3,.7,s-2,s/2-3,2.5,0,tc);B.box(3,.7,s-2,-s/2+3,2.5,0,tc);
    if(s>50){B.cyl(.5,.5,30,6,s/2-4,15,s/2-4,'#2b2d26');B.box(.3,7,11,s/2-4,26.5,s/2-9.5,tc);}
    // Middle Eastern nations: gun and SAM pits get a HESCO ring (open at the back), main buildings blast walls and a sandbag post
    if(MEFAC.has(T.fac)){const K=meKit(B,e.kind.length*97+s|0),h=s/2;if(e.kind==='turret'||e.kind==='sam'){const r=h+3;K.hesco(-r,-r,r,-r,4.5,3.2);K.hesco(r,-r,r,r,4.5,3.2);K.hesco(-r,-r,-r,r,4.5,3.2);K.hesco(-r,r,-5,r,4.5,3.2);K.hesco(5,r,r,r,4.5,3.2);}
      else if(s>40){K.twall(-h-3,-h+4,-h-3,-4,8);K.twall(-h+6,-h-3,h*.2,-h-3,8);K.bags(h+2,h-14,h+2,h+2,3);K.bags(h-12,h+2,h+2,h+2,3);}}
    const m=mesh(B.geo());o.add(m);P.main=m;}
  const RT={US:'#bdb49c',EU:'#b5b2a6',KR:'#b2b0a0',IR:'#c9b48a',SA:'#d2bd92',AE:'#d6c49c',EG:'#cdb68a',PK:'#c2b08a',IN:'#c7a98a',RS:'#c4ae84',DW:'#cbb58b',IM:'#a69a80',TR:'#c9b79a',IL:'#cfc3a6',RU:'#8b9479',CN:'#9a9c84',KP:'#848a72',CU:'#a8a07e',UA:'#949a84'}[T.fac];
  for(const q of cfg.list){const rc=q.col?{color:q.col}:(RT?{color:RT}:null);const m=instModel(q.m,rc,q.fit,q.size,q.ys,q.col?q.k:(RT?.42:undefined));if(!m)continue;m.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
    if(q.part){const g=new THREE.Group();g.position.set(q.x||0,q.y??(cfg.slab?2.4:0),q.z||0);g.add(m);o.add(g);P[q.part]=g;}else{m.position.set(q.x||0,q.y??(cfg.slab?2.4:0),q.z||0);o.add(m);}}
  if(e.kind==='coast'){// emplacement: sandbag walls round the launcher and a small radar / command truck beside the pad (visual only)
    const h=e.size/2,B=Bld();for(let i=-2;i<=2;i++){const sb=propObj('sandbag',-h*.92,i*h*.36,Math.PI/2,o);if(sb)sb.position.y=2.4;}
    for(const sd of [-1,1])for(let i=0;i<3;i++){const sb=propObj('sandbag',-h*.5+i*h*.42,sd*h*.97,0,o);if(sb)sb.position.y=2.4;}
    {const tk=truckKey(T.fac),ct=MODELS.proto[tk]?instModel(tk,{color:'#66694f'},'z',24,1,.7):null;if(ct){ct.position.set(h*.1,0,-h*1.35);ct.rotation.y=Math.PI*.5;ct.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});o.add(ct);B.cyl(.45,.45,5,6,h*.1-3,16,-h*1.35,'#33362e');B.cyl(2.8,.35,.8,14,h*.1-3,19,-h*1.35,'#7b8077',0,0,Math.PI/2*.8);const g=mesh(B.geo());g.castShadow=true;o.add(g);}}}
  return true;}
// Smooth shading for merged, non-indexed foliage: average the face normals of every vertex that shares a position.
function smoothNorm(g){const P=g.attributes.position,N=g.attributes.normal;if(!N)return;const m=new Map(),key=i=>Math.round(P.getX(i)*20)+','+Math.round(P.getY(i)*20)+','+Math.round(P.getZ(i)*20);
  for(let i=0;i<P.count;i++){const k=key(i);let a=m.get(k);if(!a){a=[0,0,0];m.set(k,a);}a[0]+=N.getX(i);a[1]+=N.getY(i);a[2]+=N.getZ(i);}
  for(let i=0;i<P.count;i++){const a=m.get(key(i)),L=Math.hypot(a[0],a[1],a[2])||1;N.setXYZ(i,a[0]/L,a[1]/L,a[2]/L);}N.needsUpdate=true;}
/* ---------- Realistic trees: alpha-cut foliage cards (needle sprigs / leaf clusters), muted natural greens (rendering only) ---------- */
let FOLTEX={},FOLREAL=false;
function folReal(kind){const P=MODELS.proto&&MODELS.proto.tree_tex;if(!P)return null;let t=null;P.scene.traverse(o=>{if(o.isMesh&&o.material&&o.material.name===kind&&o.material.map)t=o.material.map;});return t;}
function folTex(kind){if(FOLTEX[kind])return FOLTEX[kind];{const rt=folReal(kind);if(rt){rt.colorSpace=THREE.SRGBColorSpace;rt.anisotropy=4;rt.generateMipmaps=true;rt.minFilter=THREE.LinearMipmapLinearFilter;rt.needsUpdate=true;rt.userData.real=1;return FOLTEX[kind]=rt;}}const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),R=mulberry(kind==='needle'?5:9),g=()=>{const v=150+R()*105|0;return 'rgb('+v+','+v+','+v+')';};
  x.lineCap='round';
  if(kind==='needle'){ // a conifer sprig: a twig with many fine needles
    x.strokeStyle='rgb(120,120,120)';x.lineWidth=3;x.beginPath();x.moveTo(128,254);x.lineTo(128,6);x.stroke();
    for(let i=0;i<64;i++){const t=i/63,y=250-t*240,L=(1-t*.78)*108*(.8+R()*.4);for(const sd of [-1,1]){const a=(sd*(.95-.25*t))+(R()-.5)*.25;x.strokeStyle=g();x.lineWidth=2.2-1.1*t;x.beginPath();x.moveTo(128,y);x.lineTo(128+Math.sin(a)*L,y-Math.cos(a)*L*.55);x.stroke();}}}
  else{ // a leaf cluster: twigs radiating from the bottom with small leaves
    x.strokeStyle='rgb(110,110,110)';x.lineWidth=2.4;for(let k=0;k<7;k++){const a=(k-3)*.34+(R()-.5)*.15,L=150+R()*80;x.beginPath();x.moveTo(128,252);x.lineTo(128+Math.sin(a)*L,252-Math.cos(a)*L);x.stroke();
      for(let q=0;q<17;q++){const t=.2+q/17*.8,px=128+Math.sin(a)*L*t,py=252-Math.cos(a)*L*t;for(const sd of [-1,1]){x.fillStyle=g();x.beginPath();x.ellipse(px+sd*7,py+(R()-.5)*8,13+R()*5,5+R()*2.4,sd*.75+a*.4+(R()-.5)*.5,0,7);x.fill();}}}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.generateMipmaps=true;return FOLTEX[kind]=t;}
// cards: [x,y,z,yaw,pitch,w,l,centred,droop,r,g,b]; cx,cy,cz: crown centre (cards are lit like a soft ball)
function folGeo(cards,cx,cy,cz){const n=cards.length,P=new Float32Array(n*12),N=new Float32Array(n*12),U=new Float32Array(n*8),C=new Float32Array(n*12),I=new Uint32Array(n*6);
  cards.forEach((k,i)=>{const [x,y,z,yaw,pit,w,l,ce,dr,r,g,b]=k,dx=Math.cos(pit)*Math.cos(yaw),dy=Math.sin(pit),dz=Math.cos(pit)*Math.sin(yaw),sx=-Math.sin(yaw)*w/2,sz=Math.cos(yaw)*w/2,o=ce?-l/2:0;
    const bx=x+dx*o,by=y+dy*o,bz=z+dz*o,tx=bx+dx*l,ty=by+dy*l-dr,tz=bz+dz*l,mx=(bx+tx)/2-cx,my=(by+ty)/2-cy,mz=(bz+tz)/2-cz,ml=Math.hypot(mx,my,mz)||1;
    P.set([bx-sx,by,bz-sz,bx+sx,by,bz+sz,tx+sx,ty,tz+sz,tx-sx,ty,tz-sz],i*12);
    for(let q=0;q<4;q++){N[i*12+q*3]=mx/ml*.8;N[i*12+q*3+1]=my/ml*.8+.45;N[i*12+q*3+2]=mz/ml*.8;const sh=q<2?.78:1;C[i*12+q*3]=r*sh;C[i*12+q*3+1]=g*sh;C[i*12+q*3+2]=b*sh;}
    {const a=FOLREAL?(i%2)*.5:0,b=FOLREAL?a+.5:1;U.set(FOLREAL?[a,1,b,1,b,0,a,0]:[0,0,1,0,1,1,0,1],i*8);}I.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6);});
  const G2=new THREE.BufferGeometry();G2.setAttribute('position',new THREE.BufferAttribute(P,3));G2.setAttribute('normal',new THREE.BufferAttribute(N,3));G2.setAttribute('uv',new THREE.BufferAttribute(U,2));G2.setAttribute('color',new THREE.BufferAttribute(C,3));G2.setIndex(new THREE.BufferAttribute(I,1));return G2;}
function folMat(kind){const tm=new THREE.MeshStandardMaterial({map:folTex(kind),vertexColors:true,alphaTest:.42,side:THREE.DoubleSide,roughness:1,metalness:0});weather(tm,.35);
  const ob=tm.onBeforeCompile;tm.onBeforeCompile=sh=>{ob(sh);if(window.WINDU){sh.uniforms.wt=WINDU;sh.uniforms.ws=WINDS;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float wt;uniform float ws;').replace('#include <begin_vertex>','#include <begin_vertex>\n{/* whole canopy leans together (phase per tree, none per leaf: no shearing), slow and small, rises with height */vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);float k=clamp(transformed.y/38.,0.,1.);k*=k;float ph=ip.x*.013+ip.z*.011;float a=(sin(wt*.55+ph)*.7+sin(wt*.95+ph*1.6+.8)*.18)*k*.8*ws;transformed.x+=a;transformed.z+=a*.4;transformed.y-=a*a*.6/max(transformed.y,2.);}');}};
  tm.customProgramCacheKey=()=>'folt'+kind;return tm;}
function folPlace(list,geos,mats2,shadowG,yoff,sx,sy,snow){ // one InstancedMesh per part, same transforms
  const out=[];const col=new THREE.Color(),AUT=typeof G!=='undefined'&&G&&G.map&&G.map.mud;
  geos.forEach((g,gi)=>{const im=new THREE.InstancedMesh(g,mats2[gi],list.length);list.forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y)+yoff,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s*sx,s*sy*(.86+((i*7)%5)*.07),s*sx));im.setMatrixAt(i,TMPM);
      const j=((i*2654435761)>>>0)/4294967296;if(AUT&&gi>0&&mats2[gi].map&&mats2[gi].map===FOLTEX.leaf)col.setRGB(1.6+j*.8,1.0+j*.3,.28+j*.12);else col.setHSL(0,0,.8+j*.35);im.setColorAt(i,col);});
    im.castShadow=gi===0;im.receiveShadow=true;WORLD.add(im);out.push(im);});
  if(shadowG){const im=new THREE.InstancedMesh(shadowG,SHADOWM||(SHADOWM=new THREE.MeshBasicMaterial()),list.length);list.forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y)+yoff,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s*sx,s*sy*(.86+((i*7)%5)*.07),s*sx));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.layers.set(1);im.userData.noDepth=true;WORLD.add(im);}
  return out;}
function conifer_old(v,snow,lo){const R=mulberry(v*17+3),B=Bld();B.cyl(.5,1.5,12,6,0,6,0,'#3b3026');const trunk=B.geo().toNonIndexed();trunk.computeVertexNormals();
  const cards=[],NW=lo?9:15,per=lo?4:6,H=36;
  for(let k=0;k<NW;k++){const t=k/(NW-1),y=7+t*(H-7),rad=(12.5*Math.pow(1-t,.85)+1.4)*(.92+R()*.16),ph=R()*6.28;
    for(let q=0;q<per;q++){const yaw=ph+q/per*6.283+(R()-.5)*.5,l=rad*(1.05+R()*.25),sh=.55+t*.5,c=new THREE.Color().setHSL(.255+R()*.07,.2+R()*.1,(.1+t*.06)*(.85+R()*.3));if(snow)c.lerp(new THREE.Color(.8,.84,.88),.25+R()*.3);
      cards.push([0,y,0,yaw,-.42+t*.5+(R()-.5)*.2,l*.78,l,0,l*.1,c.r*1.2,c.g*1.2,c.b*1.2]);}}
  for(let q=0;q<3;q++){const c=new THREE.Color().setHSL(.27,.22,.2);cards.push([0,H-3,0,q*2.09,1.25,5,9,0,0,c.r,c.g,c.b]);}
  return [trunk,folGeo(cards,0,20,0)];}
function broadleaf_old(kind,v,lo){const R=mulberry(v*53+11),B=Bld(),bark='#5a4733',oak=kind==='oak',cards=[],cl=()=>{const c=new THREE.Color().setHSL(.18+R()*.07,.26+R()*.1,.14+R()*.07);return c;};
  if(oak){B.cyl(.9,2.1,18,7,0,9,0,bark);const nb=4;for(let b=0;b<nb;b++){const a=b/nb*6.28+R(),L=9+R()*4,lean=.65;B.cyl(.45,.9,L,5,Math.cos(a)*Math.sin(lean)*L/2,17+Math.cos(lean)*L/2,Math.sin(a)*Math.sin(lean)*L/2,bark,Math.sin(a)*lean,0,-Math.cos(a)*lean);}
    const N=lo?22:42;for(let i=0;i<N;i++){const a=R()*6.28,u=Math.pow(R(),.55),e=R()*1.5,rr=u*13,x=Math.cos(a)*rr*Math.cos(e*.6),z=Math.sin(a)*rr*Math.cos(e*.6),y=27+Math.sin(e)*u*8-(1-u)*1.5-3,c=cl(),w=7.5+R()*4;
      cards.push([x,y,z,R()*6.28,(R()-.5)*1.6,w,w*1.05,1,w*.15,c.r,c.g,c.b]);}}
  else{B.cyl(.8,1.7,16,6,0,8,0,bark);const nb=3+(R()*2|0),tops=[];for(let b=0;b<nb;b++){const a=b/nb*6.28+R()*.6,lean=.55+R()*.25,L=10+R()*6;B.cyl(.4,.75,L,5,Math.cos(a)*Math.sin(lean)*L/2,16+Math.cos(lean)*L/2,Math.sin(a)*Math.sin(lean)*L/2,bark,Math.sin(a)*lean,0,-Math.cos(a)*lean);tops.push([Math.cos(a)*Math.sin(lean)*L,16+Math.cos(lean)*L,Math.sin(a)*Math.sin(lean)*L]);}
    for(const [tx,ty,tz] of tops)for(let q=0;q<(lo?7:14);q++){const a=R()*6.28,d=q?R()*8:0,c=cl(),w=9+R()*4;cards.push([tx+Math.cos(a)*d,ty+1+R()*2.2-d*.1,tz+Math.sin(a)*d,R()*6.28,(R()-.5)*.55,w,w,1,w*.1,c.r*1.1,c.g*1.1,c.b*.95]);}}
  const trunk=B.geo().toNonIndexed();trunk.computeVertexNormals();return [trunk,folGeo(cards,0,oak?27:ty0(cards),0)];}
// Real-texture trees: Poly Haven CC0 fir twig + leaf photos, cards laid out like real branching (rendering only)
function treeTint(kind,R,shade,snow){ // linear multipliers on the photo texture; biome decides the palette
  const th=G.map&&G.map.theme,dry=th!=='green'&&th!=='snow',j=.9+R()*.2;let r,g,b;
  if(kind==='needle'){r=1.35;g=1.65;b=1.1;if(dry){r=1.55;g=1.65;b=1.2;}}
  else if(kind==='oak'){r=1.05;g=1.6;b=.7;if(dry){r=1.3;g=1.5;b=.8;}}
  else{r=1.35;g=1.55;b=.7;if(dry){r=1.5;g=1.5;b=.85;}} // acacia / olive: dusty, olive-gold
  const k=shade*j,c=new THREE.Color(r*k*(.92+R()*.16),g*k,b*k*(.9+R()*.2));
  if(snow&&kind==='needle')c.lerp(new THREE.Color(.8,.86,.9),.35+R()*.25);return c;}
function conifer(v,snow,lo){if(!folReal('needle'))return conifer_old(v,snow,lo);FOLREAL=true;
  const R=mulberry(v*17+3),B=Bld(),tall=v?1.1:1;B.cyl(.45,1.4,14,6,0,7,0,'#43362a');const trunk=B.geo().toNonIndexed();trunk.computeVertexNormals();
  const cards=[],NW=lo?9:17,per=lo?4:7,H=37*tall;
  for(let k=0;k<NW;k++){const t=k/(NW-1),y=6+Math.pow(t,.92)*(H-6),rad=(13.5*Math.pow(1-t,.8)+2.2)*(.9+R()*.2)*(v?.82:1),ph=R()*6.28,sh=.55+.5*t+.1*R();
    for(let q=0;q<per;q++){const yaw=ph+q/per*6.283+(R()-.5)*.6,l=rad*(1.0+R()*.3),pit=-.55+t*.8+(R()-.5)*.25,c=treeTint('needle',R,sh,snow);
      cards.push([0,y,0,yaw,pit,l*.95,l,0,l*.16*(1-t*.6),c.r,c.g,c.b]);}}
  for(let q=0;q<4;q++){const c=treeTint('needle',R,1.0,snow);cards.push([0,H-4,0,q*1.57,1.15,5.5,10,0,0,c.r,c.g,c.b]);}
  return [trunk,folGeo(cards,0,20,0)];}
function broadleaf(kind,v,lo){if(!folReal('leaf'))return broadleaf_old(kind,v,lo);FOLREAL=true;
  const R=mulberry(v*53+11),B=Bld(),bark='#5b4a3a',oak=kind==='oak',cards=[],cl=(sh,k)=>treeTint(oak?'oak':'acacia',R,sh,false);
  if(oak){B.cyl(.9,2.1,18,7,0,9,0,bark);const nb=4;for(let b=0;b<nb;b++){const a=b/nb*6.28+R(),L=9+R()*4,lean=.65;B.cyl(.45,.9,L,5,Math.cos(a)*Math.sin(lean)*L/2,17+Math.cos(lean)*L/2,Math.sin(a)*Math.sin(lean)*L/2,bark,Math.sin(a)*lean,0,-Math.cos(a)*lean);}
    const N=lo?30:64;for(let i=0;i<N;i++){const a=R()*6.28,u=Math.pow(R(),.6),e=R()*1.4,rr=u*14,y=26+Math.sin(e)*u*9-(1-u)*2-3,x=Math.cos(a)*rr*Math.cos(e*.6),z=Math.sin(a)*rr*Math.cos(e*.6),
        sh=.5+.55*Math.min(1,Math.max(0,(y-18)/16))*(.6+.4*u),c=cl(sh),w=11+R()*5;
      cards.push([x,y,z,R()*6.28,(R()-.5)*1.5,w,w*1.05,1,w*.12,c.r,c.g,c.b]);}}
  else{B.cyl(.8,1.7,16,6,0,8,0,bark);const nb=3+(R()*2|0),tops=[];for(let b=0;b<nb;b++){const a=b/nb*6.28+R()*.6,lean=.55+R()*.25,L=10+R()*6;B.cyl(.4,.75,L,5,Math.cos(a)*Math.sin(lean)*L/2,16+Math.cos(lean)*L/2,Math.sin(a)*Math.sin(lean)*L/2,bark,Math.sin(a)*lean,0,-Math.cos(a)*lean);tops.push([Math.cos(a)*Math.sin(lean)*L,16+Math.cos(lean)*L,Math.sin(a)*Math.sin(lean)*L]);}
    for(const [tx,ty,tz] of tops)for(let q=0;q<(lo?8:16);q++){const a=R()*6.28,d=q?Math.sqrt(R())*9:0,sh=.65+.35*(1-d/9)*R()+.15,c=cl(sh),w=10+R()*4;cards.push([tx+Math.cos(a)*d,ty+.5+R()*2.4-d*.12,tz+Math.sin(a)*d,R()*6.28,(R()-.5)*.5,w,w,1,w*.08,c.r,c.g,c.b]);}}
  const trunk=B.geo().toNonIndexed();trunk.computeVertexNormals();return [trunk,folGeo(cards,0,oak?27:ty0(cards),0)];}
function ty0(c){let s=0;c.forEach(k=>s+=k[1]);return s/c.length-3;}
function modelTrees(){if(!MODELS.ready||!G.treePos)return false;const keys=['tree1','tree2','tree3','tree4'].filter(k=>MODELS.proto[k]);if(!keys.length)return false;
  const slopeAt=(x,y)=>Math.hypot(groundH(x+6,y)-groundH(x-6,y),groundH(x,y+6)-groundH(x,y-6))/12;
  const per=keys.map(()=>[]),con=[[],[]];G.treePos.forEach((t,i)=>{if(slopeAt(t[0],t[1])>.35)return;if((G.sceneryPos||[]).some(([sx,sy])=>Math.hypot(t[0]-sx,t[1]-sy)<75))return;const h=Math.sin(t[0]*.004)*Math.cos(t[1]*.005);if(G.map.theme==='snow'||(h>.2&&((i*7)%10)<3))con[i%2].push(t);else per[i%keys.length].push(t);});
  mats();{const lo=gfxLow(),snow=G.map.theme==='snow',tkm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});[0,1].forEach(v=>{if(!con[v].length)return;const [tr,fo]=conifer(v,snow,lo);
    folPlace(con[v],[tr,fo],[tkm,folMat('needle')],new THREE.ConeGeometry(10,32,6).translate(0,22,0),0,.95,.95+(v?.08:0),snow);});}
  {const all=[].concat(...per).filter((t,i)=>(i*37)%10<6&&!(G.sceneryPos||[]).some(([sx,sy])=>Math.hypot(t[0]-sx,t[1]-sy)<75));const VAR=3,lists=[[],[],[]],palms=[];all.forEach((t,i)=>{const nearW=Math.abs(G.map.depth(t[0],t[1]))<G.map.hw(t[0])+420;if((nearW&&i%3!==0)||i%7===0)palms.push(t);else lists[i%VAR].push(t);});
   if(palms.length){const R=mulberry(77),B=Bld(),bark='#7a6448',lo2=gfxLow();let px=0,py=0,pz=0;for(let k=0;k<8;k++){const ny=py+4.2,nx=px+k*.28;B.cyl(1.05-k*.06,1.2-k*.06,4.4,6,(px+nx)/2,(py+ny)/2,0,k%2?bark:'#6b563c',0,0,-.07*k);px=nx;py=ny;}
     if(folReal('needle')){FOLREAL=true;const cards=[],NF=lo2?8:14;for(let f=0;f<NF;f++){const a=f/NF*6.283+R()*.35,sh=.75+R()*.3;let sx=px,sy=py,sz=0;
        for(let q=0;q<2;q++){const l=q?10:11,pit=q?-.1-R()*.3:.55+R()*.2,c=treeTint('acacia',R,sh*1.25,false);cards.push([sx,sy,sz,a,pit,13,l,0,q?3:0,c.r,c.g,c.b]);sx+=Math.cos(pit)*Math.cos(a)*l;sy+=Math.sin(pit)*l-(q?3:0);sz+=Math.cos(pit)*Math.sin(a)*l;}}
       B.sph(1.6,px,py-.5,0,'#5d4a30');const tg=B.geo().toNonIndexed();tg.computeVertexNormals();
       folPlace(palms,[tg,folGeo(cards,px,py+2,0)],[new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}),folMat('needle')],null,-.5,.95,1,false);}
     else{
     for(let f=0;f<12;f++){const a=f/12*6.283+R()*.3,len=14+R()*5;for(let q=0;q<5;q++){const t=(q+.5)/5,d=t*len,droop=-Math.pow(t,1.7)*10+2.5;const g=new THREE.ConeGeometry(4.2*(1-t*.55),len/5+2,4);g.rotateZ(Math.PI/2);g.scale(1,.3,1);g.rotateY(-a);const c=new THREE.Color().setHSL(.22+R()*.04,.42,.2+t*.05);parts_add(B,g,px+Math.cos(a)*d,py+droop,Math.sin(a)*d,c);}}
     B.sph(1.6,px,py-.5,0,'#5d4a30');
     const g=B.geo().toNonIndexed();g.computeVertexNormals();smoothNorm(g);const tm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide});weather(tm,.3);const im=new THREE.InstancedMesh(g,tm,palms.length);
     palms.forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y)-.5,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s*.95,s*(.9+((i*7)%5)*.06),s*.95));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.receiveShadow=true;WORLD.add(im);}}
   {const lo=gfxLow(),tkm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});for(let v=0;v<VAR;v++){if(!lists[v].length)continue;const oak=v===2,[tr,fo]=broadleaf(oak?'oak':'acacia',v,lo);
    folPlace(lists[v],[tr,fo],[tkm,folMat('leaf')],oak?new THREE.IcosahedronGeometry(13,0).scale(1,.7,1).translate(0,27,0):new THREE.IcosahedronGeometry(12,0).scale(1,.32,1).translate(0,20,0),-.5,1.05,1.05);}}
   return true;}
  keys.forEach((k,ki)=>{const root=MODELS.proto[k].scene;const n=normScale(root,'y',40);root.updateMatrixWorld(true);const base=new THREE.Matrix4().compose(new THREE.Vector3(-n.cx*n.s,-n.my*n.s,-n.cz*n.s),new THREE.Quaternion(),new THREE.Vector3(n.s,n.s,n.s));
    root.traverse(mm=>{if(!mm.isMesh)return;const tm=mm.material.clone();weather(tm,.5);if(tm.color){tm.color.offsetHSL(.02,-.2,.03);}tm.roughness=1;tm.metalness=0;const im=new THREE.InstancedMesh(mm.geometry,tm,per[ki].length);const local=new THREE.Matrix4().multiplyMatrices(base,mm.matrixWorld);
      per[ki].forEach(([x,y,s,r],i)=>{const M=new THREE.Matrix4().compose(new THREE.Vector3(x,groundH(x,y),y),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s,s*(.85+((i*7)%5)*.07),s));M.multiply(local);im.setMatrixAt(i,M);});
      im.castShadow=true;im.receiveShadow=true;WORLD.add(im);});});return true;}
function scenery(){G.sceneryPos=[];if(!MODELS.ready||!G.map)return;mats();const R=mulberry((G.seed||1)*7+41),M=G.map,rm=G.roadMask;let placed=0;
  const ok=(x,y)=>{if(x<120||y<120||x>MAPW-120||y>MAPH-120)return false;if(Math.abs(M.depth(x,y))<M.hw(x)+120)return false;if(BASES.some(([bx,by])=>Math.hypot(x-bx,y-by)<520))return false;if(M.fields.some(f=>Math.hypot(f.x-x,f.y-y)<f.r+120))return false;if(M.oil.some(o=>Math.hypot(o.x-x,o.y-y)<140))return false;if(rm&&rm.f&&rm.f[(y/rm.C|0)*rm.w+(x/rm.C|0)]>.05)return false;
    const sl=Math.hypot(groundH(x+10,y)-groundH(x-10,y),groundH(x,y+10)-groundH(x,y-10))/20;return sl<.15;};
  {const HB=Bld();const st='#3a3a36';for(const [rx,rz] of [[0,0],[Math.PI/2,0],[0,Math.PI/2]]){HB.box(2.6,26,2.6,0,0,0,st,rx+.5,0,rz);}const hg=HB.geo();const hm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.55});weather(hm,.9);const HP=[];
   for(let k=0;k<60&&HP.length<34;k++){const cx=R()*MAPW,cy=R()*MAPH;if(!ok(cx,cy))continue;for(let j=0;j<3+(R()*3|0);j++){const x=cx+(R()-.5)*90,y=cy+(R()-.5)*40;if(ok(x,y))HP.push([x,y,R()*6.28]);}}
   const im=new THREE.InstancedMesh(hg,hm,HP.length);HP.forEach(([x,y,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y)+6,y),TMPQ.setFromEuler(new THREE.Euler(0,r,0)),new THREE.Vector3(1.1,1.1,1.1));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.receiveShadow=true;WORLD.add(im);G.hedgePos=HP;
   G.craters=[];for(let k=0;k<45;k++){const x=R()*MAPW,y=R()*MAPH;if(ok(x,y))G.craters.push([x,y,8+R()*10]);}}
  for(const c of (G.ruins||[])){const g=new THREE.Group();g.position.set(c.x,groundH(c.x,c.y),c.y);g.rotation.y=c.rot;WORLD.add(g);c.obj=g;g.visible=!c.dead;(G.sceneryPos=G.sceneryPos||[]).push([c.x,c.y,0]);
    const B=Bld(),w='#9b8a6e',w2='#8a7a60';B.box(46,10,3,0,5,-15,w);B.box(3,13,30,-23,6.5,0,w);B.box(3,8,14,23,4,-8,w2);B.box(20,6,3,12,3,15,w2,0,0,.15);B.box(12,3,3,-14,1.5,15,w2);
    for(const [x,z] of [[-12,-15],[8,-15]])B.box(5,4,3.4,x,5,-15,'#2a2620');B.box(14,3,10,6,1.5,-2,'#7f735d',.3,.4,0);B.box(8,2,6,-10,1,6,'#6e6352',0,.8,.2);B.box(48,.6,32,0,.3,0,'#7a6e58');
    const m=mesh(B.geo());m.castShadow=m.receiveShadow=true;g.add(m);propObj('barrel',-16,-8,0,g);propObj('crate',16,6,.4,g);}
  for(let tries=0;tries<400&&placed<9;tries++){const x=R()*MAPW,y=R()*MAPH;if(!ok(x,y))continue;placed++;if(placed%3===0)continue;const g=new THREE.Group();g.position.set(x,groundH(x,y),y);g.rotation.y=R()*6.28;g.userData.scenery=1;WORLD.add(g);const kind=placed%3;(G.sceneryPos=G.sceneryPos||[]).push([x,y,kind]);
    if(kind===0){const B=Bld();const w='#9b8a6e';B.box(60,9,4,0,4.5,-20,w);B.box(4,14,40,-30,7,0,w);B.box(22,6,4,18,3,20,w,0,0,.2);B.box(14,3,10,10,1.5,-6,'#7f735d',.3,.4,0);B.box(8,2,6,-12,1,8,'#6e6352',0,.8,.2);const m=mesh(B.geo());m.castShadow=m.receiveShadow=true;g.add(m);propObj('barrel',-20,-10,0,g);propObj('crate',22,-8,.4,g);}
    else if(kind===1){for(let i=-2;i<=2;i++)propObj('sandbag',i*14,0,(i%2)*.15,g);propObj('sandbag',-34,10,1.2,g);propObj('sandbag',34,10,-1.2,g);propObj('crate',0,14,.3,g);propObj('barrel',10,16,0,g);}
    else{propObj(R()<.5?'container':'containerG',0,0,.1,g);propObj('barrel',22,10,0,g);propObj('barrel',26,4,0,g);propObj('pallet',-20,8,.5,g);const B=Bld();B.box(18,7,10,0,3.5,0,'#2b2723',0,0,.1);B.box(10,5,9,-2,8,0,'#221f1c');const m=mesh(B.geo());m.position.set(-8,0,-26);m.rotation.y=.7;m.castShadow=true;g.add(m);{const v=new THREE.Vector3(-8,0,-26).applyAxisAngle(new THREE.Vector3(0,1,0),g.rotation.y);const sp=G.sceneryPos[G.sceneryPos.length-1];sp[3]=x+v.x;sp[4]=y+v.z;}scorch(x-8,y-26,14);}}}
loadModels();


// ---- jet engine exhaust (Abdullah 2026-11-05: the flat yellow wedge behind the jets) ----
// nozzle finder: rays from behind the model (+x direction) over a y/z grid; nozzles = the rearmost THICK parts (hit on
// neighbouring rows and columns, so thin tail fins and stabilisers don't count), clustered left/right of the centreline
function jetNozzles(o,yaw,bb){const L=bb.max.x-bb.min.x,W=bb.max.z-bb.min.z,H=bb.max.y-bb.min.y,RC=new THREE.Raycaster(),dir=new THREE.Vector3(1,0,0),NZ=25,NY=11,cells=[];
  for(let j=0;j<NY;j++){const y=bb.min.y+H*(.12+.5*j/(NY-1));for(let i=0;i<NZ;i++){const z=(bb.min.z+bb.max.z)/2+W*(-.22+.44*i/(NZ-1));RC.set(new THREE.Vector3(bb.min.x-30,y,z),dir);RC.far=L+60;
    let hx=null;for(const q of RC.intersectObject(yaw,true)){if(q.object.material&&q.object.material.visible===false)continue;if(!q.object.isMesh)continue;hx=q.point.x;break;}cells.push({i,j,y,z,x:hx});}}
  const at=(i,j)=>i>=0&&j>=0&&i<NZ&&j<NY?cells[j*NZ+i]:null,tol=L*.025;
  const thick=cells.filter(c=>{if(c.x===null)return false;let n=0;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const d=at(c.i+di,c.j+dj);if(d&&d.x!==null&&Math.abs(d.x-c.x)<tol)n++;}return n>=3;});
  if(!thick.length)return null;const mx=Math.min(...thick.map(c=>c.x)),rear=thick.filter(c=>c.x<=mx+L*.03);
  const cz=(bb.min.z+bb.max.z)/2,grp=[rear.filter(c=>c.z<cz-W*.015),rear.filter(c=>c.z>cz+W*.015)],mid=rear.filter(c=>Math.abs(c.z-cz)<=W*.015);
  const mk=g=>{const y=g.reduce((a,c)=>a+c.y,0)/g.length,z=g.reduce((a,c)=>a+c.z,0)/g.length,x=Math.min(...g.map(c=>c.x)),sp=Math.max(Math.max(...g.map(c=>c.z))-Math.min(...g.map(c=>c.z)),Math.max(...g.map(c=>c.y))-Math.min(...g.map(c=>c.y)));
    const p=o.worldToLocal(new THREE.Vector3(x,y,z));return {x:p.x+.2,y:p.y,z:p.z,r:Math.max(W*.018,Math.min(W*.05,sp*.5+W*.012))};};
  // two separate engines only if both sides have nozzle cells and the middle doesn't dominate
  if(grp[0].length&&grp[1].length&&mid.length<Math.min(grp[0].length,grp[1].length)){const a=mk(grp[0]),b=mk(grp[1]),r=(a.r+b.r)/2,y=(a.y+b.y)/2,z=(Math.abs(a.z)+Math.abs(b.z))/2,x=Math.max(a.x,b.x);return [{x,y,z:-z,r},{x,y,z,r}];}
  const one=mk(rear);one.z=0;return [one];}
// unit plume (nozzle radius 1, pointing -x): crossed soft quads textured with a plume strip (white-hot core, shock
// diamonds, orange fade, soft edges) + a round glow filling the nozzle exit. Additive, one shared material + texture.
function jetPlumeGeo(){if(jetPlumeGeo.g)return jetPlumeGeo.g;const P=[],U=[],I=[];
  const quad=(a,b,c,d,ua,ub,uc,ud)=>{const n=P.length/3;P.push(...a,...b,...c,...d);U.push(...ua,...ub,...uc,...ud);I.push(n,n+1,n+2,n,n+2,n+3);};
  const hw=2.3,x0=.25,x1=-11;
  quad([x0,-hw,0],[x1,-hw,0],[x1,hw,0],[x0,hw,0],[0,.5],[1,.5],[1,1],[0,1]);   // plume, vertical plane
  quad([x0,0,-hw],[x1,0,-hw],[x1,0,hw],[x0,0,hw],[0,.5],[1,.5],[1,1],[0,1]);   // plume, horizontal plane
  quad([-.06,-1.3,-1.3],[-.06,-1.3,1.3],[-.06,1.3,1.3],[-.06,1.3,-1.3],[0,0],[.5,0],[.5,.5],[0,.5]); // nozzle glow
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeBoundingSphere();return jetPlumeGeo.g=g;}
// texture atlas 128x128: top half = plume strip (u: nozzle -> tail), bottom-left = round nozzle glow
function jetPlumeMat(){if(jetPlumeMat.m)return jetPlumeMat.m;const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d'),im=x.createImageData(128,128),D=im.data;
  for(let py=0;py<64;py++)for(let px=0;px<128;px++){const t=px/127,s=Math.abs(py-31.5)/31.5,w=.22+.5*t,core=Math.exp(-Math.pow(s/w,2)*2.6),inner=Math.exp(-Math.pow(s/(w*.38),2)*2.6);
    const dia=Math.pow(Math.max(0,Math.cos(t*Math.PI*9)),8)*(t<.62?1:0)*inner,fade=Math.pow(1-t,1.5)*Math.min(1,t*14+.25);
    const a=Math.min(1,(core*.6+inner*.75+dia)*fade),k=Math.min(1,t*1.6),G=.9-.42*k+.08*dia,B=.72-.62*k+.2*dia,o=(py*128+px)*4;
    D[o]=255;D[o+1]=255*Math.min(1,G);D[o+2]=255*Math.max(0,Math.min(1,B));D[o+3]=255*a;}
  for(let py=64;py<128;py++)for(let px=0;px<64;px++){const r=Math.hypot(px-31.5,py-95.5)/31.5,a=Math.max(0,1-r),v=a*a*(3-2*a),o=(py*128+px)*4;
    D[o]=255;D[o+1]=255*(.62+.3*v);D[o+2]=255*(.25+.45*v*v);D[o+3]=255*Math.min(1,v*1.15);}
  x.putImageData(im,0,0);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
  return jetPlumeMat.m=new THREE.MeshBasicMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false,toneMapped:false});}

/* ================= FACTION LOOKS (Step 1): national markings + add-on kits =================
   Every aircraft, ship and combat vehicle gets ONE extra merged mesh (one draw call) carrying its nation's flag/roundel
   decals and a small kit (flags on poles, sandbags, ERA blocks, cope cage, red stars, antennas). The mesh geometry is
   built once per model+nation and shared; textures come from one shared atlas. On Low graphics (phones) ground vehicles
   skip the kit entirely; aircraft/ships keep only the cheap decals. Visuals only - nothing here touches the simulation. */
const KFAC=['US','TR','IL','EU','UA','RU','IR','SA','AE','PK','IN','CN','KP','KR','EG','CU','RS','DW'];
const KIT={tex:null,mat:null,geo:{},probe:{}},KCW=96,KCH=64,KCOLS=8,KROWS=10;
// extra atlas cells: 48-57 Persian digits (p:0..9), 58-67 Arabic-Indic digits (a:0..9), 68+ painted stencils (s:name)
const KSTEN={shahed:68,qasef:69,ababil:70,kp:71,ru:72};
function kitCellIdx(n){if(n==='star')return 36;if(n==='white')return 37;const t=n[0],v=n.slice(2);if(t==='f')return KFAC.indexOf(v);if(t==='r')return 18+KFAC.indexOf(v);if(t==='p')return 48+(+v);if(t==='a')return 58+(+v);if(t==='s')return KSTEN[v]||37;return 38+(+v);}
function kitUV(n,x0=0,y0=0,x1=1,y1=1){const i=kitCellIdx(n),cx=i%KCOLS,cy=(i/KCOLS)|0,W=KCOLS*KCW,H=KROWS*KCH;
  return {u0:(cx*KCW+x0*KCW)/W,u1:(cx*KCW+x1*KCW)/W,vt:1-(cy*KCH+y0*KCH)/H,vb:1-(cy*KCH+y1*KCH)/H};}
function kitMat(){if(KIT.mat)return KIT.mat;const c=document.createElement('canvas');c.width=KCOLS*KCW;c.height=KROWS*KCH;const x=c.getContext('2d');
  KFAC.forEach((f,i)=>{let img=null;try{img=flagTex(f).image;}catch(e){}const cx=(i%KCOLS)*KCW,cy=((i/KCOLS)|0)*KCH;
    if(img){x.drawImage(img,cx+4,cy+4,KCW-8,KCH-8);x.strokeStyle='rgba(20,20,20,.6)';x.lineWidth=2;x.strokeRect(cx+4,cy+4,KCW-8,KCH-8);}
    const j=18+i,rx=(j%KCOLS)*KCW,ry=((j/KCOLS)|0)*KCH;x.save();x.beginPath();x.arc(rx+KCW/2,ry+KCH/2,28,0,7);x.clip();if(img)x.drawImage(img,rx+KCW/2-46,ry+KCH/2-28,92,56);x.restore();
    x.strokeStyle='rgba(235,235,225,.9)';x.lineWidth=3;x.beginPath();x.arc(rx+KCW/2,ry+KCH/2,28,0,7);x.stroke();});
  {const sx=(36%KCOLS)*KCW+KCW/2,sy=((36/KCOLS)|0)*KCH+KCH/2;x.fillStyle='#c8102e';x.strokeStyle='#e8e4da';x.lineWidth=2;x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?12:29;x.lineTo(sx+Math.cos(a)*r,sy+Math.sin(a)*r*1.0);}x.closePath();x.fill();x.stroke();}
  {const wx=(37%KCOLS)*KCW,wy=((37/KCOLS)|0)*KCH;x.fillStyle='#fff';x.fillRect(wx,wy,KCW,KCH);}
  x.font='bold 54px Arial, Helvetica, sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';
  for(let d=0;d<10;d++){const i=38+d,dx=(i%KCOLS)*KCW+KCW/2,dy=((i/KCOLS)|0)*KCH+KCH/2+2;x.lineWidth=5;x.strokeStyle='rgba(18,18,18,.75)';x.strokeText(String(d),dx,dy);x.fillStyle='#f1efe6';x.fillText(String(d),dx,dy);}
  // Persian and Arabic-Indic digits (Iranian vehicles and drones, the militias' drones), painted off-white
  const cellXY=i=>[(i%KCOLS)*KCW+KCW/2,((i/KCOLS)|0)*KCH+KCH/2+2];
  for(let d=0;d<10;d++)for(const [base,str] of [[48,'۰۱۲۳۴۵۶۷۸۹'],[58,'٠١٢٣٤٥٦٧٨٩']]){const [dx,dy]=cellXY(base+d);x.font='bold 50px Tahoma, "Noto Sans Arabic", Arial, sans-serif';x.lineWidth=5;x.strokeStyle='rgba(18,18,18,.75)';x.strokeText(str[d],dx,dy);x.fillStyle='#ece8dc';x.fillText(str[d],dx,dy);}
  // stencils: drone names in dark spray paint, a generic North Korean slogan panel ("For the Fatherland"), a Russian unit letter
  const sten=(i,txt,font,fill,bg)=>{const [dx,dy]=cellXY(i);if(bg){x.fillStyle=bg;x.fillRect(dx-KCW/2+3,dy-KCH/2+8,KCW-6,KCH-18);}x.font=font;x.fillStyle=fill;x.fillText(txt,dx,dy-2,KCW-10);};
  sten(68,'شاهد','bold 34px Tahoma, "Noto Sans Arabic", sans-serif','#262624');sten(69,'قاصف','bold 34px Tahoma, "Noto Sans Arabic", sans-serif','#262624');sten(70,'أبابيل','bold 30px Tahoma, "Noto Sans Arabic", sans-serif','#262624');
  sten(71,'조국을 위하여','bold 17px "Noto Sans KR", "Malgun Gothic", sans-serif','#e8e2d0','#6e2a24');sten(72,'Б-21','bold 40px Arial, sans-serif','#ecebe4');
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;KIT.tex=t;
  const m=new THREE.MeshStandardMaterial({map:t,vertexColors:true,alphaTest:.5,roughness:.75,metalness:.1});if(typeof weather==='function')weather(m,.8,0);KIT.mat=m;return m;}
function kitBuilder(){const P=[],N=[],C=[],U=[],AUD=[],Wc=kitUV('white',.4,.4,.6,.6),wu=(Wc.u0+Wc.u1)/2,wv=(Wc.vt+Wc.vb)/2,E=new THREE.Euler(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),S=new THREE.Vector3(1,1,1);
  const push=(g,M,col,rect)=>{g=g.index?g.toNonIndexed():g;g.applyMatrix4(M);const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    for(let i=0;i<p.count;i++){P.push(p.getX(i),p.getY(i),p.getZ(i));N.push(n.getX(i),n.getY(i),n.getZ(i));C.push(col.r,col.g,col.b);
      if(rect)U.push(rect.u0+(rect.u1-rect.u0)*uv.getX(i),rect.vb+(rect.vt-rect.vb)*uv.getY(i));else U.push(wu,wv);}g.dispose();};
  const M=(x,y,z,rx,ry,rz)=>new THREE.Matrix4().compose(V.set(x,y,z),Q.setFromEuler(E.set(rx||0,ry||0,rz||0)),S);
  const api={box:(w,h,d,x,y,z,c,rx,ry,rz)=>(push(new THREE.BoxGeometry(w,h,d),M(x,y,z,rx,ry,rz),lin(c)),api),
    cyl:(rt,rb,h,sg,x,y,z,c,rx,ry,rz)=>(push(new THREE.CylinderGeometry(rt,rb,h,sg),M(x,y,z,rx,ry,rz),lin(c)),api),
    tor:(r,t,x,y,z,c,rx,ry,rz)=>(push(new THREE.TorusGeometry(r,t,5,12),M(x,y,z,rx,ry,rz),lin(c)),api),
    // textured decal, face '+z' | '-z' | '+y' (a tiny offset keeps it clear of the surface)
    // surface decal from kitDec(): a quad oriented to the measured surface normal (and recorded for orch/decalcheck.mjs)
    quadN:(r)=>{const g=new THREE.PlaneGeometry(r.w,r.h),uv=r.sub?kitUV(r.cell,r.sub[0],r.sub[1],r.sub[2],r.sub[3]):kitUV(r.cell),nn=new THREE.Vector3(...r.n).normalize(),rt=new THREE.Vector3(...r.up).cross(nn).normalize(),up=nn.clone().cross(rt);
      push(g,new THREE.Matrix4().makeBasis(rt,up,nn).setPosition(r.c[0],r.c[1],r.c[2]),new THREE.Color(1,1,1),uv);AUD.push(r);return api;},
    aud:AUD,
    quad:(w,h,x,y,z,face,cell,sub)=>{AUD.push({kind:'free',w,h,cell,c:[x,y,z]});const g=new THREE.PlaneGeometry(w,h);const r=sub?kitUV(cell,sub[0],sub[1],sub[2],sub[3]):kitUV(cell);const white=new THREE.Color(1,1,1);
      if(face==='-z')push(g,M(x,y,z,0,Math.PI,0),white,r);else if(face==='+y')push(g,M(x,y,z,-Math.PI/2,0,0),white,r);else push(g,M(x,y,z,0,0,0),white,r);return api;},
    // ellipsoid (sandbags, bags, heads, helmets), bevelled box (jerrycans, ERA tiles, sights - never a hard cube),
    // a round bar between two points (slat armour, cage bars, rails) and a lumpy draped net
    ell:(rx,ry,rz,x,y,z,c,ax,ay,az)=>{const g=new THREE.SphereGeometry(1,8,6);g.scale(rx,ry,rz);push(g,M(x,y,z,ax,ay,az),lin(c));return api;},
    rbox:(w,h,d,x,y,z,c,ax,ay,az)=>{const b=Math.min(w,h,d)*.2,sh=new THREE.Shape();sh.moveTo(-w/2+b,-h/2+b);sh.lineTo(w/2-b,-h/2+b);sh.lineTo(w/2-b,h/2-b);sh.lineTo(-w/2+b,h/2-b);sh.closePath();
      const g=new THREE.ExtrudeGeometry(sh,{depth:Math.max(.01,d-2*b),bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:1,curveSegments:1});g.translate(0,0,-(d-2*b)/2);push(g,M(x,y,z,ax,ay,az),lin(c));return api;},
    bar:(x1,y1,z1,x2,y2,z2,r,c,sg)=>{const a=new THREE.Vector3(x1,y1,z1),b2=new THREE.Vector3(x2,y2,z2),d=b2.clone().sub(a),len=d.length();if(len<1e-3)return api;
      const g=new THREE.CylinderGeometry(r,r,len,sg||5);const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());push(g,new THREE.Matrix4().compose(a.add(b2).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)),lin(c));return api;},
    net:(w,h,d,x,y,z,c,seed)=>{const g=new THREE.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI/2),p=g.attributes.position;
      for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),n=Math.sin(px*7.1+seed)*Math.cos(pz*6.3+seed*1.7)*.5+Math.sin((px+pz)*13.7+seed*3.1)*.25;p.setXYZ(i,px*(1+n*.12)*w/2,Math.max(0,py*(1+n*.6))*h,pz*(1+n*.1)*d/2);}
      g.computeVertexNormals();push(g,M(x,y,z),lin(c));return api;},
    geo:()=>{if(!P.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.computeBoundingSphere();g.userData.aud=AUD;return g;}};
  return api;}
// ray probes against a model (in the unit's x-forward frame) so decals sit on the real surface
// run fn with the unit posed exactly as when its model's probe was measured (the probe is cached per model, and the
// next unit of that model - e.g. another nation's - is somewhere else on the map), then put it back
function kitPose(P,o,fn){const p0=o.position.clone(),q0=o.quaternion.clone(),s0=o.scale.clone();o.position.copy(P.op);o.quaternion.copy(P.oq);o.scale.copy(P.os);o.updateMatrixWorld(true);
  try{return fn();}finally{o.position.copy(p0);o.quaternion.copy(q0);o.scale.copy(s0);o.updateMatrixWorld(true);}}
function kitProbe(o,yaw,m,key){let P=KIT.probe[key];if(P){P.yaw=yaw;return P;}const r0=m.rotation.y;m.rotation.y=0;o.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(yaw);m.rotation.y=r0;o.updateMatrixWorld(true);if(!isFinite(bb.min.x)||bb.max.x-bb.min.x<5)return KIT.probe[key]=null;
  m.rotation.y=0;o.updateMatrixWorld(true);const RC=new THREE.Raycaster(),L=bb.max.x-bb.min.x,Wd=bb.max.z-bb.min.z,H=bb.max.y-bb.min.y;
  const hit=(org,dir)=>{RC.set(org,dir);RC.far=2000;const h=RC.intersectObject(P.yaw,true);for(const q of h){if(q.object.material&&q.object.material.visible===false)continue;return q.point.clone();}return null;};
  P={yaw,bb,L,W:Wd,H,cx:(bb.min.x+bb.max.x)/2,op:o.position.clone(),oq:o.quaternion.clone(),os:o.scale.clone(),hit,memo:new Map(),
    down:(x,z)=>kitGrid(P).down(x,z),side:(x,y,sg)=>kitGrid(P).side(x,y,sg),up:(x,z)=>kitGrid(P).up(x,z)};
  m.rotation.y=r0;o.updateMatrixWorld(true);return KIT.probe[key]=P;}

// ---- surface-fitted decals (Abdullah 2026-11-04: markings hung over wings, ship numbers were bigger than the ships).
// kitDec() measures the real surface under a decal with ray probes: the local flat panel around its centre (the decal may
// use only a fraction of it), then 9 points (corners, edge middles, centre); it shrinks the decal until all 9 lie on the
// surface within a small tolerance, fits a plane through them (decal follows the surface normal, sits just above it) and
// gives up (returns null: nothing is drawn) when it cannot fit. Probe results are memoised per model, so all 18 nations
// share the ray work. Every placed decal is recorded in the geometry's userData.aud for orch/decalcheck.mjs.
// Fast axis-aligned surface probes: all the model's triangles, in the posed frame, binned once into a 2D grid per probe
// direction (side = rays along z, down/up = rays along y). Replaces ray casting (2 ms per ray on a 16k-triangle warship).
function kitGrid(P){if(P.grid)return P.grid;const root=P.yaw||P.mesh,T=[],w=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  root.traverse(q=>{if(!q.isMesh||q.isInstancedMesh||q.isSkinnedMesh||(q.material&&q.material.visible===false))return;const g=q.geometry,pa=g&&g.attributes.position;if(!pa)return;const ix=g.index,n=ix?ix.count:pa.count;
    for(let t=0;t+2<n;t+=3){for(let k=0;k<3;k++)w[k].fromBufferAttribute(pa,ix?ix.getX(t+k):t+k).applyMatrix4(q.matrixWorld);T.push(w[0].x,w[0].y,w[0].z,w[1].x,w[1].y,w[1].z,w[2].x,w[2].y,w[2].z);}});
  const nT=T.length/9,TB=new Float32Array(nT*6),mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(let t=0;t<nT;t++)for(let c=0;c<3;c++){const a=T[t*9+c],b=T[t*9+3+c],d=T[t*9+6+c];TB[t*6+c]=Math.min(a,b,d);TB[t*6+3+c]=Math.max(a,b,d);}for(let i=0;i<T.length;i++){const c=i%3;if(T[i]<mn[c])mn[c]=T[i];if(T[i]>mx[c])mx[c]=T[i];}
  const mk=(ia,ib)=>{const N=40,cells=new Array(N*N),sa=N/((mx[ia]-mn[ia])||1),sb=N/((mx[ib]-mn[ib])||1),cl=(v,lo,sc)=>Math.max(0,Math.min(N-1,Math.floor((v-lo)*sc)));
    for(let t=0;t<nT;t++){const o=t*9;let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;for(let k=0;k<3;k++){const a=T[o+k*3+ia],b=T[o+k*3+ib];if(a<a0)a0=a;if(a>a1)a1=a;if(b<b0)b0=b;if(b>b1)b1=b;}
      for(let i=cl(a0,mn[ia],sa);i<=cl(a1,mn[ia],sa);i++)for(let j=cl(b0,mn[ib],sb);j<=cl(b1,mn[ib],sb);j++){(cells[j*N+i]||(cells[j*N+i]=[])).push(t);}}
    return {N,cells,sa,sb,la:mn[ia],lb:mn[ib],ia,ib};};
  const gz=mk(0,1),gy=mk(0,2);
  // depth along axis ic at (a,b): the largest (mode 1) or smallest (mode -1) value over the triangles covering that point, or null
  const q=(G,a,b,ic,mode)=>{const i=Math.floor((a-G.la)*G.sa),j=Math.floor((b-G.lb)*G.sb);if(i<0||j<0||i>=G.N||j>=G.N)return null;const cell=G.cells[j*G.N+i];if(!cell)return null;let best=null;
    for(const t of cell){const o=t*9,Ax=T[o+G.ia],Ay=T[o+G.ib],Bx=T[o+3+G.ia],By=T[o+3+G.ib],Cx=T[o+6+G.ia],Cy=T[o+6+G.ib],D=(By-Cy)*(Ax-Cx)+(Cx-Bx)*(Ay-Cy);if(Math.abs(D)<1e-10)continue;
      const l1=((By-Cy)*(a-Cx)+(Cx-Bx)*(b-Cy))/D,l2=((Cy-Ay)*(a-Cx)+(Ax-Cx)*(b-Cy))/D,l3=1-l1-l2;if(l1<-1e-4||l2<-1e-4||l3<-1e-4)continue;
      const d=l1*T[o+ic]+l2*T[o+3+ic]+l3*T[o+6+ic];if(best===null||d*mode>best*mode)best=d;}return best;};
  return P.grid={T,TB,side:(x,y,sg)=>{const d=q(gz,x,y,2,sg);return d===null?null:new THREE.Vector3(x,y,d);},down:(x,z)=>{const d=q(gy,x,z,1,1);return d===null?null:new THREE.Vector3(x,d,z);},up:(x,z)=>{const d=q(gy,x,z,1,-1);return d===null?null:new THREE.Vector3(x,d,z);}};}
// (decalcheck) nearest double-sided hit of a ray against the same triangle soup the probes use, so the audit does not depend on how the unit is posed now
function kitHitTris(P,org,dir,len){const G=kitGrid(P),T=G.T,TB=G.TB;let best=null;const e=1e-9,x0=Math.min(org.x,org.x+dir.x*len)-.01,x1=Math.max(org.x,org.x+dir.x*len)+.01,y0=Math.min(org.y,org.y+dir.y*len)-.01,y1=Math.max(org.y,org.y+dir.y*len)+.01,z0=Math.min(org.z,org.z+dir.z*len)-.01,z1=Math.max(org.z,org.z+dir.z*len)+.01;
  for(let t=0,o=0;o<T.length;t++,o+=9){const b=t*6;if(TB[b]>x1||TB[b+3]<x0||TB[b+1]>y1||TB[b+4]<y0||TB[b+2]>z1||TB[b+5]<z0)continue;
    const e1x=T[o+3]-T[o],e1y=T[o+4]-T[o+1],e1z=T[o+5]-T[o+2],e2x=T[o+6]-T[o],e2y=T[o+7]-T[o+1],e2z=T[o+8]-T[o+2],
      px=dir.y*e2z-dir.z*e2y,py=dir.z*e2x-dir.x*e2z,pz=dir.x*e2y-dir.y*e2x,det=e1x*px+e1y*py+e1z*pz;if(Math.abs(det)<e)continue;const inv=1/det,tx=org.x-T[o],ty=org.y-T[o+1],tz=org.z-T[o+2],u=(tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)continue;
    const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x,v=(dir.x*qx+dir.y*qy+dir.z*qz)*inv;if(v<0||u+v>1)continue;const tt=(e2x*qx+e2y*qy+e2z*qz)*inv;if(tt>0&&tt<=len&&(best===null||tt<best))best=tt;}
  return best;}
function kitMeshProbe(mesh){mesh.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(mesh),RC=new THREE.Raycaster(),L=bb.max.x-bb.min.x,Wd=bb.max.z-bb.min.z,H=bb.max.y-bb.min.y,
  hit=(org,dir)=>{RC.set(org,dir);RC.far=2000;const h=RC.intersectObject(mesh,true);for(const q of h){if(q.object.material&&q.object.material.visible===false)continue;return q.point.clone();}return null;};
  const P={mesh,bb,L,W:Wd,H,cx:(bb.min.x+bb.max.x)/2,hit,memo:new Map()};P.down=(x,z)=>kitGrid(P).down(x,z);P.side=(x,y,sg)=>kitGrid(P).side(x,y,sg);P.up=(x,z)=>kitGrid(P).up(x,z);return P;}
function kitSurf(P,face,sg,a,b){const key=face+sg+'|'+Math.round(a*80)+'|'+Math.round(b*80),M=P.memo;if(M.has(key))return M.get(key);let d=null;
  if(face==='side'){const p=P.side(a,b,sg);if(p)d=Math.abs(p.z);}else if(face==='top'){const p=P.down(a,b);if(p)d=p.y;}else{const p=P.up(a,b);if(p)d=-p.y;}M.set(key,d);return d;}
// the flat panel around (a0,b0): how far the surface continues (no gap, no step) in +a,-a,+b,-b, up to cap
function kitPanel(P,face,sg,a0,b0,cap){const d0=kitSurf(P,face,sg,a0,b0);if(d0===null)return null;const st=Math.max(P.L*.008,.04,cap/7),dirs=[[1,0],[-1,0],[0,1],[0,-1]],e=[0,0,0,0];
  for(let i=0;i<4;i++){let pd=d0,t=st;for(;t<=cap;t+=st){const d=kitSurf(P,face,sg,a0+dirs[i][0]*t,b0+dirs[i][1]*t);if(d===null||Math.abs(d-pd)>st*1.2)break;pd=d;}e[i]=t-st;}
  return {e,pa:Math.min(e[0],e[1])*2,pb:Math.min(e[2],e[3])*2};}
// o: fa/fb = largest share of the panel along a (x) / b (y or z) the decal may cover (default .8), minS = smallest shrink kept, maxw/maxh = hard caps
function kitDec(P,face,sg,a0,b0,w0,h0,cell,sub,o){o=o||{};const fa=o.fa||.8,fb=o.fb||.8,eps=Math.max(.03,P.L*.0012);let w=w0,h=h0;
  if(!(w0>0&&h0>0))return null;if(o.maxw&&w>o.maxw){h*=o.maxw/w;w=o.maxw;}if(o.maxh&&h>o.maxh){w*=o.maxh/h;h=o.maxh;}const W1=w,H1=h;
  const pan=kitPanel(P,face,sg,a0,b0,Math.max(w,h)*1.3);if(!pan)return null;
  let s=Math.min(1,fa*pan.pa/W1,fb*pan.pb/H1);
  for(let it=0;it<6;it++){if(!(s>=(o.minS||.3)))return null;w=W1*s;h=H1*s;
    const pts=[[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]].map(([i,j])=>kitSurf(P,face,sg,a0+i*w/2,b0+j*h/2));const dC=kitSurf(P,face,sg,a0,b0);
    if(dC===null||pts.some(d=>d===null)){s*=.8;continue;}
    const [d00,d10,d01,d11]=pts,ga=((d10+d11)-(d00+d01))/(2*w),gb=((d01+d11)-(d00+d10))/(2*h),dm=(d00+d10+d01+d11)/4,tol=.03*Math.max(w,h)+.02;let over=0,res=0;
    [[-1,-1,d00],[1,-1,d10],[-1,1,d01],[1,1,d11],[0,-1,pts[4]],[0,1,pts[5]],[-1,0,pts[6]],[1,0,pts[7]],[0,0,dC]].forEach(([i,j,d])=>{const r=d-(dm+ga*i*w/2+gb*j*h/2);res=Math.max(res,Math.abs(r));over=Math.max(over,r);});
    if(res>tol||Math.hypot(ga,gb)>.3){s*=.8;continue;}
    const off=over+eps;let c,n,up;
    if(face==='side'){n=[-ga,-gb,sg];up=[0,1,0];c=[a0,b0,sg*dm];}else if(face==='top'){n=[-ga,1,-gb];up=[0,0,-1];c=[a0,dm,b0];}else{n=[-ga,-1,-gb];up=[0,0,-1];c=[a0,-dm,b0];}
    const nl=Math.hypot(n[0],n[1],n[2]);c=c.map((v,i)=>v+n[i]/nl*off);
    // verify with rays straight down the decal's own normal (what the eye sees): no misses, small float spread, nothing buried; then seat it at eps above the highest point
    {const nn=new THREE.Vector3(n[0],n[1],n[2]).normalize(),rt=new THREE.Vector3(up[0],up[1],up[2]).cross(nn).normalize(),uv=nn.clone().cross(rt),cv=new THREE.Vector3(c[0],c[1],c[2]),size=Math.max(w,h),m=size*.35+.25,neg=nn.clone().negate(),len=m+size*.5+.5;let gmin=1e9,gmax=-1e9,miss=false;
      for(const [i,j] of [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0],[0,0]]){const org=cv.clone().addScaledVector(rt,i*w/2).addScaledVector(uv,j*h/2).addScaledVector(nn,m),t=kitHitTris(P,org,neg,len);if(t===null){miss=true;break;}const g=t-m;if(g<gmin)gmin=g;if(g>gmax)gmax=g;}
      if(miss||gmax-gmin>.06*size+.05){s*=.8;continue;}
      cv.addScaledVector(nn,eps-gmin);c=[cv.x,cv.y,cv.z];}
    return {kind:'surface',face,sg,a0,b0,w,h,cell,sub,c,n,up,fa,fb,cap:Math.max(W1,H1)*1.3,pa:pan.pa,pb:pan.pb,maxw:o.maxw,maxh:o.maxh,tag:o.tag||cell};}
  return null;}
const NAVYP={west:'#8f989f',slav:'#6f8294',east:'#6a7e91',irgc:'#4d5a44',sand:'#a29271',olive:'#66694a'};
function navyPaint(fac,m){const k={US:'west',IL:'west',EU:'west',TR:'west',KR:'west',SA:'west',AE:'west',EG:'west',UA:'slav',IN:'slav',PK:'slav',CU:'slav',RU:'slav',CN:'east',KP:'east',IR:'irgc',RS:'sand',DW:'olive'}[fac]||'west';return NAVYP[k];}
function factionKit(e,c,o,yaw,m,T){if(!T||!T.fac||!c||!m)return;const low=typeof SET!=='undefined'&&SET.gfx==='low',fac=T.fac,k=e.kind;
  const air=k==='jet'||k==='heli'||k==='airlift',nav=k==='boat'||k==='ship'||k==='lander'||k==='sub',gnd=/^m_/.test(c.m)&&['tank','arty','aa','atgm','jeep','raidlead'].includes(k);
  if(!(air||nav||gnd)||(gnd&&low)||(c.squad&&c.squad.length>1))return;
  const gk=c.m+'|'+c.size+'|'+k+'|'+fac+'|'+(low?1:0)+'|'+((nav&&k==='ship')||k==='jet'?e.id&3:0);let g=KIT.geo[gk];
  if(g===undefined){g=null;try{const P=kitProbe(o,yaw,m,c.m+'|'+c.size);if(P){m.rotation.y=0;o.updateMatrixWorld(true);g=kitPose(P,o,()=>kitGeo(e,c,fac,k,air,nav,P));}}catch(err){console.warn('kit',err);}KIT.geo[gk]=g;}
  if(k==='ship'){let R=KIT.geo['radar|'+c.m+'|'+c.size];if(R===undefined){R=null;try{const P=kitProbe(o,yaw,m,c.m+'|'+c.size);if(P){m.rotation.y=0;o.updateMatrixWorld(true);let best=null;kitPose(P,o,()=>{for(let i=0;i<=10;i++){const x=P.cx-P.L*.25+i*P.L*.04,d=P.down(x,0);if(d&&(!best||d.y>best.y))best=d;}});
      if(best){const L=P.L,B=kitBuilder();B.rbox(L*.075,L*.012,L*.006,0,L*.012,0,'#cfd2d0');B.rbox(L*.06,L*.004,L*.012,0,L*.004,L*.006,'#7d8285');B.cyl(L*.004,L*.004,L*.012,6,0,L*.006,0,'#5a5e60');R={g:B.geo(),x:best.x,y:best.y,z:best.z};}}}catch(err){console.warn('radar',err);}KIT.geo['radar|'+c.m+'|'+c.size]=R;}
    if(R&&R.g){const piv=new THREE.Group();piv.rotation.y=-yaw.rotation.y;const rm=kitMarker('radar|'+c.m+'|'+c.size,R.g);rm.position.set(R.x,R.y-.2,R.z);rm.rotation.y=(e.id%7)*.9;piv.add(rm);m.add(piv);o.userData.parts.radar=rm;}}
  if(!g)return;const kg=kitMarker(gk,g);kg.rotation.y=-yaw.rotation.y;m.add(kg);}
function kitGeo(e,c,fac,k,air,nav,P){const B=kitBuilder(),{bb,L,W,H,cx}=P,minx=bb.min.x,maxx=bb.max.x,miny=bb.min.y,shia=fac==='IR'||fac==='RS'||fac==='DW',low=typeof SET!=='undefined'&&SET.gfx==='low';
  const sides=(fn)=>{for(const sg of [1,-1])fn(sg,sg>0?'+z':'-z');};
  const D=(face,sg,a,b,w,h,cell,sub,o)=>kitDec(P,face,sg,a,b,w,h,cell,sub,o),put=r=>{if(r)B.quadN(r);return !!r;};
  // one decal on each side of the vehicle (each only where it fits); numerals read left to right on both sides, all-or-none per side
  const sideD=(a,b,w,h,cell,sub,o)=>{let n=0;for(const sg of [1,-1])if(put(D('side',sg,a,b,w,h,cell,sub,o)))n++;return n;};
  const digitsD=(xc,y,dh,str,pre,o)=>{let n=0;const dw=dh*.75;for(const sg of [1,-1]){for(const sc of [1,.8,.64]){const tot=str.length*dw*sc*1.06,pn=kitPanel(P,'side',sg,xc,y,tot*1.2+dh);if(!pn||pn.pa<tot*.95||pn.pb<dh*sc*1.2)continue;const rs=[];let ok=true;for(let i=0;i<str.length;i++){const x=xc+(i-(str.length-1)/2)*dw*sc*1.06*sg,r=D('side',sg,x,y,dw*sc,dh*sc,pre+str[i],[.3,.1,.7,.9],Object.assign({minS:.9,tag:'numeral'},o));if(!r||r.w<dw*sc*.97){ok=false;break;}rs.push(r);}
      if(ok){rs.forEach(put);n++;break;}}if(!n)return 0;}return n;};
  const flagCell=fac==='KP'?'star':'f:'+fac;
  const pole=(x,top,hh,fw)=>{fw=Math.min(fw,L*.1,hh*.8);B.cyl(.14,.16,hh,5,x,top+hh/2,0,'#25262a');const fh=fw*.6;sides((sg,f)=>B.quad(fw,fh,x-fw/2-.1,top+hh-fh/2-.1,sg*.06,f,'f:'+fac));};
  if(air){
    if(k==='jet'){const half=W/2;
      // wing roundels about a third of the local chord, on the upper and lower wing surfaces two thirds out along the span
      roundel:for(const xf of [.5,.42,.58,.35,.62,.3])for(const zf of [.62,.55,.7,.48]){const ro={fa:.33,fb:.6,maxw:L*.13,maxh:L*.13,tag:'roundel'},tops=[1,-1].map(sg=>D('top',1,minx+L*xf,sg*half*zf,L*.12,L*.12,'r:'+fac,null,ro));
        if(tops.every(Boolean)){tops.forEach(put);for(const sg of [1,-1])put(D('bot',1,minx+L*xf,sg*half*zf,L*.12,L*.12,'r:'+fac,null,ro));break roundel;}}
      // fin flash inside the vertical tail, and a small serial number under it
      outer:for(const xf of [.12,.17,.22,.08])for(const yf of [.85,.75,.65,.55,.45]){const x=minx+L*xf,y=miny+H*yf,p=P.side(x,y,1);if(p&&Math.abs(p.z)<W*.12){const fo={fa:.6,fb:.6,maxw:L*.08,maxh:L*.06,tag:'finflash'};
        const fl=[1,-1].map(sg=>D('side',sg,x,y,L*.07,L*.042,'f:'+fac,null,fo));if(!fl.every(Boolean))continue;fl.forEach(put);
        const ds=String(10+((KFAC.indexOf(fac)*29+(e.id&3)*13)%89));digitsD(x,y-fl[0].h*.5-L*.02,L*.022,ds,'d:');break outer;}}
      // underwing stores: drop tanks inboard, missiles outboard, each on a pylon under the real wing surface
      if(!low){const sx=cx-L*.03,r1=L*.016,r2=L*.0068;for(const [zf,kd] of [[.3,0],[.5,1],[.66,1]])for(const sg of [1,-1]){const z=sg*half*zf,p=P.up(sx,z);if(!p||p.y>miny+H*.62||p.y<miny+H*.08)continue;
        const r=kd?r2:r1,ln=kd?L*.15:L*.17,yy=p.y-L*.014-r;B.rbox(L*.07,L*.016,L*.007,sx,p.y-L*.008,z,'#5d6266');
        B.cyl(r,r,ln,8,sx,yy,z,kd?'#c6c8c3':'#7c8286',0,0,Math.PI/2);B.cyl(0,r,ln*(kd?.1:.16),8,sx+ln*(kd?.55:.58),yy,z,kd?'#3a3c3b':'#7c8286',0,0,-Math.PI/2);B.cyl(r,r*.4,ln*.12,8,sx-ln*.56,yy,z,'#6f7478',0,0,Math.PI/2);
        if(kd)for(const fa of [0,Math.PI/2])B.rbox(L*.022,r*4.2,r*.35,sx-ln*.42,yy,z,'#9a9c98',fa,0,0);}}}
    else{// helicopters / transports: a small flag on the tail boom (or the fuselage side), never wider than the panel it sits on
      outer2:for(const xf of [.14,.2,.1,.26,.32,.4])for(const yf of [.55,.5,.6,.45,.4,.65]){const x=minx+L*xf,y=miny+H*yf,p=P.side(x,y,1);if(p&&Math.abs(p.z)<W*.3){if(sideD(x,y,L*.07,L*.042,'f:'+fac,null,{fa:.7,fb:.7,maxw:L*.08,maxh:L*.05,tag:'flag'}))break outer2;}}
      // transport helicopters: a door gunner in each cabin door behind a pintle machine gun
      if(!low&&(k==='airlift'||c.m==='m_uh60'||c.m==='m_mi8')){const u=L/17,dx=cx+L*.1,dy=miny+H*.36,LK=FLOOK[fac]||{uni:'#5d6247'};
        for(const sg of [1,-1]){const p=P.side(dx,dy,sg);if(!p)continue;const hz=Math.abs(p.z)-u*.25;
          B.cyl(u*.2,u*.24,u*.55,6,dx-u*.15,dy+u*.28,sg*hz,LK.uni);B.ell(u*.12,u*.13,u*.12,dx-u*.15,dy+u*.68,sg*hz,'#9c7a5c');B.ell(u*.15,u*.1,u*.15,dx-u*.15,dy+u*.76,sg*hz,'#3b3e33');
          B.bar(dx+u*.05,dy+u*.45,sg*(hz+u*.1),dx+u*.1,dy+u*.3,sg*(hz+u*1.1),u*.045,'#1c1d1b',5);B.rbox(u*.22,u*.16,u*.36,dx+u*.04,dy+u*.44,sg*(hz+u*.25),'#262724');}}}
  }else if(nav){
    // hull side height: for a warship the mast makes H tall, so measure the bow deck and paint below it
    const bd=k==='ship'?P.down(maxx-L*.14,0):null,fb=bd&&bd.y<miny+H*.5?bd.y-miny:H*.6;
    // hull number: white digits on both sides of the bow, at most 40% of the hull side's height, only where the hull side is flat enough; small craft get small numbers or none
    if(k!=='lander'){const no=(k==='ship'?100+((KFAC.indexOf(fac)*37+17+(e.id&3)*11)%800):10+((KFAC.indexOf(fac)*13+(e.id&3)*7)%89)),ds=String(no),dh=Math.min(fb*.4,L*.035*(k==='ship'?1:.8));
      hn:for(const xf of [.27,.38,.2])for(const yf of [.6,.5,.7])if(digitsD(maxx-L*xf,miny+fb*yf,dh,ds,'d:',{maxh:fb*.4}))break hn;}
    const tp=k==='sub'?null:P.down(minx+L*.12,0);if(tp)pole(minx+L*.12,tp.y,k==='ship'?Math.max(4,H*.5):Math.max(3,H*.85),L*(k==='ship'?.055:.08));
    if(k==='ship'&&!low){
      // guard rails round the foredeck, VLS cells on it, white life-raft canisters along the superstructure
      let prev=null;const rh=H*.045,dk=[];for(let i=0;i<=8;i++){const x=cx+L*.14+i*L*.038,d=P.down(x,0);if(!d||d.y>miny+H*.6)break;const s=P.side(x,d.y-.4,1);if(!s)break;dk.push([x,d.y,Math.abs(s.z)-.25]);}
      for(const sg of [1,-1]){prev=null;for(const [x,yy,ze] of dk){B.bar(x,yy,sg*ze,x,yy+rh,sg*ze,.07,'#b9bdbd',4);if(prev)B.bar(prev[0],prev[1]+rh,sg*prev[2],x,yy+rh,sg*ze,.06,'#b9bdbd',4);prev=[x,yy,ze];}}
      if(dk.length>3){const [x0,y0]=dk[2],cw=L*.016;for(let i=0;i<4;i++)for(let j=0;j<2;j++)B.rbox(cw,.18,cw,x0+i*cw*1.15,y0+.08,(j-.5)*cw*1.15,'#40454a');}
      for(let i=0;i<3;i++){const x=cx-L*.08+i*L*.035,yy=miny+H*.62,s=P.side(x,yy,1);if(!s)continue;const r=L*.008;sides(sg=>B.cyl(r,r,L*.026,7,x,yy,sg*(Math.abs(s.z)+r),'#e6e4dc',0,0,Math.PI/2));}}
    if(k==='boat'&&shia&&!low){const x=maxx-L*.24,d=P.down(x,0);if(d){const u=L/12;B.cyl(u*.05,u*.08,u*.7,6,x,d.y+u*.35,0,'#2a2b29');B.rbox(u*.5,u*.18,u*.2,x,d.y+u*.75,0,'#30322e');B.bar(x+u*.2,d.y+u*.78,0,x+u*1.25,d.y+u*.8,0,u*.035,'#1b1c1a',5);B.rbox(u*.2,u*.16,u*.14,x-u*.05,d.y+u*.72,u*.2,'#4a4b3a');}}
  }else{
    // ground vehicles: a flag on each side, then the nation's kit
    {const hx=cx-L*.1,fw=L*.07;for(const yf of [.42,.36,.5])if(sideD(hx,miny+H*yf,fw,fw*(fac==='KP'?1:.6),flagCell,null,{fa:.6,fb:.6,maxw:L*.08,tag:'flag'}))break;}
    const tt=P.down(cx-L*.02,0),hil=c.m==='m_hilux',tank=k==='tank'&&!hil,u=L/(hil?5.3:k==='jeep'?4.8:9.2),LK=FLOOK[fac]||{uni:'#5d6247',veh:'#5d6247'};
    const rearD=P.down(minx+L*.1,0),frontD=(()=>{for(let f=.02;f<.45;f+=.025){const p=P.down(maxx-L*f,W*.3);if(p&&p.y<miny+H*.62)return p;}return null;})(),/* the glacis: first hull hit behind the gun barrel */sideAt=(x,y)=>{const s=P.side(x,y,1);return s?Math.abs(s.z):null;};
    // kit pieces in real-world sizes (u = one metre on this model); colours are worn canvas, steel and rubber, never bright
    const jerry=(x,y,z,col)=>B.rbox(u*.35,u*.47,u*.17,x,y+u*.235,z,col||'#4f5634');
    const tyre=(x,y,z)=>{B.tor(u*.3,u*.11,x,y,z,'#1b1b1a',0,Math.PI/2,0);B.cyl(u*.2,u*.2,u*.12,10,x,y,z,'#3a3a35',Math.PI/2,0,0);};
    const sandbag=(x,y,z,ry)=>B.ell(u*.3,u*.1,u*.18,x,y+u*.08,z,'#a08d68',0,ry||0,0);
    const bag=(x,y,z,col)=>B.ell(u*.28,u*.18,u*.22,x,y+u*.14,z,col||'#5a5842');
    const roll=(x,y,z,len,col)=>B.cyl(u*.14,u*.14,len||u*.9,8,x,y+u*.14,z,col||'#565a3e',Math.PI/2,0,0);
    const smokeL=(n)=>{if(!tt)return;for(const sg of [1,-1]){const s=sideAt(cx+L*.04,tt.y-u*.25);if(!s)continue;for(let i=0;i<n;i++)B.cyl(u*.05,u*.05,u*.3,6,cx+L*.04-i*u*.13,tt.y-u*.2+(i%2)*u*.06,sg*(s+u*.06),'#33362f',.5*sg,0,-.5);}};
    if(shia){const rp=P.down(cx-L*.4,0);if(rp)pole(cx-L*.4,rp.y,Math.max(6,H*.7),L*.08);}
    if(hil){const bx=cx-L*.28,bp=P.down(bx,0);if(bp){const by=bp.y;
      if(fac==='RS'){// a 12-tube rocket pod on the truck bed, raised on its cradle
        const tl=u*1.5,ang=.32;B.bar(bx-L*.05-u*.3,by,-u*.35,bx-L*.05-u*.1,by+u*.45,-u*.35,u*.05,'#2b2c28');B.bar(bx-L*.05-u*.3,by,u*.35,bx-L*.05-u*.1,by+u*.45,u*.35,u*.05,'#2b2c28');
        for(let i=0;i<4;i++)for(let j=0;j<3;j++)B.cyl(u*.065,u*.065,tl,7,bx-L*.05,by+u*.55+j*u*.15,(i-1.5)*u*.15,'#4d5240',0,0,-(Math.PI/2-ang));
        B.rbox(tl*.95,u*.06,u*.66,bx-L*.05,by+u*.45,0,'#3c4033',0,0,ang);}
      else if(fac==='DW'){for(let i=0;i<5;i++)sandbag(bx+(i%3-1)*u*.62,by+((i/3)|0)*u*.18,(i%2?-1:1)*u*.42,i*.3);for(let i=0;i<3;i++)jerry(bx-L*.12,by,(i-1)*u*.2,'#3f4a2e');tyre(bx-L*.1,by+u*.55,u*.55);}
      else{for(let i=0;i<4;i++)B.rbox(u*.6,u*.32,u*.4,bx+(i%2-.5)*u*.66,by+u*.16+((i/2)|0)*u*.32,(i%2?-1:1)*u*.25,'#6b6448');tyre(bx-L*.1,by+u*.55,0);}}}
    if(fac!=='KP')put(D('top',1,cx-L*.28,0,L*.1,L*.06,'f:'+fac,null,{fa:.6,fb:.6,maxw:L*.12,tag:'deckflag'}));
    if(fac==='KP'&&tt)put(D('top',1,cx-L*.02,0,L*.07,L*.07,'star',null,{fa:.6,fb:.6,maxw:L*.09,tag:'star'}));
    if(!hil){
      if(fac==='RS'&&rearD){B.net(L*.34,u*.45,W*.72,minx+L*.2,rearD.y-u*.05,0,'#4a4a34',1.3);B.net(L*.2,u*.4,W*.5,minx+L*.26,rearD.y,W*.08,'#5b5238',4.1);}
      if(fac==='DW'){if(rearD){for(let i=0;i<3;i++)jerry(minx+L*.08,rearD.y,(i-1)*u*.22,'#4a5130');tyre(minx+L*.18,rearD.y+u*.12,-W*.25);}if(frontD)for(let i=0;i<5;i++)sandbag(frontD.x-u*.35,frontD.y+((i/3)|0)*u*.17,(i%3-1)*u*.62,.1*i);}
      if(fac==='IR'&&(tank||k==='arty'||k==='aa')){// slat armour over the rear hull sides, Persian hull number up front
        const y0=miny+H*.12,y1=miny+H*.34,s=sideAt(cx-L*.2,miny+H*.3);if(s){const z=s+u*.28;for(const sg of [1,-1]){for(let i=0;i<11;i++){const x=minx+L*.08+i*L*.04;B.bar(x,y0,sg*z,x,y1,sg*z,u*.025,'#4a4f3c',4);}for(const yy of [y0,y1])B.bar(minx+L*.06,yy,sg*z,minx+L*.5,yy,sg*z,u*.035,'#3f4334',4);}}
        for(const yf of [.5,.42,.58])if(digitsD(maxx-L*.22,miny+H*yf,u*.4,String(100+((e.id*7)%6)*111),'p:'))break;}
      if(fac==='KP'){for(const yf of [.5,.42,.58])if(sideD(cx-L*.28,miny+H*yf,u*1.2,u*.8,'s:kp',[.03,.12,.97,.88],{tag:'slogan'}))break;}
      if((fac==='RU'||fac==='UA')&&tank&&tt){// cope cage: round bars on posts over the turret
        const y=tt.y+u*1.05,ww=L*.3,dd=W*.42,x0=cx-L*.02,col='#2e312a';for(const z of [-1,0,1])B.bar(x0-ww/2,y,z*dd/2,x0+ww/2,y,z*dd/2,u*.035,col);for(let i=0;i<5;i++){const x=x0-ww/2+i*ww/4;B.bar(x,y,-dd/2,x,y,dd/2,u*.035,col);}
        for(const sx of [-1,1])for(const sz of [-1,1])B.bar(x0+sx*ww/2,y,sz*dd/2,x0+sx*ww*.42,tt.y-u*.1,sz*dd*.42,u*.04,col);}
      if(fac==='RU'&&(tank||k==='arty'||k==='aa')){if(frontD&&tank)for(let i=0;i<6;i++)for(let j=0;j<2;j++)B.rbox(u*.42,u*.11,u*.36,frontD.x-u*.3-j*u*.42,frontD.y+u*.04+j*u*.07,(i-2.5)*u*.4,'#4e5838',0,0,.18);
        for(const yf of [.48,.4,.56])if(sideD(cx-L*.25,miny+H*yf,u*.75,u*.46,'s:ru',null,{tag:'unitletter'}))break;}
      if(fac==='US'&&(tank||k==='aa'||k==='atgm')&&tt){// remote weapon station on the turret roof
        const x=cx-L*.06,z=-W*.12,y=tt.y;B.cyl(u*.18,u*.22,u*.22,8,x,y+u*.11,z,'#3b3f38');B.rbox(u*.5,u*.3,u*.36,x,y+u*.38,z,'#4a4e45');B.bar(x+u*.2,y+u*.42,z,x+u*1.15,y+u*.42,z,u*.045,'#1c1d1b',5);B.rbox(u*.22,u*.2,u*.2,x+u*.05,y+u*.62,z+u*.2,'#24262a');}
      if(fac==='IL'&&tank&&tt){// turret bustle basket with gear inside, and the ball-and-chain curtain under the mantlet
        const bx=cx-L*.24,y=tt.y-u*.35,ww=u*1.3,dd=W*.6,col='#3c3e35';for(const yy of [y,y+u*.38]){B.bar(bx-ww/2,yy,-dd/2,bx+ww/2,yy,-dd/2,u*.03,col);B.bar(bx-ww/2,yy,dd/2,bx+ww/2,yy,dd/2,u*.03,col);B.bar(bx-ww/2,yy,-dd/2,bx-ww/2,yy,dd/2,u*.03,col);}
        for(let i=0;i<4;i++){const z=(i-1.5)*dd/3.2;B.bar(bx-ww/2,y,z,bx-ww/2,y+u*.38,z,u*.03,col);}bag(bx,y,-dd*.2,'#6b6650');bag(bx+u*.1,y,dd*.18,'#57563f');roll(bx-u*.3,y+u*.2,0,dd*.8,'#4e5040');
        const fx=cx+L*.14,fy=tt.y-u*.35,s=sideAt(fx,fy);if(s){const n=9;for(let i=0;i<n;i++){const z=(i-(n-1)/2)*(s*1.6/n);for(let j=0;j<4;j++)B.ell(u*.06,u*.06,u*.06,fx,fy-j*u*.13,z,'#2a2b28');}}}
      if(fac==='TR'&&tank&&frontD)for(let i=0;i<5;i++)B.rbox(u*.16,u*.08,u*.62,frontD.x-u*.25,frontD.y+u*.05,(i-2)*u*.33,'#2c2d2a',0,0,.2);
      if((fac==='EU'||fac==='CN'||fac==='KR')&&tank)smokeL(fac==='CN'?4:fac==='KR'?3:4);
      if((fac==='SA'||fac==='AE'||fac==='IN')&&rearD){bag(minx+L*.16,rearD.y,W*.2,'#8a7d5c');bag(minx+L*.16,rearD.y,-W*.18,'#77704f');if(fac!=='IN')for(let i=0;i<2;i++)jerry(minx+L*.08,rearD.y,(i-.5)*u*.22,'#7a7155');}
      if((fac==='PK'||fac==='CU'||fac==='KR'||fac==='IN')&&rearD)roll(minx+L*.12,rearD.y,0,W*.6,fac==='CU'?'#4f5236':'#5a5c3f');
      if(fac==='EG'&&frontD)for(let i=0;i<4;i++)sandbag(frontD.x-u*.35,frontD.y,(i-1.5)*u*.6,.15*i);
      // crew and stowage: a tank commander standing in his hatch, a bedroll on the turret side
      if(tank&&tt){const x=cx-L*.08,z=W*.13,d=P.down(x,z);if(d){const y=d.y;B.cyl(u*.32,u*.32,u*.08,10,x-u*.42,y+u*.18,z,LK.veh||'#555',0,0,1.2);B.cyl(u*.21,u*.26,u*.6,7,x,y+u*.22,z,LK.uni);
          B.ell(u*.11,u*.13,u*.11,x,y+u*.64,z,'#a07c5e');B.ell(u*.15,u*.08,u*.15,x,y+u*.73,z,fac==='US'||fac==='IL'?'#5d5a48':'#2c2e28');}
        const bs=sideAt(cx-L*.12,tt.y-u*.3);if(bs&&fac!=='IL')B.cyl(u*.14,u*.14,u*.8,8,cx-L*.12,tt.y-u*.3,-(bs+u*.12),'#5d5a44',0,0,Math.PI/2);}
      if((fac==='US'||fac==='IL'||fac==='EU')&&k!=='jeep'){const rp=P.down(cx-L*.34,W*.2);if(rp){for(const sg of [1,-1])B.cyl(.07,.1,H*.8,4,cx-L*.34,rp.y+H*.38,sg*W*.2,'#202220',0,0,sg*.12);}}}
  }
  {const g=B.geo();if(g)g.userData.P=P;return g;}}
