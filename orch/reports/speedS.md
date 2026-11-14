# speedS: stay smooth with 300 units (2026-11-11)

## Where the frame goes (slice 1)
Local profile only (`smooth.mjs --profile pc --phases`, cloud sandbox, ~440 units, draws swallowed, so relative shares only):

| rank | part of the frame | median ms | share |
|---|---|---|---|
| 1 | renderPost (three scene passes: shadow, AO depth, main + 7 post passes; ~1,650 draw calls) | 140.7 | ~88% |
| 2 | syncScene (per-unit scene update) | 4.8 (p95 12) | 3% |
| 3 | drawMini (minimap) | 2.3 | 1.4% |
| 4 | drawHUD | 2.1 | 1.3% |
| 5 | fxUpdate | 1.1 | 0.7% |

Simulation step p95 ~10 ms (not part of the frame split above; one 60 Hz tick). Everything but the render submission is small, so the wins are in how many times the scene is drawn per frame, not in JS per-unit loops.

## Changes
1. **AO depth pass at half rate when struggling** (`src/10-post.js`, `aoDue`): ambient occlusion re-renders the whole scene for depth each frame. Full detail on a fast machine (>=50 FPS, no step-down) still does it every frame (identical look); otherwise every other frame, previous AO reused. View only.
2. **One governor, two ladders** (`src/06-view.js`, `qualGov`): before, a CPU-bound frame (the usual case in a big fight) blocked every step-down, so Auto did nothing exactly when needed. Now `lv` (resolution + effects) steps when drawing is the bottleneck and `fx` (effects only: particle budget, shadows every 2nd frame, AO, film grain) steps when game code is. Step down after 1.5 s of missed frames; step up after a calm 10 s, the calm time doubles (to 80 s) whenever a step up had to be undone, 2 s minimum between steps: no flicker. Effect users read `fxLv()`.
3. Guard `orch/qualgov.mjs` (run by `orch/decisions.mjs`): heavy load -> steps down; load gone -> back to full; CPU-bound -> effects only; flicker backs off; steady fast frames -> no steps; Low stays at its own level.

Budgets/baselines untouched. No simulation files touched (no server update needed).

## Numbers
One GitHub run each (runner noise is up to ~40% between identical builds, so single runs prove little):

| smooth-pc / mp | baseline 29bc1f3 (run 42930965965 / mp run) | slice 1 cf33e78 (run 42932475164) |
|---|---|---|
| draw calls per frame | 1540 | 1273 (-17%) |
| k triangles per frame | 7984 | 6152 (-23%) |
| median frame ms (pc) | 210 | 208 |
| p95 / p99 frame ms (pc) | 292 / 371 | 401 / 556 (worse, within runner noise?) |
| mp client frame p95 ms | 363 | 460 (worse, same caveat) |
| gates | smooth-pc, smooth-mp, grandsmooth, decisions green (cfclient red on main) | same green; cfclient/mpsync-server not yet reported |

Verdict: GPU-side load clearly lower (fewer draw calls and triangles: that is what half-rate AO is for), CPU-side frame time not better and the tail looks worse in this single run. The landing rule (equal-or-better) is not met, so NOT landed. Next: re-run slice 1 once more to see if p95/p99 is noise (5-run median via smoothbase.yml on a `smoothbase/speedS` branch is the proper way), and look at why the tail grew (the half-rate AO makes alternate frames cheaper and the others unchanged, so p95 should not rise; suspect noise or the `aoDue` reset on `POST.dRT` change).

## Five runs each on GitHub's machines (nightly runner, 2026-11-11 evening) — the proper comparison
Same hour, same workflow (`smoothbase/*`, 5 runs per profile), main 068b3146 against this work merged onto it (14c950ff; the last
small commit 5d17a6a2 only removes a buffer rebuild on effects-only steps and was not re-measured). Medians (all five in brackets):

| smooth-pc, ~440 units | main 068b3146 | with this work |
|---|---|---|
| median frame ms | 207.6 (199–240) | **195.7** (156–199) — 6 % faster |
| p95 frame ms | 276.5 (233–353) | **240.7** (199–452) — 13 % faster |
| p99 frame ms | 304.9 (260–491) | 311.9 (227–650) — same within noise |
| sim step p95 ms | 15.6 | 13.7 |
| draw calls per frame | 1593 | **1190** (−25 %) |
| k triangles per frame | 8255 | **6079** (−26 %) |
| load time s | 114 | 94 |

| smooth-mp | main | with this work |
|---|---|---|
| snap interval p95 / order latency p95 ms | 155 / 112 | 154 / 110 |
| client frame p95 ms | 307 (184–393), second batch of five: 417 (214–735) | 489 (367–579), second batch (4 runs): ~320 (239–501) |

"client frame p95" is noise, not a difference: the multiplayer test stops the page's own loop, so the quality governor never runs there
(a diagnostic run printed level 0, effects level 0 on every client in both builds) and both builds do exactly the same work per frame
(median client frame 34–50 ms in both). The figure is the 2 slowest of only 40 frames, i.e. one-off hitches; main alone moved from 307 to 417
between two batches an hour apart. So: pc clearly better, mp the same code path. Budgets and pass marks untouched.

Also changed in this pass: when the machine is struggling the ambient-occlusion pass and the shadow pass now take turns (before, both
half-rate passes could fall on the same frame, so every other frame still paid for both), and an effects-only step no longer rebuilds
the picture buffers. Guard: orch/qualgov.mjs checks 7.

**Still open (slice 2):** real graphics cards are not measured by any test (GitHub's machines draw in software at ~5 FPS, where no
governor can reach the target) — needs a 2-minute look on a real PC with Settings > Show FPS in a big fight; then shadow pass skip for
far/static things and minimap/HUD at a lower rate while struggling.
