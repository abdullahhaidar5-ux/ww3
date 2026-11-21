# HANDOFF lane A (soldiers) - 2026-11-21

Branch: `orch/laneA-1` (on top of main 0119b01 "Soldiers drawn one by one again"). NOT landed - only ORCH lands.

## Piece 1 - Shia camouflage readable at 20 m (IR, RS, DW, RV)
What changed (view only, `src/11-models.js` `SOLCAM` / `solCamoMap`, 1 line in `src/11z-nations-rv.js`):
- The Middle-Eastern soldier (`sol_m`) cloth was a grey, low-contrast pattern (median brightness 72/255); in the
  backlit default battle camera the Shia squads read as black shapes.
- For IR, RS, DW, RV the cloth part of the uniform texture (trouser panels + jacket/sleeve panels of the 768 px atlas;
  face, hands, hair, boots, neck skin, belt and pouches untouched) is repainted ONCE per nation on a canvas when the
  nation's soldier material is made: crisp dark olive base, brown blotches, dark green blotches, khaki flecks; folds kept.
  Per nation: IR olive-green, RS colder grey-olive, DW a bit sandier, RV dark olive.
- Iraqi Shia brigades (RV) now wear the Middle-Eastern fatigues (`sol_m`) like IR/RS/DW (they wore the Eastern green
  digital camo `sol_e`). ORCH: revert that one line if you want RV to keep `sol_e`.
- Cost: no new mesh, draw call, material or shader program; one extra 768x768 texture per Shia nation in the battle
  (~3 MB GPU each with mipmaps). Works with SOLB on or off (texture only).
- See-through check (orch/laneAshots.mjs): every soldier material opaque (transparent/opacity/alphaTest/backside = 0 of 140).

Pictures: `orch/shots/laneA/{before,after}-{bm_breakwater,arctic}-{close,close-side,close-back,battle}.jpg`, rendered on a
GitHub runner by `.github/workflows/laneashots.yml` (main's index.html = before, branch = after; Test range, clear day,
same cameras; row of squads left to right: IR RS DW RV US RU).

My honest verdict (from my local SwiftShader renders, runner set pending at time of writing - see below):
- Better: IR and RV now show olive/brown blotches at 20 m where before they were near-black; DW pattern clearer.
- Still darkish: the default battle camera looks INTO the sun (shadows fall toward the camera), so the camera-facing side
  of every soldier is in shade. US tan reads well only because it is a light colour. A real fix for "black soldiers" is
  lighting (sun direction / fill light), which is not lane A's file - flagging it for ORCH.
- RS is the darkest (cold grey-olive by design); if Abdullah wants it lighter, raise RS's `SOLCAM` base colour.

Smoothness: texture-only, so frame time/draw calls should be unchanged; numbers from the gate run below.

## Status / numbers
- 02:55 UTC: GitHub runners are saturated (~30 runs queued across lanes). Gate for f942ff3775 started (2/28 done, both
  green so far); the Lane A shots run (pictures) is still queued. Nothing is offered to ORCH until both are in.
- 04:40 UTC: gate for f942ff3775 done: 27/28 green. The one red, gate/decisions, is "instanced soldiers: ON" - that guard
  fails because main 0119b01 itself switched SOLB off (Abdullah 'Switch'); main 261e9af still has the guard, so main
  fails it too. Not caused by this branch. ORCH: update that guard in orch/decisions.mjs when you land the SOLB-off change.
- smooth-pc (software GL runners, noisy; one run each, different runners):
    main 55f2340 (SOLB on):   317 units, median frame 37.1 ms, 1214 draw calls
    main 261e9af (SOLB off):  331 units, median frame 56.0 ms, 1506 draw calls
    this branch f942ff3775:   350 units, median frame 79.4 ms, 1533 draw calls
  Draw calls per unit on screen are the same as main (4.55 vs 4.38 per unit; the extra calls track the 19 extra
  soldiers on screen). The median frame is higher, but runner-to-runner spread is that large (37 vs 56 ms between two
  main commits). NOT PROVEN smooth yet: needs a same-runner A/B (run smooth-pc for main and this branch in one job)
  before ORCH lands it. The change itself adds no mesh, draw call or shader (one texture per Shia nation, made at load).
- Runner pictures (Lane A shots run 44850067691) were still QUEUED after 3 h; my verdict above is from local SwiftShader
  renders of the same script. When the run finishes they land in orch/shots/laneA/ on this branch.
- Pieces 2-5 (chest rig, helmet, faces/beards, other nations' colours) NOT started this run.
