# Conductor state — 2026-11-14 18:15 UTC (state-only run)

Why state only: `train/20261114-1610` (tip a0b31f7, commit 16:40 UTC, not in main) is under 110 min old and `orch/conductor` was pushed 20 min ago — another conductor run is still working. Main = 71094e3 (16:08 UTC).

| Branch | Last push | Ahead | HANDOFF | Tip's own gate |
|---|---|---|---|---|
| freezefix | 2 days | 12 | yes | none on tip |
| sweepfixA | 18 h | 0 | yes | already in main |
| sweepfixB | 15 h | 3 | yes | none on tip |
| orderfeel | 14 h | 1 | yes | none on tip |
| ghostslot | 15 h | 1 | yes | none on tip |
| testrange | 15 h | 1 | yes | none on tip |
| battleclean2 | 14 h | 0 | yes | landed |
| pileflag | 15 h | 2 | yes | none on tip (a train merge was reverted) |
| battlemaps2 | - | - | - | branch does not exist |
| unstuck | 16 h | 2 | no | none on tip |
| dugout | 64 min | 15 | yes | none on tip (train merge was reverted) |
| battlepower | 15 h | 5 | yes | 27 statuses, none red |
| bldqueue | 15 h | 7 | yes | red: controls, tutorial, migrate, migrate-down, migrate-abrupt, migrate-dual |
| techbldgs | 14 h | 11 | yes | none on tip |
| groundreal | 13 h | 4 | yes | none on tip |
| leaderlook | 13 h | 11 | yes | none on tip |
| usvoice | 14 h | 3 | yes | none on tip |
| ammozone | 14 h | 7 | yes | none on tip |
| looktest | 3 h | 3 | yes | none on tip (needs Abdullah's pick) |
| onegame | 14 h | 16 | yes | none on tip |
| nations20 | 15 h | 5 | yes | none on tip |
| civhumans | 13 h | 4 | yes | parked (removed from the game) |
| camphud, nofightit, warpeace, mapshapes, eu4audit | 2 days | 1-14 | mixed | parked (removed from the game) |

Locks `taken/*` with no `orch/*` branch (saved nothing): army-standards, c-real-supply, finish-tokens, freezefix2, realwar, seamless-hud, spylook2 (age not checked; several are old).

Note: the repo has ~15,000 branches (mostly gate/*); `git fetch --prune` times out here — fetch named refs only.
