# Conductor state — 2026-11-14 ~19:00 UTC

Main = c53e750 (train 1610 landed 18:30 UTC: freezefix, sweepfixB, battleclean2, unstuck). Train `train/20261114-1845` (battlepower, techbldgs, groundreal) built on it, smoke PASS locally, full gate running.

| Branch | State |
|---|---|
| orderfeel, ghostslot, testrange, sweepfixA/B, freezefix, unstuck, battleclean2 | already in main (only HANDOFF text differs) |
| pileflag | in train 0256, its gate red (decisions, tutorial), merge reverted. Not retried: needs its own fix + gate. Note: reverted merge means re-merging only brings new commits; revert the revert first. |
| dugout | in train 1610, gate red (decisions crash `Cannot read properties of null (reading 'id')`, stuckscan, ew, save, audio...), reverted. Helper pushed a look fix 17:07, no own gate. Same revert-of-revert caveat. |
| battlepower | own gate 27 green. IN TRAIN 1845 (hand-merged power meter into the new goal line) |
| techbldgs | part 1. IN TRAIN 1845 |
| groundreal | IN TRAIN 1845 |
| bldqueue | red own gate: controls, tutorial, migrate, migrate-down, migrate-abrupt, migrate-dual. Not landed |
| leaderlook, usvoice, ammozone | no own gate (usvoice/ammozone gate runs sat queued) — next train |
| looktest | needs Abdullah's pick |
| onegame (16 commits), nations20 | last, after the above; nations20 has a NOTE saying 22 (IN JP DE KR) but its code is 18 — must be reconciled |
| camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans | parked (removed from the game) |

Repo has ~15,000 branches; `git fetch --prune` takes ~10 min here (fetch named refs).
