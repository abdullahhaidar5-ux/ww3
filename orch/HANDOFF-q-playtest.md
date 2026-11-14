# Handoff: Friend-night playtest kit (loop, 2026-11-11 01:35Z)

**State:** finished on branch `orch/loop-playtest`, commit 5aafe339 (one commit on top of main 87a097fe). Not on main.

**What it is:** Extras → Playtest card: ten new things to try this week, thumbs up/down and a one-line note each, remembered in
the browser, "Save playtest file" downloads `ww3-playtest-<date>.json` to send to Abdullah (no names, emails or addresses).
- `src/08n-playtest.js` — the card (`wwPlaytest()`, `wwPlaytestData()`); if the report-file maker from orch/safetyH
  (`wwReportFile`) is in the page, game state and last errors ride along (one route with Report a problem).
- `src/14-menu.js` — one new Extras item.
- `orch/playtest-digest.mjs` — `--card` refills the ten items from the newest orch/HISTORY.md lines (then rebuild);
  no argument = reads returned files in `orch/playtest-in/` and writes the ranked top-10 to `orch/reports/playtest.md`;
  `--selftest` prints PLAYTEST PASS.
- `orch/smoke.mjs` — checks the card (10 rows, a vote lands in the file, menu item present).

**Checked here:** build + `--check` OK, SMOKE PASS (460 s), PLAYTEST PASS, looked at a screenshot of the card.
**Not checked:** the full gate. `gate/5aafe339e0` (run 42936807120) was pushed 01:09Z and was still queued at 01:33Z; every
CI run in the repo was queued or pending, none in progress.

**Next:**
1. Read the `gate/*` statuses of 5aafe339 (or re-run `orch/cigate.sh` after rebasing on main and rebuilding).
2. Land if no gate is red that is not red the same way on main. It is a menu window, not a battle/look change.
3. In the landing commit: one line in orch/HISTORY.md, tick the queue item, run `node orch/playtest-digest.mjs --card`
   + `python3 orch/build.py` so the card shows the newest lines.
4. Not done: the selftest is not in a CI gate yet (smoke covers the in-game card only).
