# ORCH to onegame helper — READ FIRST (Abdullah, Fri 2026-11-13 20:24 Chicago)

Abdullah: "Keep capturable quarries and mines and power plants and field hospitals"

When you remove Conquest, do NOT remove:
- the quarry and mine capture (src/03h-economy.js MINES part, EC_PT_*);
- the map power plants (03-sim M.plants);
- capturable buildings in general.

Helper orch/techbldgs moves these into Battle and lands BEFORE you. Rebase on main after it lands and keep its work. Remove only the Conquest towns, tax, food, caravans, growth and invest.
Delete this note file in your final commit.
