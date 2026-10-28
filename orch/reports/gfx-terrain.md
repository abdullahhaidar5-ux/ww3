# Graphics Phase 3: terrain (branch `orch/gfx-terrain`, `src/04-gfx.js` only)

**What looks different**
- PC: real ground textures with normal maps (grass, soil, rock, snow, gravel), blended by colour, slope and theme. They fade out far from the camera.
- Gravel on roads. Wet, shiny sand at the waterline.
- Water: foam that breaks into patches, a second line of surf, small ripples (PC).
- Big explosions leave burn marks and dented craters in the ground that stay all battle. This is drawing only: it hooks the existing `crater()`/`scorch()` calls.
- Phones (`gfxPhone()`/low): the old look, with less work per pixel.

**Textures:** ambientCG Ground037, Ground054, Rock030, Snow006, Gravel022. All CC0, about 130 KB embedded, credited in the menu.

**Frame times** (median ms, software GPU, so compare before → after only)

| map | overview | close-up |
|---|---|---|
| desert rubalkhali | 12745→12890 | 7401→8280 |
| forest fulda | 11000→11079 | 6440→7715 |
| snow arctic | 7431→7551 | 3963→5056 |
| urban emirates | 13379→13773 | 7004→8525 |
| water islands | 6829→6283 | 4549→5701 |
| mountains zagros | 12230→11865 | 6861→8145 |
| phone 390×844, 4× CPU | | fulda 6639→6271, rubalkhali 7592→7481 |

Desktop close-ups cost +12–28% on the software GPU. Phones are slightly faster.

Shots are in `orch/shots/gfx-terrain/`. Harness: `orch/gfxterrain.mjs`.

**CIGATE:** 16/16 PASS (with `origin/main` merged).
