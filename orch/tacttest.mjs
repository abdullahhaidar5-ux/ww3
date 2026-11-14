//
//
//
//
//
//
//
//
//
//
//
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock, watchPeakMemory } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
import { artifactHtml, artifactHandler, threeJs, THREE_CDN, roomStub, roomTopics, judgeRoomStats } from './artifact-harness.mjs';
import { newRun } from './runs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const MINUTES = arg('minutes', 1), PLAYERS = Math.max(2, Math.min(8, arg('players', 2)));
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

//
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
//
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
//
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
const RUN = newRun("tactics");
const t0 = Date.now();
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => warns.push('3D models still loading after 180s'));
  { const m = await page.evaluate(() => ({ n: Object.keys(MODELS.proto).length, of: typeof MODEL_FILES === 'object' ? Object.keys(MODEL_FILES).length : 0,
      ready: MODELS.ready, err: MODELS.err || '', t: Math.round(performance.now()) }));
    console.log(`3D models: ${m.n} of ${m.of} ready=${m.ready} ${m.err} (page open to models ready: ${(m.t / 1000).toFixed(1)}s)`);
    if (!m.ready) warns.push('3D models did not load at the menu: ' + m.err); }
  await shot(page, 'menu.png');
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
      return { ok: !!G, n: G && G.teams.length, facs: G && G.teams.map(t => t.fac), map: G && G.mapKey };
    } catch (e) { return { ok: false, err: String(e && e.stack || e) }; }
  }, PLAYERS);
  if (!start.ok) throw new Error('skirmish failed to start: ' + (start.err || 'G is null'));
  console.log(`battle: ${start.n} players ${start.facs.join(' vs ')} on ${start.map}`);
  // the battle starts behind a loading screen (ground, 3D world and shaders are prepared in steps, with the battle
  // clock held); wait for it to finish before checking that the clock runs
  const tLoad = Date.now();
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('loading screen did not finish within 10 minutes'));
  console.log(`loading screen finished after ${((Date.now() - tLoad) / 1000).toFixed(1)}s`);
  // every model this battle's nations need must have arrived (in the artifact edition they come in a different published form)
  { const m = await page.evaluate(() => { const ks = typeof modelKeysFor === 'function' ? modelKeysFor(G.teams.map(T => T.fac)) : Object.keys(MODEL_FILES);
      return { of: ks.length, miss: ks.filter(k => !MODELS.proto[k]), err: MODELS.err || '' }; });
    console.log(`3D models for this battle: ${m.of - m.miss.length} of ${m.of}`);
    if (m.miss.length) fails.push(`${ART ? 'artifact: ' : ''}${m.miss.length} of ${m.of} 3D models for this battle missing (${m.miss.slice(0, 5).join(', ')}) ${m.err} (players would see simple shapes)`); }

  // ---- tactics: digging in + vehicle criticals (orch/tacttest.mjs) ----
  const ck = (name, ok, detail) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : '  ' + (detail || '')}`); if (!ok) fails.push('tactics: ' + name + ' ' + (detail || '')); };
  await page.evaluate(() => { G.paused = true; for (const T of G.teams) T.ai = T.ai && T.id !== ME ? T.ai : null; });
  const R = await page.evaluate(() => {
    const out = {}, T = G.teams[ME], en = G.teams.find(Q => Q.id !== ME), hq = G.ents.find(b => b.team === ME && b.kind === 'hq');
    const clear = (x, y) => passXY('ground', x, y) && !G.ents.some(e => !e.dead && Math.hypot(e.x - x, e.y - y) < (e.isB ? e.size / 2 + 60 : 90));
    let C = null;
    for (let r = 260; r < 1400 && !C; r += 40) for (let a = 0; a < 6.28 && !C; a += .3) { const x = hq.x + Math.cos(a) * r, y = hq.y + Math.sin(a) * r;
      let ok = x > 300 && y > 300 && x < MAPW - 300 && y < MAPH - 300; for (let dx = -240; dx <= 240 && ok; dx += 40) for (let dy = -200; dy <= 200 && ok; dy += 40) if (!clear(x + dx, y + dy)) ok = false; if (ok) C = { x, y }; }
    if (!C) C = { x: hq.x + 500, y: hq.y };
    out.C = C; T.credits = 5000; const inf = roster(T.fac).barracks[0], tk = roster(T.fac).factory.find(k => stats(T.fac, k).cls === 'tank') || 'tank';
    // 1. foxholes
    const soldiers = [0, 1, 2, 3, 4, 5].map(i => addUnit(ME, inf, C.x - 120 + (i % 3) * 22, C.y - 60 + Math.floor(i / 3) * 24));
    for (const u of soldiers) { u.vis = true; u.hid = false; }
    act(ME, { t: 'dig', ids: soldiers.map(u => u.id) }); const t0 = G.t;
    for (let i = 0; i < 70; i++) simUpdate(.1);
    out.fox = (G.dug || []).filter(d => d.k === 'hole').length; out.inside = G.civ.filter(c => c.dug && !c.dead).reduce((n, c) => n + c.occ.length, 0);   // Dig in = a dugout with the squad inside (orch/dugouttest.mjs has the full check)
    // 2. a Construction Vehicle lays a sandbag line and a trench
    const dz = addUnit(ME, 'dozer', C.x + 60, C.y + 60); dz.vis = true; const cr0 = T.credits;
    act(ME, { t: 'wall', ids: [dz.id], k: 'sand', x: C.x + 20, y: C.y - 40, x2: C.x + 120, y2: C.y - 40 });
    for (let i = 0; i < 1500 && dz.order; i++) simUpdate(.1);
    out.sand = (G.dug || []).filter(d => d.k === 'sand').length; out.paid = Math.round(cr0 - T.credits);
    act(ME, { t: 'wall', ids: [dz.id], k: 'trench', x: C.x + 20, y: C.y + 10, x2: C.x + 100, y2: C.y + 10 });
    for (let i = 0; i < 1500 && dz.order; i++) simUpdate(.1);
    out.trench = (G.dug || []).filter(d => d.k === 'trench').length;
    // 3. vehicles slow down over sandbags and shells wreck them
    const veh = addUnit(ME, tk, C.x + 30, C.y - 40); veh.vis = true; veh.v = 20; dugVeh(veh); out.slow = veh.dgS;
    const n0 = G.dugN; dugBlast(C.x + 70, C.y - 40, 60, 400, 'shell'); out.blast = n0 - G.dugN;
    // 4. net packing round trip
    const pk = dgPack(T); out.pk = pk ? pk.dg.length : -1; const keep = G.dugN, kv = G.dug.slice(); dgApply(pk.dg); out.rt = G.dugN === keep && G.dug[0].k === kv[0].k; G.dug = kv; G.dugN = keep;
    // 5. vehicle criticals: rear hits crack vehicles far more often than frontal ones
    const att = addUnit(en.id, roster(en.fac).factory.find(k => stats(en.fac, k).cls === 'tank') || 'tank', C.x, C.y - 200); att.vis = true; att.max = att.hp = 1e9;
    const trial = (ang) => { let n = 0; for (let i = 0; i < 160; i++) { const t = addUnit(ME, tk, C.x - 300 + (i % 10) * 3, C.y + 300); t.max = t.hp = 700; t.hd = t.ang = 0; t.vis = true;
        att.x = t.x + Math.cos(ang) * 150; att.y = t.y + Math.sin(ang) * 150; for (let h = 0; h < 4; h++) { G.t += .05; t.hp = 700; t.critT = -9; applyDmg(t, 90, 'cannon', en.id, att, 0); } if (t.crit) n++; t.dead = true; G.byId.delete(t.id); } return n; };
    out.front = trial(0); out.rear = trial(Math.PI);
    // 6. the criticals do what they say: immobile / fire damage / jammed turret / bail-out / re-crew / field repair
    const tk1 = addUnit(ME, tk, C.x + 160, C.y + 150); tk1.vis = true; tk1.dpP = -1e9; dz.x = 60; dz.y = 60; dz.order = null; dz.dead = false; tk1.crit = 1; setMove(tk1, C.x + 400, C.y + 150, 'move'); const x0 = tk1.x; for (let i = 0; i < 40; i++) simUpdate(.1); out.stuck = Math.round(Math.hypot(tk1.x - x0, 0));
    tk1.crit = 5; tk1.fireT = G.t + 8; tk1.hp = tk1.max; for (let i = 0; i < 40; i++) simUpdate(.1); out.burn = Math.round((1 - tk1.hp / tk1.max) * 100);
    out.cb = tk1.crit; const e2 = encEnt(tk1, false); out.enc = e2[10] >> 7;
    tk1.crit = 3; tk1.hp = tk1.max; tk1.fireT = 0; out.jamRof = rofMult(tk1) > 1.5;
    tk1.crit = 1; tk1.hp = tk1.max * .15; for (let i = 0; i < 3; i++) simUpdate(.1); out.bailed = !!tk1.aband; out.crewN = G.ents.filter(e => e.crew && e.team === ME && !e.dead).length;
    const crewman = addUnit(ME, inf, tk1.x + tk1.r + 12, tk1.y); crewman.vis = true;
    for (let i = 0; i < 80; i++) simUpdate(.1); out.recrew = !tk1.aband && tk1.team === ME; out.hpBack = Math.round(tk1.hp / tk1.max * 100);
    tk1.crit = 7; tk1.fireT = G.t + 2; dz.x = tk1.x - 40; dz.y = tk1.y; dz.order = null; tk1.dpP = -1e9; for (let i = 0; i < 300; i++) simUpdate(.1); out.fixed = !tk1.crit;
    for (const u of G.ents) if (u.team === ME && !u.isB) u.hid = false;
    out.sx = C.x; out.sy = C.y; out.tk1 = tk1.id; out.tk = tk; out.inf = inf;
    return out;
  });
  console.log(JSON.stringify(R));
  ck('six soldiers dig in as one dugout and go inside', R.fox === 1 && R.inside === 6, R.fox + ' dugout, ' + R.inside + ' inside');
  ck('Construction Vehicle lays sandbags and pays for them', R.sand >= 3, R.sand + ' ' + R.paid); ck('trench segments appear', R.trench >= 2, R.trench);
  ck('vehicles slow down over sandbags', R.slow === .5, R.slow); ck('a shell destroys sandbags', R.blast > 0, R.blast);
  ck('fortification list packs and unpacks for clients', R.pk > 0 && R.rt, R.pk);
  ck('side/rear hits cripple vehicles far more than front hits', R.rear > R.front * 2 && R.rear >= 10, R.front + ' vs ' + R.rear);
  ck('a knocked-out track immobilises the vehicle', R.stuck < 3, R.stuck); ck('engine fire burns it', R.burn >= 2 && R.burn < 40, R.burn); ck('crit bits reach clients', R.enc === 5, R.enc);
  ck('jammed turret slows the rate of fire', R.jamRof); ck('crew bails out below 20% health', R.bailed && R.crewN >= 1, R.bailed + ' ' + R.crewN);
  ck('infantry re-crew the hulk', R.recrew && R.hpBack >= 25, R.hpBack); ck('a Construction Vehicle repairs the criticals', R.fixed);
  // pictures: a dugout, a trench + sandbag line, a crippled burning tank with the track behind it
  await page.evaluate(([cx, cy]) => { const s = G.ents.filter(e => !e.isB && e.team === ME && !e.dead && isInf(e.s) && !e.crew); const hs = (G.dug || []).filter(d => d.k === 'fox'); s.slice(0, hs.length).forEach((u, i) => { u.x = hs[i].x; u.y = hs[i].y; u.mv = -9; u.order = null; u.target = null; u.hid = false; u.hp = u.max; }); }, [R.sx, R.sy]);
  const shotAt = async (name, dx, dy, dist) => { await page.evaluate(([x, y, d]) => { camTarget(); cam.td = cam.dist = d; centerOn(x, y, true); for (let i = 0; i < 3; i++) renderFrame(.016); }, [R.sx + dx, R.sy + dy, dist]);
    await page.waitForTimeout(600); await page.evaluate(() => { renderFrame(.016); tactFxTick(.5); renderFrame(.016); }); await shot(page, 'tactics-' + name + '.png'); };
  await page.evaluate(() => { const T = G.teams[ME]; const tk = G.ents.find(e => e.crit === undefined && false); });
  await page.evaluate(([id, x, y]) => { const t = G.byId.get(id); t.aband = 0; t.crit = 5; t.hp = t.max * .5; t.fireT = G.t + 99; t.x = x; t.y = y; t.hd = t.ang = 0; t.mv = -9; }, [R.tk1, R.sx + 200, R.sy + 90]);
  const want = (process.env.SHOTS || 'foxholes').split(','); const S = async (n, dx, dy, d) => { if (want.includes(n)) await shotAt(n, dx, dy, d); };
  await S('foxholes', -100, -45, 170); await S('lines', 70, -15, 190); await S('tank', 200, 90, 160);
  await page.evaluate(() => { G.sel = [G.ents.find(e => e.crit && !e.isB && e.team === ME)].filter(Boolean); updateUI(); });
  await S('tank-selected', 200, 90, 160);
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(500);
  await page.evaluate(() => { const soldiers = G.ents.filter(e => !e.isB && e.team === ME && isInf(e.s) && !e.dead && !e.crew).slice(0, 4); G.sel = soldiers; window.__ph = soldiers.length ? { x: soldiers.reduce((a, e) => a + e.x, 0) / soldiers.length, y: soldiers.reduce((a, e) => a + e.y, 0) / soldiers.length } : null; updateUI(); });
  if (want.includes('phone')) { const q = await page.evaluate(() => window.__ph); if (q) await shotAt('phone', q.x - R.sx + 25, q.y - R.sy + 22, 150); }
  await page.evaluate(() => { G.sel = [G.ents.find(e => e.kind === 'dozer' && e.team === ME)]; updateUI(); }); await S('phone-dozer', 70, -15, 220);
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
  console.log(`\nTACTICS FAIL (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  for (const f of uniq.slice(0, 25)) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`\nTACTICS PASS${ART ? ' (artifact edition)' : ''} (${((Date.now() - t0) / 1000).toFixed(0)}s) — screenshots in orch/out/${PFX}*.png (this run: ${RUN.rel}/)`);
