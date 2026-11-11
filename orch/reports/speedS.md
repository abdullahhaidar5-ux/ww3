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
Baseline (origin/main 29bc1f3, CI) and after: see below (filled in from the gate runs).
