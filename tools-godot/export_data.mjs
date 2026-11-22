// Lane X2: the OLD GAME EXPORTS ITS OWN CONTENT for the Godot menus and HUD.
// Opens the final JavaScript game (branch js-final: built index.html + src/) in headless Chromium, lets the game build its
// own menus / command bar / cameos, and reads them out as data. Nothing here is typed by hand: every string, number and
// picture comes out of the running page (page.evaluate), so a re-run after a change on js-final gives the same files again.
//
//   git worktree add ../jsfinal js-final          # once: a checkout of the JS game (read-only)
//   node tools-godot/export_data.mjs [--js ../jsfinal] [--only nations,units,icons,maps,menus,missions,strings] [--quiet]
//
// Output (all new files, nothing existing is touched):
//   godot/data/ui/{nations,units,buildings,upgrades,powers,maps,menus,missions,tutorial,strings}.json
//   godot/ui/icons/**  (cameo sheets per nation, flags, emblems, button icons, map previews) + godot/ui/icons/atlas.json
// Every JSON has a top-level "_source" naming the JS file / function it came from. The script validates what it wrote
// (every nation has every category, every icon key exists) and prints a summary table; exit code 1 when a check fails.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
const JS = path.resolve(arg('js', process.env.WW3_JS || path.join(ROOT, '..', 'jsfinal')));
const ONLY = arg('only', '').split(',').filter(Boolean), want = k => !ONLY.length || ONLY.includes(k);
const DATA = path.join(ROOT, 'godot/data/ui'), ICONS = path.join(ROOT, 'godot/ui/icons');
const log = (...a) => { if (!has('quiet')) console.log(...a); };
if (!fs.existsSync(path.join(JS, 'index.html')) || !fs.existsSync(path.join(JS, 'src/01-data.js'))) {
  console.error(`No JS game at ${JS} (need index.html + src/). Run: git worktree add ../jsfinal js-final   or pass --js <dir>`); process.exit(2);
}
fs.mkdirSync(DATA, { recursive: true }); fs.mkdirSync(ICONS, { recursive: true });

// ---------------------------------------------------------------------------------------------- output helpers
const written = {};   // relative path -> bytes
function writeJSON(name, obj) { const p = path.join(DATA, name), s = JSON.stringify(obj, null, 1) + '\n'; fs.writeFileSync(p, s); written['godot/data/ui/' + name] = s.length; return obj; }
function writeFile(rel, buf) { const p = path.join(ICONS, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); written['godot/ui/icons/' + rel] = buf.length; }
const pngOf = dataURL => Buffer.from(String(dataURL).replace(/^data:image\/png;base64,/, ''), 'base64');
const ATLAS = { _source: 'tools-godot/export_data.mjs: pictures captured from the running JS game (canvas.toDataURL / inline SVG tables). key -> {file, x, y, w, h}; paths are relative to godot/ui/icons/', icons: {} };
const icon = (key, file, x, y, w, h, extra) => { ATLAS.icons[key] = Object.assign({ file, x, y, w, h }, extra || {}); };

// ---------------------------------------------------------------------------------------------- static server + page
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wasm': 'application/wasm', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(JS, path.normalize(u)); if (!f.startsWith(JS)) { r.writeHead(403); return r.end(); }
  if (u === '/sw.js') { r.writeHead(404); return r.end(); }   // no service worker in the export run
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); });
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const ORIGIN = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith('data:') || r.request().url().startsWith('blob:') ? r.continue() : r.abort());
const pageErrors = []; page.on('pageerror', e => pageErrors.push(String(e.message || e).slice(0, 200)));
await page.addInitScript(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} });
log(`JS game: ${JS}  ->  ${ORIGIN}`);
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof FKEYS !== 'undefined' && !!document.getElementById('mx'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
const JSREV = (() => { try { return fs.readFileSync(path.join(JS, '.git'), 'utf8').trim(); } catch (e) { return ''; } })();
const src = s => `${s}  (JS game, branch js-final; read from the running page by tools-godot/export_data.mjs)`;

// ============================================================================================== MENU PHASE (no battle yet)
// ---- nations.json + flags + emblems
if (want('nations')) {
  const N = await page.evaluate(() => {
    const cv2url = c => { const d = document.createElement('canvas'); d.width = c.width; d.height = c.height; d.getContext('2d').drawImage(c, 0, 0); return d.toDataURL('image/png'); };
    facCards();
    const cards = {}; [...document.querySelectorAll('#pickP .fac')].forEach((b, i) => { const t = c => (b.querySelector(c) || {}).textContent || ''; cards[FKEYS[i]] = { name: t('.nm'), short: t('.dc'), doctrine: t('.full'), special: t('.sp'), strike: t('.sw'), badge: (b.querySelector('.ins') || {}).textContent || '' }; });
    const GN = { S: 'Shia and allies', W: 'West', E: 'East', R: 'Regional' }, fam = k => (typeof AFAM !== 'undefined' && AFAM[k]) || 'W';
    const out = { order: FKEYS.slice(), groups: [], morale_styles: {}, leaders: {}, nations: {}, img: {} };
    for (const g of ['S', 'W', 'E', 'R']) out.groups.push({ key: g, name: GN[g], members: FKEYS.filter(k => fam(k) === g) });
    for (const k in MSTYLES) { const m = MSTYLES[k]; out.morale_styles[k] = { key: k, name: m.n, description: m.desc, rout_below: m.rout, numbers: JSON.parse(JSON.stringify(m)), nations: FKEYS.filter(f => (MORALE_STYLE[f] || FACTIONS[f].moraleStyle || 'home') === k) }; }
    for (const k in LDS) out.leaders[k] = { key: k, name: LDS[k].n, unit_kind: 'cleric', passive: LD_TIPS[k].p, ability: Object.assign({ name: LDS[k].a.n, text: LD_TIPS[k].a, hotkey: 'E' }, LDS[k].a), ultimate: Object.assign({ name: LDS[k].u.n, text: LD_TIPS[k].u, hotkey: 'Shift+E' }, LDS[k].u), radius: LD_R, nations: FKEYS.filter(f => ldKind(f) === k) };
    FKEYS.forEach((k, i) => {
      const F = FACTIONS[k], ms = MORALE_STYLE[k] || F.moraleStyle || 'home', sp = stats(k, F.special), ld = ldKind(k);
      const sig = []; if (ld === 'ay') sig.push('ayatollah'); if (ld === 'dl') sig.push('dear_leader'); if (BB_NAT[k]) sig.push('bunker_buster'); if (FORT_NAT[k]) sig.push('mountain_fortress');
      let np = null; try { const P = powInfo('nat', k); np = { name: P.name, description: P.desc, cooldown: P.cd, radius: P.r || 0 }; } catch (e) {}
      let quotes = []; try { quotes = (LOAD_QUOTES[k] || []).map(q => ({ text: q.q, original: q.o || '', lang: q.l || '', by: q.a, attributed: !!q.at })); } catch (e) {}
      out.nations[k] = { key: k, order: i, name: F.name, group: fam(k), group_name: GN[fam(k)], color: F.color, lang: F.lang || '', music: F.music || '',
        morale_style: ms, morale_name: (MSTYLES[ms] || {}).n || ms, morale_description: (MSTYLES[ms] || {}).desc || '',
        doctrine_name: F.doctrineName || '', description_short: cards[k].short, description: cards[k].doctrine, card: cards[k],
        special_unit: { kind: F.special, name: sp.name, text: (SPECIAL_TIP[F.special] ? SPECIAL_TIP[F.special](sp) : '') },
        signature_upgrade: { key: F.fup || '', name: F.fup ? upgName(k, F.fup) : '' },
        strike: Object.assign({ building: bstats(k, 'uplink').name }, JSON.parse(JSON.stringify(F.sup))),
        national_power: np, signature_assets: sig, leader: ld, shia: !!SHIA[k], tunnels: !!F.tunnels, firing_post: !!F.post, no_air: !!F.noAir, no_ships: !!F.noShip,
        extra_units: (F.extra || []).slice(), mods: JSON.parse(JSON.stringify(F.mods || {})),
        home_maps: (typeof MAP_KEYS !== 'undefined' ? MAP_KEYS : []).filter(m => (MAPS[m].home || []).includes(k)),
        loading_quotes: quotes, flag: 'flag/' + k, emblem: k === 'RS' || k === 'DW' || k === 'RV' ? 'emblem/' + k : null, badge: { text: cards[k].badge || k, color: F.color } };   /* the picker badge: RS / DW / RV show their emblem, every other nation its two letters on its colour (facCards) */
      try { out.img['flag/' + k] = cv2url(flagTex(k).image); } catch (e) { out.img['flag/' + k] = null; }
      if (out.nations[k].emblem) try { out.img['emblem/' + k] = cv2url(emblemCanvas(k, 64)); } catch (e) { out.nations[k].emblem = null; }
    });
    return out;
  });
  for (const [key, url] of Object.entries(N.img)) { if (!url) continue; const [dir, k] = key.split('/'); const rel = `${dir}s/${k}.png`, b = pngOf(url); writeFile(rel, b); icon(key, rel, 0, 0, b.readUInt32BE(16), b.readUInt32BE(20)); }
  delete N.img;
  writeJSON('nations.json', Object.assign({ _source: src('src/01-data.js FACTIONS / PLAYABLE / MSTYLES / MORALE_STYLE / BB_NAT / FORT_NAT / SHIA, src/08-ui.js facCards() (the nation cards of the picker) + LOAD_QUOTES, src/03i-leaders.js LDS / LD_TIPS, src/11-models.js AFAM (family S/W/E/R) + flagTex() + emblemCanvas(). Group NAMES are from CLAUDE.md (the picker has no group headers)') }, N));
  log(`nations.json: ${N.order.length} nations, ${Object.keys(N.morale_styles).length} morale styles, ${Object.keys(N.leaders).length} leaders`);
}

// ============================================================================================== BATTLE PHASE
// One Battle is started (IR vs US, Split Ridge, fixed seed) and paused; for each nation the player's team is switched to it
// and the game's own buildPanels() / updateUI() fill the command bar, exactly as orch/barshots.mjs does for its name check.
async function startBattle() {
  await page.evaluate(() => { setup.n = 1; setup.p = 'IR'; setup.a = 'US'; setup.map = 'bm_splitridge'; setup.seed = 1; setup.d = 1; startSingle(); });
  await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.teams && G.t > 0, null, { timeout: 900000, polling: 500 });
  // the battle is only a data source from here on: pause it and stop the page's frame loops (software WebGL would eat the whole main thread)
  await page.evaluate(() => { G.paused = true; window.requestAnimationFrame = () => 0; });
  await page.waitForTimeout(1500);
}
if (want('units') || want('icons') || want('strings')) { log('starting a Battle in the page (software WebGL: about a minute)...'); await startBattle(); }

if (want('units')) {
  const R = await page.evaluate(() => {
    const clean = o => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'function' ? undefined : v));
    const T = G.teams[ME], keep = { fac: T.fac, F: T.F, sup: T.sup, color: T.color };
    const out = { nations: {}, common: {} };
    const encStub = document.createElement('div'), encOv = ENC.ov;
    const encCard = (f, k, b, s) => {   // the encyclopedia's own info card (encInfo) drawn into a detached element, read back as rows
      try { ENC.ov = { querySelector: () => encStub }; encInfo({ f, k, b, s, n: s.name || k });
        const rows = [...encStub.querySelectorAll('.erow')].map(r => [r.querySelector('.ek').textContent, r.querySelector('.ev').textContent]);
        const secs = {}; for (const c of encStub.querySelectorAll('.esec')) { const h = c.querySelector('.ek').textContent, t = [...c.querySelectorAll('.etx')].map(x => x.textContent).join(' '); if (t) secs[h] = t; }
        return { rows, counters_note: secs['Counters'] || '', real_world_note: secs['Real-world note'] || '', in_game: secs['In the game'] || '' };
      } catch (e) { return { rows: [], err: String(e) }; } finally { ENC.ov = encOv; } };
    const mu = (f, k) => { try { const m = matchUp(f, k, f); return { armed: !!m.armed, beats: m.beats.map(x => ({ key: x.k, building: !!x.b, name: x.n })), weak_to: m.weak.map(x => ({ key: x.k, building: !!x.b, name: x.n })) }; } catch (e) { return { armed: false, beats: [], weak_to: [] }; } };
    const btn = id => { const b = document.getElementById(id); if (!b) return null; return { label: b.dataset.nm || '', cost_text: (b.querySelector('.c') || {}).textContent || '', desc: b.dataset.desc || '', tip: b.dataset.tip || '', next: b.dataset.nx || '', icon: b.dataset.ic || '', shown: b.style.display !== 'none' }; };
    for (const f of FKEYS) {
      const F = FACTIONS[f]; T.fac = f; T.F = F; T.color = F.color; try { T.sup = swSup(f); } catch (e) {}
      buildPanels(); updateUI(); try { zhIcons(); } catch (e) {}
      // panel order + group headers exactly as the bar lists them
      const order = { build: [], units: [], upg: [], pow: [] }, group = {}; let cur = {};
      for (const b of document.querySelectorAll('#panel>[data-tab]')) { const t = b.dataset.tab; if (b.classList.contains('sub')) { cur[t] = b.textContent; continue; } if (!b.id || !order[t] || !/^(b|u|g|p)_/.test(b.id)) continue; order[t].push(b.id.slice(2)); group[b.id] = cur[t] || ''; }
      const ro = roster(f), N = { units: {}, buildings: {}, upgrades: {}, powers: {}, order: {} };
      // ---- units
      order.units.forEach((k, i) => { const s = stats(f, k), d = btn('u_' + k), sp = k === 'champ' ? HERO_RANK : (k === F.special || k === 'ew' || SIGU[k]) ? SPEC_RANK : 0;
        N.units[k] = { key: k, order: i, name: s.name, label: d.label, decoy: !!s.fake, cost: s.cost, build_time: Math.round(prodTime(T, Object.assign({}, s, { kind: k })) * 100) / 100, base_time: s.time,
          built_at: s.from, built_at_name: STRUCT[s.from] ? bstats(f, s.from).name : s.from, requires: [s.from], group: group['u_' + k], hotkey: null, general_rank: sp, limit: s.limit || (k === 'champ' || k === 'cleric' ? 1 : 0), pop: popOf(s),
          class: s.cls, domain: s.dom, special: k === F.special, description: s.desc || '', note: UNOTE[k] || UNOTE[s.cls] || '', special_tip: SPECIAL_TIP[k] && (k === F.special || k === 'ew' || SIGU[k] || k === 'fpvt') ? SPECIAL_TIP[k](s) : '',
          ability: k === 'champ' && s.hab && HAB[s.hab] ? { key: s.hab, name: HAB[s.hab].n, text: HAB[s.hab].d, cooldown: HERO_CD, hotkey: 'E', rebuy_wait: HERO_REBUY } : k === 'cleric' && ldKind(f) ? { leader: ldKind(f) } : null,
          tip: d.tip, cost_text: d.cost_text, stats: clean(s), ammo: (() => { try { return ammoCap(s); } catch (e) { return null; } })(), card: encCard(f, k, 0, s), match: mu(f, k), icon: `u/${f}/${k}` }; });
      // ---- buildings (the dozer's Build list) + the other structures that can stand on the map
      const bks = order.build.concat(Object.keys(STRUCT).filter(k => !order.build.includes(k)));
      bks.forEach((k, i) => { let s; try { s = bstats(f, k); } catch (e) { return; } const d = btn('b_' + k), inBar = order.build.includes(k), ok = inBar && bldAllowed(f, k), rq = k === 'uplink' && swBattle() ? SW_REQ : STRUCT[k].req || '';
        N.buildings[k] = { key: k, order: i, name: s.name, generic_name: STRUCT[k].name, in_build_menu: inBar, available: !!ok, cost: s.cost, build_time: s.time, built_by: inBar ? 'dozer' : '', requires: rq ? [rq] : [], requires_name: rq ? bstats(f, rq).name : '', tip_requires_name: STRUCT[k].req ? STRUCT[STRUCT[k].req].name : '',
          group: group['b_' + k] || '', hotkey: null, power: -pwNeed(k), limit: s.limit || 0, shore: !!STRUCT[k].shore, size: s.size, hp: s.hp, description: STRUCT[k].desc || s.desc || (STRUCT[k].shore ? 'Place on the shoreline' : ''),
          tip: d ? d.tip : '', cost_text: d ? d.cost_text : '', produces: CATS.includes(k) ? (ro[k] || []).slice() : [], upgrades: order.upg.filter(u => UPG[u].at === k), is_production: CATS.includes(k), stats: clean(s), card: encCard(f, k, 1, s), match: s.dmg > 0 ? mu(f, k) : null, counter_note: (typeof ENC_BCOUNTER !== 'undefined' && ENC_BCOUNTER[k]) || '', icon: `b/${f}/${k}` }; });
      // ---- upgrades (researched at their building)
      order.upg.forEach((k, i) => { const U = UPG[k], d = btn('g_' + k); N.upgrades[k] = { key: k, order: i, name: upgName(f, k), label: d.label, signature: !!U.sp, cost: U.cost, research_time: U.time, at: U.at, at_name: bstats(f, U.at).name, requires: [U.at], group: group['g_' + k], hotkey: null, description: U.desc || '', effects: clean(U.fx || []), tip: d.tip, cost_text: d.cost_text, icon: 'svg/' + (d.icon || 'star') }; });
      // ---- generals' powers
      order.pow.forEach((k, i) => { const P = powInfo(k, f), d = btn('p_' + k); N.powers[k] = { key: k, order: i, name: P.name, description: P.desc || '', unlock_points: powLvCost(k, 0), level_points: [powLvCost(k, 0), powLvCost(k, 1), powLvCost(k, 2)], level_text: ['', powNext(k, 1), powNext(k, 2)], next_text: d.next, cooldown: P.cd || 0, level_cooldown_mult: typeof PCD !== 'undefined' ? PCD.slice() : [], radius: P.r || 0, cash: P.cash || 0, passive: !!P.passive, no_target: !!P.self, national: !!P.nat, hotkey: (POW_KEY[k] || '').toUpperCase(), min_game_time: k === 'bb' ? 300 : 0,
          cost_text: d.cost_text, numbers: clean(P), icon: 'svg/' + (d.icon || 'star'), rail_icon: 'pow/' + (QPIC[k] ? k : 'nat') }; });
      N.order = { build: order.build, units: order.units, upgrades: order.upg, powers: order.pow, production: clean(ro) };
      N.strike = Object.assign({ building: 'uplink', building_name: bstats(f, 'uplink').name, launch_label: 'LAUNCH ' + T.sup.name, launch_text: 'Fire your strike: click LAUNCH, then click the target on the map.', needs_text: 'needs Strike Center', ready_text: 'READY' }, clean(T.sup));
      out.nations[f] = N;
    }
    out.common = { CATS: CATS.slice(), BUILD_ORDER: BUILD_ORDER.slice(), SPEC_RANK, HERO_RANK, RANKS: RANKS.slice(), POW_KEY: clean(POW_KEY), SELL_PCT, SELL_T, REP_COST, POWER: clean(POWER), battle_speed: G.bs || 1,
      level_up_text: 'Raise this power to its next level: stronger, wider, shorter cooldown.', enc_armor: clean(ENC_ARM), enc_types: clean(ENC_TYPES),
      capturable: clean(TB), not_available_text: 'Not available', empty_text: { none: 'Select your Construction Vehicle to build, or a building to train units', other: 'Nothing available here yet' } };
    Object.assign(T, keep); buildPanels(); updateUI();
    return out;
  });
  const per = (cat, srcTxt, extra) => { const o = { _source: src(srcTxt) }; Object.assign(o, extra || {}); o.nations = {}; for (const f of Object.keys(R.nations)) o.nations[f] = { order: R.nations[f].order[cat === 'buildings' ? 'build' : cat], [cat]: R.nations[f][cat] }; return o; };
  const U = per('units', 'src/08-ui.js buildPanels() + updateUI() (Units buttons: name, cost, tooltip), src/01-data.js roster() / stats() / UNOTE / SPECIAL_TIP / HAB / matchUp(), src/03-sim.js prodTime() / popOf(), src/08f-encyclopedia.js encInfo() (card rows)',
    { _notes: 'cost/tip are as shown at the start of a Battle (General rank 1, only the Command HQ built). build_time = seconds in Battle (prodTime, light-economy factor included). Units have no per-button hotkey in the JS game. general_rank > 0 = locked until that General rank. icon = key in godot/ui/icons/atlas.json.', common: { SPEC_RANK: R.common.SPEC_RANK, HERO_RANK: R.common.HERO_RANK, CATS: R.common.CATS, enc_armor: R.common.enc_armor, enc_types: R.common.enc_types } });
  for (const f of Object.keys(R.nations)) U.nations[f].production = R.nations[f].order.production;
  writeJSON('units.json', U);
  writeJSON('buildings.json', per('buildings', 'src/08-ui.js buildPanels() + updateUI() (Build buttons of the Construction Vehicle), src/01-data.js STRUCT / bstats() / bldAllowed() / pwNeed() / BUILD_ORDER, src/03-sim.js reqMet(), src/08f-encyclopedia.js encInfo() + ENC_BCOUNTER',
    { _notes: 'in_build_menu = listed in the dozer Build grid (order = grid order, group = its header). available=false -> the button is shown disabled with cost text "Not available". requires = the real prerequisite the sim checks (reqMet); tip_requires_name = what the JS tooltip prints (differs for the Strike Center in Battle). power > 0 gives power, < 0 needs it. Structures with in_build_menu=false (garrison...) only stand on the map.', common: { BUILD_ORDER: R.common.BUILD_ORDER, CATS: R.common.CATS, POWER: R.common.POWER, SELL_PCT: R.common.SELL_PCT, SELL_T: R.common.SELL_T, REP_COST: R.common.REP_COST, capturable: R.common.capturable, not_available_text: R.common.not_available_text, empty_text: R.common.empty_text } }));
  writeJSON('upgrades.json', per('upgrades', 'src/08-ui.js buildPanels() (Upgrades buttons), src/01-data.js UPG / upgList() / upgName(), src/08o-zhbar.js zhIconFor() (icon)', { _notes: 'Upgrades are researched at their building (at). label has " ★" for the nation\'s signature upgrade. icon = key in atlas.json (button icon table ICON_SVG).' }));
  const P = per('powers', "src/08-ui.js buildPanels() (generals' powers) + POW_KEY + QPIC (side-rail icons), src/01-data.js POWERS / powInfo() / powLvCost() / powNext() / GPOW / NATPOW, src/03-sim.js swSup() (Strike)",
    { _notes: "Powers are bought with General points (unlock_points; level_points[n] = cost to go from level n to n+1) in the ★ General window; an unlocked non-passive power sits on the right-edge rail once ready (rail_icon) and is fired with its hotkey or a click, then a RIGHT-click on the map. strike = the nation's Strike (built at the Strike Center, LAUNCH button + right-click target).", common: { POW_KEY: R.common.POW_KEY, RANKS: R.common.RANKS, level_up_text: R.common.level_up_text } });
  for (const f of Object.keys(R.nations)) P.nations[f].strike = R.nations[f].strike;
  writeJSON('powers.json', P);
  const c = k => Object.values(R.nations).reduce((a, n) => a + Object.keys(n[k]).length, 0);
  log(`units.json ${c('units')} · buildings.json ${c('buildings')} · upgrades.json ${c('upgrades')} · powers.json ${c('powers')}  (22 nations)`);
}

// ---- cameos: the command-bar pictures the game paints in code (UK.drawUnit / UK.drawBld -> CAMEO), one sheet per nation
if (want('icons')) {
  const CW = 144, CH = 112, GUT = 2, COLS = 10;
  let n = 0;
  const facs = await page.evaluate(() => FKEYS.slice());
  for (const f of facs) {
    const r = await page.evaluate(({ f, CW, CH, GUT, COLS }) => {
      const F = FACTIONS[f], col = F.color, items = [], seen = new Set();
      const add = (t, k) => { const id = t + k; if (!seen.has(id)) { seen.add(id); items.push([t, k]); } };
      for (const k of allUnits(f)) add('u', k);
      for (const k of Object.keys(BASE)) { try { if (stats(f, k)) add('u', k); } catch (e) {} }   // powers / signatures spawn kinds outside the roster: keep a picture for every kind
      for (const k of Object.keys(STRUCT)) add('b', k);
      const rows = Math.ceil(items.length / COLS), cv = document.createElement('canvas'); cv.width = COLS * (CW + GUT); cv.height = rows * (CH + GUT);
      const x = cv.getContext('2d'), map = [], errs = [];
      items.forEach(([t, k], i) => { const X = (i % COLS) * (CW + GUT), Y = Math.floor(i / COLS) * (CH + GUT);
        const c1 = document.createElement('canvas'); c1.width = CW; c1.height = CH; const c = c1.getContext('2d');   // its own canvas per picture, exactly like a command button (buildPanels)
        try { if (t === 'u') UK.drawUnit(c, k, CW, CH, col, stats(f, k), f, true); else UK.drawBld(c, k, CW, CH, bstats(f, k), f, true, col); } catch (e) { errs.push(t + k + ':' + e.message); }
        x.drawImage(c1, X, Y); map.push([t, k, X, Y]); });
      return { url: cv.toDataURL('image/png'), map, errs };
    }, { f, CW, CH, GUT, COLS });
    if (r.errs.length) console.error('cameo errors', f, r.errs.slice(0, 5));
    const rel = `cameos/${f}.png`; writeFile(rel, pngOf(r.url));
    for (const [t, k, X, Y] of r.map) { icon(`${t}/${f}/${k}`, rel, X, Y, CW, CH); n++; }
  }
  // neutral map buildings (oil derrick, capturable tech buildings, plain garrison houses) in neutral gray
  const neu = await page.evaluate(({ CW, CH, GUT }) => {
    const ks = ['oil', 'house', 'garrison', ...Object.keys(TB)], cv = document.createElement('canvas'); cv.width = ks.length * (CW + GUT); cv.height = CH; const x = cv.getContext('2d'), map = [];
    ks.forEach((k, i) => { const c1 = document.createElement('canvas'); c1.width = CW; c1.height = CH; try { UK.drawBld(c1.getContext('2d'), k, CW, CH, { name: (TB[k] || {}).name || k }, 'US', true, '#8f8f8f'); } catch (e) {} x.drawImage(c1, i * (CW + GUT), 0); map.push([k, i * (CW + GUT)]); });
    return { url: cv.toDataURL('image/png'), map };
  }, { CW, CH, GUT });
  writeFile('cameos/_neutral.png', pngOf(neu.url)); for (const [k, X] of neu.map) { icon(`b/_/${k}`, 'cameos/_neutral.png', X, 0, CW, CH); n++; }
  // button icons: the one inline-SVG table (ICON_SVG: orders, upgrades, powers, HUD buttons) and the power-rail glyphs (QPIC)
  const svgSrc = await page.evaluate(() => ({ ICON_SVG: Object.assign({}, ICON_SVG), QPIC: Object.assign({}, QPIC) }));
  const blank = await ctx.newPage(); await blank.setContent('<body></body>');   // rasterised on an empty page: no game loop in the way
  const svg = await blank.evaluate(async ({ ICON_SVG, QPIC }) => {
    const out = {}, ras = (s, px) => new Promise(ok => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = px; c.getContext('2d').drawImage(im, 0, 0, px, px); ok(c.toDataURL('image/png')); }; im.onerror = () => ok(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
    const ns = s => s.replace('<svg ', "<svg xmlns='http://www.w3.org/2000/svg' ");
    for (const k of Object.keys(ICON_SVG)) { const s = ns(ICON_SVG[k]); out['svg/' + k] = { svg: s, png: await ras(s.replace('<svg ', "<svg width='96' height='96' "), 96), px: 96 }; }
    for (const k of Object.keys(QPIC)) { const s = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#d6e6c4' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>${QPIC[k].replace(/"/g, "'")}</svg>`; out['pow/' + k] = { svg: s, png: await ras(s.replace('<svg ', "<svg width='60' height='60' "), 60), px: 60 }; }
    return out;
  }, svgSrc);
  await blank.close();
  for (const [key, v] of Object.entries(svg)) { const [d, k] = key.split('/'); writeFile(`${d}/${k}.svg`, Buffer.from(v.svg + '\n')); if (v.png) { writeFile(`${d}/${k}.png`, pngOf(v.png)); icon(key, `${d}/${k}.png`, 0, 0, v.px, v.px, { svg: `${d}/${k}.svg` }); n++; } }
  log(`icons: ${n} cameos + button icons captured (${facs.length} nation sheets)`);
}

// ============================================================================================== write the icon index, validate, summary
if (Object.keys(ATLAS.icons).length) {
  // a partial run (--only) keeps the keys of the last full run that it did not redo
  const ap = path.join(ICONS, 'atlas.json'); if (ONLY.length && fs.existsSync(ap)) { try { const old = JSON.parse(fs.readFileSync(ap, 'utf8')).icons || {}; for (const k in old) if (!ATLAS.icons[k] && fs.existsSync(path.join(ICONS, old[k].file))) ATLAS.icons[k] = old[k]; } catch (e) {} }
  const sorted = {}; for (const k of Object.keys(ATLAS.icons).sort()) sorted[k] = ATLAS.icons[k]; ATLAS.icons = sorted; ATLAS.count = Object.keys(sorted).length;
  const s = JSON.stringify(ATLAS, null, 1) + '\n'; fs.writeFileSync(ap, s); written['godot/ui/icons/atlas.json'] = s.length;
}
await browser.close(); server.close();

// ---- validation: runs on what is on disk (so it also covers files of earlier partial runs)
const rd = n => { try { return JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8')); } catch (e) { return null; } };
const A = (() => { try { return JSON.parse(fs.readFileSync(path.join(ICONS, 'atlas.json'), 'utf8')).icons; } catch (e) { return {}; } })();
const problems = [], iconRefs = new Set();
const walk = (o, f) => { if (!o || typeof o !== 'object') return; for (const k in o) { f(k, o[k]); walk(o[k], f); } };
const NAT = rd('nations.json'), order = NAT ? NAT.order : [];
if (NAT) { if (order.length !== 22) problems.push(`nations.json: ${order.length} nations, expected 22`); for (const k of order) { const n = NAT.nations[k]; for (const q of ['name', 'color', 'group', 'morale_style', 'description', 'flag']) if (!n || !n[q]) problems.push(`nations.json ${k}: no ${q}`); iconRefs.add(n.flag); if (n.emblem) iconRefs.add(n.emblem); } }
const table = [];
for (const [file, cat, min] of [['units.json', 'units', 20], ['buildings.json', 'buildings', 12], ['upgrades.json', 'upgrades', 8], ['powers.json', 'powers', 6]]) {
  const d = rd(file); if (!d) { problems.push(file + ': missing'); continue; }
  for (const k of order) { const n = d.nations[k]; if (!n || !n[cat]) { problems.push(`${file}: nation ${k} missing`); continue; } const c = Object.keys(n[cat]).length; if (c < min) problems.push(`${file} ${k}: only ${c} ${cat}`);
    for (const e of Object.values(n[cat])) { if (!e.name) problems.push(`${file} ${k}/${e.key}: no name`); if (e.icon) iconRefs.add(e.icon); if (e.rail_icon) iconRefs.add(e.rail_icon); if (cat !== 'powers' && !(e.cost >= 0)) problems.push(`${file} ${k}/${e.key}: no cost`); } }
}
for (const f of ['maps.json', 'menus.json', 'missions.json', 'tutorial.json', 'strings.json']) { const d = rd(f); if (d) walk(d, (k, v) => { if ((k === 'icon' || k === 'preview' || k === 'flag') && typeof v === 'string' && v) iconRefs.add(v); }); }
for (const r of iconRefs) if (!A[r]) problems.push(`icon key "${r}" is referenced but not in atlas.json`);
for (const [k, v] of Object.entries(A)) if (!fs.existsSync(path.join(ICONS, v.file))) problems.push(`atlas.json ${k}: file ${v.file} missing`);
// ---- summary table
const cnt = (file, cat) => { const d = rd(file); return d ? order.map(k => d.nations[k] && d.nations[k][cat] ? Object.keys(d.nations[k][cat]).length : 0) : null; };
const cu = cnt('units.json', 'units'), cb = cnt('buildings.json', 'buildings'), cg = cnt('upgrades.json', 'upgrades'), cp = cnt('powers.json', 'powers');
if (cu && !has('quiet')) { console.log('\nnation  units  buildings  upgrades  powers  cameos'); order.forEach((k, i) => console.log(`${k.padEnd(7)} ${String(cu[i]).padStart(5)} ${String(cb[i]).padStart(10)} ${String(cg[i]).padStart(9)} ${String(cp[i]).padStart(7)} ${String(Object.keys(A).filter(q => q.split('/')[1] === k && /^(u|b)\//.test(q)).length).padStart(7)}`)); }
console.log(`\nfiles on disk: ${fs.readdirSync(DATA).filter(f => f.endsWith('.json')).join(', ')}`);
console.log(`icons in atlas.json: ${Object.keys(A).length}  (referenced from data: ${iconRefs.size})`);
if (pageErrors.length) console.log('page errors during the run:', [...new Set(pageErrors)].slice(0, 5));
if (problems.length) { console.log(`VALIDATION FAIL (${problems.length}):\n  ` + problems.slice(0, 30).join('\n  ')); process.exit(1); }
console.log('VALIDATION PASS: every nation has every category, every referenced icon key exists');
