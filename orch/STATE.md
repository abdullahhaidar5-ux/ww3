# Conductor state — 2026-11-19 ~14:55 UTC
main = 778b5390 (ORCH 2: decisions guard fix, 14:38). Another conductor train is live: `train/20261119-1358` (pushed 13:58Z, not part of main, diverged 3 ahead / 5 behind). Per rules this run did step 1 only: no train, no gate, no landing.
State read through the GitHub API (the sandbox clone is huge; `git fetch` times out).

| branch | ahead of main | note |
|---|---|---|
| freezefix, sweepfixA, sweepfixB, orderfeel, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, groundreal, leaderlook, usvoice, looktest, onegame, nations20 | 0 | already in main |
| ghostslot, testrange, techbldgs, ammozone | 1 / 1 / 1 / 7 | from 2026-11-14, 620+ behind main, stale |
| battlemaps2 | no branch, no taken lock | |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
Taken locks with no orch branch: not checked this run.

---- previous entry ----
# Conductor state — 2026-11-19 ~12:00 UTC
main = 81a08221. smooth-render2 NOT landed (superfreeze + loadfreeze red); train/20261119-0900(+b) old, not landing; captest, pack-looks6 stale; old candidates already in main or stale; parked: camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
