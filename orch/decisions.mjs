// DECISIONS guard (audit): Abdullah's standing decisions that can be checked automatically, so a leftover of something he
// already decided cannot come back (he found "End turn" and the Ayatollah button by hand on 2026-11-06). Static checks read
// src/ (no browser); runtime checks look at the real game as a player: menu, a Battle as IR, a Battle as US with its supply lines.
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
// pcolor 2026-11-15 (Abdullah 2026-11-14 18:57 "Make it so players can choose their color"): a picked colour reaches T.color, two seats cannot share one, every lobby/setup row has a picker (runtime proof: orch/pcolor.mjs) + the colour travels in the seat data of the server, the stand-in and the start message
// battlefield 2026-11-18 (pack-battlefield): rubble clear by right-click + supply roads, tunnel radar, live day cycle + weather (orch/battlefield.mjs)
{ const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [fileURLToPath(new URL("./battlefield.mjs", import.meta.url))], { encoding: "utf8" }); ck(r.status === 0, "battlefield: orch/battlefield.mjs failed - " + String(r.stdout || "").split("\n").filter(l => /FAIL/.test(l)).slice(0, 3).join(" | ")); }
{ const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [fileURLToPath(new URL("./pcolor.mjs", import.meta.url))], { encoding: "utf8" }); ck(r.status === 0, "pcolor: orch/pcolor.mjs failed - " + String(r.stdout || '').split('\n').filter(l => /FAIL/.test(l)).slice(0, 3).join(' | '));
  const rd = f => fs.readFileSync(path.join(ROOT, f), "utf8"); const sv = rd("server/src/battle.js"), sd = rd("server/src/battle-driver.js"), so = rd("orch/cfhost-standin.mjs"), nt = rd("src/07-net.js");
  ck(/pcTaken\(id, v\)/.test(sv) && /\.\.\.cc\(this\.players\.get\(id\)\.c\)/.test(sv) && /sp\.pc = pc/.test(sv) && /pcClean/.test(sd), "pcolor: server/src/battle.js must keep the seat colour (pick, seats(), start pc) and one colour per seat");
  ck(/pcTaken\(id, v\)/.test(so) && /pc0/.test(so) && /pcClean/.test(so), "pcolor: orch/cfhost-standin.mjs must mirror the server colour rules");
  ck(/o\.pc0=NET\.pc0/.test(nt) && /pcClean\(d\.pc,d\.facs\.length\)/.test(nt), "pcolor: the lobby must send the colour to the server (pc0 / ais[].c) and the client must read start.pc"); }
// upgsimple 2026-11-14 (Abdullah 14:31 "simplify the list of upgrades and powers"): upgrades belong to a building (data-from), at most 4 per building, at most 6 active powers per nation, power buildings marked (orch/upgsimple.mjs)
{ const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [fileURLToPath(new URL("./upgsimple.mjs", import.meta.url))], { encoding: "utf8" }); ck(r.status === 0, "upgsimple guard: " + (r.stdout || "").trim().split("\n").slice(0, 4).join(" | ")); }
// techbldgs 2026-11-14 (Abdullah 2026-11-13 20:21 / 20:24): the capturable Battle buildings (quarry, mine, power plant, field hospital) are ONE system on the derrick code: capturable, effect only for the owner, destroyable and repairable, state in the checkpoint; every Battle map has them (symmetry: orch/battlemapfair.mjs --static)
{ const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [fileURLToPath(new URL("./techbldgs.mjs", import.meta.url))], { encoding: "utf8" }); ck(r.status === 0, "capturable Battle buildings rules failed: " + String(r.stdout).slice(0, 400));
// zhfeel 2026-11-15 (Abdullah 2026-11-14 19:52 "Huccum!" make it feel like Generals Zero Hour): build clock wipe + queue number on the bar buttons, Sell refunds 50% and removes the building after 3 s, Repair restores hp and costs money, Generals-style cursors (runtime proof: orch/zhfeel.mjs)
{ const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [fileURLToPath(new URL("./zhfeel.mjs", import.meta.url))], { encoding: "utf8" }); ck(r.status === 0, "zhfeel guard: orch/zhfeel.mjs failed: " + (r.stdout || "").split("\n").filter(l => /FAIL/.test(l)).slice(0, 3).join(" | ")); }
  const bm = fs.readFileSync(path.join(ROOT, "src/02d-battlemaps.js"), "utf8"); const ids = [...bm.matchAll(/^  (\w+):\{nm:/gm)].map(x => x[1]); ck(ids.length > 0 && ids.every(id => { const i = bm.indexOf("  " + id + ":{nm:"); return /\n    tb:\[\[/.test(bm.slice(i, i + 1400)); }), "every Battle map must list its capturable buildings (tb:[[x,y,type]])"); }

// Rules files (orch/loadF): CLAUDE.md = short current rules, orch/DECISIONS.md = the full dated record. Every standing decision's
// key words must still be in one of the two files, and CLAUDE.md must stay short.
// anthems 2026-11-17 (Abdullah 16:49 "Work on these now", CLAUDE.md Audio: nation identity = anthem at battle start and victory): every PLAYABLE
// nation has mus/an_<CODE>.mp3, is in AN_FAC (09-audio.js) and has a credit line in AN_CRED (shown in the menu credits); sources: mus/an_pack.py
{ const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8'); const dt = rd('src/01-data.js'), au = rd('src/09-audio.js');
  const pm = dt.match(/const PLAYABLE=\[([^\]]*)\]/), pl = pm ? [...pm[1].matchAll(/'(\w+)'/g)].map(m => m[1]) : [];
  const fm = au.match(/const AN_FAC=\/\*ANFAC\*\/\{([^}]*)\}/), fac = fm ? new Set([...fm[1].matchAll(/(\w+):1/g)].map(m => m[1])) : new Set();
  const cm = au.match(/const AN_CRED=\{([\s\S]*?)\};/), cred = {}; if (cm) for (const m of cm[1].matchAll(/(\w+):'([^']+)'/g)) cred[m[1]] = m[2];
  ck(pl.length === 22 && fm && cm && /id='anCred'/.test(au), 'anthems: PLAYABLE, AN_FAC, AN_CRED and the anCred menu-credits paragraph must all exist');
  const AN_PENDING = ['KP'];   // KP Arirang (US Army Chorus, Commons File:Arirang.ogg) chosen; download was rate-limited 2026-11-17 - see orch/HANDOFF-anthems.md. Remove once mus/an_KP.mp3 lands.
  for (const f of AN_PENDING) ck(!fs.existsSync(path.join(ROOT, 'mus', 'an_' + f + '.mp3')), 'anthems: ' + f + ' now has its file - take it off AN_PENDING in orch/decisions.mjs');
  for (const f of pl.filter(f => !AN_PENDING.includes(f))) { const fp = path.join(ROOT, 'mus', 'an_' + f + '.mp3');
    ck(fs.existsSync(fp) && fs.statSync(fp).size > 50000, 'anthems: ' + f + ' has no mus/an_' + f + '.mp3 (every playable nation gets its anthem at battle start and victory)');
    ck(fac.has(f), 'anthems: ' + f + ' is missing from AN_FAC in src/09-audio.js'); ck(!!cred[f], 'anthems: ' + f + ' has no credit in AN_CRED (src/09-audio.js)');
    ck(new RegExp("'" + f + "': \\('an/").test(rd('mus/an_pack.py')), 'anthems: ' + f + ' has no source row in mus/an_pack.py (source + licence)'); } }
// ---- UI audit guards (Abdullah 2026-11-14 21:55 "find duplicates and remove them"): ONE key table, no key twice, every handled letter has a row, no stale hints
{ const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8'); const kt = rd('src/06z-keys.js');
  const defs = [...kt.matchAll(/\{id:'(\w+)'[^}]*?def:'([^']+)'/g)].map(m => [m[1], m[2]]); const seen = {};
  for (const [id, d] of defs) { ck(!seen[d], 'key table: "' + d + '" is bound twice (' + seen[d] + ' and ' + id + ')'); seen[d] = id; ck(!'wasd'.includes(d), 'key table: W A S D only scroll the camera, row ' + id + ' uses ' + d); }
  ck(defs.length >= 18, 'key table: could not read the rows');   // parse sanity only: the table shrank to ~20 letter rows after the 2026-11-14 UI audit (Z, Type, stance keys removed)
  const fixedLetters = new Set(['a']);   // Ctrl+A has a fixed row
  const handled = new Set(); const ui = rd('src/08-ui.js'), i0 = ui.indexOf("window.addEventListener('keydown'"), i1 = ui.indexOf("window.addEventListener('keyup'", i0);
  for (const m of ui.slice(i0, i1).matchAll(/\bk==='([a-z])'/g)) handled.add(m[1]);
  for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js'))) { const t = rd('src/' + f);
    for (const line of t.split('\n')) { if (!/addEventListener\('keydown'/.test(line) || /^\s*\/\//.test(line)) continue; if (f === '06z-keys.js' || f === '12-editor.js' || f === '08c-extras.js' && /PHX\.on\)return/.test(line.slice(0, 120))) continue;
      for (const m of line.matchAll(/e\.key(?:!==|===)'([a-zA-Z])'/g)) handled.add(m[1].toLowerCase()); } }
  const rowKeys = new Set(defs.map(d => d[1]));
  for (const k of handled) ck(rowKeys.has(k) || fixedLetters.has(k) || 'wasd'.includes(k), 'key "' + k.toUpperCase() + '" is handled in src/ but has no row in the key table (src/06z-keys.js)');
  for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(f => /^(06|08|09|10|12|14)/.test(f) && f.endsWith('.js'))) { const t = rd('src/' + f);
    ck(!/right-click (to )?(place|launch|build|deploy)/i.test(t), f + ': a hint still says right-click places / launches (left-click deploys, right-click cancels)');
    ck(!/hold to talk|Voice commands/.test(t.replace(/\/\*[^]*?\*\/|\/\/[^\n]*/g, '')), f + ': voice commands were removed (2026-11-14 16:57), no leftovers'); } }
{ const rules = ['CLAUDE.md', 'orch/DECISIONS.md'].map(f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; } });
  const all = rules.join('\n').toLowerCase();
  const KEYS = ['one game', 'abandon conquest and campaign', 'bring supply lines into battle', 'super super polished', 'no decorative or ambient aircraft', 'left-click selects', 'right-click moves', 'attack-move', 'w a s d', 'ctrl+a',
    'rotates the battle camera', 'pointer lock', 'no big ugly buttons', 'radwan training', 'lebanese shia', 'zaidi shia movement', 'iraqi shia brigades', 'palestine islamic brigade',
    'desert islamic faction', 'zealous', 'professional', 'home defenders', 'firepower-reliant', 'mountain fortress', 'bunker buster', 'dear leader', 'ayatollah', 'shared soundtrack',
    'free art only', 'cloudflare', 'servers-live', 'autodeploy', 'play online', 'pc only', 'zero hour', 'supply lines', 'ammo rule', 'test range', 'ai hard', 'smooth first', 'one system per idea',
    'leftovers', 'missions', 'artifact', 'orch/brief.md', 'orch/decisions.md', 'never read', 'cigate.sh', 'no new runtime dependencies', 'multiplayer', '300 units', 'phone'];
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
{ /* unit limit (Abdullah 2026-11-19 05:58): 500 per player up to 4 players, 300 for 5-8 */
  const sm = SRC['03-sim.js'], m = sm.match(/const POP_CAP=[^;]*;/), f = sm.match(/function popCap\(\)\{[^\n]*\}/);
  ck(m && f, 'unitlimit: POP_CAP/popCap not found');
  if (m && f) { const pc = n => new Function('G', m[0] + f[0] + ';return popCap();')({ battle: true, teams: Array.from({ length: n }, () => ({})).concat([{ reb: true }]) }); ck(pc(2) === 500 && pc(4) === 500 && pc(5) === 300 && pc(8) === 300, 'unitlimit: battles of up to 4 players must allow 500 units each, 5-8 players 300'); }
}
// weathergfx 2026-11-14 (Abdullah: weather "Pick in setup + Random", graphics "Low/Med/High/Ultra"): ONE Conditions table (CONDS in 01-data) drives the setup/lobby picker and the Test range picker; Random and unfitting picks resolve through condFit (deterministic from the seed); ONE graphics row (GFX_PRESETS: Low/Medium/High/Ultra), no second quality setting.
// redfixE (2026-11-17): the battle servers (server/build-sim.mjs) and the headless test run the simulation from SIM_FILES in orch/headless.mjs - every
// src/01..03 file the page loads must be in it (4 were missing: faction mechanics, signature units, OB, the Iranian missile ran in browsers only)
{ const hl = fs.readFileSync(path.join(ROOT, 'orch/headless.mjs'), 'utf8'), m = /export const SIM_FILES = \[([^\]]*)\]/.exec(hl), L = m ? m[1].match(/'[^']+'/g).map(x => x.slice(1, -1)) : [];
  const want = srcFiles.filter(f => /^0[123]/.test(f)); const miss = want.filter(f => !L.includes(f)); ck(!miss.length, 'battle servers / headless: SIM_FILES in orch/headless.mjs misses ' + miss.join(', ')); }
{ const d = SRC['01-data.js'] || '', u = SRC['08-ui.js'] || '', s = SRC['03-sim.js'] || '';
  ck(/const CONDS=\[/.test(d) && /function condFit\(/.test(d) && /function condTheme\(/.test(d), 'weathergfx: the Conditions table (CONDS / condFit / condTheme) is gone from 01-data.js');
  ck(/condFit\(wxBase\(o\.w\)/.test(s) && /G\.wxB=wB/.test(s), 'weathergfx: newGame no longer resolves Conditions through condFit (Random and unfitting picks must follow the map and the seed)');
  ck(/function condUI\(/.test(u) && /function sbCond\(/.test(u), 'weathergfx: the setup or Test range Conditions picker is gone from 08-ui.js');
  ck(/const GFX_PRESETS=\[\['low','Low'.*\['auto','Medium'.*\['high','High'.*\['ultra','Ultra'/.test(u), 'weathergfx: Settings graphics row is not Low / Medium / High / Ultra any more');
  ck(!/wxRandIdx\(G\.seed\)===4/.test(s), 'weathergfx: the old "Random = day or night only" rule is back in newGame'); }
// redfixF 2026-11-18: the weather's random draws are a pure function of (seed, draw number) and the draw number is in the checkpoint (a closure RNG could not be saved: a migrated host or a loaded save got a different weather)
{ const sim = SRC['03-sim.js'] || '', c7 = SRC['07b-ckpt.js'] || ''; ck(/function weatherTick[\s\S]{0,400}G\.wxN=\(G\.wxN\|0\)\+1/.test(sim) && !/G\.wxR\b/.test(sim) && /'wx','wxN'/.test(c7), 'redfixF: weather draws must be counted (G.wxN, kept in the checkpoint), not a hidden RNG closure'); }
// redfixF 2026-11-18: balance nudge line (applied after the NEWNAT rows are copied) and the tournament roster is the PLAYABLE list
{ const d = SRC['01-data.js'] || '', t = fs.readFileSync(new URL('./aitourney.mjs', import.meta.url), 'utf8'); ck(/const BN=\{AE:1\.03,EG:1\.03,DE:1\.03,RV:1\.03,RU:\.97,CN:\.97,GB:\.97,DW:\.97\}/.test(d) && /const ALL = .*PLAYABLE/.test(t), 'redfixF: balance nudges (BN line in 01-data.js) and orch/aitourney.mjs must read the PLAYABLE nations'); }
// smoothaudit 2026-11-17: the supply-lines button reads the minimap's place twice a second, not every frame (a forced page layout per frame)
ck(/function lgUiTick\(\)\{[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n\s*if\(show\)\{const nw=performance\.now\(\);if\(nw-\(LGU\.rt\|\|0\)<500/.test(SRC['08c-logi.js'] || ''), 'smoothaudit: lgUiTick reads the minimap rect (getBoundingClientRect) every frame again');
// pack-polish2 2026-11-18: instanced soldiers (SOLB) stay ON; bone texture pre-sized to 64 rows and batch buffers start at 256 so nothing is re-created mid-wave
ck(/const SOLB=\{[^\n]*\bon:true,/.test(SRC['11-models.js'] || '') && /Math\.max\(64,SOLB\.H\)/.test(SRC['11-models.js'] || '') && /b\.cap=Math\.max\(256,/.test(SRC['11-models.js'] || ''), 'instanced soldiers: ON, texture pre-sized (64 rows), batch buffers start at 256');
// smooth-render 2026-11-19: a soldier's meshless bones are hidden so three.js skips them in every pass (matrices still update; skinning reads them)
ck(/function boneHide\(m\)/.test(SRC['06-view.js'] || '') && /boneHide\(m\);m\.userData\.bfz=1/.test(SRC['06-view.js'] || ''), 'soldier bones with no mesh below them must be hidden (boneHide) so the render passes skip them');
// smooth-render B 2026-11-19: a soldier standing still is one rigid piece (cached bone/part matrices vs the figure); any bone change (wSet counts them) switches back; solbFill builds rows from figure x K
ck(/function addonGeo\(key,fn\)\{[^\n]*gcKeep/.test(SRC['11-models.js'] || '') && ['zu23', 'dshk', 'bm', 'mg', 'mortar', 'gun', 'crane'].every(n => new RegExp("addonGeo\\('x_" + n + "'").test(SRC['11-models.js'] || '')) && /if\(e\.kind==='ammot'\)\{const GM=addonGeo\('x_ammot'/.test(SRC['11-models.js'] || '') && !/if\(c\.extra==='(zu23|dshk|bm|mg|mortar|gun|crane)'\)\{const B=Bld\(\)/.test(SRC['11-models.js'] || ''), 'rangefreeze: the gun, launcher, mortar, crane and cargo add-ons of a unit are shared shapes (addonGeo x_*), never rebuilt for every unit (a wave of 6 made 18 GPU buffers in one frame and the GPU stalled behind them)');
ck(/perfGpu\(\);\}catch\(e\)\{\}\/\* the graphics-card name/.test(SRC['05-fx3d.js'] || ''), 'rangefreeze: the graphics-card name (a synchronous GPU round trip) is read at load, not in the first slow frame');
ck(/function rotG\(k,f\)\{return ROTC\[k\]/.test(SRC['11-models.js'] || '') && !/new THREE\.Mesh\(new THREE\.(CircleGeometry\(R,32\)|CircleGeometry\(tl,16\)|BoxGeometry\(R,\.3|CylinderGeometry\(\.7,\.9)/.test(SRC['11-models.js'] || ''), 'rangefreeze: a helicopter\'s rotor disc, blades and tail rotor are shared shapes (rotG/rotM), never new geometry per unit (a wave of 6 made ~240 GPU buffers in one frame)');
ck(/function rgUMW\(/.test(SRC['06-view.js'] || '') && /function rgTick\(/.test(SRC['06-view.js'] || '') && /rgTick\(m,ud,W,on,c0,o\)/.test(SRC['06-view.js'] || '') && /WCH\+\+/.test(SRC['11-models.js'] || '') && /RGS\.get\(m\)/.test(SRC['11-models.js'] || '') && /rgBuild\(m\)\)\{ud\.rgA=1/.test(SRC['06-view.js'] || ''), 'rigid soldier figures (rgUMW/rgTick/rgBuild, wSet counts bone changes, solbFill uses RGS) must stay wired');
// smooth-render2 2026-11-19: aircraft merge their static meshes per material at build time (staticMerge, view only); the building merge was dropped (late shader programs). The unit limit is guarded by PACK UNITS, not here.
ck(/function staticMerge\(/.test(SRC['11-models.js'] || '') && /staticMerge\(yaw,kp,/.test(SRC['11-models.js'] || ''), 'smooth-render2: aircraft no longer merge their static meshes (staticMerge)');
// smoothaudit2 2026-11-17: merged soldier figures are drawn by one instanced draw per look (SOLB), bones from one shared texture; the AO depth pass draws the batches with their own depth material
ck(/solbReg\(mm,E\.mat\)/.test(SRC['11-models.js'] || '') && /function solbFill\(/.test(SRC['11-models.js'] || '') && /solbFill\(!!window\.LOADING\)/.test(SRC['11-models.js'] || '') && /solbAO\(\)/.test(SRC['10-post.js'] || '') && /SOLB\.stamp\+\+/.test(SRC['10-post.js'] || ''), 'smoothaudit2: soldiers are no longer drawn in shared instanced batches (one draw per soldier figure again)');
ck(/customDepthMaterial=chunkDM\(\)/.test(SRC['05-fx3d.js'] || '') && (SRC['05-fx3d.js'].match(/chunkDM\(\)/g) || []).length >= 3, 'smoothaudit2: rock chunks (strike debris) lack their own shadow depth material (a new vertex array would appear mid-strike)');
ck(/function camStill\(/.test(SRC['10-post.js'] || '') && /fxLv\(\)>=1&&still/.test(SRC['10-post.js'] || ''), 'PACK looks 2026-11-18: on Medium with a still camera the shadow pass is redrawn every other frame');
ck(/const LTN=\{/.test(SRC['05-fx3d.js'] || '') && /LTN\.cd/.test(SRC['05-fx3d.js'] || '') && !/new THREE\.\w+Light/.test((SRC['05-fx3d.js'] || '').split('function weatherFX')[1] || ''), 'PACK looks3 2026-11-18: a thunderstorm darkens the field and flashes lightning by moving the existing sun and sky light (no new lights, no new shader programs mid-battle)');
// smoothaudit2 2026-11-17: weathering values (amount, kind, camo pattern, wall) are uniforms - kept out of the shader program key, else a new value links a program mid-game
ck(/m\.customProgramCacheKey=\(\)=>'wxb'\+\(camo\?1:0\)\+\(typeof LOOK/.test(SRC['11-models.js'] || ''), 'smoothaudit2: weather() puts a uniform value (amount/kind/pattern/wall) into the shader program key again (a new program per value)');
ck(/now-EDGE\.rt>250/.test(SRC['08i-hud.js'] || '') && !/function edgeTick\(\)[^]*?const r=cv\.getBoundingClientRect\(\)/.test(SRC['08i-hud.js'] || ''), 'smoothaudit: edgeTick (off-screen alert arrows) reads the screen rect every frame again');
// upgicons 2026-11-15 (Abdullah 00:23 "Buttons were still missing icons"): the bar's hide-everything rule must spare the upgrade / power icon (.zhIc)
ck(/#panel \.btn>\*:not\(\.q\):not\(\.p\):not\(\.n\):not\(\.ic\):not\(\.zhIc\)\{display:none/.test(SRC['08o-zhbar.js'] || ''), 'upgicons: the command-bar rule that hides button children also hides the upgrade/power icons (.zhIc)');
// rclaunch 2026-11-15 (Abdullah 00:26 "Make road jobs and launch right click", 00:28 powers too): generals' powers and the Strike LAUNCH fire on right-click (left cancels); road jobs run on right-click (left cancels)
{ const u = SRC['08-ui.js'] || '', l = SRC['08c-logi.js'] || '';
  ck(/function rightPress\(e\)[^]*?if\(G\.aim\)\{placeOrAim\(w,false\)/.test(u), 'rclaunch: right-click must fire the armed power / Strike (rightPress)');
  ck(/function orderClick\(sh\)[^]*?if\(G\.aim\)\{placeOrAim\(w,/.test(u), 'rclaunch: a right-click on the map (orderClick) must fire the armed power / Strike, not cancel it');
  ck(/if\(G\.aim&&LASTPT!=='touch'(&&!leftOrders\(\))?\)\{G\.aim=null;updateUI\(\);return;\}[^\n]*\n\s*if\(G\.place\|\|G\.aim\)\{placeOrAim/.test(u), 'rclaunch: left-click must cancel the armed power / Strike, not fire it');
  ck(/function lgPointer\(e\)\{[^\n]*if\(e\.button===0\)\{[^}]*G\.lgM=null/.test(l), 'rclaunch: left-click must cancel a road job (right-click does it)'); }
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
// ---- Base looks (L4, Abdullah 2026-11-14): three base families on ONE switch baseStyle(fac) = me | soviet | west (src/11c-bases.js); the yard
// wall of every non-ME base is drawn by baseYard (one merged mesh), never a second wall system next to it.
{ const b = SRC['11c-bases.js'] || '', m = SRC['11-models.js'] || '';
  ck(/function baseStyle\(/.test(b) && /function baseYard\(/.test(b) && /function baseSlabKit\(/.test(b) && /'soviet'/.test(b) && /'west'/.test(b), 'base looks: 11c-bases.js lost baseStyle / baseYard / baseSlabKit or a family');
  ck(/baseYard\(e,o,P,RR,gate,BP\)/.test(m) && /baseSlabKit\(B,e,T,s\)/.test(m) && /baseTint\(T\.fac,RT\)/.test(m), 'base looks: 11-models no longer calls baseYard / baseSlabKit / baseTint');
  ck(/OBX=\['OB','BI'\]/.test(b), 'base looks: OB/BI no longer use the Middle-Eastern compound family'); }
// ---- National vehicles (Abdullah 2026-11-17): Palestine never shows an MBT; RS/DW/RV/OB artillery is a rocket truck, never the regular-army Msta
{ const m = SRC['11-models.js'] || '';
  ck(/MIL_TANK\.OB=\{m:'technical'/.test(m) && !/RV:'t62',OB:'t55'/.test(m) && !/OB:'t55'/.test(m) && !/RMAP\.tank\.OB/.test(m), 'national vehicles: OB got a tank model slot again (Palestine must never show an MBT)');
  ck(/\['RS','DW','RV','OB'\]\.includes\(f\)/.test(m), 'national vehicles: RS/DW/RV/OB artillery is no longer kept off the Msta self-propelled gun');
  ck(/cn72/.test(m) && /in90/.test(m) && /pk72/.test(m), 'national vehicles: CN/IN/PK lost their own tank paint');
  ck(/gb35/.test(m) && /de35/.test(m) && /il35/.test(m) && /RMAP\.atgm,\{US:'humvee'/.test(m), 'national vehicles: the West family (US/GB/FR/DE/IL/UA trucks and ATGM carriers) lost its own looks');
  ck(/ru_ural/.test(m) && /cn_ural/.test(m) && /kp_ural/.test(m) && /RMAP\.atgm,\{CN:'cnhum'/.test(m), 'national vehicles: the East family (RU/CN/KP trucks and ATGM carriers) lost its own looks');
  ck(/in_ural/.test(m) && /pk_ural/.test(m) && /jp35/.test(m) && /sa35/.test(m) && /RMAP\.atgm,\{IN:'inhum'/.test(m), 'national vehicles: the Regional family (IN/JP/KR/PK/SA/AE/TR/EG trucks and ATGM carriers) lost its own looks');
  // only the US wears the white star: the M35 truck texture's star spots are painted over for every other nation
  ck(/function noStarMap/.test(m) && /key==='m_m35'&&!\(team&&team\.fac==='US'\)&&c\.map\)c\.map=noStarMap/.test(m), 'no US star on non-US trucks: the M35 texture patch (noStarMap) is gone or no longer skips only the US');
  // PACK looks7: AA, rocket rack, EW and ATGM carriers each get a family-specific code-built add-on on the nation's truck (West / East / Shia / Regional), shared per paint
  ck(/function aaGeo\(/.test(m) && /function rackGeo\(/.test(m) && /function ewGeo\(/.test(m) && /function atgmGeo\(/.test(m) && /extra==='aatruck'/.test(m) && /extra==='atgm'/.test(m) && !/atgm:\{m:'truck',fit:'z',size:27,extra:'samtruck'/.test(m) && /addonWarm\(facs\)/.test(m), 'national vehicles: the family add-ons (AA turret, rocket rack, EW mast, ATGM launcher) are gone or AA/ATGM went back to the one shared SAM box');
  const g = SRC['04-gfx.js'] || '', fx = SRC['05-fx3d.js'] || '';
  ck(/decalSet\('lamp'\)|decal\('lamp'\)/.test(m) && /k==='lamp'/.test(m) && /todDark\(\)/.test(m) && /'eye','blob','lamp'/.test(fx), 'night: vehicle headlights must be one instanced lamp set, drawn only in the dark, and warmed up at battle load');
  ck(/const WETG=/.test(g) && /gWetK/.test(g) && /WETG\.value/.test(fx), 'rain: the wet-ground darkening (WETG uniform in the ground shader, eased by weatherFX) is gone'); }
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
// Seat fairness (Abdullah 2026-11-14 23:56 "Yes", mapfix): start position 1 must not shoot/think first, and caribbean + hormuzgate have point-exact starts
{ const sim = SRC['03-sim.js'] || '', mp = SRC['02-map.js'] || '', rm = SRC['02b-realmaps.js'] || '', ck2 = SRC['07b-ckpt.js'] || '';
  ck(/G\.upN=\(G\.upN\|0\)\+1/.test(sim) && /rv=G\.upN&1/.test(sim) && /G\.ents\[rv\?n-1-k:k\]/.test(sim), 'mapfix: the per-tick unit loop must alternate direction (G.upN parity) so team order is fair');
  ck(/G\.teams\[\(q\+G\.upN\)%NT\]/.test(sim), 'mapfix: the AI think order must rotate with G.upN, not always start with team 0');
  ck(/'upN'/.test(ck2), 'mapfix: G.upN must be in the checkpoint (host migration keeps the same tick order)');
  ck(/mirRes:1/.test(mp.slice(mp.indexOf('caribbean:{'), mp.indexOf('caribbean:{') + 200)) && /mirRes:1/.test(rm.slice(rm.indexOf('hormuzgate:{'), rm.indexOf('hormuzgate:{') + 200)) && /D\.mirRes&&NB===2/.test(mp), 'mapfix: caribbean and hormuzgate must keep mirRes:1 (derricks and supply fields are the exact point mirror)');
  ck(/hMir=D\.mirRes&&BASES\.length===2/.test(mp) && /msrc=D\.mirRes&&BASES\.length===2/.test(mp), 'mapfix: on mirRes maps the hamlets and cities of base 2\'s half are base 1\'s turned half a circle (equal garrisonable houses near both starts)');
  const car = mp.slice(mp.indexOf('caribbean:{'), mp.indexOf('khyber:{'));
  ck(!/Math\.sin\(q\*3|Math\.sin\(q\*7/.test(car) && /cities:mirrorList\(/.test(car), 'mapfix: caribbean coast shapes use even harmonics only and its cities are mirrored (equal coast for both starts)');
  ck(/if\(!best\)return;if\(Math\.hypot\(Math\.max\(0,Math\.abs\(best\.x-u\.x\)-best\.size\/2\),Math\.max\(0,Math\.abs\(best\.y-u\.y\)-best\.size\/2\)\)<26\)/.test(sim), 'mapfix2: a supply truck unloads by distance to the HQ/depot EDGE, not its centre (a truck stuck at the HQ corner gave seat 1 a third more money on caribbean/hormuzgate)');
  ck(!/w:a=>\.05\*Math\.sin\(a\*3\)/.test(rm.slice(rm.indexOf('hormuzgate:{'), rm.indexOf('tihama:{'))), 'mapfix: hormuzgate centre island needs an even-harmonic outline (point mirror)'); }
{ const fh = SRC['08l-firsthint.js'] || '', so = SRC['08b-social.js'] || '', mn = SRC['14-menu.js'] || '';
  ck(/FH_TEXT/.test(fh) && ['Battle', 'Mission', 'Test range'].every(m => fh.includes("'" + m + "':")) && !fh.includes("'Conquest':"), 'polishE: a mode lost its first-steps hint card');
  ck(/const TUTB=\[/.test(so) && /function startBattleTutorial/.test(so) && /startBattleTutorial\(\)/.test(so.slice(so.indexOf('function socialMenu'))), 'polishE: the Battle tutorial is gone from the menu');
  ck(!/const TUTC=|function startTutorial\(|tutTown\(/.test(so) && /let TUT=TUTB;/.test(so) && /\{k:'sup',/.test(so) && /LGU\.on/.test(so), 'one game: the ONE tutorial is the Battle tutorial and it teaches the supply lines (step sup: press L)'); }
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
  // redfixE (2026-11-17, gate/save "replay differs after +2 min"): a loaded save / migrated host must play on exactly like the original - the checkpoint keeps
  // the supply network as last worked out (refreshed once a second), the ruins list (map-building refs), the per-second faction tick and off-map units' kept caches
  { const c7 = SRC['07b-ckpt.js'] || ''; ck(/lgc=L\?\{sig:L\.sig,cvT:L\.cvT/.test(c7) && /L\.cov=JSON\.parse/.test(c7), 'save/migration: the checkpoint must keep the supply network state (lgc in ckEncode/ckRestore)');
    ck(/\['mines','smokes','shields','ruins'\]/.test(c7), 'save/migration: G.ruins holds map-building refs and must be decoded in ckRestore'); ck(/'_fmQ'[,\]]/.test(c7), 'save/migration: the per-second faction tick (_fmQ) must be in CK_G');
    ck(/k\[0\]==='_'&&!CK_UKEEP\.has\(k\)\)\)\)\{/.test(c7), 'save/migration: units inside buildings/tunnels keep the CK_UKEEP fields too');
    ck(/Math\.random=FX_RND;try\{fxPlay\(type,args\);\}finally\{Math\.random=r;\}/.test(SRC['03-sim.js'] || ''), 'save/migration: effects/sounds played from the simulation (FXE) must not take the battle\'s random numbers');
    ck(/function boccSig\(/.test(SRC['02-map.js'] || '') && /'boccS'\]/.test(c7) && /ckFfcLoad\(ck\.ffc\)/.test(c7), 'save/migration: building footprints (boccS) and route fields (ffc) must be in the checkpoint'); }
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
// ---- controlsfeel (Abdullah 2026-11-17 polish queue "Controls feel"): camera pan glides (CAMS velocity eased with exp(-dt), so the same at any
// frame rate), the wheel zooms by moving the zoom TARGET (cam.td) that camTick eases toward (never a jump of cam.dist), one Settings > Mouse
// "Camera smoothing" switch (mCam), a short pick-up pulse in the ONE ring system (SELR.ts), the clean box-select and the Shift/Alt path preview.
{ const ui = SRC['08-ui.js'] || '', vw = SRC['06-view.js'] || '', of = SRC['06d-orderfeel.js'] || '', all = srcFiles.filter(f => !/^13/.test(f)).map(f => SRC[f]).join('\n');
  ck(/function camGlide\([\s\S]{0,300}Math\.exp\(-dt\*/.test(ui) && /\[rx,dn\]=camGlide\(/.test(ui), 'controlsfeel: camera pan must glide through camGlide (exp(-dt) easing, frame-rate independent)');
  ck(/scroll\(Math\.min\(\.25,rawDt\)\)/.test(ui), 'camera pan must run on real frame time (rawDt, cap .25 s), not the .05 s sim-capped dt: slow CI/PC frames made edge scroll crawl (gate/controls lock edge test)');
  ck(/const CAMS=\{/.test(vw) && (all.match(/const CAMS=/g) || []).length === 1, 'controlsfeel: one camera glide state (CAMS in 06-view)');
  { const wh = /cv\.addEventListener\('wheel',[^\n]*/.exec(ui); ck(wh && /cam\.td=nd/.test(wh[0]) && !/cam\.dist=/.test(wh[0]), 'controlsfeel: wheel zoom must move the zoom target (cam.td) so camTick eases it, never set cam.dist directly'); }
  ck(/kz=1-Math\.exp\(-dt\*/.test(vw), 'controlsfeel: camTick must ease zoom with exp(-dt)');
  ck(/\['sMCam','Camera smoothing/.test(ui) && /mCam:1\}/.test(ui), 'controlsfeel: Settings > Mouse needs the one "Camera smoothing" switch (mCam, default On)');
  ck(/SELR=\{[^\n]*ts:new Map\(\)/.test(of) && /pick-up pulse/.test(of), 'controlsfeel: newly selected units pulse in the one ring system (SELR.ts)');
  ck(/function selBox\(c\)/.test(vw) && /function wayPreview\(c\)/.test(vw) && !/createElement/.test((/function selBox[\s\S]*?function wayPreview[\s\S]*?\n\/\*/.exec(vw) || [''])[0]), 'controlsfeel: box select + Shift/Alt path preview are canvas-drawn (no DOM per frame)'); }
// ---- American voices (Abdullah 2026-11-13 20:08 "Americans sound British"): the US unit voices are cloned from public-domain American recordings
// (tools/voices/refs, credits in CREDITS.md), never the old studio speakers; the credits text names the source. Render recipe: orch/reports/usvoice.md.
{ const cast = JSON.parse(fs.readFileSync(path.join(ROOT, 'orch', 'vo', 'cast.json'), 'utf8')).US || {};
  const ids = [].concat(cast.sold || [], cast.cmd || []);
  ck(ids.length >= 3 && ids.every(v => /^clone:us_[a-z]+$/.test(v)), 'usvoice: the US cast must use the cloned American voices (clone:us_*): ' + JSON.stringify(ids));
  for (const v of new Set(ids)) ck(fs.existsSync(path.join(ROOT, 'tools', 'voices', 'refs', v.slice(6) + '.flac')), 'usvoice: missing reference clip for ' + v);
  ck(/US unit voices[^<]{0,200}public.domain/i.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), 'usvoice: menu credits do not name the American voice source'); }
// rsvoice (Abdullah 2026-11-15 "Lebanese dialogue doesn't sound Lebanese enough" -> "Both, best quality"): RS lines are Lebanese colloquial and the
// RS cast is XTTS cloned from real Lebanese speakers (MASC corpus, CC BY 4.0; tools/voices/refs/lb_*.flac), never the old studio speakers.
{ const rn = fs.readFileSync(path.join(ROOT, 'orch', 'vo', 'render.py'), 'utf8'), m = rn.match(/'RS': dict\(([^\n]*)\)/), ids = m ? [...m[1].matchAll(/'(clone:[a-z_]+|[A-Z][a-z]+ [A-Z][a-z]+)'/g)].map(x => x[1]) : [];
  ck(ids.length >= 3 && ids.every(v => /^clone:lb_[a-z]+$/.test(v)), 'rsvoice: the RS cast must use the cloned Lebanese voices (clone:lb_*): ' + JSON.stringify(ids));
  for (const v of new Set(ids)) ck(fs.existsSync(path.join(ROOT, 'tools', 'voices', 'refs', v.slice(6) + '.flac')), 'rsvoice: missing reference clip for ' + v);
  ck(/Lebanese unit voices[^<]{0,300}MASC/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), 'rsvoice: menu credits do not name the Lebanese voice source (MASC)'); }
// rvvoice (Abdullah 2026-11-15 04:09 "Yes" to re-recording RV with the gritty pipeline): RV lines are south-Iraqi colloquial and the RV cast is
// XTTS cloned from real Iraqi speakers (MASC corpus, CC BY 4.0; tools/voices/refs/iq_*.flac), never the old studio speakers.
{ const cast = JSON.parse(fs.readFileSync(path.join(ROOT, 'orch', 'vo', 'cast.json'), 'utf8')).RV || {};
  const ids = [].concat(cast.sold || [], cast.cmd || []);
  ck(ids.length >= 2 && ids.every(v => /^clone:iq_[a-z]+$/.test(v)), 'rvvoice: the RV cast must use the cloned Iraqi voices (clone:iq_*): ' + JSON.stringify(ids));
  for (const v of new Set(ids)) ck(fs.existsSync(path.join(ROOT, 'tools', 'voices', 'refs', v.slice(6) + '.flac')), 'rvvoice: missing reference clip for ' + v);
  ck(/south-Iraqi unit voices[^<]{0,300}MASC/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), 'rvvoice: menu credits do not name the Iraqi voice source (MASC)'); }

// v3voice (voices3 2026-11-17, Abdullah "Work on these now": FR, DE, GB re-recorded, JP role/radio/shout lines, Hebrew announcer): the FR/DE/GB/JP casts are
// XTTS clones of native male speakers under free licences (LibriVox public domain, Thorsten-Voice CC0, Common Voice CC0; tools/voices/refs/CREDITS.md).
{ const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'orch', 'vo', 'cast.json'), 'utf8')), html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const [n, pre] of [['FR', 'fr'], ['DE', 'de'], ['GB', 'gb'], ['JP', 'ja']]) { const cast = all[n] || {}, ids = [].concat(cast.sold || [], cast.cmd || []);
    ck(ids.length >= 3 && ids.every(v => new RegExp('^clone:' + pre + '_[a-z0-9]+$').test(v)), 'v3voice: the ' + n + ' cast must use the cloned native voices (clone:' + pre + '_*): ' + JSON.stringify(ids));
    for (const v of new Set(ids)) ck(fs.existsSync(path.join(ROOT, 'tools', 'voices', 'refs', v.slice(6) + '.flac')), 'v3voice: missing reference clip for ' + v);
    for (const s of ['', '_r', '_h', '_s']) ck(fs.existsSync(path.join(ROOT, 'vo', n + s + '.mp3')), 'v3voice: missing sheet vo/' + n + s + '.mp3'); }
  ck(/French, German, British and Japanese unit voices[^<]{0,400}LibriVox[^<]{0,400}Common Voice/.test(html), 'v3voice: menu credits do not name the FR/DE/GB/JP voice sources');
  ck(/"he":\{"building":\[/.test(SRC['09d-announcer.js'] || ''), 'v3voice: the Hebrew announcer has no recorded clips (ANN_OFF.he)'); }
// ---------- static checks ----------
// polishP2 "Never lose progress": one save system. Battles autosave into 3 rolling slots (08d-save.js) and the menu's Continue (first item) resumes the newest. Runtime proof: orch/polishtest.mjs (gate/save).
{ const sv = SRC['08d-save.js'] || '', m = SRC['14-menu.js'] || '';
  ck(/\['auto','auto2','auto3'\]/.test(sv) && /setInterval\(\(\)=>\{try\{svAutoTick\(\)/.test(sv), 'progress: battle autosave (3 rolling slots on a timer) is gone from 08d-save.js');
  ck(/MX\.cont=item\(/.test(m) && !/svGrandInfo|svContinueGrand/.test(sv), 'progress: Continue must be the first menu item and cover battle saves only (the grand campaign was removed 2026-11-14)');
}
// Living main menu (idea 9, Abdullah 2026-11-10 "Let's go all of them"; finished by helper finish-menu): the menu background shows YOUR war - whatever Continue would resume.
//   campaign save -> the map around your nation + your last battle (grWarTable / grLastB -> the save's '.i' note); battle save -> that battlefield with the front line (svFront in the
//   save's list entry); no save -> the calm world-map picture. The menu never loads the campaign code for it. ONLY idea 9: named veterans (8) and battle scars (11) are NOT in the game,
//   and none of this is campaign state or checkpoint data (display notes only). Runtime proof: orch/smoke.mjs (lazy page: with a campaign save, with a battle save, with no save).
{ const m = SRC['14-menu.js'] || '', sv = SRC['08d-save.js'] || '', ck7 = SRC['07b-ckpt.js'] || '', all = Object.values(SRC).join('\n');
  ck(!/GC\.scars|grScar\(|GC\.lastB|GC\.vets|grVeteran/.test(all), 'living menu: battle scars / named veterans (ideas 11 and 8) must stay out - no GC.scars, grScar, GC.vets in src/');
  ck(!/GR_LASTB|svFront|grWarTable|\bwt\b/.test(ck7), 'living menu: the last-battle note and the front sketch are display notes - they must not enter the checkpoint (src/07b-ckpt.js)');
  ck(/function svFront\(\)/.test(sv) && /thumb:svThumb\(\),wt:svFront\(\)/.test(sv) && !/ckEncode\(\)[^\n]*svFront/.test(sv), 'living menu: a battle save must carry the front sketch in its list entry only (svMeta wt:svFront() in 08d-save.js)');
}
// polishP2 "Settings": the one key table (src/06z-keys.js KEYTAB) lists every key the battle handlers listen to; the Keyboard keys window (08m-controls.js) shows that table.
//     A hotkey added to a handler without a row fails here. W A S D are camera-only and never rebindable. Runtime proof: orch/polishtest.mjs (gate/save).
{ const kt = SRC['06z-keys.js'] || '', ui = SRC['08-ui.js'] || '', all = Object.entries(SRC).filter(([f]) => /^0[689]/.test(f) || f === '03i-leaders.js').map(x => x[1]).join('\n');
  const defs = new Set([...kt.matchAll(/ctx:'battle'[^}]*def:'(.)'/g)].map(m => m[1]));
  ck(defs.size >= 18 && /KB_FIXED='wasd'/.test(kt) && !['w', 'a', 's', 'd'].some(k => defs.has(k)), 'keys: the key table is gone or W A S D became rebindable');
  const hk = ui.slice(ui.indexOf("window.addEventListener('keydown',e=>{if(e.target&&(e.target.tagName==='INPUT'"), ui.indexOf("window.addEventListener('keyup'"));
  const used = new Set([...hk.matchAll(/k==='([a-z])'/g)].map(m => m[1])); for (const m of all.matchAll(/POW_KEY(?:=\{([^}]*)\}|\.\w+='(.)')/g)) { if (m[2]) used.add(m[2]); else for (const x of m[1].matchAll(/:'(.)'/g)) used.add(x[1]); }
  for (const m of all.matchAll(/e\.key==='([a-z])'\|\|e\.key==='[A-Z]'/g)) used.add(m[1]);
  const miss = [...used].filter(k => !defs.has(k) && k !== 'a'); ck(used.size >= 20 && !miss.length, 'keys: hotkey(s) without a row in the one key table (src/06z-keys.js): ' + miss.join(' '));
  ck(/function kbuOpen\(/.test(SRC['08m-controls.js'] || '') && /for\(const r of KEYTAB\)/.test(SRC['08m-controls.js'] || ''), 'keys: the Keyboard keys window must list KEYTAB'); }
// polishP2 "Readability": one text-size switch (SET.ts 100/115/130 %, src/08n-readable.js TS_ROOTS) that every panel root is listed in, and colour-blind mode
//     carries team identity by shape too (minimap, selection rings, town name plates, allies list). Runtime proof: orch/polishtest.mjs section 4 (1366x768 + 1920x1080).
{ const rd = SRC['08n-readable.js'] || '', idn = SRC['08b-identity.js'] || '';
  ck(/const TS_STEPS=\[1,1\.15,1\.3\]/.test(rd) && ['#side', '.overlay>.card', '#mx', '#kbWin .kbcard'].every(r => rd.includes("'" + r + "'")), 'readability: the text-size setting or one of its panel roots is gone (src/08n-readable.js TS_ROOTS)');
  ck(/const ID_CB=\[/.test(idn) && /function idMiniMark\(/.test(idn) && /function cbGlyph\(/.test(rd), 'readability: colour-blind mode must mark teams by shape on the minimap, town name plates and allies list'); }
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
// Menu background (Abdullah 2026-11-14 17:07 "Have an epic static main menu background"): ONE static picture, no live shell battle, no war table.
{ const m = SRC['14-menu.js'] || '', all = Object.values(SRC).join('\n');
  ck(!/mxShell|mxshell|G\.shell\b|SH\.on/.test(all) && !/mxWarTable|mxWarSrc|#mxwt/.test(all), 'menu background: the live shell battle / war table are back (one static picture only)');
  ck(/#mxbg\{[^}]*url\(menu-world\.webp\)/.test(m) && !/mxpan/.test(m) && fs.existsSync(path.join(ROOT, 'menu-world.webp')) && fs.statSync(path.join(ROOT, 'menu-world.webp')).size < 450000 && !fs.existsSync(path.join(ROOT, 'menu-bg3.webp')), 'menu background: #mxbg must be a CSS background of menu-world.webp, the epic world map (Abdullah 2026-11-14 21:02; static, under 450 KB)'); }
// 0a. Game feel (2026-11-09 22:44): shell impacts match the surface (water spray / road chips / the map's soil) and tanks rock when they fire.
{ const f = SRC['05-fx3d.js'], v = SRC['06-view.js'];
  ck(/function impactSurf\(/.test(f) && /function splashFX\(/.test(f) && /if\(wet\)splashFX\(x,y,s,big\)/.test(f), 'game feel: explosions no longer check the surface they hit (water spray is gone)');
  ck(/if\(!wet\)scorch\(x,y,s\)/.test(f), 'game feel: explosions scorch the water surface again');
  ck(/ud\.rock=fz/.test(v) && /o\.rotation\.z=tp\+ud\.sp\+fz/.test(v), 'game feel: the hull no longer rocks when the gun fires'); }
// 0c. One look for everything (2026-11-09 22:44): every battle model material goes through the ONE shared material library (src/11c-look.js);
//     a second place that hands out its own roughness/metalness for borrowed models must not come back.
{ const m = SRC['11-models.js'], l = SRC['11c-look.js'] || '';
  ck(/lookApply\(c,key,team,m\);map\.set\(m,c\)/.test(m), 'one-look: tintedProto no longer sends every material through lookApply (src/11c-look.js)');
  ck(/lookShader\(m,sh\)/.test(m) && /u\.look\|\|''/.test(m), 'one-look: the weathering shader / merge signature lost the look class');
  for (const c of ['metal', 'canvas', 'concrete', 'mudbrick', 'sand', 'rubber', 'glass']) ck(new RegExp('\\b' + c + ':\\{r:').test(l), 'one-look: surface class "' + c + '" is missing from LOOK.cls');
  for (const f of ['IR', 'RS', 'DW', 'RV', 'IL', 'SA', 'US']) ck(new RegExp('\\b' + f + ":\\['#").test(l), 'one-look: Middle East slice nation ' + f + ' has no wall palette in LOOK.wall');
  ck(/ambientCG\.com \(CC0\)/.test(l) && /Poly Haven \(CC0\)/.test(l), 'one-look: the CC0 texture credits line is gone'); }
// RANGES (orch/RANGES.md): battle ratios rifle <= tank < ATGM
{
  const d = SRC['01-data.js'] || ''; const r = (k) => +((d.match(new RegExp('\\n\\s*' + k + ':\\{[^\\n]*?\\brng:(\\d+)')) || [])[1] || 0);
  ck(r('tank') && r('atgm') && r('tank') < r('atgm'), 'ranges: tank gun must be shorter than ATGM'); }
// 2. Controls (2026-10-28): W A S D only scroll the camera; A is not attack-move; F is; X is stop.
{ const hits = []; for (const f of srcFiles) SRC[f].split('\n').forEach((l, i) => { for (const m of l.matchAll(/\bkeys\.[wasd]\b/g)) hits.push([f, i + 1, l]); });
  for (const [f, n, l] of hits) ck(/cam\.t[xy]\s*[-+]=/.test(l) || /keys\.[wasd]\s*=/.test(l) || /^function scroll\(dt\)\{camTarget\(\);const sp=/.test(l) /* scroll() = the camera pan (keys feed camGlide, controlsfeel) */, `WASD used for something other than the camera: ${f}:${n}`);
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
  /* 2026-11-14 18:03 Abdullah "in test range all buildings and units are available": the tech-tree skip for the range is allowed again */ ck(/G&&G\.sandbox&&t===0/.test(S3), 'Test range must open every building (reqMet skip for the player)'); ck(!/G&&G\.sandbox&&T\.id===0\)t\/=6/.test(S3) && !/m===2&&G\.sandbox/.test(S3), 'Test range still builds 6x faster or ignores build-spot rules');
  ck(/G\.battle=!o\.camp;/.test(S3), 'newGame must make a sandbox a Battle game (G.battle true)');
  ck(/oos=!e\.sup&&e\.am<=0;/.test(SRC['06-view.js']), 'out-of-supply badge rule changed'); }
// 3. Main menu order + naming (2026-11-07 21:41): Single player · Multiplayer · Test range, then small extras; no Classic.
// 3. Main menu order + naming (2026-11-07 21:41; one game 2026-11-13 20:18): Play · Multiplayer · Test range, then small extras; no Classic.
{ const m = [...SRC['14-menu.js'].matchAll(/^\s*item\('([^']+)'/gm)].map(x => x[1]).filter(Boolean).slice(0, 3);
  ck(m.join('|') === 'Play|Multiplayer|Test range', 'main menu order is ' + m.join(' · '));
  for (const f of ['14-menu.js', '08d-lobby.js']) ck(!/['">]Classic[<'"]/.test(SRC[f]), 'Classic mode still named in ' + f); }
// Shia missions (Abdullah 2026-11-14 "begin polishing"): the story Missions hold at least one mission for each of IR, RS, DW and RV, each on a real map with a briefing, goals, win and lose text.
{ const M = SRC['12-campaign.js'] || '';
  for (const f of ['IR', 'RS', 'DW', 'RV']) ck(new RegExp("\\{id:'[a-z]+',n:\\d+,title:'[^']+',sub:'[^']+',fac:'" + f + "'").test(M), 'missions: no story mission for ' + f);
  for (const m of M.matchAll(/\{id:'([a-z]+)',n:\d+,[^\n]*?map:'([a-z0-9_]+)'/g)) ck(Object.entries(SRC).some(([f, t]) => /^02/.test(f) && new RegExp('^\\s+' + m[2] + ':\\{', 'm').test(t)) || Object.entries(SRC).some(([f, t]) => /^02/.test(f) && t.includes("{k:'" + m[2] + "'")), 'missions: ' + m[1] + ' uses map ' + m[2] + ' which does not exist');
  ck((M.match(/\bbrief:\[/g) || []).length >= 6 && (M.match(/\bwin:'/g) || []).length >= 6 && (M.match(/\blose:'/g) || []).length >= 6, 'missions: every mission needs brief, win and lose text (6 expected)'); }
// 4. ONE GAME (Abdullah 2026-11-13 20:18 "Abandon conquest and campaign entirely remove them from the game"): the grand campaign is gone -
//    no src/13* modules, no lazy bundle / loader, no grand code path or typeof-guarded call into it anywhere in src/.
{ const all = Object.values(SRC).join('\n');
  ck(!srcFiles.some(f => /^13/.test(f)) && !srcFiles.includes('12zz-grandload.js'), 'one game: grand campaign modules (src/13*, src/12zz-grandload.js) are back');
  ck(!fs.readdirSync(ROOT).some(f => /^grand\.[0-9a-f]{10}\.js$/.test(f)) && !/GRAND_FILE/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), 'one game: the grand bundle / GRAND_FILE line is back');
  ck(!/\bG\.grand\b|\bconqBan\b|loadGrand|grandMenu|grandBattleSetup|GRAND_NOPROD|svGrandInfo|gnLobby|\bGC\.|GR_REAL/.test(all), 'one game: a grand-campaign code path is back in src/ (G.grand, conqBan, loadGrand, grandMenu, gnLobby, GC. ...)');
  // ... and Conquest is gone too: no G.conq, no towns layer (town capture, tax, opinion, revolts, militias, setup timer), no Conquest/Battle switch, no Realistic toggle
  ck(!/\bG\.conq\b|\bG\.towns\b|\binitTowns\(|\bupdTowns\(|\btownIncome\(|\bCQ_[A-Z]|\bsetupEnd\b|\bopOf\(|\bpolMul\(|\bREAL_TIER\b|\brealRow\(|\bsetup\.real\b|\bsetup\.bmAll\b|Conquest battlefields too/.test(all), 'one game: a Conquest code path is back in src/ (G.conq, G.towns, town tax/capture, setup timer, opinion, Realistic, Conquest map link)');
  // no saving in multiplayer (Abdullah 2026-11-14 23:13 "Remove the save option for multiply player"): saves are single-player only and the pause menu hides Save game online
  ck(/function svCanSave\(\)\{return[^}]*MODE==='single'/.test(all) && /sv\.hidden=mp/.test(all), 'multiplayer must not offer Save game (svCanSave single-player only, pause menu hides the button online)');
  ck(!['03h-economy.js', '08c-towns.js', '08c-economy.js'].some(f => srcFiles.includes(f)), 'one game: a Conquest-only module (03h-economy, 08c-towns, 08c-economy) is back');
  // Battle has supply lines (Abdullah 2026-11-13 20:19 "Bring supply lines into battle") and the ammo rule (20:06): refill inside your area, no timers, Test range unlimited
  const sim = SRC['03-sim.js'] || '', lg = SRC['03c-logistics.js'] || '', lgu = SRC['08c-logi.js'] || '';
  ck(/G\.battle=!o\.camp;/.test(sim), 'one game: every skirmish / online game must start as Battle (newGame G.battle)');
  ck(/function lgCover\(/.test(lg) && /lgCover\(\);G\.lgv=/.test(lg) && /G\.lg&&G\.lg\.bead/.test(sim) && /if\(G\.lg\)lgTick\(st\)/.test(sim), 'supply lines: lgCover (roads out of HQ + depots) must feed the supply area (supplyPoints beads) and run every supply tick');
  ck(/function ammoOn\(\)\{return !!G&&!G\.sandbox;\}/.test(sim) && /function hasAmmo\(u\)\{const s=u\.s;return ammoOn\(\)&&/.test(sim) && !/\b[ue]\.supT\b|G\.t-\([ue]\.supT/.test(Object.values(SRC).join('\n')), 'ammo rule: Battle tracks ammo (refill inside your area, no time-based out-of-supply penalty), Test range unlimited');
  ck(!/G\.battle\)\{LGU\.on=false|if\(G&&G\.battle\)return false|!G\.battle&&!G\.lg|G\.battle\|\|!G\.lg/.test(lgu), 'supply lines: the overlay / minimap lines must not be switched off in Battle'); }
// 5. Names / identity that must not drift.
ck(/Radwan Training/.test(SRC['01-data.js'] + Object.values(SRC).join('')), 'upgrade name "Radwan Training" is gone');
// Shia sub-leader titles are lane AY's open work (PLAN-SAT): reported, not failed, until AY ships; then change warn -> ck.
for (const [w, why] of [['Secretary-General', 'RS leader'], ['Leader of the Revolution', 'DW leader']])
  if (!Object.values(SRC).some(s => s.includes(w))) console.log(`pending (lane AY): "${w}" (${why}) not in the game yet`);
// 6. No hosting wording in the multiplayer menu (2026-10-27): one "Play online" button.
{ const mm = SRC['14-menu.js']; ck(!/Host (a )?(game|battle|match)|Hosting\b/i.test(mm.replace(/\/\/.*$/gm, '')), 'hosting wording in the menu'); ck(/Play online/.test(mm), 'no "Play online" in the menu'); }

// BATTLE MAPS (Abdullah 2026-11-11 19:40 / 20:14: Battle gets its own maps; every map fun and fair; 2026-11-14 one game: the old Conquest maps are Battle maps too): every listed Battle map
// passes the structural fairness checks (symmetric supply, derricks, routes; 2+ attack routes; all starts reachable), and the
// map list is Battle maps first, then every other battlefield.
{ const { spawnSync } = await import('node:child_process'); const r = spawnSync(process.execPath, [path.join(ROOT, 'orch/battlemapfair.mjs'), '--static'], { encoding: 'utf8' });
  ck(r.status === 0 && /BATTLEMAPFAIR STATIC PASS/.test(r.stdout || ''), 'a listed Battle map fails the structural fairness checks: ' + (r.stdout || r.stderr || '').trim().split('\n').filter(l => /FAIL|differ|fewer|only|cannot|not equally/.test(l)).slice(0, 6).join(' | '));
  const bm = SRC['02d-battlemaps.js'] || ''; ck(/for\(const id in BMAPS\)bmRegister\(id,BMAPS\[id\]\)/.test(bm) && !/MAP_KEYS\.push/.test(bm), 'Battle maps must register through bmRegister and never join the Conquest list (MAP_KEYS)');
  ck(/cmBuild\(c,key\)/.test(bm) && /cmCanon\(/.test(bm), 'Battle maps must load through the map editor loader (cmCanon / cmBuild): one map system'); }
// ONLINE LOBBY LAYOUT (Abdullah 2026-11-14 16:51 "Do this layout for multiplayer", Zero Hour skirmish screen): host and guest share ONE framed screen
// (src/08d-mplobby.js): players table Player / Colour / Nation / Team, a map preview with SELECT MAP, options row, log + chat line, PLAY GAME / READY and BACK.
{ const ml = SRC['08d-mplobby.js'] || '', nt = SRC['07-net.js'] || '', lb = SRC['08d-lobby.js'] || '', kit = SRC['08d-lobkit.js'] || '';
  ck(/<th>Player<\/th><th>Colour<\/th><th>Nation<\/th><th>Team<\/th>/.test(ml) && /SELECT MAP/.test(ml) && /mapPreview\(D\.mk,cv\)/.test(ml) && /PLAY GAME/.test(ml) && /BACK/.test(ml), 'online lobby: must be the framed screen with a Player/Colour/Nation/Team table, map preview, SELECT MAP, PLAY GAME and BACK');
  ck(/mplShow\(/.test(nt) && /mplShow\(/.test(lb), 'online lobby: leader (07-net) and guest (08d-lobby) must both draw through mplShow');
  ck(!/E\('div','lobhd'\)|E\('div','seats'\)|'grow'/.test(nt + lb) && !/^\.seat|^\.lob\{/m.test(kit), 'online lobby: the old seat-list lobby layout must be gone'); }
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
// zhfeel2 (2026-11-15): Zero Hour feel guards - radar pings on the minimap, rank chevrons + Promoted text, squad numbers, placement footprint, score screen rows.
{ const has = (f, re, m) => ck(re.test(SRC[f] || ''), 'zhfeel2: ' + m);
  has('06-view.js', /function mmPing/, 'minimap radar ping (mmPing) is gone'); has('09b-radio.js', /mmPing\(x,y/, 'radio events no longer ping the minimap');
  has('06-view.js', /rank chevrons/, 'rank chevrons are gone'); has('09b-radio.js', /PROMOTED/, 'Promoted floating text is gone');
  has('08-ui.js', /sqLast/, 'double-tap squad number centering is gone'); has('06-view.js', /function plFoot/, 'placement footprint grid (plFoot) is gone');
  has('08-ui.js', /Supplies collected/, 'score screen lost its Supplies collected row'); has('08-ui.js', /\['Score'/, 'score screen lost its Score row');
  has('03-sim.js', /sco:Math\.round/, 'endStats lost the score'); }
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  // cameos 2026-11-15 (Abdullah 2026-11-14 23:58): every buildable unit/building kind of every PLAYABLE nation gets a non-empty, painted picture (src/08q-cameos.js via UK.drawUnit / UK.drawBld)
  { const bad = await ev(() => { const out = [], cv = document.createElement('canvas'); cv.width = 104; cv.height = 80; const x = cv.getContext('2d');
      const px = () => { const d = x.getImageData(0, 0, 104, 80).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; };
      for (const f of PLAYABLE) { const F = FACTIONS[f]; if (!F) continue; const ks = new Set([...Object.keys(BASE).filter(k => BASE[k].from), ...Object.keys(F.units || {}).filter(k => (F.units[k] || {}).from || BASE[k])]);
        for (const k of ks) { let s; try { s = stats(f, k); } catch (e) { continue; } if (!s || !s.from) continue; x.clearRect(0, 0, 104, 80); try { UK.drawUnit(x, k, 104, 80, '#4a90d9', s, f, false); } catch (e) { out.push(f + ':' + k + ' ' + e.message); continue; } if (px() < 400) out.push(f + ':' + k + ' empty'); }
        for (const k of Object.keys(STRUCT)) { if (!STRUCT[k].cost || STRUCT[k].fake) continue; let s; try { s = bstats(f, k); } catch (e) { continue; } x.clearRect(0, 0, 104, 80); try { UK.drawBld(x, k, 104, 80, s, f, false, '#4a90d9'); } catch (e) { out.push(f + ':#' + k + ' ' + e.message); continue; } if (px() < 400) out.push(f + ':#' + k + ' empty'); } }
      return out; });
    ck(!bad.length, 'cameos: every buildable unit/building of every playable nation needs a painted picture: ' + bad.slice(0, 8).join(' | ')); }
  // ---- menus as a player
  const menu = await ev(() => [...document.querySelectorAll('#menu button, #menu .mx-item, .mx-item')].filter(b => b.offsetParent).map(b => b.textContent.trim()).filter(Boolean).slice(0, 12));
  console.log('menu items', JSON.stringify(menu)); await shot('menu');
  // BATTLE MAP LIST (Abdullah 2026-11-11 19:40): Battle setup offers the Battle map list; Conquest keeps its own list untouched (116 battlefields on 2026-11-13)
  { const L = await ev(() => { const opts = () => [...document.getElementById('mapSel').options].map(o => o.value).filter(k => !/^cm_/.test(k)); const b = opts(), bmap = setup.map, facts = BM_KEYS.filter(k => BM[k]).map(k => bmInfo(k));
      return { b, bmap, back: setup.map, bk: BM_KEYS.slice(), facts, allow: BATTLE_MAPS.map(a => a.slice()), fix: [battleMapFix('strait', 2), battleMapFix('strait', 6), battleMapFix('nosuchmap', 4), battleMapFix('lebanon', 8)].map(k => [k, MAPS[k] && MAPS[k].min, MAPS[k] && MAPS[k].max]), more: !!document.getElementById('mpMore') }; });
    ck(L.bk.length >= 1 && L.b.join() === L.bk.join() && L.bk.includes(L.bmap), 'Battle setup must offer the Battle map list, got ' + L.b.slice(0, 8).join(',') + ' (chosen ' + L.bmap + ')');
    // BATTLE MAP ALLOW-LIST (maptrim, Abdullah 2026-11-13 21:17 "cut the Battle list down to great, tested maps"): ONE list (BATTLE_MAPS) is the Battle map list;
    // every entry has a PASS row (every start 40-60% in AI-vs-AI Battle games) in orch/reports/maptrim.md; a removed map falls back to a listed map with enough slots
    ck(L.allow.map(a => a[0]).join() === L.bk.join(), 'the Battle map list (BM_KEYS) must equal the allow-list BATTLE_MAPS');
    { const md = fs.existsSync('orch/reports/maptrim.md') ? fs.readFileSync('orch/reports/maptrim.md', 'utf8') : '';
      const miss = L.allow.filter(([k]) => !new RegExp('\\| `' + k + '` \\|[^\\n]*PASS').test(md)).map(a => a[0]);
      ck(!miss.length, 'every Battle map needs a PASS fairness row in orch/reports/maptrim.md, missing: ' + miss.join(','));
      const cov = n => L.allow.filter(([k, lo, hi]) => lo <= n && hi >= n).length;
      ck(L.allow.length >= 20 && L.allow.length <= 40, 'the Battle list should hold about 20-40 great maps, has ' + L.allow.length);
      ck(L.allow.filter(a => a[1] <= 2 && a[2] >= 2).length >= 6 && L.allow.filter(a => a[2] >= 4).length >= 5 && L.allow.filter(a => a[2] >= 6).length >= 4 && L.allow.filter(a => a[2] >= 8).length >= 4, 'Battle list needs maps for 2, up to 4, up to 6 and up to 8 players'); }
    ck(L.fix.every(f => L.bk.includes(f[0])) && L.fix[1][2] >= 6 && L.fix[2][2] >= 4 && L.fix[3][2] >= 8, 'a removed map must fall back to a listed map with enough slots, got ' + JSON.stringify(L.fix));
    ck(!L.more, 'the Battle map picker must not offer other (removed) battlefields');
    ck(L.facts.every(f => f && f.name && f.players >= 2 && f.size && f.theme && f.desc && f.supply >= 2 * f.players && f.oil >= 2), 'every Battle map needs a name, player count, size, theme, one line, supply sources and oil derricks'); }
  // MENU STRUCTURE (Abdullah 2026-11-07 21:41 "There's a single player window or section and then multiplayer and test range"; one game 2026-11-13 20:18): the top level is exactly Play, Multiplayer, Test range (+ small extras)
  { const big = await ev(() => [...document.querySelectorAll('#mxmenu .mxi')].filter(b => b.offsetParent && !b.hidden && !/\b(dim|sep)\b/.test(b.className) && !/^Continue/.test(b.textContent.trim())).map(b => ((b.firstChild||{}).textContent||'').trim()));
    ck(big.join('|') === 'Play|Multiplayer|Test range', 'main menu top level should be exactly Play|Multiplayer|Test range, got ' + big.join('|'));
    const sm = await ev(() => [...document.querySelectorAll('#mxmenu .mxi.dim')].map(b => b.textContent.trim()));
    ck(sm.every(t => /^(Settings|Extras|Credits)/.test(t)), 'only Settings/Extras/Credits may be small top-level extras, got ' + sm.join('|'));
    const all = await ev(() => [...document.querySelectorAll('#mxmenu .mxi')].map(b => ((b.firstChild||{}).textContent||'').trim()));
    for (const bad of ['Grand campaign', 'Conquest', 'Battle', 'Missions', 'Tutorial', 'Play online', 'Single player']) ck(!all.includes(bad), '"' + bad + '" must not be on the top level');
    await ev(() => menuGo('single'));
    const sp = await ev(() => [...document.querySelectorAll('#ms-single .mxi')].filter(b => !b.hidden && b.id !== 'mxContSP').map(b => ((b.firstChild||{}).textContent||'').trim()));
    ck(sp.join('|') === 'Battle|Missions|Tutorial|Load game', 'Play should list exactly Battle, Missions, Tutorial, Load game, got ' + sp.join('|'));
    ck(await ev(() => [...document.querySelectorAll('#ms-single .mxi')].filter(b => !b.hidden).every(b => b.querySelector('small'))), 'every Play item needs a one-line description');
    ck(await ev(() => !/Conquest|campaign/i.test(document.getElementById('ms-single').textContent) && !/Conquest/i.test((document.getElementById('ms-c-map') || {}).textContent || '')), 'Play window / map screen still mention Conquest or the campaign');
    await ev(() => menuGo('online'));
    ck(await ev(() => !document.querySelector('#ms-online #mxolg') && !/Conquest|campaign/i.test(document.getElementById('ms-online').textContent)), 'Multiplayer must be Battle only (no game choice, no Conquest/campaign)');
    ck(await ev(() => typeof mxOnline === 'function' && !!document.getElementById('jcode') && typeof gnLobbyStart === 'undefined'), 'Multiplayer needs the join box, and no campaign lobby');
    await ev(() => menuGo('extras')); const ext = await ev(() => [...document.querySelectorAll('#ms-extras .mxi')].map(b => b.textContent.trim()));
    ck(!ext.some(t => /campaign/i.test(t)), 'Extras must not list the grand campaign (removed 2026-11-14), got ' + ext.join('|'));
    ck(await ev(() => typeof grandMenu === 'undefined' && !document.getElementById('grandBtn')), 'the grand campaign menu / button is back');
    await ev(() => { try { campClose(); } catch (e) {} menuHome(); }); }
  { const seen = await ev(SEEN); ck(!/classic/i.test(seen), 'menu shows "Classic"'); ck(!/\bhost(ing)?\b/i.test(seen.replace(/ghost/gi, '')), 'menu shows hosting wording: ' + (/.{20}\bhost.{20}/i.exec(seen) || [''])[0]); }
  // ---- data decisions
  const d = await ev(() => { const o = {}; o.fk = FKEYS.slice(); o.ms = MORALE_STYLE; o.rout0 = Object.entries(MORALE_STYLE).filter(([k, s]) => MSTYLES[s].rout === 0).map(([k]) => k).sort().join(' ');
    o.dw = (FACTIONS.DW || {}).name; o.rosterIR = roster('IR').barracks.concat(roster('IR').factory); return o; });
  ck(!d.fk.includes('EU'), 'EU still in FKEYS (retired from menus)');
  // nodoc 2026-11-14 (Abdullah 16:54 "Remove doctrines"): no doctrine can be picked and no doctrine buttons exist
  { const nd = await ev(() => ({ pick: gdPick(ME, GDOC_KEYS[0]), btn: !!document.querySelector('#panel [id^="dc_"],#panel [id^="dp_"],#gdocSel') })); ck(!nd.pick && !nd.btn, 'doctrines must be gone: ' + JSON.stringify(nd)); }
  // noform 2026-11-14 (Abdullah 19:18 "Remove formations and remove army stance and resupply and type button")
  { const nf = await ev(() => { try { fmBar(); renderSquads(); } catch (e) {} const t = [...document.querySelectorAll('#info button')].map(b => b.textContent).join('|'); return { fmb: !!document.getElementById('fmb'), key: typeof KEYTAB !== 'undefined' && KEYTAB.some(k => k.id === 'form'), t }; });
    ck(!nf.fmb && !nf.key && !/Type \(T\)|Resupply|Stance|Assault|Guerrilla/.test(nf.t), 'formations / Type / Resupply / stance buttons must be gone: ' + JSON.stringify(nf)); }
  // mpmap 2026-11-14 (Abdullah 21:22 "Multiplayer map selection is stuck"): the lobby map list is the Battle map list, not one map
  { const mm = await ev(() => { const D = { onMap: 1, nn: 2, mk: BM_KEYS[0] }; const ks = (BM_KEYS).filter(k => MAPS[k] && (MAPS[k].max || 8) >= 2); return ks.length; }); ck(mm >= 10, 'lobby map list too short: ' + mm); }
  // uiaudit 2026-11-14 (Abdullah 21:55 "find duplicates and remove them"): every letter in the key table belongs to one job only; dead power keys are gone
  { const kd = await ev(() => { const d = KEYTAB.filter(r => r.def).map(r => r.def); const dup = d.filter((k, i) => d.indexOf(k) !== i); const dead = Object.keys(POW_KEY).filter(k => typeof powBan === 'function' && powBan(k)); return { dup, dead, names: KEYTAB.filter(r => /Stop$|Return to base|Conquest|go" signal/.test(r.name)).map(r => r.name) }; });
    ck(!kd.dup.length && !kd.dead.length && !kd.names.length, 'key table must have no duplicate or dead keys: ' + JSON.stringify(kd)); }
  // trmap 2026-11-14 (Abdullah 21:07 "In test range map selection doesn't work"): every map in the Test range list is kept when picked
  { const tb = await ev(() => BM_KEYS.filter(k => MAPS[k] && MAPS[k].min <= 2 && MAPS[k].max >= 2 && trBmap(k) !== k)); ck(!tb.length, 'Test range map picks must stick: ' + JSON.stringify(tb)); }
  // novdig 2026-11-14 (Abdullah 14:55 "Make it so that vehicles can't dig in"): no vehicle can dig in, infantry still can
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
  // ---- Battle as IR (the Ayatollah / Mountain Fortress are IR's; the Bunker Buster is not)
  await ev(() => { setup.p = 'IR'; setup.a = 'US'; setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('IR battle never finished loading'));
  await page.waitForTimeout(2500);
  /* (moved after the battle starts: there is no game behind the menu any more) */
  /* smoothaudit (2026-11-17): a unit or building that is off screen / hidden must not have its parts and bones recomputed every frame
     (three.js r186 walks children of objects with matrixWorldAutoUpdate off; ~65 000 wasted matrix updates per frame in an 8-player battle) */
  { const M = await ev(() => { let root = null; for (const [, o] of OBJ) if (!o.visible && o.children.length && o.updateMatrixWorld === umwVis) { root = o; break; }
      if (!root) return { none: 1 }; const P = THREE.Object3D.prototype, um = P.updateMatrix; let n = 0; const kids = new Set(); root.traverse(q => { if (q !== root) kids.add(q); });
      P.updateMatrix = function () { if (kids.has(this)) n++; return um.apply(this, arguments); }; try { SCN.updateMatrixWorld(); } finally { P.updateMatrix = um; } return { n, kids: kids.size }; });
    ck(!M.none, 'smoothaudit: no hidden unit/building object uses umwVis (off-screen objects would recompute every part each frame)');
    ck(!M.n, 'smoothaudit: a hidden unit/building still recomputed ' + M.n + ' of its ' + M.kids + ' parts in one frame'); }
  /* icons (Abdullah 2026-11-14 21:39 "every button has an icon that makes sense"): one table ICON_SVG (src/08-ui.js + 08p-icons.js), inline svg line icons.
     Every upgrade / power button in the bar, every order-dock button and the HUD buttons carry an svg icon (units / buildings keep their drawn canvas picture). */
  { const I = await ev(() => { const noIc = b => !b.querySelector('svg') && !b.querySelector('canvas'); const vis = b => { for (let n = b; n && n.nodeType === 1; n = n.parentElement) { if (n.hidden || getComputedStyle(n).display === 'none') return false; } return true; };
      const wide = [...document.querySelectorAll('#panel .btn.wide')].filter(noIc).map(b => b.id);
      const f = G.ents.filter(u => u.team === ME && !u.dead && !u.isB).slice(0, 3); G.sel = f; try { updateUI(); } catch (e) {}
      const dock = [...document.querySelectorAll('.orddock button, .cmdrow button')].filter(b => vis(b) && noIc(b)).map(b => b.textContent.trim().slice(0, 20));
      const hud = ['hudAl', 'hudHelp', 'sbFight', 'aPause', 'aMenu', 'barGrip', 'mmBtn', 'sbFold', 'aSet', 'aRestart', 'aQuit'].filter(id => { const b = document.getElementById(id); return b && noIc(b); });
      const n = document.querySelectorAll('#panel .btn.wide').length; return { wide, dock, hud, n, tbl: typeof ICON_SVG === 'object' && Object.keys(ICON_SVG).length }; });
    ck(I.tbl >= 60, 'icons: the shared ICON_SVG table has only ' + I.tbl + ' icons'); ck(I.n > 0 && !I.wide.length, 'icons: upgrade / power buttons without an svg icon: ' + I.wide.slice(0, 6).join(','));
    ck(!I.dock.length, 'icons: order dock buttons without an svg icon: ' + I.dock.join(' | ')); ck(!I.hud.length, 'icons: HUD buttons without an svg icon: ' + I.hud.join(','));
    }
  { const vd = await ev(() => { const T = G.teams[ME]; const k = allUnits(T.fac).find(k => { const s = stats(T.fac, k); return s.dom === 'ground' && isVeh(s) && s.dmg > 0 && k !== 'dozer' && k !== 'harv'; }); const u = { s: stats(T.fac, k), kind: k, team: ME, x: 0, y: 0, hp: 1, max: 1 }; return { veh: !!k && digCan(u), inf: allUnits(T.fac).some(k => isInf(stats(T.fac, k))) }; });
    ck(!vd.veh, 'vehicles must not be able to dig in'); }
  const cq = await ev(() => { const T = G.teams[ME]; const ban = { cleric: roster(T.fac).barracks.includes('cleric'), fort: bldAllowed(T.fac, 'fort'), bb: false, bbIR: sigBan('IR', 'bb'), bbUS: sigBan('US', 'bb'), fortUS: bldAllowed('US', 'fort'), powIR: typeof POWERS.bb === 'object' };
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
    return { ban, shown, battle: !!G.battle, towns: G.towns === undefined, wasd: before === after, rot, btns: btns.slice(0, 40), bodyHas: /Ayatollah|Dear Leader|Mountain Fortress|Bunker Buster/.exec(document.body.innerText || '') }; });
  console.log('battle IR', JSON.stringify({ ...cq, btns: cq.btns.length }));
  // leadersC (Abdullah 2026-11-07 22:5x "these factions never rout in any form of the game"): Zealous never rout, retreat, bail out or fall back - in any mode
  { const z = await ev(() => { const out = {}; for (const k of ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI']) out[k] = fearlessT({ fac: k, mart: 0, fervor: 0 }, { s: { cls: 'inf', dom: 'ground' } }); out.US = fearlessT({ fac: 'US', mart: 0, fervor: 0 }, { s: { cls: 'inf', dom: 'ground' } }); return out; });
    for (const k of ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI']) ck(z[k], 'Zealous ' + k + ' can rout in battle (fearlessT false)'); ck(!z.US, 'a non-Zealous nation became unbreakable');
    /* L2 faction mechanics guard (2026-11-14): Hidden Firing Post for RV/OB, cheap Shia forts in Battle, US/IL stronger-fewer, Gulf IADS range */
    { const m = await ev(() => { const o = {}; o.rv = bldAllowed('RV', 'tunnel') && bstats('RV', 'tunnel').name === 'Hidden Firing Post' && bstats('RV', 'tunnel').cost <= 400; o.ob = bldAllowed('OB', 'tunnel') && !FACTIONS.OB.tunnels && !FACTIONS.RV.tunnels; o.irNet = !!FACTIONS.IR.tunnels && bstats('IR', 'tunnel').name !== 'Hidden Firing Post'; o.usNot = !bldAllowed('US', 'tunnel');
        const had = G.battle; G.battle = 1; const a = bstats('RS', 'turret').cost; G.battle = 0; const b = bstats('RS', 'turret').cost; G.battle = had; o.fort = a < b && a <= Math.round(b * .6 / 25) * 25 + 25;
        o.us = FMECH.US.cost === 1.04 && FMECH.IL.hp === 1.08 && typeof fmTick === 'function'; o.iads = !!IADS_NAT.SA && !!IADS_NAT.AE && typeof isPost === 'function'; return o; });
      for (const k in m) ck(m[k], 'L2 faction mechanic broken: ' + k + ' ' + JSON.stringify(m)); }
    /* polishD guard (2026-11-15): UA FPV team, TR Bayraktar, IR Shahed truck are in their rosters + AI list; FPV hits vehicles only; Hidden Firing Post holds 4 infantry (own list, in the checkpoint) */
    { const m = await ev(() => { const o = {}; o.fpv = roster('UA').barracks.includes('fpvt') && stats('UA', 'fpvt').vehOnly === 1 && roster('IR').barracks.indexOf('fpvt') < 0;
        o.tb2 = roster('TR').airfield.includes('tb2') && stats('TR', 'tb2').dom === 'air' && !!SIGU.tb2 && !roster('US').airfield.includes('tb2'); o.shl = !roster('IR').factory.includes('shl') && roster('IR').factory.includes('bmt') && !BASE.shl;
        const inf = { isB: 0, s: { armor: 'light', dom: 'ground' }, landed: 0 }, veh = { isB: 0, s: { armor: 'heavy', dom: 'ground' }, landed: 0 }; o.vo = !canTarget(stats('UA', 'fpvt'), inf) && canTarget(stats('UA', 'fpvt'), veh);
        o.krb = roster('KP').factory.includes('krb'); o.post = POST_CAP === 4 && typeof enterTunnel === 'function'; o.ai = typeof aiSigWant === 'function' && AI_SIG.some(r => r[0] === 'krb') && !AI_SIG.some(r => r[0] === 'shl') && AI_SIG.some(r => r[0] === 'tb2') && AI_SIG.some(r => r[0] === 'fpvt'); return o; });
      for (const k in m) ck(m[k], 'polishD signature/post broken: ' + k + ' ' + JSON.stringify(m)); }
    for (const f of ['03-sim.js', '03b-tactics.js']) ck(/msOf\([^)]*\)\.rout[!=]==0/.test(SRC[f]), 'no Zealous rout guard in ' + f); }
  ck(cq.battle && cq.towns, 'a single-player skirmish did not start as Battle (or still has towns)');
  ck(cq.ban.cleric, 'Ayatollah (cleric) is missing from the Battle roster for IR'); ck(cq.ban.fort, 'Mountain Fortress is not buildable in Battle for IR');
  ck(cq.ban.bbIR && !cq.ban.bbUS && !cq.ban.fortUS, 'Bunker Buster only for US/IL/RU/CN, Mountain Fortress only for IR/RS/AF/KD/DW/KP: ' + JSON.stringify(cq.ban));
  ck(cq.wasd, 'W A S D changed selection/orders in a battle (camera only)');
  ck(cq.rot && cq.rot.q45 && !cq.rot.qSel && cq.rot.home && cq.rot.drag < -0.3, 'Q tap must turn the camera 45° clockwise (and not select), hold Q + mouse right turns it, Home back to north: ' + JSON.stringify(cq.rot));
  ck(cq.rot && cq.rot.caSel > 0, 'Ctrl+A did not select the army in battle: ' + JSON.stringify(cq.rot));
  await shot('battle-ir');
  // fixes1 (2026-11-11): the hover card of a build button must really show what the unit beats and what it is weak to: at least one
  // picture + name in each row (a stale screenshot showed the two row labels with nothing in them). Real mouse hover on a button.
  { await ev(() => { window.__tab0 = TAB; const T = G.teams[ME]; let b = G.ents.find(e => e.team === ME && e.isB && e.kind === 'barracks' && e.built >= 1 && !e.dead); if (!b) { const h = G.ents.find(e => e.team === ME && e.kind === 'hq'); b = addBld(ME, 'barracks', h.x + 150, h.y + 150, true); } G.sel = [b]; updateUI(); showTab('units'); });   /* the unit buttons show only while a production building is selected */
    await page.waitForTimeout(300);
    /* redfixE: the command panel can re-lay out between reading the button's place and the hover (the mouse then sat on the unarmed medic: "WEAK TO" only) - hover until the card belongs to that button */
    for (let tr = 0; tr < 4; tr++) { const bx = await ev(() => { const b = document.getElementById('u_at') || document.getElementById('u_inf'); const r = b.getBoundingClientRect(); return { id: b.id, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await page.mouse.move(bx.x - 20, bx.y); await page.mouse.move(bx.x, bx.y, { steps: 3 }); await page.waitForTimeout(500);
      if (await ev((id) => !!(CTIP.b && CTIP.b.id === id && CTIP.el && !CTIP.el.hidden), bx.id)) break; await page.mouse.move(5, 5); await page.waitForTimeout(300); }
    const hc = await ev(() => { const d = document.getElementById('ctip'), out = { hover: !!d && !d.hidden, bad: [] }; const rows = () => [...d.querySelectorAll('.uk-mu .mr')].map(r => { const q = d.getBoundingClientRect();
        return r.querySelector('b').textContent + ':' + [...r.querySelectorAll('.mi')].filter(m => { const im = m.querySelector('img'), i = m.querySelector('i'), a = im && im.getBoundingClientRect(), t = i && i.getBoundingClientRect();
          return a && t && a.width > 8 && a.height > 8 && i.textContent.trim().length > 1 && t.width > 8 && t.height > 4 && t.right <= q.right + 1 && t.bottom <= q.bottom + 1 && getComputedStyle(m).visibility !== 'hidden' && +getComputedStyle(m).opacity > .5; }).length; });
      out.first = out.hover ? rows() : [];
      for (const k of ['inf', 'at', 'tank', 'aa', 'arty']) { const b = document.getElementById('u_' + k); if (!b) continue; ctipShow(b); const r = rows(); if (!(r.length === 2 && r.every(x => +x.split(':')[1] >= 1))) out.bad.push(k + ' ' + r.join(' ')); } ctipHide(); return out; });
    ck(hc.hover && hc.first.length === 2 && hc.first.every(x => +x.split(':')[1] >= 1), 'hovering a unit button does not show a card with at least one named unit under BEATS and under WEAK TO: ' + JSON.stringify(hc.first));
    ck(!hc.bad.length, 'hover card of a combat unit has an empty BEATS or WEAK TO row: ' + hc.bad.join(' | ')); await page.mouse.move(640, 300); await ev(() => showTab(window.__tab0)); }
  // fixes1 (2026-11-11): a friendly soldier standing in front of a house must not swallow the order: with infantry selected, a real
  // right-click on him over a house sends the squad INTO the house (it used to become a plain move; the tutorial's "retake the town" step hung on it).
  { const hs = await ev(() => { const cells = G.civ.filter(c => !c.dead && !c.g && !c.ruin).sort((a, b) => { const h = G.ents.find(e => e.team === ME && e.kind === 'hq'); return Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y); });
      for (const c of cells.slice(0, 6)) for (const [dx, dy] of [[0, 24], [24, 0], [0, -24], [-24, 0], [0, 34], [34, 0]]) { const p = nearestPassXY('ground', c.x + dx, c.y + dy); if (!p || Math.hypot(p[0] - c.x, p[1] - c.y) > 60) continue;
        const q = nearestPassXY('ground', c.x + dx * 3, c.y + dy * 3); if (!q) continue; const blk = addUnit(ME, 'inf', p[0], p[1]), u = addUnit(ME, 'inf', q[0], q[1]); if (!blk || !u) continue; return { c: c.i, cx: c.x, cy: c.y, blk: blk.id, u: u.id }; } return null; });
    if (!hs) fails.push('house-click guard: no free house with walkable ground next to it'); else {
      await ev((h) => { centerOn(h.cx, h.cy, true); G.sel = [G.ents.find(e => e.id === h.u)]; }, hs); await ev(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      /* smoothaudit: a drawn soldier figure re-composes only its walking bones (legs table); the ~40 others are computed once (boneFreeze, 06-view) */
      { const bz = await ev((h) => { const o = OBJ.get(h.u), P = o && o.userData.parts; if (!P || !P.body) return { none: 1 }; let fro = 0, live = 0, legs = 0, wl = 0;
          for (const m of P.body.children) { const W = m.userData.legs; if (!W) continue; wl++; const keep = new Set(Object.values(W).filter(j => j && j.b).map(j => j.b)); legs += keep.size;
            m.traverse(q => { if (!q.isBone) return; if (keep.has(q)) { if (q.updateMatrix === boneKeep || !q.matrixAutoUpdate) live = -999; } else if (q.updateMatrix !== boneKeep) live++; else fro++; }); } return { wl, fro, live, legs }; }, hs);
        ck(bz.none || !bz.wl || (bz.fro > 0 && bz.live === 0), 'smoothaudit: a drawn soldier still re-composes its non-walking bones every frame (or a walking bone is frozen): ' + JSON.stringify(bz)); }
      const pt = await ev((h) => { const b = G.ents.find(e => e.id === h.blk); for (const k of [.6, .3, .9, 0]) { const p = toScreen(b.x, unitH(b) + entHeightMid(b) * k, b.y), t = pickAt(p.x, p.y, false), c = civUnder(p.x, p.y, screenToWorld(p.x, p.y)); if (t === b && c && c.i === h.c) return { x: p.x, y: p.y }; } return null; }, hs);
      if (!pt) console.log('  (house-click guard skipped: the soldier at the door is not in front of the house from this camera)'); else {
        await page.mouse.move(pt.x, pt.y); await page.mouse.click(pt.x, pt.y, { button: 'right' }); await page.waitForTimeout(400);
        const r = await ev((h) => { const u = G.ents.find(e => e.id === h.u), c = G.civ[h.c]; return { order: u && u.order ? u.order.type : '', inside: !!(c.occ && c.occ.some(o => o.id === h.u)) }; }, hs);
        ck(r.order === 'garrison' || r.inside, 'right-click on a house with a friendly soldier standing in front of it does not send the selected infantry into the house: ' + JSON.stringify(r)); }
      await ev((h) => { for (const id of [h.blk, h.u]) { const e = G.ents.find(x => x.id === id); if (e) { e.dead = true; G.byId.delete(id); } } const c = G.civ[h.c]; if (c.g && c.occ.some(o => o.id === h.u)) { try { leaveGarrison(c); } catch (e) {} } G.sel = []; }, hs); } }
  // Both AIs play 3 game-minutes: nobody may ever build/train a banned kind.
  await ev(() => { for (const T of G.teams) if (!T.ai && typeof mkAI === 'function') T.ai = mkAI(1); window.__bad = []; });
  for (let c = 0; c < 4; c++) await ev(() => { for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) if (e.kind === 'fort' && !FORT_NAT[G.teams[e.team].fac]) window.__bad.push(e.kind); });
  const sim = await ev(() => [...new Set(window.__bad)]);
  ck(!sim.length, 'AI built a signature asset for a nation that does not have it: ' + sim.join(','));
  // ---- BATTLE (Generals rules + supply lines): Command Center + dozer + supply truck, no towns/tax, supply trucks pay
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await ev(() => { setup.p = 'US'; setup.a = 'RU'; setup.n = 1; setup.map = 'lebanon'; try { initAudio(); } catch (e) {} startSingle(); });   /* a Battle map whose roads run out of the bases (supply lines follow roads) */
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('battle-mode game never finished loading'));
  await page.waitForTimeout(1500);
  const bt = await ev(() => { const T = G.teams[ME], mine = G.ents.filter(e => e.team === ME && !e.dead); const c0 = T.credits;
    const blds = mine.filter(e => e.isB).map(e => e.kind), kinds = mine.filter(e => !e.isB).map(e => e.kind);
    for (let i = 0; i < 3600 && !G.over; i++) simUpdate(1 / 60);
    return { battle: !!G.battle, towns: G.towns !== undefined, blds, kinds, c0, c1: T.credits, name: typeof modeName === 'function' ? modeName() : '' }; });
  console.log('battle mode', JSON.stringify(bt));
  // SUPPLY LINES IN BATTLE (Abdullah 2026-11-13 20:19 "Bring supply lines into battle"; replaces battleclean 2026-11-11 19:41): the roads out of your HQ and depots
  // are drawn green on the minimap and (L) on the ground, the Supply chip shows, and the ammo row says whether a unit is in your supply area. Ammo rule (20:06):
  // outside the area a unit keeps fighting with what it has (no timer), at 0 it needs to come back; back inside it refills. Test range: unlimited, no badge.
  { const sl = await ev(() => { const rec = () => { let n = 0; const c = new Proxy({}, { get: (t, k) => k === 'canvas' ? document.createElement('canvas') : k === 'measureText' ? () => ({ width: 10 }) : (typeof k === 'string' && /^(stroke|fill|moveTo|lineTo|arc|drawImage|fillRect|fillText|strokeRect)$/.test(k)) ? () => { n++; } : () => {}, set: () => true }); return { c, n: () => n }; };
      const m = rec(); try { drawLogiMini(m.c, .1, .1); } catch (e) {}
      const was = LGU.on; LGU.on = false; try { lgToggle(); } catch (e) {} const on = !!LGU.on, wanted = lgWanted(); const w = rec(); try { drawLogiWorld(w.c); } catch (e) {} LGU.on = was;
      const chip = document.getElementById('hudS'); try { hudTick(true); } catch (e) {}
      const C = G.lg && G.lg.cov && G.lg.cov[ME], R = lgRoadSets(), green = R ? R.S[0].length + R.S[1].length : 0;
      const ui = (() => { try { return ammoRowHTML(G.ents.filter(u => u.team === ME && u.am !== undefined && u.amx).slice(0, 1)) || ''; } catch (e) { return ''; } })();
      return { mini: m.n(), world: w.n(), on, wanted, chip: !!chip && !chip.hidden, ui: /supply area/i.test(ui), cov: C ? Object.keys(C).length : 0, green, beads: (G.lg.bead[ME] || []).length }; });
    console.log('battle supply lines', JSON.stringify(sl));
    ck(sl.mini > 0 && sl.world > 0 && sl.green > 0 && sl.cov > 0 && sl.beads > 0, 'Battle must draw your supply lines (green roads) on the minimap and, with L, on the ground: ' + JSON.stringify(sl));
    ck(sl.on && sl.wanted, 'L / the Supply lines button must switch the supply overlay on in Battle'); ck(sl.chip, 'Battle must show the Supply chip'); ck(sl.ui, 'the ammo row must say whether the unit is in your supply area');
    // CAPTURABLE ROADS (Abdullah 2026-11-14 18:40 "Make it so that units can capture roads"): a ground unit standing on a neutral road section captures it in ~10 s, an air unit does not, an owned section is supply area
    { const rc = await ev(() => { const L = G.lg, D = G.lgd; lgFix(D); const u = G.ents.find(e => !e.dead && !e.isB && e.team === ME && e.s && e.s.dom === 'ground'); if (!u) return { err: 'no unit' };
        const occ = i => G.ents.some(v => v !== u && !v.dead && !v.isB && !v.inTun && v.s && v.s.dom === 'ground' && lgProj(L.E[i], v.x, v.y).d < LG_CUTR + 30);   /* redfixE: another unit (own or enemy) already on the section captures or contests it - the test raced with them */
        let ei = -1, nn = 0; for (let i = 0; i < L.E.length; i++) { const e = L.E[i]; if (e.a !== e.b && e.len > 120 && lgRcOwner(i) < 0 && !lgBlk(i, ME) && !occ(i)) { nn++; if (ei < 0 || e.len > L.E[ei].len) ei = i; } } let covK = null; if (ei < 0) { for (const free of [1, 0]) { if (ei >= 0) break; for (let i = 0; i < L.E.length; i++) { const e = L.E[i]; if (e.a !== e.b && e.len > 120 && !lgBlk(i, ME) && (!free || !occ(i)) && (ei < 0 || e.len > L.E[ei].len)) ei = i; } } if (ei < 0) return { err: 'no road section at all', edges: L.E.length }; covK = L.cov; L.cov = null; if (D.rc) delete D.rc[ei]; }   /* small maps: every road is already supply area, so test on the longest one with the supply cover lifted for the test */   /* the longest neutral, open section (map-independent) */
        /* redfixE: a small map can have ONE long road (lebanon: a single 6.8 km section) with the own dozer and enemy infantry on it - they capture /
           contest / cut it. Those units are set aside (as if inside a tunnel) for this check and put back after */
        const park = G.ents.filter(v => v !== u && !v.dead && !v.isB && !v.inTun && v.s && v.s.dom === 'ground' && lgProj(L.E[ei], v.x, v.y).d < LG_CUTR + 30); for (const v of park) v.inTun = 1;
        const e = L.E[ei], m = lgPoint(e, e.len / 2), ox = u.x, oy = u.y, os = u.s; const run = n => { for (let k = 0; k < n; k++) lgRoadCap(1); };
        const hold = () => D.rc[ei] && D.rc[ei].o;
        u.s = Object.assign({}, os, { dom: 'air' }); u.x = m[0]; u.y = m[1]; run(14); const air = hold();
        u.s = os; run(4); const early = hold(); run(10); const got = hold();
        if (!L.reach) lgCompute(); lgCover(); const beads = (L.bead[ME] || []).some(b => Math.hypot(b.x - m[0], b.y - m[1]) < 150); const sup = supplyPoints()[ME].some(p => p.rd && Math.hypot(p.x - m[0], p.y - m[1]) < 150);
        u.x = ox; u.y = oy; for (const v of park) delete v.inTun; if (covK) { L.cov = covK; lgCover(); } return { ei, air, early, got, beads, sup, ME, covLifted: !!covK, parked: park.length }; });
      console.log('road capture', JSON.stringify(rc));
      ck(!rc.err, 'road capture test setup: ' + JSON.stringify(rc)); if (!rc.err) { ck(!(rc.air >= 0), 'an air unit must not capture a road section: ' + JSON.stringify(rc)); ck(!(rc.early >= 0), 'road capture takes ~10 s, not 4: ' + JSON.stringify(rc));
        ck(rc.got === rc.ME, 'a ground unit standing on a neutral road section must capture it in ~10 s: ' + JSON.stringify(rc)); ck(rc.beads && rc.sup, 'a captured road section must count as the owner\'s supply area: ' + JSON.stringify(rc)); } }
    const am = await ev(() => { const hq = G.ents.find(e => e.isB && e.team === ME && e.kind === 'hq'); const u = G.ents.find(e => !e.dead && !e.isB && e.team === ME && hasAmmo(e)); if (!u || !hq) return { err: 'no unit/hq' };
      const step = () => { G.supT = 1; updSupply(0.01); }; const P = supplyPoints()[ME]; let far = null;
      for (let k = 0; k < 400 && !far; k++) { const x = (k * 977) % MAPW, y = (k * 613) % MAPH; if (P.every(p => Math.hypot(p.x - x, p.y - y) > p.r + 60)) far = { x, y }; }
      const ox = u.x, oy = u.y; if (u.am === undefined) ammoInit(u); u.x = far.x; u.y = far.y; u.am = 5; step(); const o1 = { sup: u.sup, am: u.am }; G.t += 90; step(); const o2 = { sup: u.sup, am: u.am };
      u.am = 0; step(); const empty = { am: u.am, sup: u.sup }; const bead = (G.lg.bead[ME] || [])[0]; let road = null; if (bead) { u.x = bead.x; u.y = bead.y; step(); road = { sup: u.sup, am: u.am }; }
      u.am = 0; u.x = hq.x + 40; u.y = hq.y + 40; step(); const back = { am: u.am, sup: u.sup }; u.x = ox; u.y = oy;
      const sv = G.sandbox; G.sandbox = true; const sb = hasAmmo(u); G.sandbox = sv; return { o1, o2, empty, road, back, sb }; });
    console.log('ammo rule', JSON.stringify(am));
    ck(!am.err && am.o1.sup === 0 && am.o1.am === 5 && am.o2.am === 5, 'ammo rule: a unit outside your area keeps its ammo (no refill, no timer penalty): ' + JSON.stringify(am));
    ck(am.empty && am.empty.am === 0 && am.empty.sup === 0, 'ammo rule: an empty unit outside your area stays empty: ' + JSON.stringify(am));
    ck(am.road && am.road.sup === 1 && am.road.am > 0, 'ammo rule: a unit standing on your supply line (road) refills: ' + JSON.stringify(am));
    ck(am.back && am.back.sup === 1 && am.back.am > 0, 'ammo rule: a unit back at your base refills: ' + JSON.stringify(am)); ck(am.sb === false, 'ammo rule: Test range must have unlimited ammo');
  // AMMO TRUCK (Abdullah 2026-11-13 21:46 "Separate ammo truck"): the money truck (harv) never refills ammo; every nation builds an Ammo Truck (kind 'ammot') at the War Factory that refills units next to it from a limited stock.
  { const at = await ev(() => { const hq = G.ents.find(e => e.isB && e.team === ME && e.kind === 'hq'); const u = G.ents.find(e => !e.dead && !e.isB && e.team === ME && hasAmmo(e)); if (!u || !hq || typeof addUnit !== 'function') return { err: 'no unit/hq' };
      const allN = Object.keys(FACTIONS).every(f => roster(f).factory.includes('ammot') && stats(f, 'ammot').noAttack && stats(f, 'ammot').from === 'factory');
      const step = () => { G.supT = 1; updSupply(0.01); }; const P = supplyPoints()[ME]; let far = null; for (let k = 0; k < 400 && !far; k++) { const x = (k * 977) % MAPW, y = (k * 613) % MAPH; if (P.every(p => Math.hypot(p.x - x, p.y - y) > p.r + 120)) far = { x, y }; }
      if (u.am === undefined) ammoInit(u); u.x = far.x; u.y = far.y; u.am = 3;
      const hv = addUnit(ME, 'harv', far.x + 20, far.y); step(); step(); const harvAm = u.am; const harvSup = u.sup;
      const tr = addUnit(ME, 'ammot', far.x - 30, far.y); step(); const stock0 = tr.am, cap = tr.amx, sup = u.sup;
      for (let i = 0; i < 12; i++) step(); const filled = u.am, stock1 = tr.am;
      const noHarvPt = !supplyPoints()[ME].some(p => Math.abs(p.x - hv.x) < 1 && Math.abs(p.y - hv.y) < 1);
      return { allN, harvAm, harvSup, stock0, cap, filled, amx: u.amx, sup, stock1, noHarvPt }; });
    console.log('ammotruck', JSON.stringify(at));
    ck(!at.err && at.allN, 'every nation must have an Ammo Truck (noAttack, from the War Factory): ' + JSON.stringify(at));
    ck(!at.err && at.harvAm === 3 && at.harvSup === 0 && at.noHarvPt, 'the money truck (harv) must never refill ammo or count as a supply point: ' + JSON.stringify(at));
    ck(!at.err && at.filled > 3 && at.stock1 < at.stock0 && at.stock0 < at.cap && at.sup === 1, 'an Ammo Truck must refill a nearby unit from its limited stock: ' + JSON.stringify(at));
    ck(!/supply truck[^'"]{0,40}(refill|resupplies)|(refill|resupplies)[^'"]{0,40}supply truck/i.test(Object.entries(SRC).filter(([k]) => !k.startsWith('13')).map(([, v]) => v).join('\n')), 'text still says the supply truck refills ammo'); }
    // battleclean 2026-11-12 (Abdullah 2026-11-11 19:45 "Once I click this should disappear"): the rally flag shows only while a production building is selected (or a 1.5 s flash after setting it)
    const rf = await ev(() => { const T = G.teams[ME], hq = G.ents.find(e => e.team === ME && e.kind === 'hq' && !e.dead), vis = () => { try { syncScene(.016); } catch (e) {} return !!(RALLY && RALLY.visible); };
      T.rally = { x: hq.x + 90, y: hq.y + 90 }; G.sel = []; vis(); RV.fl = 0; const away = vis(); G.sel = [hq]; const sel = vis(); G.sel = []; const gone = vis(); G.sel = []; return { away, sel, gone }; });
    console.log('rally flag', JSON.stringify(rf)); ck(!rf.away && rf.sel && !rf.gone, 'rally flag must show only while a production building is selected: ' + JSON.stringify(rf));
  }
  ck(bt.battle && !bt.towns, 'Battle game did not start in Battle mode (or has towns)');
  ck(bt.blds.join() === 'hq' && bt.kinds.includes('dozer') && bt.kinds.includes('harv'), 'Battle must start with a Command Center + dozer + supply truck only, got ' + bt.blds.join() + ' / ' + bt.kinds.join());
  ck(bt.c1 > bt.c0, 'Battle: supply trucks brought no income (' + bt.c0 + ' -> ' + bt.c1 + ')'); ck(bt.name === 'Battle', 'mode name in HUD/end screen is "' + bt.name + '"');
  await shot('battle-us');
  // ---- drones fly from the Airfield (Abdullah 2026-11-08); nations without an airfield keep them at the War Factory
  { const d = await ev(() => ['TR', 'UA', 'IR', 'RS'].map(f => [f, stats(f, 'drone').from, roster(f).airfield.includes('drone'), roster(f).factory.includes('drone'), !!FACTIONS[f].noAir]));
    for (const [f, from, inAir, inFac, noAir] of d) { const want = noAir ? 'factory' : 'airfield'; ck(from === want && inAir === (want === 'airfield') && inFac === (want === 'factory'), `drone for ${f} built from ${from} (want ${want})`); } }
  // ---- announcer (Abdullah 2026-11-14 "Huccum!"): every status line exists in every announcer language, repeats are throttled, never two at once, volume slider in Settings
  { const A = await ev(() => { const keys = ['building','complete','unit','upgrade','funds','lowPower','powerBack','baseAtk','unitsAtk','unitLost','bldLost','cantBuild','strikeReady','enemyStrike','lineCut','roadTaken','reinf'];
      const miss = []; for (const L of ['en','fa','ar','ru','zh','he']) for (const k of keys) if (!ANN_TXT[L] || !ANN_TXT[L][k]) miss.push(L + '.' + k);
      const st = { last: {}, busy: 0 }; const g1 = annGate('unit', 1000, false, st), g2 = annGate('unit', 3000, false, st), g3 = annGate('unit', 8000, false, st);
      const b1 = annGate('baseAtk', 20000, false, st), b2 = annGate('baseAtk', 30000, false, st), b3 = annGate('baseAtk', 41000, false, st);
      const st2 = { last: {}, busy: 5000 }; const ov = annGate('funds', 1000, false, st2);
      const st3 = { last: {}, busy: 0 }; const t1 = annGate('unit', 1000, true, st3), t2 = annGate('unit', 10000, true, st3);
      return { miss, rep: [g1, g2, g3], atk: [b1, b2, b3], ov, test: [t1, t2], slider: !!document.getElementById('sAnn'), hooked: String(pushLog).includes('annFromLog') }; });
    ck(!A.miss.length, 'announcer table is missing lines: ' + A.miss.join(','));
    ck(A.rep.join() === 'true,false,true', 'announcer must not repeat the same line within 6 s: ' + A.rep);
    ck(A.atk.join() === 'true,false,true', 'announcer under-attack lines must be once per 20 s: ' + A.atk);
    ck(A.ov === false, 'announcer must not start a line while another is playing'); ck(A.test.join() === 'true,false', 'announcer must be throttled more in the Test range');
    ck(A.slider && A.hooked, 'announcer needs its Settings > Audio slider (sAnn) and the pushLog hook'); }
  // L3 light economy (2026-11-14; income cut removed 22:32): in Battle rich nations train 10% slower, poorer fast nations 25% faster; income the same for all
  { const g = await ev(() => { const sv = G; try { G = { battle: 1 }; return { usB: econBT('US'), usU: econUp('US'), irB: econBT('IR'), ruB: econBT('RU') }; } finally { G = sv; } });
    ck(g.usB > 1 && g.usU === 1 && g.irB < 1 && g.ruB === 1, 'L3 light economy profile wrong in Battle: ' + JSON.stringify(g)); }
  // polishF OB (Abdullah 2026-11-15 00:20 "Palestinian units are not realistic"): the Palestine Islamic Brigade is a light urban resistance force - no tank, jet, helicopter, ship or airfield of a regular army (roster + models)
  { const o = await ev(() => { const R = roster('OB'), all = allUnits('OB'); return { all, air: R.airfield.length, ships: R.shipyard, names: all.map(k => stats('OB', k).name), noAir: !!FACTIONS.OB.noAir, noShip: !!FACTIONS.OB.noShip, mz: typeof RMAP === 'object' ? [RMAP.tank.OB, RMAP.heli.OB || null, RMAP.jet.OB || null, RMAP.ship.OB || null] : null, zeal: msOf('OB').rout }; });
    ck(o.air === 0 && o.noAir && o.noShip, 'OB must have no airfield units (no jets/helicopters): ' + o.air);
    for (const k of ['jet', 'heli', 'airlift', 'sub', 'ship', 'minel', 'sweep', 'dtank2']) ck(!o.all.includes(k), 'OB roster must not contain ' + k);
    ck(o.ships.every(k => ['boat', 'fast', 'lander'].includes(k)), 'OB may only build skiffs / landing craft at sea: ' + o.ships);
    for (const k of ['atk', 'mortar', 'hero', 'drone', 'tank', 'aa', 'arty']) ck(o.all.includes(k), 'OB roster lacks ' + k);
    ck(!o.names.some(n => /Abrams|Main Battle|Bulldozer|Frigate|Patrol Launch/i.test(n)), 'OB unit names must not read as a regular army: ' + o.names.join(','));
    ck(o.mz && o.mz[0] === 'hilux' && !o.mz[1] && !o.mz[2] && !o.mz[3], 'OB must use no MBT / helicopter / jet / frigate model: ' + JSON.stringify(o.mz)); ck(o.zeal === 0, 'OB stays Zealous (never routs)'); }
  // polishF IR (Abdullah 2026-11-15 00:19 "Give the Iranians something else besides a shahed truck what's the point"): Iran has the Zolfaghar Missile Launcher (ballistic missile truck, far longer reach than the Fateh, max 2) and NO Shahed launcher truck
  { const o = await ev(() => { const R = roster('IR'), all = allUnits('IR'), b = stats('IR', 'bmt'), a = stats('IR', 'arty'); return { fac: R.factory.includes('bmt'), names: all.map(k => stats('IR', k).name), name: b.name, rng: b.rng, arty: a.rng, lim: b.limit, from: b.from, missile: !!b.missile, icon: UK.iconBranch('bmt', false, b), others: ['US', 'RU', 'RS', 'OB'].some(f => allUnits(f).includes('bmt')), drone: stats('IR', 'drone').name }; });
    ck(o.fac && o.name === 'Zolfaghar Missile Launcher' && o.from === 'factory' && o.missile, 'IR must build the Zolfaghar Missile Launcher at the War Factory: ' + JSON.stringify(o));
    ck(o.rng >= o.arty * 1.6 && o.lim === 2, 'Zolfaghar must reach much farther than the Fateh launcher and be limited to 2: ' + o.rng + ' vs ' + o.arty + ' limit ' + o.lim);
    ck(!o.names.some(n => /shahed.*(truck|launch)|(truck|launch).*shahed/i.test(n)), 'Iran must not have a Shahed launcher truck: ' + o.names.join(',')); ck(/Shahed/.test(o.drone), 'the Shahed-136 stays Iran\'s drone');
    ck(o.icon === 'bmt' && !o.others, 'the Zolfaghar has its own bar picture and only Iran builds it');
    const sm = fs.readFileSync(path.join(ROOT, 'src/03-sim.js'), 'utf8'); ck(/s\.src\.s\.missile|src\.s&&src\.s\.missile/.test(sm) && /s\.kind==='bm'/.test(sm) && /filter\(k=>k!=='bmt'\|\|T\.credits>2600\)/.test(sm), 'ballistic missile: fire() must launch a bm strike, updStrikes must let air defence shoot it down, the AI builds it only when rich'); }
} catch (e) { fails.push('decisions run crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of errs) fails.push(e);
// powers 2026-11-15 (Abdullah 00:22 "Make the general powers require more points and progressively get better"): unlock cost by strength, dearer levels, growing effects
{ const d = SRC['01-data.js'] || '', sm = SRC['03-sim.js'] || '', ui = SRC['08-ui.js'] || '';
  const pc = d.match(/const POWCOST=\{([^}]*)\}/), c = {}; if (pc) for (const m of pc[1].matchAll(/(\w+):(\d+)/g)) c[m[1]] = +m[2];
  ck(pc && c.recon === 1 && c.repair === 1 && c.bounty === 1 && c.para === 2 && c.barrage === 2 && c.bb === 3 && c.nat === 3, 'powers: unlock costs differ by strength (light 1, medium 2, heavy 3)');
  ck(/function powLvCost\(k,lv\)\{return lv>=3\?99:powCostBase\(k\)\+\(lv\|0\)/.test(d) && /return powLvCost\(key,/.test(sm), 'powers: level 2 costs unlock+1, level 3 unlock+2 (so level 3 costs more than level 2), one rule used by buyPower');
  for (const k of ['recon', 'repair', 'barrage', 'bb']) { const m = d.match(new RegExp(k + ':\\{(rm|[^}]*?rm):\\[([\\d.,]+)\\]')); const a = m && m[2].split(',').map(Number); ck(a && a.length === 3 && a[0] < a[1] && a[1] < a[2], 'powers: ' + k + ' area grows with every level'); }
  { const m = d.match(/para:\{n:\[([\d,]+)\],at:\[([\d,]+)\]/); const n = m && m[1].split(',').map(Number), at = m && m[2].split(',').map(Number); ck(n && n[0] < n[1] && n[1] < n[2] && at[2] > at[1], 'powers: paratroopers grow per level and level 3 adds anti-tank teams'); }
  ck(/n:\[10,14,20\]/.test(d) && /dmg:\[1500,1900,2400\]/.test(d) && /PCD=\[1,\.8,\.6\]/.test(d), 'powers: barrage shells, bunker buster blast and cooldown improve with level');
  ck(!/Unlock · 1 point`/.test(ui) && !/about 40% stronger/.test(ui) && /powLvCost\(k,0\)/.test(ui), 'powers: no leftover "1 point" / "40% stronger" text, the row shows the real cost');
}
// economy pack 2026-11-18 (Abdullah 2026-11-17 18:45 "General's powers"): Proxy Militia (mil) + Smuggling Route (smug) exist for every playable nation, cost/levels grow, the AI uses them, deterministic
{ const r = await ev(() => {
    const out = { bad: [], det: null };
    for (const f of PLAYABLE) for (const k of ['mil', 'smug']) { const P = powInfo(k, f); if (!P || sigBan(f, k) || P.passive) out.bad.push(f + ':' + k); }
    out.cost = [powLvCost('mil', 0), powLvCost('mil', 1), powLvCost('mil', 2), powLvCost('smug', 0), powLvCost('smug', 2)];
    out.lv = [powLvVal('mil', 'n', 1, 0), powLvVal('mil', 'n', 3, 0), powLvVal('smug', 'inc', 1, 0), powLvVal('smug', 'inc', 3, 0), powLvVal('smug', 'dur', 1, 0), powLvVal('smug', 'dur', 3, 0)];
    const run = () => { const sv = G; try {
      newGame({ seed: 77, facs: ['IR', 'US'], ai: [false, false], map: 'strait', tm: [0, 1], bs: 1, slot: -1, real: 0, battle: 1 }); G.headless = true;
      const T = G.teams[0]; T.rank = 9; T.spent = 0; G.t = 400; buyPower(0, 'mil'); buyPower(0, 'smug'); buyPower(0, 'mil'); T.pw.mil.cd = 0; T.pw.smug.cd = 0;
      const h = hqOf(0), n0 = G.ents.length, c0 = T.credits; const a = usePower(0, 'mil', h.x + 150, h.y + 150), b = usePower(0, 'smug', h.x + 60, h.y + 60);
      for (let i = 0; i < 60 * 12; i++) simUpdate(1 / 60);
      const tr = G.ents.find(e => e.smug && !e.dead); const res = { a, b, lv: T.pw.mil.lv, made: G.ents.length - n0, gain: T.credits - c0, smugs: (G.smugs || []).length, truck: !!tr };
      if (tr) kill(tr, 1, null); simUpdate(1 / 60); simUpdate(2); res.cut = !(G.smugs || []).length; return res; } finally { /* leave game as is */ } };
    out.r1 = run(); out.r2 = run(); out.det = JSON.stringify(out.r1) === JSON.stringify(out.r2); return out; });
  ck(r.bad.length === 0, 'economy: Proxy Militia and Smuggling Route exist for every playable nation (' + r.bad.join(',') + ')');
  ck(r.cost[0] === 2 && r.cost[1] === 3 && r.cost[2] === 4 && r.cost[3] === 2 && r.cost[4] === 4, 'economy: both powers are medium cost and levels cost more');
  ck(r.lv[0] < r.lv[1] && r.lv[2] < r.lv[3] && r.lv[4] < r.lv[5], 'economy: militia size, smuggling income and duration grow with level');
  ck(r.r1.a && r.r1.b && r.r1.made >= 8 && r.r1.truck && r.r1.gain > 0, 'economy: militia arrives, smuggler truck brings cash: ' + JSON.stringify(r.r1));
  ck(r.r1.cut, 'economy: destroying the smuggler truck cuts the route');
  ck(r.det, 'economy: both powers are deterministic (same seed, same result)');
  ck(/smugOn\(id\)/.test(SRC['03-sim.js'] || '') && /buyPower\(id,k\)/.test(SRC['03-sim.js'] || '') && /usePower\(id,'mil'/.test(SRC['03-sim.js'] || ''), 'economy: the AI buys and uses both powers');
  ck(/'smugs'/.test(SRC['07b-ckpt.js'] || ''), 'economy: smuggling routes are in the checkpoint');
}
  // Test-range stalls (superfreeze): audio sheets and engine loops are decoded at battle start, not at the first wave/order
  ck(/voRLoad\(g\.teams\[ME\]\.fac\)/.test(SRC['08-ui.js'] || '') && /vosLoad\(g\.teams\[ME\]\.fac\)/.test(SRC['08-ui.js'] || '') && /envLoop\(k,\.01\)/.test(SRC['08-ui.js'] || '') && /if\(g<\.01\|\|SFX\.loops/.test(SRC['09-audio.js'] || '') && /annWarm\(\)/.test(SRC['08-ui.js'] || ''), 'audio (the warm-up volume must be at least the .01 load threshold of envLoop, or nothing loads): radio, shout, announcer sheets and engine loops are decoded at battle start (no decodeAudioData burst in the first wave)');
  ck(/function dashPoly\(/.test(SRC['08h-modern.js'] || '') && /clipPolyRect\(pts,-20,-20,VW\+20,VH\+20\)/.test(SRC['08h-modern.js'] || '') && !/setLineDash\(\[8,6\]\);c\.lineDashOffset/.test(SRC['08h-modern.js'] || ''), 'view: the EW jam ring is drawn only where it is on screen (clipped fill, plain short dashes), never its whole off-screen length (the card drawing it stalled Test range frames 300 ms to seconds)');
await browser.close(); server.close();
}
{ const m = SRC['11-models.js'] || '';   // scale (Abdullah 2026-11-19 18:52 "Increase the size of the vehicles don't shrink the infantry")
  ck(/const VEH_SCALE=\{/.test(m) && /vehScale\(e,c\)/.test(m) && /o\.scale\.setScalar\(vs\)/.test(m), 'scale: vehicles are drawn bigger through the one VEH_SCALE multiplier');
  ck(/tank:\{m:'tank',fit:'z',size:38\}/.test(m) && /inf:\{m:'soldier',fit:'y',size:14(\.0)?[,}]/.test(m) && /c\.size\*=1\.15/.test(m), 'scale: infantry size is unchanged (soldier 14 x 1.15, never shrunk)');
  const vs = (m.match(/const VEH_SCALE=\{([^}]*)\}/) || [,''])[1]; ck(vs && [...vs.matchAll(/:([\d.]+)/g)].every(x => +x[1] >= 1), 'scale: no vehicle class is scaled below 1'); }
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'DECISIONS FAIL (' + fails.length + ')' : 'DECISIONS PASS');
process.exit(fails.length ? 1 : 0);
