# HANDOFF pack-looks (2026-11-18)
Branch `orch/pack-looks`. Files: 04-gfx, 05-fx3d, 10-post, 11-models.

## Done
1. **Instanced soldiers landed on main (8900437)**: e43e0d1 (SOLB) cherry-picked, plus the superfreeze fix: strike rock chunks (CHUNKG) now carry one shared `customDepthMaterial` (`chunkDM()` in 05-fx3d), in the strike and in the warm-up, so the shadow pass no longer builds a new vertex-array/program mid-strike. Own gate (5250b98, same code before rebase) 27/27 green incl. superfreeze, smooth-pc, smooth-mp. Guard in decisions.mjs ("rock chunks"). DECISIONS "Next feature choices" line is on main. Not measured with `smoothaudit.mjs big` (sandbox too slow for it) - run it on a fast machine for before/after.

## Left (in order)
2. Shadow pass: `shadowDue()` (10-post) already halves shadow redraws on low fps / fxLv>=2; next: also half-rate on Medium with a still camera. drawHUD health-bar layer lives in src/06-view.js (controlsfeel's lane, not mine) - plan in orch/reports/smoothaudit.md #6.
3. National vehicles in code (Shia factions first).
4. Live day cycle + weather, visual only, via G.tod()/G.wx() with fixed defaults.
Note: the sandbox cannot finish smoke/decisions locally in <2 min and each cigate took 35-60 min on GitHub; one landing per run is the realistic pace.

## Try for 2 minutes (PC)
https://abdullahhaidar5-ux.github.io/ww3/ -> Test range -> Iran vs United States -> Barracks: Shift+click 5x each infantry kind, send them at the enemy, zoom in/out over the crowd with Settings > Show FPS: soldiers should look as before (uniforms, rifles, legs, shadows) with steadier FPS; then fire a Strike and check nothing hitches when the rocks fly.
