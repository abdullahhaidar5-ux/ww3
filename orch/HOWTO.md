# HOWTO — proven recipes (append ≤ 5 lines when you figure something out; read before exploring)

## Ship a change
`python3 orch/build.py` → `node orch/smoke.mjs 2>&1 | grep -E "SMOKE (PASS|FAIL)"` → targeted test (`node orch/grandtest.mjs 2>&1 | tail -3` for grand work) → `bash orch/cigate.sh > /tmp/cig.log 2>&1 &` → merge origin/main → fast-forward push. Sim/data change → comment on the open main→servers-live PR.

## Add a full nation
`NEWNAT` pattern — see orch/NATIONS-TODO.md "pattern" section and orch/reports/nations-a1.md (data row, look, flag, home map, town style, morale style in `MSTYLES`, lobby, encyclopedia).

## Grand map code map (grep these names)
`grNew` new campaign (13-grand.js) · `grAddArmy` · `grEndTurn` turn resolve · `geNewNat`/`geEnsure` economy init (13g-grandeco.js) · `geUiPanel` economy screen (13h) · `guTop`/`guSide` grand UI (13c) · battle launch from the map: 13b-grandbattle.js · province battle maps: 13f-grandmirror.js · terrain bake 13d · 3D map 13e.

## Lint (free robot checks)
`node orch/lint.mjs` → LINT PASS/FAIL in 1 s (runs in gate job `check`). Fails on `</script` in src, a new external host (edit HOSTS in the file only with Abdullah's OK), real-leader/organisation names, `Math.random`/`Date.now` in grand SIM files (13-grand, 13b, 13f, 13g, 13i+; add `// lint-ok` on a line to waive).

## Add a menu/pause/settings button without touching 08-ui.js
New file `src/08k-*.js` (build.py picks up all src/*.js in name order); in an IIFE find `document.getElementById('openSettings'|'aSet'|'sDone')` and append/insert a button (see `08k-report.js` "Report a problem" → pre-filled GitHub issue, label `player`).

## People names and portraits (portraits lane)
Names: `pplRoster(code)` -> {leader, heir|null, cab[4]}; `pplName(p)` -> "Ayatollah Mahdi Tabrizi"; `pplOf(code,'leader'|'heir'|'minister',i)`; generals via `pplGeneral(g)`. Add a culture row in `PPL_T` + `PPL_CUL`. Cards: `pplCard(p)`; hook for Lanes F/G: put `pplCard`/`pplName` in event pop-ups, diplomacy and army cards. Portraits: `ptOn()` (src/13l-people.js, false) gates pictures; the renderer is build-time only: `sh orch/portraits/fetch.sh DIR` (MakeHuman CC0, credit "MakeHuman community"), `node orch/portraits/make-people.mjs && node orch/portraits/prep.mjs && python3 orch/portraits/mhmorph.py DIR orch/portraits/specs.json orch/portraits/meshes.json`, symlink `three` into orch/portraits, serve it, open `sheet.html?cols=8&w=240`. Current output is WIP (see HISTORY); do not enable until it passes the EU4 bar.

## Add a menu screen (title menu v3, `src/14-menu.js`)
1. In `mxBuild()` add `const S=scr('myid','<h2 class="mxh">Title</h2><p class="mxsub">one line</p>')`, put your content in it (MOVE an existing node, don't rebuild it) and a footer with `foot(S, go('Next →', fn))`.
2. Add a title entry with `item('Label', ()=>menuGo('myid'))` (order: Grand campaign · Conquest · Missions · Tutorial · Play online · Load game · Settings · Extras · Credits) and a name in `MX_TITLES` (breadcrumb); use `MX_STEPS` for a multi-step flow.
3. `menuGo(id)` slides forward, `menuBack()` / Esc one step back, `menuHome()` resets (runs whenever `#menu` is shown again); do per-screen refresh in `mxEnter(id)`. Controls added later by other modules into the old `#menu .card` are hidden: click them from a new item (`mxClick('id')`).
4. Check: `node orch/menushots.mjs <tag> title,myid` (shots in orch/shots/menu/) and `node orch/menuhud.mjs`.
## Add a monthly system / an idea
Push a fn onto `GMOD_HOOKS` (13k) — called by `gmodMonth` each turn. New idea = one row in `GID_GROUPS` (13l); its effect is a modifier row on an existing stat (income, upkeep, manpower, ppPol/Dip/Mil, warSupport…).

## Middle East map templates for the Fight-it generator (memaps, for Lane F)
`src/02c-memaps.js` holds one data row per real-geography Conquest map (`MAPS[key]`, `home` = nations). No grand-map province→template hook exists yet
(grep `MAPS[` in `src/13-grand.js` finds none); to mirror a province, pick `Object.keys(MAPS).filter(k=>MAPS[k].home.includes(nationCode))` and match the row's `tag` (coast, river, desert, mountains, urban, marsh).

## Add a trade good / world price (13z-gmarket.js)
Add a row to `MK_G` and an output formula in `mkOut`; prices live in `GC.mk.p`, effects are GMOD rows built in `mkSync`. Test: `node orch/mktest.mjs`.
