<<<<<<< HEAD
// Lane D first-time-player audit: boots the game like a new player, finds tasks only via VISIBLE text
// (buttons/labels/tooltips), clicks each main-menu entry, and reports: visible texts, empty/no-title buttons,
// jargon words, screens with no visible way back. Output: orch/out/newplayer.json + a short report on stdout.
//   node orch/newplayer.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((q, s) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const U = `http://127.0.0.1:${server.address().port}/index.html`;
const req = createRequire(import.meta.url); let pw; try { pw = await import('playwright'); } catch { pw = req('/opt/npm-tools/node_modules/playwright'); }
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
await page.route('**/*', r => r.request().url().startsWith(U.replace('/index.html', '')) ? r.continue() : r.abort());
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(U, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000); await page.screenshot({ path: path.join(OUT, 'np-menu.png') });
const JARGON = /\b(AO|MBT|SAM|IFV|APC|ATGM|LOS|RoE|OOB|HQ|DPS|AoE|ECM|UAV|FOW|TTK)\b/;
const scan = () => page.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight && (() => { const t = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))); return !!t && (t === e || e.contains(t) || t.contains(e)); })(); };
  return [...document.querySelectorAll('button,[onclick],.btn,a,select,input')].filter(vis)  .map((e, n) => { e.setAttribute('data-np', n); return ({ id: e.id || '', t: (e.innerText || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 60), title: e.title || '', tag: e.tagName, n }); });
});
const report = { screens: [], issues: [] };
const first = await scan(); report.screens.push({ name: 'main menu', items: first });
for (const b of first.filter(b => b.t && !/quit|exit|delete|reset/i.test(b.t)).slice(0, 30)) {
  try {
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
    await page.evaluate(t => { const e = [...document.querySelectorAll('button,[onclick],.btn,a')].find(x => (x.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60) === t); e && e.click(); }, b.t);
    await page.waitForTimeout(1200);
    const items = await scan(); const back = items.some(i => /back|close|cancel|menu|done|leave|×|✕/i.test(i.t));
    report.screens.push({ name: b.t, items });
    if (!back) report.issues.push(`"${b.t}": no visible Back/Close/Menu button after opening`);
    await page.screenshot({ path: path.join(OUT, 'np-' + b.t.replace(/\W+/g, '_') + '.png') });
  } catch (e) { report.issues.push(`"${b.t}": click failed (${String(e.message).split('\n')[0]})`); }
}
for (const s of report.screens) for (const i of s.items) {
  if (!i.t && !i.title && i.tag === 'BUTTON') report.issues.push(`[${s.name}] button #${i.id} has no text or tooltip`);
  if (JARGON.test(i.t)) report.issues.push(`[${s.name}] jargon: "${i.t}"`);
}
report.errors = errs; fs.writeFileSync(path.join(OUT, 'newplayer.json'), JSON.stringify(report, null, 1));
console.log(report.screens.map(s => `${s.name}: ${s.items.map(i => i.t).filter(Boolean).slice(0, 25).join(' | ')}`).join('\n').slice(0, 5000));
console.log('ISSUES (' + report.issues.length + '):\n' + report.issues.join('\n'));
await browser.close(); server.close();
=======
// First-time-player audit (Lane D2): opens the menu like a new player and lists every visible button/label,
// flagging ones with no tooltip, jargon-y or very short text. Usage: node orch/newplayer.mjs [--shot]
// Output = visible text only (what a new player can see); fix the flagged ones with wording/hints.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { for (const p of ['/opt/npm-tools/node_modules/playwright']) try { pw = req(p); break; } catch {} }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await pg.waitForTimeout(6000);
const items = await pg.evaluate(() => [...document.querySelectorAll('button,[role=button],.btn,a')].filter(e => e.offsetParent).map(e => ({
  t: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60), tip: e.title || e.getAttribute('data-tip') || '' })).filter(x => x.t));
const flags = items.filter(x => !x.tip && (x.t.length < 4 || /^[A-Z0-9 +\/-]{2,6}$/.test(x.t)));
console.log('VISIBLE CONTROLS:', items.length); items.forEach(x => console.log(' -', x.t, x.tip ? '(tip)' : ''));
console.log('FLAGGED (no tooltip + cryptic):'); flags.forEach(x => console.log(' !', x.t));
if (process.argv.includes('--shot')) { fs.mkdirSync(path.join(ROOT, 'orch/shots/laneD'), { recursive: true }); await pg.screenshot({ path: path.join(ROOT, 'orch/shots/laneD/menu.png') }); }
await b.close(); srv.close();
>>>>>>> origin/main
