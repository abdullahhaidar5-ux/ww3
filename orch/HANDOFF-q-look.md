# Handoff: orch/q-look — "One look for everything" (queue item, Abdullah 2026-11-09 22:44)

STATUS after night 1 (2026-11-10): **slice 1 shipped** — the shared battle material library exists and every battle material goes
through it. The item is NOT finished; continue here, do not restart. Report + scores: `orch/reports/look.md`; art bar: `orch/ART-BAR.md`
"BATTLE SECTION"; owner row in `orch/SYSTEMS.md` ("Battle material library").

## What exists (src/11c-look.js, ~35 lines of code + 4 embedded 256px CC0 photos)
- `LOOK.cls`: metal, canvas, concrete, mudbrick, sand, rubber, glass, wood, foliage — roughness `r`, metalness `m`, detail channel `ch`,
  tile size `ds` (world units), detail strength `da` (colour) / `dr` (roughness), max saturation `s`, lightness range `l`.
- `lookApply(c,key,team,src)` — called once per material at the end of `tintedProto` (src/11-models.js): picks the class (`lookClass`),
  clamps colour into the class range, sets PBR numbers, tints slice buildings to `LOOK.wall[fac]`.
- `lookTag(m,cls,keep)` — for the game's own materials (MAT.std, gear, kit, rocks, trees, hedgehogs).
- `lookShader(m,sh)` — called at the end of `weather()`'s onBeforeCompile: one sample of the detail texture (planar by dominant
  object normal, object position x world scale, so it sticks to moving and skinned models) -> colour and roughness detail;
  on the metal class anything near-black turns matte and non-metallic (tyres/tracks) so a vehicle stays ONE class = one merged draw call.
- `LOOK.pal(fac)` — a nation's derived palette (paint, camo, cloth, wall, trim). Only `wall` is applied so far.
- `?nolook=1` switches the library off (A/B only; not a player setting).
- Guards: `node orch/lookshots.mjs` (LOOK PASS; needs `orch/shots/look/before.json`, made by `LOOK_OFF=1 node orch/lookshots.mjs`),
  static check "0c" in `orch/decisions.mjs`.

## Lessons (do not repeat)
- **A class per part costs draw calls**: `matSig` (mergeTinted) merges parts that differ only in colour. Splitting a vehicle into
  metal + rubber + canvas raised the parade from 1697 to 1729 calls. Keep ONE class per untextured model; put differences in colour and
  let the shader react to it. Textured parts never merge, so they may have their real class.
- Give every class the look shader (amount 0 where it has no detail) — otherwise shader programs double (173 -> 205).
- The local box needs ~4 min to load a battle and ~1.5 min per screenshot (software GL); a lookshots run is ~25 min. Use CI (`gate/<sha>` branch) for the gates.

## Next (in this order)
1. **Tuning by eye on a real GPU** — night 1 could only judge software-GL stills. Strengths `da` were set by feel (.48 metal, .52 concrete,
   .58 mud-brick); Abdullah's feedback on the base close-up decides whether to go stronger.
2. **Bump from the same photos**: perturb the normal with dFdx/dFdy of the detail value (same trick as DE-BLOCK 4b in `weather()`), no new texture.
3. **Palette on vehicles and uniforms**: `LOOK.pal(fac)` -> pull non-VK vehicle keys and soldier kit towards `paint`/`cloth` the way VK keys already are
   (11-models.js tintedProto, the `LK` branch); add RV/OB/BI rows if FLOOK lacks them (check src/11z-nations-rv.js).
4. **Real draw-call reduction**: the library made values equal but calls stayed the same (1697 / 399 / 652 vs 658), so merges are limited by
   something else — find it with a per-key census of meshes in the parade shot (textured parts? moving parts? shadow pass?). An atlas for
   the small textured props would let them merge.
5. **Replace stand-in models** in the slice where a better free one exists — or leave to the queue item "Original models built in code"
   (not before 2026-11-11), which must use `LOOK.cls` via `lookTag`, never its own PBR numbers.
6. Re-score B1–B7 in `orch/reports/look.md` after each slice; the item is done when B1, B2, B4 are >= 4.
