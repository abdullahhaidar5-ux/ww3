# HANDOFF — lane P1 = THE JS-SIM BRIDGE (branch `orch/gport-p1`)

ORCH 2026-11-22: the Godot WEB build runs the browser game's own JavaScript simulation; Godot renders, UI, sound.
**Contract for every lane: `godot/bridge/README.md`** (API, 18-float entity record, flags, events, teams, map, orders, tables).

## Done (seen working)
- `tools-godot/build_bridge.mjs` → `godot/web/ww3sim.js`: `src/01-03` (the `SIM_FILES` list of orch/headless.mjs) + its
  deterministic driver + `window.WW3`. No Three.js / DOM (same stand-ins as Node).
- `godot/bridge/sim_bridge.gd` (JavaScriptBridge, one JS call + 2 buffer copies per step), `bridge_sim.gd` (adapter:
  old `Sim` interface for battle.gd), `bridge_selftest.gd` (`index.html?bridge-test`), `godot/web/shell.html`
  (loads `ww3sim.js` before the engine).
- `godot/export_presets.cfg`: **one line changed** in the Web preset: `html/custom_html_shell="res://web/shell.html"`
  (P7 owns the file - told ORCH). `ww3sim.js` must sit next to `index.html`: `tools-godot/export_web.sh` does it.
- battle.gd: 6 small spots marked `P1 BRIDGE` (bridge sim by default, URL switches on the web, web-only error on
  desktop, `--gdsim` keeps the parked GDScript rules); main.gd: `P1 BRIDGE` lines at the BATTLE HOOK (URL switches).
- `.gitignore`: `godot-build/`.

## Numbers (cloud sandbox CPU, 2026-11-22)
| What | Result |
|---|---|
| `node tools-godot/bridge_test.mjs` | BRIDGE PASS: hash = orch/headless.mjs after 180 s; move / build / train orders from a human seat work |
| `--nations` | all 22 playable nations start and run 60 s |
| `--long` (Node) | IR/US/RU/TR on Four Mills, 10 game-minutes: 0.51 ms per tick, worst 30 Hz frame 28.5 ms |
| Web export in headless Chromium, `?bridge-test&minutes=10` | same battle: **hash identical to Node at every one of the 10 minutes**; JS 0.41 ms per tick, Godot read 0.27 ms per step, worst step 19.5 ms |
| `?bridge-test&bench` | 500 units a side attack-moving, 60 s: JS 7.6 ms per tick, Godot read 0.35 ms, worst tick 94 ms |
| `--bench` (Node) | same scene: 11.4 ms per tick mean (includes state fill + JSON), worst 141 ms |
| `?battle-ai&fac=IR&vs=US` (the real battle scene on the bridge) | starts and draws on the bridge (terrain, base, HUD money/power/army/clock, minimap: `orch/shots/godot-bridge/battle-ai.png`), 0 console errors; software GL in the sandbox gives ~1 FPS, so only 8 game-seconds passed in 4 min - **not yet seen on a real GPU, no fight seen in the scene** |

## Not done / honest gaps
1. battle.gd still draws through the adapter (per-entity GDScript objects) and knows 4 nations and 3 maps in its
   menus; the sim accepts all 22 nations and every JS map. P4/P6 should move to `sim.br` + `tables()`.
2. Events: battle.gd uses only `boom`; everything else (tracers `tr`, `muz`, voices `say`/`shout`, `log` feed) is
   delivered in `sim.br.events` but nobody plays it yet (P4/P5/P6).
3. Online (P7): orders are the JS `act()` objects, state hash = `sim.br.state_hash()`; no snapshot/restore exposed yet
   (the JS has checkpoints in src/07b-ckpt.js - not bundled; say if needed). battle_net.gd still encodes the old
   GDScript order shapes; `bridge_sim.apply_order` translates those.
4. `teams[].leader` is only a flag; leader ability cooldowns, superweapon details and per-power costs are thin in
   `teams` / `rules()` - extend `teamRows` / `rules` in build_bridge.mjs when the UI needs them.
5. Fog is recomputed on request (`fog(team)`), from sight circles - cheap but not the JS renderer's exact fog.
6. Selling through the adapter: `{t:"sell"}` passes through unchanged (same shape as JS).
7. Windows / desktop: no simulation (by ORCH's decision); `--gdsim` runs the old partial GDScript rules.

## Parked: GDScript port of supply lines / garrisons (stopped on ORCH's order)
`godot/sim/sim_logistics.gd` is an unfinished draft: **does not parse yet** (one type error at `c2` in `cmd`), never
run, not hooked. `tools-godot/p1_maps.mjs` works (adds roads / bridges / garrisonable buildings to the map JSONs).

## Next helper: start here
`tools-godot/export_web.sh && node tools-godot/web_test.mjs "bridge-test&minutes=2"`; then read `godot/bridge/README.md`.
