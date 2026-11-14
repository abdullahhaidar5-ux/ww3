# HANDOFF — orch/polishlooks (2026-11-14)

Box-like / toy-like Battle units and buildings made realistic. Report + worst-10 list: orch/reports/polishlooks.md.
Shots: `node orch/polishlooks.mjs --tag before|after` (sheets orch/shots/polishlooks-<tag>-<FAC>-units|blds.jpg).

## Before / after pairs (orch/shots/polishlooks-pair-*.jpg)
1. Rocket artillery truck (IR/RS/DW/RV/CN…): grey slab → open 40-tube rocket pack on a turntable.
2. AA missile truck (all): blocky box pods → 4-canister launcher with radar panel and cab.
3. Anti-Air Missile Site (all): same, 1.3x on a concrete pad with generator.
4. Defense Gun (all): twin box pods → sloped-armour gun turret on a concrete emplacement.
5. Ammo crates by SAM/gun/tunnel/depot/barracks/factory/airfield: tank-sized → life-size.
6. Mountain Fortress (IR/RS/DW/AF/KD/KP): stacked cones → craggy rock outcrop.
7./8. Tunnel Network: stacked-cone mound → earth mound; tunnel/fortress gun → shielded MG with round barrel.
9. Radio & TV Station: plain box → parapet, AC units, dishes, windows, canopy, generator, guy wires.
10. Construction dozer cab roof (flat floating sheet) — **left**: the imported dozer is one baked mesh; needs a new free model.

## Files
src/11-models.js (mlrsGeo, PROCB gunTurret/samSite, BMOD proc hook, crate prop size), src/04-gfx.js (fort/tunnel rocks,
tunnel gun, radio detail), orch/polishlooks.mjs (new shot script), index.html rebuilt.

## Gates
Local: build --check OK, SMOKE PASS, DECISIONS PASS. GitHub gate for the code commit 8a7878c (orch/cigate.sh): NOT RUN — GitHub Actions stalled: gate/8a7878c232 queued 04:16Z, re-pushed as gate/<head> 06:37Z, still queued at 07:00Z with 0 runs in progress and 30 queued repo-wide (looks like a runner/minutes stall, not this branch). Next helper or the conductor: run `orch/cigate.sh orch/polishlooks` once runners move
Smooth: draw calls per object unchanged or +1 for gun/SAM buildings (rare, static); new geometries are built once and shared.

## Status
Code done and pushed; **ready to land once its cigate run is green** (only blocker: the stalled GitHub runners). Left: dozer cab roof (needs a new free dozer model), supply-truck tarp (imported truck model).
