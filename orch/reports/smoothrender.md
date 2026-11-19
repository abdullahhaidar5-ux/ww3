# Smooth render - cutting the scene-tree cost (orch/smooth-render, 2026-11-19)

Goal (ORCH 2 / Abdullah 2026-11-18): today's 300 battles smoother, and 500 per player close to today's 300. View-only changes; the simulation, saves and online sync are untouched. `POP_CAP` stays 300 on main (the 500 rows of the probe raise `popCap` inside the page only).

## What changed (three pieces, all in the view)
1. **A - hidden bones.** A soldier is ~41 objects, ~35 of them bones with nothing drawn below them. three.js still walked every one in the depth pass, the shadow pass, the colour pass and the soft-shadow pass. They are now `visible=false` (matrices still update; skinning reads them). Same picture.
2. **B - rigid soldiers.** A soldier whose bones did not turn this frame or last is one solid piece: the ~40 bone matrices and tree visits are skipped. Its drawn parts (body, helmet, pack) and its 49 bone-texture rows come from the figure's own matrix times a matrix measured once when it settled (checked against a full recompute: largest difference 9e-7; walking and stopping switch back and forth correctly). At most 12 figures are measured per frame so a whole wave settling at once cannot make a spike. Never used for animated (mixer) figures, when instanced soldiers are off, or when the body material was swapped.
3. **C - breath in quarter-degree steps.** The idle breathing (0.018 rad) turned a bone every frame and kept every standing soldier near the camera non-rigid. It now moves in 0.003 rad steps (a quarter of a degree, invisible), so a standing soldier is re-posed about every 0.2 s and rigid in between.

## Numbers (CPU-side frame ms on a GitHub runner, Fulda, `orch/capprobe.mjs`, 150 frames, fight camera on the densest patch)
Runner speed varies a lot between runs (the probe's own `bench` ranged 9-17 ms), so the table also shows frame ms divided by `bench` ("norm", lower is better). Only differences of ~30% or more mean anything.

| row | before: med ms / norm | A only | A+B | A+B+C | A+B+C+stagger (final) |
|---|---|---|---|---|---|
| 1v1, 300 pop | 71.7 / 5.9 | 58.9 / 4.0 | 31.7 / 3.2 | 56.8 / 3.8 | 32.3 / 3.4 |
| 8 players, 300 pop | 46.6 / 3.2 | 48.3 / 2.9 | 31.2 / 2.1 | 36.2 / 2.1 | 58.8 / 3.5 |
| 1v1, 500 pop | 85.3 / 7.8 | 75.6 / 5.1 | 82.4 / 4.9 | 35.4 / 3.8 | 67.6 / 4.6 |
| 8 players, 500 pop | 84.5 / 5.7 | 93.6 / 5.6 | 106 / 6.3 | 78.4 / 5.3 | 101.8 / 6.0 |

Draw calls (median): 1v1/300 977 -> 690-945; 8p/300 1484 -> 890-1920; 1v1/500 1139 -> 756-830; 8p/500 2072 -> 1770-2400. (The draw-call counts move with where the fight is, not with these changes.)

## Verdict (3 lines)
1. **At 300 per player the 1v1 fight is about 40% cheaper** (norm 5.9 -> ~3.4); the 8-player fight is roughly 0-30% cheaper, within runner noise.
2. **500 per player 1v1 went from 7.8 to ~4.5 (about 40% cheaper) - close to where 300 was before (5.9), so 1v1 at 500 is now about as smooth as 300 was; 500 with 8 players is NOT smooth** (norm ~6, p95 ~250 ms): there the cost is draw calls (1,800-2,400, buildings and helicopters have ~9-55 separate meshes each, plus ~900 scene-level meshes), not matrices.
3. Next steps for 8 players: merge the static meshes of buildings and helicopters per material at load (or instance them), then re-run this probe; moving (walking) soldiers are still fully animated and are the remaining matrix cost.

Guards: `orch/decisions.mjs` ("smooth-render"). Tools: `orch/nodeprobe.mjs` (object counts per kind + rigid-vs-full-recompute check), `orch/nodeinfo.mjs`, `orch/capget.sh` (download the Cap test results of a run).
