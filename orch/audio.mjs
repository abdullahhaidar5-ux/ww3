// Audio test: the shared soundtrack (src/09-audio.js, mus/st/). Serves the repo locally, opens the game in headless
// Chromium with the browser's normal autoplay rules, and checks, the way a player would hear it:
//   1. nothing plays (or downloads) before the first tap; after a tap a menu track starts and really plays
//   2. a battle (player = US) crossfades to a calm track and plays the US anthem with the soundtrack ducked
//   3. calm -> combat: while the fighting runs hot the mood holds for the dwell time, then switches to a combat track
//      (the dwell is lowered from 60 s to 6 s here so the test stays short), with a crossfade that leaves one deck
//   4. music off stops the stream; music on brings it back
//   5. victory plays the victory track + anthem; a second battle's defeat plays the defeat track
//   6. no audio errors (AU.err, media element errors, console errors), and the only music files downloaded are the
//      tracks that actually played plus the anthem (no old sample sheets, no track fetched ahead of time)
//
//   node orch/audio.mjs            node orch/audio.mjs --no-lock
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  return undefined;
}
await acquireBrowserLock();

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const musReq = [];   // every music file the page asked for, in order
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  if (p.startsWith('/mus/')) musReq.push(p.slice(1));
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(f).size, type = MIME[path.extname(f)] || 'application/octet-stream';
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  if (m) { // media elements stream with range requests, like GitHub Pages / Cloudflare serve them
    const a = +m[1], b = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${size}`, 'content-length': b - a + 1 });
    return fs.createReadStream(f, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const fails = [], notes = [];
const ok = (c, msg) => { if (!c) fails.push(msg); return c; };
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const bctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await guardContext(bctx);
const page = await bctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
page.on('pageerror', e => fails.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/net::ERR_FAILED|peer|PeerJS|WebSocket|ICE|speechSynthesis/i.test(t) && !/mus\//.test(t)) return; // offline / other hosts
  fails.push('console error: ' + t.slice(0, 300));
});
const sleep = ms => page.waitForTimeout(ms);
const st = () => page.evaluate(() => ({ scene: ST.scene, mood: ST.mood, id: ST.cur && ST.cur.id, paused: ST.cur ? ST.cur.el.paused : null,
  t: ST.cur ? ST.cur.el.currentTime : 0, heat: AU.heat, err: AU.err || '', log: ST.log.slice(), an: AU.an ? AU.an.fac : null,
  decks: ST.decks.map(d => ({ id: d.id, src: d.el.getAttribute('src') || '', paused: d.el.paused, gain: d.g ? +d.g.gain.value.toFixed(2) : null, merr: d.el.error ? d.el.error.code : 0 })),
  bus: ST.bus ? +ST.bus.gain.value.toFixed(2) : null, ctx: AU.ctx ? AU.ctx.state : 'none', since: performance.now() / 1000 - ST.moodT }));
const pool = id => (id || '').split('-')[0];
async function waitFor(fn, arg, ms, what) {
  try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 250 }); return true; } catch { fails.push('timed out: ' + what); return false; }
}
async function battle(n) { // a skirmish vs AI with the player as the US, run by the AI, like smoke.mjs
  const r = await page.evaluate((n) => { try { setup.p = 'US'; setup.n = n - 1; initAudio(); startSingle();
      if (G && G.teams[0] && !G.teams[0].ai && typeof mkAI === 'function') G.teams[0].ai = mkAI(1); return { ok: !!G, facs: G.teams.map(t => t.fac) }; }
    catch (e) { return { ok: false, err: String(e && e.stack || e) }; } }, n);
  if (!r.ok) throw new Error('battle failed to start: ' + r.err);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 });
  return r.facs;
}
// run the simulation in short bursts with the camera on the fighting (as a player watching the battle)
async function fight(seconds, until) {
  const t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    const r = await page.evaluate(() => { for (let i = 0; i < 90 && G && !G.over; i++) simUpdate(1 / 60);
      const f = G.ents.filter(e => !e.dead && !e.isB && e.target && !e.target.dead);
      if (f.length) { const e = f[(Math.random() * f.length) | 0]; cam.x = e.x; cam.y = e.y; }
      return { over: G.over, fighting: f.length, heat: AU.heat, mood: ST.mood, t: G.t }; });
    if (r.over || (until && await page.evaluate(until))) return r;
    await sleep(120);
  }
  return null;
}

const t0 = Date.now();
try {
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof ST === 'object', null, { timeout: 60000 });
  await sleep(2000);
  // 1. menu: silent until a tap, then a menu track plays
  let s = await st();
  ok(!s.id && !musReq.length, `music started before any tap (track ${s.id}, requests ${musReq.join(',')})`);
  await page.mouse.click(640, 30);
  await waitFor(() => ST.cur && ST.cur.id && !ST.cur.el.paused && ST.cur.el.currentTime > 1, null, 20000, 'menu track playing after a tap');
  s = await st();
  ok(s.scene === 'menu' && pool(s.id) === 'menu', `after a tap: scene ${s.scene}, track ${s.id} (want a menu track)`);
  notes.push(`menu: ${s.id} playing at ${s.t.toFixed(1)}s, engine ${s.ctx}`);

  // 2. battle: calm track + anthem, soundtrack ducked under the anthem
  const facs = await battle(2);
  await waitFor(() => ST.scene === 'battle' && ST.cur && /^calm-/.test(ST.cur.id) && !ST.cur.el.paused && ST.cur.el.currentTime > .5, null, 20000, 'calm track playing in battle');
  await waitFor(() => ST.log.includes('anthem:US'), null, 15000, 'US anthem at battle start');
  await sleep(1500);
  s = await st();
  ok(s.mood === 'calm' && pool(s.id) === 'calm', `battle start: mood ${s.mood}, track ${s.id}`);
  ok(s.an === 'US' && s.bus !== null && s.bus < .6, `anthem playing with the soundtrack ducked (anthem ${s.an}, soundtrack bus ${s.bus})`);
  notes.push(`battle ${facs.join(' vs ')}: ${s.id}, anthem ${s.an}, soundtrack ducked to ${s.bus}`);
  await sleep(4500); // the menu track's crossfade has finished: one deck left streaming
  s = await st();
  ok(s.decks.filter(d => d.src).length === 1, `after the crossfade ${s.decks.filter(d => d.src).length} decks still have a file`);

  // 3. calm -> combat: hot fighting holds calm for the dwell, then switches
  let r = await fight(240, () => AU.heat > .35);
  ok(r && r.heat > .35, `the fighting never heated up (heat ${r && r.heat.toFixed(2)})`);
  s = await st();
  if (s.since < 58) ok(s.mood === 'calm', `switched to ${s.mood} before the 60 s dwell (heat ${s.heat.toFixed(2)}, ${s.since.toFixed(0)} s in calm)`);
  notes.push(`fighting hot at game time ${r && r.t.toFixed(0)}s, heat ${s.heat.toFixed(2)}, still ${s.mood} (60 s dwell)`);
  await page.evaluate(() => { ST.dwell = 6; ST.moodT = performance.now() / 1000; });
  r = await fight(120, () => ST.mood === 'combat');
  s = await st();
  ok(s.mood === 'combat' && pool(s.id) === 'combat', `no switch to combat after the dwell (mood ${s.mood}, track ${s.id}, heat ${s.heat.toFixed(2)})`);
  await waitFor(() => ST.cur && /^combat-/.test(ST.cur.id) && !ST.cur.el.paused && ST.cur.el.currentTime > 1, null, 20000, 'combat track playing');
  await sleep(4500);
  s = await st();
  ok(s.decks.filter(d => d.src).length === 1, `after the calm->combat crossfade ${s.decks.filter(d => d.src).length} decks still have a file`);
  notes.push(`combat: ${s.id}`);

  // 4. music off stops the stream, on brings it back
  await page.evaluate(() => { AU.musicOn = false; applyAudio(); });
  await waitFor(() => ST.decks.every(d => !d.el.getAttribute('src')), null, 5000, 'music off stops every track');
  await page.evaluate(() => { AU.musicOn = true; applyAudio(); });
  await waitFor(() => ST.cur && ST.cur.id && !ST.cur.el.paused && ST.cur.el.currentTime > .5, null, 15000, 'music back on plays again');

  // 5. victory, then a second battle lost
  await page.evaluate(() => endGame(ME, 'audio test'));
  await waitFor(() => ST.scene === 'victory' && ST.cur && ST.cur.id === 'victory-01' && !ST.cur.el.paused && ST.cur.el.currentTime > .5, null, 20000, 'victory track playing');
  await waitFor(() => ST.log.filter(x => x === 'anthem:US').length >= 2, null, 15000, 'US anthem on victory');
  notes.push('victory: victory-01 + anthem');
  await page.evaluate(() => quitGame());
  await sleep(1000);
  await battle(2);
  await waitFor(() => ST.scene === 'battle' && ST.cur && /^calm-/.test(ST.cur.id), null, 20000, 'second battle calm track');
  await page.evaluate(() => endGame(G.teams.find(t => !ally(t.id, ME)).id, 'audio test'));
  await waitFor(() => ST.scene === 'defeat' && ST.cur && ST.cur.id === 'defeat-02' && !ST.cur.el.paused && ST.cur.el.currentTime > .5, null, 20000, 'defeat track playing');
  notes.push('defeat: defeat-02');
  await sleep(1500);

  // 6. errors and downloads
  s = await st();
  ok(!s.err, 'audio error reported: ' + s.err);
  ok(s.decks.every(d => !d.merr), 'media element error: ' + JSON.stringify(s.decks));
  const played = new Set(s.log.filter(x => !x.startsWith('anthem:')).map(x => 'mus/st/' + x.split(':')[1] + '.mp3'));
  const got = new Set(musReq);
  const extra = [...got].filter(f => !played.has(f) && f !== 'mus/an_US.mp3');
  ok(!extra.length, 'downloaded music that never played: ' + extra.join(', '));
  ok(got.has('mus/an_US.mp3'), 'anthem file not downloaded');
  const mb = [...got].reduce((a, f) => a + fs.statSync(path.join(ROOT, f)).size, 0) / 1e6;
  notes.push(`music files fetched: ${[...got].join(', ')} (${mb.toFixed(1)} MB) — order: ${s.log.join(' > ')}`);
} catch (e) {
  fails.push(String(e && e.stack || e).split('\n').slice(0, 3).join(' | '));
}
await browser.close();
server.close();
for (const n of notes) console.log('  ' + n);
if (fails.length) {
  console.log(`\nAUDIO FAIL (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  for (const f of [...new Set(fails)].slice(0, 25)) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`\nAUDIO PASS (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
