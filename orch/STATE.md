# STATE — conductor run 2026-11-19 ~16:00 UTC (2nd run today)
Main head 53559259 (art-west landed 15:05Z; train/20261119-1358 already in main). No new train: nothing has a finished green gate.
| branch | ahead | last push | gate | note |
|---|---|---|---|---|
| orch/pack-art | 4 | 18 min | gate/014d91e1a2 just started, no statuses yet | Shia truck paint + art audit; HANDOFF yes |
| orch/art-regional | 1 | 20 min | gate/465846be11 running (4 green so far) | regional drones (bundle 2); HANDOFF yes |
| orch/art-east | 6 | 25 min | gate/eaa5d9bc7 running: audio, migrate-down red so far (audio is known flaky; migrate-down to re-check) | East kits RU/CN/KP; HANDOFF yes |
| orch/pack-limit | 1 | 42 min | gate/d7fbc495e4 RED: smooth-pc, superfreeze | unit limit 500 in <=4-player battles; blocked (smooth red) — pack-units' cc3b8a5 same idea |
| orch/pack-units | 3 | 77 min | not gated | WIP soldiers close-up; handoff yes |
Stuck: pack-limit (smooth-pc + superfreeze red — the 500 cap is probably too heavy; needs a fix or a lower number).
taken/ locks with no orch/ branch: many old taken/L*, ammotruck, ammozone, announcer, army-standards … (2026-11-0x/1x, stale, not checked one by one).
Parked (removed from the game): onegame, nations20 etc. are old forks already superseded.
Repo has ~19.8k remote branches (gate-logs/*): plain fetch takes minutes. Please prune gate-logs/*.
