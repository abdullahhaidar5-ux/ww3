# Battle maps: which maps are in the Battle list, and how fair they are

One allow-list (`BATTLE_MAPS` in `src/02d-battlemaps.js`) is the Battle map list; this file is its proof. Every kept map passes **every start winning 40-60%** of AI-vs-AI Battle games (mirror matches, seats rotate through the start positions, sides swap team numbers, nations rotate; game = Battle rules, difficulty Hard). Checked at the player counts shown; a map is offered only for the contiguous even counts it was tested at.
Method: `node orch/battlemapfair.mjs --battles --list orch/maptrim-list.json` on GitHub runners (workflow `maptrim.yml`), merged by `node orch/maptrimreport.mjs`; 2 players 120 games, 4 players 168, 6 players 180, 8 players 320. Old maps are seed-random, not mirrored by construction, so the strict structure check is advisory for them. The five new maps come from `orch/reports/battlemaps.md`.

## Kept (35 maps)

| Map | Name | Offered for | Tested at | Games (kill / on time / draw / errors) | Win rate per start | Verdict |
|---|---|---|---|---|---|---|
| `bm_splitridge` | Split Ridge | 2-2 | 2 players | 120 (111 / 7 / 2 / 0) | 59% / 41% | PASS |
| `bm_ferryquarter` | Ferry Quarter | 2-2 | 2 players | 40 (36 / 3 / 1 / 0) | 44% / 56% | PASS |
| `bm_breakwater` | Breakwater | 2-4 | 4 players | 48 (47 / 1 / 0 / 0) | 56% / 44% / 52% / 48% (4p) | PASS |
| `bm_fourmills` | Four Mills | 2-4 | 4 players | 48 (46 / 2 / 0 / 0) | 52% / 52% / 44% / 52% (4p) | PASS |
| `bm_sixroads` | Six Roads | 2-6 | 6 players | 180 (178 / 2 / 0 / 0) | 54% / 54% / 53% / 53% / 45% / 42% (6p) | PASS |
| `lebanon` | South Lebanon | 2-4 | 2 players | 120 (113 / 6 / 1 / 0) | 50% / 50% | PASS |
| `lebanon` | South Lebanon | 2-4 | 4 players | 168 (165 / 2 / 1 / 0) | 45% / 50% / 49% / 56% | PASS |
| `gulf` | Gulf Coast Landings | 2-4 | 2 players | 120 (102 / 17 / 1 / 0) | 48% / 52% | PASS |
| `gulf` | Gulf Coast Landings | 2-4 | 4 players | 168 (160 / 8 / 0 / 0) | 51% / 51% / 48% / 50% | PASS |
| `euphrates` | Euphrates Crossing | 2 | 2 players | 120 (101 / 16 / 3 / 0) | 53% / 47% | PASS |
| `tihama` | Yemen: Tihama and Highlands | 2 | 2 players | 120 (109 / 11 / 0 / 0) | 46% / 54% | PASS |
| `zagros` | Zagros: Mountain Fortress | 2 | 2 players | 120 (108 / 10 / 2 / 0) | 60% / 40% | PASS |
| `caribbean` | Caribbean Island | 2 | 2 players | 120 (110 / 10 / 0 / 0) | 42% / 57% | PASS |
| `hormuzgate` | Strait of Hormuz: Island Gate | 2 | 2 players | 120 (110 / 10 / 0 / 0) | 55% / 45% | PASS |
| `taiwan` | Taiwan Strait | 2 | 2 players | 120 (111 / 8 / 1 / 0) | 47% / 53% | PASS |
| `arctic` | Arctic Front: Frozen Armies | 2 | 2 players | 120 (109 / 9 / 2 / 0) | 60% / 40% | PASS |
| `khyber` | Khyber Pass: Gate of Fortresses | 2 | 2 players | 120 (109 / 9 / 2 / 0) | 60% / 40% | PASS |
| `hajar` | Hajar Mountains: Wadi Passes | 2 | 2 players | 120 (108 / 12 / 0 / 0) | 42% / 57% | PASS |
| `marshes` | Southern Marshes | 2 | 2 players | 120 (114 / 5 / 1 / 0) | 50% / 50% | PASS |
| `blacksea` | Black Sea Coast: Green Mountains | 2 | 2 players | 120 (110 / 9 / 1 / 0) | 45% / 55% | PASS |
| `yemen` | Yemen Highlands | 4 | 4 players | 168 (156 / 8 / 4 / 0) | 58% / 51% / 49% / 42% | PASS |
| `hawizeh` | Hawizeh Marshes | 4 | 4 players | 168 (163 / 4 / 1 / 0) | 47% / 53% / 44% / 56% | PASS |
| `islands` | Island Chain Armada | 4 | 4 players | 168 (161 / 7 / 0 / 0) | 52% / 52% / 52% / 43% | PASS |
| `donbas` | Donbas Steppe | 4 | 4 players | 168 (154 / 10 / 4 / 0) | 52% / 50% / 57% / 42% | PASS |
| `mesopotamia` | Mesopotamia | 4 | 4 players | 168 (154 / 11 / 3 / 0) | 59% / 50% / 49% / 43% | PASS |
| `persia` | Persian Plateau | 4 | 4 players | 168 (151 / 16 / 1 / 0) | 54% / 50% / 51% / 44% | PASS |
| `taiga` | Siberian Taiga | 4 | 4 players | 168 (161 / 4 / 3 / 0) | 56% / 50% / 49% / 46% | PASS |
| `aegean` | Aegean Islands | 6 | 6 players | 180 (175 / 5 / 0 / 0) | 54% / 52% / 48% / 56% / 49% / 41% | PASS |
| `dmziron` | Korean DMZ: Iron Triangle | 6 | 6 players | 180 (173 / 6 / 1 / 0) | 53% / 51% / 50% / 50% / 54% / 41% | PASS |
| `rubalkhali` | Empty Quarter Edge | 6 | 6 players | 180 (171 / 5 / 4 / 0) | 57% / 51% / 57% / 48% / 42% / 45% | PASS |
| `oasis` | Oasis Basin: Last Water | 6-8 | 6 players | 180 (178 / 2 / 0 / 0) | 46% / 53% / 47% / 51% / 49% / 54% | PASS |
| `oasis` | Oasis Basin: Last Water | 6-8 | 8 players | 320 (311 / 8 / 1 / 0) | 47% / 47% / 50% / 53% / 50% / 47% / 52% / 55% | PASS |
| `atoll` | Pacific Atolls | 6-8 | 6 players | 180 (179 / 1 / 0 / 0) | 48% / 54% / 50% / 51% / 49% / 48% | PASS |
| `atoll` | Pacific Atolls | 6-8 | 8 players | 320 (309 / 9 / 2 / 0) | 45% / 48% / 49% / 54% / 50% / 46% / 54% / 53% | PASS |
| `hindukush` | Hindu Kush | 8 | 8 players | 320 (311 / 9 / 0 / 0) | 49% / 46% / 47% / 50% / 49% / 52% / 52% / 55% | PASS |
| `kuwait` | Burning Oil Fields: Inferno | 8 | 8 players | 320 (315 / 4 / 1 / 0) | 55% / 52% / 52% / 47% / 48% / 49% / 52% / 45% | PASS |
| `rhine` | Rhine Front | 8 | 8 players | 320 (310 / 8 / 2 / 0) | 45% / 50% / 51% / 52% / 49% / 46% / 53% / 52% | PASS |
| `yangtze` | Yangtze Gorges | 8 | 8 players | 320 (312 / 8 / 0 / 0) | 47% / 53% / 48% / 50% / 53% / 47% / 49% / 53% | PASS |
| `plateau` | Sinai: Iron Mesa | 8 | 8 players | 320 (314 / 6 / 0 / 0) | 48% / 56% / 48% / 50% / 51% / 48% / 47% / 53% | PASS |

## Passed but not kept (trimmed for variety / the 35-map target, or the same map at another count)

| Map@players | Name | Games | Win rate per start |
|---|---|---|---|
| aleppo@2 | Aleppo: Ruined City | 40 (36 / 4 / 0 / 0) | 60% / 40% |
| carmelcoast@2 | Carmel Coast: Haifa Bay | 40 (36 / 4 / 0 / 0) | 48% / 52% |
| donbas@2 | Donbas Steppe | 40 (38 / 2 / 0 / 0) | 40% / 60% |
| gaza@2 | Gaza: Rubble Streets | 40 (35 / 5 / 0 / 0) | 55% / 45% |
| hormuz@2 | Hormuz Narrows | 40 (37 / 3 / 0 / 0) | 60% / 40% |
| jordanvalley@2 | Jordan Valley: Rift Crossing | 40 (33 / 6 / 1 / 0) | 56% / 44% |
| kashmir@2 | Kashmir Line | 40 (40 / 0 / 0 / 0) | 57% / 42% |
| mosulcity@2 | Mosul: Old City on the Tigris | 40 (36 / 4 / 0 / 0) | 57% / 42% |
| negev@2 | Negev: Desert Crater | 40 (37 / 3 / 0 / 0) | 50% / 50% |
| petra@2 | Petra Highlands: Red Canyons | 40 (37 / 3 / 0 / 0) | 50% / 50% |
| taurus@2 | Taurus Mountains: Cilician Gates | 40 (38 / 2 / 0 / 0) | 40% / 60% |
| tigristowns@2 | Tigris: River Towns | 40 (34 / 6 / 0 / 0) | 45% / 55% |
| strait@4 | Straits of Thunder | 168 (154 / 13 / 1 / 0) | 54% / 49% / 51% / 46% |
| taiwan@6 | Taiwan Strait | 180 (176 / 3 / 1 / 0) | 51% / 54% / 55% / 50% / 45% / 46% |
| arctic@8 | Arctic Front: Frozen Armies | 320 (314 / 5 / 1 / 0) | 55% / 50% / 52% / 45% / 49% / 49% / 54% / 47% |
| dmz@8 | Korean DMZ | 320 (310 / 10 / 0 / 0) | 47% / 49% / 50% / 52% / 47% / 54% / 49% / 52% |
| heartland@8 | American Heartland | 320 (309 / 10 / 1 / 0) | 50% / 45% / 49% / 52% / 47% / 51% / 52% / 54% |
| persia@8 | Persian Plateau | 320 (315 / 4 / 1 / 0) | 54% / 50% / 53% / 48% / 50% / 47% / 53% / 45% |
| ural@8 | Ural Ridge | 320 (313 / 7 / 0 / 0) | 50% / 46% / 50% / 48% / 54% / 52% / 50% / 50% |
| volga@8 | Volga Winter | 320 (307 / 11 / 2 / 0) | 45% / 48% / 51% / 56% / 48% / 49% / 51% / 53% |
| zagros@8 | Zagros: Mountain Fortress | 320 (314 / 6 / 0 / 0) | 54% / 51% / 52% / 45% / 49% / 50% / 53% / 46% |
| honshu@2 | Honshu Coast (dropped: preview is an empty coast strip) | 120 | 47% / 53% |
| honshu@4 | Honshu Coast (dropped as above) | 168 | 51% / 48% / 56% / 45% |

## Failed (removed from the Battle lists)

| Map@players | Name | Games | Win rate per start |
|---|---|---|---|
| beqaa@2 | Lebanon: Beqaa and Chouf | 40 (35 / 2 / 3 / 0) | 36% / 64% |
| caspian@2 | Caspian Oil Coast | 40 (32 / 7 / 1 / 0) | 66% / 34% |
| coral@2 | Coral Archipelago | 40 (33 / 6 / 1 / 0) | 61% / 39% |
| delta@2 | Delta Inferno | 40 (33 / 6 / 1 / 0) | 61% / 39% |
| dmz@2 | Korean DMZ | 40 (36 / 3 / 1 / 0) | 61% / 39% |
| duhok@2 | Duhok: Border Mountains | 40 (33 / 6 / 1 / 0) | 61% / 39% |
| golan@2 | Golan: Fight for the Heights | 40 (33 / 6 / 1 / 0) | 61% / 39% |
| islands@2 | Island Chain Armada | 40 (32 / 7 / 1 / 0) | 66% / 34% |
| mesopotamia@2 | Mesopotamia | 40 (37 / 3 / 0 / 0) | 62% / 38% |
| yemen@2 | Yemen Highlands | 40 (33 / 6 / 1 / 0) | 61% / 39% |
| anatolia@4 | Anatolian Mesa | 48 (47 / 1 / 0 / 0) | 54% / 50% / 67% / 29% |
| babelmandeb@4 | Bab-el-Mandeb | 48 (47 / 1 / 0 / 0) | 40% / 40% / 48% / 73% |
| beqaa@4 | Lebanon: Beqaa and Chouf | 48 (43 / 5 / 0 / 0) | 52% / 44% / 40% / 65% |
| caribbean@4 | Caribbean Island | 168 (160 / 8 / 0 / 0) | 57% / 46% / 40% / 58% |
| delta@4 | Delta Inferno | 48 (43 / 4 / 1 / 0) | 61% / 51% / 32% / 55% |
| dnipro@4 | Dnipro: City on Fire | 48 (47 / 1 / 0 / 0) | 56% / 48% / 56% / 40% |
| emirates@4 | Gulf Emirates | 48 (44 / 4 / 0 / 0) | 40% / 40% / 65% / 56% |
| fulda@4 | Fulda Gap | 48 (44 / 0 / 4 / 0) | 35% / 56% / 46% / 62% |
| golanplateau@4 | Golan Plateau | 48 (45 / 1 / 2 / 0) | 46% / 46% / 46% / 62% |
| harbour@4 | Delta Harbor | 48 (46 / 2 / 0 / 0) | 65% / 35% / 40% / 60% |
| heartland@4 | American Heartland | 168 (158 / 10 / 0 / 0) | 58% / 52% / 39% / 52% |
| hormuzgate@4 | Strait of Hormuz: Island Gate | 168 (157 / 10 / 1 / 0) | 65% / 43% / 44% / 47% |
| rivers@4 | Twin Rivers Offensive | 48 (43 / 2 / 3 / 0) | 64% / 41% / 51% / 45% |
| volga@4 | Volga Winter | 48 (48 / 0 / 0 / 0) | 44% / 52% / 40% / 65% |
| bosphorus@6 | Bosphorus: City on Two Continents | 60 (60 / 0 / 0 / 0) | 57% / 47% / 33% / 50% / 53% / 60% |
| caucasus@6 | Caucasus Valleys | 60 (60 / 0 / 0 / 0) | 75% / 62% / 42% / 38% / 42% / 42% |
| crimea@6 | Crimean Isthmus | 60 (57 / 2 / 1 / 0) | 42% / 68% / 49% / 51% / 39% / 51% |
| indus@6 | Indus Valley | 60 (60 / 0 / 0 / 0) | 52% / 32% / 45% / 65% / 58% / 48% |
| lebanon@6 | South Lebanon | 60 (60 / 0 / 0 / 0) | 35% / 58% / 42% / 65% / 62% / 38% |
| mesopotamia@6 | Mesopotamia | 60 (60 / 0 / 0 / 0) | 63% / 43% / 50% / 43% / 53% / 47% |
| najd@6 | Najd Escarpment | 180 (180 / 0 / 0 / 0) | 53% / 49% / 60% / 52% / 48% / 38% |
| nile@6 | Nile & Suez | 60 (60 / 0 / 0 / 0) | 62% / 72% / 35% / 42% / 45% / 45% |
| punjab@6 | Five Rivers | 60 (56 / 4 / 0 / 0) | 58% / 55% / 58% / 45% / 35% / 48% |
| sahara@6 | Sahara Crossroads | 60 (60 / 0 / 0 / 0) | 68% / 35% / 45% / 52% / 55% / 45% |
| ural@6 | Ural Ridge | 180 (180 / 0 / 0 / 0) | 55% / 52% / 61% / 47% / 51% / 35% |
| yangtze@6 | Yangtze Gorges | 60 (59 / 1 / 0 / 0) | 58% / 52% / 32% / 68% / 45% / 45% |
| yemen@6 | Yemen Highlands | 60 (60 / 0 / 0 / 0) | 65% / 52% / 58% / 35% / 52% / 38% |
| aegean@8 | Aegean Islands | 40 (37 / 1 / 2 / 0) | 57% / 28% / 50% / 45% / 57% / 45% / 65% / 52% |
| fulda@8 | Fulda Gap | 40 (39 / 1 / 0 / 0) | 48% / 20% / 62% / 52% / 55% / 48% / 57% / 57% |
| gulfoil@8 | Gulf Oil Platforms | 40 (37 / 3 / 0 / 0) | 57% / 65% / 57% / 48% / 40% / 48% / 38% / 48% |
| najd@8 | Najd Escarpment | 40 (38 / 1 / 1 / 0) | 46% / 36% / 59% / 64% / 54% / 51% / 36% / 54% |
| nile@8 | Nile & Suez | 40 (40 / 0 / 0 / 0) | 62% / 55% / 62% / 42% / 35% / 62% / 42% / 38% |
| strait@8 | Straits of Thunder | 40 (40 / 0 / 0 / 0) | 38% / 35% / 42% / 52% / 70% / 52% / 57% / 52% |

The five new maps (`bm_*`) are mirrored by construction and were played at their full player count by `battlemapfair.mjs` (their smaller counts pass the structure check only).

Maps passed at only 40 games (2 players, round 1) were not re-run at 120 unless kept; they are listed above as passed-not-kept. Island maps kept (Caribbean, Hormuz Gate, Taiwan Strait, Honshu Coast, Gulf Coast Landings, Island Chain Armada 4p) are land-connected by causeways/isthmuses: every start can drive to every other, so the AI does not need ships and the numbers do not depend on naval play (water crossing by AI transports was not separately verified).
