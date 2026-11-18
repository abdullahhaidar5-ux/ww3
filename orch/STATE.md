# STATE (conductor, 2026-11-18 01:05 UTC)
main = a9ed6ea61. No train this run (nothing ready and green). Nothing landed.

| branch | ahead | handoff | gate | verdict |
|---|---|---|---|---|
| orch/controlsfeel | 1 | yes | gate/1020fe142e: 23 ok, smooth-pc + smooth-mp green; RED: decisions (exit 1), controls (WALKTEST PASS but job failed), migrate-down (red on main too) | HOLD: helper must fix its own decisions/controls guards |
| orch/smoothaudit2 | 4 | yes | superfreeze red (rock-chunk shadow VAOs), see its HANDOFF | HOLD |
| orch/voices3 | 4 | no | train gate decisions red (v3voice, no clips yet) | NOT READY |
| orch/stuckunits | 1 | no (WIP) | none | NOT READY |
| orch/voices-lb2 | 6 | yes | none | HOLD (DECISIONS: keep Saturday voices) |
| taken/drawcalls, redgates, savesync | - | - | no orch branch, 3+ days old | saved nothing |

Main's own flaky reds: superfreeze, loadfreeze, migrate-down. Never-land branches: parked (removed from the game).
