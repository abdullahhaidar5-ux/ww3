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
//                                  # first): Three.js "from cdnjs", room capability stubbed, screenshots art-*.png
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
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => warns.push('3D models still loading after 180s'));
  { const m = await page.evaluate(() => ({ n: Object.keys(MODELS.proto).length, of: typeof MODEL_FILES === 'object' ? Object.keys(MODEL_FILES).length : 0,
      ready: MODELS.ready, err: MODELS.err || '', t: Math.round(performance.now()) }));
    console.log(`3D models: ${m.n} of ${m.of} ready=${m.ready} ${m.err} (page open to models ready: ${(m.t / 1000).toFixed(1)}s)`);
    // the artifact edition gets its models in a different published form: every one of them must arrive
    if (ART && (!m.ready || m.n < m.of)) fails.push(`artifact: only ${m.n} of ${m.of} 3D models loaded ${m.err} (players would see simple shapes)`);
    else if (!m.ready) warns.push('3D models did not load: ' + m.err); }
  await shot(page, 'menu.png');
  if (ART) { // the artifact edition must use the room capability, with no PeerJS / online-edition shim left in it
    const a = await page.evaluate(async () => { for (let i = 0; i < 40 && !NET.room; i++) await new Promise(r => setTimeout(r, 250));
      return { room: !!NET.room, peer: typeof Peer, p2p: !!window.WW3_P2P, three: THREE.REVISION, host: !document.getElementById('host').disabled }; });
    console.log(`artifact edition: room ${a.room}, three r${a.three}, PeerJS ${a.peer}, P2P shim ${a.p2p}`);
    if (!a.room || !a.host) fails.push('artifact: the game did not pick up the room capability (multiplayer would be off)');
    if (a.peer !== 'undefined' || a.p2p) fails.push('artifact: PeerJS / online-edition shim is still in the artifact page');
    if (a.three !== '128') fails.push('artifact: Three.js is r' + a.three + ', expected r128');
  }

  // Start a skirmish against the AI the same way the Deploy button does, with the requested number of players.
  const start = await page.evaluate((n) => {
    try {
      if (typeof setup === 'object' && setup) setup.n = n - 1; // number of AI opponents
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
        perTeam: G ? G.teams.map(T => ents.filter(e => e.team === T.id).length) : [] };
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
