# HANDOFF — techbldgs (branch orch/techbldgs)

**Part 1 ready, part 2 not started.** Part 1 can land alone.

Scope change on the branch: the first brief (field hospital, airstrip, radio tower) was narrowed by ORCH's `orch/TECHBLDGS-NOTE.md`
(Abdullah 2026-11-13 20:24 "Keep capturable quarries and mines and power plants and field hospitals"): the four buildings below. The
Airstrip, Radio Tower and Repair Depot were built first and then removed again. Part 2 of the note (refinery, ammo dump, artillery
position, train station, telecom station) is NOT started; each is one more row in the `TB` table plus a look (see "Adding the next one").

## What a player gets (same for every nation, numbers only in the `TB` table, src/03-sim.js)
- **Quarry** — pays the owner steady income, the same as an oil derrick.
- **Mine** — pays 30% more than a quarry or derrick (18 vs 14 per 2 s, times the Battle income scale).
- **Power plant** — gives the owner its power on top of their own generators; lose it and that power is gone. `tbPlants(team)` returns the
  number of live plants a team holds; **the Battle power meter (helper battlepower) has to add it** (I did not touch the meter, that file is theirs).
- **Field Hospital** — heals the owner's infantry within 260 m (1.5% of their health per second); infantry the owner trains while holding it come out rank 1.
Capture: infantry stand next to it ~6 s (same feel as a derrick, capture bar over it); the owner's flag flies on top; the effect goes ONLY
to the owner (not allies). Any enemy can shoot it down (1200 health, burns, goes neutral); a Construction Vehicle + infantry beside the wreck
repair it in ~8 s for the repairer. Notices: radio-feed line on capture / loss / destruction (with a point on the map). Hover one: name, owner, what it does.
Minimap: a tile in the owner's colour with a small sign (cross, rock, pick, bolt). The AI captures them like derricks, raids enemy-held ones, and sends idle infantry to defend the ones it holds.

## Where it lives (ONE system, no second capture code)
- `src/03-sim.js`: the `TB` table + `tbAdd/tbTick/tbHeld/tbPlants`; the rows are `G.oil` entries with `o.tb`, so `updOil`/`damageOil`/`destroyOil` are the derrick code (messages and income hooks branch on `o.tb`). Only runs in Battle (`G.battle`), not behind any Conquest-only check, so it survives helper onegame.
- `src/02-map.js` (`M.tech` from `D.techAt`), `src/02d-battlemaps.js` (`tb:[[x,y,type]]`, mirrored by the kit like oil). Every Battle map has a pair or quad: Tar Basin hospital + mine, Split Ridge plant + quarry, Ferry Quarter hospital + mine, Breakwater hospital + quarry, Four Mills mine + hospital, Six Roads plant + quarry.
- Look: `techObj` in `src/04c-townlook.js` (one merged mesh + flag per building; the plant reuses the existing power-plant model); labels, hover text and `tbMini` in `src/06-view.js`; a tip in the loading-tip list (`src/08-ui.js`).
- State: the checkpoint already copies every `G.oil` row field (`src/07b-ckpt.js`), so owner / health / type survive saves and host migration (tested in orch/techbldgs.mjs). Old saves load (no `tb` rows = nothing changes).
- When Conquest is removed (helper onegame): `src/03h-economy.js` quarries/mines/factories become dead code; this is their Battle replacement. Delete them there.

## Checks
- `node orch/techbldgs.mjs` → TECHBLDGS PASS (capture, income only for the owner, heal only for the owner, veterans, shot down + repaired, plant counter, checkpoint). Also run from `orch/decisions.mjs`, which also checks every Battle map lists `tb`.
- `node orch/battlemapfair.mjs --static` → PASS (6 maps, 30 checks) with new checks: all capturable buildings are on the ground, the same number within reach of every start.
- `python3 orch/build.py --check`, `node orch/smoke.mjs`: see the gate result at the bottom. No local smooth runs (rule).

## Pictures (looked at myself): orch/concepts/techbldgs/
