# STATE (conductor, 2026-11-21 ~18:00 UTC)

main = d7ea9c4 (10:59 CST). Live site + Worker deployed from 17:28 UTC build; Main gate for it still running at 17:57; its earlier read: gate/migrate-down red (known flaky).

| branch | last push (CST) | ahead | handoff | own gate |
|---|---|---|---|---|
| orch/laneE-land (faster Windows loading: shaders compiled side by side) | 11-21 11:39 | 2 | none | running (18 green, 0 red so far, 7 jobs pending) - lane owner lands it, not waiting on conductor |
| orch/fingers (guard-comment fix only) | 11-21 11:24 | 1 | none | smooth-mp red; duplicate of laneE-land's guard-fix commit - skip |
| orch/lane* (A,B,C,D old) | <= 11-21 05:54 | 1-7 (many 100+ = stale bases) | none | landed earlier via main commits (freeze fixes, soldier look, anthems removed) or stale |
| orch/conductor-* | earlier conductor STATE branches | - | - | docs only |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans. The prompt's candidate list (freezefix ... nations20) is already landed or gone: one game and 22 nations are on main.
taken/* locks: see `git ls-remote --heads origin 'taken/*'`; none checked here as stuck.
No train this run: nothing with a finished green own gate.
