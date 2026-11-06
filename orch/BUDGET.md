# BUDGET — constant development without breaking Abdullah's usage (Abdullah 2026-11-06 17:18)

"Make sure this development won't break usage but still occur constantly."

## The governor (every loop iteration checks this FIRST, before reading anything else — costs ~nothing)
1. **Concurrency cap = 4 helpers.** Count active helpers = distinct `origin/orch/*` branches pushed in the last 45 min and not
   merged into main (`git for-each-ref --sort=-committerdate refs/remotes/origin/orch --format='%(refname:short) %(committerdate:unix)'`
   + `git branch -r --no-merged origin/main`). If **≥ 4 are active, a loop iteration exits immediately** ("budget: busy") and the
   hourly schedule tries again later. Planned helpers (nations, grand stages, look passes, voices, balance) always go first.
2. **Daily cap per loop: 12 iterations** (Chicago day). Each loop counts its own log rows for today (KAIZEN.md log / artbar.md);
   at 12 it exits ("budget: daily cap") until midnight.
3. **Self-start only when quiet.** At the end of an iteration a loop starts the next one immediately only if ≤ 2 other helpers are
   active; otherwise it leaves it to the hourly schedule.
4. **If a helper hits a usage/rate limit error**, it writes its HANDOFF, pushes, and stops (no retries in a tight loop); the
   next scheduled run resumes.

**Exception until the deadline (Sat 2026-11-07 20:00 Chicago):** the ART LOOP is planned work — it ignores rules 1–3 (runs back to back, no daily cap) but still never runs two iterations at once. The KAIZEN loop starts only after the deadline.

## Cheap-by-default rules for every helper
- Read `orch/BRIEF.md` first, not old reports. grep + ~100-line ranges only. Outputs via `tail`.
- One ~1-hour focused change per iteration; no exploratory refactors.
- Run the full gate only when code changed; docs-only changes skip it.
- Small screenshots (≤ 400 px) for self-review; full size only for Abdullah's pictures.
- Sonnet for all loops; Opus only if Abdullah asks.

Pause any loop: Abdullah says "pause kaizen" / "pause art loop" → the orchestrator disables that scheduled task.
