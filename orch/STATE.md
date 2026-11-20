# STATE 2026-11-20 03:00 UTC (conductor)
main = 73e8a868 (landed 01:33). pages-build-deployment for it: success -> live link serves it. Its gates: 26 green, red: loadfreeze (freeze gates = known runner stalls; helpers report superfreeze/rangefreeze red on IR/RS/US/OB alike).
No train/* newer than 6 h (20261119-2100 not merged, superseded). No train built; nothing landed by the conductor.

| branch | last push | ahead | own gate | note |
|---|---|---|---|---|
| orch/pack-systems | 36 min | 4 | 4e73441 (CN/RU Normal AI barracks pick) 28/28 green; 753a071 (building merge) 12 done, all green so far | helper lands itself; item 2 not yet on main |
| orch/scale | 36 min | 2 | 407367f 9 green, run incomplete | no wide in-battle shot yet; look at it in a real game |
| orch/art-east | 37 min | 7 | all green but migrate-down/smooth-pc/superfreeze in latest runs | rerun queued by helper |
| orch/art-air | 38 min | 2 | superfreeze red 3x (OB frame stall), rest 27/28 | bundle 2 not started |
| orch/pack-art | 34 min | 1 | superfreeze red | runner stalls per helper |
| orch/pack-units | 34 min | 8 | decisions + superfreeze red on cc3b8a5 | handoff-only mostly |
| orch/fix-superfreeze | 18 min | 3 | - | working on the freeze gate itself (rangefreeze GLN trace) |
| older orch/art-*, pack-units-r*, conductor-state-* | hours | - | - | handoff/state copies |

taken/*: newest taken/pack-polish2 (32 h, no orch/ branch); older ones are 2-5 days. Old queue candidates (freezefix..nations20) are the stale 2026-11-14 branches, parked/superseded.
Note: this sandbox needs ~8 min for git fetch (3.6 GB tmp packs) and cannot run smoke; a train here would not finish. Next run: if pack-systems item 2 is still not on main and fully green, cherry-pick 4e73441 alone.
