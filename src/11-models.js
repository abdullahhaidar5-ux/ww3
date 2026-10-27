let WALKSIGN=1;
/* ================= ART ASSETS: real 3D models (Quaternius, Kenney, Zsky, KolosStudios, Alex Safayan, angelo raffaele Catalano, jeremy, Jarlan Perez via Poly Pizza) ================= */
const MODELS={ready:false,proto:{},tinted:{},loading:null,flipX:{}};
const MCFG={
  tank:{m:'tank',fit:'z',size:38},harv:{m:'truck',fit:'z',size:34},dozer:{m:'truck',fit:'z',size:34,extra:'crane'},
  mortar:{m:'soldier',fit:'y',size:14.0,squad:[[3,-5],[-3,5]],extra:'mortar'},recon:{m:'soldier',fit:'y',size:14.0,squad:[[3,-4],[-3,4]],tint:'#4a5242',tk:.5},officer:{m:'soldier',fit:'y',size:15.7,tint:'#3d4a36',tk:.5},medic:{m:'soldier',fit:'y',size:14.0,squad:[[3,-4],[-3,4]],tint:'#e8e4da',tk:.35},
  commissar:{m:'soldier',fit:'y',size:15.7,tint:'#5b4a3a',tk:.5},sapper:{m:'soldier',fit:'y',size:14.0,squad:[[3,-4],[-3,4]],tint:'#6a5a3c',tk:.4},guer:{m:'soldier',fit:'y',size:14.0,squad:[[5,0],[-4,-7],[-4,7]],tint:'#4c5a3a',tk:.55},atk:{m:'soldier',fit:'y',size:14.0,squad:[[3,-5],[-3,5]],tint:'#3c4434',tk:.5},
  idome:{m:'truck',fit:'z',size:36,extra:'samtruck'},ew:{m:'truck',fit:'z',size:35,extra:'dish'},cbr:{m:'truck',fit:'z',size:35,extra:'dish'},jeep:{m:'truck',fit:'z',size:26},atgm:{m:'truck',fit:'z',size:27,extra:'samtruck',tint:'#55603f',tk:.4},saka:{m:'soldier',fit:'y',size:14.0,squad:[[5,0],[-4,-7],[-4,7]],tint:'#a08a5c',tk:.5},raidlead:{m:'truck',fit:'z',size:28,extra:'mg'},
  inf:{m:'soldier',fit:'y',size:14.0,squad:[[5,0],[-4,-7],[-4,7]]},at:{m:'soldier',fit:'y',size:14.0,squad:[[3,-5],[-3,5]]},hacker:{m:'soldier',fit:'y',size:13.1,squad:[[3,-4],[-3,4]]},
  hero:{m:'soldier',fit:'y',size:15.7,tint:'#2c302b',tk:.6},heli:{m:'heli',fit:'z',size:54},airlift:{m:'heli',fit:'z',size:72,tint:'#59604f',tk:.5},lander:{m:'boat',fit:'z',size:52,tint:'#6f7478',tk:.5},drone:{m:'drone',fit:'z',size:18,tint:'#7d8287',tk:.8},jet:{m:'jet',fit:'z',size:46},boat:{m:'boat',fit:'z',size:42,tint:'#7a8590',tk:.9},ship:{m:'ship',fit:'z',size:118,tint:'#7d8792',tk:.88},
};
// Realistic models (Objaverse / Sketchfab, CC-BY - authors credited in the menu): each nation fields the hardware it
// actually flies and drives where a licensed model exists.
const RMOD={t90:{m:'m_t90',fit:'z',size:40},hilux:{m:'m_hilux',fit:'z',size:30,extra:'dshk'},d7r:{m:'m_d7r',fit:'z',size:34},jd550:{m:'m_jd550',fit:'z',size:33},apache:{m:'m_apache',fit:'z',size:58},mi24:{m:'m_mi24',fit:'z',size:62},
  f15:{m:'m_f15',fit:'z',size:50},f18:{m:'m_f18',fit:'z',size:48},su35:{m:'m_su35',fit:'z',size:54},rafale:{m:'m_rafale',fit:'z',size:46},typhoon:{m:'m_typhoon',fit:'z',size:46},j10:{m:'m_j10',fit:'z',size:46},mig29:{m:'m_mig29',fit:'z',size:48},f16:{m:'m_f16',fit:'z',size:46},g6:{m:'m_g6',fit:'z',size:40},ozelot:{m:'m_ozelot',fit:'z',size:34},zu:{m:'m_hilux',fit:'z',size:30,extra:'zu23'}};
const RMAP={tank:{RU:'t90',KP:'t90',IR:'t90',UA:'t90',CN:'t90',IN:'t90',EG:'t90',PK:'t90',CU:'t90',RS:'hilux',DW:'hilux'},dozer:{},
  heli:{US:'apache',IL:'apache',EU:'apache',SA:'apache',AE:'apache',EG:'apache',KR:'apache',TR:'apache',IN:'apache',PK:'apache',RU:'mi24',KP:'mi24',IR:'mi24',CN:'mi24',UA:'mi24',CU:'mi24',RS:'mi24',DW:'mi24'},
  jet:{US:'f18',IL:'f16',TR:'f16',EU:'rafale',UA:'typhoon',RU:'su35',IR:'mig29',SA:'f15',AE:'f16',PK:'j10',IN:'rafale',CN:'j10',KP:'mig29',KR:'f15',EG:'rafale',CU:'mig29'}};
for(const f of ['US','TR','IL','EU','UA','RU','IR','SA','AE','PK','IN','CN','KP','KR','EG','CU','RS','DW'])RMAP.dozer[f]='jd550';
const MIL_TANK={RS:{m:'technical',fit:'z',size:29},DW:{m:'technical',fit:'z',size:29},IM:{m:'toontank',fit:'z',size:32}};
for(const f of ['US','IL','EU','SA','AE','EG','KR','TR','CN','PK','IN'])MIL_TANK[f]={m:'tankE',fit:'long',size:37};
const PROPS={container:{fit:'x',size:28},containerG:{fit:'x',size:30},crate:{fit:'y',size:8},barrel:{fit:'y',size:8},sandbag:{fit:'x',size:16},watertower:{fit:'y',size:56},tent:{fit:'x',size:50},pallet:{fit:'x',size:10},fence:{fit:'x',size:24},missile:{fit:'y',size:26},sam:{fit:'y',size:24}};
// The models are separate files next to the page (models/<key>.<hash>.glb.gz, listed in MODEL_FILES by orch/build.py),
// fetched in parallel while the menu is up. A file that fails to arrive just leaves that model out (units fall back to
// a stand-in model or simple shapes); a file that stalls is given up on after 30 seconds.
// Unzipping uses the browser's own DecompressionStream (all current browsers). Very old browsers without it skip the
// models and use the simple shapes (no extra library is loaded from another host).
function gunzipU8(u){if(typeof DecompressionStream==='undefined')return Promise.reject(new Error('no DecompressionStream'));
  return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
function fetchModel(url){const ac=typeof AbortController!=='undefined'?new AbortController():null,tm=setTimeout(()=>{if(ac)ac.abort();},30000);
  return fetch(url,ac?{signal:ac.signal}:undefined).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status+' '+url);return r.arrayBuffer();})
    .then(b=>{const u=new Uint8Array(b);return u[0]===0x1f&&u[1]===0x8b?gunzipU8(u):b;}).finally(()=>clearTimeout(tm));}
function loadModels(){if(MODELS.loading)return MODELS.loading;MODELS.loading=(async()=>{try{
    if(typeof MODEL_FILES==='undefined'||!THREE.GLTFLoader)return false;
    const ld=new THREE.GLTFLoader(),keys=Object.keys(MODEL_FILES),got={},T0=performance.now();let done=0,bad=0;
    const tick=()=>{done++;MODELS.prog=done/keys.length;if(window.LOADING&&!MODELS.ready&&typeof loadStep==='function')try{loadStep('Loading 3D models… '+done+' of '+keys.length,.04+.04*MODELS.prog);}catch(e){}};
    await Promise.all(keys.map(async k=>{const url=MODEL_FILES[k];try{const b=await(got[url]=got[url]||fetchModel(url));
        await new Promise(res=>{try{ld.parse(b.slice(0),'',g=>{MODELS.proto[k]={scene:g.scene,anims:g.animations};res();},e=>{bad++;console.warn('model',k,e);res();});}catch(e){bad++;console.warn('model',k,e);res();}});}
      catch(e){bad++;MODELS.err=String(e&&e.message||e);console.warn('model',k,e);}tick();}));
    MODELS.loadMs=Math.round(performance.now()-T0);if(bad)console.warn('3D models: '+bad+' of '+keys.length+' failed to load');
    for(const k in MODELS.proto)MODELS.proto[k].scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(m.map)m.map.encoding=THREE.sRGBEncoding;m.roughness=Math.max(.5,m.roughness??.8);m.metalness=Math.min(.35,m.metalness??0);}}});
    for(const k in MODELS.proto){try{mergeProto(MODELS.proto[k]);}catch(e){console.warn('merge',k,e);}}
    MODELS.ready=Object.keys(MODELS.proto).length>0;if(!MODELS.ready)MODELS.err='no models parsed';return MODELS.ready;}catch(e){console.warn('models',e);MODELS.err=String(e&&e.message||e);return false;}})();return MODELS.loading;}
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
function weather(m,amt,camo){if(!m||m.userData.wx)return;m.userData.wx=1;amt=amt||1;camo=camo||0;if(camo)m.extensions=Object.assign(m.extensions||{},{derivatives:true});
  m.onBeforeCompile=sh=>{sh.uniforms.wAmt={value:amt};sh.uniforms.wCamo={value:camo};sh.uniforms.wRefl={value:m.userData.refl||0};sh.uniforms.wCA={value:m.userData.camoA||new THREE.Color(.30,.25,.17)};sh.uniforms.wCB={value:m.userData.camoB||new THREE.Color(.13,.15,.10)};sh.uniforms.wPat={value:m.userData.camoP||0};sh.uniforms.wSc={value:m.userData.camoS||1};sh.uniforms.wCC={value:m.userData.camoC||new THREE.Color(.5,.45,.35)};sh.uniforms.wTrim={value:m.userData.trimC||new THREE.Color(.5,.5,.5)};sh.uniforms.wWall={value:m.userData.wall||0};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vOP;varying float vOY;varying vec3 vWN;').replace('#include <project_vertex>','#include <project_vertex>\nvec4 wq=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nwq=instanceMatrix*wq;\n#endif\nvWP=(modelMatrix*wq).xyz;vOP=position;vOY=(modelMatrix*vec4(0.,0.,0.,1.)).y;vWN=normalize(mat3(modelMatrix)*objectNormal+vec3(0.,1e-4,0.));');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float wAmt;uniform float wCamo;uniform float wRefl;uniform vec3 wCA;uniform vec3 wCB;uniform float wPat;uniform float wSc;uniform vec3 wCC;uniform vec3 wTrim;uniform float wWall;varying vec3 vOP;varying float vOY;varying vec3 vWN;\n'+WX_COMMON).replace('#include <color_fragment>',`#include <color_fragment>
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
          float hh=vWP.y-vOY;float dust=(1.-smoothstep(.5,5.5,hh))*.5+wn(p*3.7)*.08;paint=mix(paint,vec3(.40,.34,.26)*(.8+lum*.5),clamp(dust,0.,.6));
          float ch=wn(p*16.+5.)*.7+wn(p*33.)*.3;paint=mix(paint,vec3(.16,.16,.15),smoothstep(.74,.76,ch)*.55);
          float st=wn(vec3(p.x*9.,p.y*.7,p.z*9.));paint*=1.-.08*smoothstep(.55,.85,st);
          paint*=mix(.72,1.06,smoothstep(-.7,.85,vWN.y))*mix(.86,1.,smoothstep(0.,3.,hh));
          diffuseColor.rgb=paint;}}
      if(wWall>.5){float hh=vWP.y-vOY,vert=1.-abs(vWN.y);if(vert>.6){vec3 base=diffuseColor.rgb;float lum=dot(base,vec3(.3,.59,.11));
        if(wWall<1.5){float b=step(9.,hh)*step(hh,13.);float tl=step(.5,fract((vWP.x+vWP.z)*.35))*.25;diffuseColor.rgb=mix(base,wTrim*(.85+tl),b*.85);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.92,.88,.78),step(13.,hh)*step(hh,13.8)*.8);}
        else if(wWall<2.5){float g=max(1.-smoothstep(0.,.25,abs(fract(hh/6.)-.5)*6.),1.-smoothstep(0.,.25,abs(fract((vWP.x+vWP.z)/8.)-.5)*8.));diffuseColor.rgb*=1.-.22*g;diffuseColor.rgb=mix(diffuseColor.rgb,wTrim*.9,step(2.,hh)*step(hh,3.4)*.8);}
        else if(wWall<3.5){diffuseColor.rgb=mix(base,wTrim*(.8+lum*.4),step(4.,hh)*step(hh,6.)*.85);}
        else if(wWall<4.5){float cr=1.-smoothstep(0.,.2,abs(fract(hh/2.4)-.5)*2.4);float of=1.-smoothstep(0.,.2,abs(fract((vWP.x+vWP.z)/5.+step(.5,fract(hh/4.8))*.5)-.5)*5.);diffuseColor.rgb*=1.-.16*max(cr,of*step(.5,1.-cr));diffuseColor.rgb=mix(diffuseColor.rgb,wTrim,step(1.,hh)*step(hh,2.2)*.75);}
        else{float b=step(7.,hh)*step(hh,11.);diffuseColor.rgb=mix(base,wTrim,b*.9);float tx=step(.55,fract((vWP.x+vWP.z)*.5))*step(8.,hh)*step(hh,10.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.95),tx*b*.8);}}}float dh=1.-smoothstep(1.,9.,vWP.y-vOY);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.45,.33)*(.85+.3*gn),dh*wAmt*.55);`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(.5-gn)*.25*wAmt,.3,1.);').replace('#include <dithering_fragment>','#include <dithering_fragment>\n{vec3 vv=normalize(vViewPosition);float rim=pow(1.-clamp(dot(normalize(normal),vv),0.,1.),3.);gl_FragColor.rgb+=vec3(.55,.62,.75)*rim*.22*wAmt*(1.-.6*wRefl);if(wRefl>0.){vec3 Vw=normalize(cameraPosition-vWP),Nw=normalize(vWN+vec3(0.,1e-4,0.));float ndv=clamp(dot(Nw,Vw),0.,1.);vec3 Rw=reflect(-Vw,Nw);vec3 env=Rw.y>0.?mix(vec3(.6,.64,.68),vec3(.33,.48,.74),smoothstep(0.,.6,Rw.y)):vec3(.23,.2,.16);float fr=.04+.96*pow(1.-ndv,5.);float sp=pow(max(dot(Rw,vec3(-.66,.57,-.46)),0.),70.);float lu=dot(gl_FragColor.rgb,vec3(.33));gl_FragColor.rgb=mix(gl_FragColor.rgb,env*(.5+.5*lu),clamp(fr*.5*wRefl,0.,.6))+vec3(1.,.93,.8)*sp*.5*wRefl;}if(wCamo>0.){float up=clamp(vWN.y/max(length(vWN),1e-4),0.,1.);gl_FragColor.rgb+=vec3(.42,.5,.62)*rim*.18+vec3(.06,.07,.08)*up*up;}}');};
  m.customProgramCacheKey=()=>'wx'+amt+'_'+camo+'_'+(m.userData.camoP||0)+'_'+(m.userData.wall||0);}
function normScale(obj,fit,size){obj.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(obj),sz=bb.getSize(new THREE.Vector3());const dim=fit==='y'?sz.y:fit==='x'?sz.x:(fit==='xz'||fit==='long')?Math.max(sz.x,sz.z):sz.z;const s=size/Math.max(.001,dim);const c=bb.getCenter(new THREE.Vector3());return{s,cx:c.x,cz:c.z,my:bb.min.y,xl:sz.x>sz.z};}
const CAMOK={};function camoFreq(key){if(CAMOK[key]!==undefined)return;if(!['tank','tankE','tankW','truck','technical','toontank'].includes(key)){CAMOK[key]=0;return;}const P=MODELS.proto[key];P.scene.updateMatrixWorld(true);let mx=0;P.scene.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox,sz=b.getSize(new THREE.Vector3());mx=Math.max(mx,sz.x,sz.y,sz.z);}});CAMOK[key]=mx>0?4/mx:0;}
/* ---------- per-country looks: vehicle paint, camo blotches, uniform colour and national flag ---------- */
const FLOOK={
  US:{veh:'#b8a47e',ca:'#7a6040',cb:'#4b4630',uni:'#a79a78',pat:1}, TR:{veh:'#5f6345',ca:'#4a3a26',cb:'#2a2c20',uni:'#5d6248',pat:1},
  IL:{veh:'#8c8a7a',ca:'#6f6c60',cb:'#56544a',uni:'#6f6b4e',pat:3}, EU:{veh:'#55603f',ca:'#4b3d2a',cb:'#1e201b',uni:'#5c6447',pat:4},
  UA:{veh:'#5a6340',ca:'#3e3a2a',cb:'#2c3024',uni:'#6a6b4c',pat:1}, RU:{veh:'#5d6a3e',ca:'#2b2b25',cb:'#a89a6e',uni:'#65684a',pat:0},
  IR:{veh:'#b5a072',ca:'#8a7651',cb:'#5c5240',uni:'#9a8a64',pat:0}, SA:{veh:'#c2ac80',ca:'#a18a62',cb:'#7d6a4b',uni:'#b19c74',pat:3},
  AE:{veh:'#c6b088',ca:'#a58e66',cb:'#83704f',uni:'#b6a27c',pat:0}, PK:{veh:'#6b6a48',ca:'#8b7a55',cb:'#3d3a2a',uni:'#77714f',pat:0},
  IN:{veh:'#6a6d48',ca:'#4b3e2a',cb:'#9e9468',uni:'#6f6f4f',pat:4}, CN:{veh:'#5c6a46',ca:'#3f4a33',cb:'#7d8662',uni:'#5e6a4c',pat:1},
  KP:{veh:'#4e5636',ca:'#3a3826',cb:'#2a2a20',uni:'#575c3e',pat:3}, KR:{veh:'#535d3c',ca:'#45392a',cb:'#2a2b23',uni:'#5d6347',pat:1},
  EG:{veh:'#c1a97b',ca:'#9d855b',cb:'#7a6644',uni:'#ae976d',pat:3}, CU:{veh:'#59603f',ca:'#3e3a28',cb:'#7d7a55',uni:'#5f6345',pat:3},
  RS:{veh:'#8c7356',ca:'#5c4a37',cb:'#3a3027',uni:'#6b5d48',pat:2}, DW:{veh:'#c4a774',ca:'#9a7f56',cb:'#6e5b3e',uni:'#a68f69',pat:2},
  IM:{veh:'#6a6a58',ca:'#4d4b3f',cb:'#8a8672',uni:'#6c6b57'}};
// Each nation's own camouflage (pattern 0 blotch, 1 digital, 2 tiger stripe, 3 plain paint, 4 flecktarn dots,
// 5 splinter, 6 chocolate-chip) at its own scale with a third colour, and its own building trim and wall finish
// (wall 1 glazed-tile band, 2 concrete panels, 3 painted stripe, 4 stone courses, 5 slogan band).
const CAMOX={US:{p:1,s:1.15,c:'#d6c9a4',t:'#3e5a8a',w:3},TR:{p:1,s:.85,c:'#6f6a4a',t:'#c8102e',w:4},IL:{p:3,s:1,c:'#8f8c7c',t:'#1f5fbf',w:4},EU:{p:4,s:1,c:'#2b3a22',t:'#2c4fa0',w:3},
  UA:{p:1,s:1.35,c:'#7a7a52',t:'#e1b80d',w:3},RU:{p:0,s:.7,c:'#8a8f6a',t:'#b22222',w:2},IR:{p:0,s:1.2,c:'#c4b48c',t:'#1f8a8a',w:1},SA:{p:6,s:1,c:'#e3d6b4',t:'#0f6b3a',w:4},
  AE:{p:3,s:1,c:'#cbb991',t:'#00843d',w:4},PK:{p:0,s:.95,c:'#5a6a3c',t:'#0b6b2b',w:4},IN:{p:5,s:1,c:'#7d7653',t:'#e07b14',w:4},CN:{p:1,s:1.6,c:'#46553a',t:'#c8102e',w:2},
  KP:{p:3,s:1,c:'#4c5434',t:'#c8102e',w:5},KR:{p:1,s:1.1,c:'#3c4530',t:'#1f3f9a',w:2},EG:{p:6,s:1.1,c:'#ddd0aa',t:'#b8862b',w:4},CU:{p:0,s:1.5,c:'#4a5a34',t:'#1e4fa0',w:3},
  RS:{p:2,s:1,c:'#2a2620',t:'#c9a227',w:1},DW:{p:2,s:.8,c:'#7c5a36',t:'#4a2f1c',w:1},IM:{p:3,s:1,c:'#6a6a58',t:'#888',w:0}};
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
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return FLAGTEX[fac]=t;}
// A soft sky/ground environment for reflections on painted metal (vehicles, aircraft, ships) and glass/steel on
// buildings, so they pick up a sheen and catch the light instead of looking flat.
let ENVT=null;function envTex(){if(window.NOENV)return null;if(ENVT||typeof R3==='undefined'||!R3||!THREE.PMREMGenerator)return ENVT;try{const sc=new THREE.Scene();const g=new THREE.SphereGeometry(50,32,16);
  const m=new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 d;void main(){float y=d.y;vec3 sky=mix(vec3(.75,.72,.66),vec3(.38,.55,.85),smoothstep(0.,.7,y));vec3 gr=mix(vec3(.42,.36,.28),vec3(.22,.19,.15),smoothstep(0.,-.6,y));vec3 c=y>0.?sky:gr;c+=vec3(1.,.9,.75)*pow(max(dot(d,normalize(vec3(-.55,.55,-.4))),0.),48.)*6.;gl_FragColor=vec4(c,1.);}'});
  sc.add(new THREE.Mesh(g,m));const pm=new THREE.PMREMGenerator(R3);ENVT=pm.fromScene(sc,.02).texture;pm.dispose();}catch(e){console.warn('env',e);}return ENVT;}
function tintedProto(key,team,kk){camoFreq(key);const LK=team&&team.fac?FLOOK[team.fac]:null;const id=key+'|'+(team?team.color:'none')+(kk||'')+(LK?team.fac:'');if(MODELS.tinted[id])return MODELS.tinted[id];const P=MODELS.proto[key];if(!P)return null;
  const tc=team?new THREE.Color(team.color).convertSRGBToLinear():null;const map=new Map();const root=P.scene;
  const k=kk||(key==='soldier'?.0:key==='inf'||key==='hero'?.1:.16);
  const clone=(THREE.SkeletonUtils&&root.getObjectByProperty('type','SkinnedMesh'))?THREE.SkeletonUtils.clone(root):root.clone(true);
  clone.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];const nm=ms.map(m=>{if(!map.has(m)){const c=plainStd(m.clone());if(key==='heli'&&/Gray_Aircraft/.test(m.name||'')){c.visible=false;}const isB=/^b_/.test(key);if(isB&&c.color){const hs={};c.color.getHSL(hs);c.color.setHSL(hs.h,hs.s*.55,hs.l*.95);}weather(c,['tree1','tree2','tree3','tree4'].includes(key)?.5:(key==='boat'||key==='ship')?.15:isB?1.35:1,CAMOK[key]?CAMOK[key]:0);const VK=['tank','tankE','tankW','truck','technical','toontank','m_t90','m_hilux','m_ozelot'];if(isB)c.userData.refl=.35;{const LV={m_su35:.7,m_j10:.75,m_f18:.45,m_typhoon:.15,m_f15:.2,m_f16:.15,m_rafale:.15,m_mig29:.2};const lv=LV[key];if(lv&&c.color){const l=c.color.r*.3+c.color.g*.59+c.color.b*.11;c.color.lerp(new THREE.Color(.18,.2,.22).multiplyScalar(.7+l*1.6),lv);}}if(VK.includes(key)||/^m_|^(jet|heli|drone|boat|ship)$/.test(key))c.userData.refl=/^m_(f|su|ra|ty|j1|mig)|^jet$/.test(key)?1:.75;if(LK&&c.color){const lum=c.color.r*.3+c.color.g*.59+c.color.b*.11;if(lum>.012){if(key==='soldier')c.color.lerp(new THREE.Color(LK.uni).convertSRGBToLinear(),.6);else if(VK.includes(key)){const tgt=new THREE.Color(LK.veh).convertSRGBToLinear().multiplyScalar(Math.min(1.6,.55+lum*2.2));c.color.lerp(tgt,.85);}}if(VK.includes(key)){const X=CAMOX[team.fac]||{};c.userData.camoA=new THREE.Color(LK.ca).convertSRGBToLinear();c.userData.camoB=new THREE.Color(LK.cb).convertSRGBToLinear();c.userData.camoP=X.p!=null?X.p:(LK.pat||0);c.userData.camoS=X.s||1;c.userData.camoC=new THREE.Color(X.c||LK.ca).convertSRGBToLinear();}}if(tc&&c.color&&!['tree1','tree2','tree3','tree4'].includes(key))c.color.lerp(tc,LK&&(key==='soldier'||VK.includes(key))?Math.min(k,.06):k);if(isB&&c.color){c.color.multiply(new THREE.Color(1.08,1.0,.84));const rg=team&&team.fac&&FACTIONS[team.fac]?FACTIONS[team.fac].music:null,BW={west:'#9aa3a8',mideast:'#d2b48a',slavic:'#8f9686',southasia:'#c9a27a',eastasia:'#a8a196',latin:'#d9c9a8'}[rg];if(BW){const lum=c.color.r*.3+c.color.g*.59+c.color.b*.11;if(lum>.05&&lum<.85)c.color.lerp(new THREE.Color(BW).convertSRGBToLinear().multiplyScalar(.6+lum*.9),.32);}}{if(c.isMeshStandardMaterial&&['tank','tankE','tankW','truck','technical','toontank','heli','jet','ship','boat','drone','sam'].includes(key)){c.metalness=Math.min(Math.max(c.metalness||0,.12),.3);c.roughness=Math.min(Math.max(c.roughness??.7,.5),.7);c.userData.sheen=1;}}
      if(isB&&team&&team.fac&&CAMOX[team.fac]){const X=CAMOX[team.fac];c.userData.trimC=new THREE.Color(X.t).convertSRGBToLinear();c.userData.wall=X.w||0;}map.set(m,c);}return map.get(m);});o.material=Array.isArray(o.material)?nm:nm[0];});
  MODELS.tinted[id]={scene:clone,anims:P.anims};return MODELS.tinted[id];}
// Some models (the Apache) use the older spec/gloss material type, which works only through its own shader hook; the
// weathering hook replaced it, leaving the shader without its specular-map slot, so the hull failed to draw every frame
// (only the tinted canopy and the shadow showed). Such materials become plain standard ones before weathering.
function plainStd(m){if(!m||!m.isMeshStandardMaterial||!(m.isGLTFSpecularGlossinessMaterial||'glossiness' in m||m.specularMap!==undefined&&m.specularMap!==null))return m;
  const n=new THREE.MeshStandardMaterial({name:m.name,color:m.color?m.color.clone():0xffffff,map:m.map||null,normalMap:m.normalMap||null,aoMap:m.aoMap||null,emissive:m.emissive?m.emissive.clone():0x000000,emissiveMap:m.emissiveMap||null,
    alphaMap:m.alphaMap||null,transparent:m.transparent,opacity:m.opacity,side:m.side,alphaTest:m.alphaTest||0,vertexColors:!!m.vertexColors,skinning:!!m.skinning,roughness:m.glossiness!=null?Math.min(1,Math.max(.35,1-m.glossiness*.7)):.75,metalness:.15});
  if(m.normalScale&&n.normalScale)n.normalScale.copy(m.normalScale);n.userData=Object.assign({},m.userData);return n;}
function instModel(key,team,fit,size,ys,kk){const T=tintedProto(key,team,kk);if(!T)return null;const src=T.scene;const skinned=!!src.getObjectByProperty('type','SkinnedMesh');
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
function setupWalk(m){const inner=m.userData.inner;if(!inner)return null;inner.updateMatrixWorld(true);const B={};inner.traverse(o=>{if(o.isBone)B[o.name]=o;});
  if(!B.uplegL||!B.uplegR||!B.legL||!B.legR)return null;let pl=new THREE.Vector3().setFromMatrixPosition(B.uplegL.matrixWorld),pr=new THREE.Vector3().setFromMatrixPosition(B.uplegR.matrixWorld);
  // the rifle-ready stance has the hips turned ~20 degrees; square them to the direction of travel so the legs
  // swing straight forward and back instead of diagonally across the body
  {const a=Math.atan2(pr.z-pl.z,pr.x-pl.x),tg=Math.abs(a)>Math.PI/2?Math.sign(a)*Math.PI:0,th=a-tg;if(Math.abs(th)>.02){inner.rotation.y+=th;inner.updateMatrixWorld(true);pl=new THREE.Vector3().setFromMatrixPosition(B.uplegL.matrixWorld);pr=new THREE.Vector3().setFromMatrixPosition(B.uplegR.matrixWorld);}}
  const lat=pr.clone().sub(pl).normalize();const q=new THREE.Quaternion();
  const mk=(b,s)=>{if(!b)return null;b.parent.getWorldQuaternion(q);const ax=lat.clone().applyQuaternion(q.clone().invert()).normalize();return{b,q0:b.quaternion.clone(),ax,s};};
  return[mk(B.uplegL,1),mk(B.uplegR,-1),mk(B.legL,1),mk(B.legR,-1),mk(B.spine,0)].filter(Boolean);}
const WQ=new THREE.Quaternion();
function walkPose(m,ph,amt){const L=m.userData.legs;if(!L)return;const sw=Math.sin(ph);for(const j of L){let a=0;const n=j.b.name;
    if(n==='uplegL')a=sw*.55*amt;else if(n==='uplegR')a=-sw*.55*amt;else if(n==='legL')a=-Math.max(0,Math.cos(ph))*.9*amt;else if(n==='legR')a=-Math.max(0,-Math.cos(ph))*.9*amt;else if(n==='spine')a=.08*amt;
    WQ.setFromAxisAngle(j.ax,a*(m.userData.wsign||1));j.b.quaternion.copy(WQ).multiply(j.q0);}}
// Drones are built by hand so each nation's looks right: a Shahed-style delta wing with a pusher propeller
// (Iran, Mountain Shias), a Kargu-style quadcopter (Turkey) and a small X-frame FPV racer (Ukraine and others).
function droneType(fac){return fac==='IR'||fac==='RS'?'delta':fac==='TR'?'kargu':'fpv';}
// Drones are built once per nation and then cloned (shared geometry and materials), so a swarm of dozens appears
// without a hitch.
const DPROTO={};
function droneModel(e){const T=G.teams[e.team],ty=droneType(T.fac),key=ty+'|'+T.fac+'|'+T.color;
  if(!DPROTO[key]){const p=buildDrone(e);SCN.remove(p);const meta={props:p.userData.parts.props.map(q=>q.ax)};p.userData={};p.children[0].userData={};let i=0;p.traverse(c=>{if(c.userData&&c.userData.dprop!=null)return;});DPROTO[key]={p,meta};}
  const D=DPROTO[key],o=D.p.clone(),yaw=o.children[0],props=[];o.traverse(c=>{if(c.name==='dprop')props.push({m:c,ax:c.userData.ax||'y'});});
  o.userData={parts:{body:yaw,props},model:true,dtype:ty};SCN.add(o);return o;}
function buildDrone(e){const T=G.teams[e.team],ty=droneType(T.fac),o=new THREE.Group(),yaw=new THREE.Group();o.add(yaw);o.userData.parts={body:yaw,props:[]};o.userData.model=true;o.userData.dtype=ty;
  const B=Bld(),dk='#2a2c28',tc=T.color;
  if(ty==='delta'){
    // Shahed-136 pattern: ~3.5 m long and ~2.5 m span (longer than wide), cylindrical body with a rounded warhead nose,
    // cropped-delta wing running most of the body length, vertical fins at the wingtips reaching above and below the
    // wing, small two-stroke engine in the tail driving a two-blade pusher propeller.
    const sk=T.fac==='RS'?'#6a665a':'#c4c2b8',sk2=T.fac==='RS'?'#5a564b':'#aeaca2';
    B.cyl(1.25,1.25,15,12,-1.5,0,0,sk,0,0,-Math.PI/2);B.sph(1.25,6,0,0,sk,1.9,1,1);B.cyl(.55,1.25,2.6,10,-10.3,0,0,sk2,0,0,-Math.PI/2);
    B.box(4.5,.9,1.6,-1,1.15,0,sk2);
    const wing=new THREE.Shape();wing.moveTo(5.5,0);wing.lineTo(-4.6,8.6);wing.lineTo(-8.8,8.6);wing.lineTo(-8.4,0);wing.lineTo(-8.8,-8.6);wing.lineTo(-4.6,-8.6);wing.closePath();
    const wg=new THREE.ExtrudeGeometry(wing,{depth:.45,bevelEnabled:true,bevelThickness:.12,bevelSize:.12,bevelSegments:1});wg.rotateX(Math.PI/2);B._p.push({g:wg,m:new THREE.Matrix4().makeTranslation(0,.25,0),c:lin(sk)});
    for(const sd of [-1,1]){const fin=new THREE.Shape();fin.moveTo(-4.4,-2);fin.lineTo(-3.2,2.8);fin.lineTo(-6.2,3.1);fin.lineTo(-9.2,2.8);fin.lineTo(-9.2,-2.2);fin.lineTo(-6.6,-2.4);fin.closePath();
      const fg=new THREE.ExtrudeGeometry(fin,{depth:.3,bevelEnabled:false});B._p.push({g:fg,m:new THREE.Matrix4().makeTranslation(0,0,8.6*sd-.15),c:lin(sk2)});}
    B.box(1.4,.35,1.1,1.5,1.62,0,tc);B.box(.6,.6,.6,-11.7,0,0,dk);
    const pr=new THREE.Group();const P=Bld();P.box(.35,6.2,.8,0,0,0,dk);P.sph(.45,0,0,0,dk);pr.add(mesh(P.geo()));pr.position.set(-12.1,0,0);pr.name='dprop';pr.userData.ax='x';yaw.add(pr);o.userData.parts.props.push({m:pr,ax:'x'});
    const disc=new THREE.Mesh(new THREE.CircleGeometry(3.1,20),new THREE.MeshBasicMaterial({color:0x222222,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.y=Math.PI/2;disc.position.set(-12.2,0,0);yaw.add(disc);}
  else{const big=ty==='kargu',arm=big?7.5:5.5,bc=big?'#7c8076':'#3b3f37';B.cyl(big?2.4:1.6,big?2.4:1.6,big?3:1.6,10,0,0,0,bc);if(big)B.sph(1.6,2,-.6,0,'#1b1c1a');else B.box(1.4,1.2,1.2,2,.5,0,'#111');B.box(1.6,.6,1.2,0,big?1.8:1.1,0,tc);
    for(const a of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]){const x=Math.cos(a)*arm,z=Math.sin(a)*arm;B.box(arm*1.05,.5,.7,x/2,0,z/2,bc,0,-a,0);B.cyl(.7,.7,1.2,8,x,.4,z,dk);
      const pr=new THREE.Group();const P=Bld();P.box(big?6:4.4,.15,.6,0,0,0,'#151515');pr.add(mesh(P.geo()));pr.position.set(x,1.1,z);pr.name='dprop';pr.userData.ax='y';yaw.add(pr);o.userData.parts.props.push({m:pr,ax:'y'});
      const disc=new THREE.Mesh(new THREE.CircleGeometry(big?3:2.2,16),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.set(x,1.15,z);yaw.add(disc);}
    if(big)for(const s of [-1,1])B.box(.4,2.4,.4,0,-1.6,1.4*s,dk);}
  yaw.add(mesh(B.geo()));const sc=ty==='delta'?.95:ty==='kargu'?.95:.85;yaw.scale.setScalar(sc);
  SCN.add(o);return o;}
// The Ayatollah: a senior cleric - layered black turban (amamah), full white beard, round spectacles, a pale grey
// qaba robe to the ground under a dark brown aba cloak with thin gold edging, hands folded holding prayer beads.
function clericModel(e){const T=G.teams[e.team],o=new THREE.Group(),yaw=new THREE.Group();o.add(yaw);o.userData.parts={body:yaw};o.userData.model=true;o.userData.cleric=true;
  const B=Bld(),skin='#c69a78',robe='#a8a397',aba='#3b2d23',trim='#b8963e',tur='#101010',beard='#ecebe6',P=(g,x,y,z,c,rx=0,ry=0,rz=0)=>{const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1));B._p.push({g,m,c:lin(c)});};
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
  const body=mesh(B.geo());body.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});body.castShadow=true;body.receiveShadow=true;yaw.add(body);yaw.scale.setScalar(1.08);
  const ring=new THREE.Mesh(new THREE.RingGeometry(4.4,5,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(T.color),transparent:true,opacity:.32,depthWrite:false}));ring.position.y=1.2;ring.renderOrder=2;o.add(ring);o.userData.parts.tring=ring;
  // a faint green halo of light marks him on the battlefield
  const glow=new THREE.Mesh(new THREE.RingGeometry(5.2,6.2,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x5fd38a,transparent:true,opacity:.18,depthWrite:false}));glow.position.y=1.3;glow.renderOrder=2;o.add(glow);
  SCN.add(o);return o;}
function modelFor(e){if(!MODELS.ready||e.isB)return null;if(e.kind==='drone')return droneModel(e);const T=G.teams[e.team];let c=MCFG[e.kind];if(e.kind==='tank'&&MIL_TANK[T.fac])c=MIL_TANK[T.fac];{const rk=e.kind==='aa'?(/Technical/.test(e.s.name||'')?'zu':'ozelot'):RMAP[e.kind]&&RMAP[e.kind][T.fac];if(rk&&MODELS.proto[RMOD[rk].m])c=Object.assign({},c,RMOD[rk],{extra:RMOD[rk].extra||(e.kind==='dozer'?null:c&&c.extra)});}
  if(e.kind==='aa'&&MODELS.proto.truck&&MODELS.proto.sam)c={m:'truck',fit:'z',size:34,extra:'samtruck'};
  if(e.kind==='arty'){if(e.s&&e.s.rocket||!MIL_TANK[T.fac]&&!MODELS.proto.tank)c={m:'truck',fit:'z',size:34,extra:'mlrs'};else{const tc=MIL_TANK[T.fac]&&MIL_TANK[T.fac].m!=='technical'&&MIL_TANK[T.fac].m!=='toontank'?MIL_TANK[T.fac]:MCFG.tank;c=Object.assign({},tc,{size:tc.size*1.08,extra:'gun'});if(MIL_TANK[T.fac]&&(MIL_TANK[T.fac].m==='technical'||MIL_TANK[T.fac].m==='toontank'))c={m:'truck',fit:'z',size:34,extra:'mlrs'};}}
  if(c&&!MODELS.proto[c.m]){const alt={soldier:'inf',tankE:'tank',tankW:'tank',drone:null,technical:'tank',toontank:'tank'}[c.m];if(alt&&MODELS.proto[alt])c=Object.assign({},c,{m:alt});}
  if(!c||!MODELS.proto[c.m])return null;
  const o=new THREE.Group();o.userData.parts={};const sq=c.squad||[[0,0]];const yaw=new THREE.Group();yaw.rotation.y=Math.PI/2+(c.flip?Math.PI:0);o.add(yaw);
  for(const [px,pz] of sq){const m=instModel(c.m,c.tint?{color:c.tint}:T,c.fit,c.size,1,c.m==='soldier'&&!c.tint?[.03,.07,.11][(e.id+px*3)%3|0]:c.tk);if(!m)return null;m.position.set(-pz,0,px);m.rotation.y=(Math.random()-.5)*(c.m==='soldier'?.08:.3);yaw.add(m);if(c.m==='soldier'){m.userData.legs=setupWalk(m);m.userData.wsign=WALKSIGN;try{soldierGear(m,T.fac||(G.teams[e.team]&&G.teams[e.team].fac),e.kind);}catch(err){}}
    if(m.userData.anims&&m.userData.anims.length){const mix=new THREE.AnimationMixer(m.userData.inner);(o.userData.mixers=o.userData.mixers||[]).push({mix,anims:m.userData.anims,cur:null});}}
  o.userData.parts.body=yaw;o.userData.model=true;if(c.m==='soldier'){o.userData.mixers=null;o.userData.walker=true;}
  {const ring=new THREE.Mesh(new THREE.RingGeometry(c.size*(c.squad?.5:.36),c.size*(c.squad?.56:.41),28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(T.color),transparent:true,opacity:.24,depthWrite:false}));ring.position.y=1.2;ring.renderOrder=2;if(!['heli','jet'].includes(e.kind))o.add(ring);o.userData.parts.tring=ring;}
  // soft contact shadow so ground vehicles sit in the terrain instead of floating on it
  if(T&&e.s&&e.s.dom==='ground'&&!isInf(e.s)){if(!window.BLOBTEX){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,4,32,32,31);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.6,'rgba(0,0,0,.25)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);window.BLOBTEX=new THREE.CanvasTexture(c);}
    const bs=(c.size||30)*.62,bl=new THREE.Mesh(new THREE.PlaneGeometry(bs*1.5,bs).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:BLOBTEX,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));bl.position.y=.35;bl.renderOrder=1;yaw.add(bl);}
  const ownRotor=e.kind==='heli'?yaw.getObjectByName('main_rotor'):null;if(ownRotor){o.userData.parts.blades=ownRotor;const tr0=yaw.getObjectByName('tail_rotor');if(tr0)o.userData.parts.tailR0=tr0;}
  if(e.kind==='heli'&&!ownRotor){
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
    // afterburner: a tapered additive flame cone at the real tail nozzle of each model
    const fl=new THREE.Mesh(new THREE.ConeGeometry(1.5,9,10,1,true).rotateZ(Math.PI/2).translate(-4.5,0,0),MAT.glow);fl.position.set(tx,ty,0);fl.renderOrder=3;o.add(fl);o.userData.parts.glow=fl;}
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
    {const [x,z]=P(ru+fwd*L*.06,W*.3);const fl=new THREE.Mesh(new THREE.PlaneGeometry(H*.75,H*.45,6,1),new THREE.MeshStandardMaterial({map:flagTex(G.teams[e.team].fac),side:THREE.DoubleSide,roughness:.9}));
     fl.geometry.translate(-H*.375,0,0);fl.position.set(x,y0+H*.95+H*.82,z);fl.rotation.y=ax==='x'?(fwd>0?0:Math.PI):(fwd>0?-Math.PI/2:Math.PI/2);yaw.add(fl);o.userData.parts.pennant=fl;fl.userData.base=Float32Array.from(fl.geometry.attributes.position.array);}
    
    const m=mesh(B.geo());yaw.add(m);}}
  if(e.kind==='harv'){const B=Bld();for(const [x,z] of [[-9,-4],[-2,-4],[-9,3],[-2,3]])B.box(6,5,6,x,20,z,'#c99a2e');const cg=mesh(B.geo());o.add(cg);o.userData.parts.cargo=cg;}
  SCN.add(o);return o;}
function playAnim(o,name,dt){const L=o.userData.mixers;if(!L)return;for(const M of L){if(M.cur!==name){const clip=M.anims.find(a=>a.name.toLowerCase().includes(name))||M.anims[0];if(clip){M.mix.stopAllAction();M.mix.clipAction(clip).play();}M.cur=name;}M.mix.update(dt);}}
function propObj(key,x,z,rot,parent){const c=PROPS[key];if(!c||!MODELS.proto[key])return;const m=instModel(key,null,c.fit,c.size);if(!m)return;m.position.set(x,0,z);m.rotation.y=rot||0;m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});parent.add(m);return m;}
function decorateBld(e,o){if(!MODELS.ready)return;const h=e.size/2;const P=new THREE.Group();o.add(P);
  if(e.kind==='hq'){propObj('watertower',-h-14,-h+6,0,P);propObj('container',h+20,-h+18,Math.PI/2,P);propObj('containerG',h+20,-h+52,Math.PI/2,P);propObj('barrel',-h-8,h+6,0,P);propObj('barrel',-h-14,h+10,0,P);propObj('fence',-14,h+16,0,P);}
  else if(e.kind==='barracks'){propObj('tent',0,h+30,0,P);propObj('sandbag',-h-6,h-8,Math.PI/2,P);propObj('sandbag',h+6,h-8,Math.PI/2,P);propObj('crate',h+8,-h+6,.3,P);propObj('crate',h+12,-h+14,0,P);}
  else if(e.kind==='factory'){propObj('container',-h-18,0,Math.PI/2,P);propObj('barrel',h+8,h-4,0,P);propObj('barrel',h+8,h-12,0,P);propObj('barrel',h+14,h-8,0,P);propObj('pallet',-h+6,h+10,0,P);propObj('crate',-h+6,h+10,0,P);}
  else if(e.kind==='airfield'){propObj('crate',h+6,h-6,0,P);propObj('barrel',h+6,h-16,0,P);propObj('containerG',-h-18,10,Math.PI/2,P);}
  else if(e.kind==='shipyard'){propObj('container',-10,-h-14,0,P);propObj('containerG',22,-h-14,0,P);propObj('crate',h+6,0,0,P);}
  else if(e.kind==='turret'){propObj('sandbag',-h-2,0,Math.PI/2,P);propObj('sandbag',h+2,0,Math.PI/2,P);}
  else if(e.kind==='depot'){propObj('containerG',-h-12,8,Math.PI/2,P);propObj('pallet',h+5,h-8,0,P);propObj('crate',h+7,-h+10,.4,P);propObj('barrel',-h+6,h+6,0,P);}
  else if(e.kind==='uplink'){propObj('barrel',h+8,h,0,P);propObj('fence',0,h+14,0,P);}}
const BMOD={hq:{slab:1,list:[{m:'b_hq',fit:'xz',size:70,ys:.62,x:6,z:4},{m:'b_radar',fit:'y',size:30,x:-30,z:-30,part:'dish',col:'#8a908c',k:.82}]},
  barracks:{slab:1,list:[{m:'b_barr',fit:'xz',size:46,ys:.52,x:-4,z:-4}]},
  factory:{slab:1,list:[{m:'b_fact',fit:'xz',size:72,x:0,z:-2}]},
  airfield:{list:[{m:'b_pad',fit:'xz',size:34,x:24,z:-28,y:2.6}]},
  shipyard:{slab:1,list:[{m:'b_dock',fit:'xz',size:66,x:0,z:0},{m:'b_crane',fit:'y',size:48,x:22,z:20,part:'crane'}]},
  turret:{slab:1,list:[{m:'b_turret',fit:'xz',size:30,part:'gun',col:'#5a5d4c',k:.85}]},
  sam:{slab:1,list:[{m:'sam',fit:'y',size:24,part:'gun',col:'#62664f',k:.6}]},
  uplink:{list:[{m:'b_radar',fit:'y',size:30,x:-26,z:26,part:'dish',col:'#8a908c',k:.82}]}};
function bldModel(e,o,T){const cfg=MODELS.ready&&BMOD[e.kind];if(!cfg||!cfg.list.every(q=>MODELS.proto[q.m]))return false;const P=o.userData.parts;
  if(!['turret','sam'].includes(e.kind)){const fg=new THREE.Group(),h2=e.size/2;fg.position.set(-h2+4,0,h2-4);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,30,6),new THREE.MeshStandardMaterial({color:0x8a8d90,metalness:.6,roughness:.4}));pole.position.y=15;pole.castShadow=true;fg.add(pole);
    const fgeo=new THREE.PlaneGeometry(15,9,8,1);fgeo.translate(7.5,0,0);const fl=new THREE.Mesh(fgeo,new THREE.MeshStandardMaterial({map:flagTex(T.fac),side:THREE.DoubleSide,roughness:.85,emissive:new THREE.Color(T.color),emissiveIntensity:.04}));{const tb=new THREE.Mesh(new THREE.BoxGeometry(.9,7,.9),new THREE.MeshStandardMaterial({color:new THREE.Color(T.color),roughness:.6}));tb.position.set(0,26.5,0);fg.add(tb);}fl.position.y=26.5;fl.castShadow=true;fg.add(fl);o.add(fg);P.flag=fl;fl.userData.base=fgeo.attributes.position.array.slice();}
  if(cfg.slab){const s=e.size,B=Bld(),tc='#'+new THREE.Color(T.color).lerp(new THREE.Color('#5a5c54'),.3).getHexString();B.box(s,2.4,s,0,1.2,0,'#a0937c');B.box(s-2,.7,3,0,2.5,s/2-3,tc);B.box(s-2,.7,3,0,2.5,-s/2+3,tc);B.box(3,.7,s-2,s/2-3,2.5,0,tc);B.box(3,.7,s-2,-s/2+3,2.5,0,tc);
    if(s>50){B.cyl(.5,.5,30,6,s/2-4,15,s/2-4,'#2b2d26');B.box(.3,7,11,s/2-4,26.5,s/2-9.5,tc);}const m=mesh(B.geo());o.add(m);P.main=m;}
  const RT={US:'#bdb49c',EU:'#b5b2a6',KR:'#b2b0a0',IR:'#c9b48a',SA:'#d2bd92',AE:'#d6c49c',EG:'#cdb68a',PK:'#c2b08a',IN:'#c7a98a',RS:'#c4ae84',DW:'#cbb58b',IM:'#a69a80',TR:'#c9b79a',IL:'#cfc3a6',RU:'#8b9479',CN:'#9a9c84',KP:'#848a72',CU:'#a8a07e',UA:'#949a84'}[T.fac];
  for(const q of cfg.list){const rc=q.col?{color:q.col}:(RT?{color:RT}:null);const m=instModel(q.m,rc,q.fit,q.size,q.ys,q.col?q.k:(RT?.42:undefined));if(!m)continue;m.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
    if(q.part){const g=new THREE.Group();g.position.set(q.x||0,q.y??(cfg.slab?2.4:0),q.z||0);g.add(m);o.add(g);P[q.part]=g;}else{m.position.set(q.x||0,q.y??(cfg.slab?2.4:0),q.z||0);o.add(m);}}
  return true;}
// Smooth shading for merged, non-indexed foliage: average the face normals of every vertex that shares a position.
function smoothNorm(g){const P=g.attributes.position,N=g.attributes.normal;if(!N)return;const m=new Map(),key=i=>Math.round(P.getX(i)*20)+','+Math.round(P.getY(i)*20)+','+Math.round(P.getZ(i)*20);
  for(let i=0;i<P.count;i++){const k=key(i);let a=m.get(k);if(!a){a=[0,0,0];m.set(k,a);}a[0]+=N.getX(i);a[1]+=N.getY(i);a[2]+=N.getZ(i);}
  for(let i=0;i<P.count;i++){const a=m.get(key(i)),L=Math.hypot(a[0],a[1],a[2])||1;N.setXYZ(i,a[0]/L,a[1]/L,a[2]/L);}N.needsUpdate=true;}
function modelTrees(){if(!MODELS.ready||!G.treePos)return false;const keys=['tree1','tree2','tree3','tree4'].filter(k=>MODELS.proto[k]);if(!keys.length)return false;
  const slopeAt=(x,y)=>Math.hypot(groundH(x+6,y)-groundH(x-6,y),groundH(x,y+6)-groundH(x,y-6))/12;
  const per=keys.map(()=>[]),con=[[],[]];G.treePos.forEach((t,i)=>{if(slopeAt(t[0],t[1])>.35)return;if((G.sceneryPos||[]).some(([sx,sy])=>Math.hypot(t[0]-sx,t[1]-sy)<75))return;const h=Math.sin(t[0]*.004)*Math.cos(t[1]*.005);if(G.map.theme==='snow'||(h>.2&&((i*7)%10)<3))con[i%2].push(t);else per[i%keys.length].push(t);});
  mats();[0,1].forEach(v=>{if(!con[v].length)return;const R=mulberry(v*17+3),B=Bld();B.cyl(.9,1.5,14,6,0,7,0,'#3d2e20');const tiers=5+v;for(let k=0;k<tiers;k++){const y=10+k*(30/tiers),r=(13-k*(10/tiers))*(.9+R()*.2);const c=new THREE.Color().setHSL(.24+R()*.04,.36+R()*.12,.12+R()*.05+k*.012);if(G.map.theme==='snow')c.lerp(new THREE.Color(.86,.9,.95),k%2?.62:.38);B.cone(r,15-k*1.2,7,0,y+6,0,c,0,R()*3,0);}
    const g=B.geo().index?B.geo().toNonIndexed():B.geo();{const P=g.attributes.position;for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i);if(y<14)continue;const j=Math.sin(x*.9+z*1.3+y*.4)*1.1;P.setXYZ(i,x+j*.6,y,z+j*.6);}}g.computeVertexNormals();smoothNorm(g);
    const tm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0});weather(tm,.4);const im=new THREE.InstancedMesh(g,tm,con[v].length);
    con[v].forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y),y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s*.95,s*(.85+((i*7)%5)*.08),s*.95));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.receiveShadow=true;WORLD.add(im);});
  {const all=[].concat(...per).filter((t,i)=>(i*37)%10<6&&!(G.sceneryPos||[]).some(([sx,sy])=>Math.hypot(t[0]-sx,t[1]-sy)<75));const VAR=3,lists=[[],[],[]],palms=[];all.forEach((t,i)=>{const nearW=Math.abs(G.map.depth(t[0],t[1]))<G.map.hw(t[0])+420;if((nearW&&i%3!==0)||i%7===0)palms.push(t);else lists[i%VAR].push(t);});
   if(palms.length){const R=mulberry(77),B=Bld(),bark='#7a6448';let px=0,py=0,pz=0;for(let k=0;k<8;k++){const ny=py+4.2,nx=px+k*.28;B.cyl(1.05-k*.06,1.2-k*.06,4.4,6,(px+nx)/2,(py+ny)/2,0,k%2?bark:'#6b563c',0,0,-.07*k);px=nx;py=ny;}
     for(let f=0;f<12;f++){const a=f/12*6.283+R()*.3,len=14+R()*5;for(let q=0;q<5;q++){const t=(q+.5)/5,d=t*len,droop=-Math.pow(t,1.7)*10+2.5;const g=new THREE.ConeGeometry(4.2*(1-t*.55),len/5+2,4);g.rotateZ(Math.PI/2);g.scale(1,.3,1);g.rotateY(-a);const c=new THREE.Color().setHSL(.22+R()*.04,.42,.2+t*.05);parts_add(B,g,px+Math.cos(a)*d,py+droop,Math.sin(a)*d,c);}}
     B.sph(1.6,px,py-.5,0,'#5d4a30');
     const g=B.geo().toNonIndexed();g.computeVertexNormals();smoothNorm(g);const tm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide});weather(tm,.3);const im=new THREE.InstancedMesh(g,tm,palms.length);
     palms.forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y)-.5,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s*.95,s*(.9+((i*7)%5)*.06),s*.95));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.receiveShadow=true;WORLD.add(im);}
   for(let v=0;v<VAR;v++){if(!lists[v].length)continue;const R=mulberry(v*53+11),B=Bld();const bark='#5b4632';
    B.cyl(.9,1.6,16,6,0,8,0,bark);const nb=3+(R()*2|0),tops=[];for(let b=0;b<nb;b++){const a=b/nb*6.28+R()*.6,lean=.55+R()*.25,L=10+R()*6;const bx=Math.cos(a)*Math.sin(lean)*L/2,bz=Math.sin(a)*Math.sin(lean)*L/2,by=16+Math.cos(lean)*L/2;B.cyl(.45,.75,L,5,bx,by,bz,bark,Math.sin(a)*lean,0,-Math.cos(a)*lean);tops.push([bx*2,16+Math.cos(lean)*L,bz*2]);}
    for(const [tx,ty,tz] of tops)for(let q=0;q<7;q++){const g=new THREE.IcosahedronGeometry(3+R()*2.6,1);const gp=g.attributes.position;for(let vi=0;vi<gp.count;vi++){const ph=q*1.7+tx;const j=1+.22*Math.sin(gp.getX(vi)*1.9+ph)*Math.cos(gp.getZ(vi)*2.3-ph)+.12*Math.sin(gp.getY(vi)*3.1+ph);gp.setXYZ(vi,gp.getX(vi)*j,gp.getY(vi)*j,gp.getZ(vi)*j);}g.scale(1.45,.5,1.45);const c=new THREE.Color().setHSL(.17+R()*.07,.3+R()*.14,.13+R()*.07);const qa=R()*6.28,qd=q?2+R()*6:0;parts_add(B,g,tx+Math.cos(qa)*qd,ty+.5+R()*2.6-qd*.12,tz+Math.sin(qa)*qd,c);}
    const g=B.geo().toNonIndexed();g.computeVertexNormals();smoothNorm(g);{const cn=g.attributes.normal,cc=g.attributes.color;if(cc)for(let vi=0;vi<cc.count;vi++){const r=cc.getX(vi),gg=cc.getY(vi),bb=cc.getZ(vi);if(gg>r*1.05&&gg>bb){const ny=cn.getY(vi);const k=ny<-.2?.55:ny>.6?1.12:.85;cc.setXYZ(vi,r*k,gg*k,bb*k*(ny>.6?.9:1));const nx=cn.getX(vi),nz=cn.getZ(vi),L=Math.hypot(nx,ny+.9,nz)||1;cn.setXYZ(vi,nx/L,(ny+.9)/L,nz/L);}}}const tm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:false});weather(tm,.35);{const ob=tm.onBeforeCompile;tm.onBeforeCompile=sh=>{ob(sh);if(window.WINDU){sh.uniforms.wt=WINDU;sh.fragmentShader=sh.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\n');sh.fragmentShader=sh.fragmentShader.replace('float dh=1.-smoothstep','if(diffuseColor.g>diffuseColor.r*1.02&&vWP.y>14.){float lf=wn(vWP*.95)*.55+wn(vWP*2.6)*.45;diffuseColor.rgb*=.62+.62*smoothstep(.28,.72,lf);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,1.05,.78),smoothstep(.55,.8,wn(vWP*.31+3.1))*.6);}float dh=1.-smoothstep');sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float wt;').replace('#include <begin_vertex>','#include <begin_vertex>\n{vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);float k=max(transformed.y-12.,0.)/20.;transformed.x+=sin(wt*.9+ip.x*.013)*k*k*1.2;transformed.z+=cos(wt*.7+ip.z*.011)*k*k*.6;}');}};tm.customProgramCacheKey=()=>'wxtree';}const im=new THREE.InstancedMesh(g,tm,lists[v].length);
    lists[v].forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y)-.5,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s*1.05,s*(.85+((i*7)%5)*.07),s*1.05));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.receiveShadow=true;WORLD.add(im);}
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

