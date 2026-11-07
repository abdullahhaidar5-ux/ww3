// Grand campaign test (stage 1): determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
// from the map holds EXACTLY the army's units (types and counts) and no production, survivors/losses flow back exactly,
// the province is captured. Screenshots: orch/shots/grand1/.   node orch/grandtest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'grand2');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MIN = Number(arg('minutes', 2)), ONLY = arg('only', '');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock();
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);

const fails=[];const page=await ctx.newPage();const errs=[];
page.on('pageerror',e=>errs.push('page error: '+(e.stack||e.message).split('\n').slice(0,3).join(' | ')));
await page.route('**/*',r=>r.request().url().startsWith(URL0.replace('/index.html',''))?r.continue():r.abort());
const ev=(fn,a)=>page.evaluate(fn,a);
try{
 await page.goto(URL0,{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>typeof grNew==='function'&&typeof MODELS!=='undefined',null,{timeout:60000});
 await ev(()=>{localStorage.removeItem(GR_KEY);grNew({me:'IR',len:'std',sc:'me26',seed:7});grandOpen();});
 await page.waitForTimeout(2000);
 const r=await ev(()=>{const me=GC.me,mine=GC.armies.filter(a=>a.o===me);const base=mine[0];const ps=GCM.P.map((p,i)=>i).filter(i=>GC.prov&&GC.prov[i]?true:true);
  let k=0;while(GC.armies.filter(a=>a.o===me).length<150&&k<400){grAddArmy(me,ps[k%ps.length],mine[0].u.slice(0,2),'Perf '+k);k++;}
  const n=GC.armies.filter(a=>a.o===me).length,ids=GC.armies.filter(a=>a.o===me).map(a=>a.id);
  const T=f=>{const t=performance.now();f();return +(performance.now()-t).toFixed(1);};
  const sel=T(()=>gmSet(ids)),paint=T(()=>gmPaint());let ref=0;for(let i=0;i<10;i++)ref+=T(()=>grandMapRefresh());
  return {n,sel,paint,ref:+(ref/10).toFixed(1),sz:GV.selM.size};});
 console.log(JSON.stringify(r));if(r.n<100||r.sel>150||r.paint>100||r.ref>150)fails.push('A3 perf '+JSON.stringify(r));
 await page.screenshot({path:'orch/shots/laneF/a3perf.png'});
}catch(e){fails.push('exc '+e.message)}
console.log('errs',errs.slice(0,5));console.log(fails.length||errs.length?'A3P FAIL '+fails:'A3P PASS');await browser.close();server.close();process.exit(0);
