# Stuck units (orch/stuckscan.mjs + orch/chokepoint.mjs) - 2026-11-18, branch orch/stuckunits

## AI-vs-AI sweep
Seeded AI-vs-AI Battles on all 35 maps of the Battle picker (seed 1, 10 game-minutes; 2-player maps with 2 sides, bigger maps with 4 or their minimum): `node orch/stuckscan.mjs --maps all --minutes 10 --players 4`. A stuck episode = a ground/sea unit with a move or attack-move order that moved less than 14 px for 10+ s while more than 70 px from its goal (not fighting, not loaded), or a unit standing on a tile it cannot stand on. Games diverge once movement changes, so single-map counts carry noise of a few episodes; the total is the measure.

**Before (main a9ed6ea): 163 episodes. After: 52** (-68%).

Causes before: open ground 111, against building garrison 33, against building turret 5, against building airfield 5, against building gen 2, against building depot 2, against building factory 1, embedded in blocked tile/footprint 1, against building barracks 1, against building sam 1, against building tunnel 1.  
Causes after: open ground 40, against building garrison 7, against building turret 2, bridge 1, embedded in blocked tile/footprint 1, against building sam 1.

| map | before | after |
|---|---|---|
| bm_splitridge | 0 | 0 |
| bm_ferryquarter | 0 | 0 |
| bm_breakwater | 1 | 1 |
| bm_fourmills | 5 | 0 |
| bm_sixroads | 5 | 0 |
| lebanon | 4 | 0 |
| gulf | 4 | 0 |
| euphrates | 1 | 0 |
| tihama | 2 | 0 |
| zagros | 0 | 1 |
| caribbean | 1 | 0 |
| hormuzgate | 0 | 0 |
| taiwan | 1 | 1 |
| arctic | 0 | 1 |
| khyber | 2 | 0 |
| hajar | 0 | 0 |
| marshes | 6 | 0 |
| blacksea | 0 | 0 |
| yemen | 1 | 2 |
| hawizeh | 4 | 1 |
| islands | 4 | 1 |
| donbas | 3 | 0 |
| mesopotamia | 0 | 1 |
| persia | 8 | 2 |
| taiga | 3 | 2 |
| aegean | 19 | 3 |
| dmziron | 5 | 6 |
| rubalkhali | 11 | 3 |
| oasis | 9 | 7 |
| atoll | 6 | 0 |
| hindukush | 8 | 6 |
| kuwait | 10 | 3 |
| rhine | 19 | 4 |
| yangtze | 7 | 3 |
| plateau | 14 | 4 |

## What was wrong (ranked) and the fix
1. **Comrades standing still plugged streets, bridge exits and slots** (most town/bridge jams): a parked tank had the same push weight as the one driving, and vehicles tried to drive *around* any parked vehicle - impossible in a one-tile street, so they dodged forever. Now a unit without orders makes way for an own unit on the move (it takes 85% of the push), and movers no longer swerve around parked comrades.
2. **Held ruins were invisible to route planning**: a small garrisoned ruin (26-36 px) blocked movement but did not mark its tile for the route search, so routes ran straight through it and units leaned on it ("against building garrison" 33 -> 7). Small buildings now block their own tile.
3. **Goals under a building or in a walled pocket**: support units, ammo trucks and medics sent to an enemy factory or the HQ centre, and formation slots inside houses or in a pocket closed by houses, ended at the end of a half route and waited 16 s. Now a goal under a building moves just outside it, a goal the unit cannot reach moves to the nearest spot it can reach, and a unit pressed against the building its goal is under has arrived.
4. **Bridge lanes held units off the deck**: the lane pull worked in the bridge's whole box, which can reach over the river bank; two guns stood a whole Aegean battle on the bank. Lanes now act only on bridge tiles.

All of it is a pure function of positions, orders, ids and the map (no random numbers, no clocks), so host, clients and Cloudflare servers agree; no new saved state (the building lookup on an order is re-derived whenever buildings change).

## Scripted chokepoints (`node orch/chokepoint.mjs`; gate/stuckscan runs it with --gate)
| scenario | before: all arrived | after: all arrived | stuck units before -> after |
|---|---|---|---|
| bridge40 | 103 s | 54.5 s | 3 -> 0 |
| inf60 | 42.5 s | 34.5 s | 1 -> 0 |
| mixed | 51 s | 44.5 s | 0 -> 0 |
| longbridge | 42 s | 46 s | 0 -> 0 |
| riverbank | 25 s | 20.5 s | 0 -> 0 |
| dragline | 57.5 s | 40 s | 1 -> 0 |
| corner | 28 s | 21.5 s | 0 -> 0 |
| boats | 50.5 s | 50.5 s | 0 -> 0 |
| base | 30.5 s | 30 s | 0 -> 0 |

40 tanks over one 2-tile river bridge into a town: 103 s -> 54.5 s, 3 stuck -> 0. The gate fails when any scenario takes longer than its limit or anyone stalls 10 s.

## Open
- The remaining sweep episodes are mostly "open ground" crowds on 6-8 player maps (Oasis, DMZ Iron, Hindu Kush): AI armies re-ordered every few seconds through each other - look at AI attack-group orders next.
- Sim cost: within noise (seeded game, per-tick cost -13%..+8% depending on map; the games themselves differ).
