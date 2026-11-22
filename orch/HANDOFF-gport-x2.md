# HANDOFF lane X2 — data + text + icon export (branch `orch/gport-x2`)

The old JavaScript game **exports its own content**: `tools-godot/export_data.mjs` opens the final JS game (branch `js-final`)
in headless Chromium, lets the game build its own menus, command bar and pictures, and reads them out as JSON + PNG for the
Godot menus and HUD. Nothing is typed by hand; a re-run gives the same files again.

## Re-run

```
git worktree add ../jsfinal js-final                 # once: a checkout of the JS game (read-only)
node tools-godot/export_data.mjs                     # everything, about 5 minutes (one Battle is started in software WebGL)
node tools-godot/export_data.mjs --js <dir>          # another checkout of the JS game (or env WW3_JS)
node tools-godot/export_data.mjs --only maps,menus   # parts: nations, units, icons, maps, menus, missions, strings
```
Needs Node 22 + Playwright's Chromium (already in the cloud image). The script serves the JS game itself (no outside
network), ends with a per-nation table and `VALIDATION PASS` / `VALIDATION FAIL` (exit code 1): 22 nations, every nation has
units / buildings / upgrades / powers, every icon key used in the data exists in `atlas.json`, every atlas file exists.

## Status (2026-11-22, wrapped up early on ORCH's call to save usage)

- Done and pushed: every file in the table below, from one full run that ended `VALIDATION PASS`
  (`node tools-godot/export_data.mjs --check` re-checks the files on disk without a browser).
- Repeatability: nations / units / buildings / upgrades / powers JSON and all 22 cameo sheets came out byte-identical in
  three full runs. The repeat run for maps / menus / missions / tutorial / strings was stopped part-way (no file it had
  rewritten differed); a full second run of those is **not proven yet**.
- Looked at by eye: cameo sheet (IR), flags + emblems, the 91 button icons, one map preview. Not looked at: cursors,
  minimap marks, profile emblems, the other 34 map previews.

## Next steps (exact)

1. `node tools-godot/export_data.mjs` once more, then `git status`: no changed file = the whole export is repeatable. If
   `menus.json` or `strings.json` differ, the cause is live text (network status on the Multiplayer screen, clock on the
   end screen): blank it the way `sndSt` is blanked in the Settings scrape.
2. Interface lane: build the nation picker from `nations.json`, the map picker from `maps.json` + `map/<key>` previews, the
   command bar from `units.json` / `buildings.json` / `upgrades.json` / `powers.json` + `atlas.json`, Settings from
   `menus.json overlays.settings.tabs`, the key screen from `strings.json keys`.
3. Set the import of `godot/ui/icons/cameos/*.png` to Lossy before the web export (23 MB of PNG otherwise).
4. Hand-port the code-only parts listed at the end of this file.
5. Open choice for ORCH: transparent unit portraits (208x160, `UK.icon`) were left out to keep the size down; one more
   loop in the "icons" section of the script adds them if the selection card needs them.

## Files (all new; nothing existing was edited)

| File | What | Count |
|---|---|---|
| `godot/data/ui/nations.json` | the 22 nations in picker order: name, group (S/W/E/R), colour, morale style + text, picker card texts, doctrine, special unit, signature upgrade, Strike, national power, signature assets, leader (Ayatollah / Dear Leader: passive, ability, ultimate), tunnels / no air / no ships, home maps, loading quotes, flag, emblem | 22 nations, 4 morale styles, 2 leaders |
| `godot/data/ui/units.json` | per nation, in command-bar order: name, cost, build time, where built, group header, General-rank lock, limit, pop, description, note, tooltip as shown, stats, encyclopedia card rows, beats / weak to, icon key | 565 (20-29 per nation) |
| `godot/data/ui/buildings.json` | per nation: the dozer's Build list in order + other structures: name, cost, time, prerequisite, power, limit, shore, tooltip, what it trains, which upgrades it researches, card rows, icon key | 352 (16 per nation, 15 in the Build list) |
| `godot/data/ui/upgrades.json` | per nation: name, cost, time, building, effect text, effect numbers, signature star, icon key | 216 |
| `godot/data/ui/powers.json` | per nation: generals' powers (name, text, point costs per level, level texts, cooldown, hotkey, icons) + the Strike | 180 + 22 strikes |
| `godot/data/ui/maps.json` | the 35 maps of the Battle picker in order: name, players, size, facts line, description, home turf, world size, start slots, preview key; Battle options (conditions, seasons, weather), difficulty buttons | 35 |
| `godot/data/ui/menus.json` | the whole menu as trees: 10 screens (title, Play, Battle Map > Nation > Players > Options, Multiplayer, Test range, Extras, Credits), what every menu button does (`actions`, `flow`), 9 windows they open (Settings with every option / type / choices / default in 4 tabs + the keyboard window, Missions, Load game, My battles, Encyclopedia, Map editor, Medals, Profile, What's new), credits paragraphs | 10 screens, 9 windows, 51 settings rows, 9 credit paragraphs |
| `godot/data/ui/missions.json` | 6 story missions: title, subtitle, nations, map, briefing, objectives, win / lose text, radio lines, script source | 6 |
| `godot/data/ui/tutorial.json` | 7 tutorial steps: text, action line, completion / highlight / camera functions (source), the step box | 7 |
| `godot/data/ui/strings.json` | key table (31 rows, default keys), 19 cursors, ~70 named text tables (announcer lines, radio classes, edge alerts, first hints, what's new, morale words, ranks, encyclopedia notes, profile colours / emblems / medals, loading tips and quotes...), 169 report-line templates of the sim, order buttons per unit per nation, selection-card texts, per-building command lists, mode-line texts, HUD / General window / pause / quit / end screen as trees | see file |
| `godot/ui/icons/atlas.json` | index: icon key -> `{file, x, y, w, h}` | ~1,580 keys |
| `godot/ui/icons/cameos/<NATION>.png` | command-bar pictures, 144x112 each, 10 per row with a 2 px gap: keys `u/<NATION>/<unit>`, `b/<NATION>/<building>`; `_neutral.png` = derrick, houses, capturable buildings (`b/_/<kind>`) | 22 sheets x 62 + 7 |
| `godot/ui/icons/flags/*.png`, `emblems/*.png` | flags 120x72 (`flag/<NATION>`), emblems 128x128 for RS / DW / RV (`emblem/<NATION>`) | 22 + 3 |
| `godot/ui/icons/svg/*.svg + .png` | the one button-icon table (orders, upgrades, powers, HUD buttons), PNG 96x96 + the original SVG (`svg/<name>`) | 82 |
| `godot/ui/icons/pow/*.svg + .png` | power-rail glyphs 60x60 (`pow/<power>`) | 9 |
| `godot/ui/icons/maps/*.png` | map picker previews 384x264 (`map/<key>`) | 35 |
| `godot/ui/icons/cursors/*.png` | mouse cursors 32x32 with hotspot in atlas.json (`cursor/<name>`) | 19 |
| `godot/ui/icons/mm/*.png`, `idemb/*.png`, `ref/minimap_battle.png` | minimap marks (tech buildings, colour-blind team shapes), profile emblems 64x64, one minimap frame as reference | 20 + 10 + 1 |

How captured: every picture is drawn by the game's own code in the page and read with `canvas.toDataURL` at its native size
(cameos: `UK.drawUnit` / `UK.drawBld`, the same call a command button makes; flags `flagTex`; previews `mapPreview`; cursors
`curCss`); the SVG button icons come from the `ICON_SVG` / `QPIC` tables and are rasterised in Chromium.

## How to use it (Interface lane)

- Build / train / upgrade grids: `units.json.nations[N].order` and `.production[building]`, `buildings.json.nations[N].order`,
  group headers in `group`. Picture: look the `icon` key up in `atlas.json` and cut the region (AtlasTexture).
- **Live numbers during a battle come from the bridge** (`sim.rules(nation)`, `sim.teams`, `sim.prod`): costs here are the
  start-of-battle values for menus, tooltips and the encyclopedia. Texts, order, groups, icons are only here.
- `tip` / `cost_text` are what the JS bar shows at the start of a Battle (General rank 1, only the Command HQ built):
  "Requires Barracks." disappears once the building stands; a rank-locked unit shows "General rank N" instead of its price.
- Menu trees: `t` = node type (button / select / input / h2 / p / text / div ...), `c` = children, `tip` = hover text,
  `hidden` = not shown at that moment. `menus.json.flow` is the short readable version of the top level.
- Cameo sheets are 23 MB of PNG. In Godot set their import to **Lossy** (or VRAM compressed) so the web download stays small;
  the stripe on each cameo is the nation's colour (a player with a custom Profile colour gets that colour in the JS game).

## What could NOT be exported as data (lives only in code — hand-port)

Command bar (`src/08-ui.js updateUI`, `src/08o-zhbar.js zhCtx`, `src/08o-prodq.js`)
- Which grid shows for which selection: dozer = Build list; a production building = only the units it trains + its own
  upgrades + Sell / Repair; another own building = its upgrades + Sell / Repair; nothing = the hint line. (`strings.json
  buildings[N][kind].bar` lists the result per building; the rule is code.)
- Enabled / disabled per button: money, prerequisite built (`reqMet`), `limit` reached ("Max N"), General-rank lock, leader
  re-buy wait ("Wait m:ss"), upgrade states ("Researched", "Researching…"), the clock sweep while building, the ×N queue count.
- Per-building queue: click adds one, Shift+click adds 5, right-click cancels one; rally point by clicking ground.
- Sell = two clicks within 3 s ("Confirm?"), Repair = toggle, LAUNCH = enabled when the Strike is charged.
- Units and buildings have **no hotkeys** in the JS game (`hotkey: null`); only powers (`POW_KEY`) and the key table do.

Selection card and orders (`updateUI`, `ordDock`, `src/08c-tactui.js tactRow`, `src/08c-logi.js lgRow`)
- Name / HP / veterancy stripes / morale bar / ammo row formatting; the multi-selection grid (first 8 kinds, ×count).
- Which tip line wins (special tip > matchup text > unit note); the "Beats ... · Weak to ..." line is computed against the
  current enemy nation (`matchUp`), so `strings.json selection` holds the IR-vs-US wording only as an example.
- Order button states: Attack / Guard turn into "Right-click…" while armed, "✓ Guard", "Retreating…"; which units get
  Dig in, Fortification line, road jobs (mine, checkpoint, blow / rebuild bridge, pontoon) and their prices.
- Mouse rules (Settings > Controls: Standard / Classic presets, left / right click meaning, right-drag line, pointer lock,
  edge scroll, camera rotate with Q) are input code; the options and their defaults are in `menus.json overlays.settings`.

Powers and rank (`qpUpdate`, `zhPowWin`)
- The right-edge rail shows a power only once it is ready; cooldown pie; Bunker Buster locked for the first 5:00; point
  costs per level are data (`level_points`), the "which button levels up" logic is code. Rank XP bar from `RANKS`.

Minimap and alerts (`src/06-view.js drawMini`, `src/08i-hud.js edgeTick`, `src/09b-radio.js radFeed`, `src/09d-announcer.js`)
- The minimap is drawn in code: terrain base, fog, gold 3 px supply fields, diamond derricks, squares for buildings
  (9 / 7 / 5 px), dots for units, supply lines, pings, camera box. `ref/minimap_battle.png` is one frame for reference.
- Edge arrows and the radio feed classify report lines with the regex tables exported in `strings.json`
  (`RAD_KIND`, `EDGE_K`, `ANN_RE`); the timing / gating (`annGate`, minimum gaps) is code.
- Report lines themselves are written by the sim: the Godot build gets them from the bridge's `log` events.
  `log_templates` is a static list for review and voice mapping (pieces like `${...}` are filled at run time).

Menus (`src/14-menu.js`, `src/08-ui.js`, `src/08d-*.js`)
- Screen transitions, breadcrumb, the Continue item (only when a save exists), map-card thumbnail queue, nation filter box.
- Players screen: the team list rows (nation / team / start spot / colour per side), picking start spots on the map
  preview, the computer-count limits per map, Battle options that depend on the map (season, weather).
- Multiplayer lobby (open games, invite code or link, chat, ready states): networking code, `src/08d-mplobby.js`.
- Settings: what each option changes, the key-rebinding window logic (`src/08m-controls.js`), text-size zoom, colour-blind
  mode, automatic graphics quality, the performance log window.
- Save / load slots, replays (file format and player), map editor, My battles history, Profile pickers: code + localStorage.

Missions, tutorial, end screen
- Mission scripting (`setup(c)` / `tick(c,dt)` + the `CH` helper table in `src/12-campaign.js`): source text is in
  `missions.json script_js`; the mission panel (objective checklist, timer) and the debrief screen are code.
- Tutorial: `ok()` / `hl()` / `cam()` / `enter()` per step are JS (source in `tutorial.json`); highlight ring, "Show me".
- End screen: the result sentence, the stats table, the after-action map, share picture, medals awarded, highlights reel.
  The window with its buttons is in `strings.json windows.end_victory / end_defeat`; medal texts in `tables.ID_MEDALS`.

Not in the JS game at all / notes
- Sub-leader names (RS Secretary-General, DW Leader of the Revolution, RV Chairman + Grand Ayatollah of Najaf) are in
  CLAUDE.md but not in `js-final` code: not in `nations.json`.
- Nation group **names** (Shia and allies / West / East / Regional) are from CLAUDE.md; the code only has the family
  letters (`AFAM` in `src/11-models.js`). The JS picker shows no group headers.
- The JS credits still have a "National anthems ..." paragraph (`menus.json credits.paragraphs`); anthems were removed
  (Abdullah 2026-11-20/21), so leave that paragraph out if no anthem audio ships.
- The JS tooltip of the Strike Center says "Requires War Factory" (`tip_requires_name`) while the sim really needs the
  Airfield in Battle (`requires`): `buildings.json` carries both.
- Transparent 208x160 unit portraits (`UK.icon`, the hologram in the selection card) were not exported: use the cameo.
- "Report a problem" (Settings) opens no window; it builds an error report to copy.

## Overlap with the bridge

`sim.tables()` already gives `nations[{key,name,color,style}]` and `maps[{key,name,max}]`, `sim.rules(nation)` gives unit /
building / upgrade / power numbers. These files do not replace that: they add everything the bridge does not carry (order,
groups, texts, tooltips, card rows, icons, menus, settings, missions, tutorial, keys) and work before a sim is booted.
