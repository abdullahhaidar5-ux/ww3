// Lane A2 gate: real time with pause on the grand map, as a player: menu → New campaign → Begin → Space (play) → 5 (fastest)
// → days tick and the month rolls over by itself; Space pauses; a march into an enemy at month end opens Fight it and the clock waits.   node orch/grandrt.mjs
// the game's own loop must take it past the loading screen and the battle clock must run.   node orch/grandlive.mjs [--nat IR]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const arg0 = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg0('root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const SAVE = arg0('save', ''), MKSAVE = arg0('mksave', '');
const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'shots', 'laneA');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const NAT = arg('nat', 'IR'), PROF = process.argv.includes('--prof');
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
const fails = [], errs = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot = async n => { await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(() => console.log('  (screenshot skipped ' + n + ')')); };
const ev = (fn, a) => page.evaluate(fn, a);
const click = async (sel, txt) => { const ok = await ev(([s, t]) => { const b = [...document.querySelectorAll(s)].find(x => !t || new RegExp(t).test(x.textContent)); if (!b) return false; b.click(); return true; }, [sel, txt]); if (!ok) throw new Error('no button ' + sel + ' ' + (txt || '')); };
const t0 = Date.now(), el = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => !!document.getElementById('grandBtn'), null, { timeout: 60000 });
  await page.mouse.click(800, 450).catch(() => {});
  await ev(() => localStorage.removeItem('ww3grand1'));
  await click('#grandBtn'); await page.waitForTimeout(300);
  await click('button', '^New campaign'); await page.waitForTimeout(300);
  await ev(n => { const s = [...document.querySelectorAll('select')].find(x => [...x.options].some(o => o.value === n)); if (s) { s.value = n; s.onchange && s.onchange(); } }, NAT);
  await click('button', '^Begin$');
  await page.waitForFunction(() => { const e = document.getElementById('grandScreen'); return e && e.style.display !== 'none'; }, null, { timeout: 60000 });
  await page.waitForTimeout(1500); console.log(el(), 'map open');
  const st = () => ev(() => ({ turn: GC.turn, day: GC.day | 0, date: (document.getElementById('gDate') || {}).textContent, spd: GV.spd | 0, ph: GC.ph, modal: !!document.getElementById('gModal') }));
  // close any start-of-campaign popup the player would close
  await ev(() => { const m = document.getElementById('gModal'); if (m) { const b = [...m.querySelectorAll('button')].pop(); if (b) b.click(); } });
  const s0 = await st(); console.log(el(), 'start', JSON.stringify(s0));
  if (s0.spd) fails.push('the clock should start paused');
  await page.waitForTimeout(1200); if ((await st()).day !== s0.day) fails.push('days pass while paused');
  await page.keyboard.press('Space'); await page.waitForTimeout(4000); const s1 = await st(); console.log(el(), 'after Space', JSON.stringify(s1));
  if (!s1.spd || s1.day === s0.day) fails.push('Space does not start the clock ' + JSON.stringify(s1));
  await page.keyboard.press('5'); await shot('rt-1-running');
  await page.waitForFunction(t => GC.turn > t, s0.turn, { timeout: 20000, polling: 200 }).catch(() => fails.push('the month never rolled over at speed 5'));
  const s2 = await st(); console.log(el(), 'month rolled', JSON.stringify(s2));
  await page.keyboard.press('Space'); await page.waitForTimeout(300); const s3 = await st(); await page.waitForTimeout(1500); const s4 = await st();
  console.log(el(), 'paused', JSON.stringify(s4)); if (s4.spd || s4.day !== s3.day || s4.turn !== s3.turn) fails.push('Space does not pause');
  // march into an enemy; play; when the month closes the battle prompt opens and the clock must wait
  const sc = await ev(() => { const me = GC.me; let foe = null;
    const tryFind = () => { for (const a of GC.armies.filter(x => x.o === me && x.u.length && !x.fl)) for (const j of GCM.P[a.at].adj) { const P = GCM.P[j]; if (P.land && GC.prov[j].o !== me && grAtWar(me, GC.prov[j].o)) return [a, j]; } return null; };
    let f = tryFind(); if (!f) { for (const a of GC.armies.filter(x => x.o === me && x.u.length && !x.fl)) { for (const j of GCM.P[a.at].adj) { const P = GCM.P[j]; if (P.land && GC.prov[j].o !== me) { foe = GC.prov[j].o; break; } } if (foe) break; } if (foe) grDeclare(me, foe); f = tryFind(); }
    if (!f) return { err: 'no army next to an enemy' }; const [a, j] = f; GV.selA = a.id; GV.sel = a.at; const r = grOrderMove(a.id, j); guMoveTo(a.id, j); grandMapRefresh(); return { ok: !!(r && r.ok), hint: GV.hint }; });
  console.log(el(), 'march', JSON.stringify(sc)); if (!/arrives ~/.test(sc.hint || '')) fails.push('move hint shows no arrival date: ' + sc.hint);
  // the marching army must slide along its road as days pass (not jump at month end)
  const pos = () => ev(() => { const e = G3 && G3.arm && G3.arm.get(GV.selA); const a = GC.armies.find(x => x.id === GV.selA); return e ? { x: e.x, z: e.z, f: a ? grSlide(a) : -1, day: GC.day | 0 } : null; });
  const p0 = await pos(); await ev(() => guSpeed(3)); await page.waitForFunction(d => GC.ph !== 'plan' || (GC.day | 0) >= d + 3, p0 ? p0.day : 0, { timeout: 30000, polling: 100 }).catch(() => {}); await page.waitForTimeout(600);
  const p1 = await pos(); console.log(el(), 'slide', JSON.stringify([p0, p1]));
  if (p0 && p1 && p1.day > p0.day && !(p1.f > p0.f && Math.hypot(p1.x - p0.x, p1.z - p0.z) > 1)) fails.push('marching army does not slide along its road as days pass ' + JSON.stringify([p0, p1]));
  await shot('rt-3-sliding');
  await page.waitForFunction(() => { const m = document.getElementById('gModal'); return m && /Fight it live/.test(m.textContent); }, null, { timeout: 60000, polling: 200 }).catch(() => fails.push('no battle prompt after the month closed'));
  const b1 = await st(); await page.waitForTimeout(2000); const b2 = await st(); console.log(el(), 'battle prompt', JSON.stringify(b2)); await shot('rt-2-battle-pauses');
  if (b1.day !== b2.day || b1.turn !== b2.turn) fails.push('the clock runs while a battle prompt is open');
  // A2: AI generals act on day ticks (10, 20): deterministic, army orders only (no recruiting/spending), mid-month columns slide from their departure day
  const ai = await ev(() => { const s = JSON.stringify(GC); const run = () => { GC = JSON.parse(s); GC.ph = 'plan'; GC.day = 10; const cash = Object.values(GC.nat).map(n => n.cash | 0).join(); const idle = new Set(GC.armies.filter(a => !a.path.length).map(a => a.id)); const n = grAIMid(10); GV.dayF = 0;
      const moved = GC.armies.filter(a => idle.has(a.id) && a.path.length); return { n, sig: GC.armies.map(a => a.id + ':' + a.path.join('-')).join(','), cash: cash === Object.values(GC.nat).map(n => n.cash | 0).join(), f0: moved.length ? grSlide(moved[0]) : 0 }; };
    const r1 = run(), r2 = run(); GC = JSON.parse(s); return { n: r1.n, same: r1.sig === r2.sig && r1.n === r2.n, cash: r1.cash, f0: r1.f0 }; });
  console.log(el(), 'AI mid-month', JSON.stringify(ai));
  if (!ai.same) fails.push('mid-month AI orders are not deterministic'); if (!ai.cash) fails.push('mid-month AI spent money (should only give army orders)'); if (ai.f0 > 0.01) fails.push('a column that set off mid-month jumps along its road');
} catch (e) { fails.push('error: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 5));
await browser.close(); server.close();
console.log(fails.length ? 'GRANDRT FAIL\n  ' + fails.join('\n  ') : 'GRANDRT PASS'); process.exit(fails.length ? 1 : 0);
