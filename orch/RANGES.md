# Realistic ranges (Abdullah 2026-11-07 21:18) — one line per weapon: real range · source · game value
Sources: [Iran missile arsenal (ISPD)](https://ispd.org.cy/the-missile-arsenal-of-iran/), [Oryx handbook of Iranian ballistic missiles](https://www.oryxspioenkop.com/2019/10/the-oryx-handbook-of-iranian-ballistic.html), [CRS Iran ballistic missiles IF13035](https://www.everycrsreport.com/reports/IF13035.html), [Fateh-110 vs HIMARS (strasam)](https://strasam.org/en/defense/land-weapons-and-systems/missile-comparison-fatih-110-vs-himars-2826). Round figures for the rest are standard open-source values (Wikipedia/manufacturer): to be re-checked.

## Scales
- Grand map: Equal Earth, 2400x1200 units, ~14 km/unit (`GMIL_KMU`). `GMIL_ST.rng` = km / 14.
- Battle map: 3200x2200 px (CELL 40). Battle ranges are in px and deliberately compressed (rifle 190 px vs ATGM 440 px = 2.3:1; real 0.5 km : 4–5 km = ~9:1). Real long-range systems (howitzer 24–40 km, GMLRS ~80 km, Fateh-110 ~300 km) exceed the map and act as off-map fire support (RF3).

## Grand-map strikes (done in this ship)
| Weapon | Real | Source | Game |
|---|---|---|---|
| Ballistic/cruise missile (Shahab-3 ~2,000 km, Tomahawk ~1,600 km, Fateh-110 ~300 km) | 300–2,000 km | ISPD/CRS | 2,000 km (143 units) — was 4,760 km |
| Air raid (strike jet combat radius) | ~800–1,200 km | open source | 1,000 km (71 units) — was 4,200 km |
| Shahed-136 class drone | ~2,000 km, ~185 km/h | open source | 2,000 km (143 units) — was 3,220 km |
Flight times: ballistic ~10–15 min, cruise ~800 km/h, drones ~185 km/h (~11 h for 2,000 km) — all resolve inside the monthly turn.

## Battle ratios (kept; documented, not re-scaled)
rifle < tank gun < ATGM ≈ MANPADS < mortar < howitzer/rockets (off-map). Enforced by `orch/decisions.mjs` ordering check. Per-nation weapon tables and interception odds by air-defence class: OPEN (next slice).
