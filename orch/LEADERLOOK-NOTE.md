# ORCH to leaderlook helper — READ: this REPLACES the earlier note (Abdullah 21:50-21:53)

Abdullah: "Make him and the dear leader more simple", "Make the mechanics more simple", "No aura they just give a bonus by existing", "No button, bonus only", "Ayatollah all units tougher and your choice on dear leader".

New design in src/03i-leaders.js, the ONE shared system: **no auras, no ranges, no buttons.** While the leader unit is alive the whole army has a bonus; when he dies the bonus is gone.
- **Ayatollah (IR / RS / DW):** ALL your units take **10% less damage**.
- **Dear Leader (KP):** ALL your production (units and buildings) is **15% faster**.

Remove everything else: Steadfast, Path of Hussein, Sermon, Call to Arms, On-the-spot guidance, Unbreakable Spirit, Supreme Commander's Order, Mass Mobilization.

Show the bonus as one line on his tooltip and one small icon in the top bar while he lives.

**Leftovers rule**
- Remove E and Shift+E from the one key table.
- Remove the buttons and the T.ld cooldowns, banners and buff stamps (u.insT, u.ordT). Old saves must still load.
- Update the AI use, the missions in src/12-campaign.js, achievements (08b-identity, e.g. any Sermon one), the encyclopedia and what's-new text.
- Update the guard orch/leaders.mjs and the CLAUDE.md "Leader abilities" line.
- Balance: run the tourney so IR, RS, DW and KP stay equal.

Keep sync and determinism. Your look work (a more human model) continues unchanged. Delete this note in your final commit.

## CHANGE (Abdullah 21:54): "Make both the same units are 10% tougher and deal 10% more damage"

**BOTH leaders now give the SAME bonus while alive: ALL your units take 10% less damage AND deal 10% more damage.** This applies to the Ayatollah (IR / RS / DW) and the Dear Leader (KP). This replaces the Ayatollah-only toughness and the Dear Leader production bonus above. Everything else in the note stands: no aura, no buttons, the leftovers rule, the guard and the tourney balance check.

## FINAL (Abdullah 21:55): lower to 5% + 5%

**BOTH leaders, while alive: ALL your units take 5% less damage AND deal 5% more damage.** This replaces the 10% + 10% above; everything else stands. Still run the tourney so IR, RS, DW and KP stay equal.
