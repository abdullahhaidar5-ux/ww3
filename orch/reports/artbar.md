
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

# ART-BAR scores (Lane C)
## 2026-11-07 00:3x UTC — laneC iteration 1 (shots: orch/shots/laneC/before|after)
Before → after (1–5, honest): geography 3 · colour 3 · light 2.5 · water 2.5 · objects 2 → 3 (towns now streets of hip/gable/courtyard houses, not scattered cubes; armies/ships still plain) · readability 2.5 (map-mode buttons overlap banners at top-left) · life 2.5 · perf 3.5 (tris 0.93M → 1.15M, 156 draw calls).
Next lowest: light/water (no shadows, flat water), objects (ships, soldier figures), then UI skin overlap.

## 2026-11-07 01:3x UTC — laneC iteration 2 (shots: orch/shots/laneC/it2)
Readability 2.5 → 3.5 (map-mode panel now a framed opaque "MAP MODE" panel, no banner bleed-through); water 2.5 → 3 (fresnel sky tint, finer ripples, wider sun glint, shallow-water shimmer). Others unchanged. Next: light (shadows/AO on towns), army figures, UI kit (C0).

## 2026-11-07 03:3x UTC — laneC iteration 3 (shots: orch/shots/laneC/it3)
Light 3 → 3.5, objects 3 → 3.5: every town building now throws a soft sun-direction shadow (one extra instanced mesh, same sun vector as the baked terrain shadows), so towns sit on the ground instead of floating. Others unchanged (geography 4, colour 3.5, water 3, readability 3.5, life 2.5, perf 3.5 est.). Next lowest: life (smoke/animated flags), armies/ships figures, UI kit C0.

## 2026-11-07 05:5x UTC — laneC iteration 5 (shots: orch/shots/laneC/it5)
Life 2.5 → 3.5: shipping lanes — ~18–46 tankers and container ships (`src/13w-gshipping.js`) sail the real sea-province links with wakes (visual only, no sim state; they never cross land: links are sampled against the height field). World reaction chain: trade lanes visibly busy (tie to oil market / Straits later). Others unchanged (geography 4, colour 3.5, light 3.5, water 3, objects 3.5, readability 3.5). Next: water normal maps, army figures, UI kit C0.
## 2026-11-07 04:xx UTC — laneC iteration 4 (shots: orch/shots/laneC/it4)
Life 2.5 → 3: every town now breathes faint chimney smoke (one GPU-animated Points draw, ~8k puffs, hidden when zoomed out past d 1100; capitals 5 sources, towns 1–3). Besieged-province smoke already existed (g3BuildSmoke, ⚡15) — mine is `g3BuildChim`. Subtle by design; others unchanged. Next lowest: water 3, colour 3.5/light 3.5/objects 3.5 (soldier figures still blocky), UI kit C0.

## 2026-11-07 06:2x UTC — laneC iteration 6 (shots: orch/shots/laneC/it6)
Water 3 → 3.5: five crossing sharpened swell trains drive the sea normals (peaked crests), sky-gradient reflection with warm sun side replaces the flat fresnel tint, whitecaps on open-water crests, light through thin crests in shallows; all fade with distance so far views stay calm. Shader-only, no sim. Others unchanged (geography 4, colour 3.5, light 3.5, objects 3.5, life 3.5, readability 3.5). Next: army figures/ships, UI kit C0, PBR close-up tiles.

## 2026-11-07 07:xx UTC — laneC iteration 7 (shots: orch/shots/laneC/it7 before, it8 after)
Readability 3.5 → 4: the map-mode legend ran behind the army cards and was clipped; it now sits above the minimap, wrapped in a framed box. Army cards are ~14% bigger with larger text. Others unchanged (geography 4, colour 3.5, light 3.5, water 3.5, objects 3.5, life 3.5). Next lowest: objects (blocky army figures, oversized flags at close zoom), colour/light, UI kit C0.
