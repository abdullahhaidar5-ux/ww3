// Phone battle-loading test: starts battles the way a phone does (WebKit = Safari's engine, iPhone 13 emulation; falls
// back to Chromium mobile emulation when WebKit isn't installed) and checks each one gets past the loading screen to a
// running battle (G.t > 5 s). Logs every loading step with its time, console errors, WebGL context loss and unhandled
// promise rejections, so a hang on a phone shows which step it is.
//
//   node orch/phoneload.mjs                         # 3 maps incl. a 4-player one, local build
//   node orch/phoneload.mjs --url https://abdullahhaidar5-ux.github.io/ww3/   # the live game instead
//   node orch/phoneload.mjs --chromium              # force Chromium mobile emulation
//   node orch/phoneload.mjs --maps strait,desert --lose   # also: force a WebGL context loss mid-loading (recovery check)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTS = path.join(ROOT, 'orch', 'out', 'phoneload'); fs.mkdirSync(OUTS, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const has = k => process.argv.includes(k);
const LIVE = arg('--url', null);
const TIMEOUT = +arg('--timeout', 240) * 1000;

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
let server = null, URL0 = LIVE;
if (!LIVE) {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
}
const ORIGIN = new URL(URL0).origin;

const pw = await loadPlaywright();
let engine = 'webkit', browser = null;
if (!has('--chromium')) { try { browser = await pw.webkit.launch(); } catch (e) { console.log('WebKit not available (' + String(e.message).split('\n')[0].slice(0, 100) + '), using Chromium'); } }
if (!browser) { engine = 'chromium'; browser = await pw.chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=1024'] }); }
const dev = pw.devices['iPhone 13'];
const ctxOpts = engine === 'webkit' ? { ...dev } : { viewport: dev.viewport, userAgent: dev.userAgent, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
console.log(`phoneload: ${engine}, iPhone 13 (${dev.viewport.width}x${dev.viewport.height}), ${LIVE ? 'live ' + LIVE : 'local build'}`);

const MAPS = (arg('--maps', '') || '').split(',').filter(Boolean);
const runs = MAPS.length ? MAPS.map(m => ({ map: m, n: 1 })) : [{ map: null, n: 1 }, { map: '4p', n: 3 }, { map: 'other', n: 1 }];
const fails = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(spec, i, lose) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  // only this game's own files (no live game servers / CDN from a test)
  await page.route('**/*', r => { const u = r.request().url(); return u.startsWith(ORIGIN) || u.startsWith('data:') || u.startsWith('blob:') ? r.continue() : r.abort(); });
  const log = [], errs = [];
  const T0 = Date.now(), ts = () => ((Date.now() - T0) / 1000).toFixed(1) + 's';
  page.on('pageerror', e => errs.push(ts() + ' page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('crash', () => errs.push(ts() + ' PAGE CRASHED'));
  page.on('console', m => { const t = m.text();
    if (m.type() === 'error' || m.type() === 'warning' || /battle start|context|WebGL|watchdog|loading/i.test(t)) log.push(ts() + ' ' + m.type() + ': ' + t.slice(0, 240)); });
  await page.addInitScript(() => {
    window.__ev = [];
    addEventListener('unhandledrejection', e => window.__ev.push('unhandled rejection: ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 200)));
    addEventListener('webglcontextlost', e => window.__ev.push('webglcontextlost'), true);
    addEventListener('webglcontextrestored', e => window.__ev.push('webglcontextrestored'), true);
  });
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MAPS !== 'undefined', null, { timeout: 90000 });
  const picked = await page.evaluate(({ spec, i }) => {
    const ks = Object.keys(MAPS);
    let m = spec.map;
    if (m === '4p') m = ks.find(k => MAPS[k].max >= 4 && k !== 'strait') || ks[0];
    else if (m === 'other') m = ks.filter(k => k !== 'strait')[i % Math.max(1, ks.length - 1)] || ks[0];
    else if (!m || !MAPS[m]) m = 'strait' in MAPS ? 'strait' : ks[0];
    setup.map = m; setup.n = Math.min(spec.n, MAPS[m].max - 1); setup.tm = []; setup.others = [];
    if (i === 0) setup.p = 'IR'; else if (i === 1) setup.p = 'RS'; else setup.p = 'DW'; // the Shia factions his group plays
    try { initAudio(); } catch (e) {}
    startSingle();
    return { map: m, n: setup.n, p: setup.p };
  }, { spec, i });
  console.log(`\n[${i + 1}] map ${picked.map}, ${picked.p} vs ${picked.n} AI${lose ? ', forced WebGL context loss' : ''}`);
  let lastStep = '', stepAt = Date.now(), ok = false, st = null, lost = false;
  while (Date.now() - T0 < TIMEOUT) {
    await sleep(500);
    st = await page.evaluate(() => {
      const s = document.querySelectorAll('#loadOv .lo-s span'), el = document.getElementById('loadOv');
      return { step: s[0] ? s[0].textContent + ' ' + s[1].textContent : '', loading: !!window.LOADING, shown: !!(el && !el.hidden),
        t: typeof G !== 'undefined' && G ? G.t : -1, ev: window.__ev.splice(0), err: document.getElementById('gfxFail') ? document.getElementById('gfxFail').textContent : '' };
    }).catch(e => ({ step: 'evaluate failed: ' + String(e.message).split('\n')[0], t: -1, ev: [] }));
    for (const e of st.ev) log.push(ts() + ' ' + e);
    if (st.step !== lastStep) { log.push(ts() + ' step: ' + st.step); lastStep = st.step; stepAt = Date.now(); }
    if (lose && !lost && /Preparing graphics|Building the battlefield/.test(st.step)) { lost = true;
      const r = await page.evaluate(() => { try { const x = R3.getContext().getExtension('WEBGL_lose_context'); if (!x) return 'no extension'; x.loseContext(); setTimeout(() => { try { x.restoreContext(); } catch (e) {} }, 1500); return 'lost'; } catch (e) { return 'err ' + e.message; } });
      log.push(ts() + ' forced context loss: ' + r); }
    if (st.err) { log.push(ts() + ' recovery message: ' + st.err.slice(0, 160)); break; }
    if (!st.loading && st.t > 5) { ok = true; break; }
  }
  if (has('--probe')) console.log('   probe: ' + JSON.stringify(await page.evaluate(() => { let tex = 0, ntex = 0, big = []; const seen = new Set();
    for (const k in (MODELS.proto || {})) MODELS.proto[k].scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) for (const p of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) { const t = m[p]; if (!t || seen.has(t)) continue; seen.add(t); const im = t.image || {};
        const b = (im.width || 0) * (im.height || 0) * 4 * 1.33; tex += b; ntex++; if (im.width >= 2048) big.push(k + ':' + p + ':' + im.width); } });
    return { phone: typeof GFX_PHONE !== 'undefined' && GFX_PHONE, gfxPhone: gfxPhone(), dpr: devicePixelRatio, cv: [cv.width, cv.height], protos: Object.keys(MODELS.proto || {}).length,
      texMB: Math.round(tex / 1048576), ntex, big: big.slice(0, 12), nbig: big.length, mem: R3 && R3.info.memory, prog: R3 && R3.info.programs && R3.info.programs.length, post: POST.on }; }).catch(e => e.message)));
  try { await page.screenshot({ path: path.join(OUTS, `run${i + 1}.png`), timeout: 30000 }); } catch {}
  const times = await page.evaluate(() => (window.LOAD && LOAD.times || []).map(([a, b]) => a + ' ' + b).join(', ')).catch(() => '');
  for (const l of log) console.log('   ' + l);
  for (const e of errs) console.log('   ' + e);
  console.log(`   load times: ${times}`);
  const why = ok ? '' : st && st.err ? 'stopped with recovery message' : `stuck at "${lastStep}" for ${((Date.now() - stepAt) / 1000).toFixed(0)} s (G.t ${st && st.t})`;
  console.log(`   ${ok ? '✓' : '✗'} ${ok ? 'battle running after ' + ts() : why}`);
  if (!ok) fails.push(`${picked.map}: ${why}`);
  if (errs.some(e => /page error|CRASHED/.test(e))) fails.push(`${picked.map}: ${errs[0]}`);
  await ctx.close();
}

for (let i = 0; i < runs.length; i++) await run(runs[i], i, false);
if (has('--lose')) await run({ map: null, n: 1 }, runs.length, true);
await browser.close(); if (server) server.close();
console.log(fails.length ? 'PHONELOAD FAIL ' + fails.join('; ') : `PHONELOAD PASS ${engine}: ${runs.length + (has('--lose') ? 1 : 0)} battles reached G.t > 5`);
process.exit(fails.length ? 1 : 0);
