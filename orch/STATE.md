# STATE (conductor, 2026-11-14 ~09:00 UTC). main = a3b627b1 (last landing 00:47 UTC, 8+ h ago)

| branch | last push | ahead of main | HANDOFF | own gate |
|---|---|---|---|---|
| freezefix | 11-13 03:04 | 12 (behind 18) | yes (load-hang fix) | none |
| sweepfixA | 11-14 00:39 | 3 (behind 18) | yes | none (in train) |
| sweepfixB | 11-14 03:38 | 7 (behind 18) | yes | none (in train) |
| orderfeel | 11-14 04:37 | 5 (behind 18) | yes | none (in train) |
| ghostslot | 11-14 03:28 | 3 | yes | none (in train) |
| testrange | 11-14 03:06 | 7 | yes | none (in train) |
| battleclean2 | 11-14 04:00 | 8 | yes | none |
| pileflag | 11-14 03:17 | 6 | yes | none; its rally-flag guard FAILED in old train 0256 (decisions) - taken out of train 0900 |
| unstuck / unstuck2 | 11-14 01:59 / 02:39 | 2 / 4 | no | none |
| dugout | 11-14 03:54 | 12 | yes | none |
| battlepower | 11-14 03:03 | 5 | yes | 27 statuses, none red |
| bldqueue | 11-14 03:14 | 7 | yes | 28 statuses, 6 not green |
| techbldgs | 11-14 03:42 | 11 | yes (part 1 ready) | none |
| groundreal | 11-14 05:04 | 4 | yes | none |
| leaderlook | 11-14 05:29 | 11 | yes | none |
| usvoice | 11-14 04:25 | 3 | yes | none (runner queue stuck) |
| ammozone | 11-14 03:55 | 7 | yes | none |
| looktest | 11-14 02:35 | 2 | yes | not landing until Abdullah picks a look |
| onegame | 11-14 04:41 | 16 | yes | none |
| nations20 | 11-14 03:33 | 5 | yes - says 18 nations, Abdullah's later list is 22 | none |
| battlemaps2 | - | - | no branch | taken/ lock absent |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.

Old train train/20261114-0256 (ghostslot, sweepfixB, orderfeel, pileflag, testrange, sweepfixA) never landed: its gate was green except decisions (pileflag rally-flag flash guard) and tutorial (known flaky).
Train train/20261114-0900 = that train minus pileflag, gated now.
Sandbox note: git fetch here takes ~15 min (14k remote branches, 7 GB); local smoke does not finish in 10 min.
