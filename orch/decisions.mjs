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
for (const f of srcFiles.filter(f => /^13/.test(f))) SRC[f].split('\n').forEach((l, i) => { if (/>T'\s*\+|'T'\s*\+\s*r\[0\]/.test(l)) fails.push(`"T<number>" turn shorthand shown to players: ${f}:${i + 1}`); });
// 2. Controls (2026-10-28): W A S D only scroll the camera; A is not attack-move; F is; X is stop.
{ const hits = []; for (const f of srcFiles) SRC[f].split('\n').forEach((l, i) => { for (const m of l.matchAll(/\bkeys\.[wasd]\b/g)) hits.push([f, i + 1, l]); });
  for (const [f, n, l] of hits) ck(/cam\.t[xy]\s*[-+]=/.test(l) || /keys\.[wasd]\s*=/.test(l), `WASD used for something other than the camera: ${f}:${n}`);
  ck(/function genKeys\(\)\{return false;\}/.test(SRC['08-ui.js']), 'genKeys() must stay false: no scheme gives W A S D another job');
  ck(/k==='f'&&G\.sel\.some\(u=>!u\.isB\)\)\{G\.amove=true/.test(SRC['08-ui.js']), 'F must be attack-move');
  ck(!/k==='a'&&G\.sel/.test(SRC['08-ui.js']), 'A must not be attack-move any more');
  ck(/k==='x'\)\{const ids=G\.sel/.test(SRC['08-ui.js']), 'X must be Stop'); }
// 3. Main menu order + naming (2026-11-06 05:58): Grand campaign · Conquest · Missions · Tutorial; no Classic.
{ const m = [...SRC['14-menu.js'].matchAll(/^\s*item\('([^']+)'/gm)].map(x => x[1]).slice(0, 4);
  ck(m.join('|') === 'Grand campaign|Conquest|Missions|Tutorial', 'main menu order is ' + m.join(' · '));
  for (const f of ['14-menu.js', '08d-lobby.js']) ck(!/['">]Classic[<'"]/.test(SRC[f]), 'Classic mode still named in ' + f); }
// 4. Grand-map-only assets are banned from Conquest in the one place that decides it.
ck(/function conqBan\(k\)\{return\(k==='cleric'\|\|k==='fort'\|\|k==='bb'\)/.test(SRC['01-data.js']), 'conqBan must ban cleric, fort and bb');
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
  { const seen = await ev(SEEN); ck(!/classic/i.test(seen), 'menu shows "Classic"'); ck(!/\bhost(ing)?\b/i.test(seen.replace(/ghost/gi, '')), 'menu shows hosting wording: ' + (/.{20}\bhost.{20}/i.exec(seen) || [''])[0]); }
  // ---- data decisions
  const d = await ev(() => { const o = {}; o.fk = FKEYS.slice(); o.ms = MORALE_STYLE; o.rout0 = Object.entries(MORALE_STYLE).filter(([k, s]) => MSTYLES[s].rout === 0).map(([k]) => k).sort().join(' ');
    o.dw = (FACTIONS.DW || {}).name; o.rosterIR = roster('IR').barracks.concat(roster('IR').factory); return o; });
  ck(!d.fk.includes('EU'), 'EU still in FKEYS (retired from menus)');
  ck(d.rout0 === 'BI DW IR KP OB RS RV', 'Zealous (never rout) should be exactly IR RS DW KP RV OB BI, got ' + d.rout0);
  for (const [s, l] of Object.entries({ zeal: 'IR RS DW KP RV', home: 'IN UA CU EG VN BR NG ID JO OM ZA TH', fire: 'AE SA IL', prof: 'RU CN PK US' })) for (const k of l.split(' ')) ck(d.ms[k] === s, `morale style of ${k} should be ${s}, is ${d.ms[k]}`);
  console.log('DW name', d.dw);
  // ---- Conquest battle as IR (the Ayatollah / Mountain Fortress / Bunker Buster live on the grand map only)
  await ev(() => { setup.p = 'IR'; setup.a = 'US'; setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('conquest battle never finished loading'));
  await page.waitForTimeout(2500);
  const cq = await ev(() => { const T = G.teams[ME]; const ban = { cleric: roster(T.fac).barracks.includes('cleric'), fort: bldAllowed(T.fac, 'fort'), bb: conqBan('bb') };
    const shown = ['u_cleric', 'b_fort', 'p_bb', 'p_cleric'].filter(id => { const b = document.getElementById(id); if (!b) return false; return !b.hidden && b.offsetParent !== null; });
    const btns = [...document.querySelectorAll('#panel button, #side button, #bar button, #powers button, button.btn')].filter(b => b.offsetParent).map(b => b.id + ':' + b.textContent.trim().slice(0, 30));
    // WASD must not select, order or toggle anything
    const before = JSON.stringify([G.sel.length, G.amove, G.place, G.aim]); for (const k of ['w', 'a', 's', 'd']) { window.dispatchEvent(new KeyboardEvent('keydown', { key: k })); window.dispatchEvent(new KeyboardEvent('keyup', { key: k })); }
    const after = JSON.stringify([G.sel.length, G.amove, G.place, G.aim]);
    return { ban, shown, conq: !!G.conq, wasd: before === after, btns: btns.slice(0, 40), bodyHas: /Ayatollah|Dear Leader|Mountain Fortress|Bunker Buster/.exec(document.body.innerText || '') }; });
  console.log('conquest', JSON.stringify({ ...cq, btns: cq.btns.length }));
  ck(cq.conq, 'standalone Conquest battle did not start in Conquest mode');
  ck(!cq.ban.cleric, 'Ayatollah (cleric) is in the Conquest roster'); ck(!cq.ban.fort, 'Mountain Fortress is buildable in Conquest'); ck(cq.ban.bb, 'Bunker Buster is not banned in Conquest');
  ck(!cq.shown.length, 'grand-map-only buttons visible in Conquest: ' + cq.shown.join(','));
  ck(cq.wasd, 'W A S D changed selection/orders in a battle (camera only)');
  ck(!cq.bodyHas, 'Conquest HUD text mentions a grand-map-only asset: ' + (cq.bodyHas && cq.bodyHas[0]));
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
  for (let c = 0; c < 4; c++) await ev(() => { for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) if (['cleric', 'fort'].includes(e.kind)) window.__bad.push(e.kind); });
  const sim = await ev(() => [...new Set(window.__bad)]);
  ck(!sim.length, 'AI built banned grand-map-only kinds in Conquest: ' + sim.join(','));
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
  // ---- Fight-it battle: the army you have, nothing to buy/build/tax
  await ev(() => { const pi = GCM.P.findIndex(p => p.land && !p.map && GC.prov[p.i].o === 'IR'); const P = GCM.P[pi], st = GC.prov[pi], an = 'IQ'; const from = P.adj.find(j => GCM.P[j].land);
    const A = grAddArmy(an, from, grGenUnits(grNat(an).fac, 3000, true)); const D = grAddArmy('IR', pi, grGenUnits('IR', 3000, true)); A.at = pi;
    grandBattleStart({ p: pi, an, dn: 'IR', att: [A.id], def: [D.id], garr: true, river: false, mtn: P.t === 'm', done: 0 }); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !!G.grand, null, { timeout: 60000 });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('fight-it battle never finished loading'));
  await page.waitForTimeout(2500);
  const fb = await ev(() => { const shown = [...document.querySelectorAll('button.btn')].filter(b => !b.hidden && b.offsetParent && !b.disabled && /^(b_|u_|g_)/.test(b.id)).map(b => b.id);
    const txt = (document.body.innerText || ''); return { shown, tax: /\bTax\b.*(rate|High|Low)|Invest/i.test(txt) ? (/.{20}(Invest|Tax rate).{20}/i.exec(txt) || [''])[0] : '', money: /\$\s?\d{1,3}(,\d{3})+/.test(txt) ? (/.{15}\$\s?\d{1,3}(,\d{3})+.{10}/.exec(txt) || [''])[0] : '', cr: G.teams[ME].credits, txtA: /Ayatollah|Dear Leader|Bunker Buster/.exec(txt) }; });
  console.log('fight-it', JSON.stringify(fb)); await shot('fightit-hud');
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
