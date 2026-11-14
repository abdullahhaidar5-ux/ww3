# Stuck units (orch/stuckscan.mjs)

Seeded AI-vs-AI games, 2 players, seed 1, 7 game-minutes on each of 28 maps, Conquest and Battle both. A stuck episode = a ground/sea unit with a move or attack-move order that moved less than 14 px for 10+ seconds while still more than 70 px from its goal (units that are disabled, abandoned, stunned, loaded, in combat or in a tunnel are not counted), or a unit standing on a tile it cannot stand on. Run: `node orch/stuckscan.mjs --maps all --minutes 7 --md out.md`; the gate runs the short form (`--short`).

**Before: 18 episodes. After (this branch): 8 episodes** (same maps, same seed; the games diverge once a fix changes movement, so single counts carry noise of a few episodes).

Causes before: open ground 15, embedded in blocked tile/footprint 3.  
Causes after: against building factory 1, open ground 4, embedded in blocked tile/footprint 2, against building barracks 1.

| mode:map | before | after |
|---|---|---|
| conquest delta | 1 | 2 |
| conquest dmz | 1 | 1 |
| conquest dnipro | 1 | 0 |
| conquest fulda | 0 | 1 |
| conquest golan | 1 | 0 |
| conquest honshu | 0 | 1 |
| conquest indus | 2 | 0 |
| conquest lebanon | 1 | 1 |
| conquest mesopotamia | 1 | 0 |
| conquest persia | 1 | 0 |
| conquest taiwan | 2 | 0 |
| conquest zagros | 1 | 1 |
| battle dmz | 0 | 1 |
| battle honshu | 1 | 0 |
| battle lebanon | 1 | 0 |
| battle persia | 1 | 0 |
| battle taiwan | 3 | 0 |

## Remaining after the fixes

| mode | map | t (s) | unit | spot | to goal | cause | nearest building |
|---|---|---|---|---|---|---|---|
| conquest | delta | 227 | at | 7870,1141 | 896 | against building factory | factory 11 px |
| conquest | delta | 321 | tank | 1246,1267 | 1024 | open ground | hq 28 px |
| conquest | dmz | 410 | inf | 1153,3196 | 0 | embedded in blocked tile/footprint | shipyard 346 px |
| battle | dmz | 295 | inf | 1189,824 | 2916 | open ground | sam 12 px |
| conquest | fulda | 390 | inf | 4860,4105 | 0 | embedded in blocked tile/footprint | barracks 2851 px |
| conquest | honshu | 260 | arty | 1223,5395 | 1563 | open ground | hq 24 px |
| conquest | lebanon | 343 | at | 8004,3643 | 1901 | against building barracks | barracks 9 px |
| conquest | zagros | 228 | arty | 1376,2940 | 874 | open ground | airfield 31 px |
