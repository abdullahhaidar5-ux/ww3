// A1 follow-up: TWO fights in a row on the campaign map through the real controls (real render loop, real buttons): march into an enemy, the battle
// starts on the map; open its window, pull the army out with the Withdraw button after six days; march in again, a second battle starts and runs to its result card.   node orch/grandlive2.mjs
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
  const tick = () => ev(() => { GC.armies.filter(x => x.o !== GC.me).forEach(x => { x.path = []; }); });   // the enemy stays put so the fights are the ones under test
  for (const round of [1, 2]) {   // round 2 = a SECOND battle after withdrawing from the first
  // march our army into an adjacent enemy province without a fort (war declared) - the order itself goes through the normal order function
  const sc = await ev((me) => { let pair = null, foe = null;
    for (const fortOk of [0, 1]) { for (const p of GCM.P) { if (!p.land || GC.prov[p.i].o !== me) continue; for (const j of p.adj) { if (!GCM.P[j].land) continue; const o = GC.prov[j].o; if (o && o !== me && GC.nat[o] && !GC.nat[o].dead && (fortOk || (!gwFort(j) && GC.prov[j].gar.length))) { pair = [p.i, j]; foe = o; break; } } if (pair) break; } if (pair) break; }
    if (!pair) return { err: 'no border' };
    if (!grAtWar(me, foe)) grDeclare(me, foe);
    const a = GC.armies.filter(x => x.o === me && x.u.length && !x.fl && !x.bt).sort((x, y) => y.u.length - x.u.length)[0]; a.at = pair[0]; a.path = []; GV.sel = pair[0]; GV.selA = a.id; grandMapRefresh();
    const r = grOrderMove(a.id, pair[1]); GC.armies.filter(x => x.o !== me).forEach(x => { x.path = []; });
    return { foe, ok: !!r.ok, err: r.err, aid: a.id, from: GCM.P[pair[0]].n, to: GCM.P[pair[1]].n, to_i: pair[1], fort: gwFort(pair[1]), units: a.u.length }; }, NAT);
  console.log('scenario ' + round, JSON.stringify(sc)); if (sc.err || !sc.ok) throw new Error('scenario ' + JSON.stringify(sc));
  await page.click('#gPlay', { timeout: 10000 }).catch(() => ev(() => document.getElementById('gPlay').click()));   /* slow CI: a pop-up can sit over the button for a moment */ await page.keyboard.press('5');   // play time at speed 5 like a player (month ≈ 3 s)
  const t0 = Date.now(); let st = null;
  for (let i = 0; Date.now() - t0 < 150000; i++) { await page.waitForTimeout(400); await tick();
    st = await ev(([pi, aid]) => { const B = gwBattleAt(pi), S = gwSiegeAt(pi), a = GC.armies.find(x => x.id === aid); return { b: B ? B.d : -1, s: S ? S.d : -1, mine: !!(a && a.bt), r: (GC.br || []).filter(r => r.p === pi).length, modal: !!document.getElementById('gModal'), g: typeof G !== 'undefined' && !!G, L: !!window.LOADING, t: GC.turn, d: GC.day | 0 }; }, [sc.to_i, sc.aid]);
    if (st.modal || st.g || st.L) break; if (round === 1 ? (st.b >= 6 || st.s >= 3 || st.r) : st.r >= (sc.r0 | 0) + 1 || st.s >= 3) break; if (i === 0) sc.r0 = st.r; }
  const card = await ev(() => [...document.querySelectorAll('#gwCards .c')].map(e => e.textContent.slice(0, 120)).join(' || '));   // read at once: a card goes away by itself after a while and screenshots are slow on test machines
  console.log('fight ' + round, ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(st)); await page.keyboard.press('Space'); await page.waitForTimeout(600); await shot('live2-battle' + round);
  if (!st || st.modal || st.g || st.L) { fails.push('round ' + round + ': a dialog, a loading screen or a real-time battle appeared: ' + JSON.stringify(st)); break; }
  if (st.b < 0 && st.s < 0 && !st.r) { fails.push('round ' + round + ': no battle or siege started on the map: ' + JSON.stringify(st)); break; }
  if (round === 1 && st.b >= 6 && st.mine) {   // the Withdraw button in the battle window pulls the army out; the battle is over for us and the map is free again
    await ev(pi => { if (!document.getElementById('gwWin')) gwuOpen(pi); }, sc.to_i); await page.waitForTimeout(500); await shot('live2-window1');
    const w = await ev(() => { const b = document.querySelector('#gwWin button[data-w]'); return b ? { dis: b.disabled, t: b.textContent } : null; }); console.log('withdraw button', JSON.stringify(w));
    if (!w || w.dis) fails.push('round 1: no usable Withdraw button in the battle window on day ' + st.b + ' ' + JSON.stringify(w));
    else { await page.click('#gwWin button[data-w]'); await page.waitForTimeout(600); const a = await ev(([pi, aid]) => { const x = GC.armies.find(q => q.id === aid); return { there: !!x, at: x ? x.at : -1, bt: x ? x.bt | 0 : -1, pi }; }, [sc.to_i, sc.aid]); console.log('after withdraw', JSON.stringify(a));
      if (!a.there || a.at === a.pi || a.bt) fails.push('round 1: the army did not leave the battle ' + JSON.stringify(a)); } }
  if (round === 2 && st.r) { console.log('result card:', card); if (!/(Victory|Defeat) · /.test(card)) fails.push('round 2: no result card for our own battle (' + card + ')'); }
  await ev(() => { const e = document.getElementById('gwWin'); if (e) gwuClose(); });
  }
} catch (e) { fails.push(String(e.message || e).split('\n')[0]); }
for (const e of [...new Set(errs)].slice(0, 8)) fails.push(e);
await browser.close(); server.close();
if (fails.length) { console.log('\nGRANDLIVE2 FAIL'); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nGRANDLIVE2 PASS');
