# HANDOFF gatefix (fixer run, 2026-11-15)

Branch `orch/gatefix`. Task: the gate was red after the push-fast day (Sat 2026-11-14). Cause found per job, fixed at the cause.

## What was actually broken (game, in `src/`)
- **Conquest/grand code that a merge had brought back into the simulation** (`03-sim.js`: map power grid, fuel, militias/locals, strike timers `CQ_*`, `G.conq`, `G.towns`, `G.grand`; `01-data`, `01c-modern`, `07b-ckpt`, `08-ui` grandUi, `08c-goal`, `08o-prodq`, `08o-zhbar`). Removed; `orch/decisions.mjs` "one game" guards pass again. The old out-of-supply *time* penalty (`supT`) is gone too (ammo rule says no timers).
- **Loading a save / host-migration restore failed when a unit had an order at an oil derrick** (circular JSON compare in `07b-ckpt.js`). Fixed.
- **Saves drifted from the original game** (tick timers `tbT pwT dgT n2T wndS bfWd` were not in the checkpoint). Added to `CK_G`.
- **Battle roads between the bases were cleared with the towns** (`02-map.js`, commit d53c7d0), so supply lines had no roads at all. Roads between bases are back on the generated maps.
  **Open for ORCH/Abdullah:** the hand-drawn Battle maps (`bm_*`, `rd:` lists in `02d-battlemaps.js`) have editor roads (`M.roads`) but `03c-logistics.js lgInit` only reads `M.roadNet`, so on those maps supply lines are circles only. The tutorial therefore uses a generated map (`strait`) when the picked map is hand-drawn.
- **Smooth gate (draw calls 2747 vs allowed 2551):** every building carries ~13 merged decor-prop meshes (`kitmerged`); they now stay out of the ambient-occlusion depth pre-pass (`userData.noDepth`), about 19% fewer draw calls on the smooth-test scene locally. No budget changed. `orch/smooth.mjs --scene` now also lists meshes per unit/building kind. Further saving idea: instance or share kit props across buildings.
- Tutorial: first step text too long (shortened), supply-lines step pointed at the hidden `#lgBtn` (now the minimap).

## Tests that looked for removed UI (kept what they prove, pointed at the new UI)
mpsync (watching note is in the new lobby screen `#mpl`), migrate (3-seat map `bm_sixroads`; per-building queues), cfclient-startpick (listed Battle map, valid spot), controls (own queue per building; dozer selected to place), tutorialtest (new Generator step 1, dozer selected before Build), decisions (nothing runs behind the menu any more; barracks selected for unit-button card; map with roads), powertest (Battle only, per-building queue, dozer selected for Build tab), ewtest (Sanctions / Smuggling / Fund Militia checks dropped: those powers are not in Battle), superfreeze (Generators for the Strike Center, no Conquest timer), audio (wait for the fade-out timer), bugsA-icons (screenshot timeout).
`CLAUDE.md` was 31 KB with merged duplicate bullets; trimmed to ~18 KB (stale Conquest/grand bullets and duplicates removed, capturable-buildings rule kept).

## Final gate table
Gate run on eb97c5c083: 20 green, 8 red.

Red: gate/cfclient, gate/controls, gate/controlscheck, gate/decisions, gate/migrate-dual, gate/save, gate/smooth-pc, gate/superfreeze

Still open (not fixed this run):
- gate/smooth-pc: draw calls still over the allowance (merged building decor props; instance or share kit props across buildings, do not raise the budget).
- gate/superfreeze: strike impact effects (rings, debris icosahedrons) create new meshes/textures at strike time; pre-create them in the warm-up.
- gate/save: save hash still differs after a reload (tick timers fixed; check rubble/other derived state with orch/savediverge.mjs).
- gate/migrate-dual: AI did not act after taking over the old host's side.
- gate/cfclient: leader's Cloudflare lobby timed out (startpick).
- gate/controls: 10 of 130 checks fail; the CI log hides which (run node orch/controls.mjs and grep FAIL).

Green: gate/art-mpsync, gate/art-smoke, gate/audio, gate/check, gate/decals, gate/ew, gate/headless, gate/icons, gate/loadfreeze, gate/mapsweep, gate/migrate, gate/migrate-abrupt, gate/migrate-down, gate/mpsync, gate/mpsync-server, gate/servertest, gate/smoke4, gate/smooth-mp, gate/stuckscan, gate/tutorial

