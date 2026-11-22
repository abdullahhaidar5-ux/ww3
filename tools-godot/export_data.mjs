// Lane X2: the OLD GAME EXPORTS ITS OWN CONTENT for the Godot menus and HUD.
// Opens the final JavaScript game (branch js-final: built index.html + src/) in headless Chromium, lets the game build its
// own menus / command bar / cameos, and reads them out as data. Nothing here is typed by hand: every string, number and
// picture comes out of the running page (page.evaluate), so a re-run after a change on js-final gives the same files again.
//
//   git worktree add ../jsfinal js-final          # once: a checkout of the JS game (read-only)
//   node tools-godot/export_data.mjs [--js ../jsfinal] [--only nations,units,icons,maps,menus,missions,strings] [--quiet]
//   node tools-godot/export_data.mjs --check      # no browser: validate the files on disk, print the summary table
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
const CHECK = has('check');   // --check: no browser, only validate what is on disk and print the summary
const ONLY = arg('only', '').split(',').filter(Boolean), want = k => !CHECK && (!ONLY.length || ONLY.includes(k));
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
let browser = null, ctx = null, page = null, ORIGIN = '';
const pageErrors = [];
if (!CHECK) {
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
ORIGIN = 'http://127.0.0.1:' + server.address().port;
browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith('data:') || r.request().url().startsWith('blob:') ? r.continue() : r.abort());
page.on('pageerror', e => pageErrors.push(String(e.message || e).slice(0, 200)));
await page.addInitScript(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} });
log(`JS game: ${JS}  ->  ${ORIGIN}`);
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof FKEYS !== 'undefined' && !!document.getElementById('mx'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
}
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

// ---- shared in-page helpers (installed on every page load): a DOM-to-data serializer and "what is visible" for overlay discovery
const HELPERS = () => {
  window.X2 = {};
  X2.txt = n => (n.textContent || '').replace(/\s+/g, ' ').trim();
  X2.ser = function ser(el) { const out = [];
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) out.push({ t: 'text', text: t }); continue; }
      if (n.nodeType !== 1) continue; const tag = n.tagName.toLowerCase(); if (['script', 'style', 'svg', 'br', 'hr', 'template'].includes(tag)) continue;
      const base = {}; if (n.id) base.id = n.id; if (n.className && typeof n.className === 'string') base.cls = n.className; if (n.title) base.tip = n.title; if (n.hidden || n.style.display === 'none') base.hidden = true;
      for (const a of ['tab', 'k', 'o', 'w', 't', 'v', 'pow']) if (n.dataset && n.dataset[a] != null) base['data_' + a] = n.dataset[a];
      if (tag === 'button') { const sm = n.querySelector(':scope>small'), kb = n.querySelector(':scope>kbd'); let text = X2.txt(n); if (sm) { const s = X2.txt(sm); if (text.endsWith(s)) text = text.slice(0, text.length - s.length).trim(); }
        out.push(Object.assign({ t: 'button', text }, sm ? { small: X2.txt(sm) } : {}, kb ? { key: X2.txt(kb) } : {}, base, n.disabled ? { disabled: true } : {})); continue; }
      if (tag === 'select') { out.push(Object.assign({ t: 'select', value: n.value, options: [...n.options].map(o => ({ value: o.value, text: o.textContent })) }, base)); continue; }
      if (tag === 'input') { const o = { t: 'input', type: n.type }; if (n.type === 'checkbox' || n.type === 'radio') { o.checked = n.checked; if (n.name) o.name = n.name; if (n.value !== 'on') o.value = n.value; } else { o.value = n.value; for (const a of ['min', 'max', 'step', 'placeholder', 'maxlength']) if (n.getAttribute(a) != null) o[a] = n.getAttribute(a); } out.push(Object.assign(o, base)); continue; }
      if (tag === 'textarea') { out.push(Object.assign({ t: 'textarea', placeholder: n.placeholder || '' }, base)); continue; }
      if (tag === 'canvas' || tag === 'img') { out.push(Object.assign({ t: tag, w: n.width, h: n.height }, base, tag === 'img' ? { alt: n.alt || '' } : {})); continue; }
      if (tag === 'a') { out.push(Object.assign({ t: 'link', text: X2.txt(n), href: n.getAttribute('href') || '' }, base)); continue; }
      const kids = ser(n);
      if (/^(h[1-6]|p|label|li|b|i|em|strong|small|span|kbd|td|th|summary|legend|dt|dd)$/.test(tag) && kids.every(k => k.t === 'text')) { const text = X2.txt(n); if (text || base.id) out.push(Object.assign({ t: tag }, text ? { text } : {}, base)); continue; }
      if (/^(p|li|label|td|summary)$/.test(tag) || (tag === 'div' && /\b(label|sv|credits)\b/.test(base.cls || ''))) { const text = X2.txt(n); out.push(Object.assign({ t: tag, text }, base, kids.some(k => k.t !== 'text') ? { c: kids } : {})); continue; }   // a line of text with a link / bold word inside: keep the whole sentence too
      if (!kids.length && !base.id) continue;
      out.push(Object.assign({ t: tag }, base, kids.length ? { c: kids } : {})); }
    return out; };
  X2.vis = () => { const o = []; for (const e of document.querySelectorAll('body>*,#menu>*,#app>*')) { if (/^(SCRIPT|STYLE|CANVAS)$/.test(e.tagName) || e.id === 'mx') continue; const cs = getComputedStyle(e); if (!e.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && e.offsetWidth > 0 && (e.id || e.className)) o.push(e); } return o; };
  X2.wait = ms => new Promise(r => setTimeout(r, ms));
  X2.strings = (tree, set) => { set = set || new Set(); const w = n => { for (const k of ['text', 'small', 'tip', 'placeholder', 'alt']) if (n[k]) set.add(n[k]); if (n.options) for (const o of n.options) set.add(o.text); if (n.c) n.c.forEach(w); }; tree.forEach(w); return set; };
};
const freshPage = async () => { await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 180000 }); await page.waitForFunction(() => typeof startSingle === 'function' && typeof FKEYS !== 'undefined' && !!document.getElementById('mx'), null, { timeout: 120000 }); await page.waitForTimeout(1200); await page.evaluate(HELPERS); };
if (!CHECK) await page.evaluate(HELPERS);
// which src file declares a global table (for the per-table "src" notes)
const SRCFILES = fs.readdirSync(path.join(JS, 'src')).filter(f => f.endsWith('.js')).sort().map(f => [f, fs.readFileSync(path.join(JS, 'src', f), 'utf8')]);
const declIn = name => { const re = new RegExp('(^|[;{}\\s,])(const|let|var|function)\\s+(?:[A-Za-z0-9_$]+\\s*=[^;]*?,\\s*)?' + name.replace(/\$/g, '\\$') + '\\b\\s*[=(]', 'm'); const hit = SRCFILES.find(([f, s]) => new RegExp('^(const|let|var|function)\\s+' + name + '\\b', 'm').test(s)) || SRCFILES.find(([f, s]) => re.test(s)); return hit ? 'src/' + hit[0] : ''; };

// ---- maps.json + the picker's own preview pictures (mapPreview draws them in code)
if (want('maps')) {
  const M = await page.evaluate(() => {
    const clean = o => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'function' ? undefined : v));
    const keys = mapListKeys().slice(), out = { order: keys, maps: {}, img: {}, test_range: keys.filter(k => MAPS[k] && MAPS[k].min <= 2 && MAPS[k].max >= 2 && typeof BM_KEYS !== 'undefined' && BM_KEYS.includes(k)) };
    const kW = WK;
    keys.forEach((k, i) => { const D = MAPS[k], I = D.bm && typeof bmInfo === 'function' ? bmInfo(k) : null; const counts = []; for (let n = D.min; n <= D.max; n++) counts.push(n);
      const world = n => { const s = worldScaleFor(n, k); return { players: n, scale: s, width: Math.round(3200 * s / CELL) * CELL, height: Math.round(2200 * s / CELL) * CELL }; };
      const home = (D.home || []).filter(f => FKEYS.includes(f));
      out.maps[k] = { key: k, order: i, name: D.name, battle_map: !!D.bm, players_min: D.min, players_max: D.max, player_counts: counts, players_text: (D.min === D.max ? D.max : D.min + '–' + D.max) + ' players',
        size: mpSize(k), facts: mapFacts(k), theme: D.theme || '', tag: D.tag || '', symmetry: D.sym || '', description: D.desc || '', home: home, home_text: home.length ? 'Home turf: ' + home.map(f => FACTIONS[f].name).join(' & ') + '.' : '',
        card_text: (D.desc || '') + (home.length ? ' Home turf: ' + home.map(f => FACTIONS[f].name).join(' & ') + '.' : ''), world: [...new Set([D.min, D.max])].map(world), info: I ? clean(I) : null,
        start_slots: clean(D.slots || []), preview: 'map/' + k };
      const cv = document.createElement('canvas'); cv.width = 384; cv.height = 264; try { mapPreview(k, cv); out.img['map/' + k] = cv.toDataURL('image/png'); } catch (e) { out.img['map/' + k] = null; out.maps[k].preview = ''; out.maps[k].preview_error = String(e.message || e); } });
    try { setWorld(kW); } catch (e) {}
    out.conditions = (typeof CONDS !== 'undefined' ? clean(CONDS) : []); out.seasons = typeof SEASONS !== 'undefined' ? SEASONS.slice() : []; out.weather = clean(WEATHER);
    out.difficulty = [...document.querySelectorAll('#diff button')].map(b => ({ text: b.textContent.trim(), value: b.dataset.d != null ? b.dataset.d : '', tip: b.title || '', on: b.classList.contains('on') }));
    return out; });
  for (const [key, url] of Object.entries(M.img)) { if (!url) continue; const rel = `maps/${key.split('/')[1]}.png`; writeFile(rel, pngOf(url)); icon(key, rel, 0, 0, 384, 264); }
  delete M.img;
  writeJSON('maps.json', Object.assign({ _source: src('src/01-data.js + src/02*.js MAPS, src/02d-battlemaps.js BM_KEYS / bmInfo(), src/08-ui.js mapListKeys() (picker order) / mapFacts() / mpSize() / mapPreview() (the 384x264 card picture, drawn in code), src/14-menu.js mxMapCards() (card texts), src/08-ui.js CONDS / SEASONS (Battle options)'),
    _notes: 'order = the one map picker of Battle (5 Battle maps, then every other battlefield). world = map size in sim units for the smallest / largest player count (setWorld). test_range = the maps the Test range window offers. The terrain itself comes from the bridge (map_data()), not from here.' }, M));
  log(`maps.json: ${M.order.length} maps with previews`);
}

// ---- missions.json + tutorial.json (texts are data; the scripting is code, exported as source text for the hand-port)
if (want('missions')) {
  const C = await page.evaluate(() => {
    // every CH.say(<text expression>, <kind>) call of a script, whole argument list (quotes and parentheses matched)
    const strs = fn => { const s = String(fn || ''), out = []; let i = 0; while ((i = s.indexOf('CH.say(', i)) >= 0) { let j = i + 7, d = 1, q = ''; for (; j < s.length && d > 0; j++) { const c = s[j]; if (q) { if (c === '\\') j++; else if (c === q) q = ''; } else if (c === "'" || c === '"' || c === '`') q = c; else if (c === '(') d++; else if (c === ')') d--; } out.push(s.slice(i + 7, j - 1)); i = j; } return out; };
    const missions = CAMPAIGN.map((m, i) => { const o = { key: m.id, order: i, number: m.n, title: m.title, subtitle: m.sub, nation: m.fac, enemy_nation: m.enemy, enemy_name: m.enemyName || '', map: m.map, length_text: m.min || '', briefing: (m.brief || []).slice(), objectives: (m.obj || []).map(([k, t]) => ({ key: k, text: t })), win_text: m.win || '', lose_text: m.lose || '', radio_lines: [...strs(m.setup), ...strs(m.tick)] };
      for (const k of Object.keys(m)) if (!(k in { id: 1, n: 1, title: 1, sub: 1, fac: 1, enemy: 1, enemyName: 1, map: 1, min: 1, brief: 1, obj: 1, win: 1, lose: 1 })) { if (typeof m[k] === 'function') (o.script_js = o.script_js || {})[k] = String(m[k]); else (o.extra = o.extra || {})[k] = JSON.parse(JSON.stringify(m[k])); }
      return o; });
    const tut = TUTB.map((s, i) => { const o = { key: s.k, order: i, text: typeof s.t === 'function' ? s.t() : s.t, action: s.a, action_shown: '▶ ' + s.a, script_js: {} }; for (const k of ['ok', 'hl', 'cam', 'enter']) if (typeof s[k] === 'function') o.script_js[k] = String(s[k]); return o; });
    let tutUi = []; try { const el = tutEl(); tutUi = X2.ser(el); } catch (e) {}
    return { missions, difficulty: CAMP_DIFF.slice(), difficulty_mult: CAMP_MUL.slice(), tut, tutUi, helpers: { CH: Object.keys(CH) } }; });
  writeJSON('missions.json', { _source: src('src/12-campaign.js CAMPAIGN (id, title, sub, fac, enemy, map, brief, obj, win, lose) + CAMP_DIFF / CAMP_MUL'),
    _notes: 'Texts and objective lists are data. The scripted triggers are JavaScript (setup(c) places the forces, tick(c,dt) runs waves / timers / objective checks through the CH helper table): their source is in script_js for the hand-port, and radio_lines are the argument lists of every CH.say(text, kind) call in them, as written in the script (JS string expressions: a quoted text, + a value, + more text).',
    difficulty: C.difficulty, difficulty_mult: C.difficulty_mult, helper_functions: C.helpers.CH, missions: C.missions });
  writeJSON('tutorial.json', { _source: src('src/08b-social.js TUTB (steps: t = text, a = what to do, ok() = done when true, hl() = what to highlight, cam() = where to look, enter() = on entering the step) + tutEl() (the step box) / startBattleTutorial()'),
    _notes: 'Step texts are data; ok / hl / cam / enter are small JS functions (source in script_js). The step header is "Step i/n"; the box has Show me / Skip step / Exit tutorial.', header_format: 'Step {i}/{n}', box: C.tutUi, steps: C.tut });
  log(`missions.json: ${C.missions.length} missions · tutorial.json: ${C.tut.length} steps`);
}

// ---- menus.json: the menu the game builds (src/14-menu.js mxBuild) read back screen by screen, button actions recorded by
//      calling each button's own handler with menuGo / click stubbed, then every window those buttons open is opened for real.
if (want('menus')) {
  const S = await page.evaluate(async () => {
    const out = { steps: MX_STEPS.map(([id, name]) => ({ screen: id, name })), titles: Object.assign({}, MX_TITLES), screens: {}, actions: {} };
    const go = async f => { f(); await X2.wait(650); };
    const snap = id => { out.screens[id] = { key: id, window_title: MX_TITLES[id] || '', crumb: X2.txt(document.getElementById('mxcrumb') || document.body.appendChild(document.createElement('i'))), back: id === 'title' ? '' : X2.txt(document.querySelector('#mxtop .mxback') || {}), nodes: X2.ser(MX.screens[id]) }; };
    snap('title');
    await go(() => menuGo('single')); snap('single');
    await go(() => { mxMapSync(); menuGo('c-map'); }); await X2.wait(400); snap('c-map');
    await go(() => menuGo('c-nation')); snap('c-nation');
    await go(() => menuGo('c-players')); snap('c-players');
    await go(() => menuGo('c-opts')); snap('c-opts');
    await go(() => menuHome()); await go(() => mxOnline()); snap('online');
    await go(() => menuHome()); await go(() => mxTrOpen(false)); snap('t-range');
    await go(() => menuHome()); await go(() => menuGo('extras')); snap('extras');
    await go(() => menuHome()); await go(() => menuGo('credits')); snap('credits');
    await go(() => menuHome());
    // record what each menu button does
    const rec = []; const keep = { menuGo, menuBack, menuHome, mxTrOpen, mxTick, mxMapSync, mxMapMark, click: HTMLElement.prototype.click };
    menuGo = id => rec.push({ do: 'go', screen: id }); menuBack = () => rec.push({ do: 'back' }); mxTrOpen = () => rec.push({ do: 'go', screen: 't-range' }); mxTick = () => {}; mxMapSync = () => {}; mxMapMark = () => {};
    HTMLElement.prototype.click = function () { rec.push({ do: 'click', id: this.id || '', text: X2.txt(this).slice(0, 60) }); };
    for (const id of Object.keys(MX.screens)) { const list = []; for (const b of MX.screens[id].querySelectorAll('button.mxi,button.mxgo,button.mxlink,button.mxplus')) { if (typeof b.onclick !== 'function') continue; rec.length = 0; try { b.onclick({}); } catch (e) { rec.push({ do: 'error', text: String(e.message || e) }); }
        const sm = b.querySelector('small'); let text = X2.txt(b); if (sm && text.endsWith(X2.txt(sm))) text = text.slice(0, text.length - X2.txt(sm).length).trim(); list.push({ text, small: sm ? X2.txt(sm) : '', tip: b.title || '', id: b.id || '', hidden: !!b.hidden, does: rec.slice() }); }
      out.actions[id] = list; }
    Object.assign(window, {}); menuGo = keep.menuGo; menuBack = keep.menuBack; mxTrOpen = keep.mxTrOpen; mxTick = keep.mxTick; mxMapSync = keep.mxMapSync; mxMapMark = keep.mxMapMark; HTMLElement.prototype.click = keep.click;
    out.legacy_buttons = [...document.querySelectorAll('#menu button')].filter(b => !b.closest('#mx') && b.id).map(b => ({ id: b.id, text: X2.txt(b) }));
    out.setup_defaults = JSON.parse(JSON.stringify(setup)); out.settings_defaults = JSON.parse(JSON.stringify(SET));
    return out; });
  // credits as plain paragraphs (every asset credit)
  const cred = (S.screens.credits.nodes.find(n => /mxcred/.test(n.cls || '')) || {}).c || [];
  const credits = { heading: (S.screens.credits.nodes.find(n => n.t === 'h2') || {}).text || 'Credits', sub: (S.screens.credits.nodes.find(n => n.t === 'p') || {}).text || '', paragraphs: cred.map(p => ({ text: p.text || '', links: (p.c || []).filter(k => k.t === 'link').map(k => ({ text: k.text, href: k.href })) })) };
  // the windows the menu buttons open: click the real (hidden) button on a fresh page, read whatever became visible
  const OPEN = [['settings', 'id', 'openSettings'], ['missions', 'id', 'campaign'], ['load_game', 'id', 'svLoadBtn'], ['my_battles', 'id', 'openMyb'], ['encyclopedia', 'id', 'openEnc'], ['map_editor', 'id', 'edBtn'], ['medals', 'text', 'medals'], ['profile', 'text', 'profile'], ['whats_new', 'text', "what's new"]];   // Settings > "Report a problem" (rpMenu, src/08k-report.js) opens no window: it builds an error report to copy
  const overlays = {};
  for (const [name, by, key] of OPEN) {
    await freshPage();
    const r = await page.evaluate(async ({ by, key }) => {
      const before = new Set(X2.vis());
      const b = by === 'id' ? document.getElementById(key) : [...document.querySelectorAll('#menu .card button')].find(x => X2.txt(x).toLowerCase().replace(/’/g, "'") === key);
      if (!b) return { err: 'no button ' + key };
      try { b.click(); } catch (e) { return { err: String(e.message || e) }; }
      await X2.wait(1200);
      const now = X2.vis().filter(e => !before.has(e));
      const res = { button: { id: b.id || '', text: X2.txt(b) }, roots: now.map(e => ({ id: e.id || '', cls: typeof e.className === 'string' ? e.className : '', nodes: X2.ser(e) })) };
      if (key === 'openSettings') {   // Settings: every tab clicked, every option paired with its label
        const body = document.getElementById('setBody') || document.getElementById('settings'), tabs = [...body.querySelectorAll('.uk-tabs .uk-tab')], panes = [...body.querySelectorAll('.uk-pane')];
        res.tabs = tabs.map((t, i) => { const pane = panes[i], opts = []; let label = '';
          const push = (el, o) => { opts.push(Object.assign({ id: el.id || '', label }, o, el.title ? { tip: el.title } : {})); label = ''; };
          if (pane) for (const el of pane.querySelectorAll('.label,.seg,select,input,button:not(.seg button),.sv,textarea')) {
            if (el.closest('.seg') && !el.classList.contains('seg')) continue;
            if (el.classList.contains('label')) { if (label) opts.push({ id: '', label, type: 'text' }); label = X2.txt(el); continue; }
            if (el.classList.contains('sv')) { opts.push({ id: el.id || '', type: 'note', text: el.id === 'sndSt' ? '' : X2.txt(el), live: el.id === 'sndSt' }); continue; }   /* sndSt = live audio-engine status line, differs per machine */
            if (el.classList.contains('seg')) { const bs = [...el.querySelectorAll('button')]; push(el, { type: 'choice', choices: bs.map(x => ({ text: X2.txt(x), value: x.dataset.v != null ? x.dataset.v : x.dataset.k != null ? x.dataset.k : '', disabled: !!x.disabled, tip: x.title || '' })), default: (bs.find(x => x.classList.contains('on')) ? X2.txt(bs.find(x => x.classList.contains('on'))) : '') }); continue; }
            if (el.tagName === 'SELECT') { push(el, { type: 'select', choices: [...el.options].map(o => ({ text: o.textContent, value: o.value })), default: el.value }); continue; }
            if (el.tagName === 'INPUT') { push(el, el.type === 'range' ? { type: 'slider', min: +el.min, max: +el.max, step: +el.step || 1, default: +el.value } : el.type === 'checkbox' ? { type: 'toggle', default: el.checked } : { type: el.type, default: el.value, placeholder: el.placeholder || '' }); continue; }
            if (el.tagName === 'BUTTON') { opts.push({ id: el.id || '', type: 'button', text: X2.txt(el), label, tip: el.title || '' }); label = ''; continue; }
          }
          if (label) opts.push({ id: '', label, type: 'text' });
          return { name: X2.txt(t), options: opts }; });
        res.footer = [...body.querySelectorAll(':scope>button,:scope>.row button')].map(x => ({ id: x.id || '', text: X2.txt(x) }));
        try { if (typeof kbuOpen === 'function') { kbuOpen(); await X2.wait(500); const kb = X2.vis().filter(e => !before.has(e) && !now.includes(e)); res.keyboard_window = kb.map(e => ({ id: e.id || '', nodes: X2.ser(e) })); } } catch (e) {}
      }
      if (key === 'openEnc') { try { res.entries = encEntries().length; res.types = ENC_TYPES; } catch (e) {} }
      return res; }, { by, key });
    overlays[name] = r;
  }
  await freshPage();
  const allStr = new Set(); for (const s of Object.values(S.screens)) for (const n of s.nodes) { const w = q => { for (const k of ['text', 'small', 'tip', 'placeholder']) if (q[k]) allStr.add(q[k]); if (q.c) q.c.forEach(w); }; w(n); }
  writeJSON('menus.json', { _source: src('src/14-menu.js mxBuild() / MX_STEPS / MX_TITLES (the menu screens: title, Play, Battle steps Map > Nation > Players > Options, Multiplayer, Test range, Extras, Credits), index.html #menu .card (the hidden legacy buttons the menu items click, the credits paragraphs), src/08-ui.js openSettings() + src/08j-uikit.js setTabs() + src/08m-controls.js (Settings), src/12-campaign.js campMenu() (Missions), src/08d-save.js (Load game), src/08f-encyclopedia.js, src/08i-hud.js WHATS_NEW'),
    _notes: 'screens[id].nodes = the screen read back from the page as a tree (t = button / select / input / h2 / p / text / div..., c = children, tip = hover text, hidden = not shown). actions[id] = what each menu button of that screen does: {do:"go",screen} = slide to that screen, {do:"click",id} = presses the legacy button with that id (see legacy_buttons, and overlays for the window it opens), {do:"back"}. flow = the same as one readable tree. overlays.settings.tabs = every Settings option with type, choices and default.',
    flow: { top: S.actions.title.filter(a => !a.hidden || a.text).map(a => ({ text: a.text, tip: a.tip, does: a.does })), play: S.actions.single, battle_steps: S.steps, extras: S.actions.extras },
    steps: S.steps, titles: S.titles, screens: S.screens, actions: S.actions, legacy_buttons: S.legacy_buttons, overlays, credits, setup_defaults: S.setup_defaults, settings_defaults: S.settings_defaults, string_count: allStr.size });
  log(`menus.json: ${Object.keys(S.screens).length} screens, ${Object.keys(overlays).length} windows (${Object.entries(overlays).map(([k, v]) => k + ':' + (v.err ? 'ERR ' + v.err : (v.roots || []).map(r => r.id || r.cls).join('+') || 'nothing')).join(', ')}), ${credits.paragraphs.length} credit paragraphs, settings tabs: ${((overlays.settings || {}).tabs || []).map(t => t.name + ' ' + t.options.length).join(' / ')}`);
}

// ---- strings.json part 1: the plain text tables of the HUD (read whole; each says which file declares it)
let STR = null;
if (want('strings')) {
  const NAMES = ['KEYTAB', 'KB_FIXED', 'LOAD_TIPS', 'LOAD_QUOTES', 'ANN_TXT', 'ANN_RE', 'ANN_MIN', 'RADCLS', 'RAD_KIND', 'EDGE_K', 'EDGE_PR', 'FH_TEXT', 'WHATS_NEW', 'VET', 'MOR_TXT', 'MOR_COL', 'STANCES', 'SPY_LBL', 'HAB', 'UNOTE', 'ENC_TYPES', 'ENC_NOTE', 'ENC_BNOTE', 'ENC_BCOUNTER', 'ENC_ARM', 'TB', 'WEATHER', 'SEASONS', 'CONDS', 'MSTYLES', 'RANKS', 'POWLV', 'POWCOST', 'POW_KEY', 'SW_NAME', 'MILNAME', 'COASTN', 'MDN', 'GENN', 'DOCT', 'CT_FORMS', 'CT_GN', 'ORD_O', 'HL_PRI', 'PH_LOOKS', 'MPRE', 'ID_EMB', 'CAMP_DIFF', 'LD_TIPS', 'LDS', 'HD_KEYS', 'MATCH_WIN', 'ID_COLS', 'ID_CB', 'ID_EMB', 'ID_EMBN', 'ID_SEG', 'ID_MEDALS', 'ID_ROLE', 'GDOC', 'DIFF', 'CAMP_MUL', 'PCD', 'SIG', 'HERO_RANK', 'SPEC_RANK', 'HERO_CD', 'HERO_REBUY'];
  STR = await page.evaluate((NAMES) => {
    const out = { tables: {}, missing: [] }, J = v => JSON.parse(JSON.stringify(v, (k, x) => typeof x === 'function' ? '[function] ' + String(x).slice(0, 400) : x instanceof RegExp ? { regex: x.source, flags: x.flags } : x));
    for (const n of NAMES) { try { const v = (0, eval)(n); if (v === undefined) throw 0; out.tables[n] = J(v); } catch (e) { out.missing.push(n); } }
    try { out.tables.CF_LINES = J(CF.LINES); } catch (e) {}
    try { out.keys = KEYTAB.map(r => Object.assign({}, r, r.id ? { key: (KB.cur[r.id] || r.def || ''), shown: kbShow(KB.cur[r.id] || r.def || '') } : {})); } catch (e) { out.keys = []; }
    try { const cur = {}; for (const k of Object.keys(CURD)) { curCss(k); cur[k] = { hot: [CURD[k][0], CURD[k][1]], fallback: CURD[k][2], png: CURIMG[k] || null }; } out.cursors = cur; } catch (e) { out.cursors = {}; }
    return out; }, NAMES);
  for (const [k, v] of Object.entries(STR.cursors)) { if (!v.png) continue; writeFile(`cursors/${k}.png`, pngOf(v.png)); icon('cursor/' + k, `cursors/${k}.png`, 0, 0, 32, 32, { hot: v.hot }); v.icon = 'cursor/' + k; delete v.png; }
  STR.table_src = {}; for (const n of Object.keys(STR.tables)) STR.table_src[n] = n === 'CF_LINES' ? declIn('CF') : declIn(n);
  // static harvest: every report line the simulation can write to the radio log (log(team, `text`, kind)); the Godot build gets
  // these at run time from the bridge's "log" events, this list is for the announcer / voice mapping and for review
  const tpl = []; for (const [f, s] of SRCFILES) { if (!/^0[1-3]/.test(f)) continue; const re = /\blog\(\s*[^,()]+(?:\([^()]*\))?\s*,\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*(?:,\s*'([a-z_A-Z]*)')?/g; let m; while ((m = re.exec(s))) tpl.push({ text: m[1].slice(1, -1).replace(/\\'/g, "'"), kind: m[2] || '', src: 'src/' + f }); }
  const seen = new Set(); STR.log_templates = tpl.filter(t => !seen.has(t.text) && seen.add(t.text));
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

// ---- strings.json part 2 (in the paused Battle): the HUD read back, what the selection card and the order buttons say for
//      every unit of every nation (each one is spawned, selected and removed again), mode-line texts, pause menu, end screen
if (want('strings') && STR) {
  await page.evaluate(HELPERS);
  const H = await page.evaluate(async () => {
    const T = G.teams[ME], keep = { fac: T.fac, F: T.F, sup: T.sup, color: T.color }, out = { hud: {}, orders: { buttons: {}, by_nation: {} }, selection: {}, buildings: {}, mode_line: {}, windows: {} };
    const hq = G.ents.find(e => e.isB && e.team === ME && e.kind === 'hq') || { x: MAPW / 2, y: MAPH / 2 };
    const tree = () => { const o = {}; for (const e of X2.vis()) { if (e.id === 'menu' || e.id === 'stage') continue; o[e.id || e.className] = X2.ser(e); } return o; };
    G.sel = []; updateUI(); out.hud.nothing_selected = tree();
    out.hud.tabs = [...document.querySelectorAll('.tabs button')].map(b => ({ tab: b.dataset.tab, text: X2.txt(b), tip: b.title || '' }));
    const info = () => { const el = document.getElementById('info'); const b = el.querySelector('b'), tip = el.querySelector('.tip');
      const btns = [...el.querySelectorAll('.orddock button, .cmdrow button')].filter((x, i, a) => a.indexOf(x) === i).map(x => { const kb = x.querySelector('kbd'); let label = X2.txt(x); if (kb) { const k = X2.txt(kb); if (label.endsWith(k)) label = label.slice(0, label.length - k.length).trim(); }
        const row = x.closest('.cmdrow'); return { label, key: kb ? X2.txt(kb) : '', icon: x.dataset.o ? 'svg/' + x.dataset.o : '', tip: x.title || '', disabled: !!x.disabled, row: row ? (row.classList.contains('tact') ? 'tactics' : row.classList.contains('lgr') ? 'logistics' : 'orders') : '' }; });
      return { title: b ? X2.txt(b) : '', tip: tip ? X2.txt(tip) : '', morale: X2.txt(el.querySelector('.morale .mt') || {}), buttons: btns }; };
    const bid = b => (b.row || 'o') + ':' + b.label + (b.key ? ' [' + b.key + ']' : '');
    for (const f of FKEYS) { const F = FACTIONS[f]; T.fac = f; T.F = F; T.color = F.color; try { T.sup = swSup(f); } catch (e) {} buildPanels();
      const per = {}, selc = {};
      for (const k of [...new Set(allUnits(f))]) { let u = null; try { u = addUnit(ME, k, hq.x + 160, hq.y + 160); } catch (e) {} if (!u) continue;
        try { G.sel = [u]; updateUI(); const I = info(); per[k] = I.buttons.map(b => { const id = bid(b), o = out.orders.buttons[id]; if (!o || (o.from_disabled && !b.disabled)) out.orders.buttons[id] = Object.assign({ label: b.label, key: b.key, icon: b.icon, tip: b.tip, row: b.row }, b.disabled ? { from_disabled: true, disabled_tip: b.tip } : o && o.disabled_tip ? { disabled_tip: o.disabled_tip } : {}); return b.disabled ? id + ' (off)' : id; }); selc[k] = { title: I.title, tip: I.tip, morale: I.morale }; } catch (e) { per[k] = ['ERR ' + e.message]; }
        G.sel = []; u.dead = true; const i = G.ents.indexOf(u); if (i >= 0) G.ents.splice(i, 1); }
      out.orders.by_nation[f] = per; out.selection[f] = selc;
      // own buildings of this nation: the card text and the buttons the bar offers
      const bl = {}; for (const k of Object.keys(STRUCT)) { if (k === 'garrison') continue; let b = null; try { if (!bldAllowed(f, k) && k !== 'hq') continue; b = addBld(ME, k, hq.x - 260, hq.y + 260, 1); } catch (e) {} if (!b) continue;
        try { b.built = 1; G.sel = [b]; updateUI(); const I = info(), pn = document.getElementById('panel'); bl[k] = { title: I.title, tip: I.tip, bar: [...pn.querySelectorAll(':scope>.btn')].filter(x => !x.hidden && x.style.display !== 'none').map(x => x.id).filter(Boolean) }; } catch (e) { bl[k] = { err: String(e.message || e) }; }
        G.sel = []; b.dead = true; const i = G.ents.indexOf(b); if (i >= 0) G.ents.splice(i, 1); G.bdirty = true; }
      out.buildings[f] = bl; }
    Object.assign(T, keep); buildPanels(); G.sel = []; updateUI();
    // Sell / Repair / Launch buttons (built by zhCtx when a building is selected)
    try { const b = hq; G.sel = [b]; updateUI(); out.hud.building_selected = { sell: { label: X2.txt(document.querySelector('#zhSell .n') || {}), desc: (document.getElementById('zhSell') || { dataset: {} }).dataset.desc || '', icon: 'svg/sell' }, repair: { label: X2.txt(document.querySelector('#zhRep .n') || {}), desc: (document.getElementById('zhRep') || { dataset: {} }).dataset.desc || '', icon: 'svg/wrench' }, launch: { label: X2.txt(document.querySelector('#zhLaunch .n') || {}), desc: (document.getElementById('zhLaunch') || { dataset: {} }).dataset.desc || '', icon: 'svg/rocket' } }; G.sel = []; updateUI(); } catch (e) {}
    // the one-line mode text under the cursor state
    const md = () => { const m = document.getElementById('mode'); return m.hidden ? '' : (m.textContent || m.dataset.d || ''); };
    const st = { place: G.place, aim: G.aim, amove: G.amove, defm: G.defm };
    try { const dz = G.ents.find(e => !e.isB && !e.dead && e.team === ME && e.kind === 'dozer'); if (dz) G.sel = [dz]; G.place = 'barracks'; updateUI(); out.mode_line.place = md(); G.place = 'shipyard'; updateUI(); out.mode_line.place_shore = md(); G.place = null; G.aim = 'sup'; updateUI(); out.mode_line.aim_strike = md(); G.aim = 'recon'; updateUI(); out.mode_line.aim_power = md(); G.aim = null; G.amove = true; updateUI(); out.mode_line.attack_move = md(); G.amove = false; G.defm = true; updateUI(); out.mode_line.guard = md(); } catch (e) { out.mode_line.err = String(e.message || e); }
    Object.assign(G, st); G.sel = []; updateUI();
    // minimap marks and profile emblems: tiny shapes the game draws in code, captured one by one
    out.marks = {}; const mk = (key, w, h, fn) => { try { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); out.marks[key] = { png: c.toDataURL('image/png'), w, h }; } catch (e) {} };
    for (const k of Object.keys(TB)) mk('mm/tech_' + k, 16, 16, c => tbMini(c, 8, 8, { tb: k, owner: -1 }));
    for (let i = 0; i < 8; i++) { mk('mm/team' + i, 12, 12, c => idMiniMark(c, 6, 6, i, 0)); mk('mm/team' + i + '_big', 12, 12, c => idMiniMark(c, 6, 6, i, 1)); }
    for (const k of ID_EMB) if (k !== 'flag') mk('idemb/' + k, 64, 64, c => idDrawEmb(c, k, 32, 32, 26, '#ffffff'));
    // General window (★): powers list as the game lays it out
    try { ZH.star = true; zhPowWin(); out.windows.general = X2.ser(document.getElementById('zhPow')); ZH.star = false; zhPowWin(); } catch (e) {}
    // minimap as drawn right now (reference picture for the hand-port of drawMini)
    try { drawMini(); out.minimap = document.getElementById('mm').toDataURL('image/png'); out.minimap_size = [mm.width, mm.height]; } catch (e) {}
    // pause menu
    try { const before = new Set(X2.vis()); G.paused = false; togglePause(true); await X2.wait(300); out.windows.pause = X2.vis().filter(e => !before.has(e)).map(e => ({ id: e.id || '', nodes: X2.ser(e) })); if (!out.windows.pause.length) out.windows.pause = [{ id: 'pauseOv', nodes: X2.ser(document.getElementById('pauseOv')) }];
      try { const q = document.getElementById('quitOv'); if (q) out.windows.quit_confirm = X2.ser(q); } catch (e) {}
      togglePause(false); G.paused = true; } catch (e) { out.windows.pause_err = String(e.message || e); }
    // end screen: victory, then defeat (last: the battle is over after this)
    try { showEnd(ME, ''); await X2.wait(300); const e1 = document.getElementById('end'); out.windows.end_victory = e1 ? X2.ser(e1) : []; showEnd(ME === 0 ? 1 : 0, ''); await X2.wait(300); out.windows.end_defeat = e1 ? X2.ser(e1) : []; } catch (e) { out.windows.end_err = String(e.message || e); }
    return out; });
  for (const [key, v] of Object.entries(H.marks || {})) { const rel = key.replace('/', '/') + '.png'; writeFile(rel, pngOf(v.png)); icon(key, rel, 0, 0, v.w, v.h); }
  H.marks = Object.keys(H.marks || {});
  if (H.minimap) { writeFile('ref/minimap_battle.png', pngOf(H.minimap)); icon('ref/minimap_battle', 'ref/minimap_battle.png', 0, 0, H.minimap_size[0], H.minimap_size[1]); delete H.minimap; }
  const tables = {}; for (const n of Object.keys(STR.tables)) tables[n] = { src: STR.table_src[n] || '', value: STR.tables[n] };
  writeJSON('strings.json', { _source: src('tables: the named constants of src/*.js (each entry says its file); keys: src/06z-keys.js KEYTAB + KB.cur; cursors: src/08-ui.js CURD / curCss(); log_templates: every log(team, text, kind) call in src/01-03*.js (the simulation); hud / orders / selection / buildings / mode_line / windows: read from the page in a running Battle (src/08-ui.js updateUI() / ordDock() / showEnd() / togglePause(), src/08o-zhbar.js zhCtx() / zhPowWin(), src/08c-tactui.js tactRow())'),
    _notes: 'keys = the one key table (Settings > Controls): rows with id can be rebound, key = default, fix = fixed keys. orders.by_nation[nation][unit] = the order buttons shown with that unit selected ("(off)" = shown disabled); orders.buttons = each distinct button (label, hotkey, icon, hover text). selection = name line and tip of the selected-unit card. buildings[nation][kind].bar = the command buttons shown with that building selected (u_ = train, g_ = upgrade, zhSell / zhRep / zhLaunch). log_templates: ${...} pieces are filled by the sim; the Godot build receives the finished lines from the bridge. windows.end_* / pause = those windows as trees (same node format as menus.json).',
    keys: STR.keys, key_fixed_scroll: STR.tables.KB_FIXED || '', cursors: STR.cursors, tables, tables_missing: STR.missing, log_templates: STR.log_templates,
    hud: H.hud, orders: H.orders, selection: H.selection, buildings: H.buildings, mode_line: H.mode_line, windows: H.windows, mark_icons: H.marks });
  log(`strings.json: ${Object.keys(tables).length} tables, ${STR.keys.length} key rows, ${Object.keys(STR.cursors).length} cursors, ${STR.log_templates.length} report lines, ${Object.keys(H.orders.buttons).length} distinct order buttons, windows: ${Object.keys(H.windows).join(' ')}`);
}

// ============================================================================================== write the icon index, validate, summary
if (Object.keys(ATLAS.icons).length) {
  // a partial run (--only) keeps the keys of the last full run that it did not redo
  const ap = path.join(ICONS, 'atlas.json'); if (ONLY.length && fs.existsSync(ap)) { try { const old = JSON.parse(fs.readFileSync(ap, 'utf8')).icons || {}; for (const k in old) if (!ATLAS.icons[k] && fs.existsSync(path.join(ICONS, old[k].file))) ATLAS.icons[k] = old[k]; } catch (e) {} }
  const sorted = {}; for (const k of Object.keys(ATLAS.icons).sort()) sorted[k] = ATLAS.icons[k]; ATLAS.icons = sorted; ATLAS.count = Object.keys(sorted).length;
  const s = JSON.stringify(ATLAS, null, 1) + '\n'; fs.writeFileSync(ap, s); written['godot/ui/icons/atlas.json'] = s.length;
}
if (!CHECK) { await browser.close(); server.close(); }

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
for (const f of ['maps.json', 'menus.json', 'missions.json', 'tutorial.json', 'strings.json']) { const d = rd(f); if (d) walk(d, (k, v) => { if (typeof v === 'string' && /^(u|b|svg|pow|map|flag|emblem|cursor|mm|idemb|ref)\/[A-Za-z0-9_\/-]+$/.test(v)) iconRefs.add(v); }); }   // every string anywhere that has the shape of an icon key
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
