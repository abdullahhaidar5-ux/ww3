# Epic maps (branch orch/epic-maps) — Abdullah 2026-11-03: "all the maps have an epic size and feel"

## What shipped (every map, existing + naval)
- **Size:** 2-player maps +15% (scale 1.95 → 2.25, 7200x4960) and 3-player +12% (2.14 → 2.40); 4–8 players were already 2.6–3.4 and are unchanged. Maps that keep the old scale for a count (`oldScale`) are untouched. Roads/bridges are laid in map units so they scale with it. Camera max zoom-out now grows with the map (`zmax()` in 06-view: 2880 on a 2-player map, up to 3600 on 8-player maps; was 2600) — pinch/wheel/`-` all use it.
- **Distant mountain ranges (`farRidge`, 04-gfx):** two hazed ridge rings beyond the playable edge, coloured by theme (sand, green, snow with white peaks), automatically flat where the map edge is sea so naval maps keep an open sea horizon. One mesh, ~1.4k triangles, no per-frame cost, looks only. Visible when you tilt the camera low (Shift+wheel / PgUp, two fingers up) — see `orch/shots/epic/strait-horizon.png`.
- **Battle smoke columns (`smkAdd/smkTick`, 05-fx3d):** where vehicle wrecks or building ruins pile up, a tall dark column keeps rising 75–120 s (feeds from nearby wrecks, up to 7 columns on PC, **3 on Phone/Low**, only drawn when in view). No aircraft/drones. Looks only (Math.random, no sim).
- **Names:** 16 plain names became epic ones (Straits of Thunder, Delta Inferno, Zagros: Mountain Fortress, Bosphorus: Gates of Empires, Golan: Fight for the Heights, Dnipro: City on Fire, Aleppo: Ruined City, Khyber Pass: Gate of Fortresses, Burning Oil Fields: Inferno …). Descriptions were already one-line and vivid, kept.
- Already in the game and kept: haze/fog per weather, per-theme wind/rain/rumble sound bed (09-audio `envLoop`), landmarks (cities, citadels, forts, oil fields, ports) in the map definitions.

## Not done (honest list)
- No new per-map landmark buildings, extra debris props, or a per-map distinct ambient sound bed beyond the existing theme-based wind/rain/rumble; no distant city skyline billboards. The ridge + smoke + size were the cheap, safe part; skyline/landmark art is a follow-up.
- No real-iPhone FPS measurement (headless SwiftShader only; the GPU cost of the ridge is one 1.4k-triangle draw call).

## Fairness (AI vs AI, `orch/mapfair.mjs`)
- **Static** (all 410 layouts, supply fields/oil per base by driving distance): 3 flagged, all 2-player `sym:none` maps (heartland, indus, nile) where derricks are placed randomly; heartland was already 2.5/4.5 fields before the change, indus/nile oil share moved from 1.5/2.5 to 1.0/3.0 on that seed. Not changed (random per seed, other seeds differ).
- **Battles** at 2 and 3 players, all maps that support them: 235 games (1 seed, 8 game-min cap, Latin-rotated nations). **No start position wins significantly more than its share (p<0.01 and >1.5x) on any map.** Only ~3–4 games per layout, so power is low; lowest p: plateau 2p (0/4, p=0.046). Pooled duel seats: seat 1 won 58, seat 2 won 87. Full table: `orch/reports/epic-maps-fairness.txt`. 4–8 player layouts are unchanged (same scale), so the earlier tables (`maps20-fairness.txt`, weather-naval.md) still hold.

## Smoothness
Gate `smooth-pc`, `smooth-phone` (Low/phone profile), `smooth-mp` all pass in CI against the stored baselines (no re-baseline needed). Local smoke PASS. Low gets the ridge (1 draw call) and at most 3 smoke columns with fewer/smaller puffs.

## Online sync
Only the map scale changed in sim code (`worldScaleFor`, 01-data), applied identically on host and clients. Visual additions don't touch sim state. → **main → servers-live PR needed** (01-data/02-map changed).
