# Sanctions & smuggling (orch/sanctions)
- New general power **Sanctions** (self-cast, all 18 nations, 1 rank point): hits the richest enemy — their income (Revenue Centers, harvester drops, oil) drops 20% for 60 s (+10 s per level). Cooldown 420 s; no firing in the opening 3-minute lull.
- The sanctioned player sees a red banner "SANCTIONED · income −20% · 45 s" under the news ticker plus a battle message; the caster gets a confirmation message.
- Counter **Smuggling Routes** (HQ upgrade, $1500, 30 s, same for every nation): penalty drops to 8% and a trickle of +$3/s arrives while sanctioned. Banner updates to −8%.
- AI (Normal/Hard, after 4 min, all six other powers owned) uses Sanctions on the richest enemy; after being sanctioned once it researches Smuggling Routes at its HQ. Random AI upgrade pick excludes it.
- Sync: state is `T.sanc` (end time) — carried in checkpoints automatically, and in the client snapshot as `sn`. No change to games where nobody uses it (AI spends one late rank point on it on Normal/Hard).
- Test: orch/ewtest.mjs extended (20% cut, 60 s, cooldown, smuggling 8% + trickle, checkpoint, ends on time) — passes. Smoke PASS. No balance tourney run (usage).
- CIGATE: PASS (18/18) on 6a4da52.
- servers-live PR needed: yes (sim/data/net changed).
