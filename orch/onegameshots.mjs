// onegame proof pictures (2026-11-14): main menu, Play window, Multiplayer, the Battle map list, a Battle with its supply lines
// (minimap + ground), a supplied road and the same road cut by an enemy squad, a unit out of ammo outside the supply area.
//   node orch/onegameshots.mjs      -> orch/concepts/onegame/*.jpg and orch/shots/onegame-supply-*.jpg (1600x900, Low graphics)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'concepts', 'onegame'), SH = path.join(ROOT, 'orch', 'shots'); fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SH, { recursive: true });
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs')); const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url); let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe; try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock('onegameshots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('ww3_settings', JSON.stringify({ gfx: 'low' })); localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} });
await guardContext(ctx);
const page = await ctx.newPage(); await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
const errs = []; page.on('pageerror', e => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a), wait = ms => page.waitForTimeout(ms);
const shot = async (dir, n) => { await wait(600); await page.screenshot({ path: path.join(dir, n + '.jpg'), type: 'jpeg', quality: 80, timeout: 300000 }).catch(e => console.log('  (shot skipped ' + n + ': ' + e.message.split('\n')[0] + ')')); console.log('  shot', n); };
const frames = (n = 3) => ev((n) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const ff = sec => ev((n) => { for (let k = 0; k < Math.ceil(n * 60) && G && !G.over; k++) simUpdate(1 / 60); }, sec);
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MX !== 'undefined' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
await shot(OUT, '01-main-menu');
await ev(() => menuGo('single')); await wait(700); await shot(OUT, '02-play-window');
await ev(() => menuGo('online')); await wait(700); await shot(OUT, '03-multiplayer');
await ev(() => { menuHome(); menuGo('single'); mxMapSync(); menuGo('c-map'); }); await wait(1500); await shot(OUT, '04-battle-map-list');
await ev(() => { try { mapPickerOpen(document.getElementById('mapSel'), () => {}); } catch (e) {} }); await wait(1500); await shot(OUT, '04b-battle-map-picker');
await ev(() => { const w = document.getElementById('mapPickW'); if (w) w.remove(); menuHome(); });
// a Battle on a map with roads: IR vs US
await ev(() => { setup.p = 'IR'; setup.a = 'US'; setup.n = 1; setup.map = 'strait'; try { initAudio(); } catch (e) {} startSingle(); });
await page.waitForFunction(() => typeof G !== 'undefined' && G && !window.LOADING, null, { timeout: 900000, polling: 500 });
await ev(() => { G.paused = false; for (const T of G.teams) if (T.ai) T.ai = null; });   // a still picture: nobody moves on their own
await ff(20);
// a forward depot on the road so the supply line is long and visible
const info = await ev(() => { const hq = G.ents.find(e => e.isB && e.team === ME && e.kind === 'hq'); lgTick(1); const C = G.lg.cov[ME]; let best = null, bl = 0;
  for (const ei in C) for (const v of C[ei].v) if (v[1] - v[0] > bl) { bl = v[1] - v[0]; best = { ei: +ei, s: (v[0] + v[1]) / 2, v }; }
  const p = best ? lgPoint(G.lg.E[best.ei], best.s) : [hq.x, hq.y]; return { hq: { x: hq.x, y: hq.y }, best, p, edges: Object.keys(C).length }; });
console.log('supply line', JSON.stringify(info));
await ev((p) => { LGU.on = true; lgBtnSync(); centerOn(p[0], p[1], true); cam.dist = cam.td = Math.max(cam.td || 900, 1400); G.sel = []; }, info.p); await frames(4); await wait(800);
await shot(OUT, '05-battle-supply-lines'); await shot(SH, 'onegame-supply-1-held');
// cut it: an enemy squad stands on the road half-way along the line
await ev((b) => { const e = G.lg.E[b.ei]; const p = lgPoint(e, b.s); for (let i = 0; i < 4; i++) { const u = addUnit(1, i ? 'inf' : 'tank', p[0] + i * 12, p[1] + (i % 2) * 10); if (u) { u.order = null; u.hold = 1; } } G.lg.cvs = ''; G.supT = 1; updSupply(0.01); lgTick(1.1); }, info.best);
await frames(4); await wait(800);
const cut = await ev((b) => { const c = G.lg.cov[ME][b.ei]; return c ? { v: c.v, d: c.d } : null; }, info.best); console.log('after the cut', JSON.stringify(cut));
await shot(OUT, '06-supply-line-cut'); await shot(SH, 'onegame-supply-2-cut');
// a unit out of ammo outside the supply area, selected (ammo row + red no-supply badge)
const am = await ev(() => { const P = supplyPoints()[ME]; let far = null; for (let k = 0; k < 600 && !far; k++) { const x = 300 + (k * 977) % (MAPW - 600), y = 300 + (k * 613) % (MAPH - 600); if (!G.map.isWater(x, y) && P.every(p => Math.hypot(p.x - x, p.y - y) > p.r + 150)) far = { x, y }; }
  const u = addUnit(ME, 'tank', far.x, far.y); ammoInit(u); u.am = 0; G.supT = 1; updSupply(0.01); G.sel = [u]; centerOn(far.x, far.y, true); cam.dist = cam.td = 520; updateUI(); return { x: far.x, y: far.y, sup: u.sup, am: u.am }; });
console.log('out of ammo', JSON.stringify(am)); await frames(4); await wait(900); await shot(OUT, '07-out-of-ammo-outside-supply');
console.log(errs.length ? 'page errors: ' + errs.slice(0, 3).join(' | ') : 'no page errors');
await browser.close(); server.close(); console.log('ONEGAMESHOTS DONE');
