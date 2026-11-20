# STATE — conductor run 2026-11-20 ~15:00 UTC

main = 45ffdf7 (14:41 UTC, "Soldiers up close: brighter national camouflage"). Last train train/20261120-1103 is already in main.

## Train candidates (all from the CURRENT FOCUS list)
freezefix, sweepfixA/B, orderfeel, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, groundreal, leaderlook, usvoice, looktest, onegame, nations20: 0 commits ahead of main = already landed.
battlemaps2: no branch.
ghostslot, testrange, techbldgs, ammozone: last pushed 2026-11-14, Conquest-era, ~700 commits behind main, 1-7 commits ahead (handoffs/merges). Not landed: superseded by onegame/main; stale. Parked.

## Branches pushed since the last train (10:55 UTC)
pack-units, art-east11, pack-art, art-east10, fix-superfreeze, pack-systems, trailer, trailer-clips: only HANDOFF/doc commits not on main, no src/ or index.html differences (pack-units handoff says "camo is landed on main"). Nothing to land.

## Taken locks with no orch/ branch (saved nothing, all old)
rv-voice (11-15), savesync, redgates, drawcalls (11-15), spylook2, freezefix2 (11-12), finish-tokens, c-real-supply, seamless-hud, realwar, army-standards (11-11).

## Parked (removed from the game)
camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans, anything only in src/13*.

## Result
Train skipped: nothing unlanded and ready. No push to main. Note: origin has ~22k heads (gate/*), so plain `git fetch` times out; use targeted fetches.
