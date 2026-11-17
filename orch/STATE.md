# STATE (conductor, 2026-11-17 19:50 UTC)

main head 0a6ed30 (smoothaudit landing 1). Last train 20261117-0950 is in main. No train in flight.

| branch | last push | ahead | handoff | newest gate | verdict |
|---|---|---|---|---|---|
| orch/smoothaudit | 19:29 | 2 | none | 34ea9149 all green (28); ded9b665 gate still running (3 done, green) | helper lands it itself; not racing it |
| orch/voices-lb2 | 17:22 | 6 | yes: waiting for Abdullah's ear | none | branch only, not landed |
| orch/redfixE | 16:33 | 0 | yes | - | already in main |
| orch/rangefreeze | 14:21 | 0 | yes | - | already in main |
| orch/shiamissions | 07:37 | 0 | yes | - | already in main |

Everything else under orch/* is older than 2 days and already merged or parked (conquest/campaign work removed from the game).
Stale locks (no orch branch, 2+ days old): taken/rv-voice, taken/drawcalls, taken/redgates, taken/savesync.
No train made this run: nothing finished and ready outside smoothaudit's own landing flow.
