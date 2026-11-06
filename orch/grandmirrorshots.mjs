// grandmirror screenshots: a province on the grand map next to its generated battle map.  node orch/grandmirrorshots.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'grandmirror');
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
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot = async (n) => { await page.waitForTimeout(900); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(e => console.log('  (screenshot skipped ' + n + ')')); };
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  const picks = await ev(() => { grNew({ me: 'IR', seed: 7, len: 'quick' }); const f = (fn) => GCM.P.findIndex(p => p.land && !p.map && fn(p)); return { river: f(p => gmRiverProv(p.i) && p.tw >= 3), coast: f(p => p.t === 'c' && p.port && p.tw >= 3) }; });
  console.log(JSON.stringify(picks));
  for (const [kind, pi] of Object.entries(picks)) {
    await ev((pi) => { grNew({ me: 'IR', seed: 7, len: 'quick' }); grandOpen(); guFit(null); guCentre(pi, 3); GV.sel = pi; guRedraw(); }, pi); await shot(kind + '-1-grand-map');
    await ev(async (pi) => { const P = GCM.P[pi], st = GC.prov[pi], dn = st.o, an = dn === 'IR' ? 'IQ' : 'IR', from = P.adj.find(j => GCM.P[j].land);
      const A = grAddArmy(an, from, grGenUnits(grNat(an).fac, 2500, true)), D = grAddArmy(dn, pi, grGenUnits(grNat(dn).fac, 2500, true)); A.from = from; A.at = pi;
      gmTowns(pi).at(-1).dm = 45; gmBuildings(pi).push(['airfield', 0]); const b = { p: pi, an, dn, att: [A.id], def: [D.id], garr: true, river: false, mtn: P.t === 'm', done: 0 }; campClose && campClose(); grandBattleStart(b); const gs = document.getElementById('grandScreen'); if (gs) gs.style.display = 'none'; }, pi);
    await page.waitForFunction(() => !window.LOADING && G && G.grand, null, { timeout: 600000, polling: 250 }).catch(() => {}); await page.waitForTimeout(2500);
    const t = await ev(() => { const t0 = G.towns.slice().sort((a, b) => b.r - a.r)[0]; try { centerOn(t0.x, t0.y); } catch (e) {} for (let i = 0; i < 180; i++) simUpdate(1 / 60); try { renderFrame(0.016); } catch (e) {} return { name: t0.name, n: G.towns.length }; });
    console.log(kind, JSON.stringify(t)); await shot(kind + '-2-battle-town');
    await ev(() => { try { const B = BASES[0], C = G.grand.ctr; centerOn(C[0], C[1]); G.zoom && 0; renderFrame(0.016); } catch (e) {} }); await shot(kind + '-3-battle-middle');
    await ev(() => { try { grandLeaveBattle(); } catch (e) {} });
  }
} catch (e) { fails.push(String(e.message || e).split('\n')[0]); }
if (errs.length) console.log('page errors', [...new Set(errs)].slice(0, 4).join(' | '));
await browser.close(); server.close(); console.log(fails.length ? 'FAIL ' + fails.join(' / ') : 'shots ok'); process.exit(fails.length ? 1 : 0);
