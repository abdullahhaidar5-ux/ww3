// DECISIONS guard (audit): Abdullah's standing decisions that can be checked automatically, so a leftover of something he
// already decided cannot come back (he found "End turn" and the Ayatollah button by hand on 2026-11-06). Static checks read
// src/ (no browser); runtime checks look at the real game as a player: menu, a Conquest battle as IR, the grand map, a Fight-it battle.
//   node orch/decisions.mjs          prints DECISIONS PASS / DECISIONS FAIL; screenshots in orch/shots/audit/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'audit');
const fails = [];
const ck = (c, m) => { if (!c) fails.push(m); };
const srcFiles = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).sort();
const SRC = Object.fromEntries(srcFiles.map(f => [f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')]));

// ---------- static checks ----------
// 0. grand-map figures (2026-11-07 16:37 "No blocky figures even on the grand map"): armies/navies are baked from the real sol_*/ship models only; the box/cylinder figure must not return.
{ const g = SRC['13e-grand3d.js']; ck(!/function g3FigGeo|function g3Soldier|function g3ShipGeo/.test(g), 'grandfigs: blocky box/cylinder army figure code is back in 13e-grand3d.js'); }
// 0b. gclarity (2026-11-07 19:52 "Way too busy … I don't know what the big areas mean"): clean EU4-style map — town pads/fields only at close zoom,
//     one shield per stack, a map key, building chips only on hover; the old per-army count plates and always-on chips must not return.
{ const g = SRC['13e-grand3d.js']; ck(/function g3TownLOD/.test(g) && /g3TownLOD\(cc\.d\)/.test(g), 'gclarity: town LOD (no ground pads at region zoom) is gone');
  ck(/function g3Legend/.test(g) && /WHAT AM I LOOKING AT/.test(g), 'gclarity: the "What am I looking at?" map key is gone');
  ck(/a\.at\+'\|'\+a\.o/.test(g), 'gclarity: armies in one province no longer merge into one shield');
  ck(!/'<\/b><small>'\+\(N\.name\|\|st\.o\)\+' '\+geIcons\(b\.pi\)/.test(g), 'gclarity: building chips are back on every province nameplate'); }
// 1. EU4 real time (2026-11-06 22:30): no "turn" wording in any player-visible string of the grand map files.
{ const lit = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  for (const f of srcFiles.filter(f => /^13/.test(f))) SRC[f].split('\n').forEach((l, i) => {
    if (/^\s*(\/\/|\/\*|\*)/.test(l)) return;
    const bare = l.replace(/\/\*.*?\*\//g, '');
    for (const m of bare.match(lit) || []) { if (m === "'turn'" || m === '"turn"') continue;
      if (/\bturns?\b/i.test(m.replace(/\bturn (back|out|around|into|up|down|over|away|on|off|to)\b/gi, ''))) fails.push(`turn wording (EU4 real time, no turns): ${f}:${i + 1} ${m.slice(0, 80)}`); } }); }
// RANGES (orch/RANGES.md): grand-map strike reach is real km / 14 km per unit, ordered missile = drone > air raid; battle ratios rifle <= tank < ATGM
{ const g = SRC['13i-grandmil.js'] || ''; const km = (k) => +((g.match(new RegExp('GMIL_KM=\\{[^}]*\\b' + k + ':(\\d+)')) || [])[1] || 0);
  ck(km('m') >= 1500 && km('m') <= 2500, 'ranges: missile reach should be ~2,000 km (RANGES.md)'); ck(km('a') >= 700 && km('a') <= 1500, 'ranges: air raid reach should be ~1,000 km'); ck(km('d') >= 1500 && km('d') <= 2500, 'ranges: Shahed-type drone reach should be ~2,000 km'); ck(/GMIL_KMU=14\b/.test(g), 'ranges: grand-map km scale 14 km/unit');
  const d = SRC['01-data.js'] || ''; const r = (k) => +((d.match(new RegExp('\\n\\s*' + k + ':\\{[^\\n]*?\\brng:(\\d+)')) || [])[1] || 0);
  ck(r('tank') && r('atgm') && r('tank') < r('atgm'), 'ranges: tank gun must be shorter than ATGM'); }
for (const f of srcFiles.filter(f => /^13/.test(f))) SRC[f].split('\n').forEach((l, i) => { if (/>T'\s*\+|'T'\s*\+\s*r\[0\]/.test(l)) fails.push(`"T<number>" turn shorthand shown to players: ${f}:${i + 1}`); });
// 2. Controls (2026-10-28): W A S D only scroll the camera; A is not attack-move; F is; X is stop.
{ const hits = []; for (const f of srcFiles) SRC[f].split('\n').forEach((l, i) => { for (const m of l.matchAll(/\bkeys\.[wasd]\b/g)) hits.push([f, i + 1, l]); });
  for (const [f, n, l] of hits) ck(/cam\.t[xy]\s*[-+]=/.test(l) || /keys\.[wasd]\s*=/.test(l), `WASD used for something other than the camera: ${f}:${n}`);
  ck(/function genKeys\(\)\{return false;\}/.test(SRC['08-ui.js']), 'genKeys() must stay false: no scheme gives W A S D another job');
  ck(/k==='f'&&G\.sel\.some\(u=>!u\.isB\)\)\{G\.amove=true/.test(SRC['08-ui.js']), 'F must be attack-move');
  ck(!/k==='a'&&G\.sel/.test(SRC['08-ui.js']), 'A must not be attack-move any more');
  ck(/k==='x'\)\{const ids=G\.sel/.test(SRC['08-ui.js']), 'X must be Stop'); }
// 2b. Camera rotation (2026-11-07 19:54/19:55 "Use Q"): Q rotates the battle camera, Ctrl+A selects the whole army (Q no longer does).
{ const u = SRC['08-ui.js']; ck(!/k==='q'\)G\.sel=/.test(u), 'Q selects the army again (Q = rotate camera, Ctrl+A = all army)');
  ck(/k==='a'&&\(e\.ctrlKey\|\|e\.metaKey\)[^\n]*selectArmy\(\)/.test(u), 'Ctrl+A no longer selects the whole army in battle');
  ck(/k==='q'[^\n]*CROT\.hold=true/.test(u) && /function camRotSnap/.test(u), 'Q no longer rotates the battle camera');
  ck(!/\(Q\)|Q: army/.test(u), 'a tooltip/hint still says Q selects the army'); }
// 3. Main menu order + naming (2026-11-06 05:58): Grand campaign · Conquest · Missions · Tutorial; no Classic.
{ const m = [...SRC['14-menu.js'].matchAll(/^\s*item\('([^']+)'/gm)].map(x => x[1]).slice(0, 4);
  ck(m.join('|') === 'Grand campaign|Conquest|Missions|Tutorial', 'main menu order is ' + m.join(' · '));
  for (const f of ['14-menu.js', '08d-lobby.js']) ck(!/['">]Classic[<'"]/.test(SRC[f]), 'Classic mode still named in ' + f); }
// 4. Grand-map-only assets are banned from Conquest in the one place that decides it.
// (leadersC 2026-11-07 22:38: flipped - they are back in Conquest/Battle for their nations, banned only in grand Fight-it battles: G.grand)
ck(/function conqBan\(k\)\{return\(k==='cleric'\|\|k==='fort'\|\|k==='bb'\)[^}]*!!G\.grand;\}/.test(SRC['01-data.js']) && !/function conqBan[^\n]*G\.conq/.test(SRC['01-data.js']), 'conqBan must ban cleric, fort and bb ONLY when G.grand');
// 5. Names / identity that must not drift.
ck(/Radwan Training/.test(SRC['01-data.js'] + Object.values(SRC).join('')), 'upgrade name "Radwan Training" is gone');
// Shia sub-leader titles are lane AY's open work (PLAN-SAT): reported, not failed, until AY ships; then change warn -> ck.
for (const [w, why] of [['Secretary-General', 'RS leader'], ['Leader of the Revolution', 'DW leader']])
  if (!Object.values(SRC).some(s => s.includes(w))) console.log(`pending (lane AY): "${w}" (${why}) not in the game yet`);
// 6. No hosting wording in the multiplayer menu (2026-10-27): one "Play online" button.
{ const mm = SRC['14-menu.js']; ck(!/Host (a )?(game|battle|match)|Hosting\b/i.test(mm.replace(/\/\/.*$/gm, '')), 'hosting wording in the menu'); ck(/Play online/.test(mm), 'no "Play online" in the menu'); }

// ---------- runtime checks ----------
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromiumPath() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
if (!process.argv.includes('--static')) {
await acquireBrowserLock();
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromiumPath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot = async n => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(() => console.log('  (screenshot skipped ' + n + ')')); };
const ev = (fn, a) => page.evaluate(fn, a);
// text a player can actually see: visible elements only
const SEEN = () => { const out = []; const vis = e => { if (!e.isConnected) return false; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (n.hidden || s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let t; (t = w.nextNode());) { const s = t.nodeValue.trim(); if (s && t.parentElement && vis(t.parentElement)) out.push(s); }
  for (const e of document.querySelectorAll('[title]')) if (vis(e)) out.push(e.title); return out.join(' ¶ '); };
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  // ---- menus as a player
  const menu = await ev(() => [...document.querySelectorAll('#menu button, #menu .mx-item, .mx-item')].filter(b => b.offsetParent).map(b => b.textContent.trim()).filter(Boolean).slice(0, 12));
  console.log('menu items', JSON.stringify(menu)); await shot('menu');
  // THREE GAMES (Abdullah 2026-11-07 21:38): the main menu's big items are exactly Grand campaign, Conquest, Battle (in that order); Missions and Tutorial are smaller items below
  { const big = await ev(() => [...document.querySelectorAll('#mxmenu .mxi')].filter(b => b.offsetParent && !b.hidden && !/\b(dim|sep)\b/.test(b.className)).map(b => b.textContent.trim()).filter(Boolean).slice(0, 4));
    ck(big.slice(0, 3).join('|') === 'Grand campaign|Conquest|Battle', 'main menu big items should be Grand campaign|Conquest|Battle, got ' + big.join('|'));
    const sm = await ev(() => [...document.querySelectorAll('#mxmenu .mxi.dim')].map(b => b.textContent.trim()));
    ck(sm.includes('Missions') && sm.includes('Tutorial'), 'Missions and Tutorial must stay as smaller menu items, got ' + sm.join('|')); }
  { const seen = await ev(SEEN); ck(!/classic/i.test(seen), 'menu shows "Classic"'); ck(!/\bhost(ing)?\b/i.test(seen.replace(/ghost/gi, '')), 'menu shows hosting wording: ' + (/.{20}\bhost.{20}/i.exec(seen) || [''])[0]); }
  // ---- data decisions
  const d = await ev(() => { const o = {}; o.fk = FKEYS.slice(); o.ms = MORALE_STYLE; o.rout0 = Object.entries(MORALE_STYLE).filter(([k, s]) => MSTYLES[s].rout === 0).map(([k]) => k).sort().join(' ');
    o.dw = (FACTIONS.DW || {}).name; o.rosterIR = roster('IR').barracks.concat(roster('IR').factory); return o; });
  ck(!d.fk.includes('EU'), 'EU still in FKEYS (retired from menus)');
  ck(d.rout0 === 'BI DW IR KP OB RS RV', 'Zealous (never rout) should be exactly IR RS DW KP RV OB BI, got ' + d.rout0);
  for (const [s, l] of Object.entries({ zeal: 'IR RS DW KP RV', home: 'IN UA CU EG VN BR NG ID JO OM ZA TH', fire: 'AE SA IL', prof: 'RU CN PK US' })) for (const k of l.split(' ')) ck(d.ms[k] === s, `morale style of ${k} should be ${s}, is ${d.ms[k]}`);
  // leadersC (Abdullah 2026-11-07 22:5x "these factions never rout in any form of the game"): Zealous never rout, retreat, bail out or fall back - in any mode
  { const z = await ev(() => { const out = {}; for (const k of ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI']) out[k] = fearlessT({ fac: k, mart: 0, fervor: 0 }, { s: { cls: 'inf', dom: 'ground' } }); out.US = fearlessT({ fac: 'US', mart: 0, fervor: 0 }, { s: { cls: 'inf', dom: 'ground' } }); return out; });
    for (const k of ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI']) ck(z[k], 'Zealous ' + k + ' can rout in battle (fearlessT false)'); ck(!z.US, 'a non-Zealous nation became unbreakable');
    for (const f of ['03-sim.js', '03b-tactics.js', '13-grand.js']) ck(/msOf\([^)]*\)\.rout[!=]==0|grZealArmy/.test(SRC[f]), 'no Zealous rout guard in ' + f); }
  console.log('DW name', d.dw);
  // ---- Conquest battle as IR (the Ayatollah / Mountain Fortress / Bunker Buster live on the grand map only)
  await ev(() => { setup.p = 'IR'; setup.a = 'US'; setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('conquest battle never finished loading'));
  await page.waitForTimeout(2500);
  const cq = await ev(() => { const T = G.teams[ME]; const ban = { cleric: roster(T.fac).barracks.includes('cleric'), fort: bldAllowed(T.fac, 'fort'), bb: conqBan('bb'), bbIR: sigBan('IR', 'bb'), bbUS: sigBan('US', 'bb'), fortUS: bldAllowed('US', 'fort'), powIR: typeof POWERS.bb === 'object' };
    const shown = ['u_cleric', 'b_fort', 'p_bb', 'p_cleric'].filter(id => { const b = document.getElementById(id); if (!b) return false; return !b.hidden && b.offsetParent !== null; });
    const btns = [...document.querySelectorAll('#panel button, #side button, #bar button, #powers button, button.btn')].filter(b => b.offsetParent).map(b => b.id + ':' + b.textContent.trim().slice(0, 30));
    // WASD must not select, order or toggle anything
    const before = JSON.stringify([G.sel.length, G.amove, G.place, G.aim]); for (const k of ['w', 'a', 's', 'd']) { window.dispatchEvent(new KeyboardEvent('keydown', { key: k })); window.dispatchEvent(new KeyboardEvent('keyup', { key: k })); }
    const after = JSON.stringify([G.sel.length, G.amove, G.place, G.aim]);
    // Q taps turn the view 45 degrees (never the selection); Ctrl+A selects the army; Home resets north-up
    const kd = (key, o) => window.dispatchEvent(new KeyboardEvent('keydown', { key, ...(o || {}) })), ku = (key, o) => window.dispatchEvent(new KeyboardEvent('keyup', { key, ...(o || {}) }));
    G.sel = []; const y0 = cam.tyaw || 0; kd('q'); ku('q'); const y1 = cam.tyaw; const qSel = G.sel.length; CROT.tap = 0; kd('Home'); ku('Home'); const y2 = cam.tyaw;
    const yh0 = cam.yaw || 0; kd('q'); for (let i = 0; i < 2; i++) window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', movementX: 50, bubbles: true })); ku('q'); const drag = (cam.yaw || 0) - yh0; cam.yaw = cam.tyaw = 0;
    kd('a', { ctrlKey: true }); ku('a'); const caSel = G.sel.length; G.sel = [];
    const rot = { q45: Math.abs((y0 - y1) - Math.PI / 4) < 1e-6, qSel, home: Math.abs(y2 % (2 * Math.PI)) < 1e-6, caSel, drag };
    return { ban, shown, conq: !!G.conq, wasd: before === after, rot, btns: btns.slice(0, 40), bodyHas: /Ayatollah|Dear Leader|Mountain Fortress|Bunker Buster/.exec(document.body.innerText || '') }; });
  console.log('conquest', JSON.stringify({ ...cq, btns: cq.btns.length }));
  ck(cq.conq, 'standalone Conquest battle did not start in Conquest mode');
  ck(cq.ban.cleric, 'Ayatollah (cleric) is missing from the Conquest roster for IR'); ck(cq.ban.fort, 'Mountain Fortress is not buildable in Conquest for IR'); ck(!cq.ban.bb, 'Bunker Buster is banned in Conquest');
  ck(cq.ban.bbIR && !cq.ban.bbUS && !cq.ban.fortUS, 'Bunker Buster only for US/IL/RU/CN, Mountain Fortress only for IR/RS/AF/KD/DW/KP: ' + JSON.stringify(cq.ban));
  ck(cq.wasd, 'W A S D changed selection/orders in a battle (camera only)');
  ck(cq.rot && cq.rot.q45 && !cq.rot.qSel && cq.rot.home && cq.rot.drag < -0.3, 'Q tap must turn the camera 45° clockwise (and not select), hold Q + mouse right turns it, Home back to north: ' + JSON.stringify(cq.rot));
  ck(cq.rot && cq.rot.caSel > 0, 'Ctrl+A did not select the army in battle: ' + JSON.stringify(cq.rot));
  await shot('conquest-ir');
  // Balance toggle (Abdullah 2026-11-06 21:31): Balanced must stay equal for everyone; Realistic must tier fire support
  // (superpower strikes come faster/harder and its vehicles are cheaper; a small power's strikes are weaker but its
  // infantry cheaper). Read as data on both settings, with the battle's own setting put back afterwards.
  { const rb = await ev(() => { const rd = () => ({ cd: powInfo('barrage', 'US').cd, cdS: powInfo('barrage', 'OB').cd,
        inf: stats('US', 'inf').cost, infS: stats('OB', 'inf').cost, tank: stats('US', 'tank').cost, tankS: stats('OB', 'tank').cost,
        ch: realSup('US').charge, chS: realSup('OB').charge, dmg: realSup('US').dmg, dmgS: realSup('OB').dmg,
        cash: realMul('US'), cashS: realMul('OB'), tier: [realTierName('US'), realTierName('OB')] });
      const was = G.real; G.real = 0; const bal = rd(); G.real = 1; const real = rd(); G.real = was; return { bal, real }; });
    const B = rb.bal, R = rb.real;
    ck(B.cash === 1 && B.cashS === 1, 'Balanced mode no longer starts every nation on the same money: ' + JSON.stringify(B));
    ck(R.tier[0] === 'Superpower' && R.tier[1] === 'Small power', 'Realistic tiers wrong: ' + R.tier.join('/'));
    ck(R.cd < B.cd && R.ch < B.ch && R.dmg > B.dmg && R.cash > 1 && R.tank < B.tank,
      'Realistic mode does not strengthen the superpower: ' + JSON.stringify([B, R]));
    ck(R.cdS > B.cdS && R.chS > B.chS && R.dmgS < B.dmgS && R.cashS < 1,
      'Realistic mode does not weaken the small power\'s fire support: ' + JSON.stringify([B, R]));
    ck(R.infS < B.infS, 'Realistic mode does not give the small power cheaper infantry: ' + JSON.stringify([B, R])); }
  // Both AIs play 3 game-minutes: nobody may ever build/train a banned kind.
  await ev(() => { for (const T of G.teams) if (!T.ai && typeof mkAI === 'function') T.ai = mkAI(1); window.__bad = []; });
  for (let c = 0; c < 4; c++) await ev(() => { for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) if (e.kind === 'fort' && !FORT_NAT[G.teams[e.team].fac]) window.__bad.push(e.kind); });
  const sim = await ev(() => [...new Set(window.__bad)]);
  ck(!sim.length, 'AI built a signature asset for a nation that does not have it: ' + sim.join(','));
  // ---- BATTLE mode (Generals rules): Command Center + dozer + supply truck, no towns/tax, supply trucks pay
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await ev(() => { setup.p = 'US'; setup.a = 'RU'; setup.n = 1; setup.mode = 'battle'; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('battle-mode game never finished loading'));
  await page.waitForTimeout(1500);
  const bt = await ev(() => { const T = G.teams[ME], mine = G.ents.filter(e => e.team === ME && !e.dead); const c0 = T.credits;
    const blds = mine.filter(e => e.isB).map(e => e.kind), kinds = mine.filter(e => !e.isB).map(e => e.kind);
    for (let i = 0; i < 3600 && !G.over; i++) simUpdate(1 / 60);
    return { battle: !!G.battle, conq: !!G.conq, setupEnd: G.setupEnd, blds, kinds, c0, c1: T.credits, tax: (G.towns || []).some(t => t.tax > 0 && t.ow >= 0), name: typeof modeName === 'function' ? modeName() : '' }; });
  console.log('battle mode', JSON.stringify(bt));
  ck(bt.battle && !bt.conq, 'Battle game did not start in Battle mode');
  ck(bt.blds.join() === 'hq' && bt.kinds.includes('dozer') && bt.kinds.includes('harv'), 'Battle must start with a Command Center + dozer + supply truck only, got ' + bt.blds.join() + ' / ' + bt.kinds.join());
  ck(!bt.setupEnd, 'Battle has a no-fire setup phase'); ck(!bt.tax, 'Battle has town taxes'); ck(bt.c1 > bt.c0, 'Battle: supply trucks brought no income (' + bt.c0 + ' -> ' + bt.c1 + ')'); ck(bt.name === 'Battle', 'mode name in HUD/end screen is "' + bt.name + '"');
  await shot('battle-us');
  // ---- grand map: no turn buttons / turn wording; real-time clock controls exist
  await ev(() => { try { endBattle && 0; } catch (e) {} });
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await ev(() => { grNew({ me: 'IR', seed: 99, len: 'quick' }); grandOpen(); guFit(null); guRedraw(); });
  // A-DATE (orchestrator 2026-11-07, WORLD SIMULATOR): the campaign starts in the world GR_REAL describes (as of Nov 2026), not Jan 2026
  { const d = await ev(() => ({ s: grDateStr(GC.turn, 0), a: GR_REAL.asof }));
    ck(d.s === '1 ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.a[1] - 1] + ' ' + d.a[0], `grand campaign start date ${d.s} does not match GR_REAL as-of ${d.a}`); }
  await page.waitForTimeout(2500); await shot('grand-map');
  const gv = [];
  gv.push(['map', await ev(SEEN)]);
  await ev(() => { GV.sel = GC.nat.IR.cap; guSide(); }); await page.waitForTimeout(600); gv.push(['province', await ev(SEEN)]);
  await ev(() => { const s = GCM.P.findIndex(p => p.sea); GV.sel = s; guSide(); }); await page.waitForTimeout(400); gv.push(['sea zone', await ev(SEEN)]);
  for (const [k, t] of gv) { ck(!/\bturns?\b|End turn|\/turn/i.test(t), `grand map (${k}) shows turn wording: ` + ((/.{25}(\bturns?\b|\/turn).{25}/i.exec(t) || [''])[0])); ck(!/Ayatollah button|Classic/i.test(t), `grand map (${k}) shows a leftover button`); }
  { const btns = await ev(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => (b.textContent + ' ' + (b.title || '')).trim())); ck(!btns.some(b => /end( the)? turn|next turn|\bturn\b/i.test(b)), 'a visible button still talks about turns: ' + btns.find(b => /\bturn\b/i.test(b)));
    ck(await ev(() => !!document.getElementById('gDate')), 'grand map has no clock/date'); }
  // ---- drones fly from the Airfield (Abdullah 2026-11-08); nations without an airfield keep them at the War Factory
  { const d = await ev(() => ['TR', 'UA', 'IR', 'RS'].map(f => [f, stats(f, 'drone').from, roster(f).airfield.includes('drone'), roster(f).factory.includes('drone'), !!FACTIONS[f].noAir]));
    for (const [f, from, inAir, inFac, noAir] of d) { const want = noAir ? 'factory' : 'airfield'; ck(from === want && inAir === (want === 'airfield') && inFac === (want === 'factory'), `drone for ${f} built from ${from} (want ${want})`); } }
  // ---- Fight-it battle: the army you have, nothing to buy/build/tax
  await ev(() => { const pi = GCM.P.findIndex(p => p.land && !p.map && GC.prov[p.i].o === 'IR'); const P = GCM.P[pi], st = GC.prov[pi], an = 'IQ'; const from = P.adj.find(j => GCM.P[j].land);
    const A = grAddArmy(an, from, grGenUnits(grNat(an).fac, 3000, true)); const D = grAddArmy('IR', pi, grGenUnits('IR', 3000, true)); A.at = pi;
    grandBattleStart({ p: pi, an, dn: 'IR', att: [A.id], def: [D.id], garr: true, river: false, mtn: P.t === 'm', done: 0 }); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !!G.grand, null, { timeout: 60000 });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('fight-it battle never finished loading'));
  await page.waitForTimeout(2500);
  const fb = await ev(() => { const shown = [...document.querySelectorAll('button.btn')].filter(b => !b.hidden && b.offsetParent && !b.disabled && /^(b_|u_|g_)/.test(b.id)).map(b => b.id);
    const txt = (document.body.innerText || ''); return { shown, tax: /\bTax\b.*(rate|High|Low)|Invest/i.test(txt) ? (/.{20}(Invest|Tax rate).{20}/i.exec(txt) || [''])[0] : '', money: /\$\s?\d{1,3}(,\d{3})+/.test(txt) ? (/.{15}\$\s?\d{1,3}(,\d{3})+.{10}/.exec(txt) || [''])[0] : '', cr: G.teams[ME].credits, txtA: /Ayatollah|Dear Leader|Bunker Buster/.exec(txt) }; });
  { const g = await ev(() => ({ ban: ['cleric', 'fort', 'bb'].every(k => conqBan(k)), fort: bldAllowed('IR', 'fort'), cl: roster('IR').barracks.includes('cleric'), made: G.ents.some(e => e.kind === 'cleric' || e.kind === 'fort') }));
    ck(g.ban && !g.fort && !g.made, 'signature assets must be OUT of grand Fight-it battles: ' + JSON.stringify(g)); }
  console.log('fight-it', JSON.stringify(fb)); await shot('fightit-hud');
  { const gg = await ev(() => { const tabs = document.querySelector('.tabs'); const T0 = G.teams[ME]; const c0 = T0.credits; return { tabs: !!tabs && tabs.offsetParent !== null, panel: !!document.getElementById('panel') && document.getElementById('panel').offsetParent !== null, enq: enqueue(ME, 'rifle'), enq2: enqueue(ME, 'infantry'), pb: typeof placeBld === 'function' ? placeBld(ME, 'barracks', 10, 10) : false, banner: /your army only/.test(document.body.innerText), cr: c0 === T0.credits }; });
    ck(!gg.tabs && !gg.panel, 'campaign battle still shows the Build/Units tabs or panel'); ck(!gg.enq && !gg.enq2 && !gg.pb, 'campaign battle allows enqueue/placeBld'); ck(gg.banner, 'campaign battle lacks the "army only" banner'); }
  ck(!fb.shown.length, 'Fight-it battle shows ENABLED build/train/upgrade buttons (army only): ' + fb.shown.slice(0, 8).join(','));
  ck(!fb.tax, 'Fight-it battle shows tax/invest UI: ' + fb.tax);
  ck(!fb.txtA, 'Fight-it battle text mentions a grand-map-only asset');
} catch (e) { fails.push('decisions run crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of errs) fails.push(e);
await browser.close(); server.close();
}
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'DECISIONS FAIL (' + fails.length + ')' : 'DECISIONS PASS');
process.exit(fails.length ? 1 : 0);
