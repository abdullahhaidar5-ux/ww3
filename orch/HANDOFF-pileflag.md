# HANDOFF pileflag (branch orch/pileflag) - 2026-11-14

Abdullah (Fri 2026-11-13 19:52 Chicago, photo of Battle as Lebanese Shia, "In conquest and battle") picked "Blocky supply pile" and
"Green flag stays"; then (19:58, via ORCH note) "Make cargo look more like generals".

## Done
- **Supply pile** (`src/04d-supdump.js`, new; called from `src/04-gfx.js` and `src/06-view.js`): every supply field is a chunky,
  readable stepped pyramid of supply crates (light wooden "SUPPLY" crates + olive ammo crates, lids, stencils, straps, bevelled
  worn edges) on pallets, with low dressing around it that never hides the pile: a short sandbag wall, a fuel drum cluster, a
  tarp-covered spare stack, one shipping container, all on a trodden dirt pad that follows the ground. One texture atlas + normal
  map + roughness/metal map, drawn in code (our own art, no third-party files, nothing to credit). Nation-neutral, same in Conquest
  and Battle.
- **Shrinks as it is used** in tier steps tied to the field's supply number: full (4 tiers) / 3 tiers (>50%) / 2 tiers (>25%) /
  half the bottom tier (<25%) / empty pallets (0).
- **Cheaper to draw**: one merged mesh per pile and one shared material for all piles (1 draw call + shadow each); before it was a
  pad + ~13 pallet stacks of separate crate/barrel models + 2 containers + sandbags per field (dozens of meshes). ~6k triangles per
  pile. Depletion is a draw range, nothing rebuilt at run time.
- **Rally flag**: the flag only stayed because the click that set the rally point left the Command HQ selected, so the flag
  (correctly) kept showing - forever, since every next ground click just moved it. Now setting a rally point with a click lets go
  of the building (Shift or Settings > keep selection keeps it), the flag flashes 1.5 s, and any click on the battlefield ends the
  flash at once. Only one flag system exists (`RALLY` in 06-view; the cursor flag is just the mouse pointer while a production
  building is selected).
- **Test**: `orch/decisions.mjs` "rally flag clicks" - real mouse clicks: select HQ, click ground (flag flashes, rally set), click
  ground elsewhere -> no flag, one flag object.
- Docs: DECISIONS.md, HISTORY.md (2 lines), SYSTEMS.md (supply field look owner).

## Not done
- No new 3D model files were needed (procedural); nothing added via `--add-model`.
- The old `pallet`/`crate`/`barrel` props stay in models/ (used elsewhere).

## Gate
- 2026-11-14 18:xx rerun: the first branch (orch/pileflag) was reverted from main after its gate had servertest failed + mapsweep cancelled
  and it did not rebase cleanly. Same work re-applied on current main as **orch/pileflag2** (old branch left untouched, no force-push).
  Main had also lost the "flag only while a production building is selected + 1.5 s flash" code in `06-view.js`; put back (`RV`).
- Local: `build.py` + `--check` OK, `smoke.mjs` SMOKE PASS, `decisions.mjs` DECISIONS PASS (incl. new "rally flag clicks": select HQ, click
  ground -> flash, click elsewhere -> no flag, one flag object). No local smooth run (per CLAUDE.md).
- GitHub gate pushed for 5fe1119 as `gate/5fe1119ace`; results were still running when this run stopped. Conductor: read the `gate/*`
  statuses of 5fe1119 before landing (smooth-pc / smooth-mp must be green; servertest, mapsweep known flaky - re-run once).

## Pictures (orch/concepts/pileflag/, made by `node orch/pileflagshots.mjs --tag after`)
- before-pile-*.jpg / after-pile-*.jpg: close and normal play zoom at full, half used, almost empty.
- before-flag-1-just-set.jpg: main today - after clicking the ground the HQ is still selected and the flag stays.
- after-flag-1-just-set.jpg (HQ let go), after-flag-2-hq-selected.jpg (flag shows while the HQ is selected),
  after-flag-3-clicked-away.jpg (gone after a click on the ground).

## For Abdullah (2 minutes on PC)
Start a Battle as Lebanese Shia, send the supply truck to the crate pile next to your base and watch the pyramid drop a tier as it is
emptied; then click your Command HQ, click the ground to set the rally point, and click somewhere else - the green flag should be gone.
https://abdullahhaidar5-ux.github.io/ww3/

## Update 2026-11-14 evening (follow-up run, branch orch/pileflag2 = continuation of orch/pileflag, merged with origin/main daebfc244)
- Merge: main already carries the flag rule (`RV` in 06-view); kept it, kept the supply pile (`sdDumpTick`), the click handler in 08-ui and the
  "rally flag clicks" guard in orch/decisions.mjs. build + --check OK, SMOKE PASS (403 s).
- decisions: the "rally flag clicks" guard passes (flash after set, no flag after the next click, one flag object). The run's only failure is
  `menu shows "Classic"`, which is not from this branch: no src change here touches that text, the same "classic" strings are in main's
  01-data / 02c-memaps / 13c-grandui. Whoever owns the menu/maps wording should look; it is not a pileflag leftover.
- Not seen: Abdullah's "bigger striped flag" next to the small teal one - the only flag drawn by `RALLY` is the teal one; the striped one is
  not from this system (nation/army flag or another helper's order marker) - orderfeel/unstuck lanes, untouched.
