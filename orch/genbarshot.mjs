// Screenshot of the command bar in a live skirmish with a unit selected. node orch/genbarshot.mjs <out.jpg> [kind] [--dom]
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const out=process.argv[2]||'orch/shots/genbar-x.jpg';const kind=process.argv[3]&&!process.argv[3].startsWith('--')?process.argv[3]:'';
const req=createRequire(import.meta.url);let pw;try{pw=await import('playwright')}catch{}if(!pw||!pw.chromium)for(const p of['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=req(p);break}catch{}}
const chromium=pw.chromium||pw.default.chromium;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.gz':'application/gzip'};
const server=http.createServer((rq,res)=>{let p=decodeURIComponent(new URL(rq.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const O='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await (await browser.newContext({viewport:{width:1366,height:768}})).newPage();
page.on('pageerror',e=>console.log('ERR',e.message));
await page.route('**/*',r=>r.request().url().startsWith(O)?r.continue():r.abort());
await page.goto(O+'/index.html',{waitUntil:'load',timeout:120000});
await page.waitForFunction(()=>typeof startSingle==='function',null,{timeout:60000});
await page.evaluate(()=>{try{localStorage.setItem('ww3_welcomed','1')}catch(e){}setup.n=1;startSingle()});
await page.waitForFunction(()=>!window.LOADING,null,{timeout:600000,polling:500});
await page.evaluate(k=>{const u=G.ents.find(e=>e.team===ME&&(k?e.kind===k:e.kind==='dozer'))||G.ents.find(e=>e.team===ME);if(u)G.sel=[u];try{updateUI()}catch(e){}},kind);
await page.waitForTimeout(2500);
// daemon: poll for $S/cmd.json {css?:file, js?:expr, out?:jpg, kind?:k}; writes $S/res.txt when done
const S=process.env.S;console.log('READY');
for(;;){await new Promise(r=>setTimeout(r,500));const cf=S+'/cmd.json';if(!fs.existsSync(cf))continue;let c;try{c=JSON.parse(fs.readFileSync(cf,'utf8'))}catch{continue}fs.unlinkSync(cf);let res='';
try{if(c.css){await page.evaluate(()=>{document.getElementById('gbx')?.remove()});await page.addStyleTag({content:fs.readFileSync(c.css,'utf8')}).then(h=>h.evaluate(e=>e.id='gbx'))}
if(c.kind)await page.evaluate(k=>{const u=G.ents.find(e=>e.team===ME&&e.kind===k);if(u)G.sel=[u];try{updateUI()}catch(e){}},c.kind);
if(c.js)res=JSON.stringify(await page.evaluate(c.js));
if(c.out){await page.waitForTimeout(800);await page.screenshot({path:c.out,type:'jpeg',quality:85,timeout:300000})}}catch(e){res='ERR '+e.message}
fs.writeFileSync(S+'/res.txt',res||'ok');}
