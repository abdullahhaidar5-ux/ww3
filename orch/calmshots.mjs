// calmmap: take the grand-map pictures at 1600x900: world, Middle East (region button), middle (Levant & Iraq), close (Tehran).  node orch/calmshots.mjs <prefix> [only]  -> orch/shots/calmmap/<prefix>-*.png
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'orch','shots',process.env.SHOTDIR||'calmmap'),pre=process.argv[2]||'before';fs.mkdirSync(OUT,{recursive:true});
const r=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=r(p);break;}catch{}}
if(!pw)pw=await import('playwright');const cr=(pw.chromium||pw.default.chromium);
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.gz':'application/gzip','.mp3':'audio/mpeg'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(x=>srv.listen(0,'127.0.0.1',x));const U=`http://127.0.0.1:${srv.address().port}/index.html`;
const b=await cr.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto(U,{waitUntil:'load',timeout:120000});await pg.waitForFunction(()=>typeof grNew==='function',null,{timeout:90000});
await pg.evaluate(()=>{grNew({me:'IR',seed:99,len:'quick'});grSave();grandOpen();guFit(null);guRedraw();});
// the map is opened at once (as the test robots do, before the real land data has arrived); the trees are replanted from the real data when it lands
await pg.waitForFunction(()=>!!G3.real||!!G3.realFail,null,{timeout:120000}).catch(()=>{});await pg.waitForTimeout(2500);
const ONLY=process.argv[3]||'';
const sh=async(n,set)=>{if(ONLY&&ONLY!==n)return;await pg.evaluate(set);await pg.evaluate(()=>{for(const k of ['x','z','d','yaw','pitch'])G3.cc[k]=G3.camera[k];G3.moved=true;});await pg.waitForTimeout(n==='close'?30000:12000);
  await pg.evaluate(()=>{G3.moved=true;g3ForestTick(true);g3Labels(true);});await pg.waitForTimeout(2500);await pg.screenshot({path:path.join(OUT,pre+'-'+n+'.png'),timeout:120000});
  console.log('shot',n,JSON.stringify(await pg.evaluate(()=>{g3Batch();let figs=0;for(const p of G3.bat.b.values())figs+=p.n||0;return {d:Math.round(G3.cc.d),tier:G3.tier,realTrees:!!(G3.forest&&G3.forest.real),trees:G3.trees,plates:G3.bn.filter(b=>b.el._v==='block').length,badges:[...G3.pl.values()].filter(e=>e._v==='block').length,armyFigures:figs};})));};
await sh('world',()=>{guFit(null);guRedraw();});
await sh('middle-east',()=>{guFit(GR_REGIONS[4][1]);guRedraw();});
await sh('middle',()=>{G3.camera.x=1500;G3.camera.z=395;G3.camera.d=330;guRedraw();});
await sh('close',()=>{G3.camera.x=1543;G3.camera.z=372;G3.camera.d=170;guRedraw();});
await b.close();srv.close();
