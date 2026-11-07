// Lane G test: alerts bar + diplomacy tab. node orch/gdtest.mjs
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
const SHOTS = path.join(ROOT, 'orch', 'shots', 'laneG');
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
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gdAct === 'function', null, { timeout: 60000 });
  const r = await ev(() => { grNew({ me: 'IR', seed: 7, len: 'std' }); grandOpen(); guTop();
    const out = {}; out.alerts = document.getElementById('gAlerts') ? document.getElementById('gAlerts').textContent : null;
    npOpen('IR', 'dip'); out.tab = !!document.getElementById('npWin') && /Declare war|Improve/.test(document.getElementById('npWin').textContent);
    const foes = Object.keys(GC.nat).filter(c => c !== 'IR' && grAtWar('IR', c)), fr = Object.keys(GC.nat).filter(c => c !== 'IR' && !grAtWar('IR', c) && !grAllied('IR', c) && GC.nat[c].cap >= 0);
    const t = fr[0], o0 = gdOp(t, 'IR'); out.imp = gdAct('improve', 'IR', t); out.d = gdOp(t, 'IR') - o0;
    out.war = gdAct('war', 'IR', t); out.atWar = grAtWar('IR', t); GC.wsT[grWk('IR', t)] = 1; GC.turn = 30; out.pe = gdChance('peace', 'IR', t).note; for (const a of GC.armies) if (a.o === 'IR') { GC.armies.push({ ...a, id: 9999, at: GC.nat[t].cap }); break; }
    const p = gdAct('peace', 'IR', t); out.peace = p; out.truce = gdTruce('IR', t); out.rewar = (gdAct('war', 'IR', t));
    out.h = grHash(); return out; });
  console.log('gd', JSON.stringify(r));
  if (!r.alerts) fails.push('no alerts bar'); if (!r.tab) fails.push('diplomacy tab missing'); if (!(r.d > 0)) fails.push('improve did nothing'); if (!r.atWar) fails.push('war not declared');
  await page.evaluate(() => npOpen('IR', 'dip')); await shot('diplomacy'); await page.evaluate(() => { npClose(); }); await shot('alerts');
} catch (e) { fails.push('exception: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 3));
await browser.close(); server.close();
if (fails.length) { console.log('GDTEST FAIL', fails); process.exit(1); } console.log('GDTEST PASS'); process.exit(0);
