# BRIEF — one-page state of World War 3 (onegame helper, 2026-11-14)

## What the game is now
Browser RTS in the style of C&C Generals Zero Hour, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only. **One game: Battle** (+ Test range, story Missions, one Tutorial) — Abdullah 2026-11-13 20:18 "Abandon
conquest and campaign entirely remove them from the game". Vision (20:38): "a super super polished and smooth and beautiful battle game
and test range" — polish, smoothness and beauty before new features. Battles are hosted on Cloudflare (servers update automatically).

## Battle in one paragraph
Command Center + dozer + supply truck; money from supply trucks, oil derricks and captured map buildings; Barracks / War Factory /
Airfield, tech tree, generals' powers; win = destroy every enemy building. **Supply lines** (20:19, 20:43, 20:53): the roads running out
of your buildings, depots and held map buildings are green on the minimap (L on the ground); units there or near your buildings refill
ammo; outside, they fight until empty (20:06, no timers). Craters, blown bridges, enemy checkpoints and enemy troops on a road cut the line
(dashed). Every old Conquest map is a Battle map (Battle maps first in the picker).

## Menu
Play (Battle · Missions · Tutorial · Load game) · Multiplayer (Battle only) · Test range · Settings · Extras · Credits; Continue when a
Battle save exists.

## In flight
- orch/onegame (this change) waits for the conductor, who lands it after the Battle branches already in flight (orch/techbldgs:
  capturable quarry / mine / power plant / field hospital; orch/ammozone: its ammo rule is already merged into onegame).
- After techbldgs lands: make the map power plants (M.plants, capturable pw rows) its `plant` type (one system), see orch/HANDOFF-onegame.md.

## Where to find things
- How to work and test: orch/HOWTO.md · the central plan: orch/PLAN-SAT.md · what each system owns: orch/SYSTEMS.md
- Standing decisions: CLAUDE.md (+ the dated record orch/DECISIONS.md) · what shipped and when: orch/HISTORY.md
- Rule for every change: build.py → smoke.mjs (SMOKE PASS) → decisions.mjs (DECISIONS PASS) → commit src/ + index.html together;
  then one orch/cigate.sh run on GitHub (25 jobs).
