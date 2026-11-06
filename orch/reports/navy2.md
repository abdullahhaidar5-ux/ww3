# Navy 2: sonar, mines, fast-boat swarms (branch orch/navy2, 2026-11-06)
Abdullah 2026-11-05 18:49 picked all three. Sim change (03-sim, 01-data, 07a/07-net snapshots) -> needs a main -> servers-live deploy.
Code: `src/03d-navy2.js` (sim + AI), `src/06c-navy2view.js` (markers, Ping button). Test + shots: `node orch/navy2test.mjs` (13 checks), shots in `orch/shots/navy2/`.

## 1. Submarine stealth & sonar
- Subs were already hidden until close to an enemy ship/boat/coast battery. Now: **patrol helicopters hear subs while hovering** (dipping sonar 240; moving = no), a sub that **fires shows for 6 s** (was 2.5), and **active ping** (button "Sonar ping" or **E** with ships selected, 18 s cooldown, range = 1.7x the ship's passive sonar): every submerged enemy in range shows for 6 s. A sub that pings shows itself for 6 s; a surface ship that pings puts a 90-px circle under it on enemy sub-owners' map (they hear it).
- Markers: yellow diamond + "SONAR CONTACT" over the sub in the world and a pulsing ring on the minimap; after contact is lost a dashed "LAST CONTACT" marker fades over 9 s.
- AI: a ship that was just hit pings.
## 2. Naval mines
- **Minelayer** (shipyard, $800): lays a mine about every 1.2 s while on **F + click (attack-move)**; plain right-click just sails. Team cap 14 mines. Own and allied mines are drawn cyan; enemy mines are invisible.
- A mine blows when an enemy ship/boat/sub gets within ~26 px: 360 splash (torpedo damage table, x1.4 on ships) in 75 px. Sweepers are immune.
- **Minesweeper** (shipyard, $650): detects mines within 260 px (marks them red "MINE" for its whole alliance for 3.5 s, minimap too) and clears any within 85 px. Ships/boats/subs with sonar only feel mines at 90 px (late warning).
- Mines are in `G.mines` (nav:1, dt = per-team seen-until), so saves/host migration carry them; clients get the mines their team knows via the existing `mn` snapshot field (now [x,y,team,nav,detected]).
- AI: one minelayer per fleet, sails an out-and-back route 42% of the way to the enemy HQ; one sweeper once it has seen a mine or an enemy minelayer, then goes for the nearest known mine, else follows its fleet.
## 3. Fast-boat swarms
- **Fast Attack Craft** ($450, hp 220, speed 132, guns 9 dmg/.28 s): same stats for every nation, national names (IR Swarm Boat, RS Coastal Swarm Boat, DW Red Sea Skiff, US Patrol Boat, RU Raptor Patrol Boat, CN, KP, TR, IL, UA; others "Fast Attack Craft"). +7% damage per sister boat within 130 px (max +45%). Uses the speedboat model for every nation (navy paint).
- Counters: **warships now have a CIWS close-defence gun** (240 range, also shoots aircraft), warship damage to fast boats x1.3, helicopters x1.6, other armed naval x1.15. Warship shells have a 110 px minimum range, which is exactly why a swarm can get inside them.
- Test result: 6 fast boats vs 1 lone warship: warship drops to ~1/3 HP in 39 s and kills one boat. A balance agent should re-run tourneys (not done here).
## Not done / notes
- Mines are 2D markers (spiked ring), no 3D buoy mesh. Minelayer/sweeper use the generic boat model (tinted), no unique art.
- Ships do not path around known mines.
