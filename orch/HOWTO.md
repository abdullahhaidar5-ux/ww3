# HOWTO — proven recipes (append ≤ 5 lines when you figure something out; read before exploring)

## Ship a change
`python3 orch/build.py` → `node orch/smoke.mjs 2>&1 | grep -E "SMOKE (PASS|FAIL)"` → targeted test (`node orch/grandtest.mjs 2>&1 | tail -3` for grand work) → `bash orch/cigate.sh > /tmp/cig.log 2>&1 &` → merge origin/main → fast-forward push. Sim/data change → comment on the open main→servers-live PR.

## Add a full nation
`NEWNAT` pattern — see orch/NATIONS-TODO.md "pattern" section and orch/reports/nations-a1.md (data row, look, flag, home map, town style, morale style in `MSTYLES`, lobby, encyclopedia).

## Grand map code map (grep these names)
`grNew` new campaign (13-grand.js) · `grAddArmy` · `grEndTurn` turn resolve · `geNewNat`/`geEnsure` economy init (13g-grandeco.js) · `geUiPanel` economy screen (13h) · `guTop`/`guSide` grand UI (13c) · battle launch from the map: 13b-grandbattle.js · province battle maps: 13f-grandmirror.js · terrain bake 13d · 3D map 13e.
