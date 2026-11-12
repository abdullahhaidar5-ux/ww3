// bldfix: building dressing check + pictures. CHECK=1 -> floating-dressing check over all production buildings (exit 1 on fail).
// SHOTS=tag -> close-ups of the war factory (US and IR) and a sheet of the other buildings, into orch/concepts/bldfix/<tag>-*.png
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { createRequire } from 'node:module';import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'concepts', 'bldfix');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock('bldfix'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('console', m => { if (/3D models for|bldfix/.test(m.text())) console.log('[page]', m.text().slice(0, 160)); });
const start = async (p) => {
  await page.goto(ORIGIN + '/index.html?lazy=1', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.evaluate(p => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.p = p; startSandbox(); }, p);
  await page.waitForFunction(() => !window.LOADING && MODELS.ready, null, { timeout: 600000, polling: 500 });
};
import { PAGE_CHECK, judge } from './bldfix-check.mjs';
let bad = 0;
if (process.env.DBG) { await start('US'); console.log(JSON.stringify(await page.evaluate((DK) => { const T=G.teams[1]; T.fac='US'; const o=makeObj({isB:true,kind:DK,team:1,size:STRUCT.hq.size,x:100,y:100,hp:1,maxhp:1}); const r=ROOFC[DK+'w']; const sz=new THREE.Vector3(); return {kids:o.children.map(c=>{const q=new THREE.Box3().expandByObject(c);q.getSize(sz);return [c.type,c.children.length,q.min.toArray().map(Math.round).join(','),q.max.toArray().map(Math.round).join(',')];}), bb:r&&[r.bb.min.toArray(),r.bb.max.toArray()], hits:r&&r.cells.map(c=>c?Math.round(c[0])+(c[1]?'u':''):'-').join(' ')}; }, process.env.DBG))); }
if (process.env.CHECK) {
  await start('US');
  const res = await page.evaluate(PAGE_CHECK);
  const bads = judge(res);
  console.log(res.map(r => typeof r === 'string' ? r : `${r.f}/${r.k} roof=${r.roofY} flat=${r.flat} rings=${r.rings} maxMin=${r.maxMin}`).join('\n'));
  console.log(bads.length ? 'BLDFIX FAIL\n' + bads.join('\n') : 'BLDFIX PASS'); bad = bads.length;
}
if (process.env.SHOTS) {
  const tag = process.env.SHOTS;
  for (const p of (process.env.PLAYERS || 'US,IR').split(',')) {
    await start(p);
    await page.evaluate(() => { const f = G.ents.find(e => e.team === ME && e.kind === 'factory') || G.ents.find(e => e.team === ME && e.isB); window.__F = f; cam.x = f.x; cam.y = f.y - 28; cam.dist = 250; });
    await page.waitForTimeout(7000);
    await page.screenshot({ path: path.join(OUT, `${tag}-factory-${p}.png`), timeout: 300000 }); console.log('shot factory', p);
    if (!process.env.FACONLY) {
      const kinds = await page.evaluate(() => { const h = G.ents.find(e => e.team === ME && e.kind === 'hq'), r = []; let i = 0; for (const k of ['barracks', 'depot', 'airfield', 'radio', 'uplink']) { const x = h.x + 150 + (i % 3) * 120, y = h.y + 110 * ((i / 3) | 0) - 60; i++; try { const e = addBld(ME, k, x, y, true); r.push([k, e ? e.x : x, e ? e.y : y]); } catch (er) { console.log('bldfix addBld', k, er.message); } } r.unshift(['hq', h.x, h.y]); return r; });
      let n = 0; for (const [k, x, y] of kinds) { await page.evaluate(([x, y]) => { cam.x = x; cam.y = y + 25; cam.dist = 200; }, [x, y]); await page.waitForTimeout(3500); await page.screenshot({ path: path.join(OUT, `${tag}-sheet-${p}-${n++}-${k}.png`), timeout: 300000 }); console.log('shot', p, k); }
    }
  }
}
await browser.close(); server.close(); process.exit(bad ? 1 : 0);
