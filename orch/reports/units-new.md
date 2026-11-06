# units-new (Abdullah 2026-11-05 picks) — status

Branch `orch/units-new`. Most of the list already existed; this run added what was missing.

| # | Item | State |
|---|---|---|
| 1 | Attack drone swarms | Drones already dive and are used up (`drone`, nation looks, Shahed/Kargu/FPV), EW trucks burn them, AA guns shoot them. **New:** swarm spread - each drone picks its own target (`nearestEnemy` penalises targets already being dived on), so a swarm no longer wastes itself on one vehicle. Not done: a separate swarm-pack purchase. |
| 2 | Air assault | `airlift` transport helicopters (cap 6, load by click, Alt+right-click ground = fly there then unload) already exist. Not done this run: AI air assault on rear towns, fast-rope. |
| 3 | Amphibious landings | `lander` landing craft, coastal batteries and the AI landing (`aiLanding`) already exist. Not changed. |
| 4 | Artillery duels | Counter-Battery Radar unit already revealed guns for 10 s. **New:** a map ping (radar ring) on the radar owner's screen where an enemy gun fired (once per 8 s per gun). Not done: shoot-and-scoot. |
| 5 | Flares, chaff, low flying | **New.** Jets and helicopters carry 4 decoy charges (`FL_MAX`); each SAM missile that reaches one is fooled ~50% of the time while charges last (flares for helis, chaff for jets), visible burst (`chf` effect) and "OUT OF DECOYS" text. Charges refill while landed. **Fly low** button (command bar, air units): long-range SAM (missile weapons, aa>=2) cannot target a low flyer; guns/flak do 35% more damage to it. Host-authoritative `low` command. |
| 6 | Call-in reinforcements | **New** general power "Call-In Reinforcements" (hotkey K, costs 1 command point + $1200, 300 s cooldown, not during setup): 2 tanks, 1 AA, 4 riflemen, 1 AT arrive from the nearest map edge after 12 s and drive toward the map centre in front of the HQ; ambushable. Identical for every nation (units in the nation's look). AI Normal/Hard uses it when its army is thin. |

Sim files touched: 01-data, 03-sim (so a `main -> servers-live` PR comment is needed), plus 05-fx3d, 07a-hostsnap, 08-ui, 08c-tactui.
Probe: `node orch/unitsnew-t1.mjs` (reinforcements 4 -> 13 units, decoys 13/20 with charges / 0/20 without, SAM cannot target low flyers, AA gun can).
Balance: no unit stats changed; the new power is one tier for all nations. Balance agent should re-run tourneys.
