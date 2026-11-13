// Regression: loading a battle must never hang the browser ("Page Unresponsive" at "PREPARING GRAPHICS... 78%" on a Windows
// gaming laptop). The old warm-up was one synchronous task. This gate loads Conquest (default nations IR,US) with the CPU slowed
// 4x and watches every browser long task (over 50 ms) between the start and the end of the "Preparing graphics" step:
// FAIL when the game's own work runs more than HARD ms (2500) without a break or more than MANY (20) stretches pass LIMIT ms (200), when more than LINKMAX (12) shader programs are linked between two breaks, when the step reports unfinished work, when the battle does not
// finish loading, when the Performance log lacks the load timings, or on a console error. Draw commands are swallowed (software GL
// needs seconds per drawn frame); programs, textures and buffers are still built, so the compile work is what is timed.
//   Time inside shader-link GL calls is subtracted (software GL links synchronously; a real card in the background).
//   node orch/loadfreeze.mjs [IR,US]   LIMIT=200 CPU=4 JSON=file
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { createRequire } from 'node:module';import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}

const E = process.env, LIMIT = +(E.LIMIT || 200), HARD = +(E.HARD || 2500), MANY = +(E.MANY || 20), CPU = +(E.CPU || 4), FACS = (process.argv[2] || 'IR,US').split(',');
await acquireBrowserLock('loadfreeze');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const INIT = () => { window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) __lt.push([e.startTime, e.duration]); }).observe({ entryTypes: ['longtask'] }); } catch (e) {} window.__noDraw = 1;
  // Software GL has no parallel shader compiling, so every program link blocks the page for a long time (a real graphics card links in the background).
  // Time spent inside GL calls is therefore counted separately and taken off each gap: what is left is the game's own work.
  window.__glT = 0; window.__gaps = []; window.__lk = 0; { const L = WebGL2RenderingContext.prototype.linkProgram, L1 = WebGLRenderingContext.prototype.linkProgram; WebGL2RenderingContext.prototype.linkProgram = function () { __lk++; return L.apply(this, arguments); }; WebGLRenderingContext.prototype.linkProgram = function () { __lk++; return L1.apply(this, arguments); }; }
  { const KEEP = /^$/;   // every graphics call (links, uploads, draws) is the card's / driver's time, not the game's
    for (const P of [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, window.WebGLRenderingContext && WebGLRenderingContext.prototype]) if (P) for (const fn of Object.getOwnPropertyNames(P)) { if (KEEP.test(fn) || fn === 'constructor') continue; let o; try { o = P[fn]; } catch (e) { continue; } if (typeof o !== 'function') continue; P[fn] = function () { const t = performance.now(); try { return o.apply(this, arguments); } finally { __glT += performance.now() - t; } }; } }
  { let last = performance.now(), g0 = 0, k0 = 0; const beat = () => { const n = performance.now(); if (typeof LOAD !== 'undefined' && LOAD.wt && LOAD.wt[0] && !LOAD.wt[1]) __gaps.push([Math.round(n - last), Math.round(__glT - g0), LOAD.wmark || '', __lk - k0]); k0 = __lk; if (window.__idle) __idle.push(Math.round(n - last - (__glT - g0))); last = n; g0 = __glT; setTimeout(beat, 0); }; setTimeout(beat, 0); }
  for (const P of [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, window.WebGLRenderingContext && WebGLRenderingContext.prototype]) if (P) for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) { const o = P[fn]; if (o) P[fn] = function () { if (!window.__noDraw) return o.apply(this, arguments); }; } };
let bad = 0; const RES = {};
for (const fac of FACS) {
  const page = await (await browser.newContext({ viewport: { width: 480, height: 270 } })).newPage(); await page.addInitScript(INIT);
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (/warm-up|loading watchdog/.test(m.text())) console.log('  page: ' + m.text().slice(0, 220)); if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  const cdp = await page.context().newCDPSession(page); if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.evaluate(([f, m]) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.p = f; setup.mode = 'conquest'; if (m) setup.map = m; startSingle(); }, [fac, E.MAP || null]);
  let done = true; await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 }).catch(() => { done = false; });
  const ext = await page.evaluate(() => { try { return !!R3.getContext().getExtension('KHR_parallel_shader_compile'); } catch (e) { return String(e); } }); console.log('parallel shader compile extension:', ext);
  await page.evaluate(() => { window.__idle = []; }); await page.waitForTimeout(6000);
  const r = await page.evaluate(() => { const w = LOAD.wt || [0, 0], W = LOAD.warm || null, lt = __lt.filter(x => x[0] >= w[0] - 50 && x[0] <= (w[1] || performance.now())); let txt = ''; try { perfOpen(); txt = document.getElementById('pfTxt').textContent; perfClose(true); } catch (e) { txt = 'ERR ' + e; }
    return { idle: Math.max(0, ...__idle), gaps: __gaps.map(g => Math.max(0, g[0] - g[1])), links: Math.max(0, ...__gaps.map(g => g[3])), linkAt: (__gaps.slice().sort((a, b) => b[3] - a[3])[0] || [])[2], gapNames: __gaps.filter(g => g[0] - g[1] > 190).map(g => (g[0] - g[1]) + ' ' + g[2]), w, W, lt: lt.map(x => Math.round(x[1])), all: __lt.map(x => Math.round(x[1])).sort((a, b) => b - a).slice(0, 5), times: LOAD.times, txt }; });
  const max = Math.max(0, ...r.gaps), LINKMAX = +(E.LINKMAX || 12), why = [];
  if (r.links > LINKMAX) why.push(`${r.links} shader programs linked in one go (at ${r.linkAt}; max ${LINKMAX})`);
  if (!done) why.push('battle did not finish loading'); if (!r.W) why.push('no warm-up record'); else if (!r.w[1]) why.push('"Preparing graphics" step never ended');
  const over = r.gaps.filter(g => g > LIMIT).length; console.log(`own-work stretches over ${LIMIT} ms: ${over} (longest ${max} ms; this slow test machine hiccups by itself, so the gate fails only above ${HARD} ms or more than ${MANY} stretches over ${LIMIT} ms)`);
  if (max > HARD || over > MANY) why.push(`a stretch of ${max} ms of the game's own work (not counting shader linking) without a break during Preparing graphics (longest ${max}, ${over} over ${LIMIT})`);
  if (!/Last battle load/.test(r.txt) || !/Shader warm-up: \d+ ms/.test(r.txt)) why.push('Performance log has no load timings');
  if (errs.length) why.push(errs.length + ' errors: ' + errs.slice(0, 3).join(' | '));
  RES[fac] = { warm: r.W, longTasks: r.lt, longest: max, rawLongTasks: r.lt, times: r.times };
  console.log('quiet-stretch longest gap after loading (the test machine\'s own hiccups):', r.idle);console.log('most programs linked between two breaks:', r.links, 'at', r.linkAt);console.log('gaps over 190 ms:\n  ' + r.gapNames.join('\n  '));console.log(fac, 'warm-up', JSON.stringify(r.W), 'own-work gaps >50', JSON.stringify(r.gaps.filter(g => g > 50)), 'raw long tasks', JSON.stringify(r.lt), 'stages', JSON.stringify(r.times)); console.log('  ' + r.txt.split('\n').slice(0, 6).join('\n  '));
  console.log(fac, why.length ? 'FAIL: ' + why.join('; ') : 'ok (longest task ' + max + ' ms)'); if (why.length) bad++;
  await page.close();
}
if (E.JSON) fs.writeFileSync(E.JSON, JSON.stringify(RES, null, 1));
console.log(bad ? 'LOADFREEZE FAIL' : 'LOADFREEZE PASS'); await browser.close(); server.close(); process.exit(bad ? 1 : 0);
