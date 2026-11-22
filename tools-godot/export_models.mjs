// Lane X1 (model export): the OLD JS game exports its own art for the Godot edition.
//
//   node tools-godot/export_models.mjs [--js /home/user/jsfinal] [--nations IR,RS,...] [--kinds tank,inf,...]
//                                       [--out godot] [--embed] [--merge] [--hi all|inf|none]
//
// Loads the final JS game (branch js-final, built index.html) in headless Chromium, and for every playable
// nation x every unit kind (BASE) and building kind (STRUCT) calls the game's OWN builder (makeObj -> modelFor /
// bldModel / code-built kits, paint, scale) with a real sim entity (addUnit / addBld). The finished THREE.Object3D
// is cleaned (runtime-only helpers removed and recorded as flags), exported with three r186's GLTFExporter as .glb,
// de-duplicated by content hash and written to <out>/models/auto/. Textures are written once each to
// <out>/models/auto/tex/<hash>.webp and referenced by uri (shared between glbs; --embed keeps them inside each glb).
// The manifest <out>/data/models.json lists, per nation and kind, the file and everything the drawing code needs.
//
// Needs: playwright (pre-installed) and three@0.186.0's GLTFExporter (found in node_modules or fetched with npm
// into tools-godot/out/x1-three). No frames are rendered (software GL is slow); only scene objects are built.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {execSync} from 'node:child_process';
const HERE=path.dirname(fileURLToPath(import.meta.url)),REPO=path.resolve(HERE,'..');
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n);return i<0?d:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true);};
const JS=path.resolve(arg('js','/home/user/jsfinal')),OUT=path.resolve(REPO,arg('out','godot')),AUTO=path.join(OUT,'models','auto'),TEX=path.join(AUTO,'tex');
const EMBED=!!arg('embed',false),MERGE=!!arg('merge',false),HI=arg('hi','inf'),ONLYN=arg('nations',''),ONLYK=arg('kinds','');
const MANIFEST=path.join(OUT,'data','models.json');
const r=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/node-tools/node_modules/playwright','/opt/npm-tools/node_modules/playwright']){try{pw=r(p);break;}catch{}}
if(!pw)throw new Error('playwright not found');
// ---- three r186 GLTFExporter, rewritten from an ES module to use the page's global THREE
function exporterSource(){const rel='three/examples/jsm/exporters/GLTFExporter.js';let f=null;
  for(const base of [process.env.THREE_DIR,path.join(HERE,'out','x1-three','node_modules'),path.join(REPO,'node_modules')]){if(base&&fs.existsSync(path.join(base,rel))){f=path.join(base,rel);break;}}
  if(!f){const d=path.join(HERE,'out','x1-three');fs.mkdirSync(d,{recursive:true});if(!fs.existsSync(path.join(d,'package.json')))fs.writeFileSync(path.join(d,'package.json'),'{"private":true}');
    execSync('npm i --no-audit --no-fund three@0.186.0',{cwd:d,stdio:'ignore'});f=path.join(d,'node_modules',rel);}
  let s=fs.readFileSync(f,'utf8');const pk=JSON.parse(fs.readFileSync(path.join(path.dirname(f),'..','..','..','package.json'),'utf8'));
  if(pk.version!=='0.186.0')throw new Error('GLTFExporter must be three 0.186.0, found '+pk.version);
  s=s.replace(/import\s*\{([^}]+)\}\s*from\s*'three';/,(m,a)=>'const {'+a+'}=THREE;').replace(/export\s*\{\s*GLTFExporter\s*\};?/,'THREE.GLTFExporter=GLTFExporter;');
  if(/^\s*import\s/m.test(s))throw new Error('GLTFExporter has more imports than expected');return '(()=>{'+s+'})();';}
// ---- static server for the JS game
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.gz':'application/gzip','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{const f=path.join(JS,decodeURIComponent(new URL(q.url,'http://x').pathname));if(!f.startsWith(JS)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(x=>srv.listen(0,'127.0.0.1',x));
const br=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await (await br.newContext({viewport:{width:640,height:400}})).newPage();
pg.on('pageerror',e=>console.log('PAGE ERR',String(e.message).slice(0,300)));
pg.on('console',m=>{const t=m.text();if(/^X1 /.test(t))console.log(t.slice(0,400));});
await pg.route('**/*',q=>q.request().url().startsWith('http://127.0.0.1')?q.continue():q.abort());
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?lazy=1`,{waitUntil:'load',timeout:120000});
await pg.waitForFunction(()=>typeof MODELS!=='undefined'&&MODELS.ready,null,{timeout:240000});
await pg.addScriptTag({content:exporterSource()});

// ---- glb post-processing on the Node side: textures out to shared files, content hash, de-duplication
fs.mkdirSync(TEX,{recursive:true});fs.mkdirSync(path.dirname(MANIFEST),{recursive:true});
const sha=b=>crypto.createHash('sha1').update(b).digest('hex');
const written=new Map();/* hash -> file name */const texSeen=new Map();let bytesGlb=0,bytesTex=0;
function splitGlb(buf){const jl=buf.readUInt32LE(12),json=JSON.parse(buf.subarray(20,20+jl).toString('utf8'));let bin=Buffer.alloc(0);if(20+jl<buf.length){const bl=buf.readUInt32LE(20+jl);bin=buf.subarray(28+jl,28+jl+bl);}return{json,bin};}
function joinGlb(json,bin){let js=Buffer.from(JSON.stringify(json),'utf8');const jp=(4-js.length%4)%4;if(jp)js=Buffer.concat([js,Buffer.alloc(jp,0x20)]);const bp=(4-bin.length%4)%4;if(bp)bin=Buffer.concat([bin,Buffer.alloc(bp)]);
  const hasBin=bin.length>0,total=12+8+js.length+(hasBin?8+bin.length:0),out=Buffer.alloc(total);out.writeUInt32LE(0x46546C67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);out.writeUInt32LE(js.length,12);out.writeUInt32LE(0x4E4F534A,16);js.copy(out,20);
  if(hasBin){out.writeUInt32LE(bin.length,20+js.length);out.writeUInt32LE(0x004E4942,24+js.length);bin.copy(out,28+js.length);}return out;}
// move embedded images to tex/<hash>.<ext> (one file per distinct picture) and drop their bytes from the BIN chunk
function externalize(buf){const {json,bin}=splitGlb(buf);if(!json.images||!json.images.length)return{buf,tex:[]};const drop=new Set(),tex=[];
  for(const im of json.images){if(im.bufferView==null)continue;const bv=json.bufferViews[im.bufferView],bytes=bin.subarray(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength),ext={'image/webp':'webp','image/png':'png','image/jpeg':'jpg'}[im.mimeType]||'bin';
    const h=sha(bytes).slice(0,12),name=h+'.'+ext;if(!texSeen.has(name)){fs.writeFileSync(path.join(TEX,name),bytes);texSeen.set(name,bytes.length);bytesTex+=bytes.length;}drop.add(im.bufferView);delete im.bufferView;im.uri='tex/'+name;tex.push(name);}
  const map=new Map(),views=[],parts=[];let off=0;json.bufferViews.forEach((bv,i)=>{if(drop.has(i))return;const b=bin.subarray(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength),pad=(4-off%4)%4;if(pad){parts.push(Buffer.alloc(pad));off+=pad;}map.set(i,views.length);views.push(Object.assign({},bv,{byteOffset:off}));parts.push(b);off+=b.length;});
  const nb=Buffer.concat(parts);json.bufferViews=views;for(const a of json.accessors||[])if(a.bufferView!=null)a.bufferView=map.get(a.bufferView);for(const s of json.skins||[])void s;
  if(json.buffers&&json.buffers[0])json.buffers[0].byteLength=nb.length+((4-nb.length%4)%4);return{buf:joinGlb(json,nb),tex};}
function store(b64,hint){let buf=Buffer.from(b64,'base64'),tex=[];if(!EMBED){const x=externalize(buf);buf=x.buf;tex=x.tex;}const h=sha(buf);let f=written.get(h);
  if(!f){f=hint.replace(/[^a-z0-9_]+/gi,'_')+'_'+h.slice(0,8)+'.glb';fs.writeFileSync(path.join(AUTO,f),buf);written.set(h,f);bytesGlb+=buf.length;}return{file:f,bytes:buf.length,tex};}
await pg.exposeFunction('__x1store',(b64,hint)=>store(b64,hint));

// ---- page side ------------------------------------------------------------------------------------------------
function PAGE(){
  const X=window.__X1={geo:new WeakMap(),mat:new Map(),atlas:new Map(),log:[]};
  const STD=['position','normal','uv','uv1','color','skinIndex','skinWeight'];
  // runtime instancing helpers of the game become plain named nodes here (recorded in the manifest, not exported)
  window.decal=(k,c)=>{const m=new THREE.Object3D();m.name='decal_'+k;m.userData.decal=k;if(c)m.userData.dc='#'+(c.isColor?c.getHexString():new THREE.Color(c).getHexString());return m;};
  // the game folds a model's plain-coloured parts into one mesh per painted nation (mergeTinted) and an aircraft's static parts into
  // one mesh per unit (staticMerge): draw-call savers that bake the paint into the vertices. Off here, so the paint stays in the
  // material colour and every nation shares the same shape files; the Godot side merges again at load (x1_models.gd).
  try{mergeTinted=function(){};}catch(e){window.mergeTinted=function(){};}try{staticMerge=null;}catch(e){window.staticMerge=null;}
  let seed=1;const rnd0=Math.random;X.seed=s=>{seed=s>>>0||1;};Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};X.rnd0=rnd0;
  const hex=c=>c&&c.isColor?'#'+c.getHexString():null,r3=v=>+(+v).toFixed(3),v3=v=>[r3(v.x),r3(v.y),r3(v.z)];
  // float, standard-attribute copy of a geometry (the game's models are quantised/interleaved; its batches add custom attributes)
  X.stdGeo=g=>{let o=X.geo.get(g);if(o)return o;o=new THREE.BufferGeometry();
    for(const n of STD){const a=g.attributes[n];if(!a)continue;const is=a.itemSize,cnt=a.count;
      if(n==='skinIndex'){const A=new Uint16Array(cnt*4);for(let i=0;i<cnt;i++)for(let k=0;k<4;k++)A[i*4+k]=a.getComponent(i,k);o.setAttribute(n,new THREE.BufferAttribute(A,4));continue;}
      const A=new Float32Array(cnt*is);for(let i=0;i<cnt;i++)for(let k=0;k<is;k++)A[i*is+k]=a.getComponent(i,k);
      if(n==='normal'){for(let i=0;i<cnt;i++){const x=A[i*3],y=A[i*3+1],z=A[i*3+2],l=Math.hypot(x,y,z)||1;A[i*3]=x/l;A[i*3+1]=y/l;A[i*3+2]=z/l;}}
      if(n==='skinWeight'){for(let i=0;i<cnt;i++){const s=A[i*4]+A[i*4+1]+A[i*4+2]+A[i*4+3]||1;for(let k=0;k<4;k++)A[i*4+k]/=s;}}
      o.setAttribute(n,new THREE.BufferAttribute(A,is));}
    if(g.index){const ix=g.index,n=ix.count,A=(o.attributes.position.count>65535)?new Uint32Array(n):new Uint16Array(n);for(let i=0;i<n;i++)A[i]=ix.getX(i);o.setIndex(new THREE.BufferAttribute(A,1));}
    if(!o.attributes.normal)o.computeVertexNormals();
    if(!o.index&&!o.attributes.skinIndex)X.weld(o);
    if(g.groups&&g.groups.length)for(const q of g.groups)o.addGroup(q.start,q.count,q.materialIndex);
    X.geo.set(g,o);return o;};
  const tris=g=>Math.round((g.index?g.index.count:g.attributes.position.count)/3);
  // code-built geometry comes unindexed (3 vertices per triangle): join identical vertices, about a third of the bytes
  X.weld=o=>{const names=Object.keys(o.attributes),at=names.map(n=>o.attributes[n]),cnt=o.attributes.position.count,views=at.map(a=>new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length)),sz=at.map(a=>a.itemSize);
    const map=new Map(),idx=new Uint32Array(cnt),keep=[];for(let i=0;i<cnt;i++){let k='';for(let a=0;a<at.length;a++){const v=views[a],n=sz[a],b=i*n;for(let q=0;q<n;q++)k+=v[b+q].toString(36)+',';}let j=map.get(k);if(j===undefined){j=keep.length;map.set(k,j);keep.push(i);}idx[i]=j;}
    if(keep.length>cnt*.9)return;const n2=keep.length;names.forEach((n,a)=>{const src=at[a].array,is=sz[a],A=new Float32Array(n2*is);for(let j=0;j<n2;j++)for(let q=0;q<is;q++)A[j*is+q]=src[keep[j]*is+q];o.setAttribute(n,new THREE.BufferAttribute(A,is));});
    o.setIndex(new THREE.BufferAttribute(n2>65535?idx:new Uint16Array(idx),1));};
  X.hash=u8=>{let a=0x811c9dc5,b=0x1234567;for(let i=0;i<u8.length;i++){const c=u8[i];a=Math.imul(a^c,16777619);b=Math.imul(b+c,0x5bd1e995)^(b>>>13);}return(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');};
  X.geoHash=g=>{if(g.__h)return g.__h;let h='';for(const n of Object.keys(g.attributes).sort()){const a=g.attributes[n].array;h+=n+X.hash(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));}if(g.index){const a=g.index.array;h+='i'+X.hash(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));}h+=JSON.stringify(g.groups||[]);Object.defineProperty(g,'__h',{value:X.hash(new TextEncoder().encode(h)),enumerable:false});return g.__h;};
  // export copy of a material: the plain PBR values + what the game's shader patches add at runtime (as small extras)
  X.stdMat=(m,meta)=>{if(!m)return m;let e=X.mat.get(m.uuid);if(e){if(meta&&e.userData.x1)meta.push(e.userData.x1);return e;}
    const ud=m.userData||{},x={};if(ud.camoA&&ud.camoP!=null){x.camo={a:hex(ud.camoA),b:hex(ud.camoB),c:hex(ud.camoC),pattern:ud.camoP,scale:ud.camoS||1};}
    if(ud.wx)x.weather=1;if(ud.look)x.look=ud.look;if(ud.refl)x.refl=ud.refl;if(ud.wk)x.wake=ud.wk;if(ud.trimC)x.trim=hex(ud.trimC);if(ud.wall)x.wall=ud.wall;
    if(m.isMeshStandardMaterial||m.isMeshBasicMaterial){e=m.clone();e.onBeforeCompile=()=>{};e.customProgramCacheKey=()=>'';if(e.envMap)e.envMap=null;}
    else{e=new THREE.MeshStandardMaterial({color:m.color?m.color.clone():new THREE.Color(1,1,1),map:m.map||null,vertexColors:!!m.vertexColors,transparent:!!m.transparent,opacity:m.opacity==null?1:m.opacity,side:m.side,roughness:.85,metalness:0});x.from=m.type;}
    if(e.map){e.map.userData=e.map.userData||{};e.map.userData.mimeType='image/webp';}
    for(const k of ['normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','bumpMap','alphaMap','lightMap'])if(e[k]){if(k==='normalMap'||k==='emissiveMap'){e[k].userData=e[k].userData||{};e[k].userData.mimeType='image/webp';}else e[k]=null;}
    e.name=m.name||('mat'+X.mat.size);x.name=e.name;x.color=hex(e.color);if(e.map)x.map=1;if(e.vertexColors)x.vertexColors=1;if(e.transparent)x.alpha=r3(e.opacity);
    e.userData=Object.keys(x).length>2?{x1:x}:{};e.userData.x1=x;X.mat.set(m.uuid,e);if(meta)meta.push(x);return e;};
  X.b64=buf=>{const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s);};
  X.glb=(root,anims)=>new Promise((ok,no)=>new THREE.GLTFExporter().parse(root,ok,no,{binary:true,onlyVisible:true,maxTextureSize:1024,animations:anims||[],includeCustomExtensions:false}));
  // ---- clean one finished game object for export; returns what was stripped (flags for the drawing lane)
  X.prep=(o,opt)=>{opt=opt||{};const info={parts:{},runtime:[],materials:[],hidden:[]};o.position.set(0,0,0);o.rotation.set(0,0,0);o.updateMatrixWorld(true);
    const inv=new THREE.Matrix4().copy(o.matrixWorld).invert(),lp=n=>new THREE.Vector3().setFromMatrixPosition(n.matrixWorld).applyMatrix4(inv),ws=n=>{const s=new THREE.Vector3();n.getWorldScale(s);return s;};
    const P=o.userData.parts||{},pn=new Map();for(const k in P){const n=P[k];if(!n||!n.isObject3D)continue;if(!pn.has(n))pn.set(n,k);}
    const partOf=n=>{for(let q=n;q&&q!==o;q=q.parent)if(pn.has(q))return pn.get(q);return null;};
    const kill=[],swap=[];
    o.traverse(n=>{if(n===o)return;const ud=n.userData||{};
      if(ud.decal||/^decal_/.test(n.name)){info.runtime.push({t:'decal',k:ud.decal||n.name.slice(6),pos:v3(lp(n)),scale:v3(ws(n)),color:ud.dc||null,part:partOf(n)});kill.push(n);return;}
      if(n.name==='kitInst'&&ud.kid){const S=DECAL.sets['kit:'+ud.kid];if(S&&S.geo)swap.push([n,S]);else kill.push(n);return;}
      if(n.isLine||n.isLineSegments||n.isPoints||n.isSprite){info.runtime.push({t:n.isSprite?'sprite':'lines',name:n.name||pn.get(n)||'',pos:v3(lp(n)),scale:v3(ws(n)),part:partOf(n)});kill.push(n);return;}
      if(n.isLight){info.runtime.push({t:'light',color:hex(n.color),intensity:r3(n.intensity),dist:r3(n.distance||0),pos:v3(lp(n))});kill.push(n);return;}
      if(n.isMesh){const ms=Array.isArray(n.material)?n.material:[n.material];if(ms.some(m=>m&&(m.isShaderMaterial||m.isRawShaderMaterial))){info.runtime.push({t:'shaderMesh',name:n.name||n.parent&&n.parent.name||'',pos:v3(lp(n)),scale:v3(ws(n)),part:partOf(n),additive:ms[0].blending===THREE.AdditiveBlending?1:0});kill.push(n);return;}
        if(n.isInstancedMesh){info.runtime.push({t:'instancedMesh',name:n.name||'',count:n.count});kill.push(n);return;}}
      if(n.name==='soldierLo'&&!opt.keepLo){kill.push(n);return;}
      if(!n.visible){if(pn.has(n)){n.visible=true;info.hidden.push(pn.get(n));}else if(!(n.name==='soldierLo'&&opt.keepLo)){info.runtime.push({t:'hiddenNode',name:n.name||n.type});kill.push(n);}}});
    for(const n of kill)if(n.parent)n.parent.remove(n);
    for(const [n,S] of swap){const km=S.mat&&(S.mat.isMeshStandardMaterial||S.mat.isMeshBasicMaterial)?S.mat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.05});const m=new THREE.Mesh(S.geo,km);m.name='kit';n.add(m);info.kit=1;}
    // names: animated parts get their part key, everything else keeps its own name
    for(const [n,k] of pn){if(n.parent||n===o){info.parts[k]={node:k,was:n.name||''};n.name=k;}}
    for(const k in P){const n=P[k];if(n&&n.isObject3D&&pn.get(n)!==k&&info.parts[pn.get(n)])info.parts[k]={node:pn.get(n)};}
    // drop empty branches (helpers left behind), keep part nodes
    const prune=n=>{for(const c of n.children.slice())prune(c);if(n!==o&&!n.isMesh&&!n.isBone&&!n.children.length&&!pn.has(n)&&n.parent)n.parent.remove(n);};prune(o);
    let t=0;const seen=new Set();o.traverse(n=>{if(n.isMesh){n.geometry=X.stdGeo(n.geometry);t+=tris(n.geometry);const mm=[];n.material=Array.isArray(n.material)?n.material.map(m=>X.stdMat(m,mm)):X.stdMat(n.material,mm);for(const x of mm)if(!seen.has(x)){seen.add(x);info.materials.push(x);}n.frustumCulled=true;}
      n.userData={};n.onBeforeRender=()=>{};});
    o.traverse(n=>{if(n.isMesh){const ms=Array.isArray(n.material)?n.material:[n.material];for(const m of ms){const x=m.userData.x1;m.userData=x&&Object.keys(x).length?{x1:x}:{};}}});
    o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(o);info.tris=t;info.bbox=isFinite(bb.min.x)?{min:v3(bb.min),max:v3(bb.max)}:null;return info;};
  // optional: fold every static mesh under each animated part into one mesh per material (fewer nodes for MultiMesh use)
  X.err=e=>String(e&&e.message||e)+' @ '+String(e&&e.stack||'').split('\n').slice(1,3).join(' | ').slice(0,260);
  // ---- start a (never rendered) battle for one nation so every game function sees a complete G
  X.nation=async fac=>{const other=fac==='US'?'RU':'US';newGame({seed:7,facs:[fac,other],ai:[false,true],map:Object.keys(MAPS)[0],tm:[0,1],slot:-1,battle:1});
    await modelsFor([fac],()=>{},600000);mats();if(typeof SCN==='undefined'||!SCN)SCN=new THREE.Group();G.t=G.t||0;
    const T=G.teams[0],F=FACTIONS[fac];return{name:F.name,color:T.color,morale:(typeof MORALE_STYLE!=='undefined'&&MORALE_STYLE[fac])||null,roster:allUnits(fac),buildings:Object.keys(STRUCT).filter(k=>{try{return bldAllowed(fac,k);}catch(e){return true;}}),soldier:solKey(fac),failed:(MODELS.failed||[]).slice()};};
  const flagsOf=(o,e)=>{const ud=o.userData,f={};if(ud.model)f.model=1;if(ud.walker)f.walker=1;if(ud.cleric)f.cleric=1;if(ud.fakeOf)f.fakeOf=ud.fakeOf;if(ud.mixers&&ud.mixers.length)f.clips=1;return f;};
  const statOf=e=>{const s=e.s||{};const q={name:s.name||'',cls:s.cls||'',dom:s.dom||'',r:s.r||0};if(s.alt)q.alt=s.alt;if(s.from)q.from=s.from;if(s.fake)q.fake=s.fake;return q;};
  // ---- one static / rigid unit or building: every distinct mesh (shape + texture, WITHOUT its paint) is one small glb
  // shared by all nations and kinds; the look itself is a list of placed, painted mesh instances in the manifest
  X.meshFiles=new Map();X.animFiles=new Map();const lin=c=>c?[r3(c.r),r3(c.g),r3(c.b)]:[1,1,1],mat12=m=>{const e=m.elements,o=[];for(const i of [0,1,2,4,5,6,8,9,10,12,13,14])o.push(+e[i].toFixed(4));return o;},ID12='1,0,0,0,1,0,0,0,1,0,0,0';
  const shapeKey=m=>[m.type,m.map?m.map.uuid:'',m.normalMap?m.normalMap.uuid:'',m.emissiveMap?m.emissiveMap.uuid:'',m.vertexColors?1:0,m.transparent?1:0,m.side,m.alphaTest||0].join(':');
  X.meshFile=async(n,hint)=>{const ms=Array.isArray(n.material)?n.material:[n.material],key=X.geoHash(n.geometry)+'|'+ms.map(shapeKey).join('|');let f=X.meshFiles.get(key);if(f)return f;
    const fm=ms.map(m=>{const c=m.clone();if(c.color)c.color.setRGB(1,1,1);c.opacity=1;if(c.emissive)c.emissive.setRGB(0,0,0);c.roughness=c.roughness==null?1:.8;c.metalness=0;c.userData={};c.name=m.name;return c;});
    const mesh=new THREE.Mesh(n.geometry,Array.isArray(n.material)?fm:fm[0]);mesh.name='mesh';const buf=await X.glb(mesh,[]);const st=await __x1store(X.b64(buf),'m_'+hint);
    f={file:st.file,bytes:st.bytes,tex:st.tex,tris:tris(n.geometry)};X.meshFiles.set(key,f);return f;};
  X.rigid=async(o,hint,e)=>{const P=o.userData.parts||{};if(o.userData.model&&P.body&&P.body.isGroup)for(const m of P.body.children)if(m.userData&&m.userData.inner)m.rotation.y=0;   /* the per-unit random turn of the model (+-0.15 rad) is a runtime effect */
    const fl=flagsOf(o,e),sc=o.scale.x;let anims=[];if(o.userData.mixers)for(const mx of o.userData.mixers)for(const a of mx.anims||[])if(!anims.includes(a))anims.push(a);
    const pn=new Map();for(const k in P){const n=P[k];if(n&&n.isObject3D&&!pn.has(n))pn.set(n,k);}
    if(anims.length){const info=X.prep(o);if(!info.tris)return{err:'empty object'};const buf=await X.glb(o,anims);const st=await __x1store(X.b64(buf),hint);return Object.assign({file:st.file,bytes:st.bytes,tex:st.tex,scale:r3(sc),anims:anims.map(a=>a.name)},fl,info);}
    const info=X.prep(o);if(!info.tris)return{err:'empty object'};o.updateMatrixWorld(true);
    const partOf=n=>{for(let q=n;q;q=q.parent){if(pn.has(q)&&q.parent)return q;if(q===o)return null;}return null;},M=new THREE.Matrix4(),inv=new THREE.Matrix4();
    const rel=(n,to)=>{if(!to)return mat12(M.copy(inv.copy(o.matrixWorld).invert()).multiply(n.matrixWorld));return mat12(M.copy(inv.copy(to.matrixWorld).invert()).multiply(n.matrixWorld));};
    const parts={};for(const [n,k] of pn){if(!n.parent&&n!==o)continue;if(n===o)continue;const up=partOf(n.parent);parts[k]={parent:up?pn.get(up):null,m:rel(n,up)};if(info.parts[k]&&info.parts[k].was)parts[k].was=info.parts[k].was;}
    for(const k in info.parts)if(!parts[k]&&info.parts[k].node!==k&&parts[info.parts[k].node])parts[k]={same:info.parts[k].node};
    const meshes=[];const list=[];o.traverse(n=>{if(n.isMesh)list.push(n);});
    for(const n of list){const f=await X.meshFile(n,hint),pp=partOf(n),ms=Array.isArray(n.material)?n.material:[n.material],I={f:f.file};if(pp)I.p=pn.get(pp);const m=rel(n,pp);if(m.join(',')!==ID12)I.m=m;
      I.mat=ms.map(q=>{const x=Object.assign({},q.userData.x1||{});const r={c:lin(q.color)};if(q.transparent&&q.opacity<1)r.a=r3(q.opacity);if(q.roughness!=null)r.r=r3(q.roughness);if(q.metalness)r.mt=r3(q.metalness);if(q.emissive&&(q.emissive.r+q.emissive.g+q.emissive.b)>0)r.e=lin(q.emissive).map(v=>r3(v*(q.emissiveIntensity==null?1:q.emissiveIntensity)));if(q.isMeshBasicMaterial)r.unlit=1;if(q.side===THREE.DoubleSide)r.ds=1;
        if(x.camo)r.camo=x.camo;if(x.look)r.look=x.look;if(x.refl)r.refl=x.refl;if(x.wake)r.wake=x.wake;if(x.trim)r.trim=x.trim;return r;});meshes.push(I);}
    return Object.assign({meshes,parts,scale:r3(sc),tris:info.tris,bbox:info.bbox,runtime:info.runtime,hidden:info.hidden,anims:[]},fl,info.kit?{kit:1}:{});};
  // ---- soldiers: the game poses them in code (walkPose/postApply), so the clips are baked from those same functions
  const nextPow2=n=>{let p=1;while(p<n)p*=2;return p;};
  // the merged soldier takes gear colours from the vertex colour where uv.x<-2 (a shader patch): give those vertices a
  // white texel instead (texture drawn top-left into a larger white canvas, body uvs scaled) so ONE plain material works
  X.solAtlas=tex=>{let A=X.atlas.get(tex.uuid);if(A)return A;const im=tex.image,w=im.width,h=im.height,W=Math.min(1024,nextPow2(Math.max(w,h)+8));
    if(W<Math.max(w,h)+8){A={tex,sx:1,sy:1,split:true};X.atlas.set(tex.uuid,A);return A;}
    const c=document.createElement('canvas');c.width=c.height=W;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,W);x.drawImage(im,0,0,w,h);
    const t=new THREE.CanvasTexture(c);t.flipY=false;t.colorSpace=tex.colorSpace;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.userData={mimeType:'image/webp'};t.name=(tex.name||'soldier')+'_atlas';
    A={tex:t,sx:w/W,sy:h/W,wu:(w+W)/2/W,wv:(h+W)/2/W};X.atlas.set(tex.uuid,A);return A;};
  X.solGeo=(g,A)=>{const key='sol|'+(A.tex.uuid);g.userData.x1=g.userData.x1||{};if(g.userData.x1[key])return g.userData.x1[key];const o=X.stdGeo(g).clone();const uv=o.attributes.uv;let bad=0;
    if(uv){for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i);if(u<-2){uv.setXY(i,A.wu||0,A.wv||0);}else{if(u<-.001||u>1.001||v<-.001||v>1.001)bad++;uv.setXY(i,u*A.sx,v*A.sy);}}}
    o.userData={};X.geo.set(o,o);g.userData.x1[key]=o;o.__bad=bad;return o;};
  const SOLJ=['uL','uR','lL','lR','hip','sp','ch','fL','fR'];
  X.bake=(root,m,W)=>{const J=SOLJ.map(k=>W[k]).filter(Boolean),e0={id:0,x:0,y:0,va:0};
    const rest=()=>{for(const j of J)j.b.quaternion.copy(j.q0);m.position.set(0,0,0);m.rotation.set(0,0,0);};
    const snap=()=>({q:J.map(j=>j.b.quaternion.toArray()),p:m.position.toArray(),r:new THREE.Quaternion().setFromEuler(m.rotation).toArray()});
    let sig='';const still=(v,n,r0)=>{for(let i=0;i<v.length;i++)if(Math.abs(v[i]-r0[i%n])>1e-5)return false;return true;};
    const clip=(name,dur,fr)=>{const n=fr.length,times=fr.map((f,i)=>n>1?dur*i/(n-1):0),tr=[];sig+=name+dur.toFixed(4);
      J.forEach((j,k)=>{const v=[];for(const f of fr)v.push(...f.q[k]);if(still(v,4,j.q0.toArray()))return;sig+=j.b.name+v.map(x=>x.toFixed(4)).join(',');tr.push(new THREE.QuaternionKeyframeTrack(j.b.uuid+'.quaternion',times,v));});
      {const v=[];for(const f of fr)v.push(...f.p);if(!still(v,3,[0,0,0])||!tr.length){sig+='P'+v.map(x=>x.toFixed(4)).join(',');tr.push(new THREE.VectorKeyframeTrack(m.uuid+'.position',times,v));}}
      {const v=[];for(const f of fr)v.push(...f.r);if(!still(v,4,[0,0,0,1])){sig+='R'+v.map(x=>x.toFixed(4)).join(',');tr.push(new THREE.QuaternionKeyframeTrack(m.uuid+'.quaternion',times,v));}}
      return new THREE.AnimationClip(name,dur,tr);};
    m.userData.legs=W;const out=[],meta={};
    rest();out.push(clip('idle',1,[snap(),snap()]));
    for(const [name,ga,gs,run,spd,N] of [['walk',.38,.5,0,12,12],['run',.48,.21,1,42,12]]){const fr=[];for(let i=0;i<=N;i++){rest();const y=walkPose(m,(i/N)%1,1,ga,gs,run,0);m.position.y=y;fr.push(snap());}
      const dist=gSweep(W,ga,run)/gs;out.push(clip(name,dist/spd,fr));meta[name]={cycleDist:r3(dist),speed:spd,loop:1};}
    const post=(ps,at,ak)=>{rest();const ud={legs:W,ps,at:at||0,ak:ak||0,gth:1,gth2:1,bz:0};postApply(m,ud,e0,0,0,ps,false,false);return snap();};
    {const fr=[];for(let i=0;i<=4;i++)fr.push(post(.5*i/4));out.push(clip('crouch',.35,fr));meta.crouch={hold:1};}
    {const fr=[];for(let i=0;i<=8;i++)fr.push(post(i/8));out.push(clip('prone',.7,fr));meta.prone={hold:1};}
    {const fr=[];for(let i=0;i<=8;i++)fr.push(post(0,.9*(1-i/8)+1e-6,1));fr[8]=(rest(),snap());out.push(clip('reload',.9,fr));}
    {const fr=[];for(let i=0;i<=12;i++)fr.push(post(0,1.15*(1-i/12)+1e-6,2));fr[12]=(rest(),snap());out.push(clip('grenade',1.15,fr));}
    {const fr=[];for(let i=0;i<=4;i++){rest();const t=.4*i/4;m.rotation.x=-Math.min(1.5,t*5);m.position.y=-Math.min(1.2,t*3)*.5;fr.push(snap());}out.push(clip('die',.4,fr));meta.die={hold:1,note:'the game removes the body after 6 s'};}
    rest();let pathSig='';for(let q=m;q;q=q.parent)pathSig+='/'+q.name;for(const j of J){let q=j.b,ps='';for(;q&&q!==m;q=q.parent)ps=q.name+'/'+ps;pathSig+='|'+ps;}return{clips:out,meta,sig:X.hash(new TextEncoder().encode(sig+pathSig))};};
  X.memberKey=(e,m,i)=>{const px=m.position.z,pz=-m.position.x;if(m.userData.ldr)return'ldr';if(e.kind==='spy')return'v0';return'v'+(Math.abs((e.id*31+Math.round(px*3)*17+Math.round(pz*5)*7)|0)%4);};
  X.soldierFile=async(m,yawRot,hint,lod)=>{const W=m.userData.legs;let hi=null,lo=null;m.traverse(n=>{if(n.name==='soldier')hi=n;else if(n.name==='soldierLo')lo=n;});
    const root=new THREE.Group();root.name='soldier';root.rotation.y=yawRot;m.position.set(0,0,0);m.rotation.set(0,0,0);root.add(m);root.userData={parts:{pose:m}};
    if(!m.__x1){Object.defineProperty(m,'__x1',{value:{hi,lo,par:(hi||lo)&&(hi||lo).parent,W},enumerable:false});}hi=m.__x1.hi;lo=m.__x1.lo;const W1=m.__x1.W;const want=lod==='lo'&&lo?lo:(hi||lo);if(!want)return{err:'no skinned soldier mesh'};for(const q of [hi,lo])if(q&&q!==want&&q.parent)q.parent.remove(q);if(!want.parent)m.__x1.par.add(want);want.visible=true;want.name='soldier_mesh';
    let B=null;if(W1&&W1.uL){try{B=X.bake(root,m,W1);}catch(er){X.log.push('bake '+X.err(er));}}
    const srcMat=want.material,tex=srcMat&&srcMat.map,srcGeo=want.geometry;const info=X.prep(root,{});
    let bad=0;if(tex){const A=X.solAtlas(tex);if(!A.split){want.geometry=X.solGeo(srcGeo,A);bad=want.geometry.__bad|0;let mm=X.mat.get('sol|'+srcMat.uuid);if(!mm){mm=want.material.clone();mm.map=A.tex;mm.userData={};mm.name='soldier';X.mat.set('sol|'+srcMat.uuid,mm);X.mat.set(mm.uuid,mm);}want.material=mm;}else info.gearUvTrick=1;}
    const sk=want.skeleton;const buf=await X.glb(root,[]);const st=await __x1store(X.b64(buf),hint);let af=null;
    // the clips are the same for every look of one skeleton: written once, inside a copy of the first look that has them
    if(B){af=X.animFiles.get(B.sig);if(!af){const b2=await X.glb(root,B.clips);const s2=await __x1store(X.b64(b2),'sol_anim');af={file:s2.file,meta:B.meta,names:B.clips.map(c=>c.name)};X.animFiles.set(B.sig,af);}}
    return{file:st.file,bytes:st.bytes,tex:st.tex,tris:info.tris,bbox:info.bbox,bones:sk?sk.bones.length:0,animFile:af?af.file:null,anims:af?af.names:[],animMeta:af?af.meta:{},uvOut:bad,lod:want===lo?'lo':'hi'};};
  X.squad=async(e,o,hint,opt)=>{const P=o.userData.parts,yaw=P.body,fl=flagsOf(o,e),yr=yaw.rotation.y,members=yaw.children.slice(),lay=[],got={},files=[];
    members.forEach((m,i)=>{const k=X.memberKey(e,m,i);lay.push({x:r3(m.position.z),z:r3(-m.position.x),y:r3(m.position.y),look:k});});
    // more squads (other unit ids) until every wanted look has been seen
    const want=new Set(opt.looks||(opt.first?[lay[0].look]:lay.map(l=>l.look)));const pool=[[e,o,members]];let id=e.id;
    for(let tries=0;tries<40;tries++){const [E,O,M]=pool[pool.length-1];M.forEach((m,i)=>{const k=X.memberKey(E,m,i);if(want.has(k)&&!got[k])got[k]=m;});if([...want].every(k=>got[k]))break;
      const q=Object.create(e);q.id=++id;X.seed(99+id);let o2=null;try{o2=makeObj(q);}catch(er){break;}if(!o2||!o2.userData.parts||!o2.userData.parts.body)break;pool.push([q,o2,o2.userData.parts.body.children.slice()]);}
    const looks={};for(const k of Object.keys(got).sort()){const m=got[k];if(m.parent)m.parent.remove(m);const L={};
      if(opt.hi==='all'||(opt.hi&&k===Object.keys(got).sort()[0])){const r=await X.soldierFile(m,yr,'solhi_'+hint+'_'+k,'hi');L.hi=r;}
      {const r=await X.soldierFile(m,yr,'sol_'+hint+'_'+k,'lo');L.lo=r;}looks[k]=L;}
    // whatever is left on the unit besides the soldiers (mortar tube, machine gun...) is one static extra
    for(const m of yaw.children.slice())yaw.remove(m);const sc=o.scale.x;let extra=null,rt=[];{const r=await X.rigid(o,hint+'_extra',e);if(!r.err){extra={meshes:r.meshes,parts:r.parts,tris:r.tris,bbox:r.bbox};rt=r.runtime;}}
    return Object.assign({squad:lay,looks,extra,runtime:rt,scale:r3(sc)},fl);};
  X.unit=async(fac,kind,opt)=>{try{X.seed(1234);const e=addUnit(0,kind,620,620);if(!e)return{err:'addUnit gave nothing'};const o=makeObj(e);if(!o)return{err:'makeObj gave nothing'};const st=statOf(e);
      let r;if(o.userData.walker&&o.userData.parts&&o.userData.parts.body)r=await X.squad(e,o,kind,opt);else r=await X.rigid(o,kind,e);r.stat=st;if(MCFG[kind]&&MCFG[kind].size)r.size=r3(MCFG[kind].size);try{e.dead=true;const i=G.units.indexOf(e);if(i>=0)G.units.splice(i,1);}catch(_){ }return r;}catch(er){return{err:X.err(er)};}};
  X.bld=async(fac,kind)=>{try{X.seed(4321);let e=null;try{e=addBld(0,kind,700,700,true);}catch(er){}if(!e){const s=bstats(fac,kind);e={isB:true,kind,team:0,id:9000+Object.keys(STRUCT).indexOf(kind),x:700,y:700,hp:s.hp,max:s.hp,maxhp:s.hp,size:s.size,s,built:true};}
      const o=makeObj(e);if(!o)return{err:'makeObj gave nothing'};const r=await X.rigid(o,kind,e);r.footprint=r3(e.size);r.height=typeof BH!=='undefined'?BH[kind]:0;r.name=(e.s&&e.s.name)||'';try{const i=G.bases?G.bases.indexOf(e):-1;if(i>=0)G.bases.splice(i,1);}catch(_){ }return r;}catch(er){return{err:X.err(er)};}};

}
await pg.addScriptTag({content:'('+PAGE.toString()+')();'});
const T0=Date.now(),info=await pg.evaluate(()=>({rev:THREE.REVISION,exp:!!THREE.GLTFExporter,nations:FKEYS,units:Object.keys(BASE),blds:Object.keys(STRUCT)}));
if(!info.exp||info.rev!=='186')throw new Error('exporter/three mismatch '+JSON.stringify(info).slice(0,80));
const NATS=ONLYN?String(ONLYN).split(','):info.nations,UK=ONLYK?String(ONLYK).split(',').filter(k=>info.units.includes(k)):info.units,BK=ONLYK?String(ONLYK).split(',').filter(k=>info.blds.includes(k)):info.blds;
// keep earlier nations when only some are re-exported
let man={};if(fs.existsSync(MANIFEST)&&(ONLYN||ONLYK)){try{man=JSON.parse(fs.readFileSync(MANIFEST,'utf8'));}catch{}}
man._meta={made:'tools-godot/export_models.mjs (lane X1) from the JS game, branch js-final, three r'+info.rev,dir:'res://models/auto/',
  units:'JS game world units (a rifleman is about 16 tall, a tank about 40 long). +Y up, the unit FRONT is +X, origin on the ground under the unit centre. Buildings: origin at the footprint centre.',
  colours:'every colour here ("c", "e") is LINEAR rgb and may be above 1 (the game brightens some textures); convert to sRGB for a Godot albedo_color',
  rigid:'a unit/building that is not a squad = "meshes": [{f: shared shape file (one mesh, white material + its texture), p: animated part it belongs to (absent = fixed to the unit root), m: 3x4 matrix (12 numbers, column-major, relative to that part), mat:[per surface {c colour, a alpha, r roughness, mt metalness, e emissive, unlit, ds double-sided, camo/look/refl/wake/trim = runtime shader flags}]}], "parts": {name:{parent, m}} = the nodes the game moves (see partsDoc).',
  squad:'an infantry kind = "squad": soldier places in the unit frame (x forward, z right) with the look each one wears, "looks": {v0..v3|ldr: {lo: skinned low-detail soldier (what the game shows at the default zoom), hi: close-zoom soldier where exported}}, "extra": rigid meshes that belong to the unit (mortar tube...). Every soldier file is root "soldier" > "pose" (the clips move it: hip height, prone, death) > skeleton + one mesh "soldier_mesh". The clips live in "animFile" (same node paths: copy its AnimationLibrary).',
  clips:{idle:'rest pose',walk:'one stride, loop; play at speed/cycleDist cycles per second',run:'the jog every infantry unit uses at full speed, loop',crouch:'stand to crouch, hold the last frame',prone:'stand to prone, hold',reload:'chest bows to the rifle',grenade:'wind back and throw',die:'tips over backwards; the game removes the body after 6 s',fire:'none in the game: firing is a muzzle flash and tracer only'},
  partsDoc:{body:'the model itself (the game bobs / banks it)',turret:'turned toward the target (weapon mount, launcher rack)',gun:'building gun, turned toward the target',blades:'main rotor, spins about Y',tailR:'tail rotor, spins',tailR0:"the model's own tail rotor",rotor:'faint rotor disc',glow:'jet exhaust plumes (runtime shader; positions under runtime)',cargo:'supply-truck load, shown only when loaded',crane:'dozer arm / EW dish: swings or spins about Y',dish:'HQ radar dish, spins',radar:'spins about Y',flag:'cloth takes the team colour / nation flag',scaf:'construction scaffold (runtime lines)',tring:'team-colour ring under the unit (runtime decal)',eye:'spy marker (runtime)',da:'missile silo door',db:'missile silo door',missile:'strike missile, rises on launch'},
  runtime:'things the game adds at run time that a glb cannot carry, listed per look: {t:"decal",k:"ringV|ringS"} team-colour ring (colour = team), "blob" soft contact shadow, "lamp" headlight pool at night; "shaderMesh" (jet exhaust plume, additive); "lines" (scaffold); "hiddenNode" (shown later by the game: damage, night lights); material flags camo{a,b,c,pattern,scale} = procedural camouflage painted by the weathering shader over the base colour, look = surface class of the detail shader (metal/canvas/concrete/glass...), refl = sky reflection, wake = water wake/air haze class.',
  teamColour:'models were painted with the nation\'s own default team colour (_nation.color). The game mixes the team colour only faintly into the paint (6% or less on nation-painted vehicles, aircraft and soldiers; 16% on unpainted models, 10% on generic infantry); teams are told apart by the ring decal under each unit and the flags.',
  wrecks:'a destroyed vehicle is the same model with a burnt material (dark, heat glow fading) tilted a few degrees; buildings leave one of the three _map.rubble heaps scaled to the footprint',
  soldiersAtRuntime:'the JS game draws all soldiers of one look in one instanced batch with a bone texture (SOLB) and swaps to the low-detail mesh beyond camera distance 480; the default battle camera (560) shows the low-detail mesh.'};
for(const f of fs.readdirSync(AUTO))if(f.endsWith('.glb')){const b=fs.readFileSync(path.join(AUTO,f));written.set(sha(b),f);}
for(const f of fs.readdirSync(TEX))texSeen.set(f,fs.statSync(path.join(TEX,f)).size);
const VAR4=new Set(String(arg('var4','inf')).split(','));let pairs=0,fails=[];
for(const fac of NATS){const t0=Date.now(),N=await pg.evaluate(f=>__X1.nation(f),fac),E=(ONLYK&&man[fac])||{};E._nation=N;
  for(const kind of UK){const opt={hi:HI==='all'?'all':(HI==='inf'&&kind==='inf')||HI==='v0'?1:0,looks:VAR4.has(kind)?['v0','v1','v2','v3']:null,first:N.roster.includes(kind)?0:1};const r=await pg.evaluate(([f,k,o])=>__X1.unit(f,k,o),[fac,kind,opt]);r.type='unit';r.inRoster=N.roster.includes(kind)?1:0;E[kind]=r;if(r.err)fails.push(fac+'/'+kind+': '+r.err);else pairs++;}
  for(const kind of BK){const r=await pg.evaluate(([f,k])=>__X1.bld(f,k),[fac,kind]);r.type='building';r.allowed=N.buildings.includes(kind)?1:0;E[kind]=r;if(r.err)fails.push(fac+'/'+kind+': '+r.err);else pairs++;}
  man[fac]=E;fs.writeFileSync(MANIFEST,JSON.stringify(man));console.log(fac,'done in',((Date.now()-t0)/1000).toFixed(1)+'s','glbs',written.size,'tex',texSeen.size);}
const logs=await pg.evaluate(()=>__X1.log.slice(0,30));if(logs.length)console.log('page log:',logs.join('\n').slice(0,2000));
await br.close();srv.close();
let tb=0;for(const f of fs.readdirSync(AUTO))if(f.endsWith('.glb'))tb+=fs.statSync(path.join(AUTO,f)).size;let xb=0;for(const f of fs.readdirSync(TEX))xb+=fs.statSync(path.join(TEX,f)).size;
console.log(`pairs ok ${pairs}, failed ${fails.length}; glb files ${fs.readdirSync(AUTO).filter(f=>f.endsWith('.glb')).length} = ${(tb/1048576).toFixed(1)} MB, textures ${fs.readdirSync(TEX).length} = ${(xb/1048576).toFixed(1)} MB, ${((Date.now()-T0)/1000).toFixed(0)} s`);
if(fails.length)console.log('FAILED:\n'+fails.slice(0,40).join('\n'));
