# Graphics Phase 3: terrain and world (branch `orch/gfx-terrain`)

**What looks different** (only `src/04-gfx.js`):
- **Real ground textures on PCs.** Grass, soil, rock, snow and gravel, blended by colour, slope and theme, with normal maps, so the ground has grain and relief up close. They fade out far from the camera, where they would only blur anyway.
- **Gravel on roads**, laid along the map's road network.
- **Wet sand** at the waterline: darker and shinier.
- **Water:** the shoreline foam now breaks up into patches, with a second line of surf and small moving ripples (PC).
- **Lasting battle scars.** Each big explosion leaves a burn mark and a dented crater in the ground itself, lit like the terrain, and they stay all battle. The old 90/180 decal limit no longer erases them. This is drawing only: it hooks the existing `crater()`/`scorch()` calls and the simulation never reads it.
- **Phones** (`gfxPhone()` / Graphics: low) keep the old look with lighter work per pixel: no texture layers, and the procedural bump is gone.

**Textures:** ambientCG Ground037, Ground054, Rock030, Snow006, Gravel022, all **CC0**. Each map is 256 px per layer, about 130 KB embedded in the page, and credited in the menu.

**Frame times** (median ms per frame; software GPU in the cloud, so compare before vs after only):

| map | overview | ground close-up |
|---|---|---|
| desert (rubalkhali) | 12745 → 12890 | 7401 → 8280 |
| forest (fulda) | 11000 → 11079 | 6440 → 7715 |
| snow (arctic) | 7431 → 7551 | 3963 → 5056 |
| urban (emirates) | 13379 → 13773 | 7004 → 8525 |
| water (islands) | 6829 → 6283 | 4549 → 5701 |
| mountains (zagros) | 12230 → 11865 | 6861 → 8145 |
| **phone** 390×844, 4× CPU: fulda / rubalkhali | | 6639 → 6271 / 7592 → 7481 |

On the software GPU, desktop close-ups cost +12–28% (texture reads are expensive there). Phones got slightly faster.

Shots are in `orch/shots/gfx-terrain/`. Harness: `orch/gfxterrain.mjs`.

**CIGATE:** 16/16 PASS on `bbf7767` (with `origin/main` merged).
