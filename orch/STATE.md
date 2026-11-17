# STATE (conductor, 2026-11-17 23:07 UTC)
main = b6b5a5c75 (smoothaudit landings). Last train 20261117-0950 is in main.

| branch | last push | ahead | handoff | gate | verdict |
|---|---|---|---|---|---|
| orch/smoothaudit2 | 22:32 | 3 | no | gate/7cc0afd8f3: 24 ok, mpsync + migrate-abrupt still running | landing candidate (shader fix + rangefreeze trace + decisions note) |
| orch/voices-lb2 | 17:22 | 6 | yes | none | HOLD: waits for Abdullah's OK; DECISIONS says keep Saturday's Lebanese voices |
| orch/orch2-notes, conductor-state-* | - | 1 | - | - | docs only, never to main |
| onegame, nations20 etc. | - | - | - | - | already landed / not present |
| taken/* | all older than 2 days; no orch branch for taken/drawcalls, redgates, savesync (saved nothing) | | | | |
