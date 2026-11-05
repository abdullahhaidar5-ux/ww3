# Conquest maps — bigger 2-4 player maps, town bands, roads (branch `orch/conquest-maps`, 2026-11-05)

Abdullah 2026-11-04 20:01: Conquest is the only mode and its core play is "High tax in safe towns behind your lines, Low tax on the front", so maps need depth.

## What changed (plain words)
- **Size:** 2-, 3- and 4-player maps are 27% bigger on each side (2p 2.25 -> 2.86, 3p 2.40 -> 3.05, 4p 2.57 -> 3.26 world scale; `worldScaleFor` in `01-data`). 5-8 player maps are untouched. Base-to-base driving distance on a 2-player map is now ~7000-9000 units (~2.7-3.2 min for infantry on open ground, before the road bonus). Roads, bridges, rivers and ridges are laid in map units, so they scale; the camera zoom limit and distant ridges already follow map size.
- **Town bands on every map and player count** (`mkMap`, `02-map.js`, all by route distance, mirror-symmetric on the symmetric maps):
  - **REAR**: 2-3 safe hamlets near every base (0.12 / 0.2 / 0.3 of the way to the nearest rival) plus any town the map already has there.
  - **MIDDLE**: forward hamlet per base (0.4), contested hamlets on at least two routes (2-player: both flanks; 3+: one per neighbour pair), more where the base has less.
  - **CENTRE**: one larger **prize town** (market, +50% tax, flagged `prize`, `M.cities[].prize`, `G.towns[].prize`) where every base is as equally far as the ground allows - an existing city of the map if one sits there, otherwise a new one in the map's own city style (Middle Eastern, Russian, European, Asian ...), never cubes.
  - **Balance step:** a map's own cities are not mirrored on every map, so after placement the tax potential of every base's rear and middle band is counted (hamlet 3.6/s, town 8.6/s) and the poorer bases get extra hamlets until nobody is more than ~one hamlet behind (and every base has at least two hamlets' worth in each band). A hamlet is only placed where it gets at least 3 house plots (before, ones with fewer were silently dropped, leaving a base short).
  - Hamlet counts on Fulda: 2p 6 -> 10, 4p 10 -> 25, 8p 25 -> 55 (houses 92 -> 203 on 8p); they are small static buildings merged into the existing city mesh, no extra draw calls.
- **Roads (`buildRoadNet`, `roadRoute` in `02-map.js`):** pure geometry on the ground grid (no random numbers, so host and clients lay identical roads): every base links to its 3 nearest towns/hamlets, every town to its 2 nearest, the prize town gets 4 spokes, and the networks are joined until every base is connected. Straight where the ground is clear, an A* over walkable cells (streets, bridges) where not. Drawn with the existing road painter, so the ground texture / road mask (`G.roadMask`) already show them.
- **Road speed (`roadK`, `03-sim.js`):** ground units standing on a road move **+30% (wheeled)** or **+15% (tracked, infantry)**, same for every nation (`ROAD_W`, `ROAD_T`). **Supply trucks prefer roads** in the route search (road cells cost 30% less, `P_ROAD` in `findPath`).
- **Tax:** the prize town pays +50% (`townBase`), its perk is always the market.

## Fairness evidence
**Static town bands** (`node orch/bandfair.mjs`, 205 layouts = every map x every player count it supports; table in `conquest-maps-bands.txt`): per base, rear / middle town counts and tax potential by driving distance, contested count, prize-town distance to every base, roads join all bases. 175 of 205 layouts pass every check (rear >= 2 hamlets, rear spread < 1.4x, mid spread < 1.6x, a middle exists, prize within 1.3x of equal for 2-3 players, roads join all bases). The 30 flagged are:
- 20 layouts with 5-8 players where the *middle* band is shared contested hamlets (counted half each) - spread 1.6-2.1x on small absolute amounts (< 2 hamlets), kept.
- 8 layouts (delta 3p, oasis 3p, arctic 3p, taiwan 2p/3p, babelmandeb 3p, ...) where the prize town cannot be closer to equal than 1.3-1.55x because rock, water or an unsymmetrical (`sym:none`) base layout leaves no better dry spot; it is still the best available spot, reachable by road from every base.
- islands 4p, taiwan 6p, arctic 8p rear spread (> 1.4x): the map's own cities sit behind one base.

**AI vs AI Conquest battles** (`node orch/mapfair.mjs --battles --counts 2,3,4 --minutes 25`, 383 games on 104 layouts, nations rotated through every start position so only the position is left; raw rows in `conquest-maps-battles.json`):
- **No game was decided in the first 3 minutes.** Shortest win 7.0 min, median 17.2 min, longest 24.7 min (308 kills; 56 timeouts adjudicated by base + army value at 25 min, 19 draws). 32 wins came before minute 12.
- **No start position wins significantly more than its share on any map** (p < 0.01 and > 1.5x) except nile 4p (4 games, 3 decided, all seat 1; p = 0.007) - too few games to say; rerun with more seeds recommended (`--round 1`).
- Pooled seat win share: **2 players 47% / 53%** (fair), **4 players 26% / 27% / 20% / 26%** (fair within noise).
- **3 players is not fair, and was not before this change:** pooled seats 28% / 56% / 16% (n = 98). The same 3-player layouts on `main` before this work gave 27% / 52% / 21% (n = 94). Cause: most 3-player layouts are a close pair plus an isolated base; the isolated base fights one rival at a time and wins 54% of games (rank by distance to the others: most-central base 14 wins, middle 31, most isolated 53). The town bands do not change it. Not fixed here - it needs the 3-player start layouts or the AI's early aggression changed, and is on the backlog.

## Performance
- 5-8 player maps keep their size; the 2-4 player ground mesh already runs at the 1.8x segment cap, so a 27% bigger map has the same triangle count (quads 27% wider) and the same 3072 px ground texture - no extra GPU work; the far-ridge ring and fog already follow map size. Pathfinding grid is 1.6x larger on 2-4 player maps (more cells, same per-search budget).
- `mkMap` cost: Fulda 8p 480 -> ~700 ms, Strait 4p 205 -> ~550 ms (prize search + road A*).
- Smooth gate in CI on this commit: `smooth-pc`, `smooth-mp` PASS with the stored baselines (no re-baseline). Locally the pc gate is noisy on this 2-core box (draw calls swung 1087 <-> 1998 on unmodified `main` between two runs), so CI is the reference. Phones: not tested (Abdullah 2026-11-04 20:13 "Forget phones entirely"; the old phone rules in this task's brief were superseded by CLAUDE.md).

## Pictures
`orch/shots/conquest-maps/` : `khyber-2p.png`, `fulda-3p.png`, `delta-4p.png`, `hormuz-3p.png` (naval: central island prize town, bridges): terrain, roads, bases, green = rear villages, orange = middle hamlets, red = contested on a route, gold pentagon = centre prize town. Made by `orch/bandshots.mjs` + `orch/bandshots.py` (map data, not the 3D view). No phone view (see above).

## Online
Map generation and the road speed are sim code (`01-data`, `02-map`, `03-sim`), deterministic, same on host and clients -> `main -> servers-live` PR needed.

## Not done / next
- 3-player seat bias above; nile 4p rerun; 5-8 player battles not rerun (layouts changed only by hamlets/roads).
- Roads are straight-ish tan lines between towns - no bridges-and-causeway art or road signs; AI does not yet prefer road routes for army moves (only supply trucks do).
- Tax-income balance (AI hoarding, `CQ_*` numbers) untouched; the extra rear hamlets raise everyone's income equally (about +7 $/s per base at Normal tax).
- `orch/bandfair.mjs` could be added to the gate (static, 4 min).
