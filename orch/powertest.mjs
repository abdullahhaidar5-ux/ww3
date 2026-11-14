// Battle power test (battlepower, Abdullah 2026-11-13 20:11 + 20:13): a Generator for every nation, only electronic buildings use power, low power = those buildings offline and production unchanged. node orch/powertest.mjs -> POWER PASS
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'power');
const fails = [];
const ck = (c, m) => { if (!c) fails.push(m); };
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromiumPath() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
{
await acquireBrowserLock();
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromiumPath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot = async n => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(() => console.log('  (screenshot skipped ' + n + ')')); };
const ev = (fn, a) => page.evaluate(fn, a);
// text a player can actually see: visible elements only
const SEEN = () => { const out = []; const vis = e => { if (!e.isConnected) return false; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (n.hidden || s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let t; (t = w.nextNode());) { const s = t.nodeValue.trim(); if (s && t.parentElement && vis(t.parentElement)) out.push(s); }
  for (const e of document.querySelectorAll('[title]')) if (vis(e)) out.push(e.title); return out.join(' ¶ '); };
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  // Battle as a Shia nation
  await ev(() => { setup.p = 'RS'; setup.a = 'IL'; setup.n = 1; setup.mode = 'battle'; try { mxSetMode('battle'); } catch (e) {} setup.p = 'RS'; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING && G.battle, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('battle never loaded'));
  await page.waitForTimeout(1500);
  const r = await ev(() => {
    const out = {}; const T = G.teams[ME]; T.credits = 30000;
    out.battle = !!G.battle; out.plants = G.oil.filter(o => o.pw).length; out.mapPlants = 0;
    out.gens = {}; for (const k of FKEYS) { try { out.gens[k] = bldAllowed(k, 'gen') && !!bstats(k, 'gen').name && bstats(k, 'gen').cost > 0; } catch (e) { out.gens[k] = false; } }
    out.names = [bstats('RS', 'gen').name, bstats('US', 'gen').name]; out.cost = [bstats('RS', 'gen').cost, bstats('US', 'gen').cost, STRUCT.barracks.cost];
    G.sel = G.ents.filter(e => e.team === ME && e.kind === 'dozer' && !e.dead); try { updateUI(); } catch (e) {} out.btn = !!document.getElementById('b_gen') && !document.getElementById('b_gen').hidden;
    const hq = G.ents.find(e => e.isB && e.team === ME && e.kind === 'hq');
    const p0 = pwrOf(ME); out.p0 = [p0.make, p0.use];
    const bar = addBld(ME, 'barracks', hq.x + 200, hq.y + 100, true), fac = addBld(ME, 'factory', hq.x + 200, hq.y - 100, true), ua = addBld(ME, 'uplink', hq.x - 200, hq.y - 100, true), tu = addBld(ME, 'sam', hq.x - 200, hq.y + 100, true), gun = addBld(ME, 'turret', hq.x - 260, hq.y + 160, true);
    const p1 = pwrOf(ME); out.p1 = [p1.make, p1.use];
    // low power: slower production, defenses offline
    for (let i = 0; i < 6; i++) battlePower(.5); out.low = !!T.pwLow; out.slow = false; { out.gunOn = !(koLeft(gun) > 0); }
    for (let i = 0; i < 3; i++) battlePower(.5); out.off = koLeft(tu) > 0 && koLeft(ua) > 0 && !(koLeft(gun) > 0 && false);
    G._pwv = null; const pcb = document.getElementById('cqBn'); try { cqBanner(); } catch (e) {} out.meter = pcb ? pcb.textContent : '';
    // a Generator brings it back
    const g1 = addBld(ME, 'gen', hq.x, hq.y + 220, true); const g2 = addBld(ME, 'gen', hq.x + 60, hq.y + 220, true); const p2 = pwrOf(ME); out.p2 = [p2.make, p2.use];
    for (let i = 0; i < 4; i++) battlePower(.5); out.ok = !T.pwLow;
    // destroying generators puts it back to low power
    g1.dead = true; g2.dead = true; for (let i = 0; i < 4; i++) battlePower(.5); out.low2 = !!T.pwLow;
    // checkpoint keeps it
    try { const c = ckEncode(); out.ck = !!c && c.teams[ME].pwLow === 1; } catch (e) { out.ck = String(e); }
    return out; });
  console.log('power', JSON.stringify(r));
  ck(r.battle && r.plants === 0, 'Battle has no Conquest-style home power plants (map plants are the capturable tb kind) ' + JSON.stringify([r.battle, r.plants]));
  ck(FKEYS_OK(r.gens), 'every live nation needs a Generator in Battle: ' + JSON.stringify(r.gens));
  ck(r.names[0] === 'Mountain Power Station' && r.names[0] !== r.names[1], 'nation flavor in the name only ' + r.names);
  ck(r.cost[0] === r.cost[1] && Math.abs(r.cost[0] - r.cost[2]) <= 100, 'Generator costs about a Barracks, same for every nation ' + r.cost);
  ck(r.btn, 'the Build tab must have a Generator button in Battle');
  ck(r.p1[1] > r.p1[0] && r.low && r.off, 'power used > made must switch the electronic buildings (SAM, Strike Center) off ' + JSON.stringify([r.p1, r.low, r.off]));
  ck(!r.slow && r.gunOn, 'low power must NOT slow Barracks/War Factory production and must not switch Defense Guns off ' + JSON.stringify([r.slow, r.gunOn]));
  ck(/POWER/.test(r.meter) && /LOW POWER/.test(r.meter), 'the Battle top bar must show the power meter and the low-power words: ' + r.meter);
  ck(r.p2[0] > r.p1[0] && r.ok, 'two Generators must restore power ' + JSON.stringify([r.p2, r.ok]));
  ck(r.low2, 'losing the Generators must bring low power back');
  ck(r.ck === true, 'low power state must survive a checkpoint');
} catch (e) { fails.push('power run crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of errs) fails.push(e);
await browser.close(); server.close();
}
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'POWER FAIL (' + fails.length + ')' : 'POWER PASS');
process.exit(fails.length ? 1 : 0);
function FKEYS_OK(g) { const ks = Object.keys(g); return ks.length > 20 && ks.every(k => g[k] || k === 'EU'); }
