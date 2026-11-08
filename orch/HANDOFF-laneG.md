# Lane G handoff (2026-11-07 Sat evening, Chicago)

Shipped on branch (NOT merged to main): RG60 pilgrimage seasons first cut, in `src/13w-gholy.js`, test `orch/piltest.mjs` (PILTEST PASS).
Gates: build OK, smoke PASS, grandtest PASS, cigate FAIL on: cfclient, decisions (times out / conquest ban check), smooth-mp, smooth-pc, tutorial.
Not yet established whether these are pre-existing on main or caused by this change (the change only adds GMOD rows and a monthly hook).
Next step: run `bash orch/cigate.sh` on main and on this branch to compare; fix or re-baseline before merging to main.
Open for RG60: AI truces held back during pilgrimage seasons.
