# Smooth render 3 (orch/pack-systems, 2026-11-20)
View only. Change: `bInstMerged` (src/11-models.js) merges each building model part per material once per (model, tint); every copy shares the merged shapes and the same materials.
Cap probe on a GitHub runner (run 44659475366, Fulda, fill by population):
| row | frame med / p95 ms | draw calls | runner bench |
|---|---|---|---|
| 8 players, 300 | 29 / 51 | 1272 | 8.7 |
| 8 players, 500 | 85 / 195 | 1793 | 14.8 |
Verdict: 8 players at 500 is about 3x the frame time of 8 players at 300 (part of it a slower runner, bench 14.8 vs 8.7, but still far from the ~10% target); the CPU profile is dominated by WebGL calls (uniformMatrix4fv, bufferSubData, texSubImage2D), i.e. per-draw and per-upload cost, not JavaScript. popCap therefore stays 500 for 1-4 players and 300 for 5-8.
Next steps (not done): helicopter far-LOD (~20 draw calls each), instancing identical vehicles/soldiers, fewer per-frame texture/buffer uploads (bone textures), shadow pass for far objects; re-run the Cap test after each.
