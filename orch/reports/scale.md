# Scale report (view only) - 2026-11-20

Probe: `node orch/scalemeasure.mjs IR,US,RU,IN` (headless, bounding boxes of the drawn model, world units). Soldier = 16.4 units tall (1.8 m real, ~9 units/m). Before/after raw: `orch/reports/scale-before.json`, `scale-after.json`. Pictures: `orch/shots/scale-before-*.jpg`, `scale-after-*.jpg` (`node orch/scaleshots.mjs before|after`).

Ratio = soldier height / vehicle height. Real: tank ~0.75, truck ~0.6, jeep ~0.95.

| nation | kind | height before > after | length before > after | soldier:veh height before > after | real |
|---|---|---|---|---|---|
| IR | tank | 16.4 > 23.8 | 40 > 58 | 1.00 > 0.69 | 0.75 |
| IR | arty | 17.2 > 24.1 | 42 > 58.8 | 0.95 > 0.68 | 0.60 |
| IR | aa | 24.7 > 30.9 | 34 > 42.5 | 0.66 > 0.53 | 0.62 |
| IR | atgm | 19.9 > 26.9 | 36 > 48.6 | 0.82 > 0.61 | 0.95 |
| IR | jeep | 12.2 > 17.1 | 26.1 > 36.8 | 1.34 > 0.96 | 0.95 |
| IR | harv | 26.4 > 30.4 | 37.4 > 43.3 | 0.62 > 0.54 | 0.62 |
| IR | ammot | 25.8 > 29.7 | 37.4 > 42.9 | 0.64 > 0.55 | 0.62 |
| IR | ew | 29.8 > 34.3 | 37.7 > 41.8 | 0.55 > 0.48 | 0.56 |
| IR | dozer | 19.3 > 25.2 | 39.7 > 51.6 | 0.85 > 0.65 | 0.56 |
| IR | heli | 21.4 > 32 | 71.2 > 106.7 | 0.77 > 0.51 | 0.40 |
| IR | jet | 10.7 > 15 | 48 > 67.2 | 1.53 > 1.09 | 0.36 |
| US | tank | 17.7 > 25.7 | 40 > 58 | 0.93 > 0.64 | 0.75 |
| US | arty | 13.6 > 19.1 | 39.1 > 54.8 | 1.21 > 0.86 | 0.60 |
| US | aa | 19 > 23.8 | 33.3 > 41.6 | 0.86 > 0.69 | 0.62 |
| US | atgm | 16.3 > 22 | 27 > 36.5 | 1.01 > 0.75 | 0.95 |
| US | jeep | 12.2 > 17.1 | 26.7 > 37.3 | 1.34 > 0.96 | 0.95 |
| US | harv | 26.4 > 30.4 | 36.6 > 41.2 | 0.62 > 0.54 | 0.62 |
| US | ammot | 25.8 > 29.7 | 36.2 > 40.8 | 0.64 > 0.55 | 0.62 |
| US | ew | 23 > 26.4 | 35.9 > 41.3 | 0.71 > 0.62 | 0.56 |
| US | dozer | 19.3 > 25.2 | 39.7 > 51.6 | 0.85 > 0.65 | 0.56 |
| US | heli | 19.6 > 29.4 | 58 > 87 | 0.84 > 0.56 | 0.40 |
| US | jet | 11.1 > 15.5 | 48 > 67.2 | 1.48 > 1.06 | 0.36 |
| RU | tank | 11.3 > 16.4 | 40 > 58 | 1.45 > 1.00 | 0.75 |
| RU | arty | 17.2 > 24.1 | 42 > 58.8 | 0.95 > 0.68 | 0.60 |
| RU | aa | 29.4 > 36.8 | 34 > 42.5 | 0.56 > 0.45 | 0.62 |
| RU | atgm | 31.1 > 41.9 | 36 > 48.6 | 0.53 > 0.39 | 0.95 |
| RU | jeep | 12.2 > 17.1 | 26.6 > 36.6 | 1.34 > 0.96 | 0.95 |
| RU | harv | 26.4 > 30.4 | 36.8 > 43.3 | 0.62 > 0.54 | 0.62 |
| RU | ammot | 25.8 > 29.7 | 36.7 > 41.8 | 0.64 > 0.55 | 0.62 |
| RU | ew | 38.1 > 43.8 | 37.7 > 42.8 | 0.43 > 0.37 | 0.56 |
| RU | dozer | 20.9 > 27.1 | 42.2 > 54.9 | 0.78 > 0.61 | 0.56 |
| RU | heli | 15.4 > 23 | 56 > 84 | 1.06 > 0.71 | 0.40 |
| RU | jet | 15.3 > 21.5 | 54 > 75.6 | 1.07 > 0.76 | 0.36 |
| IN | tank | 11.3 > 16.4 | 40 > 58 | 1.45 > 1.00 | 0.75 |
| IN | arty | 17.2 > 24.1 | 42 > 58.8 | 0.95 > 0.68 | 0.60 |
| IN | aa | 24.2 > 30.2 | 34 > 42.5 | 0.68 > 0.54 | 0.62 |
| IN | atgm | 17.2 > 23.2 | 27 > 36.5 | 0.95 > 0.71 | 0.95 |
| IN | jeep | 12.2 > 17.1 | 26.8 > 37.4 | 1.34 > 0.96 | 0.95 |
| IN | harv | 26.4 > 30.4 | 37.7 > 41.6 | 0.62 > 0.54 | 0.62 |
| IN | ammot | 25.8 > 29.7 | 37.7 > 42.8 | 0.64 > 0.55 | 0.62 |
| IN | ew | 33.6 > 38.6 | 36.9 > 42.4 | 0.49 > 0.42 | 0.56 |
| IN | dozer | 19.3 > 25.2 | 39.7 > 51.6 | 0.85 > 0.65 | 0.56 |
| IN | heli | 19.6 > 29.4 | 58 > 87 | 0.84 > 0.56 | 0.40 |
| IN | jet | 16.3 > 22.8 | 46 > 64.4 | 1.01 > 0.72 | 0.36 |

## Factors chosen (`VEH_SCALE` in src/11-models.js, applied to the whole model group at the end of `modelFor`)

tank 1.45, arty 1.4, jeep/raider 1.4, atgm 1.35, aa 1.25, dozer 1.3, supply/ammo/EW/CBR/missile trucks 1.15 (already about right in height, short in length), helicopters 1.5 (airlift 1.4), jets 1.4, any other ground vehicle 1.3. Infantry 1.0 (unchanged). Ships/boats 1.0 (checked only: not changed).

Full real scale (tank length x1.55, trucks x1.8, helicopters x2.5) would make vehicles overlap neighbours and buildings at battle zoom because simulation footprints (radii) stay the same, so these are the largest factors that still read clean; trucks keep their height (already 0.62 of a soldier) and gain only a little length. The whole group is scaled, so code-built add-ons (turrets, rocket racks, dishes, cranes), kits, the team ring, contact shadow and headlamp glow stay attached and proportional. Health bars ride higher on bigger vehicles (`entHeightMid`).

Not changed: simulation, collision radii, ranges, anything host/clients agree on.
