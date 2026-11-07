# HANDOFF laneG (2026-11-07 ~21:10 UTC, branch orch/laneG-202611071702)

Shipped on the branch (NOT yet on main, see blocker):
- RG59 floods + sandstorms, RG60 pilgrim season, RG40 general strike + protests, RG41 remittances, RG18 volunteers: event rows in `src/13p-gevents.js` (neutral wording, equal options).
- RG10 follow-on: the nuclear programme halts while an enemy holds the nation's capital (`src/13zz-gnuke.js`, `gnkHalted`); panel shows "work halted".
- RG30 leader succession first cut: `src/13zy-gsucc.js` (heirs take over in autocracies/monarchies; no heir = sudden transfer; GMOD succession rows; IR/RS/DW/KP/RV and democracies excluded). Test `node orch/sucktest.mjs` PASS.
- HOWTO recipe for event rows; PLAN-SAT ticks; HISTORY line.
- Guards: `orch/decisions.mjs` wording fixes (no "turn" words in my strings). Grand test passes on branch (`orch/grandtest.mjs` PASS).

BLOCKER: `origin/main` (2dea50ab) fails `node orch/smoke.mjs` with
`THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN` (console error). Reproduced on a clean worktree of origin/main, so it is not from lane G. It was NOT in the earlier main state (smoke passed on dff8c82b). Changes since then include the grand-map real-world rewrite (src/13-grandmap.js, 13e-grand3d.js, 13g-grandlook.js, 13zn-gnet.js) and laneE slice 9 (11-models.js). Reverting only the 11-models change did not fix it. Whoever owns the grand-map/realmap and laneC/laneE lanes should find the NaN geometry (likely a box/terrain with a NaN coordinate).
Lane G will push to main as soon as smoke is green again (the branch is already merged with origin/main as of 2dea50ab).

Known pre-existing red on main (not lane G): tutorialtest flaky (fails on main too), walktest "leader height aya/dl" (fails on main too), cfclient/controls not checked.

Next, in order: merge once green; RG9 proxy wars (uses GMOD + Locals), RG31 secret treaties, RG64 defectors (never Zealous), RG20 ceasefires, RG28 cabinet ministers (portraits exist); B7/B8 rest.
Self-fire of the scheduled task was not done this run: a re-run would hit the same red smoke; the hourly schedule continues.
