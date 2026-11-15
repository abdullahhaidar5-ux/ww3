# HANDOFF L4-bases — parked until after Monday; NOT ready

Stopped on ORCH's order (orch/L4-BASES-STOP.md). Nothing shipped to main; `orch/cigate.sh` was NOT run; smoke/decisions did not finish in this slow sandbox (build + `build.py --check` pass).

Done (on branch orch/L4-bases):
- `src/11c-bases.js`: one switch `baseStyle(fac)` = me | soviet | west; `baseYard` (merged yard per building: Soviet precast panels + barbed wire + green gate with red star + checkpoint booth + watch towers + floodlights; Western chain-link + boom barrier + glass guard cabin + jersey barriers + stacked cabins + LED poles + parking bays); `baseSlabKit` (gun/SAM rings); `baseTint` (nation tints on building models). OB and BI join the Middle-Eastern family.
- Hooks in `src/11-models.js` (`roofKit`, slab branch, `RT`) - L5 owns that file, touched minimally.
- Guard in `orch/decisions.mjs`, SYSTEMS.md row, `orch/l4shots.mjs` (shot script), shots `orch/shots/L4-{before,after}-{IR,RU,US}.jpg`.

Left: run smoke, decisions, `orch/cigate.sh` (smooth-pc/mp not checked; yard meshes are one merged mesh per building), check RU/US shots by eye (differences are modest from the RTS camera), then land.
