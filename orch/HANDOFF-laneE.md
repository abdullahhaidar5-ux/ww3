# HANDOFF laneE (2026-11-07 ~03:00Z)
Shipped: warmer/richer desert grade (src/10-post.js TGRADE), controls hint now one clipped line (src/08-ui.js CSS), shot script `node orch/laneEshots.mjs <tag> [map] [fac]` (~4 min/shot on software GL; run in background; close-up shot's camera angle is wrong — tilt not set).
Open: E1 soldiers (current sol_* models read small/plain at gameplay height; need bigger kit/LOD tune or real CC0 model), E2 buildings, E3 terrain texture detail/AO, E4, rest of E5.
Note: local smooth mp profile fails on this slow box (jitter/desync) — unrelated to visuals; CI branches have no workflow, so verify on main.
(03:50Z) +soldier size x1.45 shipped. Still open: E1 better soldier model/kit, E2 buildings, E3 terrain detail, E4, E5. smooth.mjs times out locally (>10 min) — rely on CI on main.
