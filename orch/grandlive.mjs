// Lane A1 gate: the live "Fight it" battle loads EXACTLY as a player reaches it — fresh page, main menu → Grand campaign →
// New campaign → Begin → march into a neighbour at war → End turn → "Fight it live" — no test hooks inside the battle:
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
  if (process.argv.includes('--sweep')) { await page.waitForFunction(() => typeof grNew === 'function'); const r = await ev(() => { const out = { n: 0, errs: {} }; const orig = window.afterStart; window.afterStart = () => {};
      for (const me of grMajors().concat(['LB','JO'].filter(c => GCM.nats.has(c)))) { try { grNew({ me, seed: 11, len: 'quick' }); } catch (e) { out.errs[me + ' grNew'] = String(e).slice(0, 160); continue; }
        const seen = new Set(); let k = 0; for (const p of GCM.P) { if (!p.land || GC.prov[p.i].o !== me) continue; for (const j of p.adj) { const Q = GCM.P[j]; if (!Q.land) continue; const foe = GC.prov[j].o; if (foe === me || seen.has(foe)) continue; seen.add(foe); if (k++ > 3) break;
          for (const dir of [0, 1]) { const att = dir ? foe : me, def = dir ? me : foe, at = dir ? j : p.i, to = dir ? p.i : j; try { const A = grAddArmy(att, at, grGenUnits(grNat(att).fac, 2500, true)); A.from = at; A.at = to; const b = { p: to, an: att, dn: def, att: [A.id], def: [], garr: true, river: false, mtn: false, done: 0 }; out.n++; grandBattleStart(b); grandLeaveBattle(); GC.armies.splice(GC.armies.indexOf(A), 1); } catch (e) { out.errs[att + '>' + def + '@' + Q.n] = String(e && e.stack || e).split('\n').slice(0, 3).join(' | ').slice(0, 300); try { grandLeaveBattle(); } catch (_) {} } } } }
      } window.afterStart = orig; return out; }); console.log('sweep', r.n, 'battles,', Object.keys(r.errs).length, 'errors'); for (const [k, v] of Object.entries(r.errs).slice(0, 30)) console.log('  ' + k + ': ' + v); process.exit(0); }
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
  await click('button', '^Begin$'); }
  await page.waitForFunction(() => { const e = document.getElementById('grandScreen'); return e && e.style.display !== 'none'; }, null, { timeout: 60000 });
  await page.waitForTimeout(1500); console.log(el(), 'map open'); await shot('live-1-map');
  if (MKSAVE) { for (let i = 0; i < 2; i++) { await ev(() => { GC.armies.forEach(a => { if (a.o === GC.me) a.path = []; }); grEndTurn(true); }); await page.waitForTimeout(500); await ev(() => { try { const m = document.getElementById('gModal'); if (m) m.remove(); } catch (e) {} while (GC.ph !== 'plan' && GC.q && GC.qi < GC.q.length) { try { grBattleDone(GC.q[GC.qi], grBattleAuto2 ? grBattleAuto2(GC.q[GC.qi]) : 'att', 'auto'); } catch (e) { break; } } }); }
    const sv = await ev(() => { grSave(); return localStorage.getItem('ww3grand1'); }); fs.writeFileSync(MKSAVE, sv); console.log('save written', sv.length, 'turn', await ev(() => GC.turn + ' ' + GC.ph)); process.exit(0); }
  // a player's march: pick one of my armies, find a neighbour province of a nation I am at war with (declare one if none)
  const sc = await ev(() => { const me = GC.me; let pair = null, foe = null;
    const tryFind = () => { for (const a of GC.armies.filter(x => x.o === me && x.u.length)) for (const j of GCM.P[a.at].adj) { const P = GCM.P[j]; if (P.land && GC.prov[j].o !== me && grAtWar(me, GC.prov[j].o)) return [a, j]; } return null; };
    let f = tryFind(); if (!f) { for (const a of GC.armies.filter(x => x.o === me && x.u.length)) { for (const j of GCM.P[a.at].adj) { const P = GCM.P[j]; if (P.land && GC.prov[j].o !== me) { foe = GC.prov[j].o; break; } } if (foe) break; } if (foe) grDeclare(me, foe); f = tryFind(); }
    if (!f) return { err: 'no army next to an enemy' }; const [a, j] = f; GV.selA = a.id; GV.sel = a.at; const r = grOrderMove(a.id, j); grandMapRefresh();
    return { me, from: GCM.P[a.at].n, to: GCM.P[j].n, foe: GC.prov[j].o, ok: !!(r && r.ok), err: r && r.err, units: a.u.length }; });
  console.log(el(), 'march', JSON.stringify(sc)); if (!sc.ok) throw new Error('march failed ' + JSON.stringify(sc));
  // a battle that can't be built must not leave a blank screen: message + map back (+ auto-resolve on OK)
  { const fb = await ev(() => { grandFightLive({ p: -5, att: [], def: [], an: GC.me, dn: 'XX', done: 0 }); const m = document.getElementById('gModal'), scr = document.getElementById('grandScreen'); const r = { modal: !!m && /could not start/.test(m.textContent), map: scr && scr.style.display !== 'none', G: typeof G !== 'undefined' && !!G }; if (m) m.remove(); return r; });
    console.log(el(), 'fallback', JSON.stringify(fb)); if (!fb.modal || !fb.map || fb.G) fails.push('a battle that fails to start leaves the player stuck ' + JSON.stringify(fb)); }
  await click('#grandScreen button', 'End turn'); console.log(el(), 'end turn clicked');
  await page.waitForFunction(() => { const m = document.getElementById('gModal'); return m && /Fight it live/.test(m.textContent); }, null, { timeout: 120000, polling: 250 });
  await shot('live-2-prompt'); console.log(el(), 'prompt:', (await ev(() => document.getElementById('gModal').textContent)).slice(0, 110));
  await click('#gModal button', 'Fight it live'); console.log(el(), 'Fight it live clicked');
  // from here on: hands off. Watch the loading screen and the battle clock as the game's own loop runs.
  let last = '', ok = false, tl = Date.now();
  while (Date.now() - tl < 240000) { await page.waitForTimeout(1000);
    const s = await ev(() => ({ L: !!window.LOADING, step: (document.querySelector('.lo-s span') || {}).textContent || '', g: typeof G !== 'undefined' && !!G, grand: typeof G !== 'undefined' && !!(G && G.grand), t: typeof G !== 'undefined' && G ? +(G.t || 0).toFixed(2) : -1, paused: typeof G !== 'undefined' && G ? !!G.paused : null, gs: (document.getElementById('grandScreen') || {style:{}}).style.display, ents: typeof G !== 'undefined' && G ? G.ents.length : 0 }));
    const k = JSON.stringify(s); if (k !== last) { console.log(el(), k); last = k; }
    if (s.grand && !s.L && s.t > 0 && !PROF) { ok = true; break; }
    if (PROF && !s.L && s.grand) { const cdp = await ctx.newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); await page.waitForTimeout(25000); const { profile } = await cdp.send('Profiler.stop');
      const self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n])); profile.samples.forEach((id, i) => { const n = byId.get(id); const k = n.callFrame.functionName + ' ' + n.callFrame.url.split('/').pop() + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
      console.log('PROFILE top self ms:'); [...self].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log('  ' + (v / 1000).toFixed(0) + ' ' + k.slice(0, 140)));
      // inclusive: walk parents
      const par = new Map(); for (const n of profile.nodes) for (const c of n.children || []) par.set(c, n.id); const inc = new Map(); profile.samples.forEach((id, i) => { const seen = new Set(); let x = id; while (x != null) { const n = byId.get(x); const k = n.callFrame.functionName + ':' + n.callFrame.lineNumber; if (!seen.has(k)) { seen.add(k); inc.set(k, (inc.get(k) || 0) + (dt[i] || 0)); } x = par.get(x); } });
      console.log('PROFILE top inclusive ms:'); [...inc].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, v]) => console.log('  ' + (v / 1000).toFixed(0) + ' ' + k.slice(0, 100))); break; } }
  await shot('live-3-battle');
  if (!ok && !PROF) fails.push('the live battle never got past loading / the clock never ran (last state ' + last + ')');
  if (ok) console.log(el(), 'battle running:', await ev(() => (LOAD.times || []).map(([a, b]) => a.replace('…', '') + ' ' + b).join(', ')));
} catch (e) { fails.push('path: ' + e.message.split('\n')[0]); await shot('live-x-fail'); }
for (const e of errs.slice(0, 8)) console.log('  ' + e);
if (errs.length) fails.push(errs.length + ' page errors');
await browser.close(); server.close();
console.log(fails.length ? 'GRANDLIVE FAIL\n  ' + fails.join('\n  ') : 'GRANDLIVE PASS');
process.exit(fails.length ? 1 : 0);
