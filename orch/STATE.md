# STATE — conductor 2026-11-20 11:50 UTC (state only; another conductor's train is still open)

main = b86a73e3 (07:59 UTC). Open train: train/20261120-1103 (last push 10:55 UTC, 12 commits ahead of main, not landed yet) -> this run did step 1 only.

All candidate branches named in the conductor prompt were last pushed 2026-11-13/14 (6+ days old), none has moved since; ahead counts are vs. today's main, so they are stale and would need a rebuild/rebase:

| branch | last push | ahead | HANDOFF |
|---|---|---|---|
| freezefix | 11-13 03:04 | 2203 | yes |
| sweepfixA | 11-14 00:39 | 9 | yes |
| sweepfixB | 11-14 03:38 | 13 | yes |
| orderfeel | 11-14 04:37 | 11 | yes |
| ghostslot | 11-14 03:28 | 26 | yes |
| testrange | 11-14 03:06 | 30 | yes |
| battleclean2 | 11-14 04:00 | 31 | yes |
| pileflag | 11-14 12:46 | 30 | yes |
| battlemaps2 | - | - | branch missing |
| unstuck | 11-14 01:59 | 8 | no |
| dugout | 11-14 12:46 | 39 | yes |
| battlepower | 11-14 03:03 | 28 | yes |
| bldqueue | 11-14 03:14 | 30 | yes |
| techbldgs | 11-14 12:46 | 35 | yes |
| groundreal | 11-14 05:04 | 27 | yes |
| leaderlook | 11-14 05:29 | 34 | yes |
| usvoice | 11-14 04:25 | 26 | yes |
| ammozone | 11-14 03:55 | 2046 | yes |
| looktest | 11-14 09:07 | 26 | yes |
| onegame | 11-14 12:46 | 40 | yes |
| nations20 | 11-14 12:46 | 29 | yes |

Repo has 22098 remote heads (565 orch/*, 101 taken/*, 43 train/*): a plain `git fetch --prune` times out (>2 min); fetch named refs only.
Gate statuses and taken/* lock audit not done this run (stopped early).
