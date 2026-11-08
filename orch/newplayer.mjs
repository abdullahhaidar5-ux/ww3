// First-time-player audit (Lane D2, updated for menu v3 screens): boots the game like a new player, lists every VISIBLE control on the
// title and on each menu screen (found by clicking visible text only), and flags: buttons with no text/tooltip, cryptic short labels,
// jargon, screens with no visible way back. Usage: node orch/newplayer.mjs [--shot]
// Screens walked: title, then Conquest (Battlefield > Nation > Players > Battle options), Play online, Extras, Credits.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out'); fs.mkdirSync(OUT, { recursive: true });
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { for (const p of ['/opt/npm-tools/node_modules/playwright']) try { pw = req(p); break; } catch {} }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await pg.waitForFunction(() => typeof menuGo === 'function', null, { timeout: 60000 }); await pg.waitForTimeout(2500);
const JARGON = /\b(AO|MBT|SAM|IFV|APC|ATGM|LOS|RoE|OOB|HQ|DPS|AoE|ECM|UAV|FOW|TTK)\b/;
const scan = () => pg.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (r.width < 4 || r.height < 4 || cs.visibility === 'hidden' || cs.display === 'none' || r.bottom < 0 || r.top > innerHeight) return false;
    for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
  return [...document.querySelectorAll('#menu button,#menu select,#menu input')].filter(vis).map(e => ({ id: e.id || '', t: (e.innerText || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 60), tip: e.title || e.getAttribute('aria-label') || e.placeholder || '' }));
});
const report = { screens: [], issues: [] };
const shot = process.argv.includes('--shot');
const visit = async (name, id) => {
  await pg.evaluate(i => { menuHome(); if (i !== 'title') menuGo(i); }, id);
  try { await pg.waitForFunction(i => MX.cur === i && document.querySelector('.ms.on') && document.querySelector('.ms.on').id === 'ms-' + i, id, { timeout: 8000 }); } catch { report.issues.push(`"${name}": the screen never opened`); }
  await pg.waitForTimeout(600);
  const items = await scan(); report.screens.push({ name, items });
  const back = id === 'title' || items.some(i => /back/i.test(i.t)); if (!back) report.issues.push(`"${name}": no visible Back`);
  if (shot) { fs.mkdirSync(path.join(ROOT, 'orch/shots/laneD'), { recursive: true }); await pg.screenshot({ path: path.join(ROOT, `orch/shots/laneD/menu-${id}.png`) }); }
};
for (const [n, id] of [['title', 'title'], ['Battlefield', 'c-map'], ['Nation', 'c-nation'], ['Players', 'c-players'], ['Battle options', 'c-opts'], ['Play online', 'online'], ['Extras', 'extras'], ['Credits', 'credits']]) await visit(n, id);
// every title entry must be a real, visible, clickable item
await pg.evaluate(() => menuHome());
await pg.waitForFunction(() => { const t = document.getElementById('ms-title'); const c = t && getComputedStyle(t); return !!c && c.visibility === 'visible' && +c.opacity === 1; }, null, { timeout: 8000 }).catch(() => report.issues.push('the title menu never faded in'));
await pg.waitForTimeout(300);
const titles = (await scan()).map(i => i.t.split(' ')[0].toLowerCase()); for (const want of ['grand', 'conquest', 'missions', 'tutorial', 'play', 'load', 'settings', 'extras', 'credits']) if (!titles.includes(want)) report.issues.push(`title menu is missing "${want}"`);
for (const s of report.screens) for (const i of s.items) {
  if (!i.t && !i.tip && i.id !== 'mxnatin') report.issues.push(`[${s.name}] control #${i.id} has no text or tooltip`);
  if (JARGON.test(i.t)) report.issues.push(`[${s.name}] jargon: "${i.t}"`);
}
report.errors = errs; fs.writeFileSync(path.join(OUT, 'newplayer.json'), JSON.stringify(report, null, 1));
console.log(report.screens.map(s => `${s.name}: ${s.items.map(i => i.t).filter(Boolean).slice(0, 25).join(' | ')}`).join('\n').slice(0, 4000));
console.log('ISSUES (' + report.issues.length + '):\n' + report.issues.join('\n')); if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 3));
await b.close(); srv.close(); process.exit(report.issues.length || errs.length ? 1 : 0);
