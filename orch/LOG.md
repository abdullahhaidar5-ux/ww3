# ORCH log

Newest first. One entry per cycle: date/time (Chicago), what shipped, what failed or was rolled back, gate results.

## 2026-10-26 — cycle 1

- Baseline: build in sync with live, `SMOKE PASS`. No requests from Abdullah waiting.
- Shipped: multiplayer sync test `orch/mpsync.mjs` (QA) now in the gate; helicopter rotor wash (Visuals; one-line
  hook in `06-view`).
- Checked, no change needed: stuck/idle units in long games (Battlefield), per-nation music (Audio).
- Gate on shipped main: `--check` OK, smoke 2p PASS, smoke 4p PASS, MPSYNC PASS. No sim/net code touched → no review.
- New backlog: Rivers all-surrender draw, music polish/recorded scores, menu music, mpsync extensions, gate OOM.

## 2026-10-25 20:30 — ORCH set up

- Gathered every past WW3 agent (≈45 scheduled rounds across runs #0–#5, Oct 18–23), the `testbed` branch and the
  live build into `orch/HISTORY.md`. No old loops are still scheduled.
- Recovered the game sources from the live `index.html` into `src/` (12 modules, byte-identical rebuild). The repo
  is now the single source of truth; `orch/build.py` builds, `orch/smoke.mjs` gates.
- Gate: baseline `SMOKE PASS` — 3 players (IR vs US vs CU) on Strait, 4 game-minutes, peak 46/25/22 entities.
- `testbed` netcode work found ~95% merged into live; left in place, review queued in the backlog.
- Organized all open ideas and Abdullah's standing decisions into `orch/BACKLOG.md` and `CLAUDE.md`.
