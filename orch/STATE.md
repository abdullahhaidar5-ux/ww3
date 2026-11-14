# State — conductor run 2026-11-14 00:50 UTC (step 1 only)

Another conductor run is working: `train/20261113-2336` (pushed 23:37 UTC, not in main yet) merges menucamp + battlemaps + spylook.
Its gate (gate/b7d0521c13) shows 29 of 29 green. main head 77b4ee84 (train 12) shows red on gate/main, cfclient, icons, audio (flaky set).
This run did not build a train.

| Idea (branch) | Last push | Ahead of main | Handoff | Note |
|---|---|---|---|---|
| menucamp | 11-13 13:49 | 3 | yes | in train 2336 |
| battlemaps | 11-13 04:07 | 4 | no | in train 2336 |
| spylook | 11-13 00:33 | 7 | yes | in train 2336 |
| freezefix | 11-13 03:04 | 12 | yes | not in train 2336 — waiting |
| sweepfixA | 11-14 00:39 | 3 | yes | own gate 6ee6043f: only `save` seen so far |
| sweepfixB | 11-14 00:32 | 2 | no | active |
| orderfeel | 11-14 00:10 | 1 | no | active |
| civhumans | 11-14 00:03 | 1 | no | active |
| slicesweep | 11-13 14:14 | 1 | no | idle 10 h |
| plan75 | 11-13 17:34 | 15 | no | idle |

Locks with no branch: taken/freezefix2, taken/spylook2, taken/unstuck (12+ h, saved nothing).
Campaign branches (camphud, nofightit, warpeace, mapshapes, eu4audit): parked (campaign paused).
