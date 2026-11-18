# STATE (conductor, 2026-11-18 00:40 UTC)
main = a9ed6ea61 (anthems landed by its own helper at ~00:0x; smoothaudit landings before). No train landed this run.

| branch | last push | ahead | handoff | gate | verdict |
|---|---|---|---|---|---|
| orch/smoothaudit2 | 23:30 | 2 code (e43e0d1 instanced soldiers) | yes | gate/e43e0d1d0a: 27 ok; superfreeze red twice, latest "8 new meshes (max 6)" on IR (not seen in 7 recent main superfreeze logs, which fail on long frames only); smooth-pc ok, smooth-mp ok on 2nd run | HELD: new-meshes failure may come from SOLB; helper says pre-existing VAO flake but main logs do not show it. Needs a re-run / look |
| orch/voices3 | 23:35 | 3 | no | train gate 2ca0773415: decisions red "v3voice: missing vo/JP_*.mp3, Hebrew announcer has no clips" (branch-only guard, audio not wired) | NOT READY: casts/renderers only, no recorded clips yet |
| orch/anthems | - | 0 | yes | landed on main | done (KP Arirang still pending its download) |
| orch/voices-lb2 | 17:22 | 6 | yes | none | HOLD: DECISIONS says keep Saturday's Lebanese voices |
| orch/orch2-notes, conductor-state-* | - | - | - | - | docs only, never to main |
| taken/* | all older than 2 days; taken/drawcalls, redgates, savesync have no orch branch (saved nothing) | | | | |

Train 20261117-2350 (smoothaudit2 + anthems + voices3), gate 2ca0773415: red = decisions (voices3), superfreeze (OB longest frame 494 ms, flaky), loadfreeze (14 programs in one go, passes at 8-11 on main), cfclient (flaky), migrate-down (red on main too). Not landed.
Never-land branches: parked (removed from the game).
