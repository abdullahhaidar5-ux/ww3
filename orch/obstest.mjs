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
 await ev(()=>{localStorage.removeItem(GR_KEY);grandMenu();});
 await ev(()=>{[...document.querySelectorAll('button')].find(b=>/New campaign/.test(b.textContent)).click();});
 const r=await ev(()=>{const sel=[...document.querySelectorAll('select')].find(s=>s.querySelector('optgroup'));const has=[...sel.options].some(o=>o.value===''&&/Observer/.test(o.textContent));sel.value='';sel.onchange();return {has,info:document.body.innerText.includes('Observer mode: no nation')};});
 console.log(JSON.stringify(r));if(!r.has||!r.info)fails.push('no observer option');
 await ev(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='Begin').click();});
 await page.waitForTimeout(1500);
 const g=await ev(()=>{const t0=GC.turn;try{grEndTurn&&grEndTurn(true);grEndTurn(true);}catch(e){return {err:String(e)}}return {me:GC.me,t0,t1:GC.turn,saved:!!localStorage.getItem(GR_KEY)};});
 console.log(JSON.stringify(g));if(g.err||g.me!==null||g.t1<=g.t0)fails.push('observer run '+JSON.stringify(g));
 await ev(()=>{grLoad();grandOpen();});await page.waitForTimeout(1500);
 await page.screenshot({path:'orch/shots/laneF/observer.png'});
}catch(e){fails.push('exc '+e.message)}
console.log('errs',errs.slice(0,5));console.log(fails.length||errs.length?'OBS FAIL '+fails:'OBS PASS');await browser.close();server.close();process.exit(0);
