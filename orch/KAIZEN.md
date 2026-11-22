# KAIZEN queue — Godot port, slowest/cheapest mode (Abdullah 2026-11-22 "Slowest cheapest kaizen")

Rule: ONE small step at a time. Each step = one small change on `orch/godot-port` -> `tools-godot/check.sh` -> push.
No parallel lanes, no scheduled tasks. A step that grows gets split. Land on main only when the check passes in full
and a player can see or feel the improvement. No picture to Abdullah needed before landing (2026-11-22 "No need to
make a picture and waste time"); ORCH still runs the automatic check.

Lane notes to reuse (do not re-read the code from scratch): orch/HANDOFF-gport-{a,b,c,d,e,f}.md on branches
`orch/gport-a` .. `orch/gport-f`; exports on `orch/gport-x1` (models) and `orch/gport-x2` (data, text, icons).

## Queue (top = next)
3. Pickers list all 22 nations and every Battle map (from the bridge tables / X2 data).
4. HUD on the JS sim: selecting a dozer or a production building works (adapter fields the HUD reads).
5. Orders in the JS sim's format: guard, enter, unload, dig in.
6. Minimap and end report on the JS sim.
7. Generals' powers and leader abilities (orders + panel).
8. Sound events: audio sees the sim's events before battle.gd drains them (under attack, low power, impacts).
9. Units drawn in bulk from the bridge buffers (boxes first, measure 1,000 / 2,000 units), then X1's models.
9b. Re-run the model export (branch orch/gport-x1: flag-on-every-building and black IR/RV tank are fixed in the script but the files were not regenerated), then merge orch/gport-x1 and orch/gport-x2.
10. Animated soldiers.
11. World: every map's ground, buildings from X1, effects, supply lines on the ground (L).
12. Saves by sim snapshot; Continue; Test range with enemy AI; Missions and Tutorial on the JS sim.
13. Online on the JS sim (snapshot resync first), then the relay deploy.

## Done
- 2026-11-22: Godot 4.4.1 installed for all lanes; lanes P5 (audio), P6 (HUD, menus), P7 (online) merged;
  check.sh, godot/OWNERS.md, orch/BRIEF.md written. check.sh has NOT yet passed in full (battle step).
- 2026-11-22: step 1 done - check.sh passes in full: 9 steps, 159 s total (web step 92 s; the AI battle reaches 60
  game-seconds in 34 s instead of not in 900 s, 0 console errors, IR 6 units 5 buildings, US 7 units 5 buildings).
  How: `?ff=150` (CHECK HOOK in battle.gd) asks the worker sim for 150 ticks in one call instead of waiting on drawn frames.
- 2026-11-22: step 2 done - a battle starts on any Battle map of the JS sim, map taken from the bridge (no json, no
  silent Split Ridge; an unknown key or a map the sim swaps is an error message on screen). Node
  (`node tools-godot/bridge_test.mjs --maps`, 2.5 min): 35 of 35 Battle maps start with their fewest and most players;
  the sim's table has 122 map rows but only 35 are Battle maps (`tables().maps[].battle` = 1, with `min` / `max`
  players, from src/02d-battlemaps.js BATTLE_MAPS) - the sim swaps any other key or player count for another map, so
  step 3's map picker must list only those 35. Browser (`node tools-godot/check_web.mjs --maps
  lebanon,yemen,aegean,bm_breakwater:ffa`, on demand, 5.7 min): South Lebanon 9160x6280 2 players, Yemen Highlands
  10440x7160 4, Aegean Islands 9680x6680 6, Breakwater 6400x4400 4: right map key, every side alive after 60
  game-seconds, 0 console errors; `?map=no_such_map` shows the error. Picture: orch/shots/check/map-other.png.
  check.sh CHECK PASS in 263 s. Not done here: chosen start spots are not sent to the JS sim yet (seats take the
  map's order); the command-line free-for-all repeats nations (only 4 in the old rules.json) until step 3.
