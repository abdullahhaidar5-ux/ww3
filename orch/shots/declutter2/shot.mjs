import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT='/home/claude/ww3';const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const q=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=q(p);break;}catch{}}
const b=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await(await b.newContext({viewport:{width:1600,height:900}})).newPage();
await page.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.waitForFunction(()=>typeof startSingle==='function',null,{timeout:60000});
await page.evaluate(()=>{try{if(typeof S!=='undefined')S.fac='IR';}catch(e){}startSingle();$('menu').hidden=true;});
await page.waitForFunction(()=>{const h=document.getElementById('hudBar');return h&&!h.hidden;},null,{timeout:90000});
await page.waitForTimeout(6000);
await page.screenshot({path:process.argv[2],timeout:240000});
console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return s.position==='fixed'&&r.top>600&&r.width>50&&!e.hidden&&s.display!=='none'}).map(e=>e.id+' '+Math.round(e.getBoundingClientRect().left)+','+Math.round(e.getBoundingClientRect().top)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).join('\n')));
await b.close();server.close();
