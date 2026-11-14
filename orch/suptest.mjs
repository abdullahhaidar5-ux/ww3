// Real supply test (campaign runner, 13zl-gsupply.js): determinism with supply lines on, AI not frozen by the halt rule, a long line delivers less and costs
// national fuel, numbers survive save/load, the Supply lines tab shows it. Screenshot: orch/shots/grand2/supply-lines.png.   node orch/suptest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'grand2');
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
const ev = f => page.evaluate(f);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gsupLine === 'function', null, { timeout: 60000 });
  // 1) same seed twice = same world after 8 AI months (supply lines are state-only); AI armies still move and fight; nobody is frozen by the halt rule
  const d = await ev(() => { const run = () => { grNew({ me: null, seed: 31, len: 'quick' }); for (let t = 0; t < 8; t++) grEndTurn(true); const land = GC.armies.filter(a => !a.fl && a.u.length);
      return { h: grHash(), n: land.length, hold: land.filter(a => gsupHold(a)).length, cut: land.filter(a => gsupLine(a).cut).length, low: land.filter(a => (a.sl | 0) < 50).length, mv: land.filter(a => a.path.length).length, fu: Math.round(land.reduce((s, a) => s + (a.fu === undefined ? 100 : a.fu), 0) / land.length) }; };
    const a = run(), b = run(); return { same: a.h === b.h, a }; });
  console.log('sup world', JSON.stringify(d));
  if (!d.same) fails.push('not deterministic'); if (d.a.hold > d.a.n * .25) fails.push('too many armies halted (' + d.a.hold + '/' + d.a.n + ')'); if (d.a.fu < 50) fails.push('world average army fuel ' + d.a.fu);
  // 2) the player's view: an Iranian army three provinces into occupied ground, in winter; save/load keeps the line numbers; the Supply lines tab lists it
  const r = await ev(() => { grNew({ me: 'IR', seed: 777, len: 'std' }); const P = GCM.P, out = {}; const a = GC.armies.filter(x => x.o === 'IR' && !x.fl).sort((x, y) => y.u.length - x.u.length)[0];
    const ir = i => GC.prov[i].o === 'IR' || grAllied('IR', GC.prov[i].o), plain = i => P[i].land && !ir(i) && !P[i].port && !geCount(i, 'base'); let ch = null;
    for (const p1 of P) { if (ch) break; if (!plain(p1.i) || !p1.adj.some(j => P[j].land && GC.prov[j].o === 'IR')) continue; for (const j2 of p1.adj) { if (ch) break; if (!plain(j2) || P[j2].adj.some(j => P[j].land && ir(j))) continue; for (const j3 of P[j2].adj) { if (!plain(j3) || j3 === p1.i) continue; ch = [p1.i, j2, j3]; break; } } }
    if (!ch) return { err: 'no chain' }; ch.forEach(i => GC.prov[i].o = 'IR'); a.at = ch[2]; a.path = []; a.fu = 60; a.u.forEach(u => u[3] = 55);
    const L = gsupLine(a); out.eff = L.eff; out.km = Math.round(L.km); out.why = L.why; out.need0 = geFuelNeed('IR'); geSupplyStep(); out.sl = a.sl; out.sk = a.sk; out.need1 = geFuelNeed('IR');
    out.depot = gsupDepotWant('IR'); GC.nat.IR.cash = 5000; out.build = geBuild('IR', ch[2], 'base'); for (const b of geBl(ch[2])) if (b[0] === 'base') b[1] = 0; const st = GC.prov[ch[2]]; if (st.bq) st.bq = []; 
    grSave(); const sl = a.sl, id = a.id; const x = grLoad(); const a2 = GC.armies.find(y => y.id === id); out.saved = !!a2 && a2.sl === sl && a2.sk === out.sk;
    npOpen('IR', 'sup'); const w = document.getElementById('npWin'); out.tab = !!w && /Supply lines/.test(w.textContent) && /km/.test(w.textContent); out.at = P[ch[2]].n; return out; });
  console.log('sup player', JSON.stringify(r));
  if (r.err) fails.push(r.err); else { if (!(r.eff > 0 && r.eff < 1)) fails.push('long line eff ' + r.eff); if (r.sl !== Math.round(r.eff * 100)) fails.push('a.sl not stored'); if (!(r.need1 > r.need0)) fails.push('long line does not cost fuel'); if (!r.saved) fails.push('save/load lost the line'); if (!r.tab) fails.push('Supply lines tab'); }
  await page.waitForTimeout(600); await page.screenshot({ path: path.join(SHOTS, 'supply-lines.png'), timeout: 120000 }).catch(e => console.log('  (screenshot skipped)'));
  if (errs.length) fails.push(...errs.slice(0, 3));
  console.log(fails.length ? 'SUP FAIL ' + fails.join('; ') : 'SUP PASS');
} catch (e) { console.log('SUP ERROR', e.message); fails.push('error'); }
await browser.close(); server.close(); process.exit(fails.length ? 1 : 0);
