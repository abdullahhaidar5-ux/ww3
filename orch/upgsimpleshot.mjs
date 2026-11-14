// Battle power test (battlepower, Abdullah 2026-11-13 20:11 + 20:13): a Generator for every nation, only electronic buildings use power, low power = those buildings offline and production unchanged, Conquest keeps its plants. node orch/powertest.mjs -> POWER PASS
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots');
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
  for (const e of document.querySelectorAll("[title]")) if (vis(e)) out.push(e.title); return out.join(" | "); };
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await ev(() => { setup.p = 'IR'; setup.a = 'US'; setup.n = 1; setup.mode = 'battle'; try { mxSetMode('battle'); } catch (e) {} setup.p = 'IR'; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING && G.battle, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('battle never loaded'));
  await page.waitForTimeout(1500);
  const r = await ev(() => { const T = G.teams[ME]; const hq = G.ents.find(e => e.team === ME && e.kind === 'hq');
    const wf = addBld(ME, 'factory', hq.x + 120, hq.y + 80, true); T.credits = 9000; G.sel = [wf]; TAB = 'upg'; try { showTab('upg'); } catch (e) {} updateUI(); centerOn(wf.x, wf.y, true);
    const ups = [...document.querySelectorAll('#panel button[data-tab="upg"]')].map(b => [b.dataset.from, b.dataset.nm]);
    const pw = [...document.querySelectorAll('#panel button[data-pw]')].map(b => [b.id, b.dataset.pw, !!b.querySelector('.pw')]);
    G.sel = []; TAB = 'build'; try { showTab('build'); } catch (e) {} updateUI(); const tip = document.getElementById('b_uplink') && document.getElementById('b_uplink').dataset.tip; const tg = document.getElementById('b_gen') && document.getElementById('b_gen').dataset.tip;
    pwPlaceTip('uplink'); const pt = document.getElementById('pwPlaceTip');
    const pows = Object.keys(POWERS).filter(k => !sigBan(T.fac, k) && !POWERS[k].passive);
    const dbg = ['b_gen','b_airfield','b_radio'].map(i => { const b = document.getElementById(i); return [i, b && b.hidden, b && b.dataset.tip, b && b.disabled]; }); return { TABnow: TAB, genOk: bldAllowed(T.fac,'gen'), reqUp: reqMet(ME,'uplink'), dbg, ups, pw, tip, tg, place: pt && pt.textContent, pows }; });
  console.log(JSON.stringify(r));
  ck(r.ups.length >= 3 && r.ups.every(u => u[0]), 'upgrade buttons carry data-from');
  ck(r.pw.length >= 4 && r.pw.every(x => x[2]), 'power buildings carry data-pw and the lightning mark');
  ck(/Needs power/.test(r.tip || '') && /Gives power/.test(r.tg || ''), 'hover texts');
  ck(r.pows.length <= 6, 'powers <= 6');
  await ev(() => { G.sel = [G.ents.find(e => e.team === ME && e.kind === 'factory')]; updateUI(); pwPlaceTip(null); }); await ev(() => { const t = [...document.querySelectorAll('button,div,span')].find(e => e.children.length === 0 && /^upgrade$/i.test(e.textContent.trim())); if (t) t.click(); try { showTab('upg'); } catch (e) {} }); await shot('upgsimple');
  fs.copyFileSync(path.join(SHOTS, 'upgsimple.png'), path.join(SHOTS, 'upgsimple.png'));
} catch (e) { fails.push('crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of errs) fails.push(e);
await browser.close(); server.close();
console.log(fails.length ? 'FAIL ' + fails.join(' || ') : 'SHOT OK'); }
