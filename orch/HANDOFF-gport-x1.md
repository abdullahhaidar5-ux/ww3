# HANDOFF lane X1 (model export) - branch orch/gport-x1

The old JS game exports its own art for Godot. Re-exported, imported and looked at for all 22 nations on 2026-11-22 (KAIZEN 9b); state below is exact.

## What is in the branch
- `tools-godot/export_models.mjs` - loads js-final's built game in headless Chromium, and for every playable nation x every unit kind (BASE, 46)
  and building kind (STRUCT, 16) calls the game's own `addUnit`/`addBld` + `makeObj`, cleans the object, exports with three r186 GLTFExporter.
- `godot/models/auto/*.glb` (1054 files, 44.1 MB = 42.1 MiB) + `godot/models/auto/tex/*.webp` (226 shared textures, 2.4 MB) + their `.import` files.
- `godot/data/models.json` (2.8 MB) - the manifest. Read `_meta` first: it documents every field. Now also has `mat.wx`, `mat.camo.freq`,
  `mat.wall` and `_map` (rubble0-2, techb_quarry, techb_mine, techb_plant, techb_hosp, derrick, dugout).
- `godot/models/auto/x1_models.gd` - Godot helper: `build(nation, kind)` node tree, `merged(nation, kind)` one ArrayMesh per moving part
  (for MultiMesh), `soldier(nation, kind, look)` skinned soldier with AnimationPlayer.
- `tools-godot/x1_sheet.gd` - contact sheet drawn by Godot through that helper. Sheets in `orch/shots/gport-x1/`:
  `shia-`, `west-`, `east-`, `regional-` x `units.png` / `buildings.png` (8 files, all from this export).

## Numbers (committed export, full run 2026-11-22)
- 1364 of 1364 (nation, kind) pairs built, 0 failed, 0 page errors, 199 s. 9 more glb and 43 more textures than the first export
  (per-nation flags and paints that the stale material cache used to hide); size grew 1.3 MiB.
- Godot 4.4.1 `--headless --path godot --import`: exit 0, every glb and texture has its `.import`. The only error line is
  `Parameter "t" is null` (headless dummy renderer, once per newly imported glb, 620 times); no script or parse errors.
- Soldier clips baked from the game's own walkPose/postApply: idle, walk, run, crouch, prone, reload, grenade, die. No fire clip exists in the game.

## Format (why it is not one glb per look)
One self-contained glb per look was about 1 GB. So a look is a list in the manifest: `meshes:[{f shape file, p part, m 3x4 matrix, mat:[colour...], pal}]`
and `parts` (turret, blades, tailR, dish, cargo, flag...). Shape files are shared by all nations; paint is data:
material colour (linear rgb) and `pal` = per-nation vertex colours (file vertices white, alpha = slot/255). Soldiers: one skinned glb per
look (low detail for all, hi only for `inf` v0), clips in a shared `animFile`. KHR_mesh_quantization is NOT supported by Godot 4.4.1 (tested).
Textures are external shared files (Godot imports each once), not embedded.

## Verified by eye on the 8 sheets (2026-11-22)
- Every one of the 22 nations x 13 unit kinds and 10 building kinds on the sheets is there, complete, upright, on the ground and to
  scale with the rifleman standing next to it. No missing cell, no giant or tiny model.
- **Flags fixed.** Each nation's buildings and ships fly their own flag (checked in the files: the HQ/barracks/turret `flag` part is a
  different shape + texture per nation, e.g. IR 3dfd862e6665, US 957953cacb0a, RU 0e3d03317541, TR e12c468a86c1, CN, SA, EG, KP, GB, RS
  all different; and on the sheets: stars and stripes, Union Jack, tricolours, Israel, Ukraine, Russia, China, North Korea, India, Japan,
  South Korea, Pakistan, Saudi, UAE, Turkey, Egypt are readable). Team-colour trims differ per nation.
- Buildings: West/East/JP/KR/PK/IN/TR use the white concrete set, IR RS DW RV OB SA AE EG the Middle Eastern compound set. All textured.

## STILL WRONG (by nation and kind)
1. **Tank of IR, RV, CN, PK (and their `dtank`) = the T-72: black with tan/grey speckles. NOT fixed by the re-export.** The earlier
   diagnosis (colour lost under zero alpha) was wrong: the two textures in js-final's own `m_t72` file are opaque (no alpha at all) and the
   exported textures (3c2e377f5259, 2ef43cfa2455) carry the same pixels (70-80 % of texels near black, tiny light islands). Measured on the
   source file: with its own UVs + texture transform (x15.7) about 65 % of the surface lands on black texels. So Godot draws what the
   file says. The old JS screenshot `orch/shots/vehicles-real2/after/pc-IR-tank.jpg` (js-final) shows a clean flat tan T-72, so either the
   file was degraded later (512 px texture, charts smaller than a texel) or the JS game hides it; nobody has compared a fresh JS frame.
   Likely small fix once confirmed: in the export, fill the black gutter texels of this one model with the nearest light texel
   (or drop its texture and keep the paint colour). Not done: needs one JS frame to know the target look.
2. **Soldiers:** RV and OB soldiers have pink torso/arms/head with green trousers (unchanged from the first export). US GB FR DE IL UA JP KR
   SA AE TR EG all wear the same pale desert-camo uniform (looks cream/pink from the game camera); IR RS DW RU CN KP IN PK are green.
   The game paints soldier camouflage in a runtime shader that is not exported; not compared with the JS game.
3. **EG heli** is plain white (unpainted look). **KP tank** (T-62) and **TR tank** (Leopard 2) are one flat beige with no pattern.
   **FR, DE, AE, TR atgm** (tracked launcher) is pale blue-grey, lighter than every other vehicle. **RS, DW tank/aa** technicals are
   maroon/brown. All of these miss the runtime camouflage/weather shader (below); shapes and textures are complete.
4. **Shipyard** of the white-concrete nations looks washed out/half transparent next to the solid Middle Eastern one - not checked against JS.

## Not verified / gaps
- Sheets show 13 of the 46 unit kinds and 10 of the 16 building kinds; the other kinds were exported and imported but not looked at.
- Nothing was compared side by side with a JS frame (the export builds objects without rendering).
- Soldier clips play in Godot only as far as the helper loads them; the `--anims` sheet was never run. Retargeting `animFile` onto other
  looks is untested.
- `merged()` in the helper is untested.
- Runtime-only, listed per look under `runtime`, not drawn: camouflage/weathering shader (weather() in js-final:src/11-models.js 206-251),
  team ring, contact shadow, headlight pool, jet exhaust plume, scaffold, wreck burn material. RS/DW technicals look maroon without the camo shader.
- Hi-detail soldiers exist only for `inf` v0 per kit family (`--hi all|v0|inf|none`).

## Next steps (in order)
1. T-72: take one screenshot of the IR tank in the JS game (js-final, close zoom) and decide the fix in "STILL WRONG" 1.
2. Drawing lane: use `x1_models.gd`; port the weather/camo shader (and the soldier camouflage) - most of "STILL WRONG" 2-3 is that.
3. Sheets for the remaining kinds (`--kinds=` any BASE/STRUCT key), `--anims` and `merged()` are still untested.

## How to re-run
- Export (always ALL nations, palettes are computed across nations; ~3.5 min; prunes stale files):
  `THREE_DIR=<dir with three@0.186.0>/node_modules flock /tmp/ww3-heavy.lock node tools-godot/export_models.mjs`
  (without THREE_DIR it npm-installs three into tools-godot/out/x1-three).
- Import: `flock /tmp/ww3-heavy.lock godot --headless --path godot --import`, commit the new glb/webp/.import files.
- Sheet: `flock /tmp/ww3-heavy.lock xvfb-run -a -s "-screen 0 2600x3000x24" godot --path godot --rendering-driver opengl3 --resolution 2560x1200 -s ../tools-godot/x1_sheet.gd -- --nations=IR,RS,DW,RV,OB --kinds=inf,at,champ,tank,aa,arty,atgm,harv,dozer,heli,jet,drone,ship --cell=90 --out=<abs>.png`
  (buildings: `--kinds=hq,barracks,factory,gen,depot,airfield,turret,sam,uplink,shipyard --cell=200`; clips: add `--anims`;
  height used: 1200 for 5 nations, 1400 for 6, 800 for 3, 1800 for 8). About 1 minute each.
