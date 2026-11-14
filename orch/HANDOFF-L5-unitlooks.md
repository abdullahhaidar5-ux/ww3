# HANDOFF L5 Unit looks (branch orch/L5-unitlooks)

Done: per-nation soldier fatigue tint (`SOLX` in `src/11-models.js`) and headgear style/colour (west helmet, sov, cap, shemagh, new beret) for all 22 nations; Shia first (IR olive IRGC-style beret, RS dark-green fatigues + black cap, DW desert shemagh, RV dark beret, OB dark cap). No emblems. Merged per material (existing `mergeGear`), no new draw calls. Vehicle paint/camo was already per nation (`FLOOK`/`CAMOX`), left unchanged; no new silhouettes added (needs model work).
Contact sheet: `orch/shots/L5-nations.jpg` (made by `orch/l5shots.mjs`, flat test lighting, models unmerged).
Gates: build + `--check` OK, decisions.mjs OK. Smoke ran locally but the sandbox is too slow to finish; see cigate result below.
Status: see bottom line.

## Status: NOT fully ready - gate partly red, looks unrelated
cigate on commit before this note (20 of 28 reported): all green except `gate/mpsync` (main a3b627b already red on mpsync, so not caused by L5) and `gate/audio` ("second battle: battle music again", a music check; L5 only changes soldier tint/headgear). Remaining ~8 gates were still running. Next step: let ORCH re-run `orch/cigate.sh` on a rebased branch once main's mpsync is fixed, then land. Not merged to main.
