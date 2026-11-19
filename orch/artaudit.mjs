// Vehicle contact sheet of one family: tank, truck, ATGM, AA, artillery per nation -> orch/shots/vehicles-<family>.jpg   node orch/artaudit.mjs shia|west|east|regional
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
const FAM={shia:['IR','RS','DW','RV','OB'],west:['US','GB','FR','IL','UA'],east:['RU','CN','KP'],regional:['IN','JP','KR','PK','SA','AE','TR','EG']},FN=process.argv[2]||'shia',GR=process.argv[3]||'ground',N=FAM[FN];
const GRP={ground:['tank','harv','dozer','atgm','aa','arty','ew','jeep','ammot'],air:['heli','airlift','jet','drone','tb2'],navy:['boat','fast','ship','lander','minel','sweep','sub']}[GR];
// art-audit close-up sheet: rows = nations, columns = unit kinds, big cells.   node orch/artaudit.mjs shia|west|east|regional ground|air|navy
await pg.evaluate(async N=>{await modelsFor(N,()=>{},600000);mats();},N);
const CW=300,CH=230,W=CW*GRP.length+110,H=CH*N.length;
const url=await pg.evaluate(([N,GRP,CW,CH,W,H])=>{
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});R.setSize(W,H,false);R.setClearColor('#7a7a68');
 const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff','#665',1.6));const dl=new THREE.DirectionalLight('#fff',2.2);dl.position.set(60,120,80);sc.add(dl);
 const cam=new THREE.OrthographicCamera(0,W,0,-H,-1000,1000);cam.position.z=500;
 window.decal=()=>new THREE.Group();SCN=new THREE.Group();G={teams:[{fac:'IR',color:'#ffffff',F:{}}],bases:[],units:[]};window.__miss=[];
 N.forEach((f,i)=>{G.teams[0].fac=f;GRP.forEach((kind,j)=>{let o=null;try{o=modelFor({kind,team:0,id:7,s:{name:'',rocket:kind==='arty'&&['RS','DW','RV','OB'].includes(f)}});}catch(e){window.__miss.push(f+kind+'!'+e.message);}
  if(!o){window.__miss.push(f+kind);return;}
  const bb=new THREE.Box3().setFromObject(o),sz=bb.getSize(new THREE.Vector3()),m=Math.max(sz.x,sz.z,sz.y)||1,k=(CW*.78)/m;o.scale.multiplyScalar(k);
  const x=110+j*CW+CW/2,y=-i*CH-CH*.55;o.position.set(x,y,0);o.rotation.set(.75,.55,0);sc.add(o);});});
 const fix=o=>{o.children=o.children.filter(c=>c&&!(c.isMesh&&!c.material));o.children.forEach(fix);};fix(sc);R.render(sc,cam);return cv.toDataURL('image/jpeg',.9);},[N,GRP,CW,CH,W,H]);
console.log('missing:',(await pg.evaluate(()=>window.__miss)).join(' '));
fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'art-audit-'+FN+'-'+GR+(process.argv[4]||'')+'.jpg'),Buffer.from(url.split(',')[1],'base64'));await b.close();srv.close();console.log('ok');
