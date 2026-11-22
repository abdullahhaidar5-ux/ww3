# HANDOFF lane X1 (model export) - branch orch/gport-x1

The old JS game exports its own art for Godot. Stopped early on ORCH's wrap-up order (2026-11-22); state below is exact.

## What is in the branch
- `tools-godot/export_models.mjs` - loads js-final's built game in headless Chromium, and for every playable nation x every unit kind (BASE, 46)
  and building kind (STRUCT, 16) calls the game's own `addUnit`/`addBld` + `makeObj`, cleans the object, exports with three r186 GLTFExporter.
- `godot/models/auto/*.glb` (1045 files, 40.8 MB) + `godot/models/auto/tex/*.webp` (183 shared textures, 1.8 MB) + their `.import` files.
- `godot/data/models.json` (2.8 MB) - the manifest. Read `_meta` first: it documents every field.
- `godot/models/auto/x1_models.gd` - Godot helper: `build(nation, kind)` node tree, `merged(nation, kind)` one ArrayMesh per moving part
  (for MultiMesh), `soldier(nation, kind, look)` skinned soldier with AnimationPlayer.
- `tools-godot/x1_sheet.gd` - contact sheet drawn by Godot through that helper. `orch/shots/gport-x1/shia-units.png`, `shia-buildings.png`.

## Numbers (committed export)
- 1364 of 1364 (nation, kind) pairs built, 0 failed. Map extras exported in a scratch test only (see below).
- Godot 4.4.1 `--headless --path godot --import`: all 1045 glb + 183 textures imported, 59 s. The only errors: `Parameter "t" is null`
  once per glb (headless dummy renderer, also printed for the 34 older glbs of other lanes) and a parse error in
  `res://sim/sim_logistics.gd` (another lane's file).
- Soldier clips baked from the game's own walkPose/postApply: idle, walk, run, crouch, prone, reload, grenade, die. No fire clip exists in the game.

## Format (why it is not one glb per look)
One self-contained glb per look was about 1 GB. So a look is a list in the manifest: `meshes:[{f shape file, p part, m 3x4 matrix, mat:[colour...], pal}]`
and `parts` (turret, blades, tailR, dish, cargo, flag...). Shape files are shared by all nations; paint is data:
material colour (linear rgb) and `pal` = per-nation vertex colours (file vertices white, alpha = slot/255). Soldiers: one skinned glb per
look (low detail for all, hi only for `inf` v0), clips in a shared `animFile`. KHR_mesh_quantization is NOT supported by Godot 4.4.1 (tested).
Textures are external shared files (Godot imports each once), not embedded.

## KNOWN WRONG in the committed files (fixed in the script, export NOT re-run)
1. **Every building flies Iran's flag** (stale material cache). Fixed in `X.stdMat` (cache key now includes colour/texture).
2. **IR and RV tank (m_t72) is black with pale lines**: texture colour under zero alpha was lost in the canvas round trip. Fixed with
   `X.opaqueTex` / `X.pixels` (raw WebGL read-back). Other models with alpha-carrying textures may be affected the same way.
3. The script now also records `mat.wx`, `mat.camo.freq`, `mat.wall` and adds `_map` (3 rubble heaps, quarry, mine, plant, hospital,
   oil derrick, dugout) - these are NOT in the committed manifest. `_map` worked in a 2-nation scratch run; the three fixes above were
   being tested when the lane was stopped - **unverified**.

## Not verified / gaps
- Only the Shia sheets were rendered and looked at: models complete, textured, upright, to scale with the rifleman, apart from 1 and 2.
  West, East, Regional sheets were never rendered.
- Soldier clips play in Godot only as far as the helper loads them; the `--anims` sheet was never run. Retargeting `animFile` onto other
  looks is untested.
- `merged()` in the helper is untested.
- Runtime-only, listed per look under `runtime`, not drawn: camouflage/weathering shader (weather() in js-final:src/11-models.js 206-251),
  team ring, contact shadow, headlight pool, jet exhaust plume, scaffold, wreck burn material. RS/DW technicals look maroon without the camo shader.
- RV/OB soldiers show pink heads/hands in the sheet - not compared with the JS game.
- Hi-detail soldiers exist only for `inf` v0 per kit family (`--hi all|v0|inf|none`).

## Next steps (in order)
1. `THREE_DIR=<dir with three@0.186.0>/node_modules node tools-godot/export_models.mjs` (full run, ~3.5 min, prunes stale files; without
   THREE_DIR it npm-installs three into tools-godot/out/x1-three). Always run ALL nations: palettes are computed across nations.
2. `godot --headless --path godot --import`, commit the new glb/webp/.import files.
3. Sheets: `xvfb-run -a -s "-screen 0 2600x3000x24" godot --path godot --rendering-driver opengl3 --resolution 2560x1200 -s ../tools-godot/x1_sheet.gd -- --nations=IR,RS,DW,RV,OB --kinds=inf,at,champ,tank,aa,arty,atgm,harv,dozer,heli,jet,drone,ship --cell=90 --out=<abs>.png`
   (buildings: `--kinds=hq,barracks,factory,gen,depot,airfield,turret,sam,uplink,shipyard --cell=200`; clips: add `--anims`). Check flags and the T-72.
4. Drawing lane: use `x1_models.gd`; port the weather/camo shader if the paint must match.
