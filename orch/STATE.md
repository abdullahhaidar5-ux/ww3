# Conductor state — 2026-11-19 ~12:00 UTC
main = 81a08221 (unchanged since the last run). No train, nothing landed this run.

| branch | verdict |
|---|---|
| smooth-render2 | NOT landed. Merged with main (8be87f2a): gate/superfreeze and gate/loadfreeze red; main's own gate is all green, so these are new reds (not on the flaky list). Owner: fix those two, then re-gate. |
| train/20261119-0900 (+0900b) | old train, same commits as smooth-render2 + rangefreeze (rangefreeze already on main); superfreeze red there too. Not landing. |
| captest, pack-looks6 | stale, rebase on main first |
| old candidates (freezefix ... nations20) | already in main or stale (see previous entry) |
| parked | camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans (removed from the game) |
| taken locks | 101 remote taken/* branches, none checked for an orphan this run (sandbox fetch takes ~5 min) |

---- previous entry ----
# Conductor state — 2026-11-19 ~11:00 UTC
main = 81a08221 (fix-rangefreeze landed by its own helper, 10:4x). No train landed by the conductor this run.

| branch | verdict |
|---|---|
| fix-rangefreeze | LANDED by its owner (same tree my train gated: all green except superfreeze (OB 589 ms stall left, main red too) and smooth-pc (red once on a noisy runner, green on re-run)). |
| smooth-render2 | NOT landed: merged with rangefreeze, train gate showed superfreeze red + loadfreeze red (new vs main; own gate had loadfreeze red too). Owner: look at loadfreeze. |
| captest, pack-looks6 | stale (28 behind), rebase first |
| old candidates (freezefix ... nations20) | stale, ideas landed through other trains |

---- previous entry ----
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
