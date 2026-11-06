# Battlefeel (2026-11-06, branch orch/battlefeel) - Abdullah's 19:01 picks

Screenshots: orch/shots/battlefeel/ (1 field fire, 2 smoke screen, 3 infantry by a wreck, 4 auto-build panel). Test: `node orch/feelshots.mjs`
(prints `BF-FEEL PASS`; `NOSHOT=1` skips screenshots, `SHOTS=fire,smoke,wreck,auto` picks scenarios).

Code: sim `src/03g-battlefeel.js` (hooks: `kill`, `explode`, `fire`, `updateVis`, speed, `rubDo`, `act`), view `src/05d-battlefeel.js`,
panel `src/08h-autobuild.js`, shouts `src/09c-shouts.js`, voice lines `tools/voices/shout_lines.py`. Owners in `orch/SYSTEMS.md` extended, no second system.

## 1 Wildfires
Fuel on the 40 px terrain grid (forest 3 inside map woods, grass 1-2 on green maps, sparse scrub on desert, none on roads / water /
buildings / snow). A blast of radius >= 14 can light the cells it covers (`fireHit` from `explode`): chance by weapon (thermobaric/super 0.9-1,
bombs .4, shells .16, missiles .2), times fuel, times dryness (summer 1, mud season .35, snow 0; clear 1, sandstorm 1.3, fog .6, rain .08).
Fire spreads once a second to the 8 neighbours, faster downwind (existing wind), lasts 8 + 14 x fuel seconds (halved in rain), then the
cell is scorched (no fuel, dark decal). Burning cells: infantry take 5 hp/s and panic, light vehicles 1.5 hp/s, every ground unit is
slowed (infantry x.5, vehicles x.78) = soft route block; AI/pathing does not treat fire as a wall. Max 420 burning cells. Seeded RNG (`G.seed`).
## 2 Wind-blown smoke
`bfWind()` is a pure function of seed + clock + weather (no state). Smoke grid 80 px (`G.bfD`), advected semi-Lagrangian, diffuses, thins
(x.96/s, faster in rain). Sources: smoke grenades/screens (their discs now drift with the wind too, so units inside still hide), burning
wrecks (75 s), wildfires. `smokeBlock()` is used in `updateVis`: a ground spotter cannot see a target through optical depth >= .55 (targets
closer than 100 px are always seen; aircraft look over it). Sim vision feeds target acquisition, so shooting through a cloud stops too.
View: smoke/flames are the existing particles from `FXE 'bfx'` (every 2 s: wind, <=130 densest cells, <=120 burning, new scorch).
## 3 Wrecks as cover
`kill()` -> `hulkAdd`: a destroyed ground vehicle's cell (open terrain only, >= 6 open neighbours so a pass is never walled in) joins the
rubble grid `G.rub` (heavy vehicles route around it, infantry walk over it - the existing rubble rule) and gets +3 cover in `G.cover`,
and smokes 75 s. Cap 36 (oldest removed first). Dozers/Construction Vehicles clear it with the normal rubble 'clr' order (`rubDo` ->
`hulkGone`). Checkpoint: `bfHulk/bfFire/bfScorch` in `CK_G`, `bfSync()` after restore.
## 4 Soldier shouts
Triggers (sim, host only, throttled per team 1.6 s, per type 8-14 s, per unit 9 s): **RPG!** (AT infantry fires), **Tank!** (infantry
fires at / near an enemy vehicle), **Grenade!** (splash shot by infantry), **Reloading!** (magazine empty), **Contact front!** (first
shots after 4 s quiet), **Man down!** (nearby friendly infantry dies), **Medic!** (a soldier is wounded). Event `FXE 'shout'`; client
plays one clip from `vo/CODE_s.mp3` (positional + panned; off-screen = radio band-limit; far enemy shouts not heard). Lines for all 18
nations in their language: `tools/voices/shout_lines.py`. See orch/HANDOFF-battlefeel.md for which sheets are rendered.
## 5 Smart auto-build
`T.auto = {on, list:[{k,n}]}` (saved with the team). Command `auto` (CMD_T): `{k:kind, ti:count}` set/remove, `ci:1/2` priority up/down, `k:'_on'`
pause, `k:'_clr'`. `bfAutoTick` every 2 s per human team: for each line in priority order whose unit is short and whose building exists, queue ONE
unit per factory (max 3 queued) through `enqueue()` (same cost/limit/hero rules as a click); if the top line can't be afforded it
saves money for it (that's the priority). Panel: U key or header click, small box next to the Command panel. Clients see it through the team panel `au`.
## Numbers to balance later
fire damage 5 hp/s infantry; ignition factors in `BF_HOT`; smoke block depth .55; hulk cap 36; auto-build 3 queued per factory.
## Not done / limits
Fire is a soft block only (slow + damage + panic), not a hard path wall. AI teams do not use auto-build (they have their own production).
Smoke, fires, scorch and hulks all survive saves and host migration (bfSmS, bfFire, bfScorch, bfHulk in CK_G; random draws are a pure hash).
