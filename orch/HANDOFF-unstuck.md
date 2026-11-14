# HANDOFF — unstuck (branch `orch/unstuck2`)

Abdullah 2026-11-13 17:26 "Focus all effort on wrapping up conquest and battle", 17:31 "Can we start on these now?" (stuck units + controls).
Branch note: my first push (`orch/unstuck`) was made before a rebase onto train 13; I am not allowed to force-push, so the rebased work is on **`orch/unstuck2`** (3 commits on top of main a3b627b). `orch/unstuck` is stale — ignore it. Lock branch: `taken/unstuck`.

## What shipped
- **orch/stuckscan.mjs** — headless AI-vs-AI scan on every map (Conquest + Battle). Counts a ground/sea unit with a move/attack-move order that moves < 14 px for 10 s while > 70 px from its goal (not disabled / abandoned / stunned / loaded / fighting) and any unit standing on a tile it cannot stand on. `--short` = 6 maps x 2 modes x 9 game-minutes, wired into the gate as `gate/stuckscan` (fails above 8 episodes; the code before the fixes had 11 on it, now 3). Full table: orch/reports/stuck.md.
- **orch/controlscheck.mjs** — `gate/controlscheck`: Ctrl+A whole army, Q camera turn (tap 45°, Shift+Q other way, Home / double-tap north-up, hold Q + mouse), W A S D scroll only (no order, no attack-move/stop), X stop, F/G arm and Esc cancels, rally point by left-click on the ground with a production building selected. Everything else on the controls list (select, box, Shift add, double-click same type, right-click move/attack, right-drag line, Ctrl force-fire, Alt waypoints, deselect-after-order / Shift keeps, enter/leave by right-click) was already covered by orch/controls.mjs + enterexit.mjs (`gate/controls`). **No control was broken**; nothing needed a fix. Gate now counts 30 jobs (`orch/cigate.sh` N=30, `main-gate.yml` < 30).
- **Sim fixes (src/03-sim.js)**, each one measured with a probe before the change:
  1. Bridge ramps: `bridgeLanes` pulled any unit within 44 px of a bridge back into its lane every tick, so a unit leaving the first 40 px of a deck sideways (or walking past the side) never got off — an artillery piece and a soldier held each other there for ~60 s on Volga. Lane pull now only acts on the deck itself, not on the 40 px ramps or beside it. Volga Conquest 8 → 0.
  2. Corner slide: when a vehicle's diagonal move was blocked on one axis it kept only 60% of its speed per tick, so it crawled (0.8 px/s) around a one-tile corner for ~10 s. Now 97%.
  3. Parked vehicles: a vehicle behind a stationary one (dozer clearing rubble) leaned on it for 13 s; avoidance now adds a clear 0.8 s sidestep heading.
  4. Straight routes: a direct "straight line" route ignored buildings, so tanks/artillery drove into the HQ/factory side and leaned on it until the unstick timer ran out. `losB()` now counts buildings.
  No new sim state needs a checkpoint (`avO`/`avT` live 0.8 s, like the existing `npT`/`sbT` unstick fields, which are not checkpointed either). No Math.random added; the scan ran the sim with the frozen clock.

## Stuck counts (28 maps, 2 players, seed 1, 7 game-minutes, Conquest + Battle)
| | stuck episodes |
|---|---|
| before | 18 (arty/tanks/AT leaning on a unit/building/bridge ramp: 15; infantry standing in water/rock: 3) |
| after all four fixes | **8** |
Short gate set (6 maps, 9 min): seed 1 before 11 → after 3; seeds 2, 3 before 6 / 16, after the first two fixes 4 / 13 (not re-run after the bridge fix). Counts carry noise of a few episodes because the games diverge once movement changes.

## Still open (see orch/reports/stuck.md "Remaining")
- Units that stop 9–31 px from a building they just left (HQ, factory, barracks, airfield, SAM): 5 of the 8 left. Probably the building footprint push in `separate()` against a vehicle that heads straight through the building's corner; needs a per-building exit/approach fix.
- Infantry standing in water or on rock after unloading / being pushed (embedded, 2–3 per scan) — a unit on a blocked tile has no path; `separate()` could move it to the nearest passable tile.
- "Units that ignore an order" and ships at coasts were scanned (no naval episodes found) but not stress-tested with a big army order; the 150-unit column test of the QUEUE item is still worth doing.

## Gate
`orch/cigate.sh` on 0540d970ee: **30 of 30 green** (incl. smooth-pc, smooth-mp, grandsmooth, mpsync, controls, stuckscan, controlscheck, decisions). `audio` failed once (known flaky), passed on the single re-run. Local: build.py + --check OK; local smoke/decisions were too slow here (software GL) and were left to the GitHub run. Not landed on main — conductor's call.

## Try this for 2 minutes (PC)
Start a Conquest on **Volga** (or any map with a long bridge), build a few artillery pieces and tanks, and send them across the bridge, then back off the bridge ramp sideways with a move order. Also park a dozer clearing rubble in front of a tank column and send the tanks past it: they should slide around instead of leaning on it. Tell me if any unit still stops dead for more than ~5 seconds.
