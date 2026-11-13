// Lane A1 gate, as a player reaches it — fresh page, main menu → Grand campaign → New campaign → Begin → march into a
// neighbour at war → let the days run: the fight starts ON the map (Abdullah 2026-11-11 23:57: the campaign never opens the
// real-time battle). No dialog, no loading screen, the clock keeps running; a real mouse click on the crossed-swords / tower
// marker opens the battle or siege window and Esc closes it.   node orch/grandlive.mjs [--nat IR]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const arg0 = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg0('root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const SAVE = arg0('save', '');
const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'shots', 'laneA');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const NAT = arg('nat', 'IR');
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
  // a campaign saved on an older world map (2026-11-06: 174 -> 236 land provinces) must not be offered as Continue (it broke the map and the battle)
  await ev(([k, v]) => { localStorage.setItem(k, v); }, ['ww3grand1', SAVE ? fs.readFileSync(SAVE, 'utf8') : JSON.stringify({ v: 1, me: 'IR', turn: 7, maxTurn: 25, over: null, prov: Array.from({ length: 174 }, () => ({ o: 'IR' })), armies: [], nat: {} })]);
  await click('#grandBtn'); await page.waitForTimeout(300);
  { const m = await ev(() => ({ cont: [...document.querySelectorAll('button')].some(b => /^Continue/.test(b.textContent)), warn: /older world map/.test(document.body.textContent) }));
    console.log(el(), 'stale save in menu', JSON.stringify(m)); if (m.cont) fails.push('menu offers Continue for a campaign saved on an older world map'); if (!m.warn) fails.push('menu does not explain why the old campaign cannot continue'); }
  {
  const hasNew = await ev(() => [...document.querySelectorAll('button')].some(b => /New campaign/.test(b.textContent)));
  if (!hasNew) throw new Error('Grand campaign menu has no New campaign');
  await click('button', '^New campaign'); await page.waitForTimeout(300);
  await ev(n => { const s = [...document.querySelectorAll('select')].find(x => [...x.options].some(o => o.value === n)); if (s) { s.value = n; s.onchange && s.onchange(); } }, NAT);
  if (await ev(() => [...document.querySelectorAll('button')].some(b => /^Gulf flashpoint/.test(b.textContent)))) { await click('button', '^Gulf flashpoint'); await page.waitForTimeout(200); await shot('live-0-setup-scenario'); await click('button', '^Middle East 2026'); } else fails.push('setup has no scenario choice (RG6)');
  await click('button', '^Begin$'); }
  await page.waitForFunction(() => { const e = document.getElementById('grandScreen'); return e && e.style.display !== 'none'; }, null, { timeout: 60000 });
  await page.waitForTimeout(1500); console.log(el(), 'map open'); await shot('live-1-map');
  // a player's march: pick one of my armies, find a neighbour province of a nation I am at war with (declare one if none)
  const sc = await ev(() => { const me = GC.me; let pair = null, foe = null;
    const tryFind = () => { for (const a of GC.armies.filter(x => x.o === me && x.u.length)) for (const j of GCM.P[a.at].adj) { const P = GCM.P[j]; if (P.land && GC.prov[j].o !== me && grAtWar(me, GC.prov[j].o)) return [a, j]; } return null; };
    let f = tryFind(); if (!f) { for (const a of GC.armies.filter(x => x.o === me && x.u.length)) { for (const j of GCM.P[a.at].adj) { const P = GCM.P[j]; if (P.land && GC.prov[j].o !== me) { foe = GC.prov[j].o; break; } } if (foe) break; } if (foe) grDeclare(me, foe); f = tryFind(); }
    if (!f) return { err: 'no army next to an enemy' }; const [a, j] = f; GV.selA = a.id; GV.sel = a.at; const r = grOrderMove(a.id, j); grandMapRefresh();
    return { me, from: GCM.P[a.at].n, to: GCM.P[j].n, to_i: j, foe: GC.prov[j].o, ok: !!(r && r.ok), err: r && r.err, units: a.u.length }; });
  console.log(el(), 'march', JSON.stringify(sc)); if (!sc.ok) throw new Error('march failed ' + JSON.stringify(sc));
  if (await ev(() => ['grandFightLive', 'grandBattleStart', 'grBattlePrompt', 'grandTick'].some(f => typeof window[f] === 'function'))) fails.push('the real-time campaign battle code is back');
  await page.click('#gPlay'); await page.keyboard.press('5');   // play time at speed 5 like a player (month ≈ 3 s)
  // hands off: watch the map. The fight must start by itself, with no dialog and no loading screen, while the days keep passing.
  let last = '', ok = false, tl = Date.now(), bad = '';
  while (Date.now() - tl < 150000) { await page.waitForTimeout(500);
    const st = await ev(pi => ({ b: !!gwBattleAt(pi), s: !!gwSiegeAt(pi), r: (GC.br || []).some(r => r.p === pi), modal: (document.getElementById('gModal') || {}).textContent || '', L: !!window.LOADING, g: typeof G !== 'undefined' && !!G, t: GC.turn, d: GC.day | 0, ph: GC.ph, win: !!document.getElementById('gwWin') }), sc.to_i);
    const k = JSON.stringify(st); if (k !== last) { console.log(el(), k); last = k; }
    if (st.modal || st.L || st.g) { bad = k; break; } if (st.b || st.s || st.r) { ok = true; if (st.win) fails.push('the battle window opened by itself'); break; } }
  if (bad) fails.push('a dialog, a loading screen or a real-time battle appeared when the armies met: ' + bad);
  if (!ok && !bad) fails.push('no battle or siege started on the map (last state ' + last + ')');
  await page.keyboard.press('Space'); await page.waitForTimeout(1200); await shot('live-2-battle-on-map');
  // a real click on the marker opens the window; Esc closes it
  if (ok) { const mk = await ev(pi => { grandMapRefresh(); try { guCentre(pi, 2.2); } catch (e) {} return 1; }, sc.to_i); await page.waitForTimeout(2500);
    const pt = await ev(pi => { const m = GWU.marks.find(x => x.p === pi); if (!m) return null; const v = new THREE.Vector3(m.x, m.y, m.z).project(G3.cam), r = document.getElementById('gMapWrap').getBoundingClientRect(); return { x: r.left + (v.x * .5 + .5) * GV.w, y: r.top + (-v.y * .5 + .5) * GV.h, k: m.k }; }, sc.to_i);
    console.log(el(), 'marker', JSON.stringify(pt));
    if (!pt) { if (await ev(pi => !!(gwBattleAt(pi) || gwSiegeAt(pi)), sc.to_i)) fails.push('no marker on the map over the battle / siege'); }
    else { await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(700); const w = await ev(() => { const e = document.getElementById('gwWin'); return e ? e.textContent.replace(/\s+/g, ' ').slice(0, 160) : ''; }); console.log(el(), 'window:', w); await shot('live-3-battle-window');
      if (!/^(Battle|Siege) of /.test(w)) fails.push('clicking the marker did not open the battle / siege window: ' + w.slice(0, 60));
      await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await ev(() => !!document.getElementById('gwWin'))) fails.push('Esc did not close the battle window'); } }
} catch (e) { fails.push('path: ' + e.message.split('\n')[0]); await shot('live-x-fail'); }
for (const e of errs.slice(0, 8)) console.log('  ' + e);
if (errs.length) fails.push(errs.length + ' page errors');
await browser.close(); server.close();
console.log(fails.length ? 'GRANDLIVE FAIL\n  ' + fails.join('\n  ') : 'GRANDLIVE PASS');
process.exit(fails.length ? 1 : 0);
