# Night battles + deeper tactics (orch/night-tactics, 2026-11-03)

Found on main: Night / Dusk / Changing Conditions, the sight penalty (x0.6, thermal units x0.9), dark lighting, bigger
flash/explosion glow and a HUD chip already existed (orch/daynight). This run adds the missing parts.

## Part A — Night
- **Random** now includes Night: the battle seed picks one of Clear/Golden/Overcast/Dusk/Night (`wxRandIdx` in 03-sim, used by
  both sim and look, so host/clients/server agree). Only a Night pick changes the sim (sight); the other picks stay visual only, as before.
- **Illumination Flares** (new general power, hotkey L, 1 rank point to unlock, 60 s cooldown, r 300, ~30 s, +15%/level):
  lights the area for everyone — implemented as a reveal for every team (reuses the synced reveals/vision machinery), so units
  in the lit circle are seen by friend and foe. `G.flares` is just a record; new `flare` event is global.
  Look: a drifting white glow + a cold-white point light (PCs: 2 lights; phones on Low: glow sprite only, no dynamic light).
- **Night vision**: each nation's special-forces unit (`F.special`), Drone Recon Teams and Desert Recon Patrols see at full range at night.
- Existing muzzle-flash / tracer / explosion / wreck-fire lights stay (PC only); no headlights (optional, skipped).
- Non-night battles: unchanged (todVis only differs at night level 2 for the new night-vision units).

## Part B — Tactics
1. **Crumbling cover**: a building shot below 35% HP no longer gives infantry cover (coverAt). City blocks already collapse to rubble cover.
   There are no wall/sandbag structures in the game to destroy; buildings are the cover.
2. **Suppression marker**: pinned infantry (any visible side) get a red shield-with-arrow icon beside the bar and a pulsing red ring at their feet.
3. **Veterancy**: gold chevrons (1–3) centred over each ranked unit, always shown (even at full HP); on promotion a gold ring/flash + sparks
   (`rank` event, synced to clients).

## Tests
- `node orch/smoke.mjs` SMOKE PASS (day) and `DN_W=4 DN_SHOW=1` (night + flare + chevrons + pinned) SMOKE PASS. `DN_SHOW=1` is a new screenshot hook in smoke.mjs.
- Sim cost: flares/NV/cover are O(1) per query; per-frame HUD additions are canvas-only for ranked/pinned units.
- Simulation changed -> main -> servers-live PR.
