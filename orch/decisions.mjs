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
// speedS 2026-11-11: the frame-time governor steps down under load, back up after, never flickers (orch/qualgov.mjs)
{ const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [fileURLToPath(new URL("./qualgov.mjs", import.meta.url))], { encoding: "utf8" }); ck(r.status === 0, "frame-time governor guard failed: " + (r.stdout || "").trim().split("\n").slice(-3).join(" | ")); }

// battlepower 2026-11-14 (Abdullah 2026-11-13 20:11): Battle power comes from Generators, Conquest keeps its map plants (runtime proof: orch/powertest.mjs)
{ const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [fileURLToPath(new URL("./powertest.mjs", import.meta.url))], { encoding: "utf8" }); ck(r.status === 0, "battlepower: orch/powertest.mjs failed - " + String(r.stdout || '').split('\n').filter(l => /FAIL/.test(l)).slice(0, 3).join(' | ')); }
// upgsimple 2026-11-14 (Abdullah 14:31 "simplify the list of upgrades and powers"): upgrades belong to a building (data-from), at most 4 per building, at most 6 active powers per nation, power buildings marked (orch/upgsimple.mjs)
{ const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [fileURLToPath(new URL("./upgsimple.mjs", import.meta.url))], { encoding: "utf8" }); ck(r.status === 0, "upgsimple guard: " + (r.stdout || "").trim().split("\n").slice(0, 4).join(" | ")); }
// techbldgs 2026-11-14 (Abdullah 2026-11-13 20:21 / 20:24): the capturable Battle buildings (quarry, mine, power plant, field hospital) are ONE system on the derrick code: capturable, effect only for the owner, destroyable and repairable, state in the checkpoint; every Battle map has them (symmetry: orch/battlemapfair.mjs --static)
{ const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [fileURLToPath(new URL("./techbldgs.mjs", import.meta.url))], { encoding: "utf8" }); ck(r.status === 0, "capturable Battle buildings rules failed: " + String(r.stdout).slice(0, 400));
  const bm = fs.readFileSync(path.join(ROOT, "src/02d-battlemaps.js"), "utf8"); const ids = [...bm.matchAll(/^  (\w+):\{nm:/gm)].map(x => x[1]); ck(ids.length > 0 && ids.every(id => { const i = bm.indexOf("  " + id + ":{nm:"); return /\n    tb:\[\[/.test(bm.slice(i, i + 1400)); }), "every Battle map must list its capturable buildings (tb:[[x,y,type]])"); }

// Rules files (orch/loadF): CLAUDE.md = short current rules, orch/DECISIONS.md = the full dated record. Every standing decision's
// key words must still be in one of the two files, and CLAUDE.md must stay short.
{ const rules = ['CLAUDE.md', 'orch/DECISIONS.md'].map(f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; } });
  const all = rules.join('\n').toLowerCase();
  const KEYS = ['world simulator', 'what would really happen', 'no decorative or ambient aircraft', 'left-click selects', 'right-click moves', 'attack-move', 'w a s d', 'ctrl+a',
    'rotates the battle camera', 'pointer lock', 'no big ugly buttons', 'radwan training', 'lebanese shia', 'zaidi shia movement', 'iraqi shia brigades', 'palestine islamic brigade',
    'desert islamic faction', 'zealous', 'professional', 'home defenders', 'firepower-reliant', 'mountain fortress', 'bunker buster', 'dear leader', 'ayatollah', 'shared soundtrack',
    'free art only', 'cloudflare', 'servers-live', 'autodeploy', 'play online', 'pc only', 'conquest', 'zero hour', 'supply lines', 'real time with pause', 'fight-it', 'army only',
    'no production', 'realistic start', 'balanced', 'ai hard', 'smooth first', 'one system per idea', 'leftovers', 'grand campaign', 'missions', 'artifact', 'orch/brief.md',
    'orch/decisions.md', 'never read', 'cigate.sh', 'no new runtime dependencies', 'multiplayer', '300 units', 'phone', 'end turn', 'eu4'];
  const miss = KEYS.filter(k => !all.includes(k));
  if (miss.length) fails.push('decisions missing from CLAUDE.md + orch/DECISIONS.md: ' + miss.join(', '));
  const sz = fs.existsSync(path.join(ROOT, 'CLAUDE.md')) ? fs.statSync(path.join(ROOT, 'CLAUDE.md')).size : 0;
  ck(sz > 0 && sz <= 24000, `CLAUDE.md is ${sz} bytes - keep it a tight current-rules file (<= 24000); move history/quotes to orch/DECISIONS.md`);
  ck(rules[0].includes('orch/DECISIONS.md'), 'CLAUDE.md must link orch/DECISIONS.md'); }
// the map sweep must never be skipped for a map change: every src/02*.js (all map files) has to be covered by its trigger in the gate workflow
{ const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/gate.yml'), 'utf8'), m = wf.match(/mapsweep\)[^\n]*\n\s*if git diff --quiet[^\n]*/);
  const mapFiles = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /^02.*\.js$/.test(f));
  if (!m) fails.push('gate.yml: mapsweep skip condition not found (a branch with map changes must always run the sweep)');
  else if (!/'src\/02\*\.js'/.test(m[0])) fails.push('gate.yml: mapsweep skip condition must watch \'src/02*.js\' (every map file: ' + mapFiles.join(', ') + ')'); }
const srcFiles = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).sort();
const SRC = Object.fromEntries(srcFiles.map(f => [f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')]));
// weathergfx 2026-11-14 (Abdullah: weather "Pick in setup + Random", graphics "Low/Med/High/Ultra"): ONE Conditions table (CONDS in 01-data) drives the setup/lobby picker and the Test range picker; Random and unfitting picks resolve through condFit (deterministic from the seed); ONE graphics row (GFX_PRESETS: Low/Medium/High/Ultra), no second quality setting.
{ const d = SRC['01-data.js'] || '', u = SRC['08-ui.js'] || '', s = SRC['03-sim.js'] || '';
  ck(/const CONDS=\[/.test(d) && /function condFit\(/.test(d) && /function condTheme\(/.test(d), 'weathergfx: the Conditions table (CONDS / condFit / condTheme) is gone from 01-data.js');
  ck(/condFit\(wxBase\(o\.w\)/.test(s) && /G\.wxB=wB/.test(s), 'weathergfx: newGame no longer resolves Conditions through condFit (Random and unfitting picks must follow the map and the seed)');
  ck(/function condUI\(/.test(u) && /function sbCond\(/.test(u), 'weathergfx: the setup or Test range Conditions picker is gone from 08-ui.js');
  ck(/const GFX_PRESETS=\[\['low','Low'.*\['auto','Medium'.*\['high','High'.*\['ultra','Ultra'/.test(u), 'weathergfx: Settings graphics row is not Low / Medium / High / Ultra any more');
  ck(!/wxRandIdx\(G\.seed\)===4/.test(s), 'weathergfx: the old "Random = day or night only" rule is back in newGame'); }
// battlerules2 (Abdullah 2026-11-13 21:28): realistic superweapons only, splash-only friendly fire, Brutal AI never cheats.
{ const game = Object.entries(SRC).filter(([f]) => !f.startsWith('13')).map(([, t]) => t).join('\n');
  // 1. no nuclear / chemical / biological weapon anywhere in the game code or data (names, text, effects)
  const bad = game.match(/\b(nuke|nukes|nuclear|atomic|warhead yield|chemical weapon|bioweapon|biological weapon|sarin|anthrax|nerve agent|mustard gas|dirty bomb|radiological)\b/gi);
  ck(!bad, 'no nuclear/chemical/biological weapons (Abdullah 2026-11-13): found ' + (bad && [...new Set(bad)].join(', ')));
  ck(/SW_NAME=\{/.test(SRC['01-data.js']) && !/nuc|chem|bio/i.test((SRC['01-data.js'].match(/SW_NAME=\{[^}]*\}/) || [''])[0]), 'Strike Center names (SW_NAME) must exist and be conventional');
  // 2. splash-only friendly fire: explode() may hurt allied UNITS at reduced strength; direct fire never reaches friendlies
  const ex = (SRC['03-sim.js'].match(/function explode\([^]*?\n  if\(G\.civAt\)/) || [''])[0];
  ck(/FF_SPLASH=\.5/.test(SRC['03-sim.js']) && /const fr=ally\(e\.team,team\)/.test(ex) && /!e\.isB/.test(ex) && /if\(fr\)m\*=FF_SPLASH/.test(ex), 'splash-only friendly fire: explode() hurts allied units at FF_SPLASH (50%), never buildings');
  const dir = (SRC['03-sim.js'].match(/function updProj[^]*?\n(?=function )/) || [''])[0];
  ck(!/ally\([^)]*\)\s*\)?\s*\{?\s*applyDmg/.test(dir), 'bullets must never hit friendlies');
  // 3. Brutal AI = sharper tactics only: same income as Hard, no money/vision/cost bonus anywhere on the difficulty rows
  const row = (SRC['03-sim.js'].match(/DIFF\.push\(Object\.assign\(\{\},DIFF\[2\],\{[^}]*\}\)\);/) || [''])[0];
  ck(row && !/\b(inc|cash|money|credits|bonus|vis|sight|reveal|cost|income)\s*:/.test(row), 'Brutal AI (DIFF[3]) must not touch income, money, vision or cost: ' + row);
  ck(/Brutal/.test(SRC['07-net.js']) && /Brutal/.test(SRC['08-ui.js']), 'Brutal must appear in the lobby (07-net) and Battle setup / Test range (08-ui)');
  ck(!/T\.ai\.d\s*(===|>=)\s*3[^]{0,80}(credits\s*\+=|\.reveals\.push)/.test(SRC['03-sim.js']), 'Brutal AI must not get extra money or vision');
}
// ---- Infiltrator look (Abdullah 2026-11-11 "Make them look like actual spies"): the spy is a plain-clothes figure of its own,
// never drawn as a rifleman - not through the box-figure alias, and with no rifle on the real model.
{ const g = SRC['04-gfx.js'] || '', m = SRC['11-models.js'] || '', alias = (g.match(/const GEO_ALIAS=\{[^}]*\}/) || [''])[0];
  ck(alias && !/\bspy:/.test(alias), "spy look: GEO_ALIAS maps spy to another unit's shape again (it must keep its own plain-clothes figure)");
  ck(/case 'spy:body':/.test(g), 'spy look: the fallback figure for the spy (spy:body) is gone');
  ck(/\bspy:\{m:'soldier'/.test(m) && /function spyKit\(/.test(m) && /function spyPaint\(/.test(m), 'spy look: MCFG.spy / spyKit / spyPaint missing in 11-models');
  const a = m.indexOf("if(kind==='spy'){spyKit("), b = m.indexOf('const rf=solRifle(k)');
  ck(a > 0 && b > a, 'spy look: the spy must leave newSoldierKit before the rifle is made');
  ck(!/solRifle|addKitVariant/.test((m.match(/function spyKit\([\s\S]*?\n\/\/ Civilian colours/) || ['solRifle'])[0]), 'spy look: spyKit gives the spy a rifle or combat kit');
  ck(!/SPYLOOK|SPYC\[/.test(m) && /const SPYC=\{/.test(m), 'spy look: the outfit choice (SPYLOOK / three SPYC outfits) is back - Abdullah chose B, only one look exists');
  ck(/P\.eye\.visible=on/.test(SRC['06-view.js'] || '') && /e\.team===ME/.test(((SRC['06-view.js'] || '').match(/if\(P\.eye\)\{[^\n]*/) || [''])[0]), 'spy look: the hidden-spy eye mark must show for its owner only'); }
// ---- Leader look (Abdullah 2026-11-13 "Make the ayatollah and dear leader more realistic and human looking"): both leader
// units (kind 'cleric': Ayatollah IR/RS/DW, Dear Leader KP) are dressed human figures on the soldier body and skeleton
// (leaderKit), not the old code-built box figure; that one is only a stand-in until the soldier model lands. Fictional
// people only: no spectacles or other features of a real person.
{ const g = SRC['04-gfx.js'] || '', m = SRC['11-models.js'] || '', kit = SRC['08j-uikit.js'] || '', lk = (m.match(/function leaderKit\([\s\S]*?\n\/\/ Civilian colours/) || [''])[0];
  ck(/if\(e\.kind==='cleric'\)return leaderObj\(e\);/.test(g) && !/return clericModel\(e\)/.test(g), 'leader look: makeObj must draw the leader with leaderObj (the human figure), not the old clericModel box figure');
  ck(/\bcleric:\{m:'soldier'/.test(m) && /function leaderObj\(e\)\{[^\n]*modelFor\(e\)/.test(m) && lk.length > 0, 'leader look: MCFG.cleric / leaderObj / leaderKit missing in 11-models');
  ck(/if\(kind==='ldr'\)\{leaderKit\(/.test(m) && m.includes("else if(/\\|ldr\\|v\\d$/.test(key))try{") && /spyPaint\(geo,skel,tex,L\.c,L\.skin[,)]/.test(m), 'leader look: newSoldierKit / mergeSoldier no longer dress and paint the leader');
  ck(/const DL=fac==='KP'/.test(lk) && !/spectacle|glasses|solRifle|addKitVariant/i.test(lk), 'leader look: leaderKit lost the Dear Leader branch, or gives a leader spectacles / a rifle / combat kit');
  ck(/case'ayatollah':case'dearleader':/.test(kit) && /k==='cleric'\)return nm==='Dear Leader'\?'dearleader':'ayatollah'/.test(kit), 'leader look: the leaders lost their own painted command-bar pictures'); }
// ---- One language, idea 3 (2026-11-10 "All"): every button says what it beats. BEATS / WEAK TO come from ONE helper that
// reads the real balance table (matchUp in 01-data); the old hand-written lists (COUNTER, "Beats ... · Loses to ...") must not come back.
{ const d = SRC['01-data.js'] || '', ui = SRC['08-ui.js'] || '', kit = SRC['08j-uikit.js'] || '', enc = SRC['08f-encyclopedia.js'] || '', idn = SRC['08b-identity.js'] || '';
  ck(/function matchUp\(/.test(d) && /function matchR\(/.test(d) && /VS\[a\.wpn\]/.test(d), 'one language 3: matchUp()/matchR() (computed from VS + stats) are gone from src/01-data.js');
  ck(!/\bCOUNTER\s*[=\[]/.test(Object.entries(SRC).filter(([f]) => !f.startsWith('13')).map(e => e[1]).join('\n').replace(/ENC_BCOUNTER|PG_COUNTER/g, '')), 'one language 3: the hand-written COUNTER list is back (use matchUp)');
  const hand = Object.entries(SRC).filter(([f, t]) => /Loses to|'Beats [a-zA-Z]|· Beats [a-zA-Z]/.test(t.replace(/'Beats '\+/g, ''))).map(e => e[0]);
  ck(!hand.length, 'one language 3: hand-written "Beats ... / Loses to ..." text in ' + hand.join(', ') + ' (BEATS / WEAK TO must come from matchUp)');
  ck(/function match\(/.test(kit) && /matchUp\(/.test(kit) && /UK\.match\(T\.fac,k,foeFac\(\),\{mini:1\}\)/.test(ui), 'one language 3: command buttons no longer carry the BEATS / WEAK TO pictures (UK.match in buildPanels)');
  ck(/function ctrTick\(/.test(ui) && /matchBeaters\(/.test(ui) && /ctrTick\(\)/.test(ui.replace(/function ctrTick\(/, '')), 'one language 3: pointing at an enemy no longer lights up the buttons that beat it (ctrTick)');
  ck(/UK\.match\(en\.f,en\.k/.test(enc) && /matchUp\(f,s\.kind,f\)/.test(idn), 'one language 3: Encyclopedia / Unit guide no longer use the computed BEATS / WEAK TO'); }
{ const fh = SRC['08l-firsthint.js'] || '', so = SRC['08b-social.js'] || '', mn = SRC['14-menu.js'] || '';
  ck(/FH_TEXT/.test(fh) && ['Conquest', 'Battle', 'Mission', 'Test range', 'Grand campaign'].every(m => fh.includes("'" + m + "':")), 'polishE: a mode lost its first-steps hint card');
  ck(/const TUTB=\[/.test(so) && /function startBattleTutorial/.test(so) && /startBattleTutorial/.test(mn), 'polishE: the Battle tutorial is gone from the menu'); }
// ---- fortline (Abdullah 2026-11-11 19:02 "only the construction vehicle can build a fortification line, other units just dig in"): the old infantry-builds-lines way must not come back
{ const t = SRC['03b-tactics.js'] || '', u = SRC['08c-tactui.js'] || '';
  ck(/function wallOrder\([^)]*\)\{us=us\.filter\(u=>u&&!u\.dead&&u\.kind==='dozer'\)/.test(t), 'fortline: wallOrder must accept Construction Vehicles only');
  ck(/function tactBuilders\(\)\{return tactOwn\(\)\.filter\(u=>u\.kind==='dozer'\);\}/.test(u), 'fortline: tactBuilders must be Construction Vehicles only');
  ck(!/\.65\)/.test(t.slice(t.indexOf('function dozeWall'), t.indexOf('function trenchSnap'))), 'fortline: the slower infantry build factor is back in dozeWall');
  ck(/pts:\[/.test(t) && /t:'wall',ids:dzs/.test(t) && !/digCan\(e\)&&G\.t-\(e\.mv\|\|-9\)>3/.test(t), 'fortline: the AI builds lines with Construction Vehicles only'); }
// ---- dugout (Abdullah 2026-11-13 20:00 "Make it digging in like garrisoning units in that you have to remove them from the dugout"): Dig in is a garrison, not a stance on the units
{ const t = SRC['03b-tactics.js'] || '', sim = SRC['03-sim.js'] || '', ui = SRC['08c-tactui.js'] || '';
  ck(!/function startDig\(|function digTick\(/.test(t) && !/\bu\.dig\b|\.dig=null|m\.dig\b/.test(t + sim + (SRC['03f-battlefield.js'] || '')), 'dugout: the old Dig-in stance (u.dig / startDig / digTick) is back');
  ck(/case 'dig':digIn\(team,own\(a\.ids\)\)/.test(sim) && /function dugoutMake\(/.test(t) && /type:'garrison',ci:c\.i/.test(t), 'dugout: Dig in must send the squad into a dugout through the garrison order');
  ck(/c\.dug&&c\.dg>G\.t/.test(t) && /enterGarrison\(u,c\)/.test(sim) && !/function enterDugout|function leaveDugout/.test(t + sim), 'dugout: one garrison system - the dugout must reuse enterGarrison / leaveGarrison');
  { const d1 = SRC['01-data.js'] || ''; ck(!/\.digT\b|fx==='dig'|fx:'dig'|troops arrive dug in/.test(t + sim + d1) && !/mods\.dugIn&&isInf/.test(sim), 'dugout (Abdullah 2026-11-13 21:38 "Replace with dugouts only"): the automatic dig-in (30% less damage holding position / paratroops arriving dug in) is back - dugouts are the only way to dig in');
    ck(!/dig in \(30%|troops dig in and fight|name:'Dug In'/.test(d1), 'dugout: a stale "dig in" text / name is back in src/01-data.js'); }
  ck(/dugEnsure\(ck\.civ/.test(SRC['07b-ckpt.js'] || ''), 'dugout: checkpoints / saves must keep dugout slots (dugEnsure in ckRestore)');
  ck(!/foxhole|dig a foxhole/i.test(ui.replace(/\/\*[\s\S]*?\*\//, '')), 'dugout: the Dig in button text still talks about foxholes'); }
// ---- Words (queue item, 2026-11-10): no old faction name, no real group's name and no stale building name in any text a
// player can read. Comments are skipped (history lives there); string literals and templates are checked.
{ const strip = t => t.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, m => m[0] === '/' ? m.replace(/[^\n]/g, ' ') : m);
  const BAD = [[/Mountain Shias?|Coffee Shias?|River Shias?|Olive Brigades?|Black Desert Insurgency/, 'old faction name'],
    [/\bHezbollah\b|\bHouthis?\b|\bHamas\b|\bISIS\b|\bDaesh\b|Popular Mobili[sz]ation Forces|\bHashd\b/i, "a real group's name"],
    [/End turn|Next turn/i, 'turn wording'],
    [/strike centre|defence guns?\b|Missile Defence battery|missile-defence battery|\bwar factory\b/, 'a building called by another name (official: Strike Center, Defense Gun, Anti-Air Missile Site, War Factory)']];
  for (const f of srcFiles) { const t = strip(SRC[f]);
    for (const m of t.matchAll(/'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g)) { const s = m[1] || m[2] || m[3] || ''; if (s.length < 6) continue;
      for (const [re, why] of BAD) { const x = re.exec(s); if (x) ck(false, `words: ${why} in src/${f} line ${t.slice(0, m.index).split('\n').length}: "${s.slice(Math.max(0, x.index - 20), x.index + 40).replace(/\n/g, ' ')}"`); } } } }

// ---- American spelling (Abdullah 2026-11-10 18:17 "American"): no British form in any text a player can read. One word list for this guard and the
// fixer: orch/american.json (run `python3 orch/american.py` to fix; code identifiers, save keys, comments, voice-line files and real proper names are left alone).
{ const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'orch', 'american.json'), 'utf8')), M = Object.assign({}, C.map);
  for (const st0 of C.ise) { const st = st0.replace(/_$/, ''); for (const e of ['ise', 'ised', 'ises', 'ising', 'isation', 'isations', 'iser', 'isers']) M[st + e] = 1; }
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), alt = Object.keys(M).sort((a, b) => b.length - a.length).map(esc).join('|');
  const WRE = new RegExp("(?<![A-Za-z0-9_#.$\\\\/-])(" + alt + ")(" + C.suffix.slice().sort((a, b) => b.length - a.length).map(esc).join('|') + ")(?![A-Za-z0-9_(=])", 'gi');
  const strip = t => t.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, m => m[0] === '/' ? m.replace(/[^\n]/g, ' ') : m);
  let bad = 0;
  for (const f of srcFiles) { if (C.skipFiles.includes(f)) continue; const t = strip(SRC[f]);
    for (const m of t.matchAll(/'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g)) { const s = m[1] || m[2] || m[3] || '';
      if (!/\s/.test(s) && !/^[A-Z][a-z]+$/.test(s)) continue;   // single tokens are keys, a Capitalised word is a label
      for (const x of s.matchAll(WRE)) { if (M[x[0].toLowerCase()] === x[0].toLowerCase()) continue;
        if (C.keep.some(k => { const i = s.indexOf(k); return i >= 0 && i <= x.index && x.index < i + k.length; })) continue;
        if (++bad <= 8) ck(false, `american: British spelling "${x[0]}" in src/${f} line ${t.slice(0, m.index).split('\n').length}: "${s.slice(Math.max(0, x.index - 20), x.index + 30).replace(/\n/g, ' ')}" (python3 orch/american.py fixes it)`); } } }
  if (bad > 8) ck(false, `american: ${bad} British spellings in player-facing text in all (python3 orch/american.py)`); }

// ---- orderfeel (Abdullah 2026-11-13 17:31 "selection rings + order preview, clearer goals on screen"): ONE selection-ring system
// (SELR, instanced, 06d-orderfeel), ONE order-marker system (ORDM, instanced, capped), ONE goal line (cqBanner) - no old per-unit RINGS,
// no order pings through PINGS, no separate mission objectives box.
{ const all = srcFiles.filter(f => !/^13/.test(f)).map(f => SRC[f]).join('\n');
  ck(!/\bRINGS\b/.test(all.replace(/MAP_RINGS/g, '')), 'orderfeel: the old per-unit selection RINGS are back (one ring system: SELR in 06d-orderfeel)');
  { const sf = SRC['06d-orderfeel.js'] || ''; ck(/function selShape[\s\S]{0,700}\b7\b/.test(sf) && !/sh<\.5\)\{[^\n]*fill=/.test(sf) && !/sh<1\.5\)\{[^\n]*fill=/.test(sf), 'ringfix (Abdullah 2026-11-14 "Remove these red rings"): selected units get thin corner brackets only - no filled disc/ellipse under units or buildings'); }
  ck((all.match(/function selRings\(/g) || []).length === 1 && (all.match(/function ordMark\(/g) || []).length === 1, 'orderfeel: selRings / ordMark must exist exactly once');
  for (const f of srcFiles.filter(f => !/^13/.test(f) && f !== '06d-orderfeel.js')) ck(!(/G\.sel/.test(SRC[f]) && /RingGeometry[^\n]{0,200}G\.sel|G\.sel[^\n]{0,200}RingGeometry/.test(SRC[f])), `orderfeel: ${f} draws its own selection ring (use SELR)`);
  const mk = /function mark\(o\)\{[^\n]*\n?[^\n]*/.exec(SRC['08-ui.js'] || '') || [''];
  ck(/ordMark\(/.test(mk[0]) && !/PINGS\.push/.test(mk[0]), 'orderfeel: order markers (mark/markT) must go to ordMark, not PINGS');
  const cap = /ORDM=\{m:null,cap:(\d+)/.exec(SRC['06d-orderfeel.js'] || ''); ck(cap && +cap[1] <= 16, 'orderfeel: order markers need a small cap (ORDM.cap <= 16)');
  ck(!/campHud/.test(all), 'orderfeel: the old mission objectives box (campHud) is back - missions use the goal line'); }
// ---- American voices (Abdullah 2026-11-13 20:08 "Americans sound British"): the US unit voices are cloned from public-domain American recordings
// (tools/voices/refs, credits in CREDITS.md), never the old studio speakers; the credits text names the source. Render recipe: orch/reports/usvoice.md.
{ const cast = JSON.parse(fs.readFileSync(path.join(ROOT, 'orch', 'vo', 'cast.json'), 'utf8')).US || {};
  const ids = [].concat(cast.sold || [], cast.cmd || []);
  ck(ids.length >= 3 && ids.every(v => /^clone:us_[a-z]+$/.test(v)), 'usvoice: the US cast must use the cloned American voices (clone:us_*): ' + JSON.stringify(ids));
  for (const v of new Set(ids)) ck(fs.existsSync(path.join(ROOT, 'tools', 'voices', 'refs', v.slice(6) + '.flac')), 'usvoice: missing reference clip for ' + v);
  ck(/US unit voices[^<]{0,200}public.domain/i.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), 'usvoice: menu credits do not name the American voice source'); }

// ---------- static checks ----------
// polishP2 "Never lose progress": one save system. Battles autosave into 3 rolling slots (08d-save.js), the grand campaign saves on a timer and before every
// Fight-it battle into 3 rolling copies (13-grand.js grSnap), and the menu's Continue (first item) covers both. Runtime proof: orch/polishtest.mjs (gate/save).
{ const sv = SRC['08d-save.js'] || '', g = SRC['13-grand.js'] || '', m = SRC['14-menu.js'] || '';
  ck(/\['auto','auto2','auto3'\]/.test(sv) && /setInterval\(\(\)=>\{try\{svAutoTick\(\)/.test(sv), 'progress: battle autosave (3 rolling slots on a timer) is gone from 08d-save.js');
  ck(/function grSnap\(/.test(g) && /grSnap\(\);return grBattlePrompt\(b\)/.test(g) && /function grAutoTick\(/.test(g), 'progress: grand campaign timer autosave / safety copy before Fight-it is gone from 13-grand.js');
  ck(/function svGrandInfo\(/.test(sv) && /MX\.cont=item\(/.test(m) && m.indexOf('MX.cont=item(') < m.indexOf("item('Grand campaign'") + (m.indexOf("item('Grand campaign'") < 0 ? 1e9 : 0) && m.indexOf('MX.cont=item(') < m.indexOf("item('Single player'") + (m.indexOf("item('Single player'") < 0 ? 1e9 : 0), 'progress: Continue must be the first item of the menu list and cover Conquest/Battle saves, and the campaign save only when it is the only one');
}
// Living main menu (idea 9, Abdullah 2026-11-10 "Let's go all of them"; finished by helper finish-menu): the menu background shows YOUR war - whatever Continue would resume.
//   campaign save -> the map around your nation + your last battle (grWarTable / grLastB -> the save's '.i' note); battle save -> that battlefield with the front line (svFront in the
//   save's list entry); no save -> the calm world-map picture. The menu never loads the campaign code for it. ONLY idea 9: named veterans (8) and battle scars (11) are NOT in the game,
//   and none of this is campaign state or checkpoint data (display notes only). Runtime proof: orch/smoke.mjs (lazy page: with a campaign save, with a battle save, with no save).
{ const g = SRC['13-grand.js'] || '', m = SRC['14-menu.js'] || '', sv = SRC['08d-save.js'] || '', ck7 = SRC['07b-ckpt.js'] || '', all = Object.values(SRC).join('\n');
  ck(/function grWarTable\(lb\)/.test(g) && /wt=grWarTable\(lb\)/.test(g) && /function grLastB\(/.test(g) && /function grSettle\(b,win,how\)\{[^\n]*grLastB\(b,win\)/.test(g), 'living menu: the save note no longer carries the war-table sketch or your last battle (grWarTable / grLastB in 13-grand.js)');
  ck(!/GC\.scars|grScar\(|GC\.lastB|GC\.vets|grVeteran/.test(all), 'living menu: battle scars / named veterans (ideas 11 and 8) must stay out - no GC.scars, grScar, GC.vets in src/');
  ck(!/GR_LASTB|svFront|grWarTable|\bwt\b/.test(ck7), 'living menu: the last-battle note and the front sketch are display notes - they must not enter the checkpoint (src/07b-ckpt.js)');
  ck(/function svFront\(\)/.test(sv) && /thumb:svThumb\(\),wt:svFront\(\)/.test(sv) && !/ckEncode\(\)[^\n]*svFront/.test(sv), 'living menu: a battle save must carry the front sketch in its list entry only (svMeta wt:svFront() in 08d-save.js)');
  const f = (m.match(/function mxWarSrc\(\)[\s\S]*?\nfunction mxShown/) || [''])[0];
  ck(f && /svGrandInfo/.test(f) && /svLatest/.test(f) && !/loadGrand|grLoad|grMap|GCM|GM_P|grNew|\bGC\b/.test(f), 'living menu: mxWarSrc / mxWarTable must draw from the save notes only (no campaign code)');
  ck(/async function svMenuSync\(\)[\s\S]{0,900}mxWarTable\(\)/.test(sv) && /function mxShown\(first\)\{[^\n]*svMenuSync\(\)/.test(m), 'living menu: the background must be redrawn whenever the menu is shown (mxShown -> svMenuSync -> mxWarTable)');
}
// polishP2 "Settings": the one key table (src/06z-keys.js KEYTAB) lists every key the battle handlers listen to; the Keyboard keys window (08m-controls.js) shows that table.
//     A hotkey added to a handler without a row fails here. W A S D are camera-only and never rebindable. Runtime proof: orch/polishtest.mjs (gate/save).
{ const kt = SRC['06z-keys.js'] || '', ui = SRC['08-ui.js'] || '', all = Object.entries(SRC).filter(([f]) => /^0[689]/.test(f) || f === '03i-leaders.js').map(x => x[1]).join('\n');
  const defs = new Set([...kt.matchAll(/ctx:'battle'[^}]*def:'(.)'/g)].map(m => m[1]));
  ck(defs.size >= 24 && /KB_FIXED='wasd'/.test(kt) && !['w', 'a', 's', 'd'].some(k => defs.has(k)), 'keys: the key table is gone or W A S D became rebindable');
  const hk = ui.slice(ui.indexOf("window.addEventListener('keydown',e=>{if(e.target&&(e.target.tagName==='INPUT'"), ui.indexOf("window.addEventListener('keyup'"));
  const used = new Set([...hk.matchAll(/k==='([a-z])'/g)].map(m => m[1])); for (const m of all.matchAll(/POW_KEY(?:=\{([^}]*)\}|\.\w+='(.)')/g)) { if (m[2]) used.add(m[2]); else for (const x of m[1].matchAll(/:'(.)'/g)) used.add(x[1]); }
  for (const m of all.matchAll(/e\.key==='([a-z])'\|\|e\.key==='[A-Z]'/g)) used.add(m[1]);
  const miss = [...used].filter(k => !defs.has(k) && k !== 'a'); ck(used.size >= 20 && !miss.length, 'keys: hotkey(s) without a row in the one key table (src/06z-keys.js): ' + miss.join(' '));
  ck(/function kbuOpen\(/.test(SRC['08m-controls.js'] || '') && /for\(const r of KEYTAB\)/.test(SRC['08m-controls.js'] || ''), 'keys: the Keyboard keys window must list KEYTAB'); }
// polishP2 "Campaign panels": one frame + one Esc handler for every grand-map panel (src/13zzz-gpanels.js GPAN, list in orch/reports/panels.md).
//     A grand module must not bring its own Escape handler or its own "✕" close button back; every GPAN row is ticked in panels.md.
{ const gp = SRC['13zzz-gpanels.js'] || '', rep = (() => { try { return fs.readFileSync(path.join(ROOT, 'orch/reports/panels.md'), 'utf8'); } catch { return ''; } })();
  const ids = [...gp.matchAll(/\{id:'(\w+)',name:/g)].map(m => m[1]); ck(ids.length >= 11 && /function gpxEsc\(/.test(gp) && /function gpxDress\(/.test(gp), 'panels: the grand panel registry (GPAN) is gone');
  const noRow = ids.filter(i => !new RegExp('\\[x\\][^\\n]*#' + i + '\\b').test(rep)); ck(!noRow.length, 'panels: GPAN rows not ticked in orch/reports/panels.md: ' + noRow.join(', '));
  const own = Object.entries(SRC).filter(([f, t]) => /^13/.test(f) && f !== '13zzz-gpanels.js' && (/key===?'Escape'/.test(t) || /['">]✕<\/button>|,'(Close )?✕'\)/.test(t))).map(x => x[0]);
  ck(!own.length, 'panels: grand module(s) with their own Esc handler or close button (use GPAN in 13zzz-gpanels.js): ' + own.join(', ')); }
// polishP2 "Readability": one text-size switch (SET.ts 100/115/130 %, src/08n-readable.js TS_ROOTS) that every panel root is listed in, and colour-blind mode
//     carries team identity by shape too (minimap, selection rings, town name plates, allies list). Runtime proof: orch/polishtest.mjs section 4 (1366x768 + 1920x1080).
{ const rd = SRC['08n-readable.js'] || '', idn = SRC['08b-identity.js'] || '', tw = SRC['08c-towns.js'] || '';
  ck(/const TS_STEPS=\[1,1\.15,1\.3\]/.test(rd) && ['#side', '.overlay>.card', '#mx', '.gpx', '#gTop', '#gSide', '#kbWin .kbcard'].every(r => rd.includes("'" + r + "'")), 'readability: the text-size setting or one of its panel roots is gone (src/08n-readable.js TS_ROOTS)');
  ck(/const ID_CB=\[/.test(idn) && /function idMiniMark\(/.test(idn) && (tw.match(/if\(SET\.cb\)\{try\{idMiniMark\(/g) || []).length >= 2 && /function cbGlyph\(/.test(rd), 'readability: colour-blind mode must mark teams by shape on the minimap, town name plates and allies list'); }
// extras-battle idea 10 "Commander's radio" (Abdullah 2026-11-10 19:28 "Let's go all of them"): ONE text feed for every report. pushLog (08-ui.js) hands every
//     line to radFeed (09b-radio.js): at most 3 lines, ~6 s, a kind icon, click / Space = camera to the place. The separate subtitle box (#radsub) must not return,
//     pushLog must not build feed lines itself, and Space must be a row of the one key table. Runtime proof: orch/radioshots.mjs.
{ const rd = SRC['09b-radio.js'] || '', ui = SRC['08-ui.js'] || '', pl = ui.slice(ui.indexOf('function pushLog('), ui.indexOf('function rivals('));
  ck(/function radFeed\(m,k,x,y,nat\)/.test(rd) && /el\.children\.length>3/.test(rd) && /\},6000\)/.test(rd) && /function radJump\(/.test(rd), "radio: the commander's radio feed (radFeed: 3 lines, 6 s, radJump) is gone from 09b-radio.js");
  ck(!/radsub|radSub/.test(Object.values(SRC).join('\n')), 'radio: the separate radio subtitle box (#radsub) is back - the feed is the one place for report text');
  ck(/radFeed\(m,k,x,y,nat\)/.test(pl) && !/createElement/.test(pl.replace(/createElement\('small'\)/, '')), 'radio: pushLog must send every line to radFeed and build no feed of its own');
  ck(/k===' '&&[^;]*radJump\(\)/.test(ui) && /last radio report',fix:'Space'/.test(SRC['06z-keys.js'] || ''), 'radio: Space = look at the last radio report must be handled in 08-ui.js and listed in the key table');
  ck(/function log\(team,msg,kind,x,y\)/.test(SRC['03-sim.js'] || '') && /log\(team,msg,kind,x,y\)\{if\(team===ME\)pushLog\(msg,kind,x,y\)/.test(SRC['05-fx3d.js'] || ''), 'radio: reports must carry their place from the sim log to the feed'); }
// extras-command 15 "Edge alerts" (2026-11-10 19:32 "All except 17"): ONE alert source (pushLog with a place, + the team ping) feeds the edge arrows; max 3; view only.
{ const hud = SRC['08i-hud.js'] || '', ui = SRC['08-ui.js'] || '', sim = SRC['03-sim.js'] || '', cmd = SRC['08g-command.js'] || '';
  const et = hud.slice(hud.indexOf('function edgeAlert('), hud.indexOf('const WHATS_NEW'));
  ck(/function pushLog\(m,k,x,y\)/.test(ui) && /edgeAlert\(m,k,x,y\)/.test(ui) && /function log\(team,msg,kind,x,y\)/.test(sim), 'edge alerts: pushLog(m,k,x,y) must stay the one source of positioned alerts (sim log -> pushLog -> edgeAlert)');
  ck(/'r:base',e\.x,e\.y\)/.test(sim) && /'r:lost',e\.x,e\.y\)/.test(sim) && /complete\.`,'g',b\.x,b\.y\)/.test(sim), 'edge alerts: under attack / unit lost / building finished must carry their place');
  ck(/FXH\.mping=[^\n]*edgeAlert\(/.test(cmd), 'edge alerts: an ally ping must raise an edge arrow');
  ck(/MAX:3\}/.test(hud) && et.length > 400 && !/doAct\(|G\.ents\.push|addUnit\(|\bG\.t\s*[-+]?=/.test(et), 'edge alerts: max 3 arrows, and the display must never touch the simulation');
  ck(/SET\.edgeAl===0/.test(et) && /'sEdgeAl','edgeAl'/.test(hud) && /'sRadio','radio'/.test(hud) && /SET\.radio===0/.test(SRC['09b-radio.js'] || '') && /body\.inMenu #log,/.test(hud) && /body\.inMenu #edgeAl/.test(hud), 'radio + edge alerts: each needs its own Settings switch (sRadio / sEdgeAl) and both must be hidden in menus');
  ck(!/'[^'\n]*[Aa]rmour[^'\n]*','r:/.test(Object.values(SRC).join('\n')), 'radio: report lines use American spelling (armor, never armour)');
  ck((hud.match(/function edgeAlert\(/g) || []).length === 1 && !Object.entries(SRC).some(([f, t]) => f !== '08i-hud.js' && /EDGE\.a\.(push|unshift)\(/.test(t)), 'edge alerts: one alert list only (08i-hud.js)'); }
// 0. grand-map figures (2026-11-07 16:37 "No blocky figures even on the grand map"): armies/navies are baked from the real sol_*/ship models only; the box/cylinder figure must not return.
{ const g = SRC['13e-grand3d.js']; ck(!/function g3FigGeo|function g3Soldier|function g3ShipGeo/.test(g), 'grandfigs: blocky box/cylinder army figure code is back in 13e-grand3d.js'); }
// 0a. Game feel (2026-11-09 22:44): shell impacts match the surface (water spray / road chips / the map's soil) and tanks rock when they fire.
{ const f = SRC['05-fx3d.js'], v = SRC['06-view.js'];
  ck(/function impactSurf\(/.test(f) && /function splashFX\(/.test(f) && /if\(wet\)splashFX\(x,y,s,big\)/.test(f), 'game feel: explosions no longer check the surface they hit (water spray is gone)');
  ck(/if\(!wet\)scorch\(x,y,s\)/.test(f), 'game feel: explosions scorch the water surface again');
  ck(/ud\.rock=fz/.test(v) && /o\.rotation\.z=tp\+ud\.sp\+fz/.test(v), 'game feel: the hull no longer rocks when the gun fires'); }
// 0b. gclarity (2026-11-07 19:52 "Way too busy … I don't know what the big areas mean"): clean EU4-style map — town pads/fields only at close zoom,
//     one shield per stack, a map key, building chips only on hover; the old per-army count plates and always-on chips must not return.
{ const g = SRC['13e-grand3d.js']; ck(/function g3TownLOD/.test(g) && /g3TownLOD\(cc\.d\)/.test(g), 'gclarity: town LOD (no ground pads at region zoom) is gone');
  ck(/function g3Legend/.test(g) && /WHAT AM I LOOKING AT/.test(g), 'gclarity: the "What am I looking at?" map key is gone');
  ck(/const k=a\.at\+'\|'\+\(st==='march'/.test(SRC['13e3-gtokens.js'] || '') && /g3Tokens\(tier\)/.test(g), 'gclarity: armies in one province no longer merge into one marker (the army token stack, src/13e3-gtokens.js)');
  ck(!/'<\/b><small>'\+\(N\.name\|\|st\.o\)\+' '\+geIcons\(b\.pi\)/.test(g), 'gclarity: building chips are back on every province nameplate'); }
// 0c. One look for everything (2026-11-09 22:44): every battle model material goes through the ONE shared material library (src/11c-look.js);
//     a second place that hands out its own roughness/metalness for borrowed models must not come back.
{ const m = SRC['11-models.js'], l = SRC['11c-look.js'] || '';
  ck(/lookApply\(c,key,team,m\);map\.set\(m,c\)/.test(m), 'one-look: tintedProto no longer sends every material through lookApply (src/11c-look.js)');
  ck(/lookShader\(m,sh\)/.test(m) && /u\.look\|\|''/.test(m), 'one-look: the weathering shader / merge signature lost the look class');
  for (const c of ['metal', 'canvas', 'concrete', 'mudbrick', 'sand', 'rubber', 'glass']) ck(new RegExp('\\b' + c + ':\\{r:').test(l), 'one-look: surface class "' + c + '" is missing from LOOK.cls');
  for (const f of ['IR', 'RS', 'DW', 'RV', 'IL', 'SA', 'US']) ck(new RegExp('\\b' + f + ":\\['#").test(l), 'one-look: Middle East slice nation ' + f + ' has no wall palette in LOOK.wall');
  ck(/ambientCG\.com \(CC0\)/.test(l) && /Poly Haven \(CC0\)/.test(l), 'one-look: the CC0 texture credits line is gone'); }
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
// Army Standards (Abdullah 2026-11-10 19:17 "Go"): armies on the grand map are ONE round token each (src/13e3-gtokens.js); the far/middle-zoom figure blobs, shield badges and per-army waving flags must not come back (the small on-land figures stay in the close view only; a flag only on the selected army — behaviour guard in orch/grandtest.mjs)
{ const all = srcFiles.filter(f => /^13/.test(f)).map(f => SRC[f]).join('\n'); for (const n of ['g3FarGeo', 'g3FarCol', 'g3FarHide', 'gtkMinis', 'gtkFigures']) ck(!new RegExp('\\b' + n + '\\b').test(all), 'Army Standards: old army drawing code is back in src/13*: ' + n);
  ck(!/#g3ui \.p[ .{:]/.test(all), 'Army Standards: the old shield-badge CSS (#g3ui .p) is back'); ck(/function g3Tokens\(/.test(SRC['13e3-gtokens.js'] || ''), 'Army Standards: src/13e3-gtokens.js (g3Tokens) is missing');
  ck(/G3\.tier===2\|\|sel\)\)continue/.test(SRC['13e-grand3d.js']) && /if\(fl&&fl\.visible&&sel\)/.test(SRC['13e-grand3d.js']), 'Army Standards: g3Batch must draw figures only in the close view (or for the selected army) and a flag only on the selected army');
  ck(/gtkEst\(/.test(all) && /grSideVal\(grSideUnits\(b,'att'\),0\)\*grIdeaMul\(b\.an,'attack'\)/.test(all), 'Army Standards: odds pills must use the auto-resolve strength terms (gtkEst)'); }
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
// 2c. Test range (2026-11-13 19:59): both nations are chosen in its window; the old auto-pick of the target is gone; the battle panel can reopen the window.
{ const u = SRC['08-ui.js'], mn = SRC['14-menu.js'];
  ck(!/function startSandbox\(\)/.test(u) && !/FKEYS\.find\(k=>k!==setup\.p&&k!=='RS'/.test(u), 'Test range still auto-picks the target nation');
  ck(/scr\('t-range'/.test(mn) && /item\('Test range',\(\)=>mxTrOpen\(false\)/.test(mn), 'Test range menu item does not open the nation window');
  ck(/id='sbNations'/.test(u) && /Change nations/.test(u), 'Test range battle panel lost the "Change nations..." item'); }
// 2d. Test range = Battle rules (Abdullah 2026-11-14 13:51 "Make test range mirror battle"): no sandbox-only supply/ammo/tech/build-speed shortcuts left in the sim.
{ const S3 = SRC['03-sim.js'];
  ck(!/G\.sandbox&&u\.team===0\)u\.am=u\.amx/.test(S3) && !/let ins=!!\(G\.sandbox/.test(S3), 'Test range still refills ammo / forces supply (must behave like Battle)');
  ck(!/G&&G\.sandbox&&t===0/.test(S3) && !/G&&G\.sandbox&&T\.id===0\)t\/=6/.test(S3) && !/m===2&&G\.sandbox/.test(S3), 'Test range still skips the tech tree, builds 6x faster or ignores build-spot rules');
  ck(/G\.battle=!!o\.battle&&!o\.camp&&!o\.grand;/.test(S3) && /if\(o\.sandbox\)o\.battle=1;/.test(S3), 'newGame must make a sandbox a Battle game (G.battle true)');
  ck(/oos=[^;]*!G\.battle&&/.test(SRC['06-view.js']), 'out-of-supply badge rule changed'); }
// 3. Main menu order + naming (2026-11-07 21:41): Single player · Multiplayer · Test range, then small extras; no Classic.
{ const m = [...SRC['14-menu.js'].matchAll(/^\s*item\('([^']+)'/gm)].map(x => x[1]).filter(Boolean).slice(0, 3);
  ck(m.join('|') === 'Single player|Multiplayer|Test range', 'main menu order is ' + m.join(' · '));
  for (const f of ['14-menu.js', '08d-lobby.js']) ck(!/['">]Classic[<'"]/.test(SRC[f]), 'Classic mode still named in ' + f); }
// 4. Grand-map-only assets are banned from Conquest in the one place that decides it.
// (leadersC 2026-11-07 22:38: flipped - they are back in Conquest/Battle for their nations, banned only in grand Fight-it battles: G.grand)
ck(/function conqBan\(k\)\{return\(k==='cleric'\|\|k==='bb'\)[^}]*!!G\.grand;\}/.test(SRC['01-data.js']) && !/function conqBan[^\n]*G\.conq/.test(SRC['01-data.js']), 'conqBan must ban cleric and bb ONLY when G.grand (the pre-built grand Mountain Fortress stays)');
// 5. Names / identity that must not drift.
ck(/Radwan Training/.test(SRC['01-data.js'] + Object.values(SRC).join('')), 'upgrade name "Radwan Training" is gone');
// Shia sub-leader titles are lane AY's open work (PLAN-SAT): reported, not failed, until AY ships; then change warn -> ck.
for (const [w, why] of [['Secretary-General', 'RS leader'], ['Leader of the Revolution', 'DW leader']])
  if (!Object.values(SRC).some(s => s.includes(w))) console.log(`pending (lane AY): "${w}" (${why}) not in the game yet`);
// 6. No hosting wording in the multiplayer menu (2026-10-27): one "Play online" button.
{ const mm = SRC['14-menu.js']; ck(!/Host (a )?(game|battle|match)|Hosting\b/i.test(mm.replace(/\/\/.*$/gm, '')), 'hosting wording in the menu'); ck(/Play online/.test(mm), 'no "Play online" in the menu'); }

// BATTLE MAPS (Abdullah 2026-11-11 19:40 / 20:14: Battle gets its own maps; every map fun and fair): every listed Battle map
// passes the structural fairness checks (symmetric supply, derricks, routes; 2+ attack routes; all starts reachable), and the
// Conquest list is the same list as before (Battle maps are never mixed into it).
{ const { spawnSync } = await import('node:child_process'); const r = spawnSync(process.execPath, [path.join(ROOT, 'orch/battlemapfair.mjs'), '--static'], { encoding: 'utf8' });
  ck(r.status === 0 && /BATTLEMAPFAIR STATIC PASS/.test(r.stdout || ''), 'a listed Battle map fails the structural fairness checks: ' + (r.stdout || r.stderr || '').trim().split('\n').filter(l => /FAIL|differ|fewer|only|cannot|not equally/.test(l)).slice(0, 6).join(' | '));
  const bm = SRC['02d-battlemaps.js'] || ''; ck(/for\(const id in BMAPS\)bmRegister\(id,BMAPS\[id\]\)/.test(bm) && !/MAP_KEYS\.push/.test(bm), 'Battle maps must register through bmRegister and never join the Conquest list (MAP_KEYS)');
  ck(/cmBuild\(c,key\)/.test(bm) && /cmCanon\(/.test(bm), 'Battle maps must load through the map editor loader (cmCanon / cmBuild): one map system'); }
// GROUND LOOK (Abdullah 2026-11-13 20:05 "This ground texture is too cartoony"): battle ground uses the real CC0 photo ground
// set (TERR_DET2: sand, cracked earth, rocky soil, packed dirt) in the terrain shader; every terrain detail texture is
// mipmapped (no shimmer); the road mask is drawn smooth from the road curves (no 16-unit staircase); no hairline crack strokes.
{ const gx = SRC['04-gfx.js'] || '', mp = SRC['02-map.js'] || '';
  ck(/^const TERR_DET2=\{a:'data:image\/webp;base64,/m.test(gx) && /b:mk\(TERR_DET2\.a,2176\),m:mk\(TERR_DET2\.n,2176\)/.test(gx) && /sh\.uniforms\.tdB=\{value:TD\.b\}/.test(gx) && /tdM2\(tdB,/.test(gx), 'terrain must use the real ground texture set TERR_DET2 (groundreal)');
  const mk = (/function terrDetTex\(\)\{[^\n]*/.exec(gx) || [''])[0]; ck(/minFilter=THREE\.LinearMipmapLinearFilter/.test(mk) && !/generateMipmaps=false/.test(mk), 'terrain detail textures must be mipmapped');
  const rt = (/function roadTex\(\)\{[\s\S]*?return ROADT=t;\}/.exec(gx) || [''])[0]; ck(/G\.roadDraw/.test(rt) && /LinearMipmapLinearFilter/.test(rt) && /RD_C=4;/.test(gx), 'road mask must be drawn from the road curves at 4 units per texel, mipmapped');
  ck(/const TERR_CRACKS=false/.test(mp), 'hairline crack strokes on the painted ground must stay off (stair-stepped dark lines)');
  ck(!/x\.fillRect\(1,i,14,2\.2\)/.test(SRC['05-fx3d.js'] || ''), 'hard-edged track print texture is back (stair-stepped tracks)'); }

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
  // BATTLE MAP LIST (Abdullah 2026-11-11 19:40): Battle setup offers the Battle map list; Conquest keeps its own list untouched (116 battlefields on 2026-11-13)
  { const L = await ev(() => { const opts = () => [...document.getElementById('mapSel').options].map(o => o.value).filter(k => !/^cm_/.test(k)); mxSetMode('conquest'); const c = opts(), cm = setup.map; mxSetMode('battle'); const b = opts(), bmap = setup.map, facts = BM_KEYS.map(k => bmInfo(k)); mxSetMode('conquest');
      return { c, cm, b, bmap, back: setup.map, keys: MAP_KEYS.slice(), bk: BM_KEYS.slice(), facts }; });
    ck(L.bk.length >= 1 && L.b.join() === L.bk.join() && /^bm_/.test(L.bmap), 'Battle setup must offer the Battle map list, got ' + L.b.slice(0, 8).join(',') + ' (chosen ' + L.bmap + ')');
    ck(L.c.join() === L.keys.join() && L.keys.length >= 116 && !L.keys.some(k => /^bm_/.test(k)) && !/^bm_/.test(L.cm) && !/^bm_/.test(L.back), 'Conquest map list changed: ' + L.c.length + ' options, ' + L.keys.length + ' maps, chosen ' + L.cm + ' / ' + L.back);
    ck(L.facts.every(f => f && f.name && f.players >= 2 && f.size && f.theme && f.desc && f.supply >= 2 * f.players && f.oil >= 2), 'every Battle map needs a name, player count, size, theme, one line, supply sources and oil derricks'); }
  // MENU STRUCTURE (Abdullah 2026-11-07 21:41 "There's a single player window or section and then multiplayer and test range", "These are distinct"; 21:38 three games): the top level is exactly Single player, Multiplayer, Test range (+ small extras)
  { const big = await ev(() => [...document.querySelectorAll('#mxmenu .mxi')].filter(b => b.offsetParent && !b.hidden && !/\b(dim|sep)\b/.test(b.className) && !/^Continue/.test(b.textContent.trim())).map(b => ((b.firstChild||{}).textContent||'').trim()).filter(Boolean));
    ck(big.join('|') === 'Single player|Multiplayer|Test range', 'main menu top level should be exactly Single player|Multiplayer|Test range, got ' + big.join('|'));
    const sm = await ev(() => [...document.querySelectorAll('#mxmenu .mxi.dim')].map(b => b.textContent.trim()));
    ck(sm.every(t => /^(Settings|Extras|Credits)/.test(t)), 'only Settings/Extras/Credits may be small top-level extras, got ' + sm.join('|'));
    const all = await ev(() => [...document.querySelectorAll('#mxmenu .mxi')].map(b => ((b.firstChild||{}).textContent||'').trim()));
    for (const bad of ['Grand campaign', 'Conquest', 'Battle', 'Missions', 'Tutorial', 'Play online']) ck(!all.includes(bad), 'game mode "' + bad + '" must not be on the top level');
    await ev(() => menuGo('single'));
    const sp = await ev(() => [...document.querySelectorAll('#ms-single .mxi')].filter(b => !b.hidden).map(b => ((b.firstChild||{}).textContent||'').trim()));
    ck(sp.filter(t => /^(Grand campaign|Conquest|Battle)$/.test(t)).join('|') === 'Conquest|Battle' && sp.includes('Missions') && sp.includes('Tutorial') && sp.includes('Load game') && !sp.some(t => /^Grand campaign/.test(t)), 'Single player should list Conquest|Battle then Missions, Tutorial, Load game and NO Grand campaign (paused 2026-11-13), got ' + sp.join('|'));
    ck(await ev(() => [...document.querySelectorAll('#ms-single .mxi')].filter(b => !b.hidden).every(b => b.querySelector('small'))), 'every Single player item needs a one-line description');
    // Test range (Abdullah 2026-11-13 19:59 "Why can't I choose nations in test range"): the top-level item opens a small nation window, it does not start at once
    await ev(() => { menuGo('title'); }); await page.waitForTimeout(700);
    await ev(() => [...document.querySelectorAll('#mxmenu .mxi')].find(b => ((b.firstChild || {}).textContent || '').trim() === 'Test range').click()); await page.waitForTimeout(900);
    { const tr = await ev(() => ({ on: MX.cur === 't-range' && document.getElementById('ms-t-range').classList.contains('on'), nat: !!document.querySelector('#ms-t-range #pickP .fac'), tgt: !!document.querySelector('#ms-t-range #aiFac'), map: !!document.querySelector('#ms-t-range #mxtrmap'), start: !!document.querySelector('#ms-t-range .mxfoot button'), inGame: !!(typeof G !== 'undefined' && G) }));
      ck(tr.on && tr.nat && tr.tgt && tr.map && tr.start && !tr.inGame, 'opening Test range must show the nation choice window (your nation, target, map, Start) and not start a battle: ' + JSON.stringify(tr)); }
    await ev(() => { menuGo('title'); });
    await ev(() => menuGo('online'));
    const mpg = await ev(() => [...document.querySelectorAll('#ms-online #mxolg .mxi')].map(b => ((b.firstChild||{}).textContent||'').trim()));
    ck(mpg.join('|') === 'Conquest|Battle', 'Multiplayer should offer Conquest|Battle only (campaign paused 2026-11-13), got ' + mpg.join('|'));
    ck(await ev(() => typeof mxOnline === 'function' && typeof gnLobbyStart === 'function' && !!document.getElementById('jcode')), 'Multiplayer needs the campaign lobby + join box');
    await ev(() => mxOnline('campaign')); ck(await ev(() => !!document.getElementById('mxCampNew')), 'a campaign invite link must still open the campaign lobby (gnLobby)');
    await ev(() => { menuGo('title'); }); await ev(() => menuGo('online')); ck(await ev(() => MX.olG !== 'campaign' && !document.getElementById('mxCampNew')), 'Multiplayer must open on Conquest/Battle, not the paused campaign');
    await ev(() => menuGo('extras')); const ext = await ev(() => [...document.querySelectorAll('#ms-extras .mxi')].map(b => b.textContent.trim()));
    ck(ext.some(t => /^Grand campaign \(preview, paused\)/.test(t)), 'Extras must list Grand campaign (preview, paused), got ' + ext.join('|'));
    await ev(() => { grandMenu(); }); await page.waitForTimeout(300);
    const gm = await ev(() => [...document.querySelectorAll('#campScreen button')].map(b => b.textContent.trim()));
    ck(!gm.some(t => /Play with friends|Join friends/i.test(t)), 'the grand campaign menu must not have its own online lobby, got ' + gm.join('|'));
    await ev(() => { try { campClose(); } catch (e) {} menuHome(); });
    // sweepfixA: the nation cards carry no native tooltip (the detail panel shows the doctrine); the battlefield picker never opens with a blank tile
    await ev(() => { try { facCards(); } catch (e) {} });
    ck(await ev(() => { const c = [...document.querySelectorAll('#pickP .fac')]; return c.length > 0 && c.every(b => !b.hasAttribute('title')); }), 'nation cards must have no title attribute (native tooltip duplicates the detail panel)');
    await ev(() => { menuGo('c-map'); }); await page.waitForTimeout(150);
    ck(await ev(() => { const c = [...document.querySelectorAll('.mxmap')]; return c.length > 0 && c.every(b => b.querySelector('.mxth .mxph') && b.querySelector('.mxth canvas')); }), 'every battlefield card needs a placeholder + thumbnail canvas right after opening');
    await ev(() => { menuHome(); }); }
  { const seen = await ev(SEEN); ck(!/classic/i.test(seen), 'menu shows "Classic"'); ck(!/\bhost(ing)?\b/i.test(seen.replace(/ghost/gi, '')), 'menu shows hosting wording: ' + (/.{20}\bhost.{20}/i.exec(seen) || [''])[0]); }
  // ---- data decisions
  const d = await ev(() => { const o = {}; o.fk = FKEYS.slice(); o.ms = MORALE_STYLE; o.rout0 = Object.entries(MORALE_STYLE).filter(([k, s]) => MSTYLES[s].rout === 0).map(([k]) => k).sort().join(' ');
    o.dw = (FACTIONS.DW || {}).name; o.rosterIR = roster('IR').barracks.concat(roster('IR').factory); return o; });
  ck(!d.fk.includes('EU'), 'EU still in FKEYS (retired from menus)');
  // ---- nations20 (Abdullah 2026-11-13 20:31-20:33): exactly 22 playable nations (Keep 22, 2026-11-14), in every picker
  { const W = 'IR RS DW RV OB US GB FR DE IL UA RU CN KP IN JP KR PK SA AE TR EG'.split(' ').sort().join(' ');
    ck(d.fk.slice().sort().join(' ') === W, 'FKEYS must be exactly the 22 nations (' + W + '), got ' + d.fk.slice().sort().join(' '));
    const pk = await ev(() => { try { facCards(); } catch (e) {} const names = k => k.map(x => x.trim()); const cards = [...document.querySelectorAll('#pickP .fac')].map(b => (b.querySelector('.nm') || b).textContent.trim());
      const opt = [...document.querySelectorAll('#aiFac option')].map(o => o.value).sort().join(' '); const nm = FKEYS.map(k => FACTIONS[k].name).sort();
      return { cards: cards.slice().sort(), nm, opt, fix: ['IQ', 'SY', 'IN', 'KR', 'CU', 'BI', 'EU', 'DE', 'PL', 'AU', 'CA', 'JP', 'AF', 'KD', 'ZZ'].map(f => FKEYS.includes(natFix(f))) }; });
    ck(pk.cards.join('|') === pk.nm.join('|'), 'Battle setup nation picker must show exactly the 22 nations, shows: ' + pk.cards.join(', '));
    ck(pk.opt === W, 'AI nation select must list exactly the 22, lists: ' + pk.opt);
    ck(pk.fix.every(Boolean), 'natFix must map every removed nation (old saves/slots) to a kept nation'); }
  ck(d.rout0 === 'BI DW IR KP OB RS RV', 'Zealous (never rout) should be exactly IR RS DW KP RV OB BI, got ' + d.rout0);
  for (const [s, l] of Object.entries({ zeal: 'IR RS DW KP RV', home: 'IN UA CU EG VN BR NG ID JO OM ZA TH', fire: 'AE SA IL', prof: 'RU CN PK US' })) for (const k of l.split(' ')) ck(d.ms[k] === s, `morale style of ${k} should be ${s}, is ${d.ms[k]}`);
  console.log('DW name', d.dw);
  // ---- Conquest battle as IR (the Ayatollah / Mountain Fortress / Bunker Buster live on the grand map only)
  await ev(() => { setup.p = 'IR'; setup.a = 'US'; setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('conquest battle never finished loading'));
  await page.waitForTimeout(2500);
  // ghostslot 2026-11-14 (Abdullah 2026-11-13 19:58 "this was a 2 player battle why are the zaidis in this game"): a game has exactly the players the setup showed - the hidden militia team is never a scoreboard column; Battle has no world-opinion row
  { const gs = await ev(() => { const real = G.teams.filter(T => !T.reb).length, S = endStats(0), nm = G.teams.length - real;
      esPage(S); const cols = [...document.querySelectorAll('#endStats .esC')].length, dts = [...document.querySelectorAll('#endStats .esC dt')].map(d => d.textContent);
      const old = JSON.parse(JSON.stringify(S)); old.p.push(Object.assign({}, old.p[0], { f: 'DW', tm: 900 })); old.a.push([]); esPage(old); const colsOld = document.querySelectorAll('#endStats .esC').length;
      esPage(null); return { mode: G.battle ? 'battle' : 'conquest', n: G.N, real, extra: nm, sp: S.p.length, sa: S.a.length, cols, colsOld, opinion: dts.includes('World opinion'), wrap: !!document.querySelector('#endStats .esC dt') }; });
    console.log('ghost team', JSON.stringify(gs)); ck(gs.real === 2 && gs.sp === 2 && gs.sa === 2, 'a 2-player ' + gs.mode + ' game must have exactly 2 teams in its end stats: ' + JSON.stringify(gs));
    ck(gs.cols === 2 && gs.colsOld === 2, 'scoreboard columns must equal the real players (a militia/ghost team must never get one): ' + JSON.stringify(gs)); ck(gs.opinion === !gs.mode.startsWith('b'), gs.mode + ' scoreboard world-opinion row is wrong: ' + JSON.stringify(gs)); }
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
  // leadersC (Abdullah 2026-11-07 22:5x "these factions never rout in any form of the game"): Zealous never rout, retreat, bail out or fall back - in any mode
  { const z = await ev(() => { const out = {}; for (const k of ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI']) out[k] = fearlessT({ fac: k, mart: 0, fervor: 0 }, { s: { cls: 'inf', dom: 'ground' } }); out.US = fearlessT({ fac: 'US', mart: 0, fervor: 0 }, { s: { cls: 'inf', dom: 'ground' } }); return out; });
    for (const k of ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI']) ck(z[k], 'Zealous ' + k + ' can rout in battle (fearlessT false)'); ck(!z.US, 'a non-Zealous nation became unbreakable');
    for (const f of ['03-sim.js', '03b-tactics.js', '13-grand.js']) ck(/msOf\([^)]*\)\.rout[!=]==0|grZealArmy/.test(SRC[f]), 'no Zealous rout guard in ' + f); }
  ck(cq.conq, 'standalone Conquest battle did not start in Conquest mode');
  { const cl = await ev(() => { let n = 0; const c = new Proxy({}, { get: (t, k) => k === 'canvas' ? document.createElement('canvas') : k === 'measureText' ? () => ({ width: 10 }) : (typeof k === 'string' && /^(stroke|fill|moveTo|lineTo|arc|drawImage|fillRect|fillText)$/.test(k)) ? () => { n++; } : () => {}, set: () => true }); try { drawLogiMini(c, .1, .1); } catch (e) {} return n; });
    ck(cl > 0, 'Conquest lost its supply lines on the minimap (battleclean: only Battle drops them)'); }
  // battleclean 2026-11-12 (Abdullah 2026-11-11 19:46 "I started conquest without a full base and 10k"): Conquest starts with a full base and $10,000 for every team
  { const cb = await ev(() => G.teams.filter(t => !t.reb).map(t => ({ f: t.fac, c: Math.round(t.credits - (G.t * 2.5)), k: G.ents.filter(e => e.isB && e.team === t.id && e.built >= 1 && e.kind !== 'garrison').map(e => e.kind).sort().join('+'), air: bldAllowed(t.fac, 'airfield'), ai: !!t.ai })));   // AI teams start buying at once, so only a human's money is checked at second 0
    for (const t of cb) { if (!t.ai) ck(Math.abs(t.c - 10000) <= 60, 'Conquest start money for ' + t.f + ' is not $10,000: ' + t.c); for (const k of ['hq', 'barracks', 'factory', 'depot']) ck(t.k.split('+').includes(k), 'Conquest start base of ' + t.f + ' misses ' + k + ': ' + t.k); if (t.air) ck(t.k.includes('airfield'), 'Conquest start base of ' + t.f + ' misses the airfield'); }
    ck(cb.length >= 2 && cb.every(t => t.k.split('+').filter(x => x === 'hq').length === 1), 'Conquest teams must each start with one HQ'); }
  ck(cq.ban.cleric, 'Ayatollah (cleric) is missing from the Conquest roster for IR'); ck(cq.ban.fort, 'Mountain Fortress is not buildable in Conquest for IR'); ck(!cq.ban.bb, 'Bunker Buster is banned in Conquest');
  ck(cq.ban.bbIR && !cq.ban.bbUS && !cq.ban.fortUS, 'Bunker Buster only for US/IL/RU/CN, Mountain Fortress only for IR/RS/AF/KD/DW/KP: ' + JSON.stringify(cq.ban));
  ck(cq.wasd, 'W A S D changed selection/orders in a battle (camera only)');
  ck(cq.rot && cq.rot.q45 && !cq.rot.qSel && cq.rot.home && cq.rot.drag < -0.3, 'Q tap must turn the camera 45° clockwise (and not select), hold Q + mouse right turns it, Home back to north: ' + JSON.stringify(cq.rot));
  ck(cq.rot && cq.rot.caSel > 0, 'Ctrl+A did not select the army in battle: ' + JSON.stringify(cq.rot));
  await shot('conquest-ir');
  // bldqueue (Abdullah 2026-11-13 20:15 "make units que and must be built in their home building ... like generals"): every production building has its own queue
  { const r = await ev(() => { const T = G.teams[ME], out = {}; T.credits = 90000; const b1 = G.ents.find(e => e.isB && e.team === ME && e.kind === 'barracks' && e.built >= 1 && !e.dead);
      const b2 = addBld(ME, 'barracks', b1.x + 260, b1.y + 40, 1); b1.q = []; b2.q = []; const k = roster(T.fac).barracks[0], cost = stats(T.fac, k).cost; out.noShared = T.q === undefined;
      const c0 = T.credits; out.addOk = enqueue(ME, k, b2.id); out.b2n = b2.q.length; out.b1n = b1.q.length; dequeue(ME, k, b2.id, 0); out.refund = Math.round(T.credits - c0); out.emptyAfter = b2.q.length;
      enqueue(ME, k, b1.id); enqueue(ME, k, b2.id); out.par = [b1.q.length, b2.q.length]; out.pick = qPick(ME, 'barracks') === null ? 0 : 1;
      const maxId = Math.max(...G.ents.map(e => e.id)); production(prodTime(T, stats(T.fac, k)) + 1);
      const nu = G.ents.filter(e => !e.isB && e.id > maxId && e.kind === k && e.team === ME); out.spawned = nu.length;
      out.near = nu.map(u => [Math.hypot(u.x - b1.x, u.y - b1.y) < 140, Math.hypot(u.x - b2.x, u.y - b2.y) < 140]);
      out.emptied = [b1.q.length, b2.q.length]; out.rem = G.ents.filter(e => !e.isB && e.id > maxId && e.team === ME).length;
      for (let i = 0; i < 3; i++) enqueue(ME, k, b2.id); const c1 = T.credits; out.paid = b2.q.reduce((s, i) => s + i.c, 0); kill(b2, 1 === ME ? 0 : 1); out.destroyRefund = Math.round(T.credits - c1); out.destroyQ = b2.q.length; out.cost = cost; return out; });
    console.log('bldqueue', JSON.stringify(r));
    ck(r.noShared, 'the shared per-type queue T.q must be gone (each production building has its own queue)');
    ck(r.addOk && r.b2n === 1 && r.b1n === 0, 'a unit queued on Barracks 2 must sit in that building only: ' + JSON.stringify(r));
    ck(r.refund === 0 && r.emptyAfter === 0, 'cancel must refund the full price (net 0): ' + JSON.stringify(r));
    ck(r.par && r.par[0] === 1 && r.par[1] === 1, 'two Barracks must each hold their own queue: ' + JSON.stringify(r.par));
    ck(r.spawned === 2 && r.emptied[0] === 0 && r.emptied[1] === 0, 'two Barracks must build two infantry at the same time (both queues empty after one build time): ' + JSON.stringify(r));
    ck(r.near.length === 2 && r.near.some(n => n[0] && !n[1]) && r.near.some(n => !n[0] && n[1]), 'each unit must come out of the building whose queue made it: ' + JSON.stringify(r.near));
    { const u = await ev(() => { const T = G.teams[ME]; T.credits = 90000; const b1 = G.ents.find(e => e.isB && e.team === ME && e.kind === 'barracks' && e.built >= 1 && !e.dead), k = roster(T.fac).barracks[0], maxId = Math.max(...G.ents.map(e => e.id)); b1.q = [];
        let ok = 0; for (let i = 0; i < 20; i++) if (enqueue(ME, k, b1.id)) ok++; const n0 = b1.q.length; for (let i = 0; i < 25; i++) production(prodTime(T, stats(T.fac, k)) + 1);
        return { ok, n0, left: b1.q.length, out: G.ents.filter(e => !e.isB && e.id > maxId && e.team === ME && e.kind === k).length }; });
      ck(u.ok === 20 && u.n0 === 20 && u.left === 0 && u.out === 20, 'a Barracks queue is unlimited: 20 queued infantry must all come out of it: ' + JSON.stringify(u)); }
    ck(r.paid > 0 && r.destroyRefund === r.paid && r.destroyQ === 0, 'destroying a Barracks must refund its whole queue: ' + JSON.stringify({ paid: r.paid, got: r.destroyRefund })); }
  { const s3 = SRC['03-sim.js']; ck(!/1\+\.5\*\(bl\.length-1\)/.test(s3) && !/bl\[Math\.floor\(Math\.random\(\)\*bl\.length\)\]/.test(s3), 'production: the +50% per extra building and the random spawn building are gone (bldqueue)');
    ck(!/tun:\[\],q:\{/.test(s3), 'mkTeam must not carry a shared queue (bldqueue)'); }
  // fixes1 (2026-11-11): the hover card of a build button must really show what the unit beats and what it is weak to: at least one
  // picture + name in each row (a stale screenshot showed the two row labels with nothing in them). Real mouse hover on a button.
  { await ev(() => { window.__tab0 = TAB; showTab('units'); }); await page.waitForTimeout(300);
    const bx = await ev(() => { const b = document.getElementById('u_at') || document.getElementById('u_inf'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(bx.x - 20, bx.y); await page.mouse.move(bx.x, bx.y, { steps: 3 }); await page.waitForTimeout(500);
    const hc = await ev(() => { const d = document.getElementById('ctip'), out = { hover: !!d && !d.hidden, bad: [] }; const rows = () => [...d.querySelectorAll('.uk-mu .mr')].map(r => { const q = d.getBoundingClientRect();
        return r.querySelector('b').textContent + ':' + [...r.querySelectorAll('.mi')].filter(m => { const im = m.querySelector('img'), i = m.querySelector('i'), a = im && im.getBoundingClientRect(), t = i && i.getBoundingClientRect();
          return a && t && a.width > 8 && a.height > 8 && i.textContent.trim().length > 1 && t.width > 8 && t.height > 4 && t.right <= q.right + 1 && t.bottom <= q.bottom + 1 && getComputedStyle(m).visibility !== 'hidden' && +getComputedStyle(m).opacity > .5; }).length; });
      out.first = out.hover ? rows() : [];
      for (const k of ['inf', 'at', 'tank', 'aa', 'arty']) { const b = document.getElementById('u_' + k); if (!b) continue; ctipShow(b); const r = rows(); if (!(r.length === 2 && r.every(x => +x.split(':')[1] >= 1))) out.bad.push(k + ' ' + r.join(' ')); } ctipHide(); return out; });
    ck(hc.hover && hc.first.length === 2 && hc.first.every(x => +x.split(':')[1] >= 1), 'hovering a unit button does not show a card with at least one named unit under BEATS and under WEAK TO: ' + JSON.stringify(hc.first));
    ck(!hc.bad.length, 'hover card of a combat unit has an empty BEATS or WEAK TO row: ' + hc.bad.join(' | ')); await page.mouse.move(640, 300); await ev(() => showTab(window.__tab0)); }
  // fixes1 (2026-11-11): a friendly soldier standing in front of a house must not swallow the order: with infantry selected, a real
  // right-click on him over a house sends the squad INTO the house (it used to become a plain move; the tutorial's "retake the town" step hung on it).
  { const hs = await ev(() => { const cells = G.towns.flatMap(t => t.cells).filter(c => !c.dead && !c.g).sort((a, b) => { const h = G.ents.find(e => e.team === ME && e.kind === 'hq'); return Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y); });
      for (const c of cells.slice(0, 6)) for (const [dx, dy] of [[0, 24], [24, 0], [0, -24], [-24, 0], [0, 34], [34, 0]]) { const p = nearestPassXY('ground', c.x + dx, c.y + dy); if (!p || Math.hypot(p[0] - c.x, p[1] - c.y) > 60) continue;
        const q = nearestPassXY('ground', c.x + dx * 3, c.y + dy * 3); if (!q) continue; const blk = addUnit(ME, 'inf', p[0], p[1]), u = addUnit(ME, 'inf', q[0], q[1]); if (!blk || !u) continue; return { c: c.i, cx: c.x, cy: c.y, blk: blk.id, u: u.id }; } return null; });
    if (!hs) fails.push('house-click guard: no free house with walkable ground next to it'); else {
      await ev((h) => { centerOn(h.cx, h.cy, true); G.sel = [G.ents.find(e => e.id === h.u)]; }, hs); await ev(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const pt = await ev((h) => { const b = G.ents.find(e => e.id === h.blk); for (const k of [.6, .3, .9, 0]) { const p = toScreen(b.x, unitH(b) + entHeightMid(b) * k, b.y), t = pickAt(p.x, p.y, false), c = civUnder(p.x, p.y, screenToWorld(p.x, p.y)); if (t === b && c && c.i === h.c) return { x: p.x, y: p.y }; } return null; }, hs);
      if (!pt) console.log('  (house-click guard skipped: the soldier at the door is not in front of the house from this camera)'); else {
        await page.mouse.move(pt.x, pt.y); await page.mouse.click(pt.x, pt.y, { button: 'right' }); await page.waitForTimeout(400);
        const r = await ev((h) => { const u = G.ents.find(e => e.id === h.u), c = G.civ[h.c]; return { order: u && u.order ? u.order.type : '', inside: !!(c.occ && c.occ.some(o => o.id === h.u)) }; }, hs);
        ck(r.order === 'garrison' || r.inside, 'right-click on a house with a friendly soldier standing in front of it does not send the selected infantry into the house: ' + JSON.stringify(r)); }
      await ev((h) => { for (const id of [h.blk, h.u]) { const e = G.ents.find(x => x.id === id); if (e) { e.dead = true; G.byId.delete(id); } } const c = G.civ[h.c]; if (c.g && c.occ.some(o => o.id === h.u)) { try { leaveGarrison(c); } catch (e) {} } G.sel = []; }, hs); } }
  // sweepfixB (2026-11-13 slice sweep, findings 2/3/5; CLAUDE.md "Command bar text big and readable", small elegant buttons):
  // at 1280 wide no order button is cut ("Attac…"), the order rows sit in one dock above the command bar, an army without a
  // Construction Vehicle shows no road tools; the nation nameplate fits on one line for every nation; Settings and the
  // Victory/Defeat screen hide the battle HUD top bar.
  { await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(700);
    const o = await ev(() => { const T = G.teams[ME], R = roster(T.fac), ks = []; for (const c in R) for (const k of R[c]) { const s = stats(T.fac, k); if (s.dom === 'ground' && s.dmg > 0 && k !== 'dozer') ks.push(k); }
      const h = G.ents.find(e => e.team === ME && e.isB && !e.dead), add = []; for (let i = 0; i < 6; i++) add.push(addUnit(ME, ks[i % Math.min(ks.length, 3)], h.x + 120 + i * 16, h.y + 90));
      const doz = G.ents.find(e => e.team === ME && !e.dead && e.kind === 'dozer'), out = {}, side = document.getElementById('side').getBoundingClientRect();
      const look = sel => { G.sel = sel; updateUI(); const bs = [...document.querySelectorAll('#info .cmdrow button')].filter(b => b.offsetParent);
        return { n: bs.length, cut: bs.filter(b => b.scrollWidth > b.clientWidth + 1 || /…|\.\.\./.test(b.textContent)).map(b => b.textContent), low: bs.filter(b => b.getBoundingClientRect().bottom > side.top + 1).map(b => b.textContent),
          docks: document.querySelectorAll('#info .orddock').length, road: !!document.querySelector('#info .cmdrow.lgr'), keys: bs.filter(b => b.querySelector('kbd')).map(b => b.querySelector('kbd').textContent).join('') }; };
      out.army = look(add.slice()); out.mixed = look(add.concat(doz ? [doz] : [])); out.doz = doz ? look([doz]) : null;
      const fn = document.getElementById('facname'), bad = [];
      for (const k of FKEYS) { fn.textContent = FACTIONS[k].name; fitText(fn, 11); const fs = parseFloat(getComputedStyle(fn).fontSize), r = fn.getBoundingClientRect(); if (fn.scrollWidth > fn.clientWidth + 1 || r.height > fs * 1.7 || fs < 11) bad.push(k + ':' + FACTIONS[k].name + '@' + fs); }
      out.plate = bad; fn.dataset.k = ''; G.sel = []; updateUI();
      const hidden = () => { const b = document.getElementById('hudBar'); return !b || getComputedStyle(b).visibility === 'hidden'; };
      out.hud0 = !hidden(); openSettings(); out.hudSet = hidden(); document.getElementById('settings').hidden = true;
      const en = document.getElementById('end'); en.hidden = false; out.hudEnd = hidden(); en.hidden = true; out.hud1 = !hidden();
      for (const u of add) { u.dead = true; G.byId.delete(u.id); } G.ents = G.ents.filter(e => !add.includes(e)); return out; });
    console.log('order dock', JSON.stringify({ army: o.army.n + ' ' + o.army.keys, mixed: o.mixed.n, doz: o.doz && o.doz.n, plate: o.plate.length }));
    for (const k of ['army', 'mixed', 'doz']) { const x = o[k]; if (!x) continue;
      ck(x.n > 0 && !x.cut.length, 'order buttons cut at 1280 wide (' + k + '): ' + x.cut.join(' | '));
      ck(!x.low.length, 'order buttons overlap the command bar (' + k + '): ' + x.low.join(' | '));
      ck(x.docks === 1, 'order rows must sit in one dock (' + k + '), found ' + x.docks); }
    ck(!o.army.road, 'an army without a Construction Vehicle shows the road-tool row');
    ck(o.army.keys.includes('F') && o.army.keys.includes('X') && o.army.keys.includes('G'), 'order buttons must show their hotkeys, got ' + o.army.keys);
    ck(!o.plate.length, 'nation nameplate does not fit on one line at 1280 wide: ' + o.plate.join(', '));
    ck(o.hud0 && o.hudSet && o.hudEnd && o.hud1, 'battle HUD top bar must hide under Settings and the Victory/Defeat screen (and come back): ' + JSON.stringify([o.hud0, o.hudSet, o.hudEnd, o.hud1]));
    await page.setViewportSize({ width: 1600, height: 900 }); await page.waitForTimeout(500); }
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
    ck(R.cd < B.cd && R.ch < B.ch && R.dmg > B.dmg && R.cash > 1 && R.tank >= B.tank,   /* leadersC: big powers now pay more for production (fair start) */
      'Realistic mode does not strengthen the superpower: ' + JSON.stringify([B, R]));
    ck(R.cdS > B.cdS && R.chS > B.chS && R.dmgS < B.dmgS && R.cashS < 1,
      'Realistic mode does not weaken the small power\'s fire support: ' + JSON.stringify([B, R]));
    ck(R.infS < B.infS, 'Realistic mode does not give the small power cheaper infantry: ' + JSON.stringify([B, R])); }
  // Both AIs play 3 game-minutes: nobody may ever build/train a banned kind.
  await ev(() => { for (const T of G.teams) if (!T.ai && typeof mkAI === 'function') T.ai = mkAI(1); window.__bad = []; });
  for (let c = 0; c < 4; c++) await ev(() => { for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) if (e.kind === 'fort' && !FORT_NAT[G.teams[e.team].fac]) window.__bad.push(e.kind); });
  const sim = await ev(() => [...new Set(window.__bad)]);
  ck(!sim.length, 'AI built a signature asset for a nation that does not have it: ' + sim.join(','));
  // ---- orderfeel (2026-11-13): rings for every selected unit/building in one instanced mesh, capped order markers, Conquest goal line
  { const of = await ev(() => { const us = G.ents.filter(e => e.team === ME && !e.isB && !e.dead).slice(0, 8), hq = G.ents.find(e => e.team === ME && e.isB && !e.dead);
      G.sel = us.concat(hq ? [hq] : []); const want = G.sel.length; HOVE = null; try { syncScene(.016); } catch (e) {} const rings = SELR.n;
      ORDM.list.length = 0; for (let i = 0; i < 40; i++) ordMark(['mv', 'am', 'atk', 'gd', 'wp'][i % 5], 500 + i * 3, 500); const cap = ORDM.list.length; try { ordMarks(); } catch (e) {}
      const meshes = SCN.children.filter(o => o.userData && o.userData.of).length; ORDM.list.length = 0; G.sel = []; try { cqBanner(); } catch (e) {}
      return { rings, want, cap, max: ORDM.cap, meshes, goal: (document.getElementById('cqBn') || {}).textContent || '' }; });
    console.log('orderfeel conquest', JSON.stringify(of));
    ck(of.rings === of.want && of.want > 0, `orderfeel: ${of.want} selected but ${of.rings} selection rings`); ck(of.cap <= of.max, `orderfeel: ${of.cap} order markers alive (cap ${of.max})`);
    ck(of.meshes === 2, `orderfeel: rings + markers must be 2 instanced meshes, found ${of.meshes}`);
    ck(/Take towns for income/.test(of.goal) && /Destroy the enemy base \(\d+ of \d+ structures left\)/.test(of.goal), 'orderfeel: Conquest goal line missing or wrong: ' + of.goal.slice(0, 160)); }
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
  // battleclean2 2026-11-13 (Abdullah 19:55 "I thought we removed towns in battle"): a Battle game has NO towns, hamlets or town income on any map (the garrisonable houses stay, 19:57)
  { const nt = await ev(() => { const own = { towns: (G.towns || []).length, civT: (G.civ || []).filter(c => c.ti >= 0).length, civ: (G.civ || []).length, cities: G.map.cities.length, ham: G.map.hamlets.length, tax: (G.towns || []).some(t => t.tax > 0) };
      const keys = Object.keys(MAPS).filter(k => MAPS[k].bm).concat(['strait', 'heartland', 'fulda', 'aleppo', 'euphrates', 'sahara']).filter(k => MAPS[k]), bad = [];
      const keepB = BASES, keepS = BASE_SLOTS;
      for (const k of keys) { try { setBases(MAPS[k].max, k); NO_TOWNS = true; const m = mkMap(4242, k); if (m.cities.length || m.hamlets.length || (m.roadNet || []).length) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } finally { NO_TOWNS = false; } }
      let conq = 0; try { setBases(MAPS.strait.max, 'strait'); const m = mkMap(4242, 'strait'); conq = m.cities.length; } catch (e) {}
      BASES = keepB; BASE_SLOTS = keepS; return { own, bad, conq, n: keys.length }; });
    console.log('battle no towns', JSON.stringify(nt));
    ck(nt.own.towns === 0 && nt.own.civT === 0 && nt.own.cities === 0 && nt.own.ham === 0 && !nt.own.tax, 'Battle game has towns/hamlets/town-linked houses/tax: ' + JSON.stringify(nt.own));
    ck(!nt.bad.length, 'Battle map build still makes towns on: ' + nt.bad.join(','));
    ck(nt.conq > 0, 'Conquest map lost its towns (NO_TOWNS leaked): ' + nt.conq); }
  // battleclean 2026-11-12 (Abdullah 2026-11-11 19:41 "for battle take out the concept the supply lines and the dotted roads"): Battle has no supply lines - nothing drawn on minimap or ground, no overlay, no Supply chip, no out-of-supply status; Conquest keeps them
  { const sl = await ev(() => { const rec = () => { let n = 0; const c = new Proxy({}, { get: (t, k) => k === 'canvas' ? document.createElement('canvas') : k === 'measureText' ? () => ({ width: 10 }) : (typeof k === 'string' && /^(stroke|fill|moveTo|lineTo|arc|drawImage|fillRect|fillText|strokeRect)$/.test(k)) ? () => { n++; } : () => {}, set: () => true }); return { c, n: () => n }; };
      const m = rec(), w = rec(); try { drawLogiMini(m.c, .1, .1); } catch (e) {} try { drawLogiWorld(w.c); } catch (e) {} try { drawTownsMini(m.c, .1, .1, 0); } catch (e) {}
      try { lgToggle(); } catch (e) {} const on = !!LGU.on, wanted = lgWanted(), chip = document.getElementById('hudS'); try { hudTick(true); } catch (e) {}
      const ui = (() => { try { return ammoRowHTML(G.ents.filter(u => u.team === ME && u.am !== undefined && u.amx).slice(0, 1)) || ''; } catch (e) { return ''; } })();
      return { mini: m.n(), world: w.n(), on, wanted, chip: !chip || chip.hidden, ui: /supply/i.test(ui), hasLg: !!G.lgd }; });
    console.log('battle supply lines', JSON.stringify(sl));
    // battleclean 2026-11-12 (Abdullah 2026-11-11 19:45 "Once I click this should disappear"): the rally flag shows only while a production building is selected (or a 1.5 s flash after setting it)
    const rf = await ev(() => { const T = G.teams[ME], hq = G.ents.find(e => e.team === ME && e.kind === 'hq' && !e.dead), vis = () => { try { syncScene(.016); } catch (e) {} return !!(RALLY && RALLY.visible); };
      T.rally = { x: hq.x + 90, y: hq.y + 90 }; G.sel = []; vis(); RV.fl = 0; const away = vis(); G.sel = [hq]; const sel = vis(); G.sel = []; const gone = vis(); G.sel = []; return { away, sel, gone }; });
    console.log('rally flag', JSON.stringify(rf)); ck(!rf.away && rf.sel && !rf.gone, 'rally flag must show only while a production building is selected: ' + JSON.stringify(rf));
    { const gl = await ev(() => { try { cqBanner(); } catch (e) {} return (document.getElementById('cqBn') || {}).textContent || ''; }); console.log('battle goal', gl.slice(0, 120));
      ck(/Destroy every enemy building \(\d+ left\)/.test(gl), 'orderfeel: Battle goal line missing or wrong: ' + gl.slice(0, 160)); }
    // pileflag 2026-11-14 (Abdullah 2026-11-13 19:52 "Green flag stays"): with real mouse clicks - select the HQ, click the ground (sets the rally point, short flash),
    // click the ground somewhere else -> no flag on screen, nothing selected, and only one flag object ever
    { const sp = await ev(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq' && !e.dead); G.teams[ME].rally = null; RV.fl = 0; cam.dist = cam.td = 520; centerOn(hq.x, hq.y + 60, true); G.sel = [hq]; try { updateUI(); syncScene(.016); renderFrame(.016); } catch (e) {}
        const r = cv.getBoundingClientRect(), at = (x, y) => { const p = toScreen(x, groundH(x, y), y); return [r.left + p.x, r.top + p.y]; }; return { a: at(hq.x + 70, hq.y + 150), b: at(hq.x - 160, hq.y + 120), w: [r.width, r.height] }; });
      await page.mouse.move(sp.a[0], sp.a[1]); await page.mouse.click(sp.a[0], sp.a[1]); await page.waitForTimeout(300);
      const s1 = await ev(() => { try { syncScene(.016); } catch (e) {} return { rally: !!G.teams[ME].rally, flash: RV.fl > 0, sel: G.sel.length }; });   /* flash = the 1.5 s flash was started (a slow headless frame can outlast it) */
      await page.mouse.move(sp.b[0], sp.b[1]); await page.mouse.click(sp.b[0], sp.b[1]); await page.waitForTimeout(300);
      const s2 = await ev(() => { try { syncScene(.016); } catch (e) {} let flags = 0; SCN.traverse(o => { if (o === RALLY) flags++; }); return { flag: !!(RALLY && RALLY.visible), sel: G.sel.length, flags }; });
      console.log('rally flag clicks', JSON.stringify({ s1, s2 })); ck(s1.rally && s1.flash && s1.sel === 0 && !s2.flag && s2.flags <= 1, 'rally flag must flash when set by a click and be gone after the next click on the ground: ' + JSON.stringify({ s1, s2 })); }
    ck(sl.mini === 0 && sl.world === 0, 'Battle draws supply lines (minimap ' + sl.mini + ', ground ' + sl.world + ' draw calls)'); ck(!sl.on && !sl.wanted, 'Battle supply overlay can be switched on'); ck(sl.chip, 'Battle shows the "Supply OK" chip'); ck(!sl.ui, 'Battle ammo row mentions in/out of supply'); }
  ck(bt.battle && !bt.conq, 'Battle game did not start in Battle mode');
  // pacecap 2026-11-14 (Abdullah 2026-11-13 21:24 "unit cap: About 150"): Battle has a per-player population cap of 150 (infantry 1, light vehicles 2, tanks 3, aircraft 3; trucks/dozers free); training stops with "Unit limit reached", the top bar shows "units N/150"
  { const pc = await ev(() => { const T = G.teams[ME]; const cap = popCap(); const tank = popOf(stats(T.fac, 'tank')), inf = popOf(stats(T.fac, 'inf')), harv = popOf(stats(T.fac, 'harv')), jet = popOf(stats(T.fac, 'jet'));
      for (let i = 0; i < 310; i++) addUnit(ME, 'inf', 200 + (i % 160), 200 + Math.floor(i / 160)); const used = popUsed(ME, 1); T.credits = 99999; const bk = G.ents.find(e => e.team === ME && e.isB && e.kind === 'barracks'); if (bk) bk.built = 1; const ok = enqueue(ME, 'inf');
      for (let i = 0; i < 30; i++) updateUI(); G.ents = G.ents.filter(e => !(e.team === ME && e.kind === 'inf' && (e.y === 200 || e.y === 201) && e.x >= 200 && e.x < 360)); const hud = (document.getElementById('popCap') || {}).textContent || ''; return { cap, tank, inf, harv, jet, used, ok, hud }; });
    console.log('pop cap', JSON.stringify(pc)); ck(pc.cap === 300 && pc.inf === 1 && pc.tank === 3 && pc.jet === 3 && pc.harv === 0, 'pop cap numbers wrong: ' + JSON.stringify(pc)); ck(pc.used >= 300 && !pc.ok, 'training is not blocked at the unit limit: ' + JSON.stringify(pc)); ck(/^units \d+\/150$/.test(pc.hud), 'top bar must show "units N/150", got "' + pc.hud + '"'); }
  ck(bt.blds.join() === 'hq' && bt.kinds.includes('dozer') && bt.kinds.includes('harv'), 'Battle must start with a Command Center + dozer + supply truck only, got ' + bt.blds.join() + ' / ' + bt.kinds.join());
  ck(!bt.setupEnd, 'Battle has a no-fire setup phase'); ck(!bt.tax, 'Battle has town taxes'); ck(bt.c1 > bt.c0, 'Battle: supply trucks brought no income (' + bt.c0 + ' -> ' + bt.c1 + ')'); ck(bt.name === 'Battle', 'mode name in HUD/end screen is "' + bt.name + '"');
  // dugout (Abdullah 2026-11-13 20:00): Dig in puts the squad inside a dugout (units off the map, the dugout holds them); move orders do nothing until they are taken out; select dugout + right-click ground releases them; a checkpoint keeps them inside
  { const dg = await ev(() => { const T = G.teams[ME], hq = G.ents.find(e => e.team === ME && e.kind === 'hq'), inf = roster(T.fac).barracks[0], o = {};
      let C = null; for (let r = 260; r < 1400 && !C; r += 40) for (let a = 0; a < 6.28 && !C; a += .3) { const x = hq.x + Math.cos(a) * r, y = hq.y + Math.sin(a) * r; if (x > 300 && y > 300 && x < MAPW - 300 && y < MAPH - 300 && dugSiteOk(x, y) && !G.ents.some(e => !e.dead && Math.hypot(e.x - x, e.y - y) < (e.isB ? e.size / 2 + 60 : 80))) C = { x, y }; }
      if (!C) return { skip: true }; const us = [0, 1, 2, 3].map(i => addUnit(ME, inf, C.x - 22 + i * 14, C.y)); const ids = us.map(u => u.id);
      act(ME, { t: 'dig', ids }); for (let i = 0; i < 150; i++) simUpdate(.1); const c = G.civ.find(q => q.dug && !q.dead);
      o.inside = c ? c.occ.length : -1; o.onMap = us.filter(u => G.byId.has(u.id) && !u.inTun).length;
      act(ME, { t: 'go', ids, x: C.x + 150, y: C.y, mode: 'move' }); for (let i = 0; i < 20; i++) simUpdate(.1); o.stay = !!c && c.occ.length === 4;
      const js = JSON.parse(JSON.stringify(ckEncode())); o.ck = c && js.civ[c.i] && js.civ[c.i].occ && js.civ[c.i].occ.length;
      act(ME, { t: 'ungar', tid: c.g.id, at: 1, x: C.x - 120, y: C.y }); o.out = c.occ.length === 0 && us.every(u => G.byId.has(u.id) && !u.inTun);
      for (const u of us) { u.dead = true; G.byId.delete(u.id); } dugoutFree(c); return o; });
    console.log('dugout', JSON.stringify(dg));
    if (!dg.skip) { ck(dg.inside === 4 && dg.onMap === 0, 'dugout: Dig in must put the squad inside the dugout, off the map: ' + JSON.stringify(dg)); ck(dg.stay, 'dugout: a move order must not pull units out of the dugout'); ck(dg.ck === 4, 'dugout: a checkpoint / save must keep the soldiers inside'); ck(dg.out, 'dugout: select the dugout + right-click ground must bring them out'); } }
  await shot('battle-us');
  // ghostslot 2026-11-14 (Abdullah 2026-11-13 19:58 "this was a 2 player battle why are the zaidis in this game"): a game has exactly the players the setup showed - the hidden militia team is never a scoreboard column; Battle has no world-opinion row
  { const gs = await ev(() => { const real = G.teams.filter(T => !T.reb).length, S = endStats(0), nm = G.teams.length - real;
      esPage(S); const cols = [...document.querySelectorAll('#endStats .esC')].length, dts = [...document.querySelectorAll('#endStats .esC dt')].map(d => d.textContent);
      const old = JSON.parse(JSON.stringify(S)); old.p.push(Object.assign({}, old.p[0], { f: 'DW', tm: 900 })); old.a.push([]); esPage(old); const colsOld = document.querySelectorAll('#endStats .esC').length;
      esPage(null); return { mode: G.battle ? 'battle' : 'conquest', n: G.N, real, extra: nm, sp: S.p.length, sa: S.a.length, cols, colsOld, opinion: dts.includes('World opinion'), wrap: !!document.querySelector('#endStats .esC dt') }; });
    console.log('ghost team', JSON.stringify(gs)); ck(gs.real === 2 && gs.sp === 2 && gs.sa === 2, 'a 2-player ' + gs.mode + ' game must have exactly 2 teams in its end stats: ' + JSON.stringify(gs));
    ck(gs.cols === 2 && gs.colsOld === 2, 'scoreboard columns must equal the real players (a militia/ghost team must never get one): ' + JSON.stringify(gs)); ck(gs.opinion === !gs.mode.startsWith('b'), gs.mode + ' scoreboard world-opinion row is wrong: ' + JSON.stringify(gs)); }
  // Test range started from its window with IR vs IL gives exactly those two teams (the old auto-pick is gone)
  { const t = await ev(() => { startSandbox({ p: 'IR', a: 'IL', map: 'strait' }); return { sb: !!G.sandbox, f: G.teams.slice(0, 2).map(T => T.fac).join('-') }; });
    ck(t.sb && t.f === 'IR-IL', 'Test range IR vs IL must give teams IR and IL, got ' + JSON.stringify(t)); }
  // dozerbuild 2026-11-14 (Abdullah 04:00 "You can only build a building using the construction vehicle"): the BUILD tab shows only while a Construction Vehicle is selected; a placed building starts with NO progress until a dozer drives there and works on it (pauses when it leaves); nothing starts without a dozer assigned
  { const db = await ev(() => { const T = G.teams[ME], dz = G.ents.find(e => e.team === ME && e.kind === 'dozer' && !e.dead), hq = G.ents.find(e => e.team === ME && e.kind === 'hq' && !e.dead), tb = document.querySelector('.tabs button[data-tab="build"]');
      G.sel = []; updateUI(); const hid = !!tb.hidden; G.sel = [dz]; updateUI(); const shown = !tb.hidden;
      T.credits = 5000; let spot = null; for (let r = 260; r < 700 && !spot; r += 40) for (let a = 0; a < 6.28 && !spot; a += .5) { const x = hq.x + Math.cos(a) * r, y = hq.y + Math.sin(a) * r; if (validSpot(ME, 'barracks', x, y)) spot = [x, y]; }
      dz.order = null; dz.x = hq.x - 900; dz.y = hq.y; placeBld(ME, 'barracks', spot[0], spot[1], dz.id); const b = G.ents.find(e => e.isB && e.team === ME && e.kind === 'barracks' && e.built < 1);
      const far0 = b && b.built; dz.order = null; dz.bq = []; dz.x = hq.x - 900; dz.y = hq.y; for (let i = 0; i < 120; i++) { if (dz.order) dz.order = null; simUpdate(1 / 60); } const idle = b ? b.built : -1;
      dz.order = { type: 'build', target: b }; dz.x = b.x - b.size / 2 - 20; dz.y = b.y; for (let i = 0; i < 180; i++) simUpdate(1 / 60); const worked = b.built;
      return { hid, shown, nd: !!(b && b.nd), far0, idle, worked }; });
    console.log('dozerbuild', JSON.stringify(db));
    ck(db.hid && db.shown, 'BUILD tab must show only while a Construction Vehicle is selected: ' + JSON.stringify(db)); ck(db.nd && db.far0 === 0 && db.idle === 0, 'a building must not progress without a dozer working on it: ' + JSON.stringify(db)); ck(db.worked > 0, 'a dozer on site must build it: ' + JSON.stringify(db)); }
  { const t = await ev(() => { startSandbox({ p: 'IR', a: 'IL', map: 'strait' }); const A = { sb: !!G.sandbox, bt: !!G.battle, conq: !!G.conq, bm: !!(MAPS[G.mapKey] && MAPS[G.mapKey].bm), f: G.teams.slice(0, 2).map(T => T.fac).join('-'), blds: G.ents.filter(e => e.isB && e.team === 0).map(e => e.kind).sort().join(','), allowed: Object.keys(STRUCT).filter(k => bldAllowed('IR', k)).sort().join(',') };
      newGame({ seed: 5, facs: ['IR', 'IL'], ai: [false, false], map: G.mapKey, tm: [0, 1], bs: 1, slot: -1, battle: 1 }); A.bblds = G.ents.filter(e => e.isB && e.team === 0).map(e => e.kind).sort().join(','); A.ballowed = Object.keys(STRUCT).filter(k => bldAllowed('IR', k)).sort().join(','); return A; });
    ck(t.sb && t.f === 'IR-IL', 'Test range IR vs IL must give teams IR and IL, got ' + JSON.stringify(t));
    ck(t.bt && !t.conq && t.bm, 'Test range must be a Battle game on a Battle map: ' + JSON.stringify(t));
    ck(t.blds === t.bblds && t.allowed === t.ballowed, 'Test range must start with the same buildings and build list as Battle: ' + JSON.stringify(t)); }
  // ---- fixes1 (2026-11-11, "white streaks in Arabia", "oversized palms"): what a PLAYER gets on the first campaign map of a session.
  // The map must wait for the real land data (it used to be drawn on the hand-shaped stand-in and stay on it: chalk-white cliffs along the Red Sea);
  // snow only where snow can lie (never in Arabia; still on the Alps, the Himalaya and Greenland); palms no taller than the towns (one instanced draw).
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  { const { proj } = await import('./grandproj.mjs');
    const P = { hejaz: [41, 21], asir: [42.5, 18.5], rub: [50, 20], alps: [7.9, 46.0], himalaya: [86.9, 28.0], greenland: [-40, 72] }, pts = Object.entries(P).map(([n, [lo, la]]) => [n, ...proj(lo, la)]);
    const box = [proj(36, 26), proj(56, 26), proj(36, 14), proj(56, 14)], bx = [Math.min(...box.map(q => q[0])), Math.min(...box.map(q => q[1])), Math.max(...box.map(q => q[0])), Math.max(...box.map(q => q[1]))];
    const w0 = await ev(() => { window.__grandWait = 1; grNew({ me: 'IR', seed: 99, len: 'quick' }); grandOpen(); return { card: !!document.getElementById('gRealWait'), scr: !!document.getElementById('grandScreen') }; });
    const opened = await page.waitForFunction(() => document.getElementById('grandScreen') && !document.getElementById('gRealWait'), null, { timeout: 240000, polling: 200 }).then(() => true).catch(() => false);
    ck(w0.card && !w0.scr, 'grand map: the first map of a session no longer waits for the real land data: ' + JSON.stringify(w0)); ck(opened, 'grand map: the map never opened after waiting for the real land data');
    if (opened) { const r = await ev(([pts, bx]) => { const F = G3.F, W = F.W, o = { real: !!G3.real, hm: !!F.hm, v: {} };
        for (const [n, X, Z] of pts) { const x = Math.round(X / 2), y = Math.round(Z / 2); let sn = 0, hh = 0; for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) { const k = (y + dy) * W + x + dx; if (Math.abs(dx) < 4 && Math.abs(dy) < 4 || n === 'alps') sn = Math.max(sn, F.bw[k * 4 + 1]); hh = Math.max(hh, F.Hh[k]); } o.v[n] = [sn, +hh.toFixed(1)]; }
        let am = 0; for (let y = Math.floor(bx[1] / 2); y <= bx[3] / 2; y++) for (let x = Math.floor(bx[0] / 2); x <= bx[2] / 2; x++) am = Math.max(am, F.bw[(y * W + x) * 4 + 1]); o.arabia = am;
        const fm = G3.static.children.filter(c => c.material && c.material.uniforms && c.material.uniforms.uTS), vs = fm[0] ? fm[0].material.vertexShader : '', sz = k => { const m = new RegExp('k==' + k + '\\?vec2\\(([\\d.]+),([\\d.]+)\\)').exec(vs); return m ? [+m[1], +m[2]] : null; };
        o.trees = { meshes: fm.length, inst: !!(fm[0] && fm[0].geometry.isInstancedBufferGeometry), conifer: sz(0), palm: sz(2) }; return o; }, [pts, bx]);
      console.log('real map', JSON.stringify(r));
      ck(r.real && r.hm, 'grand map: the first map of a session is drawn on the stand-in terrain although the real land data loaded');
      ck(r.v.hejaz[0] <= 10 && r.v.asir[0] <= 10 && r.v.rub[0] <= 10 && r.arabia <= 10, 'grand map: snow paint in Arabia (Hejaz/Asir/Rub al Khali/whole peninsula south of 26N): ' + JSON.stringify([r.v.hejaz, r.v.asir, r.v.rub, r.arabia]));
      ck(r.v.alps[0] >= 80 && r.v.himalaya[0] >= 200 && r.v.greenland[0] >= 200, 'grand map: snow is gone from the Alps, the Himalaya or Greenland: ' + JSON.stringify([r.v.alps, r.v.himalaya, r.v.greenland]));
      ck(r.trees.meshes === 1 && r.trees.inst, 'grand map: forests/palms are no longer ONE instanced draw: ' + JSON.stringify(r.trees));
      ck(r.trees.palm && r.trees.conifer && r.trees.palm[1] <= r.trees.conifer[1] * .7 && r.trees.palm[0] <= r.trees.conifer[0] * .7, 'grand map: palms are drawn at forest-clump size again (each palm taller than a town): ' + JSON.stringify(r.trees)); }
    await ev(() => { window.__grandWait = 0; }); }
  // ---- grand map: no turn buttons / turn wording; real-time clock controls exist
  await ev(() => { try { endBattle && 0; } catch (e) {} });
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await ev(() => { grNew({ me: 'IR', seed: 99, len: 'quick' }); grandOpen(); guFit(null); guRedraw(); });
  // MAPCOAST (Abdullah 2026-11-11 "Italy isn't a boot. Turkey and Greece are just meshed together"): the drawn coast follows the real world at the full
  // 2400x1200 map detail (one shore texture, land or sea decided per pixel), small nations keep ground under their towns. Map = Equal Earth (orch/grandproj.mjs).
  { const { proj } = await import('./grandproj.mjs');
    const P = { 'Aegean': [25.0, 38.5, 0], 'Adriatic': [15.0, 43.0, 0], 'Tyrrhenian': [12.0, 40.0, 0], 'Ionian': [18.5, 38.5, 0], 'Persian Gulf': [51.5, 27.0, 0], 'northern Red Sea': [35.5, 26.5, 0],
      'Italy heel': [18.0, 40.4, 1], 'Italy toe': [16.2, 38.6, 1], 'Sicily': [14.2, 37.6, 1], 'Sardinia': [9.0, 40.0, 1], 'Peloponnese': [22.3, 37.5, 1], 'Crete': [24.9, 35.2, 1], 'western Turkey': [28.0, 38.5, 1], 'Qatar': [51.2, 25.3, 1] };
    const pts = Object.entries(P).map(([n, [lon, lat, land]]) => [n, ...proj(lon, lat), land]);
    const r = await ev(pts => { const F = g3Fields(), im = G3.U && G3.U.uSea.value.image; const near = (x, z) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (g3FineLand(x + dx, z + dy)) return true; return false; };
      return { fw: F.FW, fh: F.FH, tex: im ? im.width + 'x' + im.height : '', wrong: pts.filter(([n, x, z, land]) => g3FineLand(x, z) !== !!land || (g3HeightAt(x, z) > 0) !== !!land).map(q => q[0]),
        noGround: GCM.P.filter(q => q.land && !near(q.x, q.y)).map(q => q.n).slice(0, 8), small: ['Lebanon', 'Gaza', 'Bahrain', 'Qatar', 'Kuwait'].filter(n => !GCM.P.some(q => q.land && new RegExp(n, 'i').test(q.n + ' ' + (grNat(q.o).name || '')) && near(q.x, q.y))) }; }, pts);
    ck(r.fw === 2400 && r.fh === 1200 && r.tex === '2400x1200', `mapcoast: the shore is not drawn at the full map detail (mask ${r.fw}x${r.fh}, texture ${r.tex})`);
    ck(!r.wrong.length, 'mapcoast: land/sea is wrong at ' + r.wrong.join(', '));
    ck(!r.noGround.length && !r.small.length, 'mapcoast: land provinces without ground under their town: ' + r.noGround.concat(r.small).join(', ')); }
  // A-DATE (orchestrator 2026-11-07, WORLD SIMULATOR): the campaign starts in the world GR_REAL describes (as of Nov 2026), not Jan 2026
  { const d = await ev(() => ({ s: grDateStr(GC.turn, 0), a: GR_REAL.asof }));
    ck(d.s === '1 ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.a[1] - 1] + ' ' + d.a[0], `grand campaign start date ${d.s} does not match GR_REAL as-of ${d.a}`); }
  // POLISH (Abdullah 2026-11-09 "polish freeze"): no visible nation-panel tab renders empty or errors (hide unfinished tabs with show(), never ship a stub)
  { const tb = await ev(() => { const o = []; for (const t of NP.tabs.filter(t => !t.show || t.show(GC.me))) { NP.code = GC.me; NP.cur = t.id; try { npDraw(); } catch (e) { o.push(t.id + ': threw ' + e.message); continue; } const w = document.getElementById('npWin'), b = w && w.children[2], x = b ? b.innerText.trim() : ''; if (x.length < 30 || /Tab error/.test(x)) o.push(t.id + ': ' + (x.slice(0, 60) || 'empty')); npClose(); } return o; });
    ck(!tb.length, 'empty or broken nation-panel tab(s): ' + tb.join('; ')); }
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
  { const g = await ev(() => ({ ban: ['cleric', 'bb'].every(k => conqBan(k)), fort: false, cl: roster('IR').barracks.includes('cleric'), made: G.ents.some(e => e.kind === 'cleric') }));
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
