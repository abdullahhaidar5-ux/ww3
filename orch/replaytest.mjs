// Replay test (src/08b-replay.js): a recorded battle must replay to exactly where the live battle ended.
//
// Boots the real game in headless Chromium, starts a 2-side skirmish with the AI playing both sides, and drives the
// battle itself (render loop stopped, 60 Hz sim steps + the recorder) for --minutes game-minutes. Then it packs the
// replay file (the same bytes "Save replay" downloads), notes the live end state, opens the file in the replay viewer
// (the same path as "Watch replay"), plays it to the end at 8x and compares:
//   - end-state hash: every unit/building's id, kind, side, position (m) and health on the live battle vs the replay;
//   - a jump back to the middle and replaying on to the end again gives the same hash (timeline seek);
//   - no orders can leave the replay (doAct is a no-op), the view switch and fog-off work, no page errors;
//   - the file is small: KB per game-minute printed, and must stay under --max-kb-min (default 400).
// Why not replay the order stream: see the header of src/08b-replay.js (the live sim is not reproducible).
//
//   node orch/replaytest.mjs [--minutes 3] [--max-kb-min 400] [--no-lock]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const MINUTES = arg('minutes', 3), MAXKB = arg('max-kb-min', 400);
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
if (!process.argv.includes('--no-lock')) await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.gz': 'application/octet-stream', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const fails = [];
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
page.on('pageerror', e => fails.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); if (!/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(t)) fails.push('console error: ' + t.slice(0, 300)); });
const HASH = () => {   // in the page: the battle's state, the same way on the live game and in the replay
  const L = []; for (const e of G.ents) { if (e.dead || e.gone) continue; const x = e.tx != null ? e.tx : e.x, y = e.ty != null ? e.ty : e.y;
    L.push([e.id, e.kind, e.team, Math.round(x), Math.round(y), Math.round(e.hp)].join(',')); }
  L.sort(); let h = 0x811c9dc5; const s = L.join(';'); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return { h: (h >>> 0).toString(16), n: L.length, t: +G.t.toFixed(2), list: L };
};
const t0 = Date.now();
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof rpWatch === 'function', null, { timeout: 60000 });
  await page.evaluate(() => { setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); G.teams[0].ai = mkAI(1); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 });
  console.log(`live battle: ${await page.evaluate(() => G.teams.filter(Q => !Q.reb).map(T => T.fac).join(' vs ') + ' on ' + G.mapKey)} (loaded after ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  await page.evaluate(() => { window.__stopLoop = true; });
  for (let m = 0; m < MINUTES * 6; m++) {   // 10 game-s per call
    const o = await page.evaluate(() => { for (let i = 0; i < 600 && G && !G.over; i++) { simUpdate(1 / 60); rpRecTick(); } return { t: G.t, over: G.over }; });
    if (o.over) break;
  }
  const live = await page.evaluate(async (H) => { const u = await rpPack(); const hash = (0, eval)('(' + H + ')')();
    rpEndBtns(); const eb = document.getElementById('rpWatch'); window.__rpFile = u; return { endBtn: !!eb && !eb.hidden, kb: u.length / 1024, dur: RP.rec.t, frames: RP.rec.n, hash }; }, HASH.toString());
  const kbMin = live.kb / Math.max(1 / 60, live.dur / 60);
  console.log(`live end: t=${live.hash.t}s, ${live.hash.n} units/buildings, hash ${live.hash.h}; replay file ${live.kb.toFixed(0)} KB (${kbMin.toFixed(0)} KB per game-minute, ${live.frames} frames)`);
  if (!live.endBtn) fails.push('the end-of-battle screen has no Watch replay button');
  if (kbMin > MAXKB) fails.push(`replay file too big: ${kbMin.toFixed(0)} KB per game-minute (limit ${MAXKB})`);
  // the replay viewer, from the packed bytes
  const t1 = Date.now();
  const ok = await page.evaluate(() => rpWatch(window.__rpFile));
  if (!ok) throw new Error('rpWatch refused the replay file');
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 });
  console.log(`replay loaded after ${((Date.now() - t1) / 1000).toFixed(0)} s: ${await page.evaluate(() => RP.frames.length)} frames, ${await page.evaluate(() => RP.kf.length)} keyframes`);
  const play = () => page.evaluate(H => { RP.spd = 8; RP.paused = false; let n = 0; while (!RP.paused && n++ < 200000) rpTick(1 / 30); for (let k = 0; k < 30; k++) clientTick(1 / 30);
    return (0, eval)('(' + H + ')')(); }, HASH.toString());
  const r1 = await play();
  const cmp = (a, b, what) => {
    if (a.h === b.h) { console.log(`${what}: hash ${a.h} matches (${a.n} units/buildings)`); return; }
    const A = new Set(a.list), B = new Set(b.list), onlyL = a.list.filter(x => !B.has(x)), onlyR = b.list.filter(x => !A.has(x));
    fails.push(`${what}: end state differs (live ${a.h} n=${a.n}, replay ${b.h} n=${b.n}); live-only ${onlyL.slice(0, 4).join(' | ')}; replay-only ${onlyR.slice(0, 4).join(' | ')}`);
  };
  cmp(live.hash, r1, 'replay to the end');
  try { await page.evaluate(() => { rpSeek(RP.hdr.dur * .8); RP.paused = true; rpSetView(-1); for (let i = 0; i < 3; i++) { clientTick(1 / 30); rpVis(); renderFrame(1 / 30); } });
    fs.mkdirSync(path.join(ROOT, 'orch', 'out'), { recursive: true }); await page.screenshot({ path: path.join(ROOT, 'orch', 'out', 'replay.png'), timeout: 120000 }); console.log('screenshot orch/out/replay.png'); }
  catch (e) { console.log('screenshot skipped: ' + String(e.message || e).split('\n')[0]); }
  // jump back to the middle, play on to the end again
  const r2 = await page.evaluate(H => { rpSeek(RP.hdr.dur / 2); const mid = { t: G.t, n: G.ents.length }; RP.paused = false; RP.spd = 8; let n = 0;
    while (!RP.paused && n++ < 200000) rpTick(1 / 30); for (let k = 0; k < 30; k++) clientTick(1 / 30); const h = (0, eval)('(' + H + ')')(); h.mid = mid; return h; }, HASH.toString());
  console.log(`seek to ${r2.mid.t.toFixed(0)} s showed ${r2.mid.n} units/buildings`);
  if (!(r2.mid.n > 4)) fails.push('seek to the middle showed (almost) nothing');
  cmp(live.hash, r2, 'seek to the middle, then to the end');
  const misc = await page.evaluate(() => { const before = G.ents.length; let sent = 0; const g0 = NET.game; NET.game = { presence: () => { sent++; return Promise.resolve(); }, emit: () => { sent++; return Promise.resolve(); } };
    try { doAct({ t: 'go', ids: G.ents.filter(e => !e.isB).slice(0, 3).map(e => e.id), x: 100, y: 100 }); } finally { NET.game = g0; }
    rpSetView(1); const v1 = ME; rpSetView(-1); const fogOff = !RP.fog && G.ents.every(e => e.vis); rpSetView(0);
    return { sent, v1, fogOff, bar: !!document.getElementById('rpBar') && !document.getElementById('rpBar').hidden}; });
  if (misc.sent) fails.push('an order left the replay viewer');
  if (misc.v1 !== 1) fails.push('switching to the other side\'s view did not work');
  if (!misc.fogOff) fails.push('"Everything (no fog)" did not show everything');
  if (!misc.bar) fails.push('the replay bar is not on screen');
  await page.evaluate(() => rpExit());
  if (!(await page.evaluate(() => !RP.on && !document.getElementById('menu').hidden))) fails.push('Exit replay did not return to the menu');
} catch (e) { fails.push('crash: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); }
await browser.close(); server.close();
console.log(`(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
for (const f of fails) console.log('  - ' + f);
console.log(fails.length ? 'REPLAY FAIL' : 'REPLAY PASS');
process.exit(fails.length ? 1 : 0);
