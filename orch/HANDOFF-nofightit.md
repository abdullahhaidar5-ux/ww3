# Handoff: orch/nofightit (campaign battles fought on the map by days, no real-time battle in the grand campaign) — ready for the conductor (28/28 green), NOT landed

Decision: Abdullah Wed 2026-11-11 23:57 Chicago "Abandon battles in grand campaign. Turn it into eu 4 rules", 23:58 "No and now" (orch/DECISIONS.md).
All three steps are in: rules (`src/13a-gwar.js`), battle / siege windows, result cards and map markers (`src/13ab-gwarui.js`), removal of the live battle with its leftovers + docs + guards.

State (Thu 2026-11-12, second run)
- Merged main 77b4ee8 (trains 10-12). Tested commit: `bba4a87` (branch `gate/bba4a87d07`). Commits after it: pictures / picture script / notes only (no `src/`, no build output).
- GitHub test run on bba4a87: **28 of 28 green** (third run, Thu 23:56 UTC: only the failed sound check was re-run twice; it passed - AUDIO PASS).
  The sound check is flaky on main too (same main commit 77b4ee8 passed and failed): `orch/audio.mjs` waits 20 s for the sound sheet, slow runners miss it. This branch touches no sound.
  (First run on 159b8b1 had `decisions` red from two merge leftovers - fixed in bba4a87.) Both allowed test runs are used.

What the merge changed (one source of truth for odds)
- `src/13e3-gtokens.js`: `gtkOdds` now returns `gwOddsAt` (the battle rules played forward; pill: >=60% Good odds, <=40% Bad odds). `gtkFight` reads the running map battles (`GC.bt`), the tug bar reads the battle's own strengths (`va`/`vd`). The old `grAuto` estimate is gone. Odds stay cached per selected army / day (`T.ok`), so grandsmooth is unchanged (green).
- Guards updated: `orch/grandtest.mjs` (pill = gwOddsAt), `orch/decisions.mjs` (gtkOdds -> gwOddsAt, no grSideVal in the tokens file), `orch/drilltest.mjs` (old gdrApplyBattle hook must stay gone).
- Conflicts resolved as the conductor's run-15 note said (g3HitAt/g3Click, svFront + svCanSave, first hint, smoke, grandtest); index / campaign bundle / sw.js rebuilt.
- Commander's radio and edge alerts (`src/09b-radio.js`) are battle-only code with no campaign wording: nothing to change.

Not taken: `orch/finish-report` (report card + front lines). Its card was written for the old auto-resolve and the Fight-it result page, both gone here; this branch has its own result card (`gwCard`). Its front-line drawing is independent and can be rebased on top later by its own helper.

Open points
- `.github/workflows/gate.yml` comments still say "Fight-it" (comments only; workflow files not touched).
- One garrison unit card shows the label "undefined" (Iraq garrison strip, visible in `orch/concepts/nofightit/result.jpg`); not looked into.
- Zone of control is not built (noted for later).
- Proof pictures in `orch/concepts/nofightit/`: `battle.jpg` (battle window), `siege.jpg` (siege window), `token.jpg` (army token with odds pill, added in the third run - pictures/script only, no game code), `result.jpg`, `markers.jpg`, balance table `orch/reports/eu4-battles.md`, `node orch/gwartest.mjs` = GWAR PASS.
