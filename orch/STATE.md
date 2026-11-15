# Conductor state — 2026-11-15 03:55 UTC
main head 12ff1f0 (Online lobby no-jump, 21:42 Chicago). Main moved 17+ commits past the 0300 train's base (2048ce4).
**Another train is still in flight:** train/20261115-0300 (main@2048ce4 + orch/gatefix), pushed 02:52 UTC (<110 min), not in main. Its gate/52d4501321: 20 green, 8 RED (cfclient controls controlscheck decisions migrate-dual save smooth-pc superfreeze) — same reds as gatefix's own gate, so gatefix did not fix them and the train is not landable as is; needs rebuild on current main. Per rules this run did step 1 only (no train, no landing).
| branch | last push | ahead of main | state |
|---|---|---|---|
| gatefix | 11-15 03:05 | 0 | already in main |
| zhfeel, zhfeel2, announcer, pcolor, roadcap, menubg, ammotruck2, mplobby, upgsimple, menulook | various | 0 | already in main |
| rangemirror | 11-14 20:08 | many (old base) | handoff "ready", no fresh gate; candidate next train |
| pileflag2 | 11-14 19:59 | old base | no handoff; own gate red earlier |
| ammotruck | 11-14 21:49 | old base | superseded by ammotruck2 (in main) |
| zhbar | 11-14 14:43 | 3 | not in main, no gate seen |
Ahead counts of ~2270 on older orch/* branches mean an old base; treat as stale, not new work.
taken/* locks with no orch/* branch: taken/icons (21:42 CST, 6 h ago, no orch/icons) — saved nothing so far.
Parked (removed from the game): camphud nofightit warpeace mapshapes eu4audit civhumans.
Note: ~16k branches in repo; fetch only orch/* taken/* train/* main.
