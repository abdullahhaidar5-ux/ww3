# HANDOFF — groundreal (branch `orch/groundreal`)

Abdullah 2026-11-13 20:05 Chicago, photo of a desert Battle fight on his Windows laptop: "This ground texture is too cartoony".

## Done (view only; Conquest, Battle, Missions, Test range; nothing in `src/13*`)
- **Real photo ground** (`src/04-gfx.js`): a second ground atlas `TERR_DET2` (CC0 Poly Haven: aerial sand, dry cracked earth,
  rocky soil, packed dirt; 512 px layers; albedo + normal/roughness) blended on open ground in big natural patches
  (noise at 610 / 233 units with broken edges, extra mottling at 63 units, two-scale rotated samples so the tiling does not
  show). Desert maps get sand + cracked earth over rocky soil; green maps use it only where the ground is not grass;
  snow is unchanged. Worn packed dirt around every base and along roads. Mipmaps + anisotropic filtering on all of it.
- **Natural colors**: dry ground keeps 58% of its painted color (`TERR_SAT` in `src/02-map.js`) and the terrain shader
  pulls open ground toward a pale beige / gray-brown range (desert 52% color, +15% light; green 90%; mud 80%; snow none).
  The theater grade in `src/10-post.js` is untouched, so it works with all three looks (`?look=a|b|c`).
  Measured on the same desert spot: median ground saturation 0.46 → 0.37 after the warm grade.
- **Stair-stepped dark lines gone** — there were four sources:
  1. tank track prints: hard 16x32 hatched texture, flat quads cutting into slopes → soft 32x64 print with feathered sides
     and fading ends (overlapping prints join into one even rut), tilted to the ground under it (`src/05-fx3d.js`);
  2. road mask: the 16-unit sim grid (points snapped to cells) → a render-only mask drawn from the painted road curves and
     built roads at 4 units per texel, soft distance band, mipmapped (`roadTex` / `rdStamp`, `G.roadDraw` from 02-map);
  3. hairline crack strokes on the painted ground (~25,000 1-px lines, jagged when magnified) → off (`TERR_CRACKS=false`,
     same random numbers drawn so the map/trees are unchanged); the cracked-earth photo replaces them;
  4. trench floors: three separate near-black blocks per piece → overlapping dug-earth channel (`src/05b-tactfx.js`).
  Road edge ruts softer and wider; painted grain speckle weaker.
- Guard: `orch/decisions.mjs` (GROUND LOOK block): TERR_DET2 used by the terrain shader, detail textures mipmapped, road
  mask from curves at 4 units/texel and mipmapped, crack strokes off, old hard track texture gone.
- Proof script: `node orch/groundshots.mjs before|after` (SHOTS=desert,close,fort,mountain,green,snow; MTN=<map>).

## Gate
See the result line at the end of this file (one `orch/cigate.sh` run).

## Pictures (orch/concepts/groundreal/, before = main a3b627b, after = this branch)
- `before-desert.jpg` / `after-desert.jpg` — Battle, Tar Basin (desert), firefight at normal play zoom (his photo's view)
- `before-close.jpg` / `after-close.jpg` — same, close zoom
- `before-fort.jpg` / `after-fort.jpg` — a fortification (trench) line close-up
- `before-mountain.jpg` / `after-mountain.jpg` — Conquest, Hajar Mountains (desert mountains)
- `before-green.jpg` / `after-green.jpg` — Battle, Four Mills (green)
(The striped green/yellow rectangles in some pictures are crop fields / supply fields, not part of this change.)

## Credits (menu credits line `tdCred`)
Aerial Sand, Dry Ground 01, Aerial Ground Rock and Dry Ground Rocks by Rob Tuytel, via Poly Haven (polyhaven.com, CC0).

## Load size
+~600 KB of WebP (albedo 363 KB + normal/roughness 234 KB) inlined as base64: index.html +800 KB raw, +607 KB gzipped
(target was under 3 MB). No new draw calls; the ground shader samples the new layers only where they show and skips the
old soil samples where the photo ground covers it.

## Try this (2 minutes on PC)
https://abdullahhaidar5-ux.github.io/ww3/ → Single player → Battle → Tar Basin, start, drive 3 tanks across the open
ground in front of your base and zoom in: the ground should read as pale real desert (sand, cracked earth, small stones)
with soft tank ruts, and no dark stair-stepped lines.
