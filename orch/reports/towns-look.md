# Towns look (Abdullah 2026-11-05 06:21: "How can these buildings look better?")

Visuals only — sim footprints, heights, positions untouched (03-sim / 01-data / 02-map / 07* not edited).
Code: `src/04c-townlook.js` (new) + hooks in `buildCity()` (`04-gfx.js`) + the city wall shader.

## Stage 1 — Middle East (mideast / lebanon / yemen / southasia styles) — shipped
* Flat roofs with varied parapets, cornice band, grimy stone plinth, set-back upper storeys with terraces/pergolas.
* Arched doors with frames and steps, shop fronts with striped awnings + crates, balconies with railings, wall AC units, drain pipes.
* Rooftop clutter: water tanks, stair heads, dishes, solar panels, rebar stubs.
* Shutters (green / blue / brown louvres) and arched window tops drawn in the wall shader; plaster patches, damp streaks, dirt at the base.
* War wear: bullet pocks (clustered) and soot scorch on ~45 % of buildings (static, per building).
* Plot patches (beaten earth / paving) under every building, courtyard walls with gate gaps on low houses, palms and shrubs.
* A proper domed mosque per town: prayer hall, drum + dome (teal for Shia lands), arched iwan portal, courtyard, two minarets with balcony, upper shaft, cap and finial.
* Streets: asphalt carriageway + kerb/pavement strips following the terrain, centre dashes, power poles with cables, parked cars, market stalls in the town heart.

## Stage 2 — Europe, snow country, Korea / East Asia — shipped (first pass)
* Europe / Russia low houses: pitched gable roofs (tile or slate, snow cap on snow maps), eaves, gutters, chimneys, porch canopies, picket fences, lawns, trees; a church with nave + tower + spire per town.
* Korea / Asia: grey-tile roofs on low houses, parapet + rooftop clutter + coloured shop signs on blocks; street trees.
* Tall Soviet blocks (> 24 m) and the other styles (america, turkey, gulfcity, latin) keep the old look — still open.

## Performance
* Old: one merged mesh pair for the whole map. New: **one mesh per town** (walls + details in a single mesh, `bt.z = -1` marks detail vertices so the window shader skips them); all hamlets share one chunk. Far towns are frustum-culled, and a collapsing building only rebuilds its own town (cache keyed by the town's dead-building signature; ownership flips no longer rebuild anything).
* smooth-pc: SMOOTH PASS (draw calls 1063 vs baseline 1110, kTris 6162 vs 6255).
* Not done: distance LOD for far towns (culling covers most of it).

## Not done yet (backlog)
1. CC0 plaster/brick/roof texture atlas — all surface detail is still procedural in the shader (no textures were added, so no new credits).
2. War wear tied to live town HP (wear is static per building; collapsed buildings still use realism's rubble).
3. Broken / fallen trees from shelling; a comrade dragging a wounded soldier.
4. Tall Soviet blocks, America, Turkey, Gulf, Latin town styles; Arctic-specific steep roofs on all snow towns; yards with gardens for Korea.
5. Civic buildings (mosque/clinic/school of the civic system) — their models are separate and were not touched.

Screenshots (before / after, same camera): `orch/shots/towns-look/` — `before-*` vs `after5-*` for zagros (Iran town + mosque close-up), lebanon (Mountain Shias village), fulda (European town), dmz (Korean town). Tool: `node orch/townshots.mjs <tag> map:NATION:style ...` (`INDEX_FILE=` serves an older build for "before").
