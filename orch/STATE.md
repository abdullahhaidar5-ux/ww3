# STATE 2026-11-20 06:00 UTC (conductor)
main = db5bb4a (fix-superfreeze audio fix, landed itself 05:19 UTC). Newest train/* is 20261119-2100 (9 h old, not merged); no other conductor running.
No train built, nothing landed by the conductor this run. Why: the old queue (freezefix..nations20) is stale - onegame/nations20 etc. are far behind main and parked; the active branches below land themselves on their own gate, and the branch tips have no gate statuses of their own yet (a gate/<sha> run of the exact tip is needed before a train).

| branch | last push | ahead | note |
|---|---|---|---|
| orch/art-air | 04:46 | 1 | drone art, already on main |
| orch/trailer-clips | 04:43 | 5 | trailer cuts, not for main |
| orch/trailer | 04:34 | 9 | not for main |
| orch/scale | 04:25 | 2 | vehicles drawn bigger; no own gate on tip |
| orch/fix-superfreeze | 04:07 | 5 | fixing the freeze gate |
| orch/pack-systems | 04:03 | 6 | handoff present; lands itself |
| orch/pack-units-b | 04:02 | 2 | no gate on tip |
| orch/art-west-n | 03:54 | 1 | gate/decisions FAILED on its tip - owner to fix |
| orch/art-east8 | 03:50 | 1 | working |
| orch/art-east | 02:14 | 7 | rebased, gate rerun pending |
| orch/pack-units | 02:17 | 8 | mostly docs |

taken/* locks: newest taken/pack-polish2 (11-18 19:08); none new in the last 90 min; older ones are leftovers. Never-land / stale branches (onegame, nations20, camphud...): parked.
Known-red on every run: superfreeze / rangefreeze / loadfreeze (runner stalls).
