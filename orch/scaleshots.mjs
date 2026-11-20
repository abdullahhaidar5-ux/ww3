// Scale shots (view only): a soldier standing next to each vehicle kind -> orch/shots/scale-<before|after>-<NATION>.jpg   node orch/scaleshots.mjs [before|after] [IR,US,RU,IN]
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'orch','shots');fs.mkdirSync(OUT,{recursive:true});
const r=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=r(p);break;}catch{}}
if(!pw)pw=await import('playwright');const cr=pw.chromium||pw.default.chromium;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.gz':'application/gzip'};
const srv=http.createServer((q,s)=>{const f=path.join(ROOT,decodeURIComponent(new URL(q.url,'http://x').pathname));if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(x=>srv.listen(0,'127.0.0.1',x));
const MODE=process.argv[2]||'after',N=(process.argv[3]||'IR,US,RU,IN').split(',');
const b=await cr.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await (await b.newContext({viewport:{width:1800,height:700}})).newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.route('**/*',q=>q.request().url().startsWith('http://127.0.0.1')?q.continue():q.abort());
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?lazy=1`,{waitUntil:'load',timeout:120000});
await pg.waitForFunction(()=>typeof MODELS!=='undefined'&&MODELS.ready,null,{timeout:240000});
await pg.evaluate(async N=>{await modelsFor(N,()=>{},600000);mats();},N);
for(const f of N){
const url=await pg.evaluate(([f,MODE])=>{
 if(MODE==='before'&&typeof VEH_SCALE!=='undefined')for(const k in VEH_SCALE)VEH_SCALE[k]=1;
 const W=1800,H=700,cv=document.createElement('canvas');cv.width=W;cv.height=H;const R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});R.setSize(W,H,false);R.setClearColor('#8a8a72');
 const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff','#665',1.6));const dl=new THREE.DirectionalLight('#fff',2.2);dl.position.set(60,120,80);sc.add(dl);
 const gr=new THREE.Mesh(new THREE.PlaneGeometry(4000,400),new THREE.MeshBasicMaterial({color:'#7d7f62'}));gr.rotation.x=-Math.PI/2;sc.add(gr);
 const cam=new THREE.OrthographicCamera(-W/2/4.2,W/2/4.2,H/2/4.2,-H/2/4.2,-2000,2000);cam.position.set(100,90,200);cam.lookAt(0,22,0);
 window.decal=window.decal||(()=>new THREE.Group());SCN=new THREE.Group();G={teams:[{fac:f,color:'#ffffff',F:{}}],bases:[],units:[],ents:[]};
 const kinds=['tank','arty','aa','atgm','jeep','harv','ammot','ew','dozer','heli','jet'];let x=-W/2/4.2+30;
 for(const kind of kinds){const s=BASE[kind]||{name:'',dom:kind==='heli'||kind==='jet'?'air':'ground',cls:kind==='heli'?'heli':kind};
  const mk=(k,ss)=>{try{return modelFor({kind:k,team:0,id:7,s:Object.assign({},ss,{rocket:false})});}catch(e){return null;}};
  const v=mk(kind,s),sol=mk('inf',BASE.inf||{name:'',cls:'inf',armor:'light',dom:'ground'});if(!v)continue;
  v.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(v),w=Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z);
  v.position.set(x+w/2,(kind==='heli'||kind==='jet')?0:0,0);sc.add(v);if(sol){sol.position.set(x+w+10,0,12);sc.add(sol);}x+=w+36;}
 const fix=o=>{o.children=o.children.filter(c=>c&&!(c.isMesh&&!c.material));o.children.forEach(fix);};fix(sc);R.render(sc,cam);return cv.toDataURL('image/jpeg',.88);},[f,MODE]);
fs.writeFileSync(path.join(OUT,`scale-${MODE}-${f}.jpg`),Buffer.from(url.split(',')[1],'base64'));console.log('wrote',MODE,f);}
await b.close();srv.close();
