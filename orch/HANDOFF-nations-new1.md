# HANDOFF nations-new1 (2026-11-06)
Branch `orch/nations-new1` (head 34941bf3, merged with main at that time) is pushed but NOT on main: local SMOKE PASS, CI gate run 42209739939 had 15/21 green
(check, save, smooth-pc, smooth-mp, mapsweep, migrate*, audio, ew, servertest, cfclient, mpsync-server, controls, art-mpsync) and 6 jobs
(mpsync, decals, art-smoke, migrate-down, headless, smoke4) hung at runner "Tools" setup for 40+ min; cancelled and re-ran failed jobs, still not finished after ~25 min.
Next: when those 6 pass (or re-run gate/<sha>), `git merge origin/main`, `python3 orch/build.py`, fast-forward push to main, open main->servers-live PR.
Open work: see orch/reports/nations-new1.md "Still open" (XTTS voices, anthems, full balance tourney, RS Ashura/shrine content, JP).
