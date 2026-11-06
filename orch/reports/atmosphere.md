# Atmosphere pass (2026-11-06)

Branch orch/atmosphere. Screenshots: orch/shots/atmosphere/ (1-day, 2-dusk, 3-night, 4-nightvision, 5-thermal, 6-dawn, 7-sandstorm, 8/9 after-action, 10-dof-closeup). Test scripts: orch/atmoshots.mjs, orch/aarshots.mjs.

## What shipped
- **Day/night in a match (lobby "Day-night cycle")**: `todSeg(G.t)` in 03-sim is a keyframe table (day 0-260 s, dusk 400-460, night 580-800, dawn 930-1000, day again by 1120; 1200 s loop). 04-gfx `wxMix` blends the look presets, so sun, shadows, sky, fog, grade and lamps change continuously. Sim vision uses `todLvl()` from the same clock. Pure function of game time: identical for everyone.
- **Weather mid-battle**: `weatherTick` now uses a seeded RNG (`G.wxR`) instead of Math.random, picks the next weather ahead and logs "Forecast: … rolling in within 25 seconds." The existing lobby weather options and visual transitions are unchanged. Mud from the seasons work is not hooked up (real-maps not on main yet); rain still slows ground units via the existing WEATHER table.
- **Night vision / thermal**: new `src/10b-vision.js` + final-pass shader (10-post). N or the on-screen button cycles normal → NV → thermal, only offered when darkness ≥ 0.3, auto-off at day. Thermal draws heat glows only for units the player already sees (engines/aircraft hottest). Purely visual.
- **Depth of field** (10-post): subtle blur of far/near depth when the camera is zoomed in under ~520, top quality level only.
- **After-action map**: new `src/08b-aar.js`. Records every ~8 s of game time (territory grid from buildings, towns and units, town owners, firing clusters, strikes) on the viewer's own machine; end screen shows it on the minimap with slider, Replay button, front line, capture flags, revolt "!", fight bursts, strike crosses. Reads only; never touches sim or net.

## Sim changes (servers-live PR comment)
03-sim: `todSeg/todDark/todLvl` (new cycle clock) and `weatherTick` (seeded, forecast). Both deterministic.

## Not done / next
God rays, shoreline foam and water reflections, extra PBR on vehicles/buildings, lingering smoke/dust over battles, per-theme grade tweaks beyond the existing ones. Thermal glows are round blobs, not body-shaped; a heat pass with per-model tint would look better.
