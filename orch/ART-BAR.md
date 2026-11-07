# ART BAR — the WHOLE game must look and feel like a $75 studio game (Abdullah 2026-11-06 18:02, raised from $60 grand-map-only at 16:59)

Applies to the grand map, the nation panel/UI, and battles in real gameplay. Plus FEEL: instant click feedback (< 100 ms), smooth
60 fps with big armies, smooth army selection, no loading that hangs.

"Ok this is still very bad. Make it look like a 60 dollar studio game. That's the goal. Don't stop."

Reference feel (study public screenshots/trailers in your head; never copy their art): Total War: Empire / Three Kingdoms /
Warhammer III campaign maps, Hearts of Iron IV terrain map zoomed in, Company of Heroes 3 campaign map. Modern-war theme,
our own art, free CC0/CC-BY/public-domain sources only (credited).

## What "studio" means here — every item must be true in the standard shots
1. **Real geography**: real elevation (public-domain DEM: ETOPO/SRTM/GEBCO-derived, or Natural Earth shaded relief — find a
   copy reachable via GitHub/npm), real coastlines, rivers, lakes, mountain ranges you recognise (Zagros, Alborz, Lebanon range,
   Caucasus, Himalaya). Sea floor depth drives water colour.
2. **Natural colour**: a satellite-like base (NASA Blue Marble / Natural Earth raster are public domain) blended with tiled PBR
   detail (Poly Haven / ambientCG CC0) per biome, hand-graded so it is rich, not grey or washed out. No flat-colour blobs.
3. **Light**: one strong sun, real shadows (terrain self-shadow/horizon map + object shadows), ambient occlusion in valleys,
   atmospheric haze and sky, tone mapping (ACES/AgX), gentle bloom, colour grade. Depth and drama, never flat.
4. **Water**: animated waves (normal maps), depth colour, foam on coasts, sun glint, reflections of sky.
5. **Objects**: towns, ports, forts, armies, fleets are proper detailed meshes (no boxes/cylinders/cubes), region-styled,
   with LOD; armies = a detailed soldier figure + cloth-simulated flag; ships = real ship models.
6. **Readability like a studio UI**: sharp banners and labels, clean modern-military UI frames, icons, unit cards with real
   unit portraits; nothing overlaps; text crisp at 1080p and 1440p.
7. **Life**: clouds and their shadows drifting, smoke over battles, trees swaying slightly, flags waving, armies march.
8. **Performance**: steady 60 fps on a mid PC at "High"; "Ultra" may cost more. Never ship a slower map without the toggle.

## Self-review protocol (every look/art helper, every iteration)
- Take the 6 standard shots at 1920x1080 (scripts in orch/grand5shots.mjs or grandsharp's): world wide, Middle East wide,
  Levant close (Lebanon/Syria/Israel coast + mountains), Gulf/Hormuz close, an army next to a city close-up, snowy mountains.
- Score each of the 8 items above 1–5 **honestly, as a paying player comparing to the references** (5 = indistinguishable in
  quality class from a studio game). Write the table + the shots' paths to `orch/reports/artbar.md` (append, dated).
- Work on the lowest-scoring items first. Never ship something that scores lower than before on any item.
- The goal is every item ≥ 4.5. Until then the art loop keeps going (see CHAIN-ART in orch/CHAIN.md).
