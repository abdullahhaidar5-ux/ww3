# ART BAR — the WHOLE game must look and feel like a $75 studio game (Abdullah 2026-11-06 18:02, raised from $60 grand-map-only at 16:59)

## GRAND-MAP TARGET LOOK (Abdullah 2026-11-07 19:29–19:30, sent a Total War campaign-map screenshot: "This level of graphics", "Look at that beautiful grand army")
Match this in our own original art (never copy that game's assets):
- **Army = one big hero soldier standing on the ground** (as tall as a town cluster at region zoom; detailed, lit, nation uniform), **a large clean national flag on a tall pole right beside him**; no dark slab — at most a soft round shadow.
- **Forests = dense instanced dark-green conifer/broadleaf canopies** covering whole regions, with clearings, fields and thin dirt roads between them.
- **Coast = a bright sand beach band**, then turquoise shallows, then deep blue sea with visible wave texture and specular glints.
- **Towns = a tight cluster of small detailed buildings** (roofs, walls, a flag), not boxes; a soft-edged **segmented selection ring** (green yours / red enemy) and a **nameplate** under it: name, country, small stats (population, income).
- (19:31, second reference "Another example of good army icons"): **when zoomed out, an army reads as a big national flag on a tall pole** (wide flag, readable from far away, small figure at its foot), so armies are easy to spot and count across the map; **towns are round walled clusters**; movement shows as **thick green arrows** along the route; rivers are wide and visible.
- (19:33, third reference, Rome-style campaign map "Another example"): **town nameplates = a pill in the owner's colour with a round emblem/flag disc on the left, city name in a classic serif and the region/country below** (shipped as a first cut 19:40); **armies = tall vertical banners in the nation colour with its emblem**, many of them so a front reads as a forest of banners; **turquoise shallow-water rings with white foam around every coast and island**; **roads as clear yellow lines** between towns; ships with sails/wakes at sea; painted relief with warm desert and green valleys.
- (19:36, fourth reference, Medieval-style campaign map): **every army = a figure on a small round base with a tall vertical banner** (nation emblem on the banner), visible at every zoom; castles/cities as small detailed models; **region and sea names lettered onto the map itself** in a classic serif (sea names wide-spaced italics, e.g. "Gulf of Aden", "Persian Gulf"); thin dashed sea-route lines; borders as soft owner-coloured lines; a painted, slightly parchment-toned terrain.
- Snow-capped mountains in the distance; soft atmospheric haze toward the horizon.

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

## BATTLE SECTION (added 2026-11-10 by the nightly queue, item "One look for everything")
Reference feel, from public screenshots/trailers only (never their assets): **Company of Heroes 3** and **Broken Arrow** at normal
gameplay zoom. What makes them read as one world, and what we score ourselves on:
B1. **One material language** — every vehicle's paint has the same sheen and wear, every tyre is the same matt black, every wall
    the same kind of plaster/concrete; nothing looks like a plastic toy next to a photo-scanned model. (Ours: `src/11c-look.js` classes.)
B2. **One palette per army** — a nation's vehicles, uniforms and buildings share a small set of colours; no toy-bright outliers.
B3. **Grounded** — contact shadows, dust on the lower hull the colour of the map's soil, tracks in the ground.
B4. **Surface detail at gameplay zoom** — chipped paint, canvas weave, stained concrete, cracked mud plaster readable without zooming in.
B5. **Silhouette quality** — models from one hand: same level of detail and proportions (this is the "code-built models" item).
B6. **Light** — one sun, soft shadows, haze, the same grade on every map of a theatre.
B7. **Smooth** — smooth-pc / smooth-mp green; draw calls never go up for a look change.
Protocol: `LOOK_OFF=1 node orch/lookshots.mjs` then `node orch/lookshots.mjs` (same battle, same camera: IR, US, IL, SA, RS, DW, RV on
the strait map) -> `orch/shots/look/before-*.jpg` / `after-*.jpg` + numbers; score B1-B7 honestly 1-5 in `orch/reports/look.md`
(append, dated). Never ship a lower score or more draw calls than before.
