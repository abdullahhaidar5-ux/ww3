// Reference capture from the BROWSER game, to compare with the Godot edition's sound (orch/reports/gport-p5.md).
// Runs IR vs US (both AI, you watch as IR) on Split Ridge, jumps to minute 5.5, then records 60 s of the game's own
// output (AU.out -> MediaRecorder) and logs every clip the game starts (effects, unit lines, radio, announcer, shouts, music).
//   node godot/audio/tools/js_capture.mjs <out-dir>     ->  js.webm, js.log
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(new URL('../../../', import.meta.url).pathname), OUT = process.argv[2] || '.', T0 = +(process.argv[3] || 330), SEC = +(process.argv[4] || 60);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
let pw; try { pw = await import('playwright'); } catch { pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_DIR || '/opt/node22/lib/node_modules/playwright'); }
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
page.on('pageerror', e => console.log('pageerror', String(e).slice(0, 200)));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
const st = await page.evaluate(() => { try { SET.gfx = 'low'; } catch (e) {}
  setup.n = 1; setup.p = 'IR'; setup.a = 'US'; setup.seed = 1; setup.map = 'bm_splitridge';
  initAudio(); startSingle(); if (G && G.teams[0] && !G.teams[0].ai) G.teams[0].ai = mkAI(1);
  return { facs: G.teams.map(t => t.fac), map: G.mapKey, ctx: AU.ctx && AU.ctx.state }; });
console.log('JS battle', JSON.stringify(st));
await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 });
// jump ahead with effects off, then hook the logs and the recorder
const ff = await page.evaluate((T0) => { const h = G.headless; G.headless = true; const t0 = performance.now(); while (G.t < T0 && !G.over) simUpdate(1 / 60); G.headless = h;
  return { t: G.t, over: !!G.over, ms: Math.round(performance.now() - t0), units: G.teams.map((T, i) => G.ents.filter(e => !e.dead && !e.isB && e.team === i).length) }; }, T0);
console.log('fast-forward', JSON.stringify(ff));
await page.evaluate(() => { const L = window.__alog = [], put = (ev, c) => L.push(G.t.toFixed(2) + ' ' + ev + ' ' + c);
  const w = (name, f) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function () { const r = o.apply(this, arguments); try { f(r, arguments); } catch (e) {} return r; }; };
  // global function declarations are window properties in a classic script, so re-binding them here is seen by every caller
  w('sfxClip', (r, a) => { if (r) put('sfx', a[0]); });
  w('voPlay', (r, a) => { if (r && !(AU.__v === AU.voEnd)) { AU.__v = AU.voEnd; put('vo', a[0] + '/' + a[1]); } });
  w('voRPlay', (r, a) => { if (r && !(AU.__v === AU.voEnd)) { AU.__v = AU.voEnd; put('vor', a[0] + '_r/' + a[1]); } });
  w('vohPlay', (r, a) => { if (r) { AU.__v = AU.voEnd; put('voh', a[0] + '_h/' + a[1]); } });
  w('annClip', (r, a) => { if (r) put('ann', 'ann_' + a[0] + '/' + a[1]); });
  w('bfShoutPlay', (r, a) => { if (r) put('shout', G.teams[a[3]].fac + '_s/' + BF_SHOUT[a[0]]); });
  w('stPlay', (r, a) => put('music', a[0] + ' ' + ST.id));
  w('sfxBoom', (r, a) => { window.__lb = [a[0], a[1], G.t]; });
  const c = AU.ctx, d = c.createMediaStreamDestination(); AU.out.connect(d);
  const rec = window.__rec = new MediaRecorder(d.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 }), ch = [];
  rec.ondataavailable = e => ch.push(e.data); window.__recDone = new Promise(res => { rec.onstop = async () => { const b = new Blob(ch), u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); res(btoa(s)); }; });
  // the stand-in for the player's clicks: one select / move / attack line every 6 s (same as Godot's --audio-demo), camera on the newest explosion
  window.__iv = setInterval(() => { try { const us = G.ents.filter(e => !e.dead && !e.isB && e.team === ME).slice(0, 6); G.sel = us; speak(Math.floor(G.t / 6) % 3); G.sel = [];
    if (window.__lb && G.t - window.__lb[2] < 20) centerOn(window.__lb[0], window.__lb[1]); else { const hq = G.ents.find(e => e.isB && e.team === ME); if (hq) centerOn(hq.x, hq.y); } } catch (e) {} }, 3000);
  window.__t0 = G.t; rec.start(); });
await page.waitForTimeout(SEC * 1000);
const res = await page.evaluate(async () => { clearInterval(window.__iv); window.__rec.stop(); const b64 = await window.__recDone;
  return { b64, log: window.__alog, dt: G.t - window.__t0, heat: AU.heat, pool: ST.pool, cam: cam.dist, nv: SFX.nv, sfx: SFX.st, units: G.teams.map((T, i) => G.ents.filter(e => !e.dead && !e.isB && e.team === i).length) }; });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'js.webm'), Buffer.from(res.b64, 'base64')); fs.writeFileSync(path.join(OUT, 'js.log'), res.log.join('\n') + '\n');
console.log(`recorded ${SEC}s of real time = ${res.dt.toFixed(1)}s of game time; ${res.log.length} clips; heat ${res.heat.toFixed(2)} pool ${res.pool} cam.dist ${res.cam | 0} sfx sheet ${res.sfx} units ${res.units}`);
await browser.close(); server.close();
