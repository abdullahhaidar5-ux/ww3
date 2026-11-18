# HANDOFF smoothaudit2 (2026-11-17/18)

Abdullah 2026-11-17 06:33 "Audit the game for smoothness. Ensure the game runs smoothly." Follows orch/HANDOFF-smoothaudit.md.
Branch `orch/smoothaudit2`. View/graphics code only (05-fx3d, 10-post, 11-models) - no simulation change, servers need no move.

## Landed
1. `7cc0afd` (on main) **no shader linked mid-game for worn paint**: `weather()` program key held uniform values (amount/kind/
   pattern/wall); a Palestine barracks (wear 1.35) linked 3 programs in the Test range. Guard: decisions.mjs.
   Also on main with it: DECISIONS line "Keep Saturday" (RS keeps the 2026-11-14 voices; orch/voices-lb2 NOT to be merged).
2. NOT LANDED (on this branch only) - `e43e0d1` **instanced soldiers** (`SOLB` in 11-models): one instanced draw per soldier look, bones in one shared texture
   (covers audit items (a) and most of (b)). See the report's smoothaudit2 section for numbers. Guard: decisions.mjs.
   Look: same shader output (weathering base height and look-detail scale passed per instance); soldiers just outside the
   screen no longer cast shadows into it. Kill switch for testing: `SOLB.on=false` before a battle starts.

## Why e43e0d1 is not on main (blocker, start here)
Its cigate run is green except `gate/superfreeze` (superfreeze.mjs part, 2 of 2 runs): IR 11 / 8 and US 8 / 7 "new meshes"
(max 6) vs 4 / 1 on 7cc0afd. Local A/B with `VAO=1 node orch/superfreeze.mjs IR`: with SOLB on, the strike creates 5 new
vertex arrays for the shared rock-chunk shapes (`CHUNKG`, 05-fx3d chunks()) in the SHADOW pass (`MeshDepthMaterial`
program P5 instead of the one warmed in Battle); with `SOLB.on=false` (same build) and with `solbAO` disabled it is
5 / 5 vs 0: it is the batching itself, not the AO pass. three.js r186 shares one `_depthMaterial` for every shadow caster
and mutates it per object (side, map, alphaTest...), so the chunk depth program depends on what was drawn before it;
next step: log the full program key (P99 vs P5) of the chunk depth draw in the warm-up 'missiles' step vs the strike
(orch/superfreeze.mjs VAO=1 with the program cacheKey added to `__cur`), or simply also warm the chunks with the depth
variant the strike uses. smooth-mp and migrate-down were green on re-run.

## Gate notes (important for whoever lands next)
- **gate/superfreeze is flaky on unchanged main** (~40% red since 2026-11-16). Traced on runners (`TRACE=1 TRACEMS=100
  node orch/rangefreeze.mjs IR,RS,US,OB`): long frames hold 20-130 ms of game code; the rest is a GPU-process task
  (SwiftShader `Scheduler::RunTask` 150-650 ms) or V8 compile threads. The superfreeze.mjs part also flakes on VAO counts
  (debris icosahedrons + a re-merged building, max 6, pre-existing). A proposal to judge only the page's own busy time in
  rangefreeze (main-thread heartbeat) was blocked as loosening a gate - needs Abdullah's/ORCH's yes. Until then: re-run.
- smooth-mp "order latency p95" first attempts spike (7cc0afd: 746 then 108 PASS); e43e0d1 was 974/312 on its first run -
  re-run queued; if it stays high, suspect the extra `R3.render(SOLB.root)` in the AO pass on the host and test with
  `SOLB.on=false`.
- migrate-down "client B never appeared" = known p2p-fallback flake.

## Left (next, in order)
- (b) rest: far soldiers' bone rows could refresh every 2nd frame (now one upload, so small gain).
- (c) AO depth pre-pass: `traverseVisible` to hide transparent objects costs ~2-6 ms/frame (291 ms self in a range profile).
  Plan: cache the drawable leaves per top-level scene child (bones are 42 500 of the 72 000 objects), invalidate on add/remove.
- (d) path-finding bursts: deterministic per-tick budget (online sync!).
- (e) drawHUD 2D layer: on-screen test before `toScreen`, Set for the selection.
- New top draw-call sources after (a): instanced props/groups ~170/frame, vehicles ~130/frame (many parts) - merge static parts.

## Try for 2 minutes (PC)
https://abdullahhaidar5-ux.github.io/ww3/ -> Test range -> Iran vs United States -> Barracks: Shift+click 5x every infantry
kind twice, send them at the enemy and zoom in and out over the crowd with Settings > Show FPS on: the soldiers should look
exactly as before (uniforms, rifles, walking legs, shadows) and the FPS should hold better with 100+ soldiers on screen.
