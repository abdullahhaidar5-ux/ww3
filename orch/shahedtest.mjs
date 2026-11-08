// One-way drone (Shahed-type) system: stock, launch sites/launchers, 2,000 km range, interception & saturation, battle salvo, save/load.  node orch/shahedtest.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await guardContext(ctx);
const page = await ctx.newPage(); const fails = []; const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gmilStrike === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  const r = await page.evaluate(() => { const out = []; const ok = (c, m) => { if (!c) out.push(m); }; const info = {};
    grNew({ me: 'IR', seed: 7, len: 'quick' }); const M = gmilN('IR'); ok(M.dr > 0, 'IR starts with no drone stock'); ok(GCM.P.some(p => p.land && GC.prov[p.i].o === 'IR' && geCount(p.i, 'dsite') > 0), 'IR has no launch site at start');
    ok(gmilN('SA').dr === 0 || !GMIL_DRN.includes('SA'), 'SA should not field Shaheds'); ok(geCanBuild('SA', GCM.P.find(p => p.land && GC.prov[p.i].o === 'SA').i, 'dsite').includes('does not field'), 'SA can build a launch site');
    // stock grows monthly
    GC.nat.IR.cash = 5000; const s0 = M.dr; gmilDrMonth(); ok(M.dr > s0, 'stock did not grow'); info.grow = [s0, M.dr];
    // range: pick targets by distance from IR launch sites
    const sites = GCM.P.filter(p => p.land && GC.prov[p.i].o === 'IR' && geCount(p.i, 'dsite') > 0); const sp = sites[0].i;
    const foe = o => GCM.P.filter(p => p.land && GC.prov[p.i].o === o); const dkm = p => grDist(sp, p.i) * GMIL_KM;
    const near = GCM.P.filter(p => p.land && GC.prov[p.i].o !== 'IR' && dkm(p) < 1500).sort((a, b) => dkm(a) - dkm(b))[1] || GCM.P.find(p => p.land && GC.prov[p.i].o !== 'IR' && dkm(p) < 1500);
    const far = GCM.P.filter(p => p.land && GC.prov[p.i].o !== 'IR' && dkm(p) > 2600)[0]; ok(near && far, 'no near/far targets');
    const nO = GC.prov[near.i].o, fO = GC.prov[far.i].o; GC.war[grWk('IR', nO)] = 1; GC.war[grWk('IR', fO)] = 1;
    ok(/launch site|within/.test(gmilStrikeCheck('IR', 'd', far.i, 'b', 10)), 'range limit not enforced: ' + gmilStrikeCheck('IR', 'd', far.i, 'b', 10) + ' ' + Math.round(dkm(far)) + 'km');
    // salvo consumes stock; no AA
    M.so = []; const st0 = M.dr; const e1 = gmilStrike('IR', 'd', near.i, 'b', 10); ok(!e1, 'strike refused: ' + e1); ok(M.dr === st0 - 10, 'stock not consumed by order'); info.range = Math.round(dkm(near));
    // salvo vs 3 AA batteries: saturation (cap 6*3=18 engage) — a 30 salvo must leak at least 12
    GC.prov[near.i].bl = GC.prov[near.i].bl || []; const bl = geBl(near.i); for (let i = 0; i < 3; i++) bl.push(['aa', 0]); M.so = []; M.dr = 40; gmilStrike('IR', 'd', near.i, 'b', 30); const log0 = GC.log.length; gmilStrikes();
    const line = GC.log.slice(log0).map(x => x[1]).find(t => /one-way drones/.test(t)); ok(line && /km/.test(line) && /h flight/.test(line), 'no flight-time log: ' + line); info.sat = line;
    const m = /\((\d+) shot down\)/.exec(line || ''); ok(!m || +m[1] <= 18, 'saturation not applied'); ok(m && +m[1] > 0, 'air defence intercepted nothing');
    // launcher trucks: hidden until exposed, bought at a factory/site province
    const A = GC.armies.find(a => a.o === 'IR' && !a.fl && a.u.length); A.at = sp; const be = gmilBuyLauncher('IR', A.id); ok(!be, 'launcher refused: ' + be); ok(A.ln === 1, 'launcher not added');
    A.lx = GC.turn; ok(gmilLnExposed(A), 'launch did not expose the launcher'); A.lx = -9;
    // battle salvo spends stock
    M.dr = 20; const mp = sp; const Ar = grAddArmy(nO, GCM.P[mp].adj.find(j => GCM.P[j].land), grGenUnits(grNat(nO).fac, 3000, true)); Ar.from = Ar.at; Ar.at = mp;
    const b = { p: mp, an: nO, dn: 'IR', att: [Ar.id], def: [], garr: true, river: false, mtn: false, done: 0 }; GC.war[grWk('IR', nO)] = 1; grandBattleStart(b);
    ok(G.grand && G.grand.dro && G.grand.dro[0] === 20, 'battle did not see the stock ' + JSON.stringify(G.grand && G.grand.dro)); G.t = Math.max(G.t, 500); if (G.setupEnd) G.setupEnd = 0;
    const ent = G.ents.find(e => e.team === 0 && !e.isB && !e.dead); const nb = G.ents.length; const T0 = G.teams[0]; info.pw = JSON.stringify({ w: T0.pw && T0.pw.nat, fac: T0.fac, pi: !!powInfo('nat', T0.fac), conq: !!G.conq, t: G.t, se: G.setupEnd, hq: !!hqOf(0) }); const used = usePower(0, 'nat', ent.x + 200, ent.y); ok(used, 'Shahed Swarm refused in battle'); ok(G.grand.dro[0] < 20 && G.grand.du[0] === 20 - G.grand.dro[0], 'battle salvo did not spend stock');
    const spent = G.grand.du[0]; grandTestFinish(0); ok(M.dr === 20 - spent, 'stock not reduced after the battle: ' + M.dr + ' vs ' + (20 - spent)); info.battle = spent; grandLeaveBattle();
    // save/load keeps the stock and launchers
    const js = JSON.stringify(GC), back = JSON.parse(js); ok(back.mil.n.IR.dr === M.dr && back.armies.some(a => a.ln === 1), 'save lost stock/launchers');
    // AI bloc and determinism
    grNew({ me: null, seed: 5, len: 'quick' }); const h1 = grRunAI(8); const d1 = gmilN('IR').dr; grNew({ me: null, seed: 5, len: 'quick' }); const h2 = grRunAI(8); ok(h1 === h2 && d1 === gmilN('IR').dr, 'AI drone play not deterministic'); info.ai = d1;
    return { out, info }; });
  console.log(JSON.stringify(r.info)); for (const f of r.out) fails.push(f);
} catch (e) { fails.push('crash: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); }
for (const e of errs) fails.push(e);
await browser.close(); server.close();
if (fails.length) { console.log('SHAHED FAIL\n - ' + fails.join('\n - ')); process.exit(1); } else console.log('SHAHED PASS');
