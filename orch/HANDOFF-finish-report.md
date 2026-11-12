# Handoff: orch/finish-report (battle report card + front lines) — ready for the conductor, NOT landed

Branch `orch/finish-report` = main 1143f7c + merge of `orch/lang-campaign` + the finish work. Gated commit: `fe6bdd9` (this note is the only commit after it).

What it does
- One report card (`#gReport`, a GPAN row) after an auto-resolved battle AND after a Fight-it battle: who won, why in one line, losses of both sides, what changes on the map; a live battle adds the picture with Copy picture. X / Esc / "Return to the map" close it; grows with text size (.gpx). The old Fight-it result page on `campScreen` is gone.
- Front lines: depth-tested (under army pieces, name plates and shields), hidden in the far view, glow + advance arrows in the middle view, thin line close; gone at peace. Supply veins thinner up close. Army drawing untouched.
- Guards: `orch/grandtest.mjs` (auto card, live card + Esc, peace, zoom tiers), `orch/decisions.mjs` (static), `orch/polishtest.mjs` (frame, Esc, text size rows for gReport), `orch/reports/panels.md` row.

Gate (orch/cigate by hand, two runs)
- Run 1 on 94d9da8: 26 of 28. Red: decisions (British "centre" in Tuesday's text — fixed), grand (two test waits still looked for the old screen — fixed).
- Run 2 on fe6bdd9: 26 of 28. grand, decisions, save/polish, smooth-pc, smooth-mp, grandsmooth all green. Red: `tutorial` ("step 3 never started", 533 s run) and `migrate-down` ("client A did not appear in the host lobby") — both were green in run 1 with the same game code (only one word of text differs) and this branch does not touch tutorial or netcode. Please re-run those two before landing.

Proof pictures: `orch/concepts/report/` (made by `node orch/finishshots.mjs`).
Open points: supply veins still show at peace (by Tuesday's design: capital → each army); the merge brought ~15 MB of Tuesday's PNGs in `orch/shots/lang-campaign/`.
