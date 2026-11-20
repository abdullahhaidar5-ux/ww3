# STATE 2026-11-20 04:00 UTC (conductor)
main = 6e9f89844 (Regional art kits, 02:56 UTC). No train/* newer than 7 h (newest 20261119-2100, not merged). No train built, nothing landed by the conductor this run.
Why: git fetch in this sandbox takes ~8 min and smoke cannot run here, so a train would not finish; every active helper lands its own work on its own gate. The old queue (freezefix..nations20) is stale (branches gone) = parked.

| branch | last push | ahead | note |
|---|---|---|---|
| orch/art-east8 | 4 min | 1 | new, working |
| orch/trailer | 11 min | 6 | trailer cuts, handoff present; not for main |
| orch/art-air | 12 min | 3 | drone art; own gate a8b828d (look at statuses on gate/a8b828dde3) |
| orch/pack-systems | 36 min | 5 | building merge + cap test; handoff present; helper lands itself |
| orch/fix-superfreeze | 80 min | 3 | working on the freeze gate itself (GLN trace); handoff present |
| orch/scale | 2 h | 2 | vehicles drawn bigger; gate 407367f: superfreeze red only (known runner stall) |
| orch/art-east | 2 h | 7 | rebased, gate rerun queued per handoff |
| orch/pack-units | 2 h | 8 | camo plan handoff, mostly docs |
| older art-*, pack-units-r*, conductor-state-* | hours | - | handoff/state copies |

taken/* locks: 101 on origin, none new in the last 90 min worth flagging; old ones (days) are leftovers.
Known-red on every run: superfreeze / rangefreeze / loadfreeze (runner stalls), fix-superfreeze is on it.
