// Infantry-smoothness probe: records per-tick unit traces for (a) a column crossing a bridge, (b) a dense blob moving+fighting,
// prints jitter metrics; with --frames N also saves consecutive frames (software GL, slow) to orch/shots/smooth-inf/<tag>/<scene>/.
//   node orch/smoothinf.mjs [--tag before|after] [--scene bridge,blob,wind] [--frames 60]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = arg('tag', 'after'), SC = arg('scene', 'bridge,blob').split(','), NF = Number(arg('frames', 0)), FPS = Number(arg('fps', 30));
const { chromium } = await import('playwright').catch(() => import('/opt/npm-tools/node_modules/playwright/index.mjs'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const page0 = fs.readFileSync(path.join(ROOT, 'index.html'));
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 700 } });
const page = await ctx.newPage(); page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
await page.evaluate(() => { window.__stopLoop = true; try { initAudio(); AU.musicOn = AU.sfxOn = AU.voiceOn = false; applyAudio(); } catch (e) {}
  const st = document.createElement('style'); st.textContent = '#tstrip,#qpow,.toast,#bar,#side{display:none!important}'; document.head.appendChild(st);
  window.T = { step(n) { for (let i = 0; i < n && G && !G.over; i++) { for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1 / 60); } G.alpha = 1; } }; });
async function boot(map, seed) {
  await page.evaluate(async ([map, seed]) => { if (G) G.over = true; Object.assign(setup, { map, n: 1, p: 'US', a: 'RU', others: [], tm: [], slot: -1, seed, w: 0 }); startSingle();
    const w0 = performance.now(); while (window.LOADING && performance.now() - w0 < 600000) await new Promise(r => setTimeout(r, 100));
    G.teams.forEach(T => { if (!T.ai) T.ai = mkAI(1); }); G.paused = false; for (const e of G.ents) e.vs && (e.vs[0] = true); }, [map, seed]);
}
// scene setup (in page): returns list of tracked unit ids
const SETUP = {
  bridge: `()=>{const B=G.map.bridges[1]||G.map.bridges[0];const n=B.n,t=B.t;const out=[];const R=mulberry(11);
    for(let i=0;i<60;i++){const row=Math.floor(i/6),col=i%6;const x=B.x-n[0]*(B.h+120+row*14)+t[0]*(col-2.5)*9,y=B.y-n[1]*(B.h+120+row*14)+t[1]*(col-2.5)*9;const u=addUnit(0,'inf',x,y);if(u){u.order={type:'move',x:B.x+n[0]*(B.h+260),y:B.y+n[1]*(B.h+260)};out.push(u.id);}}
    window.TR_BR=B;window.TR_C=[B.x,B.y];return out;}`,
  blob: `()=>{const c=BASES[0],o=BASES[1];const dx=o[0]-c[0],dy=o[1]-c[1],L=Math.hypot(dx,dy);const ux=dx/L,uy=dy/L;const mid=[c[0]+dx*.5-ux*165,c[1]+dy*.5-uy*165];const out=[];
    for(let i=0;i<120;i++){const a=addUnit(0,'inf',mid[0]-ux*30+((i%12)-6)*-uy*8+((i/12|0))*-ux*6,mid[1]-uy*30+((i%12)-6)*ux*8+((i/12|0))*-uy*6);if(a){a.order={type:'amove',x:mid[0]+ux*260,y:mid[1]+uy*260};out.push(a.id);}
      const b=addUnit(1,'inf',mid[0]+ux*330+((i%12)-6)*-uy*8+((i/12|0))*ux*6,mid[1]+uy*330+((i%12)-6)*ux*8+((i/12|0))*uy*6);if(b){b.order={type:'amove',x:mid[0],y:mid[1]};}}
    window.TR_C=mid;return out;}`,
};
const METR = `(ids,ticks)=>{const set=new Set(ids);window.__J=[];const lastH=new Map();const tr=new Map(ids.map(i=>[i,[]]));
  for(let k=0;k<ticks;k++){T.step(1);for(const e of G.ents)if(set.has(e.id)&&!e.dead){const h=unitH(e);const lh=lastH.get(e.id);if(lh!=null&&Math.abs(h-lh)>.8&&window.TR_BR&&window.__J.length<8){const B=window.TR_BR;const dx=e.x-B.x,dy=e.y-B.y;window.__J.push({k,id:e.id,h0:+lh.toFixed(2),h1:+h.toFixed(2),u:+(dx*B.n[0]+dy*B.n[1]).toFixed(1),w:+(dx*B.t[0]+dy*B.t[1]).toFixed(1),hb:B.h,g:G.grid[Math.floor(e.y/CELL)*GW+Math.floor(e.x/CELL)],gh:+groundH(e.x,e.y).toFixed(1)});}lastH.set(e.id,h);tr.get(e.id).push([e.x,e.y,e.va,h,e.ang]);}}
  // metrics: per unit, per tick velocity; reversals = tick pairs where velocity direction flips >100deg while speed>0.3; accel p95
  window.__TR=[...tr.values()][5].slice(400,425).map((p,i,a)=>i?[+(p[0]-a[i-1][0]).toFixed(2),+(p[1]-a[i-1][1]).toFixed(2)]:0);let rev=0,cnt=0,jerk=[],hjump=[],yawFlip=0,steps=0,sp=[],stall=0;
  for(const a of tr.values()){for(let i=2;i<a.length;i++){const v1=[a[i-1][0]-a[i-2][0],a[i-1][1]-a[i-2][1]],v2=[a[i][0]-a[i-1][0],a[i][1]-a[i-1][1]];const s1=Math.hypot(...v1),s2=Math.hypot(...v2);cnt++;
      if(s1>.3&&s2>.3&&(v1[0]*v2[0]+v1[1]*v2[1])/(s1*s2)<-.17)rev++;{const jj=Math.hypot(v2[0]-v1[0],v2[1]-v1[1]);jerk.push(jj);(window.__JB=window.__JB||{})[Math.floor(i/100)]=(window.__JB[Math.floor(i/100)]||0)+(jj>.3?1:0);}sp.push(s2);hjump.push(Math.abs(a[i][3]-a[i-1][3]));
      const dy=Math.atan2(Math.sin(a[i][2]-a[i-1][2]),Math.cos(a[i][2]-a[i-1][2]));if(Math.abs(dy)>.5)yawFlip++;steps++;}}
  jerk.sort((x,y)=>x-y);hjump.sort((x,y)=>x-y);const q=(A,p)=>A[Math.floor(A.length*p)]||0;
  return {units:tr.size,ticks:ticks,reversalsPer1000:+(rev*1000/Math.max(1,cnt)).toFixed(2),jerkP95:+q(jerk,.95).toFixed(3),jerkP99:+q(jerk,.99).toFixed(3),heightJumpP99:+q(hjump,.99).toFixed(3),heightJumpMax:+(hjump[hjump.length-1]||0).toFixed(2),hjumpsOver08:hjump.filter(v=>v>.8).length,yawJumps:yawFlip,
    meanSpeedPerTick:+(sp.reduce((a,b)=>a+b,0)/Math.max(1,sp.length)).toFixed(3),trace:ids.slice(0,3).map(i=>tr.get(i).filter((_,k)=>k%10==0).map(p=>p.slice(0,2).map(v=>Math.round(v*10)/10)))};}`;
const res = {};
for (const sc of SC) {
  if (sc === 'wind') { // wind on grass/bushes/trees: fixed game clock, low camera over a meadow, consecutive frames
    await boot('fulda', 7); await page.evaluate(() => T.step(60)); if (!NF) continue;
    const dir = path.join(ROOT, 'orch', 'shots', 'smooth-inf', TAG + '-frames', 'wind'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    await page.evaluate(() => { QUAL.caps = [.8, .8, .8, .8, .8, .8]; QUAL.lv = 1; POST.phone = true; POST.w = 0; resize(); window.__t0 = performance.now.bind(performance); window.FAKE = 0; performance.now = () => window.FAKE; });
    for (let i = 0; i < NF; i++) {
      const jpg = await page.evaluate(([i, fps]) => { window.FAKE = 20000 + i * 1000 / fps; const c = BASES[0], o = BASES[1]; cam.x = c[0] + (o[0] - c[0]) * .22; cam.y = c[1] + (o[1] - c[1]) * .22; cam.dist = 170; cam.yaw = .5;
        window.CAPF = fps; renderFrame(1 / fps); return R3.domElement.toDataURL('image/jpeg', .85); }, [i, FPS]);
      fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.jpg'), Buffer.from(jpg.split(',')[1], 'base64')); }
    continue; }
  await boot('fulda', 7); await page.evaluate(() => T.step(600));
  const ids = await page.evaluate(src => (0, eval)(src)(), SETUP[sc]);
  const r = await page.evaluate(([m, ids]) => (0, eval)(m)(ids, 900), [METR, ids]);
  res[sc] = r; console.log('TR',JSON.stringify(await page.evaluate(()=>window.__TR||null))); console.log('JB',JSON.stringify(await page.evaluate(()=>window.__JB))); if(sc==='bridge')console.log('JUMPS',JSON.stringify(await page.evaluate(()=>window.__J))); const { trace, ...rest } = r; console.log(TAG, sc, JSON.stringify(rest));
  if (NF) { // visual frames: re-run scene from the same seed, camera follows the group
    await boot('fulda', 7); await page.evaluate(() => T.step(600)); const ids2 = await page.evaluate(src => (0, eval)(src)(), SETUP[sc]); await page.evaluate(n => T.step(n), sc === 'bridge' ? 330 : 120);
    const dir = path.join(ROOT, 'orch', 'shots', 'smooth-inf', TAG + '-frames', sc); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    await page.evaluate(() => { QUAL.caps = [.8, .8, .8, .8, .8, .8]; QUAL.lv = 1; POST.phone = true; POST.w = 0; resize(); });
    for (let i = 0; i < NF; i++) {
      const jpg = await page.evaluate(([ids, sc, i, fps]) => { T.step(Math.round(60 / fps)); let x = 0, y = 0, n = 0; for (const e of G.ents) if (ids.includes(e.id) && !e.dead) { x += e.x; y += e.y; n++; }
        if (n) { x /= n; y /= n; const px = sc === 'bridge' ? window.TR_BR.t[0] : 1, py = sc === 'bridge' ? window.TR_BR.t[1] : 0; cam.x = x; cam.y = y; cam.dist = sc === 'bridge' ? 120 : 200; cam.yaw = sc === 'bridge' ? Math.atan2(window.TR_BR.n[1], window.TR_BR.n[0]) + 1.2 : .6; }
        window.CAPF = fps; renderFrame(1 / fps); return R3.domElement.toDataURL('image/jpeg', .85); }, [ids2, sc, i, FPS]);
      fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.jpg'), Buffer.from(jpg.split(',')[1], 'base64')); }
  }
}
fs.writeFileSync(path.join(ROOT, 'orch', 'out', `smoothinf-${TAG}.json`), JSON.stringify(res));
await browser.close(); server.close();
