# POLITICS & INTEL — branch `orch/politics-intel` (2026-11-06)

Abdullah 2026-11-05 18:55 picked six things; all six are in, Conquest only. Sim: `src/03e-politics.js` (new, listed in `orch/headless.mjs` SIM_FILES),
numbers in `POL` (`src/01-data.js`), UI: `src/08c-intel.js` (new). Probe: `node orch/politics-test.mjs` -> `POLITICS PASS`.
Same numbers for every nation. Host-authoritative, no RNG. New state rides in the checkpoint (team/unit/town fields automatically; `G.refs`, `G.leaf`,
`G.refId`, `G.polA` in `CK_G`). New commands `spy`, `leaf` in `CMD_T`. Client sync: `po` (opinion per team) and `rf` (refugee columns) in the team-globals message.

## 1. Spies & sabotage (`spy` unit, Barracks, $1200, 40 s build, max 2)
Stealth like a sniper (hidden to the enemy even while moving). **Cover is blown** by enemy infantry within 70 m (vehicles 35 m) or by an enemy *loyal* town
(informants) - then it can be shot, and both sides get a message. Jobs (command card on the selected spy, or just right-click): **Steal funds**
(enemy HQ: 15 % of their money, max $2000), **Steal research** (HQ/barracks/factory/airfield/Strike Center: copies their priciest upgrade you lack),
**Sabotage** (power plant, Strike Center or radio station: knocked out 75 s - a power plant that is sabotaged counts as down for the blackout rule),
**Incite unrest** (enemy town: $350, unrest +40 and a shock). After acting the agent is exposed 12 s and lies low 80 s. The victim is told what happened.
Counters: infantry, loyal towns, killing it in time. AI builds one spy when it has the money and picks steal > sabotage > incite > research.

## 2. Decoys (`dtank`, `dsam`, `darty`, War Factory, $120-150, 5 s, max 4 each)
Use the real unit's name, size, speed, class and 3D model (so radar, minimap, selection panel and the AI see a real Abrams/SAM truck/howitzer); 1 HP, no gun.
An enemy unit within 55 m "sees through it": that team gets a message + ping. Dying shows DECOY over it. Owner's panel says "(decoy)". The AI builds up to
3 and sends them with the army. They are never counted in tax/contest logic (noAttack) and the generic AI production never picks them.

## 3. Refugees
A town of ours with enemy troops at the gate **and** a garrison, or that was just shelled, sends civilian columns (5-9 figures, "REFUGEES" tag, dots + dashed
route on the minimap) walking about 800-1100 m away from the enemy. Units near a column move at 55 % speed (supply trucks too). They are not units, so they
cannot be targeted; an explosion that lands on one kills it, tells the owner and costs the firer world opinion. **Not done:** columns walk a straight line to
a passable spot, not along the road graph (road graph lives in `03c-logistics` - follow-up).

## 4. World opinion (`T.op`, 0-100, start 62)
HUD line under the top banner (bar + label Pariah / Distrusted / Neutral / Respected / Admired + SANCTIONS / foreign aid note) and a row on the end screen
("World opinion 62 / 100 (low 41)"). Falls: shelling a town (about -0.07 per impact point, 40 big shells in a town is roughly -14), destroying a civic building
(-1.5), hitting refugees (-2), holding Extortionate tax (-0.025/s per town, up to 3 towns). Rebuilds +0.05/s after 45 s with no violation. Below 38 =
**sanctions**: income -(38-op)/38 x 25 % (town tax + oil/harvest); above 72 = **foreign aid** drop every 60 s up to $160 (scaled by the map money factor). The AI
drops Extortionate to High when its opinion is low and avoids shelling its own towns. Grand map: the meter is ready for grand2/4 to read.

## 5. Propaganda: Radio & TV Station (building, $1500, max 2) + leaflet drop
Towns within 1100 m: own/allied +loyalty (unrest -0.45/s), enemy +0.55/s (shares the `t.prop` pipeline with the neutral radio masts). Fragile (1100 HP), can be bombed
or sabotaged. **Leaflet drop** (button on an enemy town panel, $300, needs a working own station within 3200 m, 100 s reload): +0.9 unrest/s there for 60 s.
AI builds a station and drops leaflets on restless towns.

## 6. Local militias (extends `townRecruit`, now `milMake`, and the revolt rebels)
Loyal towns under attack (enemy troops near or just shelled) raise up to 3 free militia (same unit as paid recruits, cap 4 per town), 90 s per town.
Towns with unrest >= 78 arm up to 2 insurgents (rebel team, same hunting logic as revolt rebels) one per minute before they actually revolt.

## Balance / sanity
Aid and sanctions are small on purpose; the AI-vs-AI games show opinion drifting to ~100 for peaceful AIs (aid ~$100-280/min, no meaningful swing) and
dipping for the shellers. A balance agent should re-run the tourneys: spies/decoys cost real money and the AI uses one spy + up to 3 decoys.
Known gaps: no 3D model for the spy beyond the infantry model (disguise = hidden, not a drawn civilian), decoy "exposed" state is a message/ping only
(no per-viewer icon), refugees straight-line, minimap shows no station radius.

## Try it (PC, 2 min)
https://abdullahhaidar5-ux.github.io/ww3/ : Build tab -> **Radio & TV Station**; Barracks -> **Infiltrator**; War Factory -> a **decoy** tank. Select the spy, right-click an enemy HQ.
Shelling a town with artillery now shows the World-opinion bar dropping under the top banner. Screenshots: `orch/shots/politics-intel/`.
