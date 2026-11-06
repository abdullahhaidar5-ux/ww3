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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const MINUTES = arg('minutes', 4), PLAYERS = Math.max(2, Math.min(8, arg('players', 2)));
const ART=null;

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
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;


const OUTD = path.join(ROOT, 'orch', 'shots', 'command-teams'); fs.mkdirSync(OUTD, { recursive: true });
const fails = [];
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const bctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await guardContext(bctx);
const page = await bctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
page.on('pageerror', e => fails.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) fails.push('console error: ' + m.text().slice(0, 300)); });
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails.push(msg); };
const shot = async (name) => { try { await page.evaluate(() => { for (let i = 0; i < 6; i++) { try { renderFrame(0.016); } catch (e) {} } }); await page.waitForTimeout(600); await page.screenshot({ path: path.join(OUTD, name), timeout: 180000 }); } catch (e) { console.log('shot skipped ' + name + ': ' + String(e.message).split('\n')[0]); } };
async function start(tm, n) {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await page.evaluate(([tm, n]) => { setup.n = n; setup.w = 0; setup.tm = tm; try { initAudio(); } catch (e) {} startSingle(); }, [tm, n]);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 });
  await page.waitForTimeout(2500);
}
const ff = (sec) => page.evaluate((s) => { for (let i = 0; i < s * 30 && !G.over; i++) simUpdate(1 / 30); return G.t; }, sec);
try {
  // ---------- team game: me + one ally vs 2 AIs ----------
  await start([0, 0, 1, 2], 3);
  await ff(100);
  await page.evaluate(() => { const hq = hqOf(ME); for (let i = 0; i < 14; i++) addUnit(ME, i % 4 === 3 ? 'tank' : 'inf', hq.x + 120 + (i % 5) * 22, hq.y + 60 + Math.floor(i / 5) * 24); });
  let r = await page.evaluate(() => { const mine = G.ents.filter(e => !e.dead && !e.isB && e.team === ME && e.s.spd > 0 && e.kind !== 'harv' && e.kind !== 'dozer'); return { n: mine.length, tm: G.teams.map(t => t.tm), ally: G.teams.findIndex((t, i) => i !== ME && !t.reb && sameTm(i, ME)) }; });
  ok(r.n >= 3, 'have units to command (' + r.n + ')');
  ok(r.ally > 0, 'an ally exists (team ' + r.ally + ')');
  // --- battle plan ---
  r = await page.evaluate(() => { const us = G.ents.filter(e => !e.dead && !e.isB && e.team === ME && e.s.spd > 0 && e.kind !== 'harv' && e.kind !== 'dozer').slice(0, 8); G.sel = us; const c = ctCentroid(us); centerOn(c.x, c.y, true);
    ctPlanStart(); const ok0 = CT.mode === 'plan'; const d = CT.draft;
    d.steps.push({ t: 'm', x: c.x + 220, y: c.y + 60, trig: 'auto', sec: 10 }, { t: 'a', x: c.x + 420, y: c.y + 140, trig: 'timer', sec: 10 }, { t: 'h', x: c.x + 520, y: c.y + 80, trig: 'go', sec: 10 });
    return { ok0, n: us.length }; });
  ok(r.ok0, 'plan mode armed');
  await shot('plan-drawn.png');
  r = await page.evaluate(() => { ctPlanFinish(); return { plans: CT.plans.length, i: CT.plans[0] && CT.plans[0].i }; });
  ok(r.plans === 1, 'plan created');
  r = await page.evaluate(() => { for (let k = 0; k < 6; k++) { for (let i = 0; i < 90; i++) simUpdate(1 / 30); ctPlanTick(); } const p = CT.plans[0]; return p ? { i: p.i, st: p.st, go: p.go } : null; });
  console.log('plan after 18 s', JSON.stringify(r));
  ok(r && r.i >= 0, 'plan step 1 was issued');
  await page.evaluate(() => { for (let k = 0; k < 40; k++) { for (let i = 0; i < 90; i++) simUpdate(1 / 30); ctPlanTick(); } });
  r = await page.evaluate(() => { const p = CT.plans[0]; return p ? { i: p.i, st: p.st } : null; });
  console.log('plan after ~2 min', JSON.stringify(r));
  ok(r && r.i >= 1, 'plan reached the timer step on its own');
  await page.evaluate(() => { const p = CT.plans[0]; if (p && p.i < 2) ctGoAll(); for (let i = 0; i < 90; i++) simUpdate(1 / 30); ctPlanTick(); });
  // --- battle groups ---
  await page.evaluate(() => { const us = G.ents.filter(e => !e.dead && !e.isB && e.team === ME && e.s.spd > 0 && e.kind !== 'harv' && e.kind !== 'dozer'); G.sel = us.slice(0, 6); sqAssign(1); CT.names[1] = 'Armour'; CT.form[1] = 'wedge'; G.sel = us.slice(6, 12); if (G.sel.length) { sqAssign(2); CT.names[2] = 'Assault'; CT.form[2] = 'column'; }
    G.sel = []; ctUI(true); });
  r = await page.evaluate(() => { const L = sqList(1); const before = L.map(u => u.order && u.order.type).join(','); const c = ctCentroid(L); ctFormSend(L, c.x + 150, c.y, 'wedge', 'move'); for (let i = 0; i < 6; i++) simUpdate(1 / 30); return { n: L.length, moving: L.filter(u => u.order && (u.order.type === 'move' || u.order.type === 'amove')).length }; });
  ok(r.moving >= Math.min(r.n, 2), 'wedge send gives move orders (' + r.moving + '/' + r.n + ')');
  await shot('battle-groups.png');
  // --- pings and drawings seen by the ally: the ally's own handler runs in the same page, so check what ME sees from the ally ---
  r = await page.evaluate(() => { const al = G.teams.findIndex((t, i) => i !== ME && !t.reb && sameTm(i, ME)); const c = ctCentroid(G.ents.filter(e => e.team === ME && !e.isB && !e.dead)); const n0 = CT.marks.length;
    act(al, { t: 'mp', k: 0, x: c.x + 160, y: c.y + 40 }); act(al, { t: 'md', c: 0, p: [c.x - 100, c.y + 120, c.x - 20, c.y + 60, c.x + 60, c.y + 90, c.x + 140, c.y + 20] }); G.teams[al].mdT = 0; act(al, { t: 'md', c: 1, p: [c.x + 60, c.y - 140, c.x + 130, c.y - 140] }); act(ME, { t: 'mp', k: 2, x: c.x - 120, y: c.y - 60 }); act(ME, { t: 'say', i: 0 });
    CT.marks.forEach(m => { m.life = 1e6; }); centerOn(c.x, c.y, true); return { added: CT.marks.length - n0, enemyHears: G.teams.findIndex((t, i) => !t.reb && !sameTm(i, ME)) }; });
  ok(r.added === 4, 'ally ping + 2 drawings + own ping reach this team (' + r.added + ')');
  r = await page.evaluate(() => { const foe = G.teams.findIndex((t, i) => !t.reb && !sameTm(i, ME)); const m = ctMask(foe); return { m, mine: ctMask(ME) }; });
  ok((r.m & r.mine) === 0, 'an enemy team is not in the ping audience');
  await shot('ping-and-draw.png');
  // --- allied aid ---
  r = await page.evaluate(() => { const al = G.teams.findIndex((t, i) => i !== ME && !t.reb && sameTm(i, ME)); const A = G.teams[ME], B = G.teams[al]; A.credits = 3000; const a0 = A.credits; act(ME, { t: 'give', to: al, amt: 1000 }); const q0 = G.aidQ.map(q => q.amt); const spent = a0 - A.credits; for (let i = 0; i < 30 * 5; i++) simUpdate(1 / 30); return { al, q0, spent, q: G.aidQ.length }; });
  console.log('aid', JSON.stringify(r));
  ok(r.spent === 1000 && r.q0.length === 1 && r.q0[0] === 900 && r.q === 0, 'money is queued with a 10% fee, then delivered after the delay ' + JSON.stringify(r));
  r = await page.evaluate(() => { const al = G.teams.findIndex((t, i) => i !== ME && !t.reb && sameTm(i, ME)); const us = G.ents.filter(e => !e.dead && !e.isB && e.team === ME && e.s.spd > 0 && e.kind !== 'harv' && e.kind !== 'dozer').slice(0, 3).map(u => u.id); act(ME, { t: 'gift', ids: us, to: al }); return { moved: us.filter(i => G.byId.get(i).team === al).length, n: us.length }; });
  ok(r.moved === r.n, 'gifting units hands them to the ally (' + r.moved + '/' + r.n + ')');
  // --- doctrine tree ---
  r = await page.evaluate(() => { const T = G.teams[ME]; T.rank = 6; T.spent = 0; T.gperk = {}; T.gdoc = 'arm'; const o = {}; o.a4early = gdBuy(ME, 'a4'); o.a1 = gdBuy(ME, 'a1'); o.a4needsBranch = gdBuy(ME, 'a4'); o.a2 = gdBuy(ME, 'a2'); o.a5 = gdBuy(ME, 'a5'); o.a4 = gdBuy(ME, 'a4'); upgAgg(T, 'tank'); return o; });
  ok(!r.a4early && r.a1 && !r.a4needsBranch && r.a2 && r.a5 && !r.a4, 'doctrine tree order enforced ' + JSON.stringify(r));
  await page.evaluate(() => { const t = document.querySelectorAll('.tab'); try { showTab('pow'); } catch (e) {} updateUI(); const b = document.getElementById('dp_a1'); if (b) b.scrollIntoView(); });
  await shot('doctrine-tree.png');
  // ---------- free-for-all: ceasefire ----------
  await start([0, 1, 2], 2);
  await ff(60);
  await page.evaluate(() => { const hq = hqOf(ME); for (let i = 0; i < 40; i++) addUnit(ME, 'tank', hq.x + 120 + (i % 8) * 22, hq.y + 60 + Math.floor(i / 8) * 24); });
  r = await page.evaluate(() => { const o = { ffa: ctFFA() }; o.offer = cfOffer(ME, 1, 0); return o; });
  ok(r.ffa && r.offer, 'ffa truce offer made');
  await shot('ceasefire-offer.png');
  r = await page.evaluate(() => { for (let i = 0; i < 30 * 4; i++) simUpdate(1 / 30); return { tr: truced(ME, 1), tr2: truced(ME, 2), ally: ally(ME, 1), same: sameTm(ME, 1), log: 0 }; });
  console.log('after AI answer', JSON.stringify(r));
  if (!r.tr) { r = await page.evaluate(() => { cfOffer(ME, 2, 1); for (let i = 0; i < 30 * 4; i++) simUpdate(1 / 30); return { tr1: truced(ME, 1), tr2: truced(ME, 2) }; }); console.log('second AI', JSON.stringify(r)); }
  r = await page.evaluate(() => { const k = truced(ME, 1) ? 1 : truced(ME, 2) ? 2 : -1; if (k < 0) return { k }; const o = { k, allyNow: ally(ME, k), sameNow: sameTm(ME, k) }; const un0 = (G.towns || []).filter(t => t.ow === ME).map(t => t.un || 0);
    o.broke = cfBreak(ME, k); o.after = truced(ME, k); o.oath = G.teams[ME].oath > G.t; o.again = cfOffer(ME, k, 0); return o; });
  console.log('truce/break', JSON.stringify(r));
  ok(r.k >= 0 && r.allyNow && !r.sameNow && r.broke && !r.after && r.oath && !r.again, 'a truce counts as friendly, breaking it stamps an oathbreaker and blocks new offers');
  await page.evaluate(() => { const o = G.tOff; G.teams[ME].oath = 0; G.teams[ME].cfCd = 0; cfOffer(1, ME, 1); ctUI(true); });
  await shot('ceasefire-incoming.png');
  // checkpoint round trip keeps the truce
  r = await page.evaluate(() => { G.teams[ME].oath = 0; G.teams[ME].cfCd = 0; cfOffer(ME, 1, 2); G.truce = G.truce || {}; cfStart(ME, 1, 90); const ck = ckEncode(); return { has: !!ck.g.truce, pk: ctPack(ME) }; });
  ok(r.has && r.pk && r.pk.tr.length === 1, 'truce is in the checkpoint and the snapshot pack');
  await ff(5);
} catch (e) { fails.push(String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); }
await browser.close(); server.close();
if (fails.length) { console.log('\nCT FAIL'); for (const f of [...new Set(fails)]) console.log('  x ' + f); process.exit(1); }
console.log('\nCT PASS');
