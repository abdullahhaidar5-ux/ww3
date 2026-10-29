// Audio test (cigate "audio" job): the shared soundtrack (src/09-audio.js "Shared soundtrack", files in mus/st/).
// Boots the game in Chromium with the browser's normal autoplay rules, taps the menu, starts a US skirmish and checks:
//   0) nothing plays before the first tap; after a real tap a menu track plays and is audible
//   a) the anthem then a calm track play in battle; the old generated score and its sample sheets are gone (never fetched)
//   b) fighting (AU.heat high) switches to a combat track with a crossfade
//   c) the dwell rule: combat holds for its 60 s even when the fighting stops, then goes back to calm
//   d) victory plays the victory track, then the anthem, then the menu pool; a second battle's defeat plays the defeat track
//   e) the nation's anthem (mus/an_US.mp3) is fetched at battle start
//   f) tracks stream one at a time, and the only music files downloaded are the ones that played (plus the anthem)
//   g) if the soundtrack can't load, the music rests without errors breaking anything, and comes back once it can
//   i) recorded battle sounds (sfx/): nothing fetched before a battle sound is needed; the sprite sheet then loads and
//      shots/explosions play from it; loops (wind/rumble/engines) load only when wanted; a voice ducks music+effects;
//      the number of simultaneous recorded sounds stays capped; every sfx file is fetched at most once
//   h) no page errors and no audio errors (AU.err, console)
// Time-based waits (dwell, retry) are shortened by moving start times back, so the logic is tested, not the clock.
//   node orch/audio.mjs            # prints AUDIO PASS / FAIL
//   node orch/audio.mjs --no-lock  # skip the machine-wide browser lock
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
  throw new Error('playwright not found');
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
if (!process.argv.includes('--no-lock')) await acquireBrowserLock();

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  // byte ranges, like GitHub Pages / Cloudflare (audio elements seek with them)
  const type = MIME[path.extname(f)] || 'application/octet-stream', size = fs.statSync(f).size, m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const a = m[1] ? +m[1] : size - +m[2], b = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${size}`, 'content-length': b - a + 1 });
    return fs.createReadStream(f, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const bctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
await guardContext(bctx);
const page = await bctx.newPage();
let blockST = false;
await page.route('**/*', r => {
  const u = r.request().url();
  if (!u.startsWith(BASE)) return r.abort();
  if (blockST && u.includes('/mus/st/')) return r.abort();
  return r.continue();
});
const reqs = [];
page.on('request', q => { const u = new URL(q.url()); if (u.pathname.startsWith('/mus/')) reqs.push(u.pathname.slice(1)); });
const sreqs = [];
page.on('request', q => { const u = new URL(q.url()); if (u.pathname.startsWith('/sfx/')) sreqs.push(u.pathname.slice(1)); });
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
let blockLog = false;
page.on('console', q => {
  if (q.type() !== 'error') return;
  const t = q.text();
  if (blockLog && /mus\/st\/|ERR_FAILED/.test(t)) return;  // the requests test g) blocks on purpose
  if (/audio|music|sound|mus\/|anthem|AudioContext|media/i.test(t)) errs.push('console audio error: ' + t.slice(0, 300));
});

const res = [], fails = [];
const ok = (name, cond, info) => { res.push(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); if (!cond) fails.push(name); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const state = () => page.evaluate(() => {
  const d = ST.decks[ST.cur], ds = ST.decks.map(x => ({ id: x.id, on: x.on, started: x.started, paused: x.el.paused, t: +x.el.currentTime.toFixed(2), g: +x.g.gain.value.toFixed(3) }));
  return { mode: ST.mode, pool: ST.pool, id: ST.id, fail: ST.fail, an: !!ST.an, anWait: !!ST.anWait, heat: AU.heat, 
    playing: !!(d && d.on && d.started && !d.el.paused && d.el.currentTime > 0), decks: ds, req: ST.req.slice(), err: AU.err || '', ctx: AU.ctx && AU.ctx.state };
});
async function until(fn, ms, step = 250) { const t = Date.now(); let s; while (Date.now() - t < ms) { s = await state(); if (fn(s)) return s; await sleep(step); } return null; }
// RMS of the music bus over ~1.5 s (0 = silence)
const level = () => page.evaluate(async () => {
  const c = AU.ctx, a = c.createAnalyser(); a.fftSize = 2048; AU.musBus.connect(a); const buf = new Float32Array(a.fftSize); let s = 0, n = 0;
  for (let i = 0; i < 15; i++) { await new Promise(r => setTimeout(r, 100)); a.getFloatTimeDomainData(buf); for (const v of buf) { s += v * v; n++; } }
  AU.musBus.disconnect(a); return Math.sqrt(s / n);
});

try {
  await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof ST === 'object', null, { timeout: 60000 });
  await page.evaluate(() => { try { localStorage.removeItem('ww3_sndtrk'); } catch (e) {} });
  await page.evaluate(() => { setup.p = 'US'; setup.a = 'RU'; setup.n = 1; });
  await sleep(2000);
  ok('0) nothing plays or downloads before the first tap', !reqs.some(r => r.startsWith('mus/')) && !(await state()).playing, reqs.join(','));
  await page.mouse.click(640, 30);  // a real tap on the menu: unlocks sound like a player's first touch
  let s = await until(s => s.mode === 'menu' && s.playing, 20000);
  ok('0) menu: a menu track plays after a tap', !!s && /^menu-/.test(s.id), s ? s.id : JSON.stringify(await state()));
  await sleep(3000);
  const L = {};
  if (s) ok('0) menu: music bus is not silent', (L.menu = await level()) > 0.002);

  ok('i) menu: no battle sound files downloaded yet', sreqs.length === 0, sreqs.join(','));
  // battle start
  await page.evaluate(() => { startSingle(); if (G && G.teams[0]) G.teams[0].ai = mkAI(1); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
  console.log('battle loaded:', await page.evaluate(() => G.teams.map(t => t.fac).join(' vs ')));
  s = await until(s => s.an || s.anWait, 15000);
  ok('e) anthem requested at battle start (US)', reqs.includes('mus/an_US.mp3'), reqs.filter(r => r.includes('an_')).join(','));
  s = await until(s => s.an, 15000);
  ok('e) anthem plays', !!s);
  // the battle itself may heat up; keep it cool until calm has started so the calm check is deterministic
  await page.evaluate(() => { window.__cool = setInterval(() => { AU.heat = 0; }, 100); });
  s = await until(s => s.mode === 'battle' && s.pool === 'calm' && s.playing && !s.an, 60000);
  ok('a) a calm track plays after the anthem', !!s && /^calm-/.test(s.id), s ? s.id : JSON.stringify(await state()));
  if (s) { await sleep(3000); ok('a) calm is audible on the music bus', (L.calm = await level()) > 0.002); }
  const bad = reqs.filter(r => /mus\/(smp|me|as|we)\.mp3/.test(r));
  ok('a) old sample sheets not fetched (smp/me/as/we)', bad.length === 0, bad.join(','));
  ok('a) old generated score is gone', await page.evaluate(() => typeof STYLES === 'undefined' && typeof musicTick === 'undefined'));
  const stNow = [...new Set(reqs.filter(r => r.startsWith('mus/st/')))];
  ok('f) only the menu + calm files fetched so far (streaming)', stNow.length <= 2, stNow.join(', '));

  // fighting: heat high -> combat (calm dwell is 30 s; move the pool's start back instead of waiting)
  await page.evaluate(() => { clearInterval(window.__cool); window.__hot = setInterval(() => { AU.heat = 1; }, 100); ST.since -= 31000; });
  s = await until(s => s.pool === 'combat', 3000);
  ok('b) heat high switches to the combat pool', !!s && /^combat-/.test(s.id), s && s.id);
  s = await until(s => s.pool === 'combat' && s.playing && s.decks.every(d => d.id === s.id || !d.on), 10000);
  await sleep(3600);
  s = await state();
  const old = s.decks.find(d => d.id !== s.id);
  L.combat = await level();
  ok('b) crossfade done: combat deck up, calm deck faded and paused', s.playing && (!old || (!old.on && old.paused && old.g < 0.01)), JSON.stringify(s.decks));

  // dwell: fighting stops; combat must hold for 60 s
  await page.evaluate(() => { clearInterval(window.__hot); window.__cool = setInterval(() => { AU.heat = 0; }, 100); });
  await sleep(6000);
  s = await state();
  ok('c) combat holds while its 60 s dwell runs (heat 0)', s.pool === 'combat', s.pool);
  await page.evaluate(() => { ST.since -= 60000; });
  s = await until(s => s.pool === 'calm', 3000);
  ok('c) after the dwell, back to calm', !!s);
  await page.evaluate(() => { clearInterval(window.__cool); window.__hot = setInterval(() => { AU.heat = 1; }, 100); });
  await sleep(4000);
  s = await state();
  ok('c) no ping-pong: calm holds for its dwell even with heat high', s.pool === 'calm', s.pool);
  await page.evaluate(() => { clearInterval(window.__hot); });
  const st2 = ST_REQ_CHECK(reqs, s.req);
  ok('f) no soundtrack file fetched that the player did not play', st2.length === 0, st2.join(', '));

  // recorded battle sounds (sfx/)
  await page.evaluate(() => { cam.x = G.teams[ME].base ? G.teams[ME].base.x : cam.x; sfxBoom(cam.x, cam.y, 40, true); sfxShot(cam.x, cam.y, 3); });
  const sfxOk = await page.waitForFunction(() => SFX.st === 'ok', null, { timeout: 20000 }).then(() => true, () => false);
  ok('i) the sound sprite sheet loads and decodes', sfxOk && await page.evaluate(() => SFX.buf.duration > 20 && Object.keys(SFX.man.clips).length === 6), JSON.stringify(sreqs));
  const played = await page.evaluate(async () => {
    let n = 0; const real = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () { if (this.buffer === SFX.buf) n++; return real.apply(this, arguments); };
    for (let i = 0; i < 4; i++) { sfxBoom(cam.x, cam.y, 40, i & 1); sfxShot(cam.x, cam.y, 3 + i * 4); await new Promise(r => setTimeout(r, 180)); }
    AudioBufferSourceNode.prototype.start = real; return n;
  });
  ok('i) shots, rockets, cannons and explosions play from the recordings', played >= 6, 'sprite clips started: ' + played);
  const cap = await page.evaluate(() => { let mx = 0; for (let i = 0; i < 80; i++) { AU.rate = {}; sfxBoom(cam.x, cam.y, 40, true); sfxShot(cam.x, cam.y, 20); mx = Math.max(mx, SFX.nv); } return [mx, SFX.cap]; });
  ok('i) simultaneous recorded sounds are capped', cap[0] <= cap[1], cap.join('/'));
  const dk = await page.evaluate(async () => { duck(); await new Promise(r => setTimeout(r, 300)); const v = [AU.musD.gain.value, AU.sfxD.gain.value]; await new Promise(r => setTimeout(r, 2800)); return [v, AU.musD.gain.value, AU.sfxD.gain.value]; });
  ok('i) a voice ducks music and effects, then they come back', dk[0][0] < .9 && dk[0][1] < .95 && dk[1] > .95 && dk[2] > .95, JSON.stringify(dk));
  await page.evaluate(() => { envT = 0; envAudio(1); });
  await sleep(2500);
  const loops = await page.evaluate(() => Object.keys(SFX.loops).filter(k => k[0] !== '_'));
  ok('i) ambience loops (wind / distant rumble) are in place', loops.includes('wind') && loops.includes('rumble'), loops.join(','));
  const dupes = sreqs.filter((r, i) => sreqs.indexOf(r) !== i), allowed = /^sfx\/(manifest\.json|sfx\.mp3|wind\.mp3|rumble\.mp3|rain\.mp3|tank\.mp3|truck\.mp3|heli\.mp3|jet\.mp3)$/;
  ok('i) only needed sound files downloaded, each once', dupes.length === 0 && sreqs.every(r => allowed.test(r)), sreqs.join(',') + ' dupes:' + dupes.join(','));
  console.log('sfx fetched:', sreqs.join(', '));

  // victory
  await page.evaluate(() => { showEnd(ME); });
  s = await until(s => s.pool === 'victory' && s.playing, 15000);
  ok('d) victory plays the victory track', !!s && s.id === 'victory-01' && reqs.includes('mus/st/victory-01.mp3'), s && s.id);
  await page.evaluate(() => { const d = ST.decks[ST.cur]; d.el.currentTime = Math.max(0, d.el.duration - 4); });
  s = await until(s => s.an, 10000);
  ok('d) the anthem follows the victory track', !!s);
  await page.evaluate(() => { if (ST.an) ST.an.end = AU.ctx.currentTime + 3.5; });
  s = await until(s => s.mode === 'menu' && /^menu-/.test(s.id || '') && s.playing, 15000);
  ok('d) then the menu pool', !!s, s && s.id);

  // defeat: a second battle, lost
  await page.evaluate(() => { startSingle(); if (G && G.teams[0]) G.teams[0].ai = mkAI(1); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
  s = await until(s => s.mode === 'battle' && s.playing, 30000);
  ok('d) second battle: battle music again', !!s, s && s.id);
  await page.evaluate(() => { const e = G.teams.findIndex((t, i) => i !== ME && !ally(i, ME)); showEnd(e); });
  s = await until(s => s.pool === 'defeat' && s.playing, 15000);
  ok('d) defeat plays the defeat track', !!s && s.id === 'defeat-02' && reqs.includes('mus/st/defeat-02.mp3'), s && s.id);
  const auErr = (await state()).err;
  ok('h) no audio error reported by the game (AU.err)', !auErr, auErr);
  const extra = ST_REQ_CHECK(reqs, (await state()).req), odd = [...new Set(reqs)].filter(r => !/^mus\/(st\/[\w-]+|an_US)\.mp3$/.test(r));
  ok('f) only needed music files downloaded (tracks that played + the anthem)', extra.length === 0 && odd.length === 0, extra.concat(odd).join(', '));

  // soundtrack unreachable: the music rests (no fallback score, no breakage), then comes back once tracks load again
  blockST = true; blockLog = true;
  await page.evaluate(() => { G = null; stopMusic(); menuMusic(); });
  s = await until(s => s.fail, 60000);
  ok('g) soundtrack unreachable: the player gives up quietly', !!s && !s.playing, JSON.stringify(await state()));
  blockST = false;
  await page.evaluate(() => { ST.failAt -= 121000; AU.err = ''; });
  s = await until(s => !s.fail && s.mode === 'menu' && s.playing, 30000);
  ok('g) back online: menu music returns', !!s, JSON.stringify(await state()));
  console.log('music bus RMS (info):', Object.entries(L).map(([k, v]) => k + ' ' + v.toFixed(4)).join(', '));
  console.log('fetched:', [...new Set(reqs)].join(', '));
  ok('h) no page errors / console audio errors', errs.length === 0, errs.join(' ; '));
} catch (e) {
  fails.push('exception: ' + (e.stack || e));
}
function ST_REQ_CHECK(all, asked) { const a = new Set(asked); return [...new Set(all.filter(r => r.startsWith('mus/st/')))].filter(r => !a.has(r)); }
for (const r of res) console.log(r);
await browser.close(); server.close();
if (fails.length) { console.log('AUDIO FAIL: ' + fails.join('; ')); process.exit(1); }
console.log('AUDIO PASS');
process.exit(0);
