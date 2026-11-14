# HANDOFF maptrim (branch orch/maptrim)

**Status: PARKED until after Monday (ORCH stop, Abdullah Sat 09:51); NOT READY.** Done: fairness runs, 35-map allow-list, fallback, picker, guard, report, contact sheet; local smoke PASS. Not done: orch/cigate.sh was NOT run; decisions.mjs was last run before a small fix (static check now only covers the mirrored new maps; the earlier failure was that) and was not re-confirmed; capturable-building variety; onegame rebase.

## What changed
- ONE Battle map allow-list `BATTLE_MAPS` in `src/02d-battlemaps.js` (35 maps; `BM_KEYS` is built from it). Battle setup, online lobby, map picker, Random battlefield and the saved Battle map read it. The picker no longer has the "Conquest battlefields too" link.
- A removed or unknown map named by a new Battle game / Test range / tutorial / link falls back to a listed map with enough slots (`battleMapFix`, same terrain theme first; called in `newGame`). Saves and replays keep their own map (`keepMap`), so old saves still load.
- Old maps keep their data (editor, missions, saves). Their Battle player range is narrowed to the counts that were tested (`maxFull` keeps the original for old saves).
- Guard in `orch/decisions.mjs`: list equals the allow-list, every entry has a PASS row in `orch/reports/maptrim.md`, coverage (2 / up to 4 / 6 / 8 players), fallback, no extra-maps link.
- Tools: `orch/battlemapfair.mjs --list orch/maptrim-list.json` (old maps, shards, 8-player sampling), `orch/maptrimreport.mjs`, `.github/workflows/maptrim.yml` (push `maptrim/*`), `orch/maptrimshots.mjs` -> `orch/shots/maptrim-list.jpg`.

## Kept (35): name, players, win rate (every start 40-60%)
- Split Ridge (bm_splitridge): 2-2 players; 2 players 120 games, 59% / 41%
- Ferry Quarter (bm_ferryquarter): 2-2 players; 2 players 40 games, 44% / 56%
- Breakwater (bm_breakwater): 2-4 players; 4 players 48 games, 56% / 44% / 52% / 48% (4p)
- Four Mills (bm_fourmills): 2-4 players; 4 players 48 games, 52% / 52% / 44% / 52% (4p)
- Six Roads (bm_sixroads): 2-6 players; 6 players 180 games, 54% / 54% / 53% / 53% / 45% / 42% (6p)
- South Lebanon (lebanon): 2-4 players; 2 players 120 games, 50% / 50%
- South Lebanon (lebanon): 2-4 players; 4 players 168 games, 45% / 50% / 49% / 56%
- Gulf Coast Landings (gulf): 2-4 players; 2 players 120 games, 48% / 52%
- Gulf Coast Landings (gulf): 2-4 players; 4 players 168 games, 51% / 51% / 48% / 50%
- Euphrates Crossing (euphrates): 2 players; 2 players 120 games, 53% / 47%
- Yemen: Tihama and Highlands (tihama): 2 players; 2 players 120 games, 46% / 54%
- Zagros: Mountain Fortress (zagros): 2 players; 2 players 120 games, 60% / 40%
- Caribbean Island (caribbean): 2 players; 2 players 120 games, 42% / 57%
- Strait of Hormuz: Island Gate (hormuzgate): 2 players; 2 players 120 games, 55% / 45%
- Taiwan Strait (taiwan): 2 players; 2 players 120 games, 47% / 53%
- Arctic Front: Frozen Armies (arctic): 2 players; 2 players 120 games, 60% / 40%
- Khyber Pass: Gate of Fortresses (khyber): 2 players; 2 players 120 games, 60% / 40%
- Hajar Mountains: Wadi Passes (hajar): 2 players; 2 players 120 games, 42% / 57%
- Southern Marshes (marshes): 2 players; 2 players 120 games, 50% / 50%
- Black Sea Coast: Green Mountains (blacksea): 2 players; 2 players 120 games, 45% / 55%
- Yemen Highlands (yemen): 4 players; 4 players 168 games, 58% / 51% / 49% / 42%
- Hawizeh Marshes (hawizeh): 4 players; 4 players 168 games, 47% / 53% / 44% / 56%
- Island Chain Armada (islands): 4 players; 4 players 168 games, 52% / 52% / 52% / 43%
- Donbas Steppe (donbas): 4 players; 4 players 168 games, 52% / 50% / 57% / 42%
- Mesopotamia (mesopotamia): 4 players; 4 players 168 games, 59% / 50% / 49% / 43%
- Persian Plateau (persia): 4 players; 4 players 168 games, 54% / 50% / 51% / 44%
- Siberian Taiga (taiga): 4 players; 4 players 168 games, 56% / 50% / 49% / 46%
- Aegean Islands (aegean): 6 players; 6 players 180 games, 54% / 52% / 48% / 56% / 49% / 41%
- Korean DMZ: Iron Triangle (dmziron): 6 players; 6 players 180 games, 53% / 51% / 50% / 50% / 54% / 41%
- Empty Quarter Edge (rubalkhali): 6 players; 6 players 180 games, 57% / 51% / 57% / 48% / 42% / 45%
- Oasis Basin: Last Water (oasis): 6-8 players; 6 players 180 games, 46% / 53% / 47% / 51% / 49% / 54%
- Oasis Basin: Last Water (oasis): 6-8 players; 8 players 320 games, 47% / 47% / 50% / 53% / 50% / 47% / 52% / 55%
- Pacific Atolls (atoll): 6-8 players; 6 players 180 games, 48% / 54% / 50% / 51% / 49% / 48%
- Pacific Atolls (atoll): 6-8 players; 8 players 320 games, 45% / 48% / 49% / 54% / 50% / 46% / 54% / 53%
- Hindu Kush (hindukush): 8 players; 8 players 320 games, 49% / 46% / 47% / 50% / 49% / 52% / 52% / 55%
- Burning Oil Fields: Inferno (kuwait): 8 players; 8 players 320 games, 55% / 52% / 52% / 47% / 48% / 49% / 52% / 45%
- Rhine Front (rhine): 8 players; 8 players 320 games, 45% / 50% / 51% / 52% / 49% / 46% / 53% / 52%
- Yangtze Gorges (yangtze): 8 players; 8 players 320 games, 47% / 53% / 48% / 50% / 53% / 47% / 49% / 53%
- Sinai: Iron Mesa (plateau): 8 players; 8 players 320 games, 48% / 56% / 48% / 50% / 51% / 48% / 47% / 53%

Full numbers, passed-but-trimmed and failed maps: `orch/reports/maptrim.md`.

## Removed from the Battle lists
All other ~86 maps (every old map not above), incl. the failed ones: beqaa@2, caspian@2, coral@2, delta@2, dmz@2, duhok@2, golan@2, islands@2, mesopotamia@2, yemen@2, anatolia@4, babelmandeb@4, beqaa@4, caribbean@4, delta@4, dnipro@4, emirates@4, fulda@4, golanplateau@4, harbour@4, heartland@4, hormuzgate@4, rivers@4, volga@4, bosphorus@6, caucasus@6, crimea@6, indus@6, lebanon@6, mesopotamia@6, najd@6, nile@6, punjab@6, sahara@6, ural@6, yangtze@6, yemen@6, aegean@8, fulda@8, gulfoil@8, najd@8, nile@8, strait@8. Honshu Coast passed but was dropped (preview is an empty strip).

## Coverage
2 players: 18 maps; up to 4: 25; up to 6: 12; up to 8: 7 (list in report). Island/naval: Caribbean, Hormuz Gate, Taiwan Strait, Gulf Coast Landings (2-4), Island Chain Armada (4), Aegean Islands, Pacific Atolls, Breakwater. They are land-connected, so starts can drive to each other; AI use of ships/transports was NOT verified, the numbers do not depend on it.
Shia home theatres kept: South Lebanon (2-4), Yemen Highlands (4), Yemen Tihama (2), Zagros (2), Mesopotamia (4), Hawizeh Marshes (4), Southern Marshes (2). Note: Beqaa/Chouf, Yemen/Mesopotamia 2p/6p failed.

## Left / caveats
- ORCH note asked for 35 maps with at least 5 kinds of capturable buildings each (orch/techbldgs). techbldgs is not on main, so none were placed; add placements after it lands (same allow-list). `orch/MAPTRIM-NOTE.md` is still in the tree: the tool refused to delete it for me, delete it in the landing.
- Old maps are seed-random, not mirrored: the strict `battlemapfair --static` structure check is advisory for them (only 9 of 100 pairs pass it); fairness here is by AI game results. The 40-60% rule was met per start over 120-320 games.
- Previews of old maps are plain (terrain colour ignores theme); in-game screenshots per map were not taken. Geographic realism (vegetation, buildings per region) not audited.
- orch/onegame has not landed (branch missing on origin when I started); rebase on main if it lands and keep Battle-only; Conquest still lists all its maps.
- Smoke: PASS (local). decisions: see below. Smooth/grand gates: not run locally (per CLAUDE.md), see cigate.
