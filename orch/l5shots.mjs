// L5 contact sheet: one soldier + one tank per nation (22) -> orch/shots/L5-nations.jpg   node orch/l5shots.mjs
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'orch','shots');
const r=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=r(p);break;}catch{}}
if(!pw)pw=await import('playwright');const cr=pw.chromium||pw.default.chromium;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.gz':'application/gzip'};
const srv=http.createServer((q,s)=>{const f=path.join(ROOT,decodeURIComponent(new URL(q.url,'http://x').pathname));if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(x=>srv.listen(0,'127.0.0.1',x));
const b=await cr.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await (await b.newContext({viewport:{width:1800,height:1000}})).newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.route('**/*',q=>q.request().url().startsWith('http://127.0.0.1')?q.continue():q.abort());
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?lazy=1`,{waitUntil:'load',timeout:120000});
await pg.waitForFunction(()=>typeof MODELS!=='undefined'&&MODELS.ready,null,{timeout:240000});
const N=['IR','RS','DW','RV','OB','US','GB','FR','DE','IL','UA','RU','CN','KP','IN','JP','KR','PK','SA','AE','TR','EG'];
await pg.evaluate(async N=>{await modelsFor(N,()=>{},600000);},N);
const url=await pg.evaluate(()=>{const N=['IR','RS','DW','RV','OB','US','GB','FR','DE','IL','UA','RU','CN','KP','IN','JP','KR','PK','SA','AE','TR','EG'];
 const cv=document.createElement('canvas');cv.width=1800;cv.height=1000;const R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});R.setSize(1800,1000,false);R.setClearColor('#7a7a68');
 const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff','#665',1.6));const dl=new THREE.DirectionalLight('#fff',2.2);dl.position.set(60,120,80);sc.add(dl);
 const cam=new THREE.OrthographicCamera(0,1800,0,-1000,-1000,1000);cam.position.z=500;
 window.decal=()=>new THREE.Group();SCN=new THREE.Group();G={teams:[{fac:'IR',color:'#ffffff',F:{}}],bases:[],units:[]};
 const cols=6;N.forEach((f,i)=>{G.teams[0].fac=f;const T=G.teams[0];const x=(i%cols)*300+150,y=-Math.floor(i/cols)*250-60;
  for(const [kind,dx,sc2] of [['inf',-60,5],['tank',50,2.2]]){let o=null;try{o=modelFor({kind,team:0,id:7,s:{name:''}});}catch(e){window.__err=(e.stack||'').split('\n').slice(0,4).join('|');}if(!o){window.__miss=(window.__miss||[]).concat(f+kind);continue;}o.scale.multiplyScalar(sc2);o.position.set(x+dx,y-40,0);o.rotation.set(.9,.5,0);sc.add(o);}
 });
 const fix=o=>{o.children=o.children.filter(c=>c&&!(c.isMesh&&!c.material));o.children.forEach(fix);};fix(sc);window.__nulls=0;R.render(sc,cam);window.__n=sc.children.length;return cv.toDataURL('image/jpeg',.88);});
console.log(await pg.evaluate(()=>[window.__n,window.__err]));fs.writeFileSync(path.join(OUT,'L5-nations.jpg'),Buffer.from(url.split(',')[1],'base64'));await b.close();srv.close();console.log('ok');
