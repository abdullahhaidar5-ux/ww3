# OWNERS — who edits which file of the Godot edition (ORCH, 2026-11-22)

**Rule: edit only your lane's files.** A one-line hook in another lane's file is allowed if it is marked
`# LANE X HOOK` (X = your lane letter) and does nothing else than call into your own file. Shared files: ask ORCH.
Every lane passes `tools-godot/check.sh` before ORCH merges it (heavy steps queue on `/tmp/ww3-heavy.lock`).
The battle simulation is the browser game's JavaScript (lane P1 bridge, `godot/bridge/README.md`): Godot draws, plays
sound, runs the UI and online. Never change the sim's rules in GDScript for single player.

| Lane | Owns | Hook points (in battle.gd unless said) |
|---|---|---|
| **A — Units** (every unit / vehicle / aircraft / ship / drone from the bridge buffers, per-nation models, animated soldiers) | NEW `godot/scripts/battle/units_view.gd`, `godot/scripts/battle/battle_look.gd`, new models under `godot/models/` | `_draw_unit(fr, e, fac, p, ang, gy, col, issel, mine, vis)` — replace its body with one `# LANE A HOOK` call into units_view.gd |
| **B — World** (terrain, buildings, map objects, effects, lighting, sky / day-night / weather, supply-line and ground overlays) | `godot/scripts/battle/battle_terrain.gd`, NEW `godot/scripts/battle/world_view.gd`, textures under `godot/tex/` | `_draw_bld(...)`, `_draw_map_objects(fr)`, `_draw_world_fx(fr, alive)`, `supply_draw(...)` — each becomes a `# LANE B HOOK` call into world_view.gd |
| **C — Battle HUD + controls** | `godot/scripts/battle/battle.gd` (owner), `godot/scripts/ui/hud.gd`, `godot/scripts/ui/ui_kit.gd`, `godot/tools/selftest.gd` | owns `_process` / input / selection / camera / build ghost / cameos / `_draw_orders_overlay` |
| **D — Menus + modes** | `godot/scripts/ui/menu.gd`, `godot/scripts/ui/missions.gd`, `godot/scripts/main.gd` (Test range), save / load, settings, extras, `godot/scenes/menu.tscn`, `godot/scenes/main.tscn`, `godot/ui/**` | `start_launch` in battle.gd reads `UI.launch` (kind battle / range / mission / tutorial / load / replay / online) |
| **E — Audio** | `godot/audio/**` (autoload `Audio`) | the `# P5 HOOK` lines in battle.gd and menu.gd (keep them when you edit around them) |
| **F — Online** | `godot/net/**` (autoload `NetBoot`), `godot/scripts/battle/battle_net.gd`, `server-godot/**`, `.github/workflows/godot-relay.yml`, `godot-build.yml` | `go_online` / `start_online` / `sim_tick` / `hash_state` in battle.gd; online now runs on the GDScript sim (`use_bridge = false` in `go_online`) |
| **ORCH (shared)** | `godot/bridge/**`, `godot/web/**`, `tools-godot/**`, `godot/project.godot`, `godot/export_presets.cfg`, `godot/sim/**` (parked GDScript rules, `--gdsim`), `godot/data/**`, `orch/**` | the `# P1 BRIDGE` spots in battle.gd, menu.gd, main.gd, hud.gd |

## How a hook looks
```gdscript
func _draw_unit(fr: Dictionary, e, fac: String, p: Vector2, ang: float, gy: float, col: Color, issel: bool, mine: bool, vis: bool) -> void:
	units_view.draw_unit(self, fr, e, fac, p, ang, gy, col, issel, mine, vis); return   # LANE A HOOK
```
`fr` is this frame's draw lists (`fr.per`: draw key → transforms for the MultiMeshes, `fr.rings`, `fr.bars`); append to
them or draw your own nodes. Read the battle through `B.sim` (`bridge_sim.gd` adapter: `ents`, `teams`, `oil`, `fields`,
`proj`, `take_events()`; raw buffers in `B.sim.br`) — never write sim state from a view.

## Autoloads / scenes
`Audio` (lane E), `NetBoot` (lane F). Main scene `res://scenes/menu.tscn` (lane D): `?battle-ai&fac=IR&vs=US` /
`--battle-ai` go straight to `res://scenes/battle.tscn`; `?bridge-test` / `?worker-test` open `res://scenes/main.tscn`.
