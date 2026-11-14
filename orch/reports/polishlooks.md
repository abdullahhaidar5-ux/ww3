# polishlooks — box-like / toy-like units and buildings in Battle (2026-11-14)

Goal (Abdullah 2026-11-13 20:38): "a super super polished and smooth and beautiful battle game". Bar: orch/ART-BAR.md (B1 one
material language, B5 silhouette quality, B7 smooth).

## How the shots are taken
`node orch/polishlooks.mjs --tag before|after` — Battle mode on Fulda, HUD hidden, same seed and camera for every shot:
- units (inf, at, tank, arty, aa, heli, harv, dozer) for IR, RS, DW, RV, US, IL, RU, CN;
- every Battle building (hq, barracks, factory, airfield, depot, turret, sam, tunnel, econ, uplink, radio, fort) for IR, RS, RV
  (Middle Eastern look) and US, RU (standard look).
Contact sheets: `orch/shots/polishlooks-before-<FAC>-units|blds.jpg` and `...-after-...`; side-by-side pairs of the ten items:
`orch/shots/polishlooks-pair-*.jpg`. (Single shots land in orch/shots/polishlooks/<tag>/, not committed.)

## The 10 that looked worst (worst first)
| # | What | Who sees it | Problem | Status |
|---|---|---|---|---|
| 1 | Rocket artillery truck | IR, RS, DW, RV, CN, every rocket-truck nation | the launcher was a closed grey slab on the truck bed — read as a crate, not a weapon | **fixed**: open 4 x 10 tube pack with dark muzzles, side plates, straps, cradle, elevating rams on a turntable |
| 2 | Anti-air missile truck | all 8 (every nation with the truck AA) | blocky low-poly box pods ("toy") | **fixed**: turntable launcher with four round canisters, end covers, radar panel, operator cab |
| 3 | Anti-Air Missile Site | all | same blocky box pods on a post | **fixed**: same launcher, 1.3x, on a concrete pad with a generator and cables |
| 4 | Defense Gun | all | two blocky pods on a pedestal — did not look like a gun | **fixed**: concrete octagonal emplacement + sloped-armour turret, long barrel with fume extractor and muzzle brake, mantlet, coax + roof MG, cupola, sight, smoke dischargers, antenna |
| 5 | Ammo crates beside SAM / gun / tunnel / depot / barracks / factory / airfield | all | crates as long as a tank hull (35 x 26 units) | **fixed**: life size (fit by length, ~18 units for the pair) |
| 6 | Mountain Fortress | IR, RS, DW (+AF, KD, KP) | three stacked cones = a ziggurat, not a mountain | **fixed**: craggy outcrop of six seeded noise rocks (three on Low) |
| 7 | Tunnel Network mound | all (ME and standard) | two stacked cones | **fixed**: lumpy earth mound (two noise rocks) |
| 8 | Tunnel / fortress gun | all | a cylinder with a square stick | **fixed**: gun shield, receiver, round barrel with flash hider, ammo box |
| 9 | Radio & TV Station | all | a plain box with a mast | **fixed**: roof parapet, AC units, two dishes, window bands on three sides, entrance canopy, generator + fuel tank, guy wires on the mast |
| 10 | Construction dozer | all | the imported dozer is one baked mesh whose cab roof reads as a flat floating tan sheet | **left**: needs a new free model (single mesh, no part to fix in code) |

Also seen, not worst-10: supply-truck tarp is a lumpy block (imported Ural/M35 model); infantry read fine at gameplay zoom.

## Cost (B7)
- Every new piece is a merged vertex-colour mesh in MAT.std (no new materials or textures). Gun / SAM building = slab + static
  base + turning head (3 meshes, the old ones were slab + an imported model); AA-truck launcher = 1 mesh (was an imported model);
  rocket pod = 2 meshes (was 1). Fortress / tunnel / radio / tunnel gun stay one merged mesh each.
- The new geometries are built **once** and shared by every unit/building of that kind (PROCG / MLRSG caches) — the old
  rocket pod built a fresh geometry per truck.
- Triangles: rocket pod ~2.9k, gun turret ~1.3k, SAM ~2.6k, fortress rocks 6 x 80. Draw calls unchanged per object.

## Before / after pairs (orch/shots/)
polishlooks-pair-1-rocket-truck (RS) · -2-aa-truck (IR) · -3-sam-site (IR) · -4-defense-gun (IR) · -5-crates (US SAM site) ·
-6-fortress (RS) · -7-tunnel (RS) · -8-tunnel-us · -9-radio (RU). Full sheets: polishlooks-before|after-<FAC>-units|blds.jpg.

## Local checks (sandbox)
build --check OK · SMOKE PASS · DECISIONS PASS. Full gate: orch/cigate.sh on GitHub (see HANDOFF-polishlooks.md).
