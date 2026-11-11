// calmmap: take the grand-map pictures (world, Middle East, close) at 1600x900.  node orch/calmshots.mjs <prefix>  -> orch/shots/calmmap/<prefix>-*.png
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'orch','shots','calmmap'),pre=process.argv[2]||'before';fs.mkdirSync(OUT,{recursive:true});
const r=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=r(p);break;}catch{}}
if(!pw)pw=await import('playwright');const cr=(pw.chromium||pw.default.chromium);
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.gz':'application/gzip','.mp3':'audio/mpeg'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(x=>srv.listen(0,'127.0.0.1',x));const U=`http://127.0.0.1:${srv.address().port}/index.html`;
const b=await cr.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto(U,{waitUntil:'load',timeout:120000});await pg.waitForFunction(()=>typeof grNew==='function',null,{timeout:90000});
await pg.evaluate(()=>{grNew({me:'IR',seed:99,len:'quick'});grSave();grandOpen();guFit(null);guRedraw();});
const ONLY=process.argv[3]||'',W=n=>n==='close'?45000:9000;
const sh=async n=>{if(ONLY&&ONLY!==n)return;await pg.evaluate(()=>{for(const k of ['x','z','d','yaw','pitch'])G3.cc[k]=G3.camera[k];g3ForestTick(true);g3Labels(true);});await pg.waitForTimeout(W(n));await pg.evaluate(()=>{for(const k of ['x','z','d','yaw','pitch'])G3.cc[k]=G3.camera[k];g3Labels(true);});await pg.waitForTimeout(800);await pg.screenshot({path:path.join(OUT,pre+'-'+n+'.png'),timeout:120000});console.log('shot',n,JSON.stringify(await pg.evaluate(()=>({cam:G3.camera.d,cc:G3.cc.d,tier:G3.tier,trees:G3.trees,pl:G3.bn.filter(b=>b.el._v==='block').length}))));};
console.log('calmmap',JSON.stringify(await pg.evaluate(async () => { const out = {}; const set = d => { G3.camera.d = G3.cc.d = d; g3ForestTick(true); g3Labels(true); };
    const leg = document.getElementById('g3leg'); out.legShut = !!leg && /shut/.test(leg.className); out.coachLegend = !!document.getElementById('gCoach') && !!leg && !/shut/.test(leg.className);
    const au = g3TreeAudit(); out.audit = au ? { dry: au.dryWoods || 0, w: ['LY', 'EG', 'SA'].map(k => au[k] ? au[k].conifer + au[k].broad : 0) } : null;
    const vis = () => { let pl = 0; for (const b of G3.bn) if (b.el._v === 'block') pl++; const at = [], dup = []; for (const [k, e] of G3.pl) if (e._v === 'block') { const a = k.split('|')[0]; if (at.includes(a)) dup.push(a); at.push(a); } return { plates: pl, badges: at.length, dup: dup.length }; };
    set(2300); out.far = { tier: G3.tier, trees: G3.trees, ...vis() }; set(350); out.mid = { tier: G3.tier, ...vis() }; set(150); out.close = { tier: G3.tier, trees: G3.trees }; set(900); return out; })));await pg.evaluate(()=>{G3.camera.d=2300;});
await sh('world');
await pg.evaluate(()=>{guFit(GR_REGIONS[4][1]);guRedraw();});await sh('middle-east');
await pg.evaluate(()=>{const i=GCM.P.findIndex(p=>p.n&&/Tehran|Isfahan/.test(p.n));guCentre(i<0?0:i,2.4);G3.camera.d=230;guRedraw();});await sh('close');
console.log(JSON.stringify(await pg.evaluate(()=>({trees:G3&&G3.trees,zoom:typeof GV!=='undefined'&&GV.z}))));
await b.close();srv.close();
