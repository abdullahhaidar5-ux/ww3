// gair: jets are limited sorties from airfields in range (they add to the Fires die of a battle on the map and burn fuel); drones travel with the army.   node orch/gairtest.mjs
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
const SHOTS = path.join(ROOT, 'orch', 'shots', 'gair');
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
const shot3 = async (n) => { fs.mkdirSync(path.join(ROOT, 'orch', 'shots', 'grand3'), { recursive: true }); await page.waitForTimeout(400); await page.screenshot({ path: path.join(ROOT, 'orch', 'shots', 'grand3', n + '.png'), timeout: 120000 }).catch(e => console.log('  (screenshot skipped ' + n + ')')); };
const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(e => console.log('  (screenshot skipped ' + n + ')')); };
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await ev(() => { grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); grandOpen(); });
  const sc = await ev(() => { const me = 'IR', foe = 'IQ'; grDeclare(me, foe); let pair = null;
    for (const p of GCM.P) if (p.land && GC.prov[p.i].o === me) for (const j of p.adj) if (GCM.P[j].land && GC.prov[j].o === foe && GC.prov[j].gar.length) { pair = [p.i, j]; break; } else if (pair) break;
    if (!pair) return { err: 'no border' };
    const a = GC.armies.find(x => x.o === me); a.at = pair[0]; a.path = []; a.u.push(['drone', 100, 0, 100], ['drone', 100, 0, 100]);
    geBl(pair[0]).push(['airfield', 0]); GC.nat[me].e.fuel = Math.max(GC.nat[me].e.fuel, 200); GV.selM = new Set(); gmSelDrones();
    const sel = GV.selA === a.id || GV.selM.has(a.id); const stock = geSortieStock(me, pair[1], 280);
    grOrderMove(a.id, pair[1]); return { sel, stock, aid: a.id, fuel: GC.nat[me].e.fuel, recruit: GR_RECRUIT.some(r => r[0] === 'drone') }; });
  console.log('setup', JSON.stringify(sc)); if (sc.err) throw new Error(sc.err);
  if (!sc.recruit) fails.push('drone not recruitable'); if (!sc.sel) fails.push('Ctrl+D helper did not select the drone army'); if (sc.stock < 1) fails.push('no sorties: ' + sc.stock);
  // the march ends in a battle or a siege ON the map; in a battle the air sorties add to the Fires die and burn fuel, the drones fight in the support row
  const bt = await ev((aid) => { for (let k = 0; k < 4 && !GC.bt.length && !GC.sg.length; k++) { GC.armies.filter(a => a.o !== 'IR').forEach(a => { a.path = []; }); grEndTurn(true); }
    const a = GC.armies.find(x => x.id === aid), B = a && gwOf(a); if (!B) { // a fort: lay a field battle next to it so the sorties are under test
      const pi = a.at, D = grAddArmy('IQ', pi, grGenUnits(grNat('IQ').fac, 9000, true)); gwOpen({ p: pi, an: 'IR', dn: 'IQ', att: [a.id], def: [D.id], garr: false, river: false, mtn: false, sea: false, done: 0 }); }
    const B2 = gwOf(a), f0 = GC.nat.IR.e.fuel; gwTick(); const side = B2.att.includes(a.id) ? 0 : 1, L = gwLine(gwCtx(B2, 1)[side ? 'D' : 'A'], B2, side);
    return { mods: (B2.mo[side] || []).map(x => x[0] + ' ' + x[1]), drones: L.back.filter(e => e.r[0] === 'drone').length, fuel0: f0, fuel1: GC.nat.IR.e.fuel, live: typeof G !== 'undefined' && !!G }; }, sc.aid);
  console.log('battle', JSON.stringify(bt));
  if (!bt.mods.some(m => /air sorties/.test(m))) fails.push('battle: no air sorties on the Fires die ' + JSON.stringify(bt.mods)); if (bt.drones < 2) fails.push('battle: the army\'s drones are not in the support row (' + bt.drones + ')');
  if (!(bt.fuel1 < bt.fuel0)) fails.push('sorties not spent: fuel ' + bt.fuel0 + ' -> ' + bt.fuel1); if (bt.live) fails.push('a real-time battle was started');
} catch (e) { if (String(e.message) !== '__done') { fails.push(String(e.message || e).split('\n')[0]); console.log('ERRS', errs.join('\n')); console.log(String(e.stack).split('\n').slice(0, 7).join('\n')); } }
for (const e of [...new Set(errs)].slice(0, 6)) fails.push(e);
await browser.close(); server.close();
if (fails.length) { console.log('\nGRANDTEST FAIL'); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nGRANDTEST PASS');
