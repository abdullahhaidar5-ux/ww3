# Battlefield: trenches, collapsing buildings, dams + floods, wounded + medics (2026-11-06, helper agent `orch/battlefield`)

Abdullah picked all four on 2026-11-05 18:55. Sim code: `src/03f-battlefield.js` (in `SIM_FILES`, so the Cloudflare server and node tests include it).
Visuals: `src/05c-battlefield.js` (+ trench look in `src/05b-tactfx.js`), UI: `src/08c-tactui.js`, hooks in 03-sim, 03b-tactics, 04-gfx, 06-view, 07-net, 07a-hostsnap, 07b-ckpt, 08-ui, 01-data.
Test (headless, 25 checks, ~1 min): `node orch/bftest.mjs`. Screenshots: `node orch/bfshots.mjs` -> `orch/shots/battlefield/`.
One system per idea (SYSTEMS.md rows added): cover stays `coverAt()`, destruction extends rubble.md, wounded/medics have their own row.

## 1. Digging in
Already there (tactics.md): foxholes (I), sandbag/trench segments laid by a Construction Vehicle, cover, vehicle slowdown/crush, AI foxholes + dozer walls. Gaps filled:
- **Infantry dig lines too.** Select infantry, *Sandbags* / *Trench* button, then **drag a line** (press where it starts, release where it ends; the old two-click way still works). Every selected builder takes its share of the pieces (round-robin from the start), so ten men finish a long line fast. Infantry dig at 65% of a Construction Vehicle's speed and pay the same supplies.
- **Lines up to 14 pieces** (was 10).
- **Trench networks:** a trench line that starts or ends within ~46 units of the end of one of your trench pieces snaps onto it; where two trench lines meet at an angle a widened junction is drawn.
- **Look:** trenches now have duckboards on the floor, sandbag parapets on both lips, revetment posts and the earth berms; foxholes get a sandbag arc. Still one instanced mesh of irregular blobs (cap raised 1800 -> 3600 instances), no cubes.
- **AI digs on defence:** besides foxholes (max 28) and dozer lines, when no Construction Vehicle is idle the AI sends 3-4 idle infantry to lay a sandbag/trench line in front of a base building.

## 2. Collapsing buildings
- **Stages** (`c.stg`): 1 = cracked (below 66% health: thin grey smoke, garrison rattled), 2 = burning (below 33%: black smoke + flames, **half the garrison bails out**, shaken and a bit hurt). Collapse (existing) now also throws a big **dust cloud**; the rest of the garrison is thrown clear as before. Stages work for empty buildings and garrisoned ones.
- **Rubble** (rubble.md): infantry cover, tanks blocked, light vehicles slowed, all as before. New: **Construction Vehicles clear it** (7 s each) - idle ones do it on their own when no enemy is within 260 of the pile, or press **Clear rubble** (button appears while rubble exists). Cleared piles vanish and stop blocking tanks and giving cover. Synced to clients (`rubc`), checkpoints keep `c.clr`.
- Cheap: smoke only comes from damaged buildings on screen, no physics.

## 3. Dams and floods
- **Maps:** Twin Rivers Offensive and Fulda Gap (both point-symmetric). Each has **two dams, one at each end of the river, mirrored**; breaking either floods the valley toward the middle, so both sides are equally exposed (flood corridors have the same size within 2% on Twin Rivers, test checks it). More maps = add a row to `DAM_SITES` (map key -> [river, fraction along it, flood direction]).
- **Breaking it:** a neutral target (like an oil derrick): right-click it (or Ctrl+click) with armed ground units; shells, bombs, rockets and tank guns hurt it (3000 HP, buildings multiplier). A 10-step crack tint, then a breach with a spray jet. Everyone gets "THE DAM HAS BREACHED!" in the log.
- **The flood** (3 minutes): the front runs 70 u/s down the river for 1200 units; water rises over 25 s, holds 85 s, recedes over 60 s, reaching ~230 units past the banks. Everything is derived from `G.t` and the dam list (hosts, clients, checkpoints agree). In the water: infantry and vehicles move at half speed (heavy 40%), **bridges are shut** (10% speed, effectively impassable), infantry lose 3.5% of their health a second (drown when empty: "SWEPT AWAY"), vehicles lose up to 80% slowly but never die of it, wounded men and trench pieces in it are lost.
- **AI** (Normal and up, after 2:30): blows the dam whose flood would catch at least 5 enemy ground units and at least twice as many of theirs as ours, sending up to 6 tanks/artillery at it.
- **Look:** an arch dam (concrete, walkway, control tower, rock abutments) built once; the flood is one translucent murky mesh rebuilt 3x a second while water is up.
- Not done: the water does not push units, and the fords/bridges are slowed rather than truly closed (pathfinding is not changed, so units don't re-route around the flood).

## 4. Medics and wounded
- **Wounded:** an infantryman (cost <= 600, not heroes/clerics/dozers/crew) killed by an ordinary bullet, sniper shot or tower gun (never by shells, rockets, bombs, blasts) goes down wounded 40% of the time instead of being lost (seeded roll, deterministic). He lies there 32 s with a **red-cross icon** (it blinks fast in the last 10 s for your own men). Enemy fire can't target him; any blast kills him.
- **Medics:** the **Combat Medics** unit now exists for **every nation** (barracks, same stats and price; India already had it as its special). An idle medic runs to the nearest wounded friend within 320 (if no enemy is within 120 of him), kneels, and **4 s later** he is back on his feet with 45% health **and his veterancy**. Player orders always win: any order cancels the auto-run.
- **Aid stations:** a wounded man beside your HQ / Supply Depot is patched up slowly (10 s).
- **Drag to cover:** with no medic coming, an idle squad mate within 90 grabs him and **drags him to the nearest cover** (foxhole/trench/rubble/cover cell within ~150), moving at 60% speed, then goes back to normal.
- Icons are drawn as points so they stay readable from high up; enemy wounded show only where you have eyes.
- **AI:** builds up to 2 medics once it has 6+ infantry, and its medics/idle infantry use all of the above automatically.
- The old nation perk `revive` (IN etc.: a third of infantry killed by *blasts* near a medic return after 8 s) is untouched; it only fires for deaths that don't go the wounded route.

## Numbers (same for every nation)
Wound chance 40% | bleed-out 32 s | revive 4 s | aid station 10 s | rubble clear 7 s | dam 3000 HP | flood 3 min, 3.5%/s infantry | drag speed 60%.
A balance agent should re-run the tourneys: wounded add roughly +10% effective infantry life, so medic count and wound chance are the knobs (`WND_*` at the top of 03f).

## Sync / saves
New sim state is in the checkpoint (`CK_G`: wnd*, dams, damV, fln; civ fields `stg`/`clr` ride with the civ list), clients get `wd` (wounded, filtered by sight) and `dm` (dam state) in the team panel (only when changed, wounded refresh every 1.2 s), new commands `clr` and `atkDam` in `CMD_T`. **servers-live PR needed** (03f, 03, 01 changed).

## Checks
`node orch/bftest.mjs`: wounded ratio, shell kills outright, medic runs over + revives with rank kept, bleed-out, drag to a foxhole, building stage 1/2 + half the garrison bails, collapse leaves rubble, tank blocked, dozer clears it, two mirrored dams with equal flood corridors, breach, valley floods, infantry slowed and hurt, vehicles survive, water recedes, infantry trench lines. Headless AI game on Twin Rivers: wounded and AI dam attacks happen, no errors.
