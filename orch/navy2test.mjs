// Navy 2 test + shots: sonar contact, minefield + sweeper, fast-boat swarm -> orch/shots/navy2/ (node orch/navy2test.mjs)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = argS('tag', 'after');
const HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.join(ROOT, 'orch', 'shots');
const MAPS = argS('maps', 'strait,arctic,fulda,gulf,zagros,emirates,dmz').split(',').filter(Boolean);
const SEED = 4242;

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const page0 = fs.readFileSync(HTML);
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); } // no service worker: every run loads exactly this page
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
await acquireBrowserLock('gfx-shots');
const dir = path.join(OUT, 'navy2'); fs.mkdirSync(dir, { recursive: true });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errs = [];
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';

async function open(ctxOpts) {
  const ctx = await browser.newContext(ctxOpts); await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
  page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/toNonIndexed|GPU stall|net::|Failed to load|AudioContext|autoplay|speech|WebSocket|peer/i.test(t)) errs.push(m.type() + ': ' + t.slice(0, 300)); });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
  await page.evaluate(() => { window.__stopLoop = true; try { initAudio(); } catch (e) {} try { AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {} });
  return { ctx, page };
}
// start a 2-player battle (both sides AI), wait for the loading screen, then fast-forward `simSec` game-seconds
async function battle(page, map, p, a, simSec, w = 0, n = 1) {
  const r = await page.evaluate(async ([map, p, a, seed, w, n]) => {
    if (G) G.over = true;
    Object.assign(setup, { map, n, p, a, others: [], tm: [], slot: -1, seed, w });
    startSingle(); const w0 = performance.now();
    while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    G.teams.forEach(T => { if (!T.ai) T.ai = mkAI(1); }); G.paused = false;
    return { map: G.mapKey, facs: G.teams.map(T => T.fac), rev: THREE.REVISION, W: MAPW, H: MAPH };
  }, [map, p, a, SEED, w, n]);
  for (let done = 0; done < simSec * 60; done += 1800)
    await page.evaluate(k => { for (let i = 0; i < k && G && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1; }, Math.min(1800, simSec * 60 - done));
  return r;
}
async function frames(page, n) {
  return page.evaluate(n => { const gl = R3.getContext(), px = new Uint8Array(4), ts = [];
    for (let i = 0; i < n; i++) { const a = performance.now(); renderFrame(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - a); }
    return ts; }, n);
}
async function snap(page, name) { await page.screenshot({ path: path.join(dir, name + '.png'), timeout: 300000 }); console.log(`[${secs()}] ${TAG}/${name}.png`); }
const cam_ = (page, x, y, d) => page.evaluate(([x, y, d]) => { cam.dist = cam.td = d; cam.x = cam.tx = x; cam.y = cam.ty = y; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; }, [x, y, d]);

const ok = [], bad = [];
const chk = (name, cond, info) => { (cond ? ok : bad).push(name); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
try {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 720 } });
  await battle(page, 'gulf', 'US', 'RU', 2);
  // blank slate: no AI, no units except buildings; a patch of open water
  const W = await page.evaluate(() => {
    for (const T of G.teams) T.ai = null;
    for (const e of G.ents) if (!e.isB && !e.dead) e.dead = true;
    G.ents = G.ents.filter(e => !e.dead);
    let best = null, bs = -1; for (let i = 1; i < 24; i++) for (let j = 1; j < 24; j++) { const x = MAPW * i / 24, y = MAPH * j / 24; let c = 0; for (let dx = -600; dx <= 600; dx += 100) for (const dy of [-150, 0, 150]) if (passXY('naval', x + dx, y + dy)) c++; if (c > bs) { bs = c; best = [x, y]; } } return [best[0] - 0, best[1], bs];
  });
  console.log('water at', W); W.length = 2;
  const run = (sec) => page.evaluate(k => { for (let i = 0; i < k * 60 && G && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1; updateVis(); }, sec);
  // ---------- A. sonar ----------
  const A = await page.evaluate(([x, y]) => {
    const sub = addUnit(1, 'sub', x, y); sub.order = null;
    const far = addUnit(0, 'boat', x + 700, y), res = {};
    updateVis(); res.farSeen = !!sub.vs[0];
    const ship = addUnit(0, 'ship', x + 450, y); updateVis(); res.shipPassive = !!sub.vs[0];   // 300 sonar: 450 away -> not heard
    res.ping1 = sonarPing(ship); updateVis(); res.pingSeen = !!sub.vs[0]; res.pingCd = sonarPing(ship);
    for (let i = 0; i < 540; i++) simUpdate(1 / 60); updateVis(); res.afterWear = !!sub.vs[0];
    const heli = addUnit(0, 'heli', x, y + 200); heli.mv = -50; heli.landed = false; updateVis(); res.heliHover = !!sub.vs[0];
    heli.mv = G.t; updateVis(); res.heliMoving = !!sub.vs[0];
    heli.dead = true; far.dead = true; ship.dead = true;
    const near = addUnit(0, 'boat', x + 120, y); updateVis(); res.boatClose = !!sub.vs[0]; near.dead = true;
    sub.lastFire = G.t; updateVis(); res.fireRevealsSelf = !hiddenNow(sub); for (let i = 0; i < 450; i++) simUpdate(1 / 60); res.hiddenAgain = hiddenNow(sub);
    sub.dead = true; G.ents = G.ents.filter(e => !e.dead); return res;
  }, W);
  chk('sub hidden from a ship 450 away (passive)', A.shipPassive === false, A);
  chk('active ping reveals the sub', A.pingSeen === true);
  chk('ping has a cooldown', A.pingCd === false);
  chk('reveal wears off', A.afterWear === false);
  chk('hovering helicopter hears the sub; moving one does not', A.heliHover === true && A.heliMoving === false);
  chk('boat 120 away hears the sub', A.boatClose === true);
  chk('firing reveals the sub for a while, then it hides again', A.fireRevealsSelf === true && A.hiddenAgain === true);
  // ---------- B. mines ----------
  const B = await page.evaluate(([x, y]) => {
    const res = {};
    const ml = addUnit(1, 'minel', x, y); setMove(ml, x + 600, y, 'amove');
    return { id: ml.id };
  }, W);
  await run(24);
  const B2 = await page.evaluate(([x, y, id]) => {
    const res = {}; const ml = G.byId.get(id); res.mines = navMines(1); res.moved = Math.round(ml.x - x);
    const ms = G.mines.filter(m => m.nav);
    res.hiddenToEnemy = ms.every(m => !mineKnown(m, 0)); res.knownToOwner = ms.every(m => mineKnown(m, 1));
    // an enemy boat sails onto a mine: damage
    const m0 = ms[0], b = addUnit(0, 'boat', m0.x - 200, m0.y); res.hp0 = b.hp; b.x = m0.x + 4; b.y = m0.y; m0.arm = 0; res.mx = m0.x; res.my = m0.y; res.bid = b.id;
    return res;
  }, [...W, B.id]);
  await run(1);
  const B3 = await page.evaluate(([bid, mx, my, x, y]) => {
    const b = G.byId.get(bid), res = { boatHp: !b || b.dead ? 0 : b.hp, minesAfter: navMines(1) };
    // sweeper finds and clears the rest
    const sw = addUnit(0, 'sweep', x + 500, y + 40); res.sid = sw.id; setMove(sw, x + 100, y, 'amove'); return res;
  }, [B2.bid, B2.mx, B2.my, ...W]);
  await run(2);
  const B4 = await page.evaluate(([sid]) => { const sw = G.byId.get(sid) || { x: 0 }; const seen = G.mines.filter(m => m.nav && mineKnown(m, 0)).length; return { seen, pos: Math.round(sw.x) }; }, [B3.sid]);
  await cam_(page, W[0] + 300, W[1], 520); await run(0.1); await frames(page, 3); await snap(page, 'minefield-sweeper');
  await run(28);
  const B5 = await page.evaluate(() => ({ left: navMines(1) }));
  chk('minelayer lays mines on F+click path', B2.mines >= 5, B2);
  chk('mines hidden from the enemy, known to the owner', B2.hiddenToEnemy && B2.knownToOwner);
  chk('mine damages a ship', B3.boatHp < B2.hp0, B3);
  chk('minesweeper detects mines at range', B4.seen >= 1, B4);
  chk('minesweeper clears the minefield', B5.left < B2.mines - 1, B5);
  // ---------- C. sonar contact shot ----------
  await page.evaluate(([x, y]) => { for (const e of G.ents) if (!e.isB) e.dead = true; G.ents = G.ents.filter(e => !e.dead); G.mines = [];
    const sub = addUnit(1, 'sub', x, y); const d = addUnit(0, 'ship', x - 260, y + 30); const d2 = addUnit(0, 'boat', x - 200, y - 90); G.sel = [d]; sonarPing(d); }, W);
  await run(0.5); await cam_(page, W[0] - 100, W[1], 600); await frames(page, 3); await snap(page, 'sonar-contact');
  // ---------- D. fast-boat swarm ----------
  const D = await page.evaluate(([x, y]) => { for (const e of G.ents) if (!e.isB) e.dead = true; G.ents = G.ents.filter(e => !e.dead);
    const sw = []; for (let i = 0; i < 6; i++) sw.push(addUnit(0, 'fast', x - 360, y - 100 + i * 40)); const ship = addUnit(1, 'ship', x + 120, y);
    for (const u of sw) setMove(u, ship.x, ship.y, 'amove'); const hp0 = ship.hp; return { ids: sw.map(u => u.id), sid: ship.id, hp0, cost: sw.length * stats('US', 'fast').cost, shipCost: stats('RU', 'ship').cost }; }, W);
  await run(9); await cam_(page, W[0] - 120, W[1], 520); await frames(page, 3); await snap(page, 'fast-boat-swarm');
  { const dbg = await page.evaluate(([ids,sid]) => { const sh = G.byId.get(sid); return { shipT: sh.target && sh.target.id, lastFire: sh.lastFire, t: G.t, fast: ids.map(i => { const u = G.byId.get(i); return u ? [Math.round(u.hp), Math.round(u.x - sh.x), Math.round(u.y - sh.y), u.target && u.target.id] : null; }) }; }, [D.ids, D.sid]); console.log('dbg', JSON.stringify(dbg)); }
  await run(30);
  const D2 = await page.evaluate(([ids, sid]) => ({ fastLeft: ids.filter(i => { const u = G.byId.get(i); return u && !u.dead; }).length, shipHp: (G.byId.get(sid) || { hp: 0 }).hp }), [D.ids, D.sid]);
  chk('6 fast boats (cost ≈ 1 warship) wear a lone warship down and the ship's CIWS kills some', D2.shipHp < D.hp0 * .6 && D2.fastLeft >= 1 && D2.fastLeft < 6, { D, D2 });
  // ---------- E. same stats everywhere ----------
  const E = await page.evaluate(() => { const c = new Set(); for (const f of Object.keys(FACTIONS)) { const s = stats(f, 'fast'); c.add(s.cost + '/' + s.hp + '/' + s.dmg); } return [...c].slice(0, 6); });
  console.log('fast stat variants across nations:', E.length, E.join(' '));
  chk('every nation can build fast boats / mines / sweepers', await page.evaluate(() => Object.keys(FACTIONS).every(f => { const r = roster(f).shipyard; return r.includes('fast') && (FACTIONS[f].noShip || (r.includes('minel') && r.includes('sweep'))); })));
  chk('no page errors', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
} catch (e) { console.error('navy2 test crashed', e); bad.push('crash'); }
await browser.close(); server.close();
console.log(bad.length ? `NAVY2 FAIL (${bad.join('; ')})` : `NAVY2 PASS (${ok.length} checks)`);
process.exit(bad.length ? 1 : 0);
