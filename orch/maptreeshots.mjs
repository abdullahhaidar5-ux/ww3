// maptrees: before/after pictures of the grand-map trees at 1600x900 (three fixed views).  node orch/maptreeshots.mjs <prefix> [only]  -> orch/shots/maptrees/<prefix>-<view>.png
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'orch','shots','maptrees'),pre=process.argv[2]||'before',ONLY=(process.argv[3]||'').replace(/^--.*/,'');fs.mkdirSync(OUT,{recursive:true});
const r=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=r(p);break;}catch{}}
if(!pw)pw=await import('playwright');const cr=(pw.chromium||pw.default.chromium);
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.gz':'application/gzip','.mp3':'audio/mpeg'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(x=>srv.listen(0,'127.0.0.1',x));const U=`http://127.0.0.1:${srv.address().port}/index.html`;
const b=await cr.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto(U,{waitUntil:'load',timeout:120000});await pg.waitForFunction(()=>typeof grNew==='function',null,{timeout:90000});
await pg.evaluate(()=>{grNew({me:'IR',seed:99,len:'quick'});grSave();grandOpen();guFit(null);guRedraw();});
await pg.waitForFunction(()=>!!G3.real||!!G3.realFail,null,{timeout:120000}).catch(()=>{});await pg.waitForTimeout(2500);
await pg.evaluate(()=>{for(const e of document.querySelectorAll('button'))if(/^Got it/.test(e.textContent.trim()))e.click();});
console.log('look',JSON.stringify(await pg.evaluate(()=>typeof g3TreeLook==='function'?g3TreeLook():null)));
const VIEWS={germany:[1255,235,90,45],nepal:[1660,345,220,110],levant:[1420,352,110,55],palms:[1508,372,40],close:[1306,268,42]};
for(const [n,v] of Object.entries(VIEWS)){if(ONLY&&ONLY!==n)continue;
  await pg.evaluate(v=>{if(v.length===3){G3.camera.x=v[0];G3.camera.z=v[1];G3.camera.d=v[2];}else guFit(v);guRedraw();for(const k of ['x','z','d','yaw','pitch'])G3.cc[k]=G3.camera[k];G3.moved=true;},v);await pg.waitForTimeout(8000);
  await pg.evaluate(()=>{G3.moved=true;g3ForestTick(true);});await pg.waitForTimeout(2500);await pg.screenshot({path:path.join(OUT,pre+'-'+n+'.png'),timeout:120000});
  console.log('shot',n,JSON.stringify(await pg.evaluate(()=>({x:Math.round(G3.cc.x),z:Math.round(G3.cc.z),d:Math.round(G3.cc.d),real:!!(G3.forest&&G3.forest.real),trees:G3.trees,uTS:G3.treeU&&G3.treeU.uTS.value}))));}
if(process.argv.includes('--atlas')){const d=await pg.evaluate(()=>{const im=G3.treeU.uTex.value.image;if(im.toDataURL)return im.toDataURL('image/png');const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d'),I=x.createImageData(im.width,im.height);for(let y=0;y<im.height;y++)I.data.set(im.data.subarray(y*im.width*4,(y+1)*im.width*4),(im.height-1-y)*im.width*4);x.putImageData(I,0,0);const c2=document.createElement('canvas');c2.width=im.width;c2.height=im.height;const x2=c2.getContext('2d');x2.fillStyle='#b9b08c';x2.fillRect(0,0,c2.width,c2.height);x2.drawImage(c,0,0);return c2.toDataURL('image/png');});fs.writeFileSync(path.join(OUT,pre+'-atlas.png'),Buffer.from(d.split(',')[1],'base64'));}
await b.close();srv.close();
