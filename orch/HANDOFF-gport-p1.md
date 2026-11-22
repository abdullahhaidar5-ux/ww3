# HANDOFF — lane P1 (branch `orch/gport-p1`)

## 2026-11-22 — task switched by ORCH: P1 is now THE JS-SIM BRIDGE
The Godot web build will run the original JavaScript simulation (src/) in the page; Godot renders, UI, sound.
Contract for the other lanes: `godot/bridge/README.md` (being written first).

## Parked: GDScript port of supply lines / garrisons (stopped on ORCH's order, NOT finished)
- `godot/sim/sim_logistics.gd` — translation of src/03c-logistics.js (road graph, depots as nodes, reach/trade, cuts by
  enemy troops, cover + beads, craters, bridges, checkpoints, road mines, road capture, engineer jobs, AI).
  **Never run: not hooked into sim.gd, not even parsed by Godot yet.** Treat as a draft.
- `tools-godot/p1_maps.mjs` — works: adds `lg` (road nodes + polylines), `bridges` (with deck cells), `civ` + `civAt`
  (garrisonable buildings) to `godot/data/map_*.json` (ran for the 3 maps; other keys untouched).
- Not started: sim_garrison.gd, ammo trucks, hooks, p1_test.gd.
- Note for whoever resumes: the JS has vehicles' hull-down OFF (`vposCan` returns false, Abdullah 2026-11-14 14:55);
  transports in the 4 nations are only airlift (air) and lander (naval).
