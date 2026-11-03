# Faction looks (2026-11-03, branch orch/faction-looks)

## Shipped (Step 1, procedural, no new model files)
- One extra merged mesh per aircraft / ship / combat vehicle (`factionKit` at the end of `src/11-models.js`), geometry cached per model+nation, one shared texture atlas (flags, roundels, red star, hull digits).
- National flag decals on vehicle sides; roundels on jet wings + flag on tail fins; flag on helicopter tail booms; flag + hull numbers on ship/boat hulls, ensign pole at the stern.
- Kits: IR/RS/DW flag poles on tanks, IR extra armour blocks, sandbags + spare tyre on hilux technicals; KP red stars (sides + turret top); RU top "cope cage"; US/IL/EU antennas + sensor box.
- Per-navy paint: Western greys, Russian/Indian/Pakistani/Ukrainian/Cuban blue-grey, Chinese/KP steel blue, IR dark green, RS sand, DW olive.
- Low graphics (phones): ground vehicle kits skipped entirely; aircraft/ships keep only decals (one draw call each).
- Screenshots: `orch/shots/faction-looks/after/`; script `orch/factionshots.mjs`.

## Skipped (Step 2 / 3) and why
- Step 2 (new free CC0/CC-BY models: Ka-52/Mi-28, Z-10, T129, frigates, speedboats, Type 99, K2): not done. Web search only surfaced commercial listings (CGTrader/TurboSquid/RenderHub); Sketchfab downloads need a logged-in token and the licences could not be verified from here. Per the rule "licence unclear = skip", no model was added. No credits changed.
- Step 3 (drone / transport-boat variants): not reached.
- Aircraft kit placement was not visually confirmed in screenshots (flying units were outside the frame); it uses ray probes and silently skips a decal if nothing is hit.
