// lane G RG10 nuclear test: node orch/nuketest.mjs
// Nuclear powers start with warheads; a programme runs stage by stage (6+6 months) and a test gives the first warhead;
// a strike needs a warhead and an enemy province at war, wrecks buildings/garrison, kills armies there, leaves fallout,
// and turns the world against the launcher. Nation panel "Nuclear" tab shows the status. Screenshot: orch/shots/laneG/nuke.png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'laneG');
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
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);
const fails = [];
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gnkLaunch === 'function', null, { timeout: 60000 });
  const r = await page.evaluate(() => {
    grNew({ me: 'IR', seed: 7, len: 'std' }); grandOpen(); guTop();
    const o = {};
    o.usW = gnkN('US').w; o.irSt = gnkN('IR').st; o.saSt = gnkN('SA').st;
    // a programme for a non-nuclear nation with money
    GC.nat.SA.cash = 5000; o.startErr = gnkStart('SA'); o.saAfter = gnkN('SA').st; o.saCash = GC.nat.SA.cash;
    // Iran's programme: six months to test-ready, six more to a tested warhead
    const w0 = gnkN('IR').w; for (let i = 0; i < 13; i++) { gnkMonth(); }
    o.irStAfter = gnkN('IR').st; o.irWAfter = gnkN('IR').w - w0; o.testLog = GC.log.some(l => /Nuclear test: .*Iran|tested a device/.test(l[1]));
    // a strike needs war: pick an enemy province (IQ) and declare war first
    GC.war[grWk('IR', 'IQ')] = 1;
    const pi = GCM.P.findIndex(p => p.land && GC.prov[p.i].o === 'IQ');
    o.pi = pi;
    const before = { w: gnkN('IR').w, un: GC.prov[pi].un, armies: GC.armies.filter(a => a.at === pi && !a.fl).length };
    GC.armies.push({ id: 88001, o: 'IQ', at: pi, u: [['inf', 100]], path: [], pg: 0, from: -1, sup: 0, arr: 0, fl: false, nm: 'test' });
    o.errPeace = gnkLaunch('IR', GCM.P.findIndex(p => p.land && GC.prov[p.i].o === 'US'), false);
    o.err = gnkLaunch('IR', pi, false);
    // travel time: the warhead is in flight (armies still there), it lands at the next monthly tick
    o.pending = true; // impact is immediate now (real flight ~minutes)
    o.landed = (GC.nuk.pend||[]).length === 0 && !GC.armies.some(a => a.id === 88001);
    o.w = [before.w, gnkN('IR').w]; o.un = [before.un, GC.prov[pi].un];
    o.armiesAfter = GC.armies.filter(a => a.at === pi && !a.fl).length; o.fallout = GC.nuk.fo[pi] !== undefined;
    o.bld = gmBuildings(pi).every(b => b[1] === 100);
    o.lostWorld = GC.rel[grWk('US', 'IR')];
    // a month of fallout keeps unrest up; the panel shows the status
    gnkMonth(); o.unAfterMonth = GC.prov[pi].un;
    npOpen('IR', 'nuke'); const nw = document.getElementById('npWin');
    o.tab = !!nw && /Nuclear status/.test(nw.textContent) && /Warheads/.test(nw.textContent) && !/Launch a strike/.test(nw.textContent);  /* no warheads left: no launch button */
    return o;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, 'nuke.png'), timeout: 120000 }).catch(() => {});
  console.log('nuke', JSON.stringify(r).slice(0, 600));
  if (!r.pending || !r.landed) fails.push('warhead should land immediately (real flight time is minutes)');
  if (r.usW !== 3) fails.push('US should start with 3 warheads');
  if (r.irSt !== 2) fails.push('Iran should start part-way (stage 2)');
  if (r.startErr) fails.push('programme start refused: ' + r.startErr);
  if (r.saAfter !== 1 || r.saCash !== 3500) fails.push('programme start did not take the money or stage');
  if (r.irStAfter !== 3 || r.irWAfter !== 1) fails.push('Iran test did not produce one warhead (stage ' + r.irStAfter + ', +' + r.irWAfter + ')');
  if (!r.testLog) fails.push('no test news in the log');
  if (!r.errPeace) fails.push('strike on a non-enemy should be refused');
  if (r.err) fails.push('strike refused: ' + r.err);
  if (r.w[1] !== r.w[0] - 1) fails.push('strike did not use a warhead');
  if (!(r.un[1] > r.un[0])) fails.push('strike did not raise unrest there');
  if (r.armiesAfter !== 0) fails.push('armies in the province survived the strike');
  if (!r.fallout) fails.push('no fallout recorded');
  if (!r.bld) fails.push('buildings survived the strike');
  if (!(r.lostWorld < 0)) fails.push('world opinion of the launcher did not fall');
  if (!r.tab) fails.push('nuclear tab: status missing, or launch offered with no warheads');
} catch (e) { fails.push('exception: ' + e.message.slice(0, 200)); }
if (errs.length) fails.push(...errs.slice(0, 3));
await browser.close(); server.close();
console.log(fails.length ? 'NUKE FAIL\n' + fails.map(f => '  ✗ ' + f).join('\n') : 'NUKE PASS');
process.exit(fails.length ? 1 : 0);
