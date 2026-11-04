// Campaign test: each of the 5 missions loads, runs ~2 game-minutes with a simple scripted player and no errors, takes a
// screenshot (orch/shots/campaign/<id>.png), then its objectives are completed by script and the debrief must appear.
//   node orch/camptest.mjs [--only pass] [--minutes 2]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'campaign');
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
const IDS = ['pass', 'supply', 'fortress', 'town', 'finale'].filter(i => !ONLY || i === ONLY);
for (const id of IDS) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
  try {
    await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof startCampaign === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
    await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
    // menu button + mission list + briefing screens exist
    const ui = await page.evaluate((id) => { const b = document.getElementById('campaign'); if (!b) return 'no Campaign button'; b.click(); const a = document.getElementById('campScreen'); if (!a || !/Hold the Pass/.test(a.textContent)) return 'no mission list';
      campBrief(CAMPAIGN.find(m => m.id === id)); if (!/Objectives/.test(document.getElementById('campScreen').textContent)) return 'no briefing'; campClose(); return ''; }, id);
    if (ui) fails.push(`${id}: ${ui}`);
    const st = await page.evaluate((id) => { try { startCampaign(id, 1); return { ok: !!G && !!G.camp, n: G.teams.length }; } catch (e) { return { err: String(e.stack || e) }; } }, id);
    if (!st.ok) { fails.push(`${id}: start failed ${st.err || ''}`); await page.close(); continue; }
    await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push(id + ': loading never finished'));
    await page.waitForTimeout(2500);
    // a scripted player: every 5 game-seconds idle combat units attack-move at the objective
    const run = (k, bot) => page.evaluate(({ k, bot }) => { try {
      for (let i = 0; i < k && !G.over; i++) { simUpdate(1 / 60);
        if (bot && i % 300 === 0) { const c = G.camp; const tgt = G.ents.find(e => e.team !== 0 && e.team !== (G.teams.length > 2 && c.id === 'town' ? 1 : -1) && e.isB && !e.dead) || { x: BASES[1][0], y: BASES[1][1] };
          const us = G.ents.filter(e => e.team === 0 && !e.isB && !e.dead && e.kind !== 'harv' && e.kind !== 'dozer' && e.kind !== 'drone' && (!e.order || e.order.type === undefined));
          if (us.length) act(0, { t: 'go', ids: us.map(u => u.id), x: tgt.x, y: tgt.y, mode: 'amove' }); } }
      let nan = 0; for (const e of G.ents) if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) nan++;
      return { t: G.t, over: G.over, nan, tickErr: !!G.camp.m.tickErr, obj: G.camp.o, res: G.camp.res || '' }; } catch (e) { return { err: String(e.stack || e) }; } }, { k, bot });
    await run(60 * 12, false);
    await page.evaluate(() => { try { renderFrame(0.016); } catch (e) {} }); await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOTS, id + '.png'), timeout: 180000 }).catch(e => console.log('  (screenshot skipped: ' + String(e.message).split('\n')[0] + ')'));
    let r = await run(Math.round(MIN * 3600), true);
    if (r.err) fails.push(`${id}: sim threw ${r.err.split('\n').slice(0, 3).join(' | ')}`);
    else { if (r.nan) fails.push(`${id}: ${r.nan} NaN entities`); if (r.tickErr) fails.push(`${id}: mission tick threw`); }
    console.log(`${id}: ran ${r.t && r.t.toFixed(0)}s ${JSON.stringify(r.obj)} ${r.res}`);
    // complete the objectives by script
    const done = await page.evaluate((id) => { const c = G.camp, K = (e) => { try { kill(e, 0, null); } catch (x) {} };
      if (G.over) return { early: true, res: c.res };
      if (id === 'pass') { c.t = c.T; for (const e of G.ents.filter(e => e.team === 1 && e.isB)) K(e); }
      else if (id === 'supply') { for (const u of c.trucks) { u.x = c.town[0]; u.y = c.town[1]; } }
      else if (id === 'fortress') { addBld(0, 'fort', BASES[0][0] + 200, BASES[0][1] + 200, true); c.t = c.T + 1; c.bbDone = c.bb.length; c.bb[1][1] = -1; }
      else if (id === 'town') { for (const e of G.ents.filter(e => e.team === 2)) K(e); const us = G.ents.filter(e => e.team === 0 && !e.isB && !e.dead);
        for (let i = 0; i < 5; i++) { const u = us[i % us.length]; if (u) { u.x = c.zones[i][0]; u.y = c.zones[i][1]; } } }
      else if (id === 'finale') { for (const e of G.ents.filter(e => e.team === 1 && e.isB)) K(e); }
      for (let i = 0; i < 1200 && !c.fin; i++) simUpdate(1 / 60);
      return { res: c.res, fin: !!c.fin, o: c.o, deb: !!document.getElementById('campScreen') && /Victory/.test(document.getElementById('campScreen').textContent) }; }, id);
    console.log(`${id}: scripted finish -> ${JSON.stringify(done)}`);
    if (!done.early && (done.res !== 'win' || !done.deb)) fails.push(`${id}: scripted completion did not end in a victory debrief ${JSON.stringify(done)}`);
    const sv = await page.evaluate((id) => JSON.stringify(campLoad()[id] || null), id); if (!done.early && sv === 'null') fails.push(`${id}: progress not saved`);
  } catch (e) { fails.push(`${id}: ${String(e.message || e).split('\n')[0]}`); }
  for (const e of [...new Set(errs)].slice(0, 5)) fails.push(`${id}: ${e}`);
  await page.close();
}
await browser.close(); server.close();
if (fails.length) { console.log('\nCAMPTEST FAIL'); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nCAMPTEST PASS');
