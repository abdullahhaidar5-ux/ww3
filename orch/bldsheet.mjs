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
const FAM={shia:['IR','RS','DW','RV','OB'],west:['US','GB','FR','IL','UA'],east:['RU','CN','KP'],regional:['IN','JP','KR','PK','SA','AE','TR','EG']},FN=process.argv[2]||'shia',GR=process.argv[3]||'bldund',N=FAM[FN];
const GRP=process.env.KINDS?process.env.KINDS.split(','):['hq','barracks','factory','depot'],_old={ground:['tank','harv','dozer','atgm','aa','arty','ew','jeep','ammot'],air:['heli','airlift','jet','drone','tb2'],navy:['boat','fast','ship','lander','minel','sweep','sub']}[GR]||[];
// art-audit close-up sheet: rows = nations, columns = unit kinds, big cells.   node orch/artaudit.mjs shia|west|east|regional ground|air|navy
await pg.evaluate(async N=>{await modelsFor(N,()=>{},600000);mats();},N);
const CW=+process.env.CW||300,CH=+process.env.CH||230,W=CW*GRP.length+110,H=CH*N.length;
const url=await pg.evaluate(([N,GRP,CW,CH,W,H])=>{
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});R.setSize(W,H,false);R.setClearColor('#8a876f');R.setScissorTest(true);
 window.decal=()=>new THREE.Group();SCN=new THREE.Group();G={teams:[{fac:'US',color:'#7d8f66',F:{}}],bases:[],units:[],ents:[]};window.__miss=[];
 N.forEach((f,i)=>{G.teams[0].fac=f;GRP.forEach((kind,j)=>{const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff','#665',1.7));const dl=new THREE.DirectionalLight('#fff',2.4);dl.position.set(60,120,80);sc.add(dl);
  const g=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshStandardMaterial({color:'#9a8f6e'}));g.rotation.x=-Math.PI/2;sc.add(g);
  let o=null;try{o=makeObj({isB:true,kind,team:0,id:7,x:0,y:0,hp:100,maxhp:100,size:STRUCT[kind].size,s:{name:''}});}catch(e){window.__miss.push(f+kind+'!'+e.message);}
  if(!o){return;}if(o.userData.parts&&o.userData.parts.scaf)o.userData.parts.scaf.visible=false;let nb=0;o.traverse(c=>{if(c.userData&&c.userData.bfam)nb++;});o.traverse(c=>{if(c.userData&&c.userData.bfam){c.geometry.computeBoundingBox();window.__miss.push(f+kind+JSON.stringify(c.geometry.boundingBox)+c.visible+c.parent.visible+c.parent.scale.x+(c.material===MAT.std));}});sc.add(o);const cam=new THREE.PerspectiveCamera(38,CW/CH,1,2000);const d=STRUCT[kind].size*1.9;cam.position.set(d*.9,d*.75,d*1.15);cam.lookAt(0,8,0);
  const x=110+j*CW,y=H-(i+1)*CH;R.setViewport(x,y,CW,CH);R.setScissor(x,y,CW,CH);R.render(sc,cam);});});
 return cv.toDataURL('image/jpeg',.9);},[N,GRP,CW,CH,W,H]);
console.log('missing:',(await pg.evaluate(()=>window.__miss)).join(' '));
fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'art-bld-'+FN+'-'+GR+(process.argv[4]||'')+'.jpg'),Buffer.from(url.split(',')[1],'base64'));await b.close();srv.close();console.log('ok');
