// mapshapes: grand-map proof pictures at 1600x900 (shield / hull / wing tokens, route line, Political button, Gulf coast).
//   node orch/mapshapesshots.mjs <prefix> [only,names]   -> orch/shots/mapshapes/<prefix>-*.png     ROOT=<other checkout> takes the same pictures of that checkout (the "before" set)
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const HERE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ROOT=process.env.ROOT?path.resolve(process.env.ROOT):HERE,OUT=path.join(HERE,'orch','shots','mapshapes'),pre=process.argv[2]||'after';fs.mkdirSync(OUT,{recursive:true});
const r=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=r(p);break;}catch{}}
if(!pw)pw=await import('playwright');const cr=(pw.chromium||pw.default.chromium);
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.gz':'application/gzip','.mp3':'audio/mpeg'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(x=>srv.listen(0,'127.0.0.1',x));const U=`http://127.0.0.1:${srv.address().port}/index.html`;
const b=await cr.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();pg.on('pageerror',e=>console.log('ERR',e.message));pg.on('console',m=>{if(m.type()==='error')console.log('CON',m.text().slice(0,300));});
await pg.goto(U,{waitUntil:'load',timeout:120000});await pg.waitForFunction(()=>typeof grNew==='function',null,{timeout:90000});
await pg.evaluate(()=>{grNew({me:'IR',seed:99,len:'quick'});grSave();grandOpen();guFit(null);guRedraw();const c=document.getElementById('gCoach');if(c)c.remove();});
const ONLY=process.argv[3]||'';
const frames=async k=>{for(let i=0;i<k;i++){await pg.evaluate(()=>{for(const q of ['x','z','d','yaw','pitch'])G3.cc[q]=G3.camera[q];G3.moved=true;G3.lblDirty=true;cancelAnimationFrame(G3.raf);g3Frame(performance.now());});await pg.waitForTimeout(150);}};   // the sandbox starves requestAnimationFrame: drive the frames by hand
const sh=async (n,wait)=>{if(ONLY&&!ONLY.split(',').includes(n))return;await frames(6);await pg.evaluate(()=>{if(typeof g3ForestTick==='function')g3ForestTick(true);});await pg.waitForTimeout(wait||9000);await frames(8);await pg.waitForTimeout(400);await pg.screenshot({path:path.join(OUT,pre+'-'+n+'.png'),timeout:120000});
  console.log('shot',n,JSON.stringify(await pg.evaluate(()=>({cam:Math.round(G3.camera.d),tier:G3.tier,tok:typeof gtkAudit==='function'?gtkAudit():null}))));};
const at=(re,d)=>pg.evaluate(([re,d])=>{const i=GCM.P.findIndex(p=>p.n&&new RegExp(re).test(p.n));guCentre(i<0?0:i,2.4);G3.camera.d=d;guRedraw();return i<0?'?':GCM.P[i].n;},[re,d]);
// 1. Middle East at middle zoom: land armies are shields
await at('^Baghdad|Khuzestan',380);await sh('middle-east');
// 2. the Gulf close up with a fleet (hull) and an air group (wing): one helicopter + drone group is put at Bushehr by hand, and a fleet into the Gulf if none is there
console.log('gulf',JSON.stringify(await pg.evaluate(()=>{const me='IR',free=p=>p.land&&GC.prov[p.i].o===me&&p.adj.some(j=>GCM.P[j].sea)&&!GC.armies.some(x=>x.at===p.i),bu=GCM.P.find(p=>free(p)&&/Bushehr|Fars|Hormozgan/.test(p.n))||GCM.P.find(free);
  const ag=grAddArmy(me,bu.i,[['heli',100,0,100],['heli',100,0,100],['drone',100,0,100],['drone',100,0,100],['drone',100,0,100]],'1st Air Group');
  const sea=bu.adj.map(j=>GCM.P[j]).find(p=>p.sea);let fl=GC.armies.find(a=>a.fl&&a.o===me&&a.at===sea.i);if(!fl){fl=GC.armies.find(a=>a.fl&&a.o===me);if(fl){fl.at=sea.i;fl.path=[];}else{fl=grAddArmy(me,sea.i,[['ship',100,0,100],['boat',100,0,100],['boat',100,0,100]],'Gulf Fleet');fl.fl=1;}}
  GV.selA=0;g3SyncArmies();guCentre(sea.i,2.4);G3.camera.d=230;guRedraw();return {air:ag.id,fleet:fl.id,sea:sea.n,at:bu.n};})));await sh('gulf-fleet-air');
// 3. the Gulf coast (no army selected)
await pg.evaluate(()=>{const p=GCM.P.find(p=>p.land&&/Bushehr/.test(p.n));guCentre(p?p.i:0,2.4);G3.camera.d=200;guRedraw();});await sh('gulf-coast',20000);
await pg.evaluate(()=>{const p=GCM.P.find(p=>p.land&&/Bushehr/.test(p.n));guCentre(p?p.i:0,2.4);G3.camera.d=105;guRedraw();});await sh('gulf-coast-near',20000);
// 4. a selected army on the march: route line, arrival, unit cards and the Political button
console.log('route',JSON.stringify(await pg.evaluate(()=>{const me='IR',a=GC.armies.find(x=>x.o===me&&!x.fl&&x.u.length>20)||GC.armies.find(x=>x.o===me&&!x.fl);let to=-1,bd=0;
  for(const p of GCM.P){if(!p.land||GC.prov[p.i].o!==me||p.i===a.at)continue;const r=grPath(me,a.at,p.i,0);const n=r&&r.path?r.path.length:0;if(n>=3&&n<=4&&n>bd){bd=n;to=p.i;}}
  GV.sel=a.at;GV.selA=a.id;grandMapRefresh();const r=to>=0?grOrderMove(a.id,to):null;g3SyncArmies();guCentre(a.path.length>1?a.path[a.path.length>>1]:a.at,2.4);G3.camera.d=300;G3.camera.z+=80;guRedraw();const m=document.getElementById('g3modes');
  return {army:a.nm,to:to>=0?GCM.P[to].n:null,err:r&&r.err,path:a.path.length,modes:m?(()=>{const q=m.getBoundingClientRect();return [q.left|0,q.top|0,q.right|0,q.bottom|0];})():null};})));await sh('selected-route');
// 5. far view: tiny shields / hulls / wings
await pg.evaluate(()=>{GV.selA=0;guFit(GR_REGIONS[4][1]);G3.camera.d=1500;guRedraw();});await sh('far');
await b.close();srv.close();
