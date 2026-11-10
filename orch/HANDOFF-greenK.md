# HANDOFF greenK (2026-11-10, Claude)

## Fixed and on main (tests/guards only; the player-facing game is unchanged except two reworded grand-map sentences)
- decisions: two grand-map sentences said "turns against" (gcovert, gnuke) -> reworded "rounds on"; the menu-order guard was stale (Battle is a main item since 2026-11-07 21:38; menusB later makes it Single player / Multiplayer / Test range, 21:41). GREEN on CI.
- audio (mixtest 3): the test measured ducking in a loud fight (effects duck deeper by design) -> sets heat 0 first. GREEN.
- grand (eco "default handled"): IR income now covers a normal 1,500 bond, so no default happened and other costs made cash -29; test now forces a real default (debt 1e9). Fix pushed after the last full run (verify).
- cfclient: cfclient.mjs itself passes; cfclient-password and cfclient-startpick still drove the OLD single-page setup screen. They now call menuGo('online') / menuGo('c-players') first. password PASSES; startpick passes steps 1-2, step 3 (lobby) fixed in the last commit (verify).
- tutorial: ring/marker checks now wait up to a few seconds for slow runners (marker + step-3 ring pass). STILL RED: (a) step 3 "a red enemy exists" - the two scouts are killed while the camera settles (timing), (b) step 9 "retake" never completes: takeHouses units stand 36 units from the cell and never enter; same failure on 3364ee9 so it is a real game/test mismatch, not noise. Needs a browser debug session of tutorial step 9 (orch/tutorialtest.mjs takeHouses, src/08b-social.js `retake`).
- Part 3 done: .github/workflows/main-gate.yml (full gate on every push to main -> status gate/main + one line per push in orch/GATE-MAIN.md on branch `reports`; INCOMPLETE if <28 gates, ignores cancelled runs) and bisect-push.yml (push `bisect/<test>/<good-sha>` to bisect a gate on CI; `runone/<test>` workflow exists on branch runone/smooth-mp).

## Still red: smooth-mp (and smooth-pc load time is borderline) - NOT a code regression we could find
- smooth-mp "client frame p95" / "order latency p95" fail on EVERY commit measured: current main 330-700 ms, 6 bisect steps back to 11-07 330-510, and the ROOT commit d0f2ebff (runone run) 235 then (retry) latency 274 - all over the 2026-11-04 baseline (125 ms / 116 ms). One bisect step passed by luck. The bisect result (70c657c9 "gsea shots") is noise, not a cause.
- Conclusion: the committed baseline (taken 11-04 on another machine, bench 12.7) is not comparable with GitHub runners; the gate can't pass reliably there even on the oldest commit. I did NOT re-baseline or raise a budget (CLAUDE.md forbids). Decision for ORCH/Abdullah: re-measure the baseline on CI itself (median of 5 runs of the root commit via runone/smooth-mp) and keep the ratios, OR keep as is and treat smooth-mp as advisory. After that the "RIGHT NOW" bullet in CLAUDE.md can go.
- smooth-pc: only "load time s" (104 vs allowed 102, 91 on the previous run) - same noise class.

## Parked branches (merged locally, NOT on main)
- prep/polishE (= menusB + polishE on current main): gate run on 87414614 (gate/menusB-polishE2). First run c0cd3dda: green except smooth-mp, cfclient (startpick step 3, fixed), controls (first-steps popup sat over the units; fixed: no auto-popup under navigator.webdriver). Land it when that run shows only smooth-mp red.
- prep/dashI, prep/snap (loop-grand-snap), prep/qlook, prep/qfeel: merged and conflict-free on top of that stack (prep/qfeel = everything), each builds (`build.py --check` OK); NOT gated yet. dashI + q-look + q-feel are look/feel changes: CLAUDE.md says they wait for smooth-mp green. loop-grand-snap is not a look change: gate it alone from origin/main.
- QUEUE lines are not ticked (nothing from Part 2 landed).

## Update (later run, 87414614 = prep/polishE on main 058d7316)
- Gate on menusB+polishE: controls and cfclient now green; only smooth-mp (baseline issue above) AND a NEW red: grandlive -> GNETTEST FAIL (the friend joins the online grand-campaign lobby via the new Multiplayer screen: "p2p: no direct connection, server relay unavailable (network)"). menusB changed orch/gnettest.mjs to join with `menuGo('online'); #jcode/#jbtn`; either that join path is a real bug for campaign codes or the relay is unreachable from the runner (gnettest passes on main). One fix attempt spent; menusB + polishE stay PARKED on prep/polishE (pushed as orch/greenK-polishE). Debug: node orch/gnettest.mjs on that branch; mxOnline('campaign') / #jbtn in src/14-menu.js + src/13zn-gnet.js.
- Main 058d7316 full gate: tutorial red (above), mapsweep red (below), the rest green except smooth-mp (baseline).

## Also red on the main-push gate (058d7316): mapsweep
- On a push to main mapsweep runs in full (branch runs print "SKIP mapsweep (no map changes vs main)"): MAPSWEEP FAIL: 37 static map issues (e.g. bosphorus 5p/6p "base N cuts river", marshes 2p "base cuts river"), then the browser died (5 GB) so 0/247 battles ran. So main has map-fairness problems nobody saw because branch runs skipped the sweep. Owner: maps lane; first fix the static ones (log in gate-logs/<sha>-mapsweep branch, orch/out/maps), then check the sweep memory.

## Next step
1. Decide the smooth-mp baseline question above. 2. Read the final gate on main (git show origin/reports:orch/GATE-MAIN.md). 3. Fix tutorial step 9. 4. Land prep/polishE, then the rest in order.
