# ORCH to onegame helper — READ FIRST (Abdullah, Fri 2026-11-13 20:24 Chicago)

Abdullah: "Keep capturable quarries and mines and power plants and field hospitals"

When you remove Conquest, do NOT remove:
- the quarry and mine capture (src/03h-economy.js MINES part, EC_PT_*);
- the map power plants (03-sim M.plants);
- capturable buildings in general.

Helper orch/techbldgs moves these into Battle and lands BEFORE you. Rebase on main after it lands and keep its work. Remove only the Conquest towns, tax, food, caravans, growth and invest.
Delete this note file in your final commit.

## Vision (Abdullah 20:38): "The vision is a super super polished and smooth and beautiful battle game and test range"
In your landing, rewrite CLAUDE.md "Vision" around this quote:
- the game is Battle + Test range (+ Missions and Tutorial);
- polish, smoothness and beauty come before new features.
Remove the "world simulator" and grand-campaign bullets from CLAUDE.md, and add the quote to orch/DECISIONS.md.

## Supply lines in Battle (Abdullah 20:43: "If you own a road do units get automatically supplied") — the answer must be YES
orch/ammozone (lands before you) made Battle's "your area" circles around your buildings, because Battle had no road graph. When you bring the supply-line network (src/03c-logistics.js `lg`) into Battle, extend that area along the roads:
- A road you hold that connects back to one of your buildings (Command Center / Supply Depot / any base building, or a captured supply building such as the ammo dump from orch/techbldgs) supplies units within a short distance of it. They refill ammo automatically.
- Enemy units standing on the road, or a destroyed or blocked bridge, cut the line beyond that point, and units past the cut stop refilling.
- Draw your supplied roads on the minimap and on the ground; you may reuse the existing route drawing.
- Supply trucks still refill anywhere.
- The AI cuts the enemy's roads and guards its own.
- Keep it deterministic and in the checkpoint.
- Proof: a picture of a supplied road, then of the same road cut, in orch/shots/onegame-supply-*.jpg.


## Captured buildings resupply (Abdullah 20:53: "Shouldnt these resupply")
EVERY captured map building is a forward supply point for its owner: quarry, mine, power plant, field hospital, oil refinery, train station, telecom station, artillery position and oil derricks.
- Units near one refill ammo; give it a small area, like a base building.
- The ammo dump stays the strongest: a bigger area and faster refill.
- A held road that connects to a captured building counts as a supply line, just like one to your base.
- Use the ONE "your area" system from orch/ammozone. Add the captured buildings to it; do not build a second one.
- Lose the building and its supply stops.
