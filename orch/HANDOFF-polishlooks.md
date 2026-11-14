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
Local: build --check OK, SMOKE PASS, DECISIONS PASS. GitHub gate for the code commit 8a7878c (orch/cigate.sh): queued on GitHub runners for 2 h+ (runner backlog: several gate/* runs and main "Gate bisect" ahead of it) — result to be filled in
Smooth: draw calls per object unchanged or +1 for gun/SAM buildings (rare, static); new geometries are built once and shared.

## Status
Ready once the gate run for 8a7878c is green (code unchanged since; later commits are docs/shots only).
