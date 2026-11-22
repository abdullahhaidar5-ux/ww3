# BRIEF — one-page state of World War 3, Godot edition (ORCH integration, 2026-11-22)

## What the game is
C&C Generals Zero Hour-style RTS, one game: **Battle** (+ Test range, story Missions, Tutorial), PC only. Since
2026-11-22 the game is the **Godot 4.4.1 web export** (Compatibility renderer, no threads). The live site
(https://abdullahhaidar5-ux.github.io/ww3/) gets the export from this branch (`orch/godot-port`) only when ORCH lands it.
Standing rules: `CLAUDE.md`; who edits what: **`godot/OWNERS.md`**; the JS game is the reference spec (branch `js-final`).

## How it is built
- **Simulation = the browser game's own JavaScript** (`src/01-03` bundled into `godot/web/ww3sim.js` by
  `tools-godot/build_bridge.mjs`), running in a Web Worker; Godot reads entity buffers + events each step
  (`godot/bridge/`, contract `godot/bridge/README.md`). Same state hash as Node's `orch/headless.mjs`.
- Godot draws (`godot/scripts/battle/`), runs the UI (`godot/scripts/ui/`), sound (`godot/audio/`, autoload `Audio`),
  online (`godot/net/`, `battle_net.gd`, relay `server-godot/`, autoload `NetBoot`).
- Desktop / headless Godot has no JS: there the battle runs only with `--gdsim` (the parked, partial GDScript port in
  `godot/sim/`) — used by the headless tests and by **online play, which still runs on the GDScript sim**.

## What works (seen)
- Main menu like the browser game (Play / Multiplayer / Test range / Settings / Extras / Credits), loads in ~3 s in
  headless Chromium, 0 console errors (`orch/shots/check/menu.png`).
- `?battle-ai&fac=IR&vs=US`: battle starts on the JS sim, terrain, bases, Zero Hour HUD (money, power, army, minimap
  with supply colours, command bar) (`orch/shots/check/battle.png`).
- P6 HUD + every control of CLAUDE.md, save / load / replay, Test range panel, Tutorial, missions list (on the GDScript
  sim; on the bridge several are untested — see gaps). P5 audio from the same vo/ sfx/ mus/ files. P7 online with AI seats,
  up to 8, snapshots, Web-vs-Linux determinism (GDScript sim, local + staging relay).

## What is missing (the lanes' lists — details in the integration report)
A units: soldiers static, no per-nation infantry looks, aircraft/ships/drones barely drawn, no muzzle/tracer from bridge events.
B world: no supply-line roads/dashed cuts, craters, weather, day/night, destruction look; bridge `tr`/`muz` events unused.
C HUD: Test range AI + chosen start spots not wired to the bridge; selftest needs a display and fails headless.
D menus: Missions/Tutorial/Range on the bridge untested; nation + map pickers only list what P6 ported.
E audio: generals' powers / missile / promotion sounds have no trigger yet; web build skips bus effects.
F online: still GDScript sim (not the JS rules single player uses); relay not live; move online to the bridge (orders = JS `act()`, hash = `sim.br.state_hash()`, needs JS snapshots).

## How to check (every lane, before ORCH merges)
`tools-godot/check.sh` — bridge test, import, net + audio tests, AI-vs-AI (`--gdsim`), web export, headless Chromium:
menu + 60 game-seconds of `?battle-ai` with 0 console errors, screenshots in `orch/shots/check/`. `SKIP_WEB=1` for the
quick part. Godot 4.4.1 is at `/opt/godot` (`godot` on PATH) with the web export templates installed.
