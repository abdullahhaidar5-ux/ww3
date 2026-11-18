# STATE 2026-11-18 21:00 UTC (conductor)
Main 932a668: gate/main red on superfreeze + migrate-down (superfreeze passed on the same code in the looks6 run; migrate-down = MP lobby timeout, red on main and looks6 alike -> flaky).

| Branch | Last push | Ahead | Gate | Verdict |
|---|---|---|---|---|
| pack-looks6 (West + East national vehicles, vehicle sheets) | 19:52 | 4 | 9623a371ee: 27 green, migrate-down red (flaky, also red on main) | train/20261118-2100 gating (4f6a252be2) |
| pack-looks5 / pack-looks4 / pack-looks3 | - | 1-2 | superseded by looks6 | not landed |
| pack-battlefield2 (camera pan on real frame time) | 08:47 | 1 | superfreeze red earlier (pre-warm gap, now fixed on main) | retry after looks6 |
| voices3 (FR/DE/GB/JP + Hebrew) | 08:33 | 12 | green per handoff | waiting for Abdullah's OK |
| Nov 13-14 branches (freezefix ... onegame, nations20) | 4-5 days | - | stale; one-game + 22 nations already on main | not landed |
taken/ locks (last 12 h): none. Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
Local smoke/decisions time out in this sandbox (known); train gate decides.

## Result of train/20261118-2100 (pack-looks6, 4f6a252be2)
All gates green except superfreeze (red twice, incl. one re-run); smooth-pc / smooth-mp green. Superfreeze is also red on main's head 932a668 with the same 100-150 ms renderFrame stalls in waves (dtank, dsam, aa, tank). Not landed: main's own superfreeze is red, so new look work waits for that fix (Smooth first rule). Nothing landed this run.
