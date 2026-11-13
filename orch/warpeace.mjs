// AI-vs-AI campaign check for war & peace (helper warpeace, 2026-11-13): runs AI-only campaigns month by month and counts
// wars (length, how they ended), provinces that changed hands, capitals taken and nations eliminated.
//   node orch/warpeace.mjs [--months 60] [--seeds 11,12,13] [--json out.json]
// Works on any commit (it only reads GC), so the same script gives the "before" and "after" numbers in orch/reports/warpeace.md.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MONTHS = Number(arg('months', 60)), SEEDS = String(arg('seeds', '11,12,13')).split(',').map(Number), OUT = arg('json', '');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof grNew === 'function' && typeof gpOpen === 'function', null, { timeout: 120000 });
const all = [];
for (const seed of SEEDS) {
  const r = await page.evaluate(({ seed, MONTHS }) => {
    grNew({ me: null, seed, len: 'std' });
    const own = pi => { const st = GC.prov[pi]; return st.ow || st.o; };   // legal owner (st.ow exists only after the occupation rule)
    const land = GCM.P.filter(p => p.land), o0 = land.map(p => own(p.i)), c0 = land.map(p => GC.prov[p.i].o), caps = {}; for (const c of Object.keys(GC.nat)) caps[c] = GC.nat[c].cap;
    const start = {}, wars = [], open0 = Object.keys(GC.war).length; for (const k of Object.keys(GC.war)) start[k] = 0;
    let capFell = 0, capFast = 0; const fellSeen = {};
    for (let m = 1; m <= MONTHS && !GC.over; m++) { const before = new Set(Object.keys(GC.war)); grEndTurn(true);
      const now = new Set(Object.keys(GC.war));
      for (const k of now) if (!before.has(k)) start[k] = m;
      for (const k of before) if (!now.has(k)) { const [a, b] = k.split('|'); const dead = GC.nat[a].dead || GC.nat[b].dead; let moved = 0; land.forEach((p, i) => { const w = own(p.i); if ((o0[i] === a && w === b) || (o0[i] === b && w === a)) moved++; });
        wars.push({ k, len: m - start[k], end: dead ? 'eliminated' : 'peace', moved }); delete start[k]; }
      for (const c of Object.keys(caps)) { const st = GC.prov[caps[c]]; if (st && st.o !== c && !fellSeen[c]) { fellSeen[c] = m; capFell++; const ws = Object.keys(start).filter(k => k.split('|').includes(c)).map(k => m - start[k]); if (ws.length && Math.min(...ws) <= 6) capFast++; } } }
    let ctl = 0, legal = 0, occ = 0; land.forEach((p, i) => { if (GC.prov[p.i].o !== c0[i]) ctl++; if (own(p.i) !== o0[i]) legal++; if (GC.prov[p.i].ow) occ++; });
    const openLen = Object.keys(GC.war).map(k => GC.turn - 1 - (start[k] || 0));
    return { seed, months: GC.turn - 1, open0, wars, open: openLen, ctl, legal, occ, capFell, capFast, dead: Object.keys(GC.nat).filter(c => GC.nat[c].dead).length, nats: Object.keys(GC.nat).length, hash: grHash() };
  }, { seed, MONTHS });
  all.push(r);
  const L = r.wars.map(w => w.len).sort((a, b) => a - b), med = L.length ? L[L.length >> 1] : 0;
  console.log(`seed ${seed}: ${r.months} months · wars at start ${r.open0} · ended ${r.wars.length} (peace ${r.wars.filter(w => w.end === 'peace').length}, eliminated ${r.wars.filter(w => w.end !== 'peace').length}) · median length ${med} · still open ${r.open.length} · provinces: control changed ${r.ctl}, owner changed ${r.legal}, occupied now ${r.occ} · capitals taken ${r.capFell} (within 6 months of war: ${r.capFast}) · nations gone ${r.dead}/${r.nats} · ${r.hash}`);
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(all));
if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' || '));
console.log(errs.length ? 'WARPEACE FAIL' : 'WARPEACE DONE');
await browser.close(); server.close();
