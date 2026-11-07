
## 2026-11-07 look1 (Sonnet helper) — real geography + light
Shots: `orch/shots/look1/before/` (grandsharp baseline, 1600x900) → `orch/shots/look1/a9/` (final of this pass, same views + world-wide + Levant close).
Work: real DEM + bathymetry (Terrarium/ETOPO1/GEBCO/SRTM) and Natural Earth I colour baked by `orch/look1-bake.py` into `grand/elev.png` (2400x1200)
and `grand/color.jpg` (4096x2048), warped to the game projection; `src/13g-grandlook.js` turns them into height, graded colour, biome weights,
baked sun shadows + valley AO + relief normals; towns get a flattened ground; sea depth colour from bathymetry, sun glint/fresnel/ripples;
sky dome, ACES tone map, cloud shadows, vignette + CSS grade.

| # | Item | before | after | note |
|---|------|--------|-------|------|
| 1 | Real geography | 1.5 | 4 | real ranges (Zagros, Alborz, Himalaya, Lebanon range), bathymetry; rivers still simple lines |
| 2 | Natural colour | 2 | 3.5 | satellite base graded; close-up still soft (4096px base) — needs CC0 PBR tiles per biome |
| 3 | Light | 2 | 3.5 | strong sun, baked terrain shadows + AO, haze, ACES; no object shadows yet, no bloom |
| 4 | Water | 2 | 3 | depth colour, glint, fresnel, ripples, foam line; no real wave normal maps/reflection yet |
| 5 | Objects | 1.5 | 1.5 | untouched (look2: boxy towns) |
| 6 | Readability/UI | 2.5 | 2.5 | untouched (look3) |
| 7 | Life | 2 | 2.5 | cloud shadows drift; no smoke/flags/animated trees yet |
| 8 | Performance | 3 | 3 | swiftshader only (cannot measure fps here); extra cost = one texture fetch + one-time ~1 s field bake at map open |
Next (lowest first): 5 objects, 6 UI, then 4 water (normal maps + planar sky reflection), 2 (PBR tiles), 3 (object shadows, bloom).
