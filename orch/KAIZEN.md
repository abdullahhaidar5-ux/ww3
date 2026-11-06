# KAIZEN — non-stop small improvements (Abdullah 2026-11-06 17:15: "Become faster and more efficient. Follow kaizen style development. Non stop iterations and improvements. Let's really go.")

## The cycle (one iteration ≈ 1 hour, then the next starts immediately)
1. **Measure** (cheap, from tools — not by reading code): gate statuses on main, `node orch/smooth.mjs --profile pc` fps, console
   errors in smoke, `node orch/grandtest.mjs`, newest screenshots, open HANDOFF-*.md files, stale orch/* branches (no push > 3 h
   and not merged), BACKLOG top, player-visible bugs.
2. **Pick ONE improvement** with the best value ÷ effort that no running helper is touching (check branches pushed in the last
   60 min and the files they change: `git diff --stat origin/main...origin/orch/<b>`). Priority order:
   a) broken/regressed things on main (failing gate, errors, crashes, desyncs);
   b) stalled work (a HANDOFF or a branch stale > 3 h): finish or ship it;
   c) Abdullah's top pains: **looks** (battle graphics realism; the grand map has its own art loop) and **performance**;
   d) intuitiveness/feel (feedback, wording, clutter); e) waste in our own process (slow tests, repeated reading).
3. **Change the smallest thing that gives a visible/measurable gain.** No new systems (SYSTEMS.md), no balance numbers
   (balance helpers own them), no control changes.
4. **Prove it**: same measurement before/after; gate green; never regress.
5. **Ship** (fast-forward to main), **log** one line in the table below, **refresh orch/BRIEF.md**, start the next iteration.

## Efficiency rules for every helper (saves Abdullah's usage)
- Read **orch/BRIEF.md** first — the one-page state of the game — instead of many old reports; open a report only when your
  task needs its details.
- grep + ~100-line ranges only; never whole modules; never index.html; outputs through `tail`.
- One blocking wait instead of polling; quick local checks while working, the full gate once at the end.

## Log (newest first)
| When (UTC) | Iteration | Improvement | Measured gain |
|---|---|---|---|
