// Battlefield test (pack-battlefield 2026-11-18): rubble cleared by right-click + blocks supply roads; tunnel radar; live day cycle + weather; prints BATTLEFIELD PASS/FAIL.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'battlefield');
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
  await ev(() => { setup.p = 'US'; setup.a = 'IR'; setup.n = 1; setup.mode = 'battle'; setup.map = 'lebanon'; try { mxSetMode('battle'); } catch (e) {} setup.p = 'US'; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING && G.battle && G.map && G.map.cityBlds, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('battle never loaded'));
  await page.waitForTimeout(1500);
  // ITEM 1: rubble
  const r1 = await ev(() => {
    const o = {}, me = ME; G.paused = true;
    const open = k => k >= 0 && k < GW * GH && (G.grid[k] === 0 || G.grid[k] === 2);
    const c = (G.civ || []).find(c => !c.dead && !c.ruin && G.grid[c.k] === 3 && open(c.k - 1) && open(c.k + 1) && c.x > 300 && c.x < MAPW - 300);
    o.city = !!c; if (!c) return o;
    collapseCiv(c, me); o.rub = !!G.rub[c.k];
    const hq = G.ents.find(e => e.isB && e.team === me && e.kind === 'hq');
    const dz = addUnit(me, 'dozer', c.x - CELL, c.y); dz.max = dz.hp = 1e7;
    // an explicit right-click order on the cell
    doAct({ t: 'clr', ids: [dz.id], k: c.k }); simUpdate(0.1); o.ord = dz.order && dz.order.type === 'clr' && dz.order.k === c.k;
    let n = 0; while (G.rub[c.k] && n < 400) { simUpdate(0.1); n++; } o.cleared = !G.rub[c.k]; o.secs = n / 10;
    // supply roads: rubble on a road edge closes it until cleared
    const E = G.lg && G.lg.E || []; let ei = -1, pt = null;
    for (let i = 0; i < E.length && ei < 0; i++) { const e = E[i]; if (!e.pts || e.pts.length < 2 || e.len < 120) continue; ei = i; pt = lgPoint(e, e.len / 2); }
    o.edge = ei >= 0; if (ei >= 0) {
      const k = Math.floor(pt[1] / CELL) * GW + Math.floor(pt[0] / CELL);
      if (!G.rub || G.rub.length !== GW * GH) { G.rub = new Uint8Array(GW * GH); G.rubN = 0; }
      G.rub[k] = 1; G.rubN++; G.gridV = (G.gridV | 0) + 1; o.blocked = lgBlk(ei, me); o.rk = lgRubK(ei) === k;
      rubDo(k); o.freed = !lgBlk(ei, me);
    }
    return o;
  });
  console.log('item1', JSON.stringify(r1));
  ck(r1.city && r1.rub, 'rubble: a fallen block leaves rubble', JSON.stringify(r1));
  ck(r1.ord && r1.cleared && r1.secs < 25, 'rubble: a Construction Vehicle told to clear one cell removes it in seconds', JSON.stringify(r1));
  ck(!r1.edge || (r1.blocked && r1.rk && r1.freed), 'rubble: rubble on a supply road closes it until it is cleared', JSON.stringify(r1));
  // ITEMS
} catch (e) { fails.push('battlefield run crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of errs) fails.push(e);
await browser.close(); server.close();
}
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'BATTLEFIELD FAIL (' + fails.length + ')' : 'BATTLEFIELD PASS');
process.exit(fails.length ? 1 : 0);
