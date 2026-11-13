// DECISIONS guard (audit): Abdullah's standing decisions that can be checked automatically, so a leftover of something he
// already decided cannot come back (he found "End turn" and the Ayatollah button by hand on 2026-11-06). Static checks read
// src/ (no browser); runtime checks look at the real game as a player: menu, a Conquest battle as IR, the grand map, a campaign battle resolved on the map.
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

// Rules files (orch/loadF): CLAUDE.md = short current rules, orch/DECISIONS.md = the full dated record. Every standing decision's
// key words must still be in one of the two files, and CLAUDE.md must stay short.
{ const rules = ['CLAUDE.md', 'orch/DECISIONS.md'].map(f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; } });
  const all = rules.join('\n').toLowerCase();
  const KEYS = ['world simulator', 'what would really happen', 'no decorative or ambient aircraft', 'left-click selects', 'right-click moves', 'attack-move', 'w a s d', 'ctrl+a',
    'rotates the battle camera', 'pointer lock', 'no big ugly buttons', 'radwan training', 'lebanese shia', 'zaidi shia movement', 'iraqi shia brigades', 'palestine islamic brigade',
    'desert islamic faction', 'zealous', 'professional', 'home defenders', 'firepower-reliant', 'mountain fortress', 'bunker buster', 'dear leader', 'ayatollah', 'shared soundtrack',
    'free art only', 'cloudflare', 'servers-live', 'autodeploy', 'play online', 'pc only', 'conquest', 'zero hour', 'supply lines', 'real time with pause', 'never opens the real-time battle', 'resolved on the campaign map',
    'siege', 'combat width', 'realistic start', 'balanced', 'ai hard', 'smooth first', 'one system per idea', 'leftovers', 'grand campaign', 'missions', 'artifact', 'orch/brief.md',
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

// ---------- static checks ----------
// polishP2 "Never lose progress": one save system. Battles autosave into 3 rolling slots (08d-save.js), the grand campaign saves on a timer
// into 3 rolling copies (13-grand.js grSnap), and the menu's Continue (first item) covers both. Runtime proof: orch/polishtest.mjs (gate/save).
{ const sv = SRC['08d-save.js'] || '', g = SRC['13-grand.js'] || '', m = SRC['14-menu.js'] || '';
  ck(/\['auto','auto2','auto3'\]/.test(sv) && /setInterval\(\(\)=>\{try\{svAutoTick\(\)/.test(sv), 'progress: battle autosave (3 rolling slots on a timer) is gone from 08d-save.js');
  ck(/function grSnap\(/.test(g) && /function grAutoTick\(/.test(g), 'progress: grand campaign timer autosave / rolling safety copies are gone from 13-grand.js');
  ck(/function svGrandInfo\(/.test(sv) && /MX\.cont=item\(/.test(m) && m.indexOf('MX.cont=item(') < m.indexOf("item('Grand campaign'") + (m.indexOf("item('Grand campaign'") < 0 ? 1e9 : 0) && m.indexOf('MX.cont=item(') < m.indexOf("item('Single player'") + (m.indexOf("item('Single player'") < 0 ? 1e9 : 0), 'progress: Continue must be the first item of the menu list and cover battles and the grand campaign');
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
  ck(/function gtkOdds\(/.test(all) && /gwOddsAt\(A\[0\]\.o,/.test(all) && !/grSideVal\(/.test(SRC['13e3-gtokens.js'] || ''), 'Army Standards: odds pills must use the campaign battle rules\' own forecast (gtkOdds -> gwOddsAt), no second formula'); }
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
// 3. Main menu order + naming (2026-11-07 21:41): Single player · Multiplayer · Test range, then small extras; no Classic.
{ const m = [...SRC['14-menu.js'].matchAll(/^\s*item\('([^']+)'/gm)].map(x => x[1]).filter(Boolean).slice(0, 3);
  ck(m.join('|') === 'Single player|Multiplayer|Test range', 'main menu order is ' + m.join(' · '));
  for (const f of ['14-menu.js', '08d-lobby.js']) ck(!/['">]Classic[<'"]/.test(SRC[f]), 'Classic mode still named in ' + f); }
// 4. Grand-map-only assets are banned from Conquest in the one place that decides it.
// (leadersC 2026-11-07 22:38: they are in Conquest/Battle/Missions/sandbox for their nations - sigBan decides the nation; nothing bans them by game mode any more)
ck(!/function conqBan\(/.test(SRC['01-data.js']) && /function sigBan\(fac,k\)/.test(SRC['01-data.js']), 'signature assets: sigBan (per nation) must be the one place that decides; the old per-mode conqBan is back');
// 4b. NO REAL-TIME BATTLES IN THE GRAND CAMPAIGN (Abdullah 2026-11-11 23:57 "Abandon battles in grand campaign. Turn it into eu 4 rules", 23:58 "No and now"):
//     every land, sea and air fight is resolved on the campaign map by src/13a-gwar.js. No campaign file may start a battle (newGame), the old bridge
//     and its leftovers must stay gone from every file, and the battle code keeps no campaign branch (G.grand).
{ const all = Object.entries(SRC), g13 = all.filter(([f]) => /^13/.test(f));
  const starts = g13.filter(([f, t]) => /\b(newGame|afterStart)\s*\(/.test(t)).map(x => x[0]); ck(!starts.length, 'campaign battles: a grand-campaign file starts the real-time battle (newGame/afterStart): ' + starts.join(', '));
  const old = /\b(grandBattleStart|grandBattleSetup|grandFightLive|grandLeaveBattle|grandTestFinish|grandTick|grandHud|grBattlePrompt|grBattleDone|gnBattleAsk|gnBattleFor|GB_CUR|GRAND_NOPROD|gmApply|gmWriteBack|gdrApplyBattle|gmilApplyPerks)\b|G\.grand\b|o\.grand\b|Fight it live|Fight-it|Auto-resolve|auto-resolve/;
  const left = all.filter(([f, t]) => old.test(t)).map(x => x[0]); ck(!left.length, 'campaign battles: leftovers of the real-time campaign battle in ' + left.join(', '));
  const w = SRC['13a-gwar.js'] || '', gr = SRC['13-grand.js'] || '';
  ck(/function gwStep\(/.test(w) && /function gwSiegeDay\(/.test(w) && /function gwOpen\(/.test(w) && /grRng\(/.test(w) && !/Math\.random/.test(w), 'campaign battles: the map resolver (13a-gwar.js: gwOpen / gwStep / gwSiegeDay, seeded draws only) is gone or uses Math.random');
  ck(/function grQueue\(auto\)\{for\(;GC\.qi<GC\.q\.length;GC\.qi\+\+\)grBattleAuto\(/.test(gr) && /function grBattleAuto\(b\)\{.*gwOpen\(b\)/.test(gr), 'campaign battles: the month close must hand every contested province to gwOpen (no prompt, no other path)');
  ck(/if\(gwFort\(pi\)>0&&!st\.sf\)return false/.test(gr), 'campaign battles: a fort province must not change hands without a finished siege (grCapture)');
  ck(/za=gwZeal\(B\.an\),zd=gwZeal\(B\.dn\)/.test(w) && /bd=!zd&&/.test(w) && /ba=!za&&/.test(w) && /function gwZeal\(nat\)\{try\{return msOf\(grNat\(nat\)\.fac\)\.rout===0/.test(w), 'campaign battles: Zealous sides (msOf(..).rout===0) must never break in gwStep'); }
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
  // MENU STRUCTURE (Abdullah 2026-11-07 21:41 "There's a single player window or section and then multiplayer and test range", "These are distinct"; 21:38 three games): the top level is exactly Single player, Multiplayer, Test range (+ small extras)
  { const big = await ev(() => [...document.querySelectorAll('#mxmenu .mxi')].filter(b => b.offsetParent && !b.hidden && !/\b(dim|sep)\b/.test(b.className) && !/^Continue/.test(b.textContent.trim())).map(b => ((b.firstChild||{}).textContent||'').trim()).filter(Boolean));
    ck(big.join('|') === 'Single player|Multiplayer|Test range', 'main menu top level should be exactly Single player|Multiplayer|Test range, got ' + big.join('|'));
    const sm = await ev(() => [...document.querySelectorAll('#mxmenu .mxi.dim')].map(b => b.textContent.trim()));
    ck(sm.every(t => /^(Settings|Extras|Credits)/.test(t)), 'only Settings/Extras/Credits may be small top-level extras, got ' + sm.join('|'));
    const all = await ev(() => [...document.querySelectorAll('#mxmenu .mxi')].map(b => ((b.firstChild||{}).textContent||'').trim()));
    for (const bad of ['Grand campaign', 'Conquest', 'Battle', 'Missions', 'Tutorial', 'Play online']) ck(!all.includes(bad), 'game mode "' + bad + '" must not be on the top level');
    await ev(() => menuGo('single'));
    const sp = await ev(() => [...document.querySelectorAll('#ms-single .mxi')].filter(b => !b.hidden).map(b => ((b.firstChild||{}).textContent||'').trim()));
    ck(sp.slice(0, 3).join('|') === 'Grand campaign|Conquest|Battle' && sp.includes('Missions') && sp.includes('Tutorial'), 'Single player should list Grand campaign|Conquest|Battle then Missions, Tutorial, got ' + sp.join('|'));
    ck(await ev(() => [...document.querySelectorAll('#ms-single .mxi')].filter(b => !b.hidden).every(b => b.querySelector('small'))), 'every Single player item needs a one-line description');
    await ev(() => menuGo('online'));
    const mpg = await ev(() => [...document.querySelectorAll('#ms-online #mxolg .mxi')].map(b => ((b.firstChild||{}).textContent||'').trim()));
    ck(mpg.join('|') === 'Grand campaign|Conquest|Battle', 'Multiplayer should offer Grand campaign|Conquest|Battle first, got ' + mpg.join('|'));
    ck(await ev(() => typeof mxOnline === 'function' && typeof gnLobbyStart === 'function' && !!document.getElementById('jcode')), 'Multiplayer needs the campaign lobby + join box');
    await ev(() => mxOnline('campaign')); ck(await ev(() => !!document.getElementById('mxCampNew')), 'Multiplayer → Grand campaign must offer the campaign lobby');
    await ev(() => { grandMenu(); }); await page.waitForTimeout(300);
    const gm = await ev(() => [...document.querySelectorAll('#campScreen button')].map(b => b.textContent.trim()));
    ck(!gm.some(t => /Play with friends|Join friends/i.test(t)), 'the grand campaign menu must not have its own online lobby, got ' + gm.join('|'));
    await ev(() => { try { campClose(); } catch (e) {} menuHome(); }); }
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
    ck(sl.mini === 0 && sl.world === 0, 'Battle draws supply lines (minimap ' + sl.mini + ', ground ' + sl.world + ' draw calls)'); ck(!sl.on && !sl.wanted, 'Battle supply overlay can be switched on'); ck(sl.chip, 'Battle shows the "Supply OK" chip'); ck(!sl.ui, 'Battle ammo row mentions in/out of supply'); }
  ck(bt.battle && !bt.conq, 'Battle game did not start in Battle mode');
  ck(bt.blds.join() === 'hq' && bt.kinds.includes('dozer') && bt.kinds.includes('harv'), 'Battle must start with a Command Center + dozer + supply truck only, got ' + bt.blds.join() + ' / ' + bt.kinds.join());
  ck(!bt.setupEnd, 'Battle has a no-fire setup phase'); ck(!bt.tax, 'Battle has town taxes'); ck(bt.c1 > bt.c0, 'Battle: supply trucks brought no income (' + bt.c0 + ' -> ' + bt.c1 + ')'); ck(bt.name === 'Battle', 'mode name in HUD/end screen is "' + bt.name + '"');
  await shot('battle-us');
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
  { const tb = await ev(() => { const o = []; for (const t of NP.tabs.filter(t => !t.show || t.show(GC.me))) { NP.code = GC.me; NP.cur = t.id; try { npDraw(); } catch (e) { o.push(t.id + ': threw ' + e.message); continue; } const b = document.getElementById('npBody'), x = b ? b.innerText.trim() : ''; if (x.length < 30 || /Tab error/.test(x)) o.push(t.id + ': ' + (x.slice(0, 60) || 'empty')); npClose(); } return o; });
    ck(!tb.length, 'empty or broken nation-panel tab(s): ' + tb.join('; ')); }
  // CAMPHUD (Abdullah 2026-11-11 19:25 "The top tool bar is not intuitive" / "Or better it's ugly"; 19:28 Nation window "Ugly"; layout "Go"):
  // ONE top bar row at 1280 wide (also at 130% text), no region buttons / Save & exit on it, one "Go to" list, at most five alert chips
  // (most urgent first, the rest behind "+N more"), a Nation window of exactly six groups with every former tab still reachable in two clicks.
  { const g = SRC['13c-grandui.js'] || '', np = SRC['13j-nationpanel.js'] || '', all13 = Object.keys(SRC).filter(k => k.startsWith('13')).map(k => SRC[k]).join('\n');
    ck(!/of GR_REGIONS\)\{const b=guEl\('button','padding/.test(g) && !/function (geUiTop|gmilUiTop)\(/.test(all13) && !/id="gTop" style=/.test(g), 'camphud: an old top-bar row is back (region buttons / geUiTop / gmilUiTop / inline bar style)');
    ck(/function guGoUI\(/.test(g) && /function guTopFit\(/.test(g) && (np.match(/\{id:'[a-z]+',t:'[A-Za-z]+',d:/g) || []).length === 6, 'camphud: Go to control, bar fit or the six Nation groups are gone');
    await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(400);
    const bar = async () => ev(() => { guTop(); const t = document.getElementById('gTop'), r = t.getBoundingClientRect(), kids = [...t.querySelectorAll('button,#gDate,.gnm')].filter(e => e.getClientRects().length);
      const a = document.getElementById('gAlerts'), side = document.getElementById('gSide'), mw = document.getElementById('gMapWrap');
      return { fit: t.scrollWidth <= t.clientWidth + 1, h: Math.round(r.height), out: kids.filter(e => { const k = e.getBoundingClientRect(); return k.top < r.top - 1 || k.bottom > r.bottom + 1 || k.right > r.right + 1; }).length, n: kids.length,
        zones: t.querySelectorAll(':scope>.gz').length, chips: [...t.querySelectorAll('.gch')].map(e => e.id.slice(3)).join(','), tips: [...t.querySelectorAll('.gch')].every(e => (e.title || '').length > 40),
        wins: [...t.querySelectorAll('.gwn')].map(e => e.textContent).join('|'), txt: t.textContent, below: a ? a.getBoundingClientRect().top >= r.bottom - 1 && mw.getBoundingClientRect().top >= a.getBoundingClientRect().bottom - 1 && side.getBoundingClientRect().top >= a.getBoundingClientRect().bottom - 1 : false }; });
    const b1 = await bar();
    ck(b1.fit && b1.out === 0 && b1.h <= 50 && b1.zones === 3, 'camphud: the top bar is not ONE row at 1280 wide ' + JSON.stringify({ fit: b1.fit, out: b1.out, h: b1.h, zones: b1.zones }));
    ck(b1.chips === 'cash,str,fuel,food,man,oil' && b1.tips, 'camphud: resource chips are not cash, strength, fuel, food, manpower, oil each with a hover (' + b1.chips + ')');
    ck(b1.wins === 'Nation|Economy|Military|☰', 'camphud: the right zone is not Nation · Economy · Military + menu (' + b1.wins + ')');
    ck(!/North America|Levant|Save & exit|Score|provinces/i.test(b1.txt), 'camphud: region names, Save & exit, score or provinces are back on the top bar: ' + b1.txt.slice(0, 120));
    ck(b1.below, 'camphud: the alert chips / map / province panel are not below the bar');
    const b2 = await ev(() => { const o = SET.ts; SET.ts = 1.3; tsApply(); guTop(); const t = document.getElementById('gTop'), r = t.getBoundingClientRect(); const out = { fit: t.scrollWidth <= t.clientWidth + 1, chips: [...t.querySelectorAll('.gch')].filter(e => e.getClientRects().length && e.getBoundingClientRect().right <= r.right + 1).length, w: [...t.querySelectorAll('.gwn')].every(e => e.getBoundingClientRect().right <= innerWidth + 1) }; SET.ts = o; tsApply(); guTop(); return out; });
    ck(b2.fit && b2.chips === 6 && b2.w, 'camphud: at 130% text size the top bar overflows at 1280 wide ' + JSON.stringify(b2));
    const go = await ev(() => { const b = document.getElementById('gGoBtn'); if (!b) return null; b.click(); const p = document.getElementById('gGoPop'), n = p ? p.querySelectorAll('button').length : 0, r = p && p.getBoundingClientRect(); const o = { n, want: GR_REGIONS.length, in: !!r && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0, one: document.querySelectorAll('#gGoBtn').length }; b.click(); o.shut = !document.getElementById('gGoPop'); return o; });
    ck(go && go.n === go.want && go.in && go.one === 1 && go.shut, 'camphud: the "Go to" list on the minimap is missing or does not list every region ' + JSON.stringify(go));
    const al = await ev(() => { const keep = AL.list.slice(); for (let i = 0; i < 9; i++) alAdd('zz' + i, '•', 'Test ' + i, () => ({ n: 1, bad: i % 3 === 0 ? 1 : 0, lv: i % 3 === 2 ? 2 : undefined })); alBar();
      const a = document.getElementById('gAlerts'), chips = [...a.querySelectorAll('.gal:not(#gAlMore)')], lv = chips.map(e => +(/l(\d)/.exec(e.className) || [0, 9])[1]), m = document.getElementById('gAlMore'), total = alItems(GC.me).length;
      const o = { n: chips.length, sorted: lv.every((v, i) => !i || lv[i - 1] <= v), more: m ? m.textContent : '', total, fit: a.scrollWidth <= a.clientWidth + 1 }; if (m) { m.click(); const p = document.getElementById('gAlPop'); o.rest = p ? p.querySelectorAll('.gal').length : -1; guPopClose(); }
      AL.list.length = 0; AL.list.push(...keep); alBar(); return o; });
    ck(al.n === 5 && al.sorted && al.fit && new RegExp('^\\+' + (al.total - 5) + ' more').test(al.more) && al.rest === al.total - 5, 'camphud: more than five alert chips are visible, they are not sorted by urgency, or "+N more" is wrong ' + JSON.stringify(al));
    const FORMER = ['eco', 'dip', 'mil', 'prov', 'led', 'mods', 'idea', 'gov', 'stab', 'estates', 'ach', 'mis', 'gr', 'gp', 'ldr', 'home', 'dev', 'fin', 'prop', 'trade', 'coal', 'cor', 'mkt', 'res', 'sup', 'mob', 'au', 'pipe', 'subj', 'arms', 'cov', 'un', 'elect', 'nuke', 'dec'];
    const nw = await ev(FORMER => { npClose(); npOpen(GC.me, 'ov'); const names = [...document.querySelectorAll('#npGroups button')].map(b => b.textContent).join('|'), bad = [], vis = NP.tabs.filter(t => !t.show || t.show(GC.me)).map(t => t.id);
      for (const t of NP.tabs) if (NP_GROUPS.filter(g => g.tabs.includes(t.id)).length !== 1) bad.push(t.id + ' not in exactly one group');
      for (const id of FORMER) { if (!NP.tabs.some(t => t.id === id)) { bad.push(id + ' is no longer registered'); continue; } if (!vis.includes(id)) continue;
        const gb = document.querySelector('#npGroups button[data-g="' + npGrpOf(id) + '"]'); if (!gb) { bad.push(id + ': no group'); continue; } gb.click(); const lb = document.querySelector('#npList button[data-t="' + id + '"]'); if (!lb) { bad.push(id + ': not in its group list'); continue; } lb.click(); if (NP.cur !== id || !document.getElementById('npBody')) bad.push(id + ': did not open'); }
      const o = { names, bad, tabsRow: document.querySelectorAll('#npWin>div').length }; npOpen(GC.me, 'led'); npClose(); npOpen(GC.me); o.remember = NP.cur === 'led' && !!document.getElementById('npWin');
      const other = Object.keys(GC.nat).find(c => c !== GC.me && !GC.nat[c].dead); npGo(other); o.went = NP.code === other; dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); o.back = NP.code === GC.me && !!document.getElementById('npWin');
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); o.closed = !document.getElementById('npWin'); NP.cur = 'ov'; return o; }, FORMER);
    ck(nw.names === 'Overview|Government|Economy|Military|Diplomacy|World', 'camphud: the Nation window does not have exactly the six groups (' + nw.names + ')');
    ck(!nw.bad.length, 'camphud: a former Nation tab is lost or not reachable in two clicks: ' + nw.bad.join('; '));
    ck(nw.remember && nw.went && nw.back && nw.closed, 'camphud: the Nation window does not remember the last place, or Esc is not one step back ' + JSON.stringify({ remember: nw.remember, went: nw.went, back: nw.back, closed: nw.closed }));
    await page.setViewportSize({ width: 1600, height: 900 }); await page.waitForTimeout(300); await ev(() => { guResize(); guTop(); }); }
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
  // ---- campaign battles are resolved ON the map (Abdullah 2026-11-11 23:57): nothing can start the real-time battle; the same state and seed give the same
  //      battle twice; a Zealous army never falls back by morale; a fort province does not change hands without a finished siege
  { const gb = await ev(() => { const o = {}; const G0 = G; grNew({ me: 'IR', seed: 21, len: 'quick' }); for (const k of Object.keys(GC.nat)) GC.nat[k].ai = false;
      o.fns = ['grandFightLive', 'grandBattleStart', 'grandBattleSetup', 'grBattlePrompt', 'grBattleDone', 'grandTick', 'conqBan', 'gnBattleAsk', 'gmMap', 'gmApply'].filter(f => typeof window[f] === 'function');
      const pi = GCM.P.find(p => p.land && p.t === 'f' && !gwFort(p.i) && !p.cap && !GC.armies.some(a => a.at === p.i)).i;
      const fight = (an, dn, va, vd, seed) => { GC.seed = seed; GC.bid = 900; GC.war[grWk(an, dn)] = 1; GC.prov[pi].gar = []; const A = grAddArmy(an, pi, grGenUnits(grNat(an).fac, va, true)), D = grAddArmy(dn, pi, grGenUnits(grNat(dn).fac, vd, true)), at = D.at;
        const B = gwOpen({ p: pi, an, dn, att: [A.id], def: [D.id], garr: false, river: false, mtn: false, sea: false, done: 0 }); let g = 0; while (GC.bt.includes(B) && g++ < 2000) gwTick(); const R = GC.br[GC.br.length - 1];
        const r = { win: R.win, how: R.how, d: R.d, la: R.la, ld: R.ld, dAlive: GC.armies.includes(D), dMoved: GC.armies.includes(D) && D.at !== at }; GC.armies = GC.armies.filter(a => a !== A && a !== D); return r; };
      const js = JSON.stringify(GC), a = JSON.stringify(fight('US', 'RU', 30000, 30000, 5)); GC = JSON.parse(js); const b = JSON.stringify(fight('US', 'RU', 30000, 30000, 5)); GC = JSON.parse(js); const c = JSON.stringify(fight('US', 'RU', 30000, 30000, 6)); GC = JSON.parse(js);
      o.same = a === b; o.diff = a !== c; o.days = JSON.parse(a).d;
      o.zeal = []; for (const z of ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI']) if (GC.nat[z]) for (let sd = 1; sd <= 3; sd++) { const r = fight('US', z, 60000, 12000, sd); if (r.win !== 'att' || r.dAlive || r.dMoved || r.how === 'rout' || r.how === 'shatter') o.zeal.push(z + ':' + r.how); }
      const fp = GCM.P.find(q => q.land && GC.prov[q.i].o === 'SA' && !q.cap && gwFort(q.i) > 0 && !GC.armies.some(x => x.at === q.i)); o.fort = !!fp;
      if (fp) { GC.war[grWk('IR', 'SA')] = 1; GC.prov[fp.i].gar = []; grAddArmy('IR', fp.i, grGenUnits('IR', 40000, true)); grEndTurn(true); o.fortOwner = GC.prov[fp.i].o; o.siege = !!gwSiegeAt(fp.i); o.live = G !== G0; }
      return o; });
    console.log('campaign battles', JSON.stringify(gb));
    ck(!gb.fns.length, 'campaign battles: real-time battle functions are back: ' + gb.fns.join(', ')); ck(gb.same && gb.diff && gb.days >= 3, 'campaign battles: same state + seed must give the same battle (and another seed another one): ' + JSON.stringify([gb.same, gb.diff, gb.days]));
    ck(!gb.zeal.length, 'campaign battles: a Zealous army left the field by morale: ' + gb.zeal.join(', '));
    ck(gb.fort && gb.fortOwner === 'SA' && gb.siege && !gb.live, 'campaign battles: an army walked into a fort province and took it without a siege (or a real-time battle started): ' + JSON.stringify(gb)); }
} catch (e) { fails.push('decisions run crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of errs) fails.push(e);
await browser.close(); server.close();
}
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'DECISIONS FAIL (' + fails.length + ')' : 'DECISIONS PASS');
process.exit(fails.length ? 1 : 0);
