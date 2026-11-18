# HANDOFF smoothaudit (2026-11-17)

Abdullah 06:33 "Once these are all done, audit the game for smoothness. Ensure the game runs smoothly." Branch `orch/smoothaudit`.
Full report with the ranked top-10 causes: `orch/reports/smoothaudit.md`. View code only (06-view, 08c-logi, 08i-hud) - no
simulation change, battle servers need no move.

## Tool
`node orch/smoothaudit.mjs [big,duel,range,menu,m:<mission id>]` - per scene: frame ms (avg / 1%-low), sim ms per tick and per
unit, draw calls, triangles, programs, textures, heap, DOM mutations / forced layouts / 2D canvas calls per frame, and CPU sampling
profiles (top functions, self + inclusive) for the simulation alone and for whole frames. `EVAL='js' EVALONLY=1` runs a probe after
the scene is set up (used for the matrix-update census: patch `THREE.Object3D.prototype.updateMatrix` and count per top-level
entity, see the report). Software GL: compare relative numbers only.

## Landings (one cause each)
1. `3e31f76` **hidden units/buildings skip their subtree's matrix updates** (`umwVis`, 06-view). three.js r186 walks children even
   when `matrixWorldAutoUpdate` is off, so 65 000 of 73 555 matrix updates per frame (8 players) were for off-screen objects.
   Frame 72.5 -> 39-43 ms (render part 65.6 -> 32-36 ms). Guard: decisions.mjs counts updates under a hidden unit (must be 0).
2. `18470c3` (gated as 34ea914) **HUD stops forcing a page layout every frame** (lgUiTick minimap rect 2x/s, edgeTick screen/radio rects 4x/s).
   Forced layouts per frame 1.2-1.7 -> 0.2-0.3. Guards: decisions.mjs (static).
3. `15d7c0f` (rebased; first try ded9b66 broke walktest: frozen bones with `matrixAutoUpdate=false` went stale in the
   `updateWorldMatrix` path - now `boneKeep` keeps the local matrix but still flags the world update) **soldiers' never-animated bones composed once** (`boneFreeze`, 06-view; only the 9 bones in the walk table move).
   Matrix re-compositions per frame ~8 500 -> 4 529, bone ones 6 800 -> ~1 000. Guard: decisions.mjs (house-click soldier).

## Before / after (sandbox, 8 players on Rhine, ~340 units)
| | main f44fc89 | after 1+2+3 |
|---|---|---|
| frame avg / 1%-low | 72.5 / 177 ms | 34.2 / 88.7 ms (other runs 39-50 / 106-150: camera and machine vary) |
| matrix re-compositions per frame | 73 555 | 4 529 |
| forced layouts per frame | 1.2 | 0.1 |
| draw calls | 808 | 650-806 (unchanged - next job) |

## Gate notes
- `3e31f76`: 27/28 green incl. smooth-pc and smooth-mp; `gate/superfreeze` (its rangefreeze part) red on 2 attempts: single
  frames of 340-7400 ms with only 40-120 ms of game code in them (runner stalls; redfixE saw the same on main, 0783445/f9b4ec6).
  The check compares the longest frame to the *quiet* maximum; this build's quiet frames are ~2x faster (16 vs 30 ms normal on the
  same runners), so the same stall now crosses the limit more easily. Local A/B on OB (2 runs each): main 278 / 402 ms longest,
  this build 246 / 369 ms - no new stall. Next owner of rangefreeze: judge the game's own work in a long frame (sim + render + UI),
  or log time outside it separately, instead of the whole rAF gap.
- `34ea914`: migrate-down "client B never appeared in the host lobby" (the known p2p-fallback flake, redfixE); green on re-run.
- `ded9b66`: walktest red (real, fixed in 15d7c0f, see landing 3); superfreeze again OB "wave drone" (552 ms with 110 ms of game
  code, then 11 820 ms) - the same stall pattern; audio "second battle: battle music again" and migrate-down (known flakes).
- The OB / drone-wave stall keeps appearing on this branch's runs (also IR airlift, RS dsam): almost all of the frame is outside
  the game's code, often right after new GPU buffers/shader programs - most likely SwiftShader on the runner compiling/uploading
  in the GPU process while the page waits for the next frame. Worth a dedicated look (log `Profiler` + GPU process time for the
  OB drone wave), not a reason to loosen the check.

## Left (next fixes, biggest first - details in the report)
0. Test range with 332 units all on screen: 79 ms frames (1456 draw calls) - the worst case for the 300-on-screen target.
1. Draw calls (650-800 per frame + AO depth + shadow passes): merge building parts per material, merged/instanced far soldiers.
2. Bone textures uploaded every frame for every visible soldier (~218 uploads): refresh far figures every 2nd-3rd frame.
3. AO depth pre-pass `traverseVisible` (~1.8 ms sandbox) - cache the hide list.
4. Path-finding bursts (findPath 0.5-0.65 ms/tick, more when big groups get orders) - a deterministic per-tick budget.
5. drawHUD (~3 ms): on-screen test before `toScreen`, a Set for the selection.
6. updateUI every 0.2 s (4-8 ms in one frame) - write only changed text, spread over frames.
7. Main menu first seconds: map previews (`mkMap`) - cache them.

## Try for 2 minutes (PC)
https://abdullahhaidar5-ux.github.io/ww3/ -> Play -> Battle -> the biggest map with 7 computer players, Medium graphics, speed up
to the mid game and scroll across a big fight with Settings > Show FPS & ping on: the FPS and "1% low" should be clearly higher
than yesterday, especially when the camera is on one corner of a crowded map.
- `15d7c0f`: green (28/28) after one re-run of smooth-pc (attempt 1 on a slow runner: sim step p95 19.1 ms vs 9.5 on the other
  runs - the simulation is untouched by this branch). Note: `orch/cigate.sh` waits for N=27 results but there are 28 gates now,
  so it can print its verdict before the last job (here `controls`) finishes - check the 28th status before landing.
