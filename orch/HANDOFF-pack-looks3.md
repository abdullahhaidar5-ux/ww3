# HANDOFF pack-looks3 (2026-11-18)

Done
- Item 1 (partly) landed on main e15752b, own gate run all green: thunderstorm look in 05-fx3d weatherFX - the field dims (sun/sky light scaled, rain dims a little) and lightning flashes (double-flicker, fog tints blue-white) by moving the EXISTING sun and sky light, so no new lights or shader programs. Rain streaks drop to 600 on Low. Guard in orch/decisions.mjs.
- Already on main before this run (found, not rebuilt): day/night blend follows G.tod() via todSeg/todLive in applyWeather; rain, sand, fog, snow particles in weatherFX; night windows (WXCITY) and lamps. NOTE the sim function is G.wxv(), G.wx is the state object.

Left
- Item 1: vehicle headlights at night (cheap instanced sprites), wet-ground texture darkening beyond the light dim, screenshots orch/shots/daynight-*.jpg and storm/sand (software GL here is too slow to render them; take them on a PC or CI).
- Item 2 (national vehicles in code, Shia first) not started: each family needs its own gate run (~20 min) plus art work.
- Local smoke/decisions time out in the cloud sandbox (>10 min); use orch/cigate.sh in the background (nohup) and poll.

Try (2 min, PC): Test range, Conditions picker, pick Live day or a storm; watch the sky darken and lightning flash over the battle. https://abdullahhaidar5-ux.github.io/ww3/
