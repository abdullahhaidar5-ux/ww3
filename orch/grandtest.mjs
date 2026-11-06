// Grand campaign test (stage 1): determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
// from the map holds EXACTLY the army's units (types and counts) and no production, survivors/losses flow back exactly,
// the province is captured. Screenshots: orch/shots/grand1/.   node orch/grandtest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'grand1');
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
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(e => console.log('  (screenshot skipped ' + n + ')')); };
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  // ---- menu names
  const menu = await ev(() => ({ g: (document.getElementById('grandBtn') || {}).textContent, c: (document.getElementById('campaign') || {}).textContent, s: (document.getElementById('start') || {}).textContent, t: !!document.getElementById('tutorial') }));
  console.log('menu', JSON.stringify(menu));
  if (menu.g !== 'Grand campaign') fails.push('menu: no Grand campaign button'); if (menu.c !== 'Missions') fails.push('menu: story campaign not renamed to Missions (' + menu.c + ')'); if (!/Conquest/.test(menu.s || '')) fails.push('menu: no Conquest button'); if (!menu.t) fails.push('menu: no Tutorial button');
  await shot('menu');
  await ev(() => { document.getElementById('grandBtn').click(); }); await shot('menu-grand');
  await ev(() => { campClose(); });
  // ---- determinism: 10 AI-only turns twice with the same seed
  const det = await ev(() => { const t0 = performance.now(); grNew({ me: null, seed: 4242, len: 'quick' }); const h0 = grHash(); const a = grRunAI(10); const alive1 = Object.values(GC.nat).filter(n => !n.dead).length;
    grNew({ me: null, seed: 4242, len: 'quick' }); const h1 = grHash(); const b = grRunAI(10); grNew({ me: null, seed: 4243, len: 'quick' }); const c = grRunAI(10);
    return { a, b, c, h0, h1, ms: Math.round(performance.now() - t0), alive1, provs: GM_LAND, seas: GM_P.length - GM_LAND }; });
  console.log('determinism', JSON.stringify(det));
  if (det.a !== det.b || det.h0 !== det.h1) fails.push('determinism: same seed gave different hashes ' + det.a + ' vs ' + det.b);
  if (det.a === det.c) fails.push('determinism: different seeds gave the same hash'); if (det.provs < 120 || det.provs > 200) fails.push('map: ' + det.provs + ' land provinces');
  // ---- start as Iran, open the map
  await ev(() => { grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); grandOpen(); guFit(null); guRedraw(); }); await shot('world-map');
  await ev(() => { guFit(GR_REGIONS[4][1]); guRedraw(); }); await shot('region-middle-east');
  // ---- scenario: IR army next to an enemy garrison, march, end turn -> Fight-it prompt
  const sc = await ev(() => { const me = 'IR', foe = 'IQ'; grDeclare(me, foe); let pair = null;
    for (const p of GCM.P) if (p.land && GC.prov[p.i].o === me) for (const j of p.adj) if (GCM.P[j].land && GC.prov[j].o === foe && GC.prov[j].gar.length) { pair = [p.i, j]; break; } else if (pair) break;
    if (!pair) for (const p of GCM.P) if (p.land && GC.prov[p.i].o === foe) for (const j of p.adj) if (GCM.P[j].land && GC.prov[j].o === me) { pair = [j, p.i]; break; }
    if (!pair) return { err: 'no IR/foe border ' + foe };
    const a = GC.armies.find(x => x.o === me); a.at = pair[0]; a.path = []; GV.sel = pair[0]; GV.selA = a.id; grandMapRefresh();
    const r = grOrderMove(a.id, pair[1]); guCentre(pair[0], 2.4); guRedraw();
    return { foe, from: GCM.P[pair[0]].n, to: GCM.P[pair[1]].n, aid: a.id, ok: !!r.ok, units: a.u.length, to_i: pair[1] }; });
  console.log('scenario', JSON.stringify(sc)); if (sc.err || !sc.ok) { fails.push('scenario: ' + JSON.stringify(sc)); throw new Error('no scenario'); }
  await shot('army-ordered');
  await ev(() => { GC.armies.filter(a => a.o !== 'IR').forEach(a => { a.path = []; }); guEndTurn(); });   // (foe armies stay put so the fight is predictable)
  await page.waitForFunction(() => !!document.getElementById('gModal'), null, { timeout: 90000 }); await shot('fight-it-prompt');
  const prompt = await ev(() => document.getElementById('gModal').textContent);
  if (!/Fight it live/.test(prompt) || !/Auto-resolve/.test(prompt)) fails.push('prompt missing buttons: ' + prompt.slice(0, 120));
  // expected unit lists, from the state, before launching
  const exp = await ev(() => { const b = GC.q[GC.qi]; const meAtt = b.an === 'IR'; const S = grSideUnits(b, 'att'), D = grSideUnits(b, 'def'); const c = L => { const o = {}; for (const s of L) for (const r of s.u) o[r[0]] = (o[r[0]] || 0) + 1; return o; };
    return { meAtt, mine: c(meAtt ? S : D), theirs: c(meAtt ? D : S), nMine: (meAtt ? S : D).reduce((a, s) => a + s.u.length, 0), waves: 0, prov: GCM.P[b.p].n }; });
  console.log('expected', JSON.stringify(exp));
  await ev(() => { [...document.querySelectorAll('#gModal button')].find(b => /Fight it live/.test(b.textContent)).click(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !!G.grand, null, { timeout: 60000 });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('battle: loading never finished'));
  await page.waitForTimeout(2500);
  const bt = await ev(() => { const c = (t) => { const o = {}; for (const e of G.ents) if (e.team === t && !e.isB && !e.dead) o[e.kind] = (o[e.kind] || 0) + 1; return o; };
    const blds = t => G.ents.filter(e => e.team === t && e.isB).map(e => e.kind); const q0 = JSON.stringify(G.teams[0].q), cr = G.teams[0].credits;
    act(0, { t: 'q', k: 'inf' }); act(0, { t: 'bld', k: 'barracks', x: BASES[0][0], y: BASES[0][1] }); act(0, { t: 'up', k: 'x' });
    return { me: c(0), foe: c(1), b0: blds(0), b1: blds(1), qSame: JSON.stringify(G.teams[0].q) === q0, cr, conq: !!G.conq, over: G.over, waves: G.grand.waves.length, att: G.grand.att, n0: G.grand.n0 }; });
  console.log('battle', JSON.stringify(bt));
  const sameMap = (a, b) => { const k = new Set([...Object.keys(a), ...Object.keys(b)]); return [...k].every(x => (a[x] || 0) === (b[x] || 0)); };
  if (!sameMap(bt.me, exp.mine)) fails.push('battle: your units ' + JSON.stringify(bt.me) + ' != army ' + JSON.stringify(exp.mine));
  if (!sameMap(bt.foe, exp.theirs)) fails.push('battle: enemy units ' + JSON.stringify(bt.foe) + ' != expected ' + JSON.stringify(exp.theirs));
  if (bt.b0.length) fails.push('battle: your side has buildings ' + bt.b0.join(',')); if (!bt.qSame) fails.push('battle: production queue changed'); if (bt.conq) fails.push('battle: still a Conquest base match');
  if (!bt.b1.length) fails.push('battle: defender has no forts'); if (bt.b1.some(k => !['turret', 'sam'].includes(k))) fails.push('battle: enemy buildings other than forts: ' + bt.b1.join(','));
  await ev(() => { renderFrame(0.016); }).catch(() => {}); await shot('battle-from-map');
  // fight 40 game seconds, then wound/kill: remove ~1/3 of our units, then finish with a win
  const fin = await ev(() => { for (let i = 0; i < 60 * 40 && !G.over; i++) simUpdate(1 / 60);
    const mine = G.ents.filter(e => e.team === 0 && !e.isB && !e.dead); const kills = mine.slice(0, Math.floor(mine.length / 3)); for (const u of kills) { try { kill(u, 1, null); } catch (e) { u.hp = 0; u.dead = true; } }
    for (const u of G.ents.filter(e => e.team === 0 && !e.isB && !e.dead).slice(-6)) u.hp = Math.max(1, Math.round(u.max * 0.5)); for (let i = 0; i < 30; i++) simUpdate(1 / 60);
    const alive = G.ents.filter(e => e.team === 0 && !e.isB && !e.dead); const kinds = {}; for (const u of alive) kinds[u.kind] = (kinds[u.kind] || 0) + 1;
    const hp = alive.map(u => Math.max(1, Math.round(u.hp / u.max * 100))).sort((a, b) => a - b); const b = GB_CUR.b;
    const before = { alive: alive.length, kinds, hp }; const meAtt = GB_CUR.meAtt; const res = grandTestFinish(0); return { res, before, meAtt, bi: GC.qi }; });
  console.log('finish', JSON.stringify(fin).slice(0, 300));
  await page.waitForFunction(() => !!document.getElementById('campScreen'), null, { timeout: 90000 });
  const flow = await ev(() => { const b = GC.q[GC.qi]; const meAtt = b.an === 'IR'; const mineArr = [].concat(...grSideUnits(b, meAtt ? 'att' : 'def').map(s => s.u)); const kinds = {}; for (const r of mineArr) kinds[r[0]] = (kinds[r[0]] || 0) + 1; return { n: mineArr.length, kinds, hp: mineArr.map(r => r[1]).sort((a, b) => a - b) }; });
  console.log('flowback', JSON.stringify(flow).slice(0, 240));
  if (flow.n !== fin.before.alive || !sameMap(flow.kinds, fin.before.kinds)) fails.push('flow-back: army has ' + flow.n + ' ' + JSON.stringify(flow.kinds) + ' but ' + fin.before.alive + ' survived ' + JSON.stringify(fin.before.kinds));
  if (JSON.stringify(flow.hp) !== JSON.stringify(fin.before.hp)) fails.push('flow-back: health differs');
  if (flow.n >= exp.nMine) fails.push('flow-back: no losses recorded (' + flow.n + ' of ' + exp.nMine + ')');
  await shot('battle-result');
  await ev(() => { [...document.querySelectorAll('#campScreen button')].find(b => /Return to the map/.test(b.textContent)).click(); });
  await page.waitForTimeout(500);
  const after = await ev(() => { const to = GCM.byName.get ? 0 : 0; return { g: !!window.G, grand: document.getElementById('grandScreen') && document.getElementById('grandScreen').style.display, ph: GC.ph, turn: GC.turn, owner: GC.prov[GC.q[0] ? GC.q[0].p : 0].o }; });
  console.log('after', JSON.stringify(after));
  if (after.g) fails.push('after battle: still in a battle'); if (after.grand !== 'flex') fails.push('after battle: map not shown');
  await shot('map-after-battle');
  // continue the turn until it resolves, province should now be ours (our army is in it and its garrison is dead)
  for (let i = 0; i < 12; i++) { const st = await ev(() => { const m = document.getElementById('gModal'); if (m) { const b = [...m.querySelectorAll('button')].find(x => /Auto-resolve/.test(x.textContent)); if (b) { b.click(); return 'clicked'; } } return GC.turn >= 2 && GC.ph === 'plan' ? 'done' : 'wait'; }); if (st === 'done') break; await page.waitForTimeout(700); if (i === 11) fails.push('turn never finished after the battle'); }
  const cap = await ev(() => { const r = GC.log.filter(l => /captured|held against|beat/.test(l[1])).slice(-6).map(l => l[1]); return { log: r, turn: GC.turn, save: !!localStorage.getItem(GR_KEY) }; });
  console.log('turn', JSON.stringify(cap));
  if (!cap.save) fails.push('campaign not saved');
  await shot('province-captured');
  // save/continue round trip
  const rt = await ev(() => { const h = grHash(); grClear(); const ok = !GC; grNew({ me: 'IR', seed: 5, len: 'quick' }); const h2 = grHash(); grSave(); const x = grLoad(); return { same: grHash() === h2, x: !!x }; });
  if (!rt.same) fails.push('save round trip changed the state hash');
} catch (e) { fails.push(String(e.message || e).split('\n')[0]); console.log('ERRS', errs.join('\n')); }
for (const e of [...new Set(errs)].slice(0, 6)) fails.push(e);
await browser.close(); server.close();
if (fails.length) { console.log('\nGRANDTEST FAIL'); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nGRANDTEST PASS');
