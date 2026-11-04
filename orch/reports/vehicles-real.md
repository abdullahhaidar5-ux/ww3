# Vehicles real (2026-11-04, branch orch/vehicles-real)

## Shipped (stage 1: realistic materials, `weather()` in src/11-models.js)
- New shader kinds (`userData.wk`, set in `tintedProto`): ground (0), ships/boats/subs (1), aircraft (2). No new draw calls or textures — procedural noise in the existing weathering shader.
- Ground: sun-faded upward faces, rust streaks, mud/sand/snow grime on the lower hull taken from the map theme (shared uniform `WXE`, set by `wxEnv()`: green = mud, desert = sand, snow = white settling on top surfaces).
- Ships: rust runs down the hull, dark waterline grime, faint salt staining.
- Aircraft/helis/drones: panel-line shading, exhaust-soot streaks, slightly sun-faded top surfaces.
- `orch/factionshots.mjs` got a `--dir` option; close-ups in `orch/shots/vehicles-real/after/`.

## Not done (see HANDOFF-vehicles-real.md)
Per-unit battle damage (needs per-instance data; shared materials), faction kit extensions (camo nets, slat armour, drone stencils, hull numbers for all navies, tank commanders), crew/life particles, Objaverse model search. Local smooth gate times out (>10 min) here; use cigate.
