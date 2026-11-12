// ORCH smoke test: the gate every change must pass before it goes live on GitHub Pages.
// Serves the repo locally, opens the game in headless Chromium, starts a skirmish vs AI, fast-forwards the battle
// several game-minutes through the real simulation, and fails on any page error, console error, stalled sim or
// empty battlefield. Saves screenshots to orch/out/ so ORCH (and you) can look at what the game actually renders
// (each run keeps its own copy in orch/out/runs/<timestamp>-smoke/, see runs.mjs).
//
//   node orch/smoke.mjs            # default: 4 game-minutes, 2 factions
//   node orch/smoke.mjs --minutes 8 --players 4
//   node orch/smoke.mjs --no-lock  # skip the machine-wide browser lock (see browserlock.mjs)
//   node orch/smoke.mjs --artifact # test the claude.ai artifact edition instead (python3 orch/build.py --artifact
//                                  # first): Three.js inline as on Pages, room capability stubbed, screenshots art-*.png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock, watchPeakMemory } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
import { artifactHtml, artifactHandler, threeJs, THREE_CDN, roomStub, roomTopics, judgeRoomStats } from './artifact-harness.mjs';
import { newRun } from './runs.mjs';
import { PAGE_CHECK, judge as judgeBld } from './bldfix-check.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const MINUTES = arg('minutes', 4), PLAYERS = Math.max(2, Math.min(8, arg('players', 2)));
const ART = process.argv.includes('--artifact') ? { html: artifactHtml(), three: threeJs() } : null;
const PFX = ART ? 'art-' : '';

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) {
    try { return req(p); } catch {}
  }
  throw new Error('playwright not found (npm i -g playwright, then npx playwright install chromium)');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux64', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch {}
  return undefined; // let playwright use its own
}

// one headless browser at a time on this machine (parallel agents' runs OOM-kill each other); --no-lock skips
await acquireBrowserLock();
const peakMB = watchPeakMemory();

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = http.createServer(ART ? artifactHandler(ART.html) : (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;

const fails = [], warns = [];
// SwiftShader (CPU WebGL) can take minutes per frame in a busy battle; a slow screenshot is not a game bug.
async function shot(page, name) {
  try { await RUN.save(page, PFX + name, { timeout: 180000 }); }
  catch (e) { warns.push(`screenshot ${name} skipped: ${String(e.message || e).split('\n')[0]}`); }
}
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const bctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await guardContext(bctx); // never the live game servers (WebSockets escape page.route)
const page = await bctx.newPage();
if (process.env.DN_W) await page.addInitScript(w => { window.__DNW = w; }, +process.env.DN_W); // DN_W=4: run the same smoke battle at night (screenshots for orch/shots/daynight)
// Network to other hosts (PeerJS signalling, fonts, relays) is not part of the test.
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue()
  : ART && r.request().url() === THREE_CDN ? r.fulfill({ status: 200, contentType: 'text/javascript', body: ART.three }) : r.abort());
if (ART) await page.addInitScript(roomStub, { topics: roomTopics() });
page.on('pageerror', e => fails.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) warns.push('console (ignored, offline/headless): ' + t.slice(0, 200));
  else fails.push('console error: ' + t.slice(0, 300));
});

fs.mkdirSync(OUT, { recursive: true });
const RUN = newRun(ART ? 'smoke-art' : 'smoke');
const t0 = Date.now();
try {
  await page.goto(ART ? URL0 : URL0 + '?lazy=1', { waitUntil: 'load', timeout: 120000 }); // ?lazy=1: battles must run WITHOUT the grand-campaign bundle (orch/loadF)
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => warns.push('3D models still loading after 180s'));
  { const m = await page.evaluate(() => ({ n: Object.keys(MODELS.proto).length, of: typeof MODEL_FILES === 'object' ? Object.keys(MODEL_FILES).length : 0,
      ready: MODELS.ready, err: MODELS.err || '', t: Math.round(performance.now()) }));
    console.log(`3D models: ${m.n} of ${m.of} ready=${m.ready} ${m.err} (page open to models ready: ${(m.t / 1000).toFixed(1)}s)`);
    if (!m.ready) warns.push('3D models did not load at the menu: ' + m.err); }
  await shot(page, 'menu.png');
  { // Playtest card (Extras): 10 things to try, thumbs + note per row, and the saved file carries the votes
    const pt = await page.evaluate(() => { if (typeof wwPlaytest !== 'function') return { no: 1 }; wwPlaytest(); const o = document.getElementById('idPlay');
      const rows = o ? o.querySelectorAll('.ptrow').length : 0; const v = o && o.querySelector('.ptv'); if (v) v.click(); const d = wwPlaytestData(); if (v) v.click();
      const menu = [...document.querySelectorAll('button.mxi')].some(b => b.textContent === 'Playtest card'); if (o) o.hidden = true;
      return { rows, save: !!document.getElementById('ptSave'), vote: d.items[0] && d.items[0].vote, kind: d.kind, n: d.items.length, menu }; });
    if (pt.no || pt.rows !== 10 || !pt.save || pt.vote !== 1 || pt.kind !== 'ww3-playtest' || pt.n !== 10 || !pt.menu) fails.push('Playtest card (Extras) is broken: ' + JSON.stringify(pt));
    else console.log('Playtest card: 10 things to try, votes saved into the file'); }
  if (!ART) { // lazy grand campaign: not in the page at load, loads on the menu button, and the page then has the whole campaign
    const pre = await page.evaluate(() => ({ g: typeof grandMenu, btn: !!document.getElementById('grandBtn'), file: typeof GRAND_FILE === 'string' && GRAND_FILE }));
    if (pre.g !== 'undefined' || !pre.btn || !pre.file) fails.push(`lazy grand: before opening, grandMenu is ${pre.g}, button ${pre.btn}, GRAND_FILE ${pre.file} (expected undefined, true, a file name)`);
    else console.log(`grand campaign is lazy: ${pre.file} not loaded at the menu`);
    // living main menu (idea 9): the background shows your war - drawn from the saves' small notes WITHOUT loading the campaign code.
    // Three cases: a saved campaign (war table + last battle), a saved battle that is newer (battlefield + front line), and no save (the calm picture, no caption).
    const wt = await page.evaluate(async () => { if (typeof mxWarTable !== 'function') return { err: 'mxWarTable missing' }; const K = 'ww3grand1', old = [localStorage.getItem(K), localStorage.getItem(K + '.i')], oldL = svLatest, mx = document.getElementById('mx');
      const d = btoa(String.fromCharCode(0, 16, 1, 8, 2, 8)), cap = () => (document.getElementById('mxwar') || {}).textContent || '', cv = () => !!mx.querySelector('#mxbg canvas#mxwt');
      const top = () => [...document.querySelectorAll('#mxmenu .mxi')].filter(b => !b.hidden && !/\b(dim|sep)\b/.test(b.className) && !/^Continue/.test(b.textContent.trim())).map(b => b.textContent.trim()).join('|');
      svLatest = null; localStorage.setItem(K, '{"v":1}'); localStorage.setItem(K + '.i', JSON.stringify({ ts: 5, me: 'IR', n: 'Iran', d: 'Mar 2027', over: 0, lb: { p: 1, t: 3, w: 1, me: 'IR' }, lbn: 'Testville', lbd: 'Feb 2027', wt: { w: 8, h: 4, d, c: [40, 160, 80], b: [.6, .5, 'Testville', 'Feb 2027', 1] } }));
      mxWarTable(); const g = { on: cv(), lab: (mx.querySelector('.mxwtl.bat') || {}).textContent || '', cap: cap(), top: top() };
      svLatest = { id: 'm:t', ts: 9, mapName: 'Testmap', facName: 'Testland', t: 125, wt: { w: 8, h: 4, d, c: [40, 160, 80], e: [150, 62, 50] } };
      mxWarTable(); const b = { on: cv(), lab: !!mx.querySelector('.mxwtl.bat'), cap: cap(), top: top() };
      svLatest = { id: 'm:old', ts: 10, mapName: 'Oldmap', facName: 'Testland', t: 5 }; mxWarTable(); const o = { on: cv(), cap: cap() };   // a save made before this feature: caption only, calm picture
      svLatest = null; localStorage.removeItem(K); localStorage.removeItem(K + '.i'); mxWarTable(); const n = { on: cv(), cap: cap(), wt: mx.classList.contains('wt'), top: top() };
      if (old[0] != null) localStorage.setItem(K, old[0]); if (old[1] != null) localStorage.setItem(K + '.i', old[1]); svLatest = oldL; mxWarTable();
      return { g, b, o, n, grand: typeof grandMenu, GC: typeof GC === 'undefined' || !GC ? 'none' : 'loaded' }; });
    const TOP = 'Single player|Multiplayer|Test range';
    if (wt.err || !wt.g.on || !/Testville/.test(wt.g.lab) || !/won/.test(wt.g.lab) || !/Iran.*Mar 2027.*Testville.*won/.test(wt.g.cap) || wt.g.top !== TOP
      || !wt.b.on || wt.b.lab || !/Testland.*Testmap.*2:05/.test(wt.b.cap) || wt.b.top !== TOP || wt.o.on || !/Oldmap/.test(wt.o.cap)
      || wt.n.on || wt.n.cap || wt.n.wt || wt.n.top !== TOP || wt.grand !== 'undefined')
      fails.push('living main menu: ' + JSON.stringify(wt) + ' (expected: campaign save -> war table + last battle + caption; newer battle save -> battlefield + caption, no battle marker; old save -> caption only; no save -> calm picture, no caption; top level unchanged; campaign code never loaded)');
    else console.log('living main menu: your war drawn from the save notes (campaign, battle, none), campaign code not loaded');
  }
  if (ART) { // the artifact edition must use the room capability, with no PeerJS / online-edition shim left in it
    const a = await page.evaluate(async () => { for (let i = 0; i < 40 && !NET.room; i++) await new Promise(r => setTimeout(r, 250));
      return { room: !!NET.room, peer: typeof Peer, p2p: !!window.WW3_P2P, three: THREE.REVISION, host: !document.getElementById('host').disabled }; });
    console.log(`artifact edition: room ${a.room}, three r${a.three}, PeerJS ${a.peer}, P2P shim ${a.p2p}`);
    if (!a.room || !a.host) fails.push('artifact: the game did not pick up the room capability (multiplayer would be off)');
    if (a.peer !== 'undefined' || a.p2p) fails.push('artifact: PeerJS / online-edition shim is still in the artifact page');
    { const want = (/WW3_THREE="0\.(\d+)/.exec(ART.three) || [])[1]; // the vendored bundle's release (orch/three/vendor.mjs)
      if (a.three !== want) fails.push('artifact: Three.js is r' + a.three + ', expected r' + want); }
  }

  // Start a skirmish against the AI the same way the Deploy button does, with the requested number of players.
  const start = await page.evaluate((n) => {
    try {
      if (typeof setup === "object" && setup) { setup.n = n - 1; setup.w = +(window.__DNW || 0); } // number of AI opponents
      try { initAudio(); } catch (e) {}
      startSingle();
      // put the player's slot under AI control too, so the test is a real two-sided battle
      if (G && G.teams[0] && !G.teams[0].ai && typeof mkAI === 'function') G.teams[0].ai = mkAI(1);
      return { ok: !!G, n: G && G.teams.filter(t => !t.reb).length, facs: G && G.teams.filter(t => !t.reb).map(t => t.fac), map: G && G.mapKey };
    } catch (e) { return { ok: false, err: String(e && e.stack || e) }; }
  }, PLAYERS);
  if (!start.ok) throw new Error('skirmish failed to start: ' + (start.err || 'G is null'));
  console.log(`battle: ${start.n} players ${start.facs.join(' vs ')} on ${start.map}`);
  // the battle starts behind a loading screen (ground, 3D world and shaders are prepared in steps, with the battle
  // clock held); wait for it to finish before checking that the clock runs
  const tLoad = Date.now();
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('loading screen did not finish within 10 minutes'));
  console.log(`loading screen finished after ${((Date.now() - tLoad) / 1000).toFixed(1)}s`);
  // bldfix (2026-11-12): nothing floats on production buildings (roof props sit on a roof, one yard wall; the factory's chimney tops used to carry a frame and roof props in mid-air)
  { const bres = await page.evaluate(PAGE_CHECK).catch(e => [String(e.message || e)]); const bb = judgeBld(bres); if (bb.length) fails.push('floating building dressing: ' + bb.slice(0, 6).join('; ')); else console.log(`building dressing: ${bres.length} building looks checked, nothing floats`); }
  // fortline (Abdullah 2026-11-11 19:02): only a Construction Vehicle builds a fortification line, the line follows a traced path; infantry only dig in
  { const r = await page.evaluate(() => { try {
      const hq = G.ents.find(b => b.team === 0 && b.kind === 'hq'), x = hq.x + 260, y = hq.y - 260, mk = (k, dx) => addUnit(0, k, x + dx, y + 30);
      const inf = [mk('inf', 0), mk('inf', 8)], dz = mk('dozer', 30), out = {};
      act(0, { t: 'wall', ids: inf.map(u => u.id), k: 'trench', pts: [x, y, x + 100, y] }); out.infWl = inf.some(u => u.wl && u.wl.length) || inf.some(u => u.order && u.order.type === 'wall');
      act(0, { t: 'wall', ids: [dz.id], k: 'trench', x, y, x2: x + 100, y2: y }); out.oldForm = !!(dz.wl && dz.wl.length);
      const pts = [x, y, x + 120, y, x + 120, y + 120, x + 240, y + 120, x + 240, y + 40], pl = wallPlan('trench', pts); out.n = pl.length; out.angs = [...new Set(pl.map(q => q.a.toFixed(2)))].length;
      act(0, { t: 'wall', ids: [dz.id], k: 'trench', pts }); out.bent = !!(dz.wl && dz.wl.length > 8 && new Set(dz.wl.map(q => q.a.toFixed(2))).size >= 3);
      dz.wl = null; dz.order = null; act(0, { t: 'wall', ids: [dz.id], k: 'trench', pts: [x, y, NaN, 4] }); out.bad = !!dz.wl;
      const keep = G.sel; G.sel = inf.slice(); const row = document.createElement('div'); tactRow(row, G.sel); out.infBtns = [...row.querySelectorAll('button')].map(b => b.textContent);
      G.sel = [dz]; const row2 = document.createElement('div'); tactRow(row2, G.sel); out.dzBtns = [...row2.querySelectorAll('button')].map(b => b.textContent); G.sel = keep;
      for (const u of [...inf, dz]) { u.dead = true; u.order = null; u.wl = null; } return out; } catch (e) { return { err: String(e && e.stack || e) }; } });
    console.log('fortline: ' + JSON.stringify(r));
    if (r.err) fails.push('fortline guard crashed: ' + r.err);
    else {
      if (r.infWl) fails.push('fortline: infantry took a fortification line order (only a Construction Vehicle builds lines)');
      if (!r.oldForm) fails.push('fortline: the old x,y,x2,y2 wall order no longer makes a work list for a Construction Vehicle');
      if (!r.bent) fails.push('fortline: a bent traced path did not become segments that follow the bends ' + JSON.stringify([r.n, r.angs]));
      if (r.bad) fails.push('fortline: a wall order with a non-finite point was accepted');
      if (!r.infBtns.some(t => /Dig in/.test(t)) || r.infBtns.some(t => /Fortification/.test(t))) fails.push('fortline: an infantry-only selection must show Dig in and no line button: ' + r.infBtns.join('|'));
      if (!r.dzBtns.some(t => /Fortification/.test(t))) fails.push('fortline: a Construction Vehicle selection lost the Fortification line button');
    } }
  // every model this battle's nations need must have arrived (in the artifact edition they come in a different published form)
  { const m = await page.evaluate(() => { const ks = typeof modelKeysFor === 'function' ? modelKeysFor(G.teams.filter(T => !T.reb).map(T => T.fac)) : Object.keys(MODEL_FILES);
      return { of: ks.length, miss: ks.filter(k => !MODELS.proto[k]), err: MODELS.err || '' }; });
    console.log(`3D models for this battle: ${m.of - m.miss.length} of ${m.of}`);
    if (m.miss.length) fails.push(`${ART ? 'artifact: ' : ''}${m.miss.length} of ${m.of} 3D models for this battle missing (${m.miss.slice(0, 5).join(', ')}) ${m.err} (players would see simple shapes)`); }

  await page.waitForTimeout(4000); // a few real rendered frames
  const tReal = await page.evaluate(() => G.t);
  if (!(tReal > 0)) fails.push('game clock did not advance while rendering (G.t=' + tReal + ')');
  await shot(page, 'battle-start.png');

  // Fast-forward the authoritative simulation in chunks, checking health as we go.
  const steps = Math.round(MINUTES * 60 * 60), CH = 1800;
  let last = null, peak = [];
  for (let done = 0; done < steps; done += CH) {
    last = await page.evaluate((k) => {
      const ms0 = performance.now();
      try { for (let i = 0; i < k && G && !G.over; i++) simUpdate(1 / 60); } catch (e) { return { err: String(e && e.stack || e) }; }
      const ents = G ? G.ents : [];
      let u = 0, b = 0, nan = 0;
      for (const e of ents) { if (e.isB) b++; else u++; if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) nan++; }
      return { t: G ? G.t : -1, over: G ? G.over : true, units: u, blds: b, nan, ms: performance.now() - ms0,
        perTeam: G ? G.teams.filter(T => !T.reb).map(T => ents.filter(e => e.team === T.id).length) : [] };
    }, Math.min(CH, steps - done));
    if (!last.err) peak = last.perTeam.map((n, i) => Math.max(n, peak[i] || 0));
    if (last.err) { fails.push('simulation threw: ' + last.err.split('\n').slice(0, 4).join(' | ')); break; }
    if (last.nan) fails.push(`${last.nan} entities have NaN positions at t=${last.t.toFixed(0)}s`);
    if (last.over) { console.log(`battle ended at t=${last.t.toFixed(0)}s`); break; }
  }
  if (last && !last.err) {
    console.log(`after ${(last.t / 60).toFixed(1)} game-min: ${last.units} units, ${last.blds} structures, per team ${last.perTeam.join('/')} (peak ${peak.join('/')}), last chunk ${last.ms.toFixed(0)} ms`);
    if (last.units < 4 && !last.over) fails.push(`battlefield nearly empty after ${(last.t / 60).toFixed(1)} min (${last.units} units) — AI or production broken`);
    if (last.perTeam.some(n => n === 0) && !last.over) warns.push('a team has no entities left');
    if (peak.some(n => n < 6)) fails.push(`a side never built up (peak entities per team ${peak.join('/')}) — AI build order or production broken`);
  }
  if (process.env.DN_SHOW) { // DN_SHOW=1: fire an illumination flare over our units, rank some up, pin one (screenshots for orch/shots/night)
    await page.evaluate(() => { const T = G.teams[0]; const us = G.ents.filter(e => !e.dead && !e.isB && e.team === 0 && e.s.cls === 'inf');
      const c = us[0] || G.ents.find(e => e.team === 0 && !e.isB); if (!c) return; T.pw.flare = { cd: 0, lv: 1 }; usePower0(0, 'flare', c.x, c.y);
      us.slice(0, 6).forEach((e, i) => { e.rank = (i % 3) + 1; FXE('rank', [e.id, e.rank, e.x | 0, e.y | 0]); }); if (us[1]) us[1].supp = 1; if (us[3]) us[3].supp = 1; if (us[5]) us[5].supp = 1;
      try { centerOn(c.x, c.y, true); } catch (e) {} });
    await page.waitForTimeout(3000);
    await page.evaluate(() => { try { renderFrame(0.016); } catch (e) {} });
    await shot(page, 'night-flare.png');
  }
  await page.evaluate(() => { try { renderFrame(0.016); } catch (e) {} });
  await page.waitForTimeout(1500);
  await shot(page, 'battle-later.png');
} catch (e) {
  fails.push(String(e && e.message || e));
  try { await RUN.save(page, PFX + 'failure.png'); } catch {}
}
if (ART) { const j = judgeRoomStats('artifact', await page.evaluate(() => window.__fpStats).catch(() => null)); fails.push(...j.fails); warns.push(...j.warns); }
await browser.close();
server.close();

{ const mb = peakMB(); if (mb) console.log(`peak memory (node + browser, summed RSS): ${mb} MB`); }
for (const w of [...new Set(warns)].slice(0, 15)) console.log('  warn: ' + w);
const uniq = [...new Set(fails)];
if (uniq.length) {
  console.log(`\nSMOKE FAIL (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  for (const f of uniq.slice(0, 25)) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`\nSMOKE PASS${ART ? ' (artifact edition)' : ''} (${((Date.now() - t0) / 1000).toFixed(0)}s) — screenshots in orch/out/${PFX}*.png (this run: ${RUN.rel}/)`);
