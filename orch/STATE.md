# STATE — 2026-11-18 ~04:55 UTC (conductor run)

No train this run: no helper branch has a finished own gate.

main = 8900437 (live since 03:24 UTC). Main head gates: 28 green, gate/loadfreeze FAILURE (not known-flaky; orch/pack-looks2 targets freezes after instanced soldiers).

In flight:
- orch/pack-looks2 (1 ahead, pushed 04:38): freeze fix (soldier bone texture at load, warm-up). Gate bcf0fe0 reports no statuses yet (running). Best next landing if loadfreeze goes green.
- orch/pack-battlefield (3 ahead, 03:39, HANDOFF): tunnel radar + day cycle/thunderstorms. Gate 2478f78: 3 green so far, running.
- orch/pack-economy (3 ahead, 04:13, HANDOFF): Proxy Militia + Smuggling Route. Gate b66b087: 21 green, red controls, smooth-pc, superfreeze. Smooth-pc red = not landable until fixed.
- orch/pack-looks (1 ahead): handoff only.
- orch/voices3 (7 ahead): branch only, no HANDOFF, no gate. Not ready.
- orch/voices-lb2: branch only, waiting for Abdullah's OK.
- orch/orch2-notes: DECISIONS notes only.

taken/* locks with no orch branch (90+ min): old 2026-11-14/15 locks (L1-L4, drawcalls, redgates, savesync, uiaudit, icons, zhfeel(2), announcer, pcolor, roadcap, menubg, mplobby, menulook, upgsimple, rangemirror, ammotruck, rv-voice, shiamissions) — saved nothing / superseded.

Never-land branches: parked (removed from the game).
