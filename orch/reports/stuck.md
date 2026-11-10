# Stuck units sweep (orch/dashI, 2026-11-10)

`node orch/stucktest.mjs` (CI job `gate/stuck`): on each map, a mixed 150-unit column (infantry, anti-tank, tanks, AA,
artillery, supply trucks) is ordered across the map along 3 routes (enemy base, map centre, far corner) and the real sim
runs 110 s with nobody else giving orders. It counts, per run:

- **stalled** — units with a move order that make < 6 px progress in 8 s while > 80 px from the goal
- **piled** — units inside a pile-up (> 6 units within 40 px) that makes no progress for 10 s
- **abandoned** — units that lost their order far (> 220 px) from the goal and stand still (the move "gave up")
- **idle-under-fire** — a second scenario: halted group, enemy armour attack-moves in; units that could hurt the shooter,
  have it in range and still stand idle for > 4 s

Options: `--full` (14 maps), `--maps a,b`, `--routes 0,2`, `--modes move,fire`, `--json out.json` (adds per-unit traces and
an ASCII map of the wedge site), `STUCK_ROOT=<dir>` to test another checkout (e.g. a worktree of main for before/after).

## Before / after (same sandbox, lebanon + aleppo, routes 0 and 2, 4 runs)

| | stalled | piled | abandoned | total |
|---|---|---|---|---|
| main (before) | 24 | 2 | 20 | **46** |
| this change | 25 | 2 | 9 | **36** |

Earlier 4-map x 3-route baseline on main (lebanon, bosphorus, golan, aleppo): 57 stalled+piled over 12 runs; idle-under-fire
8-9 per map with the first (too strict) measure, 0 once only units that can hurt the shooter count (infantry without AT
standing idle next to tanks is by design: "idle units do not charge armour they can barely scratch").

## Causes found and fixed (src/03-sim.js)

1. `stalled()` gave a move order up after 16 s without progress even 6000 px from the goal, so units at the back of a queue
   at a gap just stopped for good — and then stood in the gap as blockers. Now: far from the goal (> 250 px) it waits 45 s;
   at 11 s of no progress the unit slips through comrades (`u.gh`, ally-only separation skipped for 2.5 s) and re-plans.
2. Idle comrades were immovable: a mover pushing against an idle ally got pushed back. `separate()` now lets the mover
   shoulder the idle ally aside (0.9 / 0.1 split) — allies only, deterministic.
3. Sidestep unstick (2.5 s) always tried the same 5 spots at 45-80 px; now it widens with each failed attempt
   (up to 3.1x) and also tries backwards and 45 degree spots.

All three are pure functions of sim state (no Math.random), applied to player and AI units alike.

## Still open (handoff)

~6 stalled units per 150 per route remain, mostly short (8-12 s) transients: the start of the column inside the base
(spawn among buildings, an idle dozer in the way) and trucks/artillery queueing at narrow town gaps. Next ideas: lane
discipline for vehicles at gaps (bridgeLanes generalised to any gap < 3 radii wide), re-assigning formation slots when the
slot's cell is unreachable. Guard allows 40 over the CI set (measured 36) so it only catches regressions.
