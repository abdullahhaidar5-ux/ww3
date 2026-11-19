# Smooth render 2 (orch/smooth-render2, 2026-11-19)

View-only; simulation, saves and sync untouched; `POP_CAP` still 300 (the 500 rows raise `popCap` inside the page only).

## What the hide probe showed (baseline, GitHub runner, `orch/hideprobe.mjs`)
Frame ms with one object kind hidden: 8 players / 500: all 94 -> helicopters hidden 25 (draw calls 2122 -> 1010), buildings hidden 41-105 (calls -250), infantry 32-86, vehicles 30-94. 1v1 / 500: all 66 -> infantry hidden 20, vehicles 48, helicopters 55, buildings 60. So helicopters (~20 draw calls each) drive the 8-player cost, soldiers the 1v1 cost. A modelled HQ is only ~29 visible meshes (the "55" counted ~30 hidden ones), almost all with their own texture, so merging buildings per material gains little.

## Changes
1. `staticMerge` (src/11-models.js): after an object is fully built, plain static meshes under it are baked into one mesh per material (and shadow flags). Animated parts (flag, dish, crane, rotors), skinned/instanced/vertex-animated meshes are left alone. Buildings: called at the end of `makeObj` (not garrisons). Same materials, so the picture is the same.
2. Aircraft: static parts merged the same way; the rotor blades and tail rotor are merged inside their own spinning group (heli 19 -> 14 meshes, airlift 20-21 -> 15-16).
3. Soldiers (item 3) NOT shipped: re-posing far walkers every 2nd frame failed `orch/walktest.mjs` at zoom 450/700 (it samples the stride frame to frame; 160 failures, run 44476060528), and the test/budgets must not be changed. Idea left: do it only for soldiers outside the walktest zoom range, or measure stride over 2 frames.

## Numbers (CPU frame ms on a GitHub runner, Fulda, `orch/capprobe.mjs`; runner speed varies, "norm" = ms / bench)
| row | before (run 44473747704) med / p95 / calls / norm | after (run 44475131161) |
|---|---|---|
| 1v1, 300 | 38.5 / 58 / 673 / 3.3 | 60.7 / 84 / 690 / 3.6 |
| 8 players, 300 | 45 / 119 / 1138 / 4.5 | 20.2 / 35 / 863 / 2.2 |
| 1v1, 500 | 75.5 / 109 / 1036 / 6.1 | 72.2 / 107 / 759 / 4.3 |
| 8 players, 500 | 84 / 190 / 2267 / 5.7 | 51.4 / 147 / 1376 / 4.8 |
Draw calls fell 25-40% in every crowded row; milliseconds are noisy (1v1/300 "bench" differed 11.7 vs 16.7).

## Verdict (3 lines)
1. 1v1: 500 per player is about as smooth as 300 was before smooth render 1 (norm ~4.3 vs 5.9), but not yet clearly better than today's 300.
2. 2v2: not measured separately; it sits between the 1v1 and 8-player rows.
3. 8 players: 500 is still NOT smooth (p95 ~150 ms, norm 4.8); 300 is fine (norm 2.2). Do not raise POP_CAP yet; next: far-LOD for helicopters (fewer parts when zoomed out) and merging glass/vertex-colour meshes.

## Update (landed part)
Only the aircraft merge landed. The building merge made `loadfreeze` (14 programs linked at once) and `superfreeze` (new depth programs, 437-817 ms frames) fail on GitHub's runners while main was green; with it removed the gate is 27/27 green. Numbers above that depend on buildings (draw calls of 1v1 rows) are therefore slightly optimistic; helicopter savings (19 -> 14 meshes) stand.
