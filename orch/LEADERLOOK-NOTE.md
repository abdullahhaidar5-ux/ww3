# ORCH to leaderlook helper — READ (Abdullah 21:50: "Make him and the dear leader more simple")

Extra job: simplify both leaders to **ONE aura + ONE button**. The code is in src/03i-leaders.js, a shared system.

**Ayatollah (IR / RS / DW)**
- Aura: Steadfast. Infantry near him take 15% less damage from artillery and aircraft and recover from suppression twice as fast.
- Button E: Sermon, unchanged.
- REMOVE: the Path of Hussein banners and the Call to Arms ultimate.

**Dear Leader (KP)**
- Aura: On-the-spot guidance. Production buildings next to him build 25% faster, and artillery and rockets near him reload 15% faster.
- Button E: Supreme Commander's Order, unchanged.
- REMOVE: Unbreakable Spirit and the Mass Mobilization ultimate.

**Leftovers rule**
- Remove Shift+E from the one key table.
- Update tooltips (LD_TIPS), the encyclopedia and what's-new text.
- Update the AI use of the ultimate, the missions in src/12-campaign.js if they use it, and the achievements (08b-identity).
- Update the guard orch/leaders.mjs and the CLAUDE.md "Leader abilities" line.
- Remove dead state (T.ld.ph, mm) safely; old saves must still load.

Keep sync and determinism. Delete this note in your final commit.
