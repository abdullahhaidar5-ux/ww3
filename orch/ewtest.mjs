// Electronic warfare check: EW truck radar spoof + minimap jamming (view-only, per team).
// Starts a single-player battle, puts an enemy EW truck over our base and one of ours near theirs, uses the spoof
// through the normal order path (the command-card button), and checks what each side's minimap gets:
// jamming bubble over our units, 3-4 ghost contacts, flagged as fake once the team owns a Strike Center, nothing
// added to the simulation. Saves orch/out/ew-minimap.png (minimap) and orch/out/ew-battle.png.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out'); fs.mkdirSync(OUT, { recursive: true });
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0; const errors = [];
const ck = (n, ok, info = '') => { if (!ok) fails++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${ok || !info ? '' : '  — ' + info}`); };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(() => { setup.n = 1; startSingle(); });
  await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 });
  const r = await page.evaluate(() => {
    G.paused = true;
    const me = ME, en = G.teams.find(T => T.id !== me).id, myHq = G.ents.find(b => b.team === me && b.kind === 'hq'), enHq = G.ents.find(b => b.team === en && b.kind === 'hq');
    const o = {};
    // enemy truck parked over our base, ours near theirs
    const et = addUnit(en, 'ew', myHq.x + 120, myHq.y + 40), mt = addUnit(me, 'ew', enHq.x - 750, enHq.y);
    for (const u of [et, mt]) { u.max = u.hp = 1e7; }
    simUpdate(0.02);
    o.jamMine = ewView(me).j.length; o.jamTheirs = ewView(en).j.length;
    const n0 = G.ents.length;
    // ours: through the command card button (same order path as a click/tap)
    G.sel = [mt]; updateUI(); const btn = [...document.querySelectorAll('button')].find(b => /Radar spoof/.test(b.textContent));
    o.btn = !!btn; if (btn) btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const n1 = G.ents.length; simUpdate(0.02);
    o.spoofs = (G.spoofs || []).length; o.cd = mt.spfT - G.t;
    o.theirG = ewView(en).g.map(q => q[5]); o.mineG = ewView(me).g.map(q => q[5]);
    updateUI(); const b2 = [...document.querySelectorAll('button')].find(b => /Radar spoof/.test(b.textContent)); o.btn2 = b2 ? b2.textContent + (b2.disabled ? ' [disabled]' : '') : null;
    act(me, { t: 'spoof', tid: mt.id }); o.spoofsAfterRepeat = G.spoofs.length;   // cooldown: refused
    act(me, { t: 'spoof', tid: et.id }); o.spoofsStolen = G.spoofs.length;         // not our truck: refused
    // enemy spoofs us (AI usage path does the same doSpoof)
    const n2 = G.ents.length; doSpoof(et); o.entsAdded = (n1 - n0) + (G.ents.length - n2); simUpdate(0.02); o.onMine = ewView(me).g.filter(q => q[5] === 0).length;
    const p0 = ewView(me).g.find(q => q[5] === 0); for (let i = 0; i < 50; i++) simUpdate(0.1); const p1 = ewView(me).g.find(q => q[5] === 0);
    o.drift = p0 && p1 ? Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])) : 0;
    o.packJson = JSON.stringify(ewPack(me)).length;
    // counter: a working Strike Center flags the ghosts
    addBld(me, 'uplink', myHq.x - 200, myHq.y - 160, true); simUpdate(0.02); simUpdate(0.02);
    o.flagged = ewView(me).g.filter(q => q[5] === 1).length;
    // ghosts expire after 20 s
    window.__exp = () => { for (let i = 0; i < 160; i++) simUpdate(0.1); return (G.spoofs || []).length; };
    // frame the minimap for the screenshot: undo the Strike Center flag so ghosts show as real-looking contacts
    G.teams[me]._upl = false; G._ewv = null; G.mmT = 0; drawMini();
    return o;
  });
  console.log(JSON.stringify(r));
  ck('enemy jam bubble over our base blacks out our minimap', r.jamMine >= 1);
  ck('our truck far from their units: no blackout for them', r.jamTheirs === 0);
  ck('Radar spoof button on the EW truck command card', r.btn);
  ck('spoof order via the button creates one spoof', r.spoofs === 1);
  ck('cooldown ~60 s', r.cd > 59 && r.cd <= 60, r.cd);
  ck('3-4 ghosts on the enemy minimap, unflagged', r.theirG.length >= 3 && r.theirG.length <= 4 && r.theirG.every(f => f === 0), r.theirG);
  ck('own ghosts shown faintly to the owner', r.mineG.length >= 3 && r.mineG.every(f => f === 2), r.mineG);
  ck('button shows cooldown', /ready in/.test(r.btn2 || ''), r.btn2);
  ck('repeat during cooldown refused', r.spoofsAfterRepeat === 1);
  ck('cannot spoof with an enemy truck', r.spoofsStolen === 1);
  ck('enemy ghosts on our minimap', r.onMine >= 3);
  ck('ghosts drift toward us (~190 px in 5 s)', r.drift > 120 && r.drift < 260, r.drift);
  ck('no units added to the simulation', r.entsAdded === 0, r.entsAdded);
  ck('team message carries EW data', r.packJson > 10);
  ck('Strike Center flags ghosts as fake', r.flagged >= 3, r.flagged);
  await page.evaluate(() => { const c = document.getElementById('mm') || mm; window.__mmPng = c.toDataURL('image/png'); });
  const png = await page.evaluate(() => window.__mmPng.split(',')[1]);
  fs.writeFileSync(path.join(OUT, 'ew-minimap.png'), Buffer.from(png, 'base64'));
  await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); centerOn(hq.x, hq.y, true); renderFrame(0.016); G.mmT = 0; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'ew-battle.png'), timeout: 150000 });
  const left = await page.evaluate(() => window.__exp());
  ck('spoof ends after 20 s', left === 0, left);
  ck('no page errors', !errors.length, errors.join(' / '));
} catch (e) { fails++; console.log('ERROR', e.message); }
await browser.close(); server.close();
console.log(fails ? `EW FAIL (${fails})` : 'EW PASS');
process.exit(fails ? 1 : 0);
