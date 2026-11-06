# Real-place maps and seasons (branch `orch/real-maps`, 2026-11-06)

Abdullah 2026-11-05 18:43 picked: (1) **real-place maps** (terrain shaped after real places, fairness first) and (2) **seasons** for every map.

## What changed (plain words)

### Six new maps (`src/02b-realmaps.js`, in the lobby map list)
All are 4-fold mirror-symmetric (`sym:'quad'`): the four corner bases have the same ground, rivers, ridges and towns, so only geometry decides, never the seat. Every one has Conquest town bands, a centre prize town, roads, home-turf nations (`home:`) and a regional town look.

| map | shaped after | what is on it | players | default season |
|---|---|---|---|---|
| **Donbas Steppe** (`donbas`) | eastern Ukraine | open black-earth fields, two meandering rivers with bridges, slag-heap hills, mining towns, a big crossroads town in the middle | 2-6 | Autumn mud |
| **Golan Plateau** (`golanplateau`) | Golan Heights | a raised basalt plateau walled by ridges with passes, a big peak (Hermon) at each end, green valleys and a lake each side | 2-4 | Summer |
| **Korean DMZ: Iron Triangle** (`dmziron`) | Korean DMZ | the narrow strip between two rivers, fortified hills, a wooded ridge on each flank, a few bridges | 2-6 | Winter snow |
| **Lebanon: Beqaa and Chouf** (`beqaa`) | Lebanese mountains | Mount Lebanon / Anti-Lebanon walls with passes, the Beqaa valley river with a ford + bridges in the middle, coast behind each wall | 2-4 | Summer |
| **Yemen: Tihama and Highlands** (`tihama`) | Yemen | hot coastal plains both sides, a rugged highland diamond with the old capital inside, wadi passes along the middle | 2-6 | Summer |
| **Strait of Hormuz: Island Gate** (`hormuzgate`) | Strait of Hormuz | a sea strait between two coasts, wide gulf at both ends, a chain of three islands in the narrows linked by bridges; fleets fight for the water | 2-4 | Summer |

Shia-region ones: Beqaa (Mountain Shias home), Tihama (Coffee Shias home), Hormuz (Iran home), plus Donbas/DMZ/Golan for the rest. The old `hormuz` entry "Strait of Hormuz" was hidden by a second `hormuz` key ("Hormuz Narrows"); left as it was.

### Seasons (every map)
Lobby, under Conditions: **Season** = *Map default* / *Summer* / *Autumn mud* / *Winter snow*. It rides in the tens digit of the existing weather value `w` (`wxBase`, `wxSsn`, `wxJoin` in `01-data.js`), so it reaches clients, the Cloudflare server, host-migration checkpoints (`ssn` is in the checkpoint list) with no new network field. Same value everywhere, nothing random: **the map layout is identical in all three seasons** (fairness numbers do not change), only look + movement do.
- **Looks:** Winter = the existing snow theme (white ground, snowy roofs and trees, falling snow, blizzard/fog weather). Autumn = dark brown wet ground, dark puddles with a grey sheen, orange/yellow leaves on broadleaf trees, rain/fog weather. Summer = the map's normal green or desert look (snow maps in summer turn green).
- **Movement (`ssnK`, `03-sim.js`; roads are never slowed, so roads matter more):** off-road **Autumn mud**: wheeled vehicles x0.72, tracked x0.90, infantry x1. **Winter snow**: infantry x0.84, wheeled x0.88, tracked x0.94. Multiplies with the existing road bonus (+30% wheeled, +15% tracked/infantry), weather and terrain slow-downs.
- **Defaults:** "Map default" = the map's `ssn` field, else Winter for snow-theme maps (Arctic, Volga, Taiga, Caucasus, Ural, Hindu Kush: as before) and Summer for everything else, so **no existing map changes unless the player picks a season**.

## Fairness evidence
### Static (`node orch/mapfair.mjs --static`, 50 layouts of the new maps + `node orch/bandfair.mjs`)
Field/oil share per base is even on every layout (the mirror makes it so). Town bands (`real-maps-bands.md`, every map x every player count, 2 seeds): 24 layouts, 19 pass every check. The 5 that are flagged are all **5-6 player** layouts where the two middle-of-the-side bases sit ~30% closer to the prize town than the four corners (3400 vs 4700 route units) and get a richer middle band (flag `rear-tax-spread` / `mid-tax-spread`). Golan, Beqaa and Hormuz are therefore capped at 4 players. Donbas, DMZ and Tihama keep 5-6 players with that caveat.

| map | players | rear tax (per base) | middle tax | prize-town distance | roads | flags |
|---|---|---|---|---|---|---|
| donbas | 2 | 5.9 / 5.9 | 3.1 / 3.1 | 4430/4430 | 32 | ok |
| donbas | 3 | 5.5 / 6.1 / 6.1 | 4.0 / 3.9 / 3.9 | 4736/4743/4719 | 46 | ok |
| donbas | 4 | 4.0 / 4.0 / 4.0 / 4.0 | 3.5 / 3.5 / 3.5 / 3.5 | 5089/5112/5112/5089 | 51 | ok |
| donbas | 5 | 7.5 / 5.8 / 5.8 / 6.8 / 6.6 | 4.5 / 3.7 / 3.7 / 4.2 / 4.9 | 4373/4396/4373/4350/3160 | 81 | ok |
| donbas | 6 | 6.4 / 6.2 / 6.4 / 5.6 / 6.6 / 7.3 | 1.6 / 1.8 / 1.6 / 2.4 / 3.4 / 2.7 | 4759/4703/4719/4743/3473/3400 | 85 | rear-tax-spread |
| golanplateau | 2 | 5.6 / 5.6 | 3.4 / 3.4 | 4346/4346 | 32 | ok |
| golanplateau | 3 | 6.4 / 7.5 / 7.5 | 2.6 / 3.0 / 3.0 | 4662/4635/4652 | 50 | ok |
| golanplateau | 4 | 4.4 / 4.4 / 4.4 / 4.4 | 2.1 / 2.1 / 2.1 / 2.1 | 4944/4968/4921/4921 | 46 | ok |
| dmziron | 2 | 6.1 / 6.1 | 2.9 / 2.9 | 4523/4547 | 31 | ok |
| dmziron | 3 | 5.8 / 7.8 / 7.8 | 6.2 / 4.7 / 6.2 | 4910/4879/4870 | 61 | ok |
| dmziron | 4 | 3.6 / 3.5 / 3.5 / 3.7 | 3.4 / 3.5 / 4.5 / 3.8 | 5263/5239/5296/5159 | 50 | ok |
| dmziron | 5 | 5.9 / 6.4 / 6.4 / 5.8 / 6.2 | 5.1 / 3.1 / 3.1 / 3.7 / 4.8 | 4500/4443/4490/4490/3160 | 83 | rear-tax-spread |
| dmziron | 6 | 5.6 / 5.6 / 5.6 / 5.6 / 5.6 / 5.0 | 2.4 / 2.4 / 2.4 / 2.4 / 2.4 / 2.5 | 4910/4830/4903/4870/3738/3698 | 78 | rear-tax-spread |
| beqaa | 2 | 5.8 / 5.9 | 5.7 / 4.6 | 4336/4312 | 37 | ok |
| beqaa | 3 | 6.6 / 8.5 / 8.5 | 3.4 / 4.0 / 3.5 | 4666/4719/4743 | 59 | ok |
| beqaa | 4 | 4.4 / 4.4 / 4.4 / 4.4 | 3.6 / 3.6 / 3.6 / 3.6 | 5066/5089/5159/5136 | 52 | ok |
| hormuzgate | 2 | 5.2 / 5.2 | 3.8 / 3.8 | 4402/4402 | 27 | ok |
| hormuzgate | 3 | 5.7 / 6.2 / 5.2 | 3.8 / 4.3 / 5.3 | 4758/4765/4775 | 47 | ok |
| hormuzgate | 4 | 6.1 / 6.0 / 6.0 / 6.1 | 1.9 / 2.0 / 2.0 / 1.9 | 5144/5111/5144/5111 | 52 | ok |
| tihama | 2 | 5.1 / 5.1 | 3.9 / 3.9 | 4172/4172 | 30 | ok |
| tihama | 3 | 5.2 / 4.5 / 4.5 | 3.8 / 5.0 / 6.0 | 4525/4462/4485 | 49 | ok |
| tihama | 4 | 4.4 / 4.4 / 4.4 / 4.4 | 2.1 / 2.1 / 2.1 / 2.1 | 4831/4831/4831/4831 | 51 | ok |
| tihama | 5 | 6.3 / 5.0 / 5.0 / 6.3 / 5.7 | 2.7 / 4.5 / 5.0 / 2.7 / 4.8 | 4115/4115/4115/4139/3160 | 80 | mid-tax-spread |
| tihama | 6 | 4.5 / 4.4 / 4.5 / 4.4 / 3.7 / 3.7 | 3.5 / 3.6 / 3.5 / 3.6 / 4.3 / 4.3 | 4502/4422/4462/4462/3440/3400 | 82 | mid-tax-spread |

### AI-vs-AI Conquest battles (`node orch/mapfair.mjs --battles`, 15 min each, nations rotated through every position)
122 games on 17 layouts (raw rows `real-maps-battles-round*.json`). Win share by start position (draws share):

```
map             n games kills  win share by position (fair = 1/n)       score share by position
  beqaa           2     8      3   63  38                                         65  35                     14.0 p=0.480
  beqaa           4     8      0   22  47   9  22                                 26  42  13  18             15.0 p=0.498
  beqaa           6     6      0    6  39   6  39   6   6                         13  28  18  38   2   0     15.0 p=0.377
  dmziron         2     8      1   50  50                                         54  46                     14.7 p=1.000
  dmziron         4     8      0   44  19  31   6                                 38  32  18  12             15.0 p=0.475
  dmziron         6     6      0    3  19  36  36   3   3                         20  17  34  29   1   0     15.0 p=0.437
  donbas          2     8      2   50  50                                         41  59                     13.6 p=1.000
  donbas          4     8      0   53  16  16  16                                 40  29  19  12             15.0 p=0.337
  donbas          6     6      0    6   6  22  22   6  39                         18  19  17  21   5  20     15.0 p=0.649
  golanplateau    2     8      5   63  38                                         65  35                     13.4 p=0.480
  golanplateau    4     8      0   34   9  34  22                                 26  19  28  27             15.0 p=0.711
  golanplateau    6     6      0    3  19  69   3   3   3                         13  11  53  18   5   0     15.0 p=0.025
  hormuzgate      2     4      1   25  75                                         22  78                     14.3 p=0.317
  hormuzgate      4     4      0   25  25  25  25                                 28  16  34  22             15.0 p=1.000
  tihama          2    12      8   88  13                                         81  19                     13.0 p=0.009 <<
  tihama          4     8      0   19  31  31  19                                 30  34  18  19             15.0 p=0.919
  tihama          6     6      0    8  42  25   8   8   8                          7  40  11  33   0  10     15.0 p=0.623
```
- No position wins more than its share on any layout except **Tihama 2-player (p = 0.009, 12 games: seat 1 won 7 of 8 decided)**: terrain symmetry checks (blocked cells around each base for 6 seeds, field/oil distances, rings) show the two bases are the same, and a later round of 4 games was balanced (seat 1 won 1 of 3 kills), so I read it as chance (17 layouts tested, one p < 0.01 is expected about 1 time in 6), but it is **on the watch list**: rerun with `--round 4,5` (needs ~12 more games).
- The 6-player rows for Golan and Beqaa were scheduled before the cap to 4 players and are not meaningful (ignore).
- Only 12 of 122 games ended in a kill inside 15 minutes (the 90 s setup + the big maps); the rest are adjudicated by base + army value. Games are short because of the time limit, not because of the maps: the 25-minute run in `conquest-maps.md` is the longer test.
- Pooled 2-player seats: position 1 won 36, position 2 won 27 of decided games.

Seasons were not part of the battle tests (layout identical; slow-downs apply equally to both sides). Autumn mud makes wheeled armies slower by design, so nations that rely on wheeled vehicles (trucks, APCs, Stryker-like) are weaker in mud; not balanced per nation.

## Pictures (`orch/shots/real-maps/`)
- `<map>-overview.png`: top-down map data (terrain, rivers, ridges, bases, roads, bands).
- `<map>-<season>-ground.png` / `-view.png`: the 3D game at the player's base and from high up (headless software rendering; rain/puddle detail is limited by it).
- `donbas-summer|autumn|winter-*`: the same map in all three seasons.

## Gates
`python3 orch/build.py`, `node orch/smoke.mjs` SMOKE PASS; full `orch/cigate.sh` on this branch (see HISTORY entry). Map generation and the season movement factor are sim code -> `main -> servers-live` PR.

## Not done / next
- A per-season preview in the map picker; seasonal unit paint; snow footprints / mud tracks; mud puddles that slow only where drawn (the slow-down applies to all off-road ground, not just puddles).
- Rerun Tihama 2-player (watch list); 5-6 player layouts of Donbas, DMZ, Tihama could get a hexagon ring if the corner/side imbalance shows in battles.
- Fortified line on the DMZ map is hills only (no pre-built bunkers); towers (`M.towers`) could be added.
- Hormuz Island Gate has no oil rigs/offshore economy yet.
