// Lane E probe: load a Battle in headless Chromium (draws swallowed), list every shader program the warm-up made and every one
// made after the loading screen ("LATE"), with material name and program key. Programs = slow driver compiles on Windows/Direct3D.
//   node orch/progprobe.mjs . [IR] [US] [seconds after loading, 30]     OUT=progs.json   EVAL='js' (run in the page after loading)
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { createRequire } from 'node:module';
const ROOT = path.resolve(process.argv[2] || '.');
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.gz': 'application/gzip', '.webp':'image/webp' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const INIT = () => { window.__lk = 0; window.__lkT = [];
  for (const P of [WebGL2RenderingContext.prototype]) { const L = P.linkProgram; P.linkProgram = function () { __lk++; __lkT.push([Math.round(performance.now()), (window.LOAD && LOAD.wmark) || '', window.LOADING ? 1 : 0]); return L.apply(this, arguments); };
    for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) { P[fn] = function () {}; } } };
const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); await page.addInitScript(INIT);
page.on('console', m => { if (/warm-up|watchdog|LATE|rror/.test(m.text())) console.log('page: ' + m.text().slice(0, 400)); });
page.on('pageerror', e => console.log('ERR', e.message));
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(()=>{});
const P = process.argv[3] || 'IR', A = process.argv[4] || 'US', AFTER = +(process.argv[5] || 30);
const t0 = Date.now();
await page.evaluate(([p, a]) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.p = p; setup.a = a; try{initAudio();}catch(e){} startSingle(); if (G && G.teams[0] && typeof mkAI === 'function') G.teams[0].ai = mkAI(1); }, [P, A]);
const iv=setInterval(async()=>{try{console.log('t',Math.round((Date.now()-t0)/1000),await page.evaluate(()=>[window.LOADING?1:0,window.LOAD&&LOAD.wmark,R3.info.programs.length].join(' ')));}catch(e){}},15000);
await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 250 });
clearInterval(iv);console.log('load wall', Date.now() - t0, 'ms');
if (process.env.EVAL) { const r = await page.evaluate(process.env.EVAL); console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1)); await browser.close(); server.close(); process.exit(0); }
const at = await page.evaluate(() => { window.__p0 = new Set(R3.info.programs); return { n: R3.info.programs.length, W: LOAD.warm, times: LOAD.times, par: !!R3.getContext().getExtension('KHR_parallel_shader_compile') }; });
console.log(JSON.stringify(at));
await page.waitForTimeout(AFTER * 1000);
await page.evaluate(()=>console.log('LATE check G.t '+G.t+' paused '+G.paused));
const r = await page.evaluate(() => { const L = []; for (const p of R3.info.programs) L.push({ late: !__p0.has(p), name: p.name, key: p.cacheKey, used: p.usedTimes }); return { L, gt: G.t, lk: __lk, lkLate: __lkT.filter(x => !x[2]) }; });
fs.writeFileSync(process.env.OUT || 'progs.json', JSON.stringify(r, null, 1));
console.log('programs', r.L.length, 'late', r.L.filter(x => x.late).length, 'G.t', r.gt, 'links', r.lk);
for (const x of r.L.filter(x => x.late)) console.log('LATE', x.name, x.key.slice(0, 300));
await browser.close(); server.close();
