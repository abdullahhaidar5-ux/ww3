// Scale probe (view only): world height/length of a soldier vs every vehicle kind per nation -> orch/reports/scale.json   node orch/scalemeasure.mjs [IR,US,RU,IN]
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const r=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=r(p);break;}catch{}}
if(!pw)pw=await import('playwright');const cr=pw.chromium||pw.default.chromium;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.gz':'application/gzip'};
const srv=http.createServer((q,s)=>{const f=path.join(ROOT,decodeURIComponent(new URL(q.url,'http://x').pathname));if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(x=>srv.listen(0,'127.0.0.1',x));
const b=await cr.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await (await b.newContext({viewport:{width:800,height:500}})).newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.route('**/*',q=>q.request().url().startsWith('http://127.0.0.1')?q.continue():q.abort());
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?lazy=1`,{waitUntil:'load',timeout:120000});
await pg.waitForFunction(()=>typeof MODELS!=='undefined'&&MODELS.ready,null,{timeout:240000});
const N=(process.argv[2]||'IR,US,RU,IN').split(',');
await pg.evaluate(async N=>{await modelsFor(N,()=>{},600000);mats();},N);
const res=await pg.evaluate(N=>{
 window.decal=window.decal||(()=>new THREE.Group());SCN=new THREE.Group();G={teams:[{fac:'IR',color:'#ffffff',F:{}}],bases:[],units:[],ents:[]};
 const kinds=['inf','tank','apc','ifv','harv','ammot','aa','arty','ew','cbr','atgm','jeep','tech','dozer','supply','heli','airlift','jet','bmt'];
 const out={};
 for(const f of N){G.teams[0].fac=f;out[f]={};
  for(const kind of kinds){let o=null;try{const s=(typeof BASE!=='undefined'&&BASE[kind])||{name:'',dom:'ground'};o=modelFor({kind,team:0,id:7,s:Object.assign({},s,{rocket:false})});}catch(e){out[f][kind]='ERR '+e.message;continue;}
   if(!o){out[f][kind]=null;continue;}
   o.updateMatrixWorld(true);const bx=new THREE.Box3();o.traverse(m=>{if(m.isMesh&&m.geometry&&!(m.material&&m.material.transparent)){const bb=new THREE.Box3().setFromObject(m);if(bb.max.y-bb.min.y>.8||true)bx.union(bb);}});
   const sz=bx.getSize(new THREE.Vector3());out[f][kind]={h:+sz.y.toFixed(1),len:+Math.max(sz.x,sz.z).toFixed(1),wid:+Math.min(sz.x,sz.z).toFixed(1)};SCN.remove(o);}}
 return out;},N);
fs.mkdirSync(path.join(ROOT,'orch','reports'),{recursive:true});
const out=process.argv[3]||'scale.json';fs.writeFileSync(path.join(ROOT,'orch','reports',out),JSON.stringify(res,null,1));
for(const f in res){console.log(f);for(const k in res[f])console.log(' ',k,JSON.stringify(res[f][k]));}
await b.close();srv.close();
