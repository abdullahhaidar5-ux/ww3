// Measures where the top of a soldier's head is relative to the head bone (units of k) and shoots a close-up. Usage: node orch/headmeasure.mjs <tag>
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const TAG=process.argv[2]||'x';
const req=createRequire(import.meta.url);let pw;try{pw=await import('playwright');}catch{for(const p of ['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=req(p);break;}catch{}}}
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.mp3':'audio/mpeg'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);if(p==='/')p='/index.html';if(p==='/sw.js'){r.writeHead(404);return r.end();}const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(0,'127.0.0.1',r));const U=`http://127.0.0.1:${srv.address().port}/index.html`;
const br=await (pw.chromium||pw.default.chromium).launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await br.newPage({viewport:{width:900,height:600}});await pg.route('**/*',r=>r.request().url().startsWith(U.replace('/index.html',''))?r.continue():r.abort());
await pg.goto(U,{waitUntil:'load',timeout:180000});await pg.waitForFunction(()=>typeof startSingle==='function'&&typeof MODELS!=='undefined',null,{timeout:120000});
await pg.evaluate(()=>{window.__stopLoop=true;});
for(const [p,a] of [['DW','US']]){
 const res=await pg.evaluate(async([p,a])=>{
  if(G)G.over=true;Object.assign(setup,{map:'fulda',n:1,p,a,others:[],tm:[],slot:-1,seed:4242});startSingle();const w0=performance.now();
  while(window.LOADING&&performance.now()-w0<300000)await new Promise(r=>setTimeout(r,100));
  while(!(MODELS.proto[solKey(p)]&&MODELS.proto[solKey(a)])&&performance.now()-w0<300000)await new Promise(r=>setTimeout(r,250));
  G.paused=true;G.ents=G.ents.filter(e=>e.isB);const [bx,by]=BASES[0];const x0=bx+260,y0=by+80;
  const us=[addUnit(0,'inf',x0,y0),addUnit(1,'inf',x0+50,y0)];
  cam.dist=cam.td=140;cam.x=cam.tx=x0+25;cam.y=cam.ty=y0+15;
  for(let i=0;i<30;i++){G.t+=1/60;G.alpha=1;placeCam();syncScene(1/60);}
  const out=[];
  for(const u of us){const o=OBJ.get(u.id);const ms=o.userData.parts.body.children.filter(m=>m.userData.inner);for(const m of ms){m.updateWorldMatrix(true,true);const B={};m.userData.inner.traverse(o=>{if(o.isBone)B[o.name]=o;});
   const hp=new THREE.Vector3().setFromMatrixPosition(B.head.matrixWorld),hv=new THREE.Vector3().setFromMatrixPosition(B.hips.matrixWorld),k=(hp.y-hv.y)/5.2;
   let top=-1e9;const v=new THREE.Vector3();m.traverse(s=>{if(s.isSkinnedMesh){s.skeleton.update();const pos=s.geometry.attributes.position;for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);s.applyBoneTransform(i,v);v.applyMatrix4(s.matrixWorld);if(v.y>top)top=v.y;}}});
   let r=null;m.traverse(s=>{if(!s.isSkinnedMesh||r)return;s.geometry.computeBoundingBox();const bi=n=>{const i=s.skeleton.bones.indexOf(B[n]);return new THREE.Vector3().setFromMatrixPosition(s.skeleton.boneInverses[i].clone().invert());};const h=bi('head'),hi=bi('hips'),kb=(h.y-hi.y)/5.2;r={fac:u.team?a:p,kb:+kb.toFixed(4),headBindY:+h.y.toFixed(3),top:+s.geometry.boundingBox.max.y.toFixed(3),headTopK:+((s.geometry.boundingBox.max.y-h.y)/kb).toFixed(2),neckToHipsK:5.2,headWidthK:+((s.geometry.boundingBox.max.x-s.geometry.boundingBox.min.x)/kb).toFixed(2)};});out.push(r);}}

  return out;},[p,a]);
 console.log(JSON.stringify(res));
 const png=await pg.evaluate(()=>{G.alpha=1;for(let i=0;i<3;i++)renderFrame(1/60);return R3.domElement.toDataURL('image/png');});
 fs.writeFileSync(path.join(ROOT,'orch/shots/dw-headgear',TAG+'.png'),Buffer.from(png.split(',')[1],'base64'));
}
await br.close();srv.close();
