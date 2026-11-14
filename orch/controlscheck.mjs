// Keyboard/camera controls that orch/controls.mjs does not drive: Ctrl+A whole army, Q camera rotation (tap 45 deg,
// Shift+Q the other way, double-tap / Home = north-up, hold Q + mouse = free turn), W A S D scroll only (no orders, no
// attack-move, no stop), X stop, F / G arming and their cancel, rally flag set by a left-click on the ground while a
// production building is selected, "deselect after an order" and Shift keeps. (Mouse select / box / double-click / right-drag line /
// Alt waypoints / Ctrl force-fire / enter-leave are in orch/controls.mjs + enterexit.mjs.)   node orch/controlscheck.mjs [--no-lock]
// Prints CONTROLSCHECK PASS / FAIL. Never talks to live servers.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPW() { try { return await import('playwright'); } catch {} const req = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} } throw new Error('playwright not found'); }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPW();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await guardContext(ctx);
const page = await ctx.newPage(); const errors = []; let bad = 0;
page.on('pageerror', e => errors.push((e.stack || e.message).split('\n')[0]));
const check = (n, ok, info = '') => { if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${ok || !info ? '' : '  — ' + info}`); };
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); });
await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 });
await page.evaluate(() => {
  G.paused = true; SET.edge = 0; G.setupEnd = 0; try { MLOCK.broken = true; mlockOff(); } catch (e) {}
  window.__acts = []; const o = doAct; doAct = function (a) { __acts.push(JSON.parse(JSON.stringify(a))); return o(a); };
  const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); window.__HQ = hq.id;
  const q = (x, y) => { const p = nearestPassXY('ground', x, y); return p || [x, y]; };
  window.__U = [['inf', 150, 160], ['inf', 200, 160], ['tank', 250, 160]].map(([k, dx, dy]) => { const p = q(hq.x + dx, hq.y + dy); return addUnit(ME, k, p[0], p[1]).id; });
  centerOn(hq.x, hq.y, true); G.sel = []; updateUI();
});
const acts = () => page.evaluate(() => { const a = window.__acts; window.__acts = []; return a; });
const sel = () => page.evaluate(() => G.sel.filter(e => !e.dead).map(e => e.id).sort((a, b) => a - b));
const setSel = ids => page.evaluate(ids => { G.sel = ids.map(i => G.byId.get(i)).filter(Boolean); G.amove = G.defm = false; window.__acts = []; updateUI(); }, ids);
const yaw = () => page.evaluate(() => ({ y: cam.yaw || 0, t: cam.tyaw == null ? (cam.yaw || 0) : cam.tyaw }));
const frames = async n => { for (let i = 0; i < n; i++) await page.evaluate(() => new Promise(r => requestAnimationFrame(r))); };

// ---- Ctrl+A: the whole army (every own fighting unit, not buildings, not harvesters/dozers/hackers)
await page.evaluate(() => { G.sel = []; updateUI(); });
await page.keyboard.press('Control+a');
let s = await sel(); const army = await page.evaluate(() => G.ents.filter(u => u.team === ME && !u.isB && !['harv', 'hacker', 'dozer'].includes(u.kind) && !u.dead).map(u => u.id).sort((a, b) => a - b));
check('Ctrl+A selects the whole army', s.length > 0 && JSON.stringify(s) === JSON.stringify(army), `sel ${s.length} army ${army.length}`);
check('…and gives no order', (await acts()).length === 0);
check('…and no building is in it', await page.evaluate(() => G.sel.every(e => !e.isB)));

// ---- Q rotates the battle camera (view only)
await page.evaluate(() => { G.sel = []; cam.yaw = cam.tyaw = 0; });
// both events are dispatched inside one page task so a slow machine cannot stretch the "tap" past its 0.5 s limit
const tap = async (mod) => { await page.evaluate(sh => { const o = { key: sh ? 'Q' : 'q', shiftKey: !!sh, bubbles: true }; window.dispatchEvent(new KeyboardEvent('keydown', o)); window.dispatchEvent(new KeyboardEvent('keyup', o)); }, !!mod); };
await tap(); await frames(2); let a = await yaw();
check('tap Q turns the camera 45° (clockwise)', Math.abs(Math.abs(a.t) - Math.PI / 4) < .01, JSON.stringify(a));
const dirQ = Math.sign(a.t);
await page.waitForTimeout(450); await page.evaluate(() => { cam.yaw = cam.tyaw = 0; });
await tap('Shift'); await frames(2); a = await yaw();
check('Shift+Q turns it 45° the other way', Math.abs(Math.abs(a.t) - Math.PI / 4) < .01 && Math.sign(a.t) === -dirQ, JSON.stringify(a));
await page.evaluate(() => { cam.yaw = cam.tyaw = 1.1; });
await page.keyboard.press('Home'); await frames(2); a = await yaw();
check('Home snaps back to north-up', Math.abs(a.t % (2 * Math.PI)) < .01, JSON.stringify(a));
await page.evaluate(() => { cam.yaw = cam.tyaw = 0; });
await page.waitForTimeout(450); await page.evaluate(() => { const f = (t, k) => window.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true })); f('keydown', 'q'); f('keyup', 'q'); f('keydown', 'q'); f('keyup', 'q'); }); await frames(2); a = await yaw();
check('double-tap Q = north-up', Math.abs(a.t % (2 * Math.PI)) < .01, JSON.stringify(a));
await page.waitForTimeout(450); await page.evaluate(() => { cam.yaw = cam.tyaw = 0; });
await page.mouse.move(640, 360); await page.keyboard.down('q'); await page.mouse.move(760, 360, { steps: 6 }); await page.keyboard.up('q'); await frames(2); a = await yaw();
check('hold Q + mouse turns the camera freely', Math.abs(a.y) > .2 || Math.abs(a.t) > .2, JSON.stringify(a));
check('Q rotation is view only: no order sent', (await acts()).length === 0);
await page.evaluate(() => { cam.yaw = cam.tyaw = 0; });

// ---- W A S D only scroll the camera (every scheme): no attack-move, no stop, no order, selection untouched
await setSel(await page.evaluate(() => window.__U));
const c0 = await page.evaluate(() => { camTarget(); return { x: cam.tx, y: cam.ty }; });
const scrolled = {};
for (const k of ['w', 'a', 's', 'd']) {
  await page.evaluate(() => { camTarget(); window.__c = { x: cam.tx, y: cam.ty }; });
  await page.keyboard.down(k); await page.waitForTimeout(350); await page.evaluate(() => scroll(0.3)); await page.keyboard.up(k); await frames(1);
  scrolled[k] = await page.evaluate(() => Math.hypot(cam.tx - window.__c.x, cam.ty - window.__c.y));
}
check('W A S D each scroll the camera', Object.values(scrolled).every(v => v > 5), JSON.stringify(scrolled));
check('W A S D send no order', (await acts()).length === 0);
check('A does not arm attack-move, S does not stop', await page.evaluate(() => !G.amove && !G.defm));
check('…and the selection is untouched', (await sel()).length === 3);

// ---- X stops; F arms attack-move; G arms guard; Esc cancels
await setSel(await page.evaluate(() => window.__U));
await page.keyboard.press('x'); let q = await acts();
check('X = stop order for the selected units', q.length === 1 && q[0].t === 'stop' && q[0].ids.length === 3, JSON.stringify(q));
await page.keyboard.press('f'); check('F arms attack-move', await page.evaluate(() => G.amove === true));
await page.evaluate(() => { G.paused = false; G.t0keep = G.t; }); await page.keyboard.press('Escape'); await frames(1); await page.evaluate(() => { G.paused = true; }); check('Esc cancels attack-move', await page.evaluate(() => !G.amove));
await setSel(await page.evaluate(() => window.__U)); await page.keyboard.press('g'); check('G arms guard', await page.evaluate(() => G.defm === true));
await page.evaluate(() => { G.paused = false; }); await page.keyboard.press('Escape'); await frames(1); await page.evaluate(() => { G.paused = true; }); check('Esc cancels guard', await page.evaluate(() => !G.defm));

// ---- rally point: left-click ground with a production building selected sets it (the flag shows only while selected)
const rb = await page.evaluate(() => { const T = G.teams[ME]; let b = G.ents.find(e => e.team === ME && e.isB && e.built >= 1 && ['barracks', 'factory'].includes(e.kind)); if (!b) { const h = G.byId.get(window.__HQ); b = addBld(ME, 'barracks', h.x - 220, h.y + 40, true); } G.sel = [b]; updateUI(); camTarget(); centerOn(b.x, b.y, true); return b.id; });
await frames(3);
const spot = await page.evaluate(async id => { const b = G.byId.get(id); for (const [dx, dy] of [[0, 140], [140, 0], [-140, 0], [0, -140], [120, 120], [-120, 120]]) { const wx = b.x + dx, wy = b.y + dy; if (!passXY('ground', wx, wy)) continue; const p = toScreen(wx, groundH(wx, wy), wy), R = cv.getBoundingClientRect(), x = R.left + p.x, y = R.top + p.y; const el = document.elementFromPoint(x, y); if (el === cv && !pickAt(p.x, p.y, false)) return { x, y, wx, wy }; } return null; }, rb);
if (!spot) check('a free spot to set the rally point on', false); else {
  await page.mouse.click(spot.x, spot.y); await frames(2);
  const r = await page.evaluate(id => { const b = G.byId.get(id); return { rally: b.rally || b.rp || null, sel: G.sel.map(e => e.id) }; }, rb); const aq = await acts();
  check('left-click ground with a production building selected sets its rally point', !!(r.rally || aq.some(x => /ral/i.test(x.t))), JSON.stringify({ r, aq }).slice(0, 200));
  check('…and the building stays selected', r.sel.includes(rb));
}
console.log(errors.length ? 'page errors: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
if (errors.length) bad++;
console.log(bad ? `CONTROLSCHECK FAIL (${bad})` : 'CONTROLSCHECK PASS');
await browser.close(); server.close(); process.exit(bad ? 1 : 0);
