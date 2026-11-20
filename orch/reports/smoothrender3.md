# Smooth render 3 (orch/pack-systems, 2026-11-20)
View only. Change: `bInstMerged` (src/11-models.js) merges each building model part per material once per (model, tint); every copy shares the merged shapes and the same materials.
Cap probe on a GitHub runner (run 44659475366, Fulda, fill by population):
| row | frame med / p95 ms | draw calls | runner bench |
|---|---|---|---|
| 8 players, 300 | 29 / 51 | 1272 | 8.7 |
| 8 players, 500 | 85 / 195 | 1793 | 14.8 |
Verdict: 8 players at 500 is about 3x the frame time of 8 players at 300 (part of it a slower runner, bench 14.8 vs 8.7, but still far from the ~10% target); the CPU profile is dominated by WebGL calls (uniformMatrix4fv, bufferSubData, texSubImage2D), i.e. per-draw and per-upload cost, not JavaScript. popCap therefore stays 500 for 1-4 players and 300 for 5-8.
Next steps (not done): helicopter far-LOD (~20 draw calls each), instancing identical vehicles/soldiers, fewer per-frame texture/buffer uploads (bone textures), shadow pass for far objects; re-run the Cap test after each.

## Re-run on main + building merge (2026-11-20 08:10 UTC, Cap test run 44694682036, commit 960f566 = main 732b70f src)
8 players, map fulda, software GL on a GitHub runner (relative numbers only):
- 8p/300: median frame 42.2 ms, p95 154.7, 1333 draw calls, 264 units placed.
- 8p/500: median frame 103.3 ms, p95 250.8, 1743 draw calls, 386 units placed.
- Ratio 500/300 = 2.45x median (limit was 1.3x). Verdict: popCap stays 300 for 5-8 players; NOT changed.
Profile at 500 is dominated by GPU-upload calls, not draw calls: bufferSubData 21%, uniformMatrix4fv 18.7%, texSubImage2D 7.2% (at 300: idle 32%, uniformMatrix4fv 5%, bufferSubData 3.9%). So the next win is per-frame uploads (soldier bone texture / instance buffers / per-object matrices), not more model merging: upload only changed or on-screen figures, skip far soldiers' bone updates. The building merge (now on main) did not change the draw-call count enough to matter.
