# Unit cap 500 - measurement (orch/captest, 2026-11-19)

Question (Abdullah 2026-11-18 18:22): what happens if the unit limit goes to 500? Measurement only: `POP_CAP=500` exists only on branch `orch/captest`; main stays 300.
Tool: `orch/capprobe.mjs` (same headless setup as `orch/smooth.mjs`, draw commands swallowed, CPU-side frame time; see SMOOTH.md), run on GitHub runners by `.github/workflows/captest.yml` (8 parallel jobs, one per row). Fulda map, 640x360, auto graphics, 150 measured frames, ~1 game minute of normal play, then armies added and sent into one or two big fights for ~20 s before measuring, camera on the densest patch. Raw numbers incl. CPU-profile top lists: `orch/reports/captest-raw.json`.

**Important - what "500" means:** the cap counts population, not bodies (infantry 1, light vehicle 2, tank/arty/aircraft 3). A mixed army at 500 pop is ~440-480 bodies; an all-infantry army would reach 500 bodies. So rows are named `fill=pop` (armies spawned up to the cap with a mixed infantry/vehicle/aircraft column, what a real player can field) and `fill=units` (same mix, filled by body count: the worst case, ~600-720 bodies at "500").

## Table (CPU-side frame ms on a GitHub runner; smaller is better; 16.7 ms = 60 fps)

| scenario (players-cap-fill) | units alive at start | median / p95 / p99 ms | worst 1% FPS | frames >50 ms (of 150) | sim step med / p95 ms | draw calls | k tris | checkpoint KB | ckpt save ms (encode+stringify) | ckpt load ms (parse+restore) |
|---|---|---|---|---|---|---|---|---|---|---|
| 2p-300-pop | 274 | 36.6 / 56.2 / 68.4 | 14.14 | 22 | 2.8 / 7.2 | 672 | 6264 | 332 | 12.7 | 22.6 |
| 2p-500-pop | 444 | 98.1 / 114.1 / 130.9 | 6.33 | 150 | 4.5 / 11.5 | 805 | 7833 | 498 | 22.2 | 30.9 |
| 8p-300-pop | 263 | 30.7 / 72.3 / 201.6 | 4.76 | 22 | 3.4 / 6.8 | 1310 | 4518 | 468 | 16.4 | 21.3 |
| 8p-500-pop | 355 | 121.6 / 251.7 / 355.9 | 2.67 | 150 | 4.9 / 10.9 | 2590 | 6775 | 529 | 19.8 | 31.3 |
| 2p-300-units | 445 | 97.6 / 124.9 / 143.2 | 5.87 | 150 | 6.1 / 16.1 | 783 | 7518 | 494 | 33.2 | 90.0 |
| 2p-500-units | 724 | 139.1 / 165.5 / 190.6 | 5.13 | 150 | 5.4 / 16.1 | 1368 | 11612 | 741 | 17.4 | 57.6 |
| 8p-300-units | 362 | 95.3 / 195.5 / 220 | 3.23 | 150 | 4 / 8.1 | 2566 | 8220 | 549 | 18.8 | 23.4 |
| 8p-500-units | 590 | 94 / 269.9 / 339.3 | 2.04 | 150 | 10.3 / 20.7 | 1691 | 4892 | 724 | 28.8 | 42.8 |

Caveats, in plain words: (1) the ~20 s fight before the measurement kills units, so "units alive at start" is lower than the target (the second team in a 1v1 had only ~300 of 500 pop left) - real late-game fights are heavier than 300-vs-300 rows suggest, not lighter. (2) Frame ms is game-code time only, not GPU: draw calls and triangles are the GPU hint. (3) Runner noise is large (the same build differs up to ~40%); only differences of 2x or more mean something. (4) The existing `smooth-pc` CI baseline (438 units, 8 players, other camera) reads 198 ms median, so absolute numbers are not comparable between the two tools - compare rows within this table. (5) NOT measured: the multiplayer host+client snapshot number - the mp profile of smooth.mjs needs the PeerJS stand-in plus real-time pacing and was not quick to reuse; see HANDOFF-captest.md.

## Verdict for Abdullah
At 300 per player the 1v1 fight (~270 bodies) costs ~37 ms per frame on the runner and the 8-player fight ~31 ms median with ugly spikes (p99 ~200 ms). Going to 500 makes the 1v1 about 2.7x slower (98 ms median, every frame over 50 ms) and 8 players about 4x slower (122 ms median, p95 250 ms, 2,600 draw calls): **500 is not smooth yet, not even for 1v1**, while the simulation itself is fine (one 60 Hz step stays under ~11 ms p95 at 500 pop, ~20 ms with 590-720 bodies) and the checkpoint stays small (330 -> 500-740 KB, save under 35 ms, load under 85 ms, so host migration is OK).
Hot spots (CPU profile, 500 pop 1v1): (1) the 3D scene tree - `updateMatrixWorld`/`multiplyMatrices`/`traverseVisible`/`updateMatrix` ~40% of the frame, because every unit is a small tree of objects whose matrices are recomputed each frame; (2) the three.js render-list/projection function `hu` (~15%) and per-object submission (8 players: `uniformMatrix4fv`, `bufferSubData` ~18%, draw calls 1,700-2,600); (3) `solbFill`/`syncScene`/`fxUpdate` (unit-over-building fill and per-unit sync, ~8%). Targeting, pathfinding and separation do not show up in the top lists.
Recommendation: **stay 300 until the scene tree is cheaper** (freeze matrices of parts that do not move, instance or merge unit meshes per kind, cut object count per unit); then re-run this probe. If 500 is wanted sooner, 500 only for 1v1/2v2 (fewer players = fewer draw calls) is the least-bad option, but it still failed the smoothness feel here, so I would not ship it before that work.

Top self-time lists per scenario (ms per frame, excluding idle): 2p-300-pop: hu 5.41; updateMatrixWorld 4.65; multiplyMatrices 3.17; traverseVisible 2.18; updateMatrix 1.97. 2p-500-pop: multiplyMatrices 19.08; hu 15.91; updateMatrixWorld 14; traverseVisible 6.85; solbFill 4.79. 8p-500-pop: uniformMatrix4fv 29.23; uniformMatrix3fv 13.89; hu 8.53; updateMatrixWorld 6.84; bufferSubData 4.96. 8p-500-units: uniformMatrix4fv 13.01; bufferSubData 12.85; hu 5.92; texSubImage2D 4.92; updateMatrixWorld 3.4.
