# HANDOFF battlepower (branch orch/battlepower) — Battle runs on Generators

Abdullah 2026-11-13 20:11 / 20:13 / 20:24 (quotes in orch/DECISIONS.md). Conquest is unchanged (map power plants, blackout).

## Rules in plain words
- Every nation can build a **Generator** in Battle (Build tab, Base group, $500 = the Barracks price, no prerequisite, 700 HP, makes 30 power). Same stats for everyone; only the name differs (RS "Mountain Power Station", IR "Diesel Generator Station", US "Mobile Power Plant", ... default "Power Generator"). The Command HQ makes 10 power by itself.
- **Only electronic buildings use power** (one table, `POWER` in `src/01-data.js`, a one-line change each): Anti-Air Missile Site 8, Coastal Missile Battery 8, Strike Center 20, Radio & TV Station 5, Airfield 10. HQ, Barracks, War Factory, Depot, Shipyard, Defense Gun, tunnels, fortress and economy buildings never need power.
- **Low power** (used > produced): ALL powered buildings go offline (through the one `b.dis` flag, same as EMP/hack/blackout), they show a small "NO POWER" marker, the minimap radar shows only your own side with "RADAR OFFLINE". Production speed is never changed. Airfield offline = no aircraft production until power is back.
- Captured map power plants (techbldgs `tbPlants(team)`) add `POWER.plant` = 20 each to the owner (guarded by `typeof`, so this branch also works alone). No old-style home/neutral plants exist in Battle (they never were instanced there: `infraInit` is Conquest only).
- Top bar (Battle): "POWER 40 produced · 15 used" green, red + "LOW POWER - build a Generator" when short. One log warning per drop (at most every 90 s), "Power is back" when fixed; the enemy hears about it too.
- AI (Battle): builds a Generator before its first electronic building, keeps power positive, rebuilds lost ones; Generators are in `HM_CRIT` so the AI also raids enemy Generators. Cyber Attack/EMP can also hit Generators.
- State: derived from the buildings every 0.5 s (`T.pwM/pwU/pwLow/pwW` are plain team fields, so the checkpoint and host migration carry them; old saves just recompute). No new net fields: clients compute the meter from the buildings they see.
- Leftovers: tutorial has a first "Generator" step; What's new + Battle line in CLAUDE.md + SYSTEMS row updated; Build button hidden in Conquest (`bldAllowed`).

## Numbers
Generator $500/8 s build. Quick AI-vs-AI Battle tourney (`node orch/tourney.mjs --battle --factions US,RU,IR,CN,UA,IL,TR,PK --games 4 --minutes 14 --maps bm_tarbasin,bm_splitridge,bm_ferryquarter`; I added `--battle` and generator counts to the tourney output): 16 games, 0 errors, 13 decisive, 3 draws; win rates CN 88 PK 75 TR 50 UA 50 IL 50 IR 50 RU 25 US 13 — 4 games per nation is too few to call, slot 2 won 9 of 13 decisive, same noise as before the change (AI always had a Generator and positive power at the end: e.g. 2 Generators, 70/42). Run a bigger one (`--games 12`) if the conductor wants a stricter check.

## Gate
`python3 orch/build.py --check` OK, `node orch/smoke.mjs` SMOKE PASS, `node orch/powertest.mjs` POWER PASS (also called from `orch/decisions.mjs`): Conquest keeps plants and has no Generator button; Battle has no home plants; a Generator exists for all live nations; used > made = SAM/Strike Center offline and Defense Gun + Barracks production unaffected; meter shows red + LOW POWER; two Generators fix it; losing them brings it back; checkpoint keeps `pwLow`. No local smooth runs. One `orch/cigate.sh` result: see LOG/bottom of this file if appended.

## Pictures (looked at): orch/concepts/battlepower/
`generator-green.jpg` (Generator, meter green 40 produced / 15 used), `power-red.jpg` (meter red, "LOW POWER - build a Generator", minimap RADAR OFFLINE), `low-power-warning.jpg`.

## Ask Abdullah to try (2 min, PC)
Start a Battle, build a Generator, then an Anti-Air Missile Site and a Strike Center; build a second Strike Center without a second Generator and watch the top bar go red and the buildings show NO POWER; build another Generator and watch them come back.
