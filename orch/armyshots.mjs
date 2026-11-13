// armytokens (copy of calmshots): take the grand-map pictures (world, Middle East, close) at 1600x900.  node orch/armyshots.mjs <prefix>  -> orch/shots/armytokens/<prefix>-*.png
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'orch','shots','armytokens'),pre=process.argv[2]||'before';fs.mkdirSync(OUT,{recursive:true});
const r=createRequire(import.meta.url);let pw;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']){try{pw=r(p);break;}catch{}}
if(!pw)pw=await import('playwright');const cr=(pw.chromium||pw.default.chromium);
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.gz':'application/gzip','.mp3':'audio/mpeg'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(x=>srv.listen(0,'127.0.0.1',x));const U=`http://127.0.0.1:${srv.address().port}/index.html`;
const b=await cr.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();pg.on('pageerror',e=>console.log('ERR',e.message));pg.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CON',m.text().slice(0,300));});
await pg.goto(U,{waitUntil:'load',timeout:120000});await pg.waitForFunction(()=>typeof grNew==='function',null,{timeout:90000});
await pg.evaluate(()=>{grNew({me:'IR',seed:99,len:'quick'});grSave();grandOpen();guFit(null);guRedraw();});
const ONLY=process.argv[3]||'',W=n=>n==='close'?30000:n==='middle'?12000:3000;
const frames=async k=>{for(let i=0;i<k;i++){await pg.evaluate(()=>{for(const q of ['x','z','d','yaw','pitch'])G3.cc[q]=G3.camera[q];G3.moved=true;G3.lblDirty=true;cancelAnimationFrame(G3.raf);g3Frame(performance.now());});await pg.waitForTimeout(150);}};   // the sandbox starves requestAnimationFrame: drive the frames by hand
const sh=async n=>{if(ONLY&&!ONLY.split(',').includes(n))return;await frames(6);await pg.evaluate(()=>{g3ForestTick(true);});await pg.waitForTimeout(W(n));await frames(8);await pg.evaluate(()=>new Promise(r=>{let n=0;const f=()=>{if(++n>=4)r();else requestAnimationFrame(f);};requestAnimationFrame(f);}));await pg.waitForTimeout(400);await pg.screenshot({path:path.join(OUT,pre+'-'+n+'.png'),timeout:120000});console.log('shot',n,JSON.stringify(await pg.evaluate(()=>({cam:G3.camera.d,tier:G3.tier,trees:G3.trees,tok:typeof gtkAudit==='function'?gtkAudit():null}))));};
console.log('calmmap',JSON.stringify(await pg.evaluate(async () => { const out = {}; const set = d => { G3.camera.d = G3.cc.d = d; g3ForestTick(true); g3Labels(true); };
    const leg = document.getElementById('g3leg'); out.legShut = !!leg && /shut/.test(leg.className); out.coachLegend = !!document.getElementById('gCoach') && !!leg && !/shut/.test(leg.className);
    const au = g3TreeAudit(); out.audit = au ? { dry: au.dryWoods || 0, w: ['LY', 'EG', 'SA'].map(k => au[k] ? au[k].conifer + au[k].broad : 0) } : null;
    const vis = () => { let pl = 0; for (const b of G3.bn) if (b.el._v === 'block') pl++; const at = [], dup = []; for (const [k, e] of G3.pl) if (e._v === 'block') { const a = k.split('|')[0]; if (at.includes(a)) dup.push(a); at.push(a); } return { plates: pl, badges: at.length, dup: dup.length }; };
    set(2300); out.far = { tier: G3.tier, trees: G3.trees, ...vis() }; set(350); out.mid = { tier: G3.tier, ...vis() }; set(150); out.close = { tier: G3.tier, trees: G3.trees }; set(900); return out; })));await pg.evaluate(()=>{G3.camera.d=2300;});
await sh('world');
await pg.evaluate(()=>{guFit(GR_REGIONS[4][1]);guRedraw();});await sh('middle-east');
await pg.evaluate(()=>{const i=GCM.P.findIndex(p=>p.n&&/Tehran|Isfahan/.test(p.n));guCentre(i<0?0:i,2.4);G3.camera.d=340;guRedraw();});await sh('middle');
await pg.evaluate(()=>{const i=GCM.P.findIndex(p=>p.n&&/Tehran|Isfahan/.test(p.n));guCentre(i<0?0:i,2.4);G3.camera.d=175;guRedraw();});await sh('close');
// the token states in one picture: at war with Iraq, your army selected and marching on Baghdad -> arrow nose, thin route line, arrival, odds pills, dug-in brackets
await pg.evaluate(()=>{const me='IR',foe='IQ';grDeclare(me,foe);let pair=null;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===me)for(const j of p.adj)if(GCM.P[j].land&&GC.prov[j].o===foe&&GC.armies.some(a=>a.at===j&&a.o===foe)){pair=[p.i,j];break;}
  if(!pair)for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===me)for(const j of p.adj)if(GCM.P[j].land&&GC.prov[j].o===foe){pair=[p.i,j];break;}
  const a=GC.armies.find(x=>x.o===me);a.at=pair[0];a.path=[];GV.sel=pair[0];GV.selA=a.id;grandMapRefresh();grOrderMove(a.id,pair[1]);g3SyncArmies();for(const e of G3.arm.values())e.mv=1;const c=document.getElementById('gCoach');if(c)c.remove();guCentre(pair[1],2.4);G3.camera.d=262;guRedraw();});await sh('odds');
// fighting + besieging + a fanned-out stack in one picture (state is set by hand, this page is thrown away afterwards)
if(!ONLY||ONLY.split(',').includes('states')){console.log('states',JSON.stringify(await pg.evaluate(()=>{const me='IR',foe='IQ',a=GC.armies.find(x=>x.id===GV.selA),to=a.path[a.path.length-1]||a.at;a.at=to;a.path=[];
  const def=GC.armies.filter(x=>x.at===to&&grAtWar(me,x.o));GC.q.push({p:to,an:me,dn:foe,att:[a.id],def:def.map(x=>x.id),garr:GC.prov[to].gar.length>0,river:false,mtn:false,sea:false,done:0});
  const b=GC.armies.find(x=>x.o===me&&x.id!==a.id),sp=GCM.P.find(p=>p.land&&GC.prov[p.i].o===foe&&p.i!==to&&GCM.P[to].adj.includes(p.i));if(b&&sp){b.at=sp.i;b.path=[];}
  const c=GC.armies.filter(x=>x.o===me&&x.id!==a.id&&(!b||x.id!==b.id)).slice(0,3),home=GCM.P.find(p=>p.land&&GC.prov[p.i].o===me&&GCM.P[to].adj.includes(p.i));if(home)for(const x of c){x.at=home.i;x.path=[];}
  g3SyncArmies();GV.selA=0;for(const e of G3.arm.values())e.mv=1;cancelAnimationFrame(G3.raf);g3Frame(performance.now());g3Labels(true);
  if(home){for(const [k,el] of G3.pl)if(el._v==='block'&&el._k&&k.split('|')[0]==String(home.i)&&(el._ids||[]).length>1)G3.tok.fan=el._k;}
  guCentre(to,2.4);G3.camera.d=255;guRedraw();return {to:GCM.P[to].n,siege:sp&&sp.n,home:home&&home.n,fan:G3.tok.fan};})));
  await sh('states');console.log('states audit',JSON.stringify(await pg.evaluate(()=>({a:gtkAudit(),zz:document.querySelectorAll('#g3ui .tk .zz').length,tg:document.querySelectorAll('#g3ui .tk .tg').length,fan:[...G3.pl.keys()].filter(k=>k.includes('#')&&G3.pl.get(k)._v==='block').length}))));}
console.log(JSON.stringify(await pg.evaluate(()=>({trees:G3&&G3.trees,tok:typeof gtkAudit==='function'?gtkAudit():null}))));
await b.close();srv.close();
