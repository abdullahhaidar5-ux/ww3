# Handoff — orch/mapscale (believable scale on the campaign map, close zoom)

State: finished and gated; waiting for the conductor to land it. Do not land before rebasing on main (train 3 touches the same file).

What changed (drawing only — no town data, simulation or checkpoint change):
- `src/13e-grand3d.js`: `g3Towns` gives every town a footprint radius `R` (rule: `G3_TOWN_W` share of the province width, `G3_TOWN_R` cap, inside its province, on land, no overlaps) and a drawing scale `ds`; the beige plate (`A.disc`) is gone; props, chimney smoke, lights, war smoke and the selection ring follow `R`/`ds`; `g3TownPlace` draws the core clusters `G3_TOWN_MID` times bigger in the middle view (same instanced meshes); `g3FigScale`/`g3Anchors` keep close-view army figures no taller than their town is wide, beside the town, on land; `g3Afloat` shows an army as a ship when its island is not drawn at all.
- `src/13e2-groads.js`: road world widths 1.7/0.8/0.5 -> 0.55/0.3/0.2 (pixel minimums unchanged).
- Label lane, one number only: the name-plate lift above a town (`+9`) now follows the town size, otherwise plates floated far above the small towns. Expect a small conflict here with train 3 — keep their code, keep the lift `(tw?tw.R*1.2+1.5:4)+(p.cap?1:0)`.
- Guard: `mapscale` block in `orch/grandtest.mjs`. Pictures: `orch/concepts/scale/`.

Gate on 0cb27488 (run 43068092149): every gate green except `cfclient` (red on main too) and `mpsync` (battle netcode, untouched by this branch; failed 2/11 live checks on the first try and passed on the re-run of the same commit, 353 s — a flaky test, not this change).

Found, not mine: the terrain has no land at all for Crete, Sardinia, Hawaii and ~30 small islands, and only 3-4 cells for Taiwan's Taipei and Northern Cyprus (province raster says land, height field says sea). Their plates float on water; their armies now show as ships. Owner: terrain/coast lane.
Not done: figures and flags from the middle view outwards are unchanged (still large at region zoom) — train 3 ("flags wave only in the close view") and orch/armytokens own that.
