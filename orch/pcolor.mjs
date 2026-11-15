// Player colour guard (pcolor, Abdullah 2026-11-14 18:57 "players can choose their color"): a picked colour reaches T.color, two seats cannot share one, the pickers exist.
// (was: Battle power test (battlepower, Abdullah 2026-11-13 20:11 + 20:13): a Generator for every nation, only electronic buildings use power, low power = those buildings offline and production unchanged, Conquest keeps its plants. node orch/powertest.mjs -> POWER PASS
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'pcolor');
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
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof PCOLS !== 'undefined', null, { timeout: 60000 });
  // 1. data: 12 distinct colours; pcClean keeps unique in-range picks only
  const d = await ev(() => ({ n: PCOLS.length, uniq: new Set(PCOLS.map(c => c.c)).size, a: pcClean([3, 3, -1, 99, 5], 5), b: pcClean([-1, -1], 2), c: pcClean(null, 2) }));
  ck(d.n === 12 && d.uniq === 12, 'pcolor: PCOLS must hold 12 different colours ' + JSON.stringify(d));
  ck(JSON.stringify(d.a) === '[3,-1,-1,-1,5]' && d.b === null && d.c === null, 'pcolor: pcClean must drop duplicate / out-of-range picks ' + JSON.stringify(d));
  // 2. single-player Battle: the picked colour is the team colour (units, minimap and plates read T.color)
  await ev(() => { setup.p = 'IR'; setup.a = 'US'; setup.map = (BATTLE_MAPS.find(k => MAPS[k] && MAPS[k].max >= 4) || setup.map); setup.n = 2; setup.pc = [4, 4, 4]; setup.pc.init = 1; setup.tm = [0, 1, 2]; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING && G.teams && G.teams.length >= 4, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('pcolor: battle never loaded'));
  const t = await ev(() => G.teams.filter(T => !T.reb).map(T => ({ c: T.color, d: T.dark, f: T.F.color })));
  ck(t.length === 4 && t[0].c === '#f08a2a' && t[0].c !== t[0].f, 'pcolor: your picked colour (Orange) did not reach T.color ' + JSON.stringify(t));
  ck(new Set(t.map(x => x.c)).size === 4, 'pcolor: two seats share a colour ' + JSON.stringify(t));
  ck(t[1].c !== t[0].c && t[2].c !== t[0].c && t[1].c === '#e03a3a', 'pcolor: computer players must take the first free colours ' + JSON.stringify(t));
  // 3. old clients/servers: no pc at all = nation colours
  const n = await ev(() => { newGame({ battle: 1, seed: 7, facs: ['IR', 'US'], ai: [false, true], map: setup.map, tm: [0, 1] }); return G.teams.slice(0, 2).map(T => T.color === T.F.color); });
  ck(n.every(Boolean), 'pcolor: without a pick the team keeps its nation colour');
  // 4. the pickers: Players step lists a colour button per row, taken colours are greyed out
  await ev(() => { G = null; });
  const ui = await ev(() => { setup.pc = []; setup.n = 3; renderTeams(); const rows = [...document.querySelectorAll('#teamList .trow')]; const b = rows[0].querySelector('.pcb'); b.click(); const pop = document.getElementById('pcpop'); const dis = pop ? [...pop.querySelectorAll('button:disabled')].length : -1; const tot = pop ? pop.querySelectorAll('button').length : 0; if (pop) pop.remove(); return { rows: rows.length, btns: rows.filter(r => r.querySelector('.pcb')).length, dis, tot }; });
  ck(ui.btns === ui.rows && ui.rows >= 4, 'pcolor: every Players row needs a colour picker ' + JSON.stringify(ui));
  ck(ui.tot === 13 && ui.dis === 3, 'pcolor: picker = Nation colour + 12 colours, the three colours the computer players hold greyed out ' + JSON.stringify(ui));
  // 5. online lobby: mplShow draws a picker per row; you edit your own row only
  const lb = await ev(() => { document.getElementById('menu').hidden = false; const rows = [{ kind: 'human', you: true, host: true, name: 'You', f: 'IR', tm: 0, rd: 1, pc: 1, pcTaken: new Set([0]), nat: '#00aa00', ed: { c: () => {}, f: () => {}, t: () => {} } }, { kind: 'human', name: 'Friend 1', f: 'US', tm: 1, rd: 0, pc: 0, pcTaken: new Set([1]), nat: '#3355ff', ed: null }, { kind: 'ai', d: 1, f: 'RU', tm: 1, pc: 4, pcTaken: new Set([0, 1]), nat: '#aa0000', ed: { c: () => {}, f: () => {}, t: () => {}, slot: () => {} } }, { kind: 'open', ed: { slot: () => {} } }];
    mplShow({ code: 'abcd12', mk: 'strait', mx: 4, nn: 3, rows, all: [0, 1, 1], w: 0, net: 'Online', notes: [], start: { label: 'PLAY GAME · 3', hint: 'Pick your colour.' }, back: () => {} });
    const bs = [...document.querySelectorAll('#mplTable .pcb')]; const r = { n: bs.length, dis: bs.map(b => b.disabled) }; bs[0].click(); const pop = document.getElementById('pcpop'); r.dis0 = pop ? [...pop.querySelectorAll('button:disabled')].length : -1; return r; });
  ck(lb.n === 3 && JSON.stringify(lb.dis) === '[false,true,false]' && lb.dis0 === 1, 'pcolor: lobby pickers (own + computer row editable, other friends read-only, taken greyed) ' + JSON.stringify(lb));
  await page.screenshot({ path: path.join(ROOT, 'orch', 'shots', 'pcolor.jpg'), type: 'jpeg', quality: 80, timeout: 120000 }).catch(() => console.log('  (screenshot skipped)'));
} catch (e) { fails.push('pcolor run crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of errs) fails.push(e);
await browser.close(); server.close();
}
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'PCOLOR FAIL (' + fails.length + ')' : 'PCOLOR PASS');
process.exit(fails.length ? 1 : 0);
