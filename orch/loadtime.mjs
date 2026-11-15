import fs0 from 'fs';
import {createRequire} from 'module';const {chromium}=createRequire(import.meta.url)(['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright'].find(p=>{try{return fs0.existsSync(p)}catch{return 0}})||'/opt/npm-tools/node_modules/playwright');
import http from 'http'; import fs from 'fs'; import path from 'path'; import zlib from 'zlib';
const root=process.argv[2], tag=process.argv[3];
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}
 const t={'.html':'text/html','.js':'text/javascript','.mp3':'audio/mpeg','.gz':'application/gzip'}[path.extname(f)]||'application/octet-stream';
 let b=fs.readFileSync(f);const h={'content-type':t,'cache-control':'max-age=3600'};
 if(/\.(html|js|json)$/.test(f)&&/gzip/.test(q.headers['accept-encoding']||'')){b=zlib.gzipSync(b);h['content-encoding']='gzip';}
 r.writeHead(200,h);r.end(b);}).listen(0);
const port=srv.address().port;
const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await br.newContext();
const Q=process.argv[4]||'';const MBPS=+(process.argv[5]||10);
for(const pass of ['cold','warm']){
 const ctx2=pass==='cold'?await br.newContext():ctx;
 const pg=await ctx2.newPage();
 const cdp=await ctx2.newCDPSession(pg);await cdp.send('Network.enable');
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:MBPS*125000,uploadThroughput:MBPS*125000});
 if(pass==='cold')await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 const t0=Date.now();
 await pg.goto(`http://localhost:${port}/index.html${Q}`,{waitUntil:'load'});const tl=Date.now()-t0;
 await pg.waitForFunction(()=>document.querySelector('#menu')&&getComputedStyle(document.querySelector('#menu')).display!=='none',null,{timeout:25000}).catch(()=>{});
 const tm=Date.now()-t0;
 await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
 console.log(tag,pass,MBPS+'Mbps','load',tl,'ms; menu',tm,'ms');
 await pg.close();
}
await br.close();srv.close();
