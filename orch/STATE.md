# STATE 2026-11-18 ~09:15 UTC (conductor)

main = ef814ce6 (pack-looks2 helper landed shadow half-rate + soldier kill-switch itself while the train gated).
Train train/20261118-0800 (pack-looks2-shadow) gated: all green incl. smooth-pc/mp except flaky `icons`. NOT landed: main already carries the same change. Nothing else ready.

Old candidate list (freezefix, onegame, nations20 ...) is obsolete: one-game and supply lines are already on main.

| branch | ahead | note |
|---|---|---|
| orch/pack-economy | 1 (handoff only) | code landed; balance tournament run balance/economy-1118 pending |
| orch/pack-looks | 1 (handoff only) | instanced soldiers landed earlier |
| orch/pack-looks2 / -shadow | landed | items 2-3 (national vehicles) not started |
| orch/voices3 | 9 | FR/GB/DE/JP voice re-records; no handoff, no own gate seen; not landed |
| orch/voices-lb2 | 6 | RS Lebanese re-record, waits for Abdullah to listen (never merge unasked) |
| orch/smoothaudit2 | 4 | instanced soldiers already on main via pack-looks; docs only |
| orch/orch2-notes | 3 | DECISIONS lines only |
Saved nothing: none seen (taken/endscreen has orch/endscreen).

## 08:55 UTC check (second conductor run; did step 1 only, a train was <110 min old)
- main = ef814ce6. train/20261118-0800 is 50 min old and not on main (its change is already on main) so no new train started.
- Waiting for a gate: orch/pack-battlefield2 (1 commit: camera pan on real frame time) gate/3a63c82711 is running, 2 of ~25 statuses so far.
- No gate run yet: orch/voices3 (12 ahead, 29 behind), orch/pack-economy (1 ahead), orch/smoothaudit2 (4), orch/orch2-notes (3, notes only), orch/pack-looks2 (2).
- Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans, src/13* only.
- taken/ locks with no orch/ branch: endscreen has a branch (fine); rv-voice, drawcalls, redgates, savesync, uiaudit, icons, zhfeel(2), announcer, pcolor, roadcap, menubg, mplobby are 4+ days old and saved nothing on orch/ under that name.

## 09:50 UTC check (third conductor run; step 1 only, train/20261118-0800 is 104 min old and not on main)
- main = ef814ce6. No train started.
- orch/pack-battlefield2 (camera pan on real frame time, 1 commit): gate/3a63c82711 finished: 27 green, 1 red = gate/superfreeze (see below if main shows it too). Not landed yet; next run decides.
- Unchanged: voices3 (12 ahead, no gate), pack-economy, pack-looks2, smoothaudit2, orch2-notes waiting; parked list as above.

## 11:50-12:10 UTC check (fourth conductor run)
- main = e15752b9 (thunderstorm look, pack-looks3). Its own gate is RED: controls, loadfreeze, migrate-abrupt, tutorial. loadfreeze and tutorial were green on the first run of the same commit, red on the second, so mostly flaky; migrate-abrupt ("AI took over the old host's side but did nothing in 105 game-s") seen red once.
- Train train/20261118-1200 = main + orch/pack-battlefield2 (camera pan on real frame time). Its own gate/3a63c82711 had only gate/superfreeze red (ef814ce6 had the same red then went green). Train gate gate/0e921fab40 running; lands only if no red that main lacks.
- Not landed: orch/voices3 (waits for Abdullah to listen), voices-lb2 (same), pack-economy / pack-looks3 / orch2-notes (handoff or notes only), smoothaudit2 (docs only).
- Old Nov-13 candidate list (freezefix ... nations20) obsolete: one game, supply lines, 22 nations are on main.
- 13:00 UTC: train/20261118-1200 gate gate/0e921fab40: 27 of 28 green incl. smooth-pc, smooth-mp, controls, loadfreeze, tutorial, migrate-abrupt. gate/superfreeze RED: rangefreeze "OB longest frame 962 ms is 926 ms over quiet 36 ms (max 300)". Same red on 3a63c82711 and on ef814ce6 (no camera change), green twice on main e15752b. Re-run of the job started 12:29, still running at 13:00. NOT landed. Next run: if the re-run is green, fast-forward land train/20261118-1200 (rebase on main first); if red, ask for a look at the Test-range OB wave stall (a sim/FX freeze), not the camera change.

## 13:55 UTC check (fifth conductor run)
- main = e15752b9 (unchanged). train/20261118-1200 (main + camera pan on real frame time) is 2 h old, gate/0e921fab40: 27 green, only gate/superfreeze red, again after the re-run (13:01 UTC: "OB longest frame 962 ms ... max 300"). Same red seen on ef814ce6 (no camera change) and 3a63c82711; green on e15752b9 twice. Looks like a flaky Test-range OB wave stall, not the camera change. NOT landed (rule: re-run once, still red). No new train.
- Others unchanged: voices3 / voices-lb2 wait for Abdullah to listen; pack-economy, pack-looks3, orch2-notes, smoothaudit2 handoff/docs only. Old Nov-13 list obsolete.
