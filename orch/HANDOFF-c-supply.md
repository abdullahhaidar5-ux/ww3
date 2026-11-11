# Handoff — campaign "Real supply" (branch orch/c-supply)

## Done (slice 1, complete end to end)
- `src/13zl-gsupply.js` (new, part of the one supply owner): `gsupField(c)` = one pass per nation from every source (capital, Military base, open port, ally's capital) over friendly ground; `gsupLine(army)` = {eff, km, src, cut, why}; `gsupSeason(province)`; GMOD rows `sup_winter/mud/heat/monsoon` (scope army, stat `supplyIn`); nation rows with stat `supplyIn` also apply (hook for ideas/events).
- `src/13g-grandeco.js`: `geSupplyStep` scales the monthly fuel/ammo refill by the line, cut line = nothing arrives, marching −5 fuel, fighting −8 fuel −6 ammo; stores `a.sl` (% arriving) and `a.sk` (km) on the army (saved with the campaign); `geFuelNeed` × `gsupHaul` (long lines burn national fuel); `geAI` builds a forward depot (`gsupDepotWant`).
- `src/13-grand.js`: `grApplyLoss` marks `a.fo` (fought this month); `grAIArmies` holds an army that is short of fuel/ammo (`gsupHold`) and marches it home if its line is cut on foreign ground (`gsupFallBack`); fixed a crash when a nation with no capital (`cap === -1`) still had an army on its own land.
- UI: army card shows "supplies NN%" / "supply line cut"; nation panel tab "Supply lines"; alert "Supply line stretched".
- Sources and numbers: `orch/REAL-2026.md` → "Supply lines". Owner note: `orch/SYSTEMS.md` grand2 row.
- Guards: `orch/grandtest.mjs` (eco block: full at capital, long line < 100 %, enemy on the road cuts it, cut army burns stock, AI hold, latitudes, January winter / April mud at Moscow), `orch/suptest.mjs` (same seed twice = same hash after 8 AI months, ≤ 25 % of AI armies halted, fuel cost, save/load, tab, screenshot `orch/shots/grand2/supply-lines.png`).

## State of the gates
- Local (slow sandbox): build + `--check` OK, `grandtest --only eco` PASS, `suptest` PASS. Full grandtest, decisions and smoke do not finish here in 10 minutes — see the `gate/*` statuses of the branch head on GitHub (`orch/cigate.sh`).
- NOT on main: the campaign runner may not land while CLAUDE.md's RIGHT NOW bullet lists gate/grand + gate/grandlive as red. (Checked 2026-11-11 07:30Z: main bee4daa3 itself only fails gate/cfclient and gate/tutorial — gate/grand and gate/grandlive are green there; the bullet is out of date.)

## To land
1. `git fetch && git merge origin/main` (index.html / grand.*.js conflicts → `python3 orch/build.py`; HISTORY keeps both sides). Other campaign branches (c-proxy-warfare, c-stockpiles, c-war-support, c-escalation) touch `13g-grandeco.js`/`13-grand.js` near other lines — merge by hand if they land first; the supply edits are one-liners marked "real supply".
2. build, `--check`, grandtest, decisions, smoke, suptest, `orch/cigate.sh`; push; tick the queue line.

## Next slices (same owner, in order of value)
1. Supply map mode: colour provinces by % arriving (replace `g3SupplyOK` green/red) and draw the selected army's line.
2. Convoys that can be raided: a "Raid supply lines" army stance that cuts throughput of enemy lines through adjacent provinces without standing on them; partisans in occupied provinces (ties to unrest).
3. Capacity: each port / base feeds only so many units; over-stacking lowers everyone's share. Airlift from airfields (small, fuel-hungry) for cut-off armies.
4. Auto-resolve reads fuel (vehicles fight worse below 25 % fuel); Fight-it already reads `a.fu` and ammo.
5. Bridges/rail hubs as named province features that strikes can damage (uses the existing `bomb` act and `geEff`).
6. Hand season rows over to the "Calendar and seasons" item when it is built.
