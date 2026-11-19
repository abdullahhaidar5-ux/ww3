# HANDOFF smooth-render (2026-11-19)
Branch `orch/smooth-render`. Report with numbers + verdict: `orch/reports/smoothrender.md`.
Done: A hidden meshless bones, B rigid standing soldiers (`rgUMW/rgTick/rgBuild` in src/06-view.js, `solbFill` uses `RGS` in src/11-models.js, `wSet` counts bone changes in `WCH`), C breath quantised, B2 at most 12 figures measured per frame. Guards in orch/decisions.mjs.
Measured (GitHub runners, noisy): 1v1/300 ~-40%, 1v1/500 ~-40%, 8p/300 0-30%, 8p/500 no gain (draw calls bound).
Left: (1) merge/instance static meshes of buildings (~55 meshes each) and helicopters (~9 each) per material - the 8-player cost; (2) walking soldiers are still animated every frame; (3) vehicles are only ~10 objects each, so instancing them is lower value than first thought; (4) re-run `Cap test` (push to this branch) after each step.
POP_CAP untouched (ORCH 2 decides).
Try on PC (2 minutes): start a Battle, zoom the camera out over a big fight, then slowly zoom in and out again; soldiers should look exactly as before (standing, breathing, crouching, firing) and the frame rate in big fights should feel steadier. Tell us if any soldier looks frozen, floats, or pops when it starts walking.
