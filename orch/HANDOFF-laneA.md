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
(filled in below when the runner jobs finish)
- 02:55 UTC: GitHub runners are saturated (~30 runs queued across lanes). Gate for f942ff3775 started (2/28 done, both
  green so far); the Lane A shots run (pictures) is still queued. Nothing is offered to ORCH until both are in.
