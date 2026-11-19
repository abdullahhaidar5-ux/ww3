# Conductor state — 2026-11-19 08:00 UTC
main = eb208aa8 (smooth-render, 03:01). No `train/*` in flight (last train 2026-11-18 21:00). Nothing landed this run.

main gate: superfreeze red (also red on main's head, known); everything else green.

| branch | last push | ahead/behind main | HANDOFF | own gate | verdict |
|---|---|---|---|---|---|
| smooth-render2 | 06:58 | 4 / 0 | yes | all green except **controls: WALKTEST FAIL (160)** (twice, 07:32 and 07:51) + superfreeze (main also red) | NOT landed: controls is new red vs main and not on the known-flaky list; likely the "far walkers re-posed every 2nd frame" change. Owner should fix walktest. |
| fix-rangefreeze | 07:46 | 4 / 0 | no | none yet (probe branch) | wait for handoff + gate |
| captest | 00:45 | 2 / 28 | yes | stale | rebase first |
| pack-looks6 | 02:13 | 5 / 28 | yes | stale | rebase first |
| the 20 old train candidates (freezefix ... nations20) | 5-6 days | ~114 behind | - | none | stale; ideas mostly landed through other trains; freezefix/ammozone ~2000 ahead, never merge |

taken/* locks with no orch branch: old locks (sweepfixA/B, unstuck, testrange, usvoice, techbldgs, weathergfx...) all point at old main commits, saved nothing.
Note: origin has ~19,000 branches (gate/*); full `git fetch` takes ~5 min here, so named refs only.
