# HOWTO — proven recipes (append ≤ 5 lines when you figure something out; read before exploring)

## Ship a change
`python3 orch/build.py` → `node orch/smoke.mjs 2>&1 | grep -E "SMOKE (PASS|FAIL)"` → targeted test (`node orch/grandtest.mjs 2>&1 | tail -3` for grand work) → `bash orch/cigate.sh > /tmp/cig.log 2>&1 &` → merge origin/main → fast-forward push. Sim/data change → comment on the open main→servers-live PR.

## Add a full nation
`NEWNAT` pattern — see orch/NATIONS-TODO.md "pattern" section and orch/reports/nations-a1.md (data row, look, flag, home map, town style, morale style in `MSTYLES`, lobby, encyclopedia).

## Grand map code map (grep these names)
`grNew` new campaign (13-grand.js) · `grAddArmy` · `grEndTurn` turn resolve · `geNewNat`/`geEnsure` economy init (13g-grandeco.js) · `geUiPanel` economy screen (13h) · `guTop`/`guSide` grand UI (13c) · battle launch from the map: 13b-grandbattle.js · province battle maps: 13f-grandmirror.js · terrain bake 13d · 3D map 13e.

## Lint (free robot checks)
`node orch/lint.mjs` → LINT PASS/FAIL in 1 s (runs in gate job `check`). Fails on `</script` in src, a new external host (edit HOSTS in the file only with Abdullah's OK), real-leader/organisation names, `Math.random`/`Date.now` in grand SIM files (13-grand, 13b, 13f, 13g, 13i+; add `// lint-ok` on a line to waive).

## Add a menu/pause/settings button without touching 08-ui.js
New file `src/08k-*.js` (build.py picks up all src/*.js in name order); in an IIFE find `document.getElementById('openSettings'|'aSet'|'sDone')` and append/insert a button (see `08k-report.js` "Report a problem" → pre-filled GitHub issue, label `player`).
