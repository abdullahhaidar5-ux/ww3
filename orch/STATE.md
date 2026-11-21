# STATE (conductor, 2026-11-21 ~19:00 UTC)

main = d7ea9c4 (10:59 CST), live on Pages (17:28 UTC build ok). Main's own gate: gate/decisions RED ("instanced soldiers: ON, texture pre-sized (64 rows)" guard - left over from the 23-bone soldier change) and gate/migrate-down red (known flaky, timed out waiting for client B).

| branch | last push (CST) | ahead | handoff | own gate |
|---|---|---|---|---|
| orch/laneE-land (faster Windows loading; bone-texture pool sized for 23-bone soldiers; guard fix) | 11-21 12:46 | 9 | none | just started (2 statuses at 18:50 UTC); it carries the fix for main's red decisions guard - lane owner lands it |
| orch/fingers | 11-21 11:24 | 1 | none | duplicate guard fix, skip |
| other orch/* | stale / landed earlier | - | - | - |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
No train this run: nothing with a finished green own gate. No train/* newer than 20261121-0012-hold.
