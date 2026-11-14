# ORCH to maptrim helper — READ (Abdullah 21:18 "Are there island hopping maps")

Shortlist and test the island and naval maps too: Island Chain Armada, Caribbean Island, Strait of Hormuz / Hormuz Island Gate, Gulf Coast Landings, Taiwan Strait, Honshu Coast.

- Keep at least TWO island-hopping maps in the final list (one for 2 players, one for 4), if they pass the 40-60% rule. If none pass, say so in your HANDOFF.
- Check that the AI uses ships and transports there; an AI that cannot cross water makes the fairness numbers meaningless.
- Delete this note in your final commit.

## CHANGE (Abdullah 21:19): "Keep 35 top maps include island hopping and variety. Keep the maps geographically realistic. They should have a variety of capturable buildings"
- **Target is 35 maps**, not 20-25. Shortlist about 45 and test them. Coverage:
  - at least 8 for 2 players;
  - at least 8 for up to 4;
  - at least 6 for up to 6;
  - at least 6 for up to 8.
  - at least 3 island-hopping or naval maps.
  - Wide variety: desert, mountain, river, marsh, snow/taiga, coast, island, farmland, ruined city.
- **Geographically realistic:** prefer maps based on real places (02b-realmaps, 02c-memaps, named-region MAPS). Terrain, rivers, coasts, mountains and vegetation must match the real area: no snow in the Gulf, no palm trees in Siberia, rivers where real rivers are, the right road layout and building style for the region. Fix obvious mismatches you find; drop maps that are fantasy-looking.
- **Variety of capturable buildings on every map**, from orch/techbldgs: quarry, mine, power plant, field hospital, oil refinery, ammo dump, artillery position, train station, telecom station, plus oil derricks.
  - Each map gets a fair mirrored mix of at least 5 different kinds.
  - Pick ones that fit the geography: refineries and derricks on Gulf/desert oil maps, train stations where rail exists, quarries and mines in mountains, ports and docks on coasts.
  - If techbldgs is not on main yet, merge origin/orch/techbldgs or put the placements as data the techbldgs code reads. Coordinate via its HANDOFF; do not invent a second capture system.
- Fairness is still required (40-60% per start).
