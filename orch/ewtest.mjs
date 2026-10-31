// Electronic warfare check (plus the rubble / destructible-cities checks at the end): EW truck radar spoof + minimap jamming (view-only, per team).
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
    // host migration: a checkpoint carries the spoofs, the truck's cooldown and martyr state, and a restore brings them back
    const enT = G.teams[en]; enT.mart = G.t + 25; martyrBanner({ x: enHq.x, y: enHq.y, team: en });
    const before = { sp: JSON.stringify(G.spoofs), cd: mt.spfT, mb: JSON.stringify(G.mban), mart: enT.mart, gh: JSON.stringify(ewView(me).g) };
    const pk = JSON.parse(JSON.stringify(ckEncode())); G.spoofs = []; G.mban = []; enT.mart = 0; ckRestore(pk); G._ewv = null;
    const mt2 = G.byId.get(mt.id);
    o.ck = { sp: JSON.stringify(G.spoofs) === before.sp, cd: !!mt2 && mt2.spfT === before.cd, mb: JSON.stringify(G.mban) === before.mb, mart: G.teams[en].mart === before.mart, gh: JSON.stringify(ewView(me).g) === before.gh };
    // older checkpoints without the new fields still restore (defaults: no spoofs, no banners)
    delete pk.g.spoofs; delete pk.g.mban; delete pk.g.mbanN; G.spoofs = undefined; G.mban = undefined; let okOld = true; try { ckRestore(pk); simUpdate(0.02); ewView(me); } catch (e) { okOld = String(e); } o.ckOld = okOld;
    ckRestore(JSON.parse(JSON.stringify(ckEncode()))); // keep going with a sane state
    // mourning: 40 s buff then gone; rebuy blocked 180 s then allowed; checkpoint keeps the wait
    { const T = G.teams[me], t0 = G.t; T.mart = 0; T.rebuy = 0; T.credits = 99999; const c = addUnit(me, 'cleric', myHq.x + 60, myHq.y + 60); const m = {};
      if (c) { kill(c, null, null); m.set = Math.abs(T.mart - t0 - 40) < 0.5 && Math.abs(T.rebuy - t0 - 180) < 0.5;
        const g = () => dmgOut({ team: me, s: { cls: 'inf', armor: 'light' }, rank: 0 }); m.fear = fearlessT(T, { s: { cls: 'inf' } });
        const pk2 = JSON.parse(JSON.stringify(ckEncode())); T.mart = 0; T.rebuy = 0; ckRestore(pk2); m.ck = Math.abs(G.teams[me].rebuy - t0 - 180) < 0.5 && Math.abs(G.teams[me].mart - t0 - 40) < 0.5;
        const T2 = G.teams[me]; m.blocked1 = enqueue(me, 'cleric') === false;
        T2.mart = G.t + 0.01; simUpdate(0.05); m.buffEnds = !(fearlessT(T2, { s: { cls: 'inf' } }) && T2.mart > G.t) || T2.mart <= G.t;
        T2.rebuy = G.t + 0.5; m.blockedMid = enqueue(me, 'cleric') === false; T2.rebuy = G.t - 1; const r2 = enqueue(me, 'cleric'); m.allowed = r2 === true || !allUnits(T2.fac).includes('cleric') || !done(me, stats(T2.fac, 'cleric').from); }
      o.mourn = m; }
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
  ck('checkpoint keeps radar-spoof ghosts, cooldown, martyr banner and Ayatollah buff', Object.values(r.ck).every(Boolean), JSON.stringify(r.ck));
  ck('mourning: 40 s buff, 180 s rebuy wait, checkpoint keeps both', Object.keys(r.mourn).length >= 6 && Object.values(r.mourn).every(Boolean), JSON.stringify(r.mourn));
  ck('old checkpoint without EW fields restores', r.ckOld === true, r.ckOld);
  await page.evaluate(() => { const c = document.getElementById('mm') || mm; window.__mmPng = c.toDataURL('image/png'); });
  const png = await page.evaluate(() => window.__mmPng.split(',')[1]);
  fs.writeFileSync(path.join(OUT, 'ew-minimap.png'), Buffer.from(png, 'base64'));
  await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); centerOn(hq.x, hq.y, true); renderFrame(0.016); G.mmT = 0; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'ew-battle.png'), timeout: 150000 });
  const left = await page.evaluate(() => window.__exp());
  ck('spoof ends after 20 s', left === 0, left);
  // Sanctions & smuggling: income of the target cuts 20% for 60 s (8% with Smuggling Routes + trickle), back to normal after
  const sx = await page.evaluate(() => {
    G.paused = true; const me = ME, en = G.teams.find(T => T.id !== me).id, E = G.teams[en], M = G.teams[me], hq = G.ents.find(b => b.team === en && b.kind === 'hq');
    for (const T of G.teams) { T.sanc = 0; T.upg.smug = false; }
    for (const e of G.ents) if (e.isB && e.kind === 'econ') e.dead = true;
    const b = addBld(en, 'econ', hq.x + 300, hq.y + 300, true); b.built = 1; b.dis = 0;
    const earn = () => { const c0 = E.credits; G.ecT = 2; econTick(0.01); const d = E.credits - c0; return d; };
    const o = {}; b.acc = 0; let base = 0; for (let i = 0; i < 50; i++) base += earn(); o.base = base;
    M.pw.sanc = { cd: 0, lv: 1 }; G.t = Math.max(G.t, 300); E.credits = 5000; M.credits = 100;
    o.fired = usePower(me, 'sanc', 0, 0); o.cd = M.pw.sanc.cd; o.again = usePower(me, 'sanc', 0, 0); o.dur = Math.round(E.sanc - G.t);
    b.acc = 0; let cut = 0; for (let i = 0; i < 50; i++) cut += earn(); o.cut = cut;
    E.upg.smug = true; b.acc = 0; let sm = 0; for (let i = 0; i < 50; i++) sm += earn(); o.smug = sm;
    const pk = JSON.parse(JSON.stringify(ckEncode())); E.sanc = 0; ckRestore(pk); o.ckKeeps = G.teams[en].sanc > G.t;
    G.t = E.sanc + 1; b.acc = 0; let after = 0; for (let i = 0; i < 50; i++) after += earn(); o.after = after; o.unsanctioned = incMul(M);
    return o;
  });
  ck('sanctions: 20% income cut', sx.fired && Math.abs(sx.cut / sx.base - .8) < .03, JSON.stringify(sx));
  ck('sanctions: 60 s, long cooldown, no double-fire', sx.dur === 60 && sx.cd === 420 && !sx.again, JSON.stringify(sx));
  ck('smuggling routes: only 8% cut plus trickle', sx.smug > sx.base * .92 && sx.smug < sx.base * .92 + 50 * 6 + 5, JSON.stringify(sx));
  ck('sanctions survive checkpoint and end on time', sx.ckKeeps && sx.after > sx.base * .98 + 50 * 0 && sx.after < sx.base * 1.02 && sx.unsanctioned === 1, JSON.stringify(sx));
  // Tunnels deeper + proxy militias: Ground-Penetrating Radar reveals enemy tunnel entrances in range only, tunnel ambush bonus (+50% for 3 s), Fund Militia
  const tm = await page.evaluate(() => {
    G.paused = true; const me = ME, en = G.teams.find(T => T.id !== me).id, M = G.teams[me], E = G.teams[en], hq = G.ents.find(b => b.team === me && b.kind === 'hq'), o = {};
    G.t = Math.max(G.t, 400);
    const mk = (team, dx) => { const b = addBld(team, 'tunnel', hq.x + dx, hq.y + 40, true); b.built = 1; b.dis = 0; b.lastFire = -99; return b; };
    const near = mk(en, 300), far = mk(en, 1600); M.upg.gpr = false; near.detT = far.detT = 0;
    G.gprT = 0; gprTick(0.01); o.noUpg = hiddenNow(near);
    M.upg.gpr = true; G.gprT = 0; gprTick(0.01); o.near = hiddenNow(near); o.far = hiddenNow(far);
    G.t += 2; o.expires = hiddenNow(near); M.upg.gpr = false;
    // ambush
    const mine = mk(me, -300), u = addUnit(me, 'inf', hq.x, hq.y + 100), tg = addUnit(en, 'inf', hq.x + 500, hq.y + 500);
    enterTunnel(u); unloadTunnel(mine); const base = specialMult(tg, 'gun', { s: u.s, isB: false, team: me });
    o.amb = specialMult(tg, 'gun', u) / base; G.t += 3.1; o.ambEnd = specialMult(tg, 'gun', u) / base;
    // militia
    M.pw.mil = { cd: 0, lv: 1 }; const before = new Set(G.ents.filter(e => e.team === me && !e.isB).map(e => e.id));
    o.fired = usePower(me, 'mil', 0, 0); const nu = G.ents.filter(e => e.team === me && !e.isB && !before.has(e.id) && !e.dead);
    o.n = nu.length; o.tech = nu.filter(e => e.kind === 'jeep').length; o.cd = M.pw.mil.cd; o.again = usePower(me, 'mil', 0, 0);
    const pk = JSON.parse(JSON.stringify(ckEncode())); ckRestore(pk);
    o.ck = G.ents.filter(e => e.team === me && !e.isB && !before.has(e.id) && !e.dead).length === o.n && G.teams[me].pw.mil.cd > 0;
    o.names = [powInfo('mil', 'IR').name, powInfo('mil', 'US').name, powInfo('mil', 'RU').name, powInfo('mil', 'TR').name];
    return o;
  });
  ck('GPR: reveals tunnel in range, not out of range, not without the upgrade', tm.near === false && tm.far === true && tm.noUpg === true && tm.expires === true, JSON.stringify(tm));
  ck('tunnel ambush: +50% damage, gone after 3 s', Math.abs(tm.amb - 1.5) < .01 && Math.abs(tm.ambEnd - 1) < .01, JSON.stringify(tm));
  ck('fund militia: 7 units owned by caster, cooldown blocks 2nd use, checkpoint keeps it', tm.fired && tm.n === 7 && tm.tech === 1 && tm.cd >= 400 && !tm.again && tm.ck, JSON.stringify(tm));
  ck('fund militia names per nation', /Popular Mobilization/.test(tm.names[0]) && /Contractors/.test(tm.names[1]) && /PMC/.test(tm.names[2]) && /Local militia/.test(tm.names[3]), JSON.stringify(tm.names));
  // ---- Rubble (destructible cities): a fallen city block is cover for infantry and a wall for heavy vehicles ----
  // a fresh battle on South Lebanon (it has towns; the EW battle's map may not)
  await page.evaluate(() => { setup.map = 'lebanon'; setup.n = 1; startSingle(); });
  await page.waitForFunction(() => G && G.map && G.map.cityBlds && G.map.cityBlds.length && !window.LOADING, null, { timeout: 600000, polling: 250 });
  const rb = await page.evaluate(() => {
    const o = {}, me = ME; G.paused = true; o.rubBefore = !!G.rub;
    const open = k => k >= 0 && k < GW * GH && (G.grid[k] === 0 || G.grid[k] === 2);
    // a standing block cell with open ground on its left and right: once it falls, the straight line crosses its rubble
    o.nciv = (G.civ || []).filter(c => !c.ruin).length;
    const c = (G.civ || []).find(c => !c.dead && !c.ruin && G.grid[c.k] === 3 && open(c.k - 1) && open(c.k + 1) && c.x > 300 && c.x < MAPW - 300);
    o.city = !!c; if (!c) return o;
    const ax = c.x - CELL, bx = c.x + CELL, y = c.y, cellOf = (x, y) => Math.floor(y / CELL) * GW + Math.floor(x / CELL);
    collapseCiv(c, me);
    o.rubN = G.rubN; o.gridOpen = G.grid[c.k] === 0; o.rubCell = G.rub[c.k];
    // routes: infantry straight over the rubble, a tank around it
    const thru = P => { let x0 = ax, y0 = y; for (const [x1, y1] of P) { for (let t = 0; t <= 1; t += .05) if (cellOf(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) === c.k) return true; x0 = x1; y0 = y1; } return false; };
    const len = P => { let x0 = ax, y0 = y, L = 0; for (const [x1, y1] of P) { L += Math.hypot(x1 - x0, y1 - y0); x0 = x1; y0 = y1; } return Math.round(L); };
    const Pi = findPath('ground', ax, y, bx, y) || []; P_H = true; let Pt; try { Pt = findPath('ground', ax, y, bx, y) || []; } finally { P_H = false; }
    o.infThru = thru(Pi); o.tankThru = thru(Pt); o.infLen = len(Pi); o.tankLen = len(Pt);
    // drive a real tank (and a rifleman) across: the tank must never enter the rubble cell and still arrive
    const tk = addUnit(me, 'tank', ax, y), R = roster(G.teams[me].fac), ik = R.barracks.find(k => isInf(stats(G.teams[me].fac, k)) && !stats(G.teams[me].fac, k).noAttack) || R.barracks[0], inf = addUnit(me, ik, ax, y + 6);
    for (const u of [tk, inf]) { u.max = u.hp = 1e7; }
    o.heavy = rubHeavy(tk); o.infHeavy = rubHeavy(inf);
    setMove(tk, bx, y, 'move'); setMove(inf, bx, y, 'move'); let inT = 0, inI = 0, slowI = 1;
    for (let i = 0; i < 400; i++) { simUpdate(0.1); if (cellOf(tk.x, tk.y) === c.k) inT++; if (cellOf(inf.x, inf.y) === c.k) { inI++; slowI = Math.min(slowI, rubSlow(inf)); } }
    o.tankInRubble = inT; o.tankArrived = Math.round(Math.hypot(tk.x - bx, tk.y - y)); o.infInRubble = inI; o.infSlow = slowI;
    // damage: the same rifleman, same shot, in the rubble vs. the same spot as open ground
    const en = G.teams.find(T => T.id !== me), src = addUnit(en.id, roster(en.fac).barracks[0], c.x + 150, c.y); src.max = src.hp = 1e7;
    const hit = () => { inf.x = c.x; inf.y = c.y; inf.max = inf.hp = 1000; inf.supp = 0; inf.mark = 0; applyDmg(inf, 50, 'gun', en.id, src, false); return { d: 1000 - inf.hp, s: inf.supp }; };
    const tg = tactic(Object.assign(inf, { x: c.x, y: c.y }), 'gun', src, false).tag;
    const r1 = hit(); const sv = { rub: G.rub, n: G.rubN, cov: G.cover }; G.rub = null; G.rubN = 0; G.cover = null; const r0 = hit(); G.rub = sv.rub; G.rubN = sv.n; G.cover = sv.cov;
    o.tag = tg; o.dmgRubble = +r1.d.toFixed(2); o.dmgOpen = +r0.d.toFixed(2); o.suppRubble = +r1.s.toFixed(3); o.suppOpen = +r0.s.toFixed(3);
    src.dead = true;
    // every copy agrees: a client / rejoin / restored checkpoint rebuilds the same rubble from the fallen blocks
    const host = Array.from(G.rub).join(''), gk = G.grid[c.k]; rubSync(); o.syncSame = Array.from(G.rub).join('') === host && G.grid[c.k] === gk;
    const pk = JSON.parse(JSON.stringify(ckEncode())); G.rub = null; G.rubN = 0; ckRestore(pk); o.ckSame = !!G.rub && Array.from(G.rub).join('') === host;
    // knock down a few neighbouring blocks for the pictures
    for (const d of (G.civ || []).filter(q => !q.dead && !q.ruin && Math.hypot(q.x - c.x, q.y - c.y) < 200).slice(0, 5)) collapseCiv(d, me);
    window.__rubC = { x: c.x, y: c.y }; return o;
  });
  console.log('rubble', JSON.stringify(rb));
  ck('rubble: map has a city block to knock down', rb.city);
  if (rb.city) {
    ck('rubble: no rubble grid before any block falls', rb.rubBefore === false);
    ck('rubble: fallen block marks one rubble cell, open to infantry', rb.rubN === 1 && rb.gridOpen && rb.rubCell === 1, JSON.stringify(rb));
    ck('rubble: tank counts as heavy, rifleman does not', rb.heavy && !rb.infHeavy);
    ck('rubble: infantry route crosses the rubble, tank route goes around (longer)', rb.infThru && !rb.tankThru && rb.tankLen > rb.infLen, JSON.stringify(rb));
    ck('rubble: driving tank never enters the rubble and arrives', rb.tankInRubble === 0 && rb.tankArrived < 70, `${rb.tankInRubble} ticks in, ${rb.tankArrived} px off`);
    ck('rubble: rifleman walks through it, slowed', rb.infInRubble > 0 && rb.infSlow < 1, `${rb.infInRubble} ${rb.infSlow}`);
    ck('rubble: infantry inside take about half the damage', rb.tag === 'IN RUBBLE' && rb.dmgRubble > 0 && rb.dmgRubble <= rb.dmgOpen * .55, `${rb.tag} ${rb.dmgRubble} vs ${rb.dmgOpen}`);
    ck('rubble: less suppression inside', rb.suppRubble < rb.suppOpen, `${rb.suppRubble} vs ${rb.suppOpen}`);
    ck('rubble: client/rejoin rebuild matches the host', rb.syncSame);
    ck('rubble: checkpoint restore (host migration) keeps the rubble', rb.ckSame);
    const SH = path.join(ROOT, 'orch', 'shots', 'rubble'); fs.mkdirSync(SH, { recursive: true });
    for (const [lo, f] of [[false, 'rubble-high.png'], [true, 'rubble-low.png']]) {
      await page.evaluate(lo => { SET.gfx = lo ? 'low' : 'high'; G.civDirty = true; G.paused = true; G.sel = []; const C = window.__rubC; centerOn(C.x, C.y, true); cam.td = 420; for (let i = 0; i < 12; i++) renderFrame(0.25); }, lo);   // let the dust settle
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SH, f), timeout: 150000 });
    }
  }
  // ---- Mountain Fortress + Bunker Buster ----
  const ft = await page.evaluate(() => {
    const o = {}, me = ME, T = G.teams[me], en = G.teams.find(t => t.id !== me && !ally(t.id, me)); G.paused = true;
    T.fac = 'RS'; T.F = FACTIONS.RS; T.credits = 99999; const hq = hqOf(me);
    for (const k of ['factory']) if (!done(me, k)) addBld(me, k, hq.x + 200, hq.y, true);
    const spot = [hq.x + 140, hq.y + 140];
    o.allowedKP = bldAllowed('KP', 'fort') && bldAllowed('IR', 'fort') && bldAllowed('DW', 'fort') && bldAllowed('RS', 'fort'); o.deniedUS = !bldAllowed('US', 'fort') && !bldAllowed('TR', 'fort');
    const f = addBld(me, 'fort', spot[0], spot[1], true); const hp0 = f.hp;
    o.second = placeBld(me, 'fort', spot[0] + 200, spot[1], null);   // limit 1
    const foe = addUnit(en.id, 'tank', f.x + 120, f.y), foeA = addUnit(en.id, 'tank', f.x + 120, f.y); foe.max = foe.hp = 1e7;
    for (const w of ['gun', 'at', 'cannon', 'shell', 'boom', 'tower', 'missile', 'bomb', 'super', 'demo']) applyDmg(f, 5000, w, en.id, foe, 1);
    explode(f.x, f.y, 90, 9000, en.id, 'shell', 'bar', foe); explode(f.x, f.y, 90, 9000, en.id, 'super', 'sup', foe);
    o.immune = f.hp === hp0 && !f.dead;
    // units enter and leave like a tunnel
    const inf = addUnit(me, 'inf', f.x + 40, f.y + 40); T.tun = []; enterTunnel(inf); o.entered = T.tun.length === 1 && inf.inTun; o.cap = tunCap(me); inf.hp = inf.max * .5; const h0 = inf.hp; fortHeal(2); o.healed = inf.hp > h0 && inf.hp <= inf.max;
    const out = unloadTunnel(f); o.exited = out && out.length === 1 && !inf.inTun;
    // Bunker Buster
    T.pw.bb = { cd: 0, lv: 1 }; G.t = 100; o.early = usePower(me, 'bb', f.x, f.y);   // not in the first 5 minutes
    G.t = 400; const cr = T.credits; G.teams[en.id].credits = 99999; const E = G.teams[en.id]; E.pw.bb = { cd: 0, lv: 1 };
    o.fired = usePower(en.id, 'bb', f.x, f.y); o.paid = G.teams[en.id].credits === 99999 - 2200; o.cd = E.pw.bb.cd > 0;
    for (let i = 0; i < 70; i++) simUpdate(0.1);
    o.dead = f.dead; o.capAfter = tunCap(me);
    return o;
  });
  console.log('fortress', JSON.stringify(ft));
  ck('fortress: only KP/IR/RS/DW can build it', ft.allowedKP && ft.deniedUS, JSON.stringify(ft));
  ck('fortress: limit of 1 per player', ft.second === false, JSON.stringify(ft));
  ck('fortress: takes 0 damage from guns, cannon, artillery, bombs, superweapons', ft.immune, JSON.stringify(ft));
  ck('fortress: units enter and come out like a tunnel, bigger garrison (24)', ft.entered && ft.exited && ft.cap === 24 && ft.capAfter === 12, JSON.stringify(ft));
  ck('fortress: infantry waiting inside slowly heal', ft.healed, JSON.stringify(ft));
  ck('bunker buster: locked first 5 min, costs $2200, cooldown, destroys the fortress', ft.early === false && ft.fired && ft.paid && ft.cd && ft.dead, JSON.stringify(ft));
  const fc = await page.evaluate(() => {
    const me = ME, hq = hqOf(me), f = addBld(me, 'fort', hq.x + 140, hq.y - 140, true), n = G.ents.filter(e => e.kind === 'fort' && !e.dead).length;
    f.hp = f.max * .45; const pk = JSON.parse(JSON.stringify(ckEncode())); ckRestore(pk);
    const g = G.ents.find(e => e.kind === 'fort' && !e.dead && e.team === me);
    return { n, kept: !!g && Math.abs(g.hp - g.max * .45) < 2, tun: tunCap(me) };
  });
  ck('fortress: checkpoint restore keeps it (and its damage)', fc.kept, JSON.stringify(fc));
  ck('no page errors', !errors.length, errors.join(' / '));
} catch (e) { fails++; console.log('ERROR', e.message); }
await browser.close(); server.close();
console.log(fails ? `EW FAIL (${fails})` : 'EW PASS');   // also covers rubble (destructible cities)
process.exit(fails ? 1 : 0);
