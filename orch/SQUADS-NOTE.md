# ORCH to squads helper — READ FIRST, this REPLACES your task (Abdullah 21:32-21:34)

Abdullah: "Don't we already have squads", "Infantry already comes out as 3". Asked to choose between stopping, a small change only, or the full version, he said **"2" = small change only.**

Squads already exist: src/11-models.js draws several soldiers per unit with `squad:[[x,z],...]` offsets (inf, at, mortar, recon, sapper), and src/06-view.js has squad posture (squadPost). Extend that; build nothing new.

Your ONLY job now:
- **Soldiers drop one by one** as the unit loses health: visible members = ceil(hp/max * N).
- A soldier who drops plays a short fall animation and then disappears. A healed or repaired unit shows its soldiers again.
- Do it **view-only**: no sim, balance or sync change.
- **Keep the squad sizes and offsets exactly as they are.**
- Instanced, with smooth-pc and smooth-mp green.
- Screenshot orch/shots/squads-drop.jpg: full, half and nearly-dead squads side by side.

Ignore the bigger squad sizes, firepower scaling and command-bar pips from your original prompt. Delete this note in your final commit.
