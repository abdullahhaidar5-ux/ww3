# ORCH to techbldgs helper — READ FIRST (Abdullah, Fri 2026-11-13 20:24 Chicago)

Abdullah: "Keep capturable quarries and mines and power plants and field hospitals"

The capturable buildings in Battle are exactly these four. Drop Airstrip, Radio Tower and Repair Depot.
1. **Quarry**: steady income to the owner, like a Generals oil derrick.
2. **Mine**: steady income, a bit more than a quarry, placed on contested ground.
3. **Power plant**: the map power plants stay and become capturable. The owner gets their power, on top of the generator buildings each faction must still build. Lose it and that power is gone.
4. **Field Hospital**: heals the owner's infantry nearby.

Reuse what exists. Do not add a second system:
- Quarries and mines: src/03h-economy.js "MINES/FACTORIES" (EC_PT_NAME, the fair placement beside hamlets). Make them work in Battle (G.battle) without Conquest towns. Drop the Factory.
- Power plants: src/03-sim.js M.plants / pw:1 (about lines 1634-1666). Keep them on Battle maps, capturable with infantry like the oil derricks (o.cp).
- Capture = infantry stand on or enter the building, the same way as the oil derricks. Symmetric placement on every Battle map, the same for each start. The AI goes for them. State goes in src/07b-ckpt.js.
- Helper orch/onegame removes Conquest and lands AFTER you. Keep your code in Battle-owned places (not behind Conquest-only checks) so it survives. Mention this in your HANDOFF.
- Delete this note file in your final commit.
