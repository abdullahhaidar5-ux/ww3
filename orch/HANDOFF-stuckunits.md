# HANDOFF stuckunits (2026-11-18)

Branch orch/stuckunits. Landing 1 = 4 movement fixes (src/03-sim.js setMove/reachXY/touchGoalB/stalled/separate/stepTo look-ahead/bridgeLanes, src/02-map.js bocc) + tests.

## Before -> after
- AI-vs-AI sweep, all 35 Battle maps, 10 game-min: **163 -> 52** stuck episodes (no progress 10 s with an order). Per map + causes: orch/reports/stuck.md.
- orch/chokepoint.mjs (9 scripted scenarios): 40 tanks over one bridge into a town **103 s -> 54.5 s, 3 stuck -> 0**; 60 infantry 42.5 -> 34.5 s; right-drag line over the bridge 57.5 -> 40 s; old code fails the gate on 3 scenarios, new code passes all.
- Sim cost per tick: flat within game-to-game noise.

## Guard
gate/stuckscan now = `node orch/stuckscan.mjs --short` (6 Battle maps, was running removed Conquest maps/modes) + `orch/chokepoint.mjs --gate` (each scenario under its time limit, nobody stalled 10 s).

## Next (not done)
- Remaining episodes are mostly AI armies on 6-8 player maps (Oasis, DMZ Iron, Hindu Kush) re-ordered through each other: look at AI attack-group orders.
- Dugouts/garrison exits and ships at coasts were not scripted (boats down a sea lane under 2 bridges pass).

## For Abdullah (2 minutes on PC)
Battle on **Ferry Quarter**: select 15-20 tanks, right-click on the far side of the middle bridge inside the town. They should file over the bridge and spread into the streets without any tank sitting jammed against a house or a parked tank. https://abdullahhaidar5-ux.github.io/ww3/
