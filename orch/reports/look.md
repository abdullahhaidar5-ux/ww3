# One look for everything — report (orch/q-look)

## 2026-11-10 (night 1): the shared material library — slice 1
**What changed for the player:** every unit, building and prop in a battle now gets its surface from ONE library
(`src/11c-look.js`): painted metal, canvas/fatigues, concrete, mud-brick, sand/stone, rubber, glass, wood, foliage. Each class has
one roughness/metalness, one colour range, and photo detail from four free CC0 photos (ambientCG PaintedMetal004 + Fabric036,
Poly Haven plaster_grey_04 + clay_block_wall; credited in the menu credits). Buildings of IR, RS, DW, RV, IL, SA and US take their
wall colour from the nation's palette (mud-straw plaster, limestone, brown mud-brick, yellow brick, pale stone, sand plaster, expeditionary concrete).

**Numbers** (same battle and cameras, `orch/lookshots.mjs`, 7 slice nations on the strait map, 80 parade units):
| | before | after |
|---|---|---|
| draw calls: parade / parade close / base | 1697 / 399 / 658 | 1697 / 399 / 652 |
| triangles | same | same |
| shader programs | 173 | 172 |
| distinct roughness/metalness pairs on unit+building materials | 15 | 11 |
| most saturated plain-colour material (HSL s) | 0.73 | 0.46 |
| materials without a surface class | 186 of 186 | 0 of 185 |

**Honest scores (1-5, paying player vs. the references), before -> after**
| | before | after | why |
|---|---|---|---|
| B1 one material language | 2.5 | 3 | same sheen/wear rules for all; the change is real but subtle at gameplay zoom |
| B2 one palette per army | 3 | 3.5 | outliers clamped; slice buildings follow the nation wall colour |
| B3 grounded | 3.5 | 3.5 | unchanged |
| B4 surface detail | 2.5 | 3 | photo detail visible when zoomed in; too fine to read from far |
| B5 silhouettes from one hand | 2 | 2 | not touched - this is the code-built models item (queued, not before 2026-11-11) |
| B6 light | 3.5 | 3.5 | checked: light/sky/post come from one table keyed by time of day + map theme, with no per-map overrides - every desert map of the slice already shares one setting (the Middle East maps use 4 themes: desert, green, temperate, snow) |
| B7 smooth | pass | pass | draw calls equal or lower; one extra texture sample per pixel on units/buildings |

**Pictures (before on top, after below):** `orch/shots/look/compare-parade-close.jpg`, `orch/shots/look/compare-base.jpg` (taken before the photo detail was strengthened by about 40% in the same ship; raw shots are re-made by `orch/lookshots.mjs`).

**Not done yet (see orch/HANDOFF-q-look.md):** stronger per-nation identity on vehicles and uniforms (palette is derived but only
walls use it so far), a normal/bump layer from the same photos, replacing stand-in models, real draw-call reduction (the
library keeps them equal; merging textured parts needs an atlas), and a tuning pass by eye on a real GPU.
