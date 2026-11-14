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

## LOOKS (Abdullah, 20:24): "Make sure these buildings look realistic"
Real-world detail, not blocks. Use orch/ART-BAR.md and the existing building models as your bar.
- **Quarry:** stepped cut rock faces, a gravel pit, a crusher with a conveyor, stone piles, an excavator or dump truck.
- **Mine:** a headframe tower with a wheel, an ore hopper, a spoil heap, rail carts.
- **Power plant:** cooling towers or a stack, a turbine hall, transformers, pylons with wires.
- **Field Hospital:** canvas tents with red crescent or red cross panels (neutral, no nation emblems), stretchers, a generator, an ambulance.

Also:
- Show who owns each building with a flag or team-colour panel.
- Show damage or wreck states.
- Build each one as ONE merged mesh per material, or instanced, so smooth-pc and smooth-mp stay green.
- Put a close-up picture of each building in orch/shots/techbldgs-*.jpg and link them in your HANDOFF.

## PART 2 (Abdullah, 20:28 "Top 5"): five more capturable buildings
Do these AFTER the first four are done, committed and pushed (save your work first). If you run low on time, finish part 1, write HANDOFF "part 1 ready, part 2 not started" and stop. Part 1 must be able to land alone.
5. **Oil refinery:** the owner's vehicles cost 10% less. Look: distillation columns, tanks, pipework, a flare stack.
6. **Ammo dump:** the owner's units within range refill ammo fast. Tie this into the supply / out-of-ammo rule (do not add a second supply system; see orch/SYSTEMS.md and the ammo/supply code). Look: sandbagged bunkers, crate stacks, a camo net.
7. **Artillery position:** a fixed gun (reuse the existing defense-gun firing code) that fires at enemies in range for its owner. Look: a dug-in howitzer pit with sandbags and shell crates.
8. **Train station:** units from the owner's production buildings spawn faster (or reinforcements arrive near it). Look: a platform, a small station house, track with a few freight cars.
9. **Telecom station:** the owner's units nearby get a morale boost and enemies nearby a small morale drop. Use the existing morale system; Zealous factions still never rout. Look: a lattice mast with dishes and an equipment shed.

All of them:
- one generic capture system;
- symmetric placement;
- the AI uses them;
- checkpoint state;
- realistic looks, merged or instanced;
- a picture each.
Not every map needs all nine. Each map gets a fair mix, the same for every start.


## Captured buildings resupply (Abdullah 20:53: "Shouldnt these resupply")
EVERY captured map building is a forward supply point for its owner: quarry, mine, power plant, field hospital, oil refinery, train station, telecom station, artillery position and oil derricks.
- Units near one refill ammo; give it a small area, like a base building.
- The ammo dump stays the strongest: a bigger area and faster refill.
- A held road that connects to a captured building counts as a supply line, just like one to your base.
- Use the ONE "your area" system from orch/ammozone. Add the captured buildings to it; do not build a second one.
- Lose the building and its supply stops.
