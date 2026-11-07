// A1 follow-up: TWO live "Fight it" battles in a row (retreat from the first, back to the map, fight again: the 3D scene is reused), real render loop, draws swallowed (software GL).
//
//   node orch/grandlive2.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'laneA');
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

const fails = [];
// headless Chromium draws with software GL (~seconds per frame, says nothing about a real GPU — see orch/SMOOTH.md), so while
// window.__noDraw is set the draw calls are swallowed (three.js still counts them); everything the game's own code does still runs
await ctx.addInitScript(() => { window.__noDraw = true; for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) { const o = P[fn]; if (o) P[fn] = function () { if (!window.__noDraw) return o.apply(this, arguments); }; } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { const t = m.text(); if (/grandlive|LIVE|battle start|watchdog/.test(t)) console.log('  [page] ' + t.slice(0, 400)); if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) errs.push('console: ' + t.slice(0, 240)); });
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot = async (n) => { await page.evaluate(() => { window.__noDraw = false; }); await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(() => console.log('  (screenshot skipped ' + n + ')')); await page.evaluate(() => { window.__noDraw = true; }); };
const ev = (fn, arg) => page.evaluate(fn, arg);
const clickText = async (sel, re) => { const ok = await ev(([s, r]) => { const b = [...document.querySelectorAll(s)].find(x => new RegExp(r).test(x.textContent) && x.offsetParent !== null); if (b) { b.click(); return true; } return false; }, [sel, re]); if (!ok) throw new Error('no button ' + re); };
const NAT = arg('nat', 'IR');
try {
  // NOTE: no waiting for models to finish — a player clicks as soon as the menu shows.
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => { const b = document.getElementById('grandBtn'); return !!b && !!document.querySelector('#mxmenu .mxi'); }, null, { timeout: 120000 });  // menu v3: the title shows; the old grand button is parked hidden
  const SAVE = arg('save', '');   // a saved campaign from an older build (old map): Continue must not lead into a broken battle
  if (SAVE) await ev((s) => { localStorage.setItem(GR_KEY, s); }, fs.readFileSync(SAVE, 'utf8'));
  await page.evaluate(() => document.getElementById('grandBtn').click());
  if (SAVE && await ev(() => [...document.querySelectorAll('#campScreen button')].some(b => /Continue/.test(b.textContent)))) { console.log('continuing old save'); await clickText('#campScreen button', 'Continue'); }
  else { await clickText('#campScreen button', 'New campaign');
  await ev((n) => { const s = document.querySelector('#campScreen select'); s.value = n; s.onchange(); }, NAT);
  await clickText('#campScreen button', '^Begin$'); }
  await page.waitForFunction(() => !!document.getElementById('grandScreen') && typeof GC !== 'undefined' && GC, null, { timeout: 60000 });
  await shot('live2-map');
  await shot('live2-map');
  page.on('dialog', d => d.accept());
  let st = null;
  for (const round of [1, 2]) {   // round 2 = a SECOND live battle after retreating from the first (the 3D scene is reused)
  // march our army into an adjacent enemy province (war declared) — the order itself goes through the normal order function
  const sc = await ev((me) => { let pair = null, foe = null;
    for (const p of GCM.P) { if (!p.land || GC.prov[p.i].o !== me) continue; for (const j of p.adj) { const o = GC.prov[j].o; if (GCM.P[j].land && o && o !== me) { pair = [p.i, j]; foe = o; break; } } if (pair) break; }
    if (!pair) return { err: 'no border' };
    if (!grAtWar(me, foe)) grDeclare(me, foe);
    const a = GC.armies.filter(x => x.o === me && x.u.length && !x.path.length).sort((x, y) => y.u.length - x.u.length)[0]; a.at = pair[0]; a.path = []; GV.sel = pair[0]; GV.selA = a.id; grandMapRefresh();
    const r = grOrderMove(a.id, pair[1]); GC.armies.filter(x => x.o !== me).forEach(x => { x.path = []; });
    return { foe, ok: !!r.ok, from: GCM.P[pair[0]].n, to: GCM.P[pair[1]].n, units: a.u.length }; }, NAT);
  console.log('scenario', JSON.stringify(sc)); if (sc.err || !sc.ok) throw new Error('scenario ' + JSON.stringify(sc));
  await page.click('#gPlay'); await page.keyboard.press('5'); // no End turn any more: play time at speed 5 like a player (month ≈ 3 s)

  await page.waitForFunction(() => !!document.getElementById('gModal'), null, { timeout: 120000 });
  // there may be several battles queued; take the first one live
  await shot('live2-prompt' + round);
  const t0 = Date.now();
  await ev(() => { if (window.__gbw) return; window.__gbw = 1; const f = grandBattleStart; window.grandBattleStart = (b) => { const t = performance.now(); try { return f(b); } finally { console.log('grandlive: grandBattleStart sync ' + Math.round(performance.now() - t) + ' ms'); } }; });
  await clickText('#gModal button', 'Fight it live');
  // the battle must be RUNNING within 90 s: G exists, loading screen gone, game time advancing, a frame drawn, units on the field
  const dl = Date.now() + 240000; for (let i = 0; Date.now() < dl; i++) { await page.waitForTimeout(1000);
    st = await ev(() => { const g = typeof G !== 'undefined' && G; const ls = document.getElementById('loading') || document.getElementById('load');
      return { g: !!g, grand: !!(g && g.grand), t: g ? +(g.t || g.time || 0).toFixed?.(2) ?? 0 : 0, tick: g ? (g.tick || g.frame || 0) : 0, LOADING: !!window.LOADING, ls: ls ? getComputedStyle(ls).display + '/' + (ls.hidden ? 'h' : 'v') : '-', ents: g ? g.ents.filter(e => !e.isB && !e.dead).length : 0, over: g ? !!g.over : null,
        gs: (document.getElementById('grandScreen') || {}).style ? document.getElementById('grandScreen').style.display : '-', camp: !!document.getElementById('campScreen') }; });
    if (i % 20 === 0) console.log('  t+' + i + 's', JSON.stringify(st));
    if (process.env.PROFILE && st.g && !st.LOADING && !globalThis.__prof) { globalThis.__prof = 1; const cdp = await ctx.newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); await page.waitForTimeout(25000); const { profile } = await cdp.send('Profiler.stop');
      const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n])); const dts = profile.timeDeltas; for (let k = 0; k < profile.samples.length; k++) { const n = byId.get(profile.samples[k]); const key = n.callFrame.functionName + ' ' + n.callFrame.url.split('/').pop() + ':' + n.callFrame.lineNumber; self.set(key, (self.get(key) || 0) + (dts[k] || 0)); }
      const tot = [...self.values()].reduce((a, b) => a + b, 0); console.log('PROFILE self top (of ' + Math.round(tot / 1000) + ' ms):'); for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log('   ' + Math.round(v / 1000) + ' ms  ' + k.slice(0, 120)); }
    if (st.g && st.grand && !st.LOADING && st.ents > 0) { const a = await ev(() => ({ t: G.t, p: !!G.paused, h: !!G.ldHold })); await page.waitForTimeout(3000); const b = await ev(() => ({ t: G.t, p: !!G.paused, h: !!G.ldHold, fs: typeof FPS !== 'undefined' ? FPS : null }));
      st.clock = [a, b]; if (b.t - a.t > 0.5) { st.running = true; break; } }
  }
  console.log('live ' + round, ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(st));
  await shot('live2-battle' + round);
  if (!st || !st.running) break;
  if (process.env.PROFILE) { const pr = await ev(() => { const o = {}; let t = performance.now(); for (let i = 0; i < 3; i++) renderFrame(1 / 60); o.render = Math.round((performance.now() - t) / 3);
      t = performance.now(); for (let i = 0; i < 10; i++) simUpdate(1 / 60); o.sim = Math.round((performance.now() - t) / 10); o.ents = G.ents.length; o.map = G.mapKey; o.W = MAPW + 'x' + MAPH;
      try { o.calls = R3.info.render.calls; o.tris = R3.info.render.triangles; o.geo = R3.info.memory.geometries; } catch (e) {} o.FT = FT.slice(-10).map(x => Math.round(x * 1000)); return o; });
    console.log('PROFILE', JSON.stringify(pr)); }
  if (round === 1) { await page.click('#gbRet'); await page.waitForFunction(() => [...document.querySelectorAll('#campScreen button')].some(b => /Return to the map/.test(b.textContent)), null, { timeout: 60000 });
    await clickText('#campScreen button', 'Return to the map'); await page.waitForTimeout(800);
    for (let k = 0; k < 6 && await ev(() => !!document.getElementById('gModal')); k++) await clickText('#gModal button', 'Auto-resolve|OK|Continue|Close');
    await page.waitForFunction(() => document.getElementById('grandScreen') && document.getElementById('grandScreen').style.display !== 'none' && GC.ph === 'plan', null, { timeout: 60000 }).catch(() => fails.push('map did not come back to planning after the battle')); }
  }
  if (!st || !st.running) fails.push('live battle never started running: ' + JSON.stringify(st));
} catch (e) { fails.push(String(e.message || e).split('\n')[0]); }
for (const e of [...new Set(errs)].slice(0, 8)) fails.push(e);
await browser.close(); server.close();
if (fails.length) { console.log('\nGRANDLIVE2 FAIL'); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nGRANDLIVE2 PASS');
