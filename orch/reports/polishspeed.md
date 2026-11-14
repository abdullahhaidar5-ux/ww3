# polishspeed - Battle frame cost (2026-11-14)

Measured with `node orch/smooth.mjs --profile pc --scene` (new probe: scene census + per-pass timing) on the same sandbox before/after.
Scene: 8-player Fulda fight, ~450 units, 16.5k scene objects (9.3k visible), 341 draw calls colour / 590 with shadows.
Sandbox timing is slow and noisy and draws are swallowed - only the CPU-side render prep is measured; GitHub gates decide.

## Where the time was (`--phases`, 150 frames): median frame 128 ms
renderPost 110 (86 %), syncScene 5.3, fxUpdate 1.5, drawHUD 2.1, drawMini 2.2 (already 30 Hz), sim step p95 12. So draw submission, not sim/HUD/fx.
Inside renderPost: depth pre-pass 21 ms, colour+shadow pass 30 ms, post passes ~15 ms (software GL), AO traverse ~8-16 ms.
Cause: every `R3.render()` re-computed the matrix of all 16.5k objects (~12 ms), and the AO pre-pass walked the whole scene incl. invisible subtrees.

## Changes
1. `renderPost` brings matrices up to date once, then renders (depth + colour) with `SCN.matrixWorldAutoUpdate=false` (restored in `finally`). No visual change.
2. AO depth pre-pass hides non-depth objects with `traverseVisible` (skips ~7k hidden objects' subtrees).
3. Building props (pallets, barrels, containers: ~4,000 objects) get `matrixAutoUpdate=false` (they never move relative to their building).

## Before / after (probe, same machine)
| | before | after |
|---|---|---|
| renderPost total | 80 ms | 50 ms |
| depth pre-pass render | 20.8 | 9.1 |
| colour+shadow render | 29.6 | 19.3 |
| scene matrix update | 11.9 | 3.9 |
| objects with per-frame matrix compose | 16,512 | 12,557 |
| draw calls | 590 | 590 (unchanged) |

Not done (next): merge static building props into the building's merged mesh (421 pallets / 162 barrels as separate meshes), LOD for far infantry, half-rate shadow map for far cascades. Look near the camera is untouched; sim/sync untouched.
