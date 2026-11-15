# Battle maps: fairness report

Written by `node orch/battlemapfair.mjs --report` (structure checked now; win rates from the saved AI-vs-AI Battle games in `orch/out/battlemapfair-battles.json`).

## Structure

| Map | Players | Supply sources / derricks | Nearest supply (each start) | Derricks in reach | Route to nearest enemy | 2+ attack routes | Verdict |
|---|---|---|---|---|---|---|---|
| Breakwater | 2 | 12 / 10 | 533 / 573 | 7 / 7 | 5430 / 5430 | yes | pass |
| Breakwater | 4 | 12 / 10 | 533 / 573 / 533 / 533 | 3 / 3 / 3 / 3 | 2690 / 2723 / 2723 / 2690 | yes | pass |
| Ferry Quarter | 2 | 6 / 4 | 556 / 533 | 2 / 2 | 3480 / 3480 | yes | pass |
| Four Mills | 2 | 10 / 6 | 669 / 669 | 4 / 4 | 5510 / 5510 | yes | pass |
| Four Mills | 4 | 10 / 6 | 669 / 669 / 669 / 669 | 2 / 2 / 2 / 2 | 3078 / 3111 / 3111 / 3078 | yes | pass |
| Six Roads | 2 | 18 / 6 | 589 / 589 | 4 / 4 | 6885 / 6885 | yes | pass |
| Six Roads | 4 | 18 / 6 | 589 / 589 / 549 / 549 | 2 / 2 / 2 / 2 | 2826 / 2826 / 2826 / 2826 | yes | pass |
| Six Roads | 6 | 18 / 6 | 589 / 589 / 549 / 549 / 549 / 549 | 2 / 2 / 2 / 2 / 2 / 2 | 2826 / 2826 / 2826 / 2826 / 2826 / 2826 | yes | pass |
| Split Ridge | 2 | 6 / 4 | 533 / 533 | 3 / 3 | 3845 / 3845 | yes | pass |
| Tar Basin | 2 | 6 / 5 | 533 / 533 | 4 / 4 | 3480 / 3480 | yes | pass |

Distances are driving distances on the ground grid, in map units. Tolerances and method: header of `orch/battlemapfair.mjs`.

## Win rate per start position (AI vs AI, mirror matches)

Every player in a game is the same nation, so only the start position differs; the nation changes from game to game, and the seats rotate through the start positions and the two sides swap team numbers, so a seat's or a team number's own quirks cancel out. 2 players: 1v1. 4 / 6 players: 2v2 / 3v3 over every split of the starts into two teams. Out of time: the side with 1.15x the value wins, else a draw (half a win each). Pass = every start between 40% and 60%. The verdict uses rounds 4 and 5 (design and size fixed before they were run).

| Map | Players | Games (decided by kill / on time / draws) | Win rate per start | Verdict |
|---|---|---|---|---|
| Split Ridge | 2 | 120 (111 / 7 / 2) | 59% / 41% | pass |
| Ferry Quarter | 2 | 40 (36 / 3 / 1) | 44% / 56% | pass |
| Breakwater | 4 | 48 (47 / 1 / 0) | 56% / 44% / 52% / 48% | pass |
| Four Mills | 4 | 48 (46 / 2 / 0) | 52% / 52% / 44% / 52% | pass |
| Six Roads | 6 | 180 (178 / 2 / 0) | 54% / 54% / 53% / 53% / 45% / 42% | pass |
| Tar Basin | 2 | 120 (117 / 2 / 1) | 60% / 40% | FAIL |

Replay: `node orch/battlemapfair.mjs --battles --games 40 --round 4` and `--round 5` (same seeds, same games).
