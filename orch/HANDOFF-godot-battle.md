# HANDOFF — Godot Battle mode (branch `orch/godot-battle`, based on `orch/godot-run`)

Goal (Abdullah 2026-11-21 15:38): "Playable Godot Battle with 4 nations, AI and online play" (IR, RS, US, IL).

## What exists (all in `godot/scripts/battle/`, scene `godot/scenes/battle.tscn`)
- `battle.gd` — the Battle scene. **Extends `scripts/main.gd`** only to reuse its drawing helpers (`_build_mesh`,
  `_inst_mmi`, `_ring_mesh`, `_shahed_mesh`, `_grow`, `_fill`, `_boom`, `_draw_fx`, `_env`, `_camera`, `_style`, vars
  `cam`, `cam_target`, `cam_dist`, `fx`, `smoke`, `tracers`, `t`). If ORCH 2 renames those, update battle.gd.
  Setup screen (your nation, enemy, AI Easy/Normal/Hard, map, 1v1 / 2v2 with AI ally / free for all on 4-player maps,
  Play online, Back), Battle start = HQ + Construction Vehicle + Supply Truck + 2 infantry (sim), map ground, fog
  (enemies drawn only when seen; enemy buildings stay once seen), every unit/building kind = one MultiMesh, construction
  rises out of the ground, tracers/shells/explosions, rings + health bars, C&C controls (left select/box/double-click,
  right move/attack, F attack-move, X stop, Ctrl+A, H home, W A S D scroll, wheel zoom), dozer build menu with
  placement ghost (left place, Shift keeps placing, right cancel), production building: units + queue (click 1,
  Shift 5, right-click cancel one), rally (left/right-click ground), Sell/Repair, top bar money/power/army/time,
  minimap (click camera, right-click move), Victory/Defeat panel.
- `battle_look.gd` — model per (nation, kind), paint for white models, code-built derrick/box stand-ins.
- `battle_terrain.gd` — height field mesh from the map (hgrid), rock/road colours, water, woods as MultiMesh.
- `battle_net.gd` — online: lobby panel, order codec (ints), relay ticks → `sim_tick`. Relay constant `RELAY`
  (local `ws://127.0.0.1:8788` until ORCH deploys `ww3-godot-relay`, see `server-godot/README.md` on orch/godot-net).
- Rules + AI = the sim port **copied unchanged** from `orch/godot-sim` (`godot/sim/`, `godot/data/rules.json`,
  `map_bm_splitridge.json`); netcode copied unchanged from `orch/godot-net` (`godot/net/`). Re-copy when they move on;
  don't edit them here. New maps: `node tools-godot/battle_maps.mjs bm_fourmills:4 bm_ferryquarter:2`.
- main.gd hooks (2 marked `BATTLE HOOK` spots): BATTLE button on the Test range panel; `--battle`/`--battle-ai`/`--demo`
  open the Battle scene.
- New models in `godot/models/`: m_merkava, technical, m_msta, m_humvee, truck, sam, tent, b_turret, b_pad, b_radar,
  watertower, b_crane (gunzip + gltf-transform dequantize, then `godot --headless --import`).

## Check it
- AI vs AI to a result: `godot --headless --path godot res://scenes/battle.tscn -- --battle-ai --fac=IR --vs=US --seed=1 --minutes=40`
- Scripted human path: `... -- --demo --fac=IR --vs=US --diff=0 --minutes=12`
- Screenshot: `xvfb-run -a -s "-screen 0 1536x790x24" godot --path godot --rendering-driver opengl3 res://scenes/battle.tscn -- --battle-ai --fac=IR --vs=US --shot=out.png --shot-t=300 --cam=auto`
  (`--demo-ui=build|barracks` shows the build ghost / a queue). Shots: `orch/shots/godot-battle/`.
- Online: `cd server-godot && npm i && node local-server.mjs --port 8788`, then two clients
  `... -- --online=ws://127.0.0.1:8788 --code=bat234 --name=A --fac=RS --start-at=2 --demo --minutes=3` and the same
  with `--name=B --fac=IL` (no --start-at); compare their `HASH` lines. Results: `orch/reports/godot-battle-ai.md`.

## Honest gaps (priority order)
1. **Iran's AI loses 6/6** AI-vs-AI games; seat 1 wins 8/12 → balance of the GDScript port (orch/godot-sim).
2. Armies are small (10–30 units at 10 min) — the AI's pace from the JS numbers; "massive columns" not there yet.
3. Not in the sim yet: supply LINES (area is circles), generals' powers, leaders/signature assets, jets/transports,
   navy, garrisons. Their buttons are hidden (NO_TRAIN in battle.gd), not faked.
4. Soldiers are static rest-pose meshes (main.gd's merge drops skinning) — ORCH 2's drawing work.
5. Online: proven only on the local relay with the same binary; relay not deployed; web vs Windows float determinism
   unproven (sim uses floats); no snapshot/restore (desync repair off); no AI seats online; lobby is minimal.
6. Web export not built here (no export templates in the sandbox); speed of the GDScript sim is the limit for big
   fights (orch/godot-sim: ~11x slower than the JS).
