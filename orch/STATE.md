# STATE — conductor run 2026-11-19 ~09:50 UTC

Another conductor train is live: `train/20261119-0900` (pushed 09:02Z, 7 commits ahead of main, not yet landed) and `train/20261119-0900b` (1 ahead). Per rules this run did step 1 only (no train, no gate, no landing).
State was read through the GitHub API (compare vs main 81a08221) because the sandbox clone is 5 GB and `git fetch` times out.

| branch | ahead of main | note |
|---|---|---|
| freezefix, sweepfixA, sweepfixB, orderfeel, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, groundreal, leaderlook, usvoice, looktest, onegame, nations20 | 0 | already in main |
| ghostslot | 1 (2026-11-14) | 618 behind main, stale |
| testrange | 1 (2026-11-14) | 614 behind, stale |
| techbldgs | 1 (2026-11-14) | 609 behind, stale |
| ammozone | 7 (2026-11-14) | 620 behind, stale |
| battlemaps2 | no branch, no taken lock | |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
Taken locks with no orch branch: not checked this run.
