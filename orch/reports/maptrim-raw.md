# Battle maps: fairness of the maptrim shortlist

AI-vs-AI Battle games (`node orch/battlemapfair.mjs --battles --list orch/maptrim-list.json`; mirror matches, seats rotate through the start positions, sides swap team numbers). **PASS = every start wins 40-60%.**
Merged by `node orch/maptrimreport.mjs`. Old maps (the 2-8 player maps from `src/02-map.js`, `02b`, `02c`) are seed-random, not mirrored by construction, so the strict structure check of `battlemapfair --static` is advisory for them; the game results decide.

| Map@players | Name | Games (kill / on time / draw / errors) | Win rate per start | Verdict | In the Battle list |
|---|---|---|---|---|---|
| aleppo@2 | Aleppo: Ruined City | 40 (36 / 4 / 0 / 0) | 60% / 40% | PASS |  |
| arctic@2 | Arctic Front: Frozen Armies | 120 (109 / 9 / 2 / 0) | 60% / 40% | PASS |  |
| beqaa@2 | Lebanon: Beqaa and Chouf | 40 (35 / 2 / 3 / 0) | 36% / 64% | FAIL |  |
| blacksea@2 | Black Sea Coast: Green Mountains | 120 (110 / 9 / 1 / 0) | 45% / 55% | PASS |  |
| caribbean@2 | Caribbean Island | 120 (110 / 10 / 0 / 0) | 43% / 57% | PASS |  |
| carmelcoast@2 | Carmel Coast: Haifa Bay | 40 (36 / 4 / 0 / 0) | 48% / 53% | PASS |  |
| caspian@2 | Caspian Oil Coast | 40 (32 / 7 / 1 / 0) | 66% / 34% | FAIL |  |
| coral@2 | Coral Archipelago | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| delta@2 | Delta Inferno | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| dmz@2 | Korean DMZ | 40 (36 / 3 / 1 / 0) | 61% / 39% | FAIL |  |
| donbas@2 | Donbas Steppe | 40 (38 / 2 / 0 / 0) | 40% / 60% | PASS |  |
| duhok@2 | Duhok: Border Mountains | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| euphrates@2 | Euphrates Crossing | 120 (101 / 16 / 3 / 0) | 53% / 47% | PASS |  |
| gaza@2 | Gaza: Rubble Streets | 40 (35 / 5 / 0 / 0) | 55% / 45% | PASS |  |
| golan@2 | Golan: Fight for the Heights | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| gulf@2 | Gulf Coast Landings | 120 (102 / 17 / 1 / 0) | 48% / 52% | PASS |  |
| hajar@2 | Hajar Mountains: Wadi Passes | 120 (108 / 12 / 0 / 0) | 43% / 57% | PASS |  |
| honshu@2 | Honshu Coast: Land of the Rising Sun | 120 (110 / 9 / 1 / 0) | 47% / 53% | PASS |  |
| hormuz@2 | Hormuz Narrows | 40 (37 / 3 / 0 / 0) | 60% / 40% | PASS |  |
| hormuzgate@2 | Strait of Hormuz: Island Gate | 120 (110 / 10 / 0 / 0) | 55% / 45% | PASS |  |
| islands@2 | Island Chain Armada | 40 (32 / 7 / 1 / 0) | 66% / 34% | FAIL |  |
| jordanvalley@2 | Jordan Valley: Rift Crossing | 40 (33 / 6 / 1 / 0) | 56% / 44% | PASS |  |
| kashmir@2 | Kashmir Line | 40 (40 / 0 / 0 / 0) | 57% / 43% | PASS |  |
| khyber@2 | Khyber Pass: Gate of Fortresses | 120 (109 / 9 / 2 / 0) | 60% / 40% | PASS |  |
| lebanon@2 | South Lebanon | 120 (113 / 6 / 1 / 0) | 50% / 50% | PASS |  |
| marshes@2 | Southern Marshes | 120 (114 / 5 / 1 / 0) | 50% / 50% | PASS |  |
| mesopotamia@2 | Mesopotamia | 40 (37 / 3 / 0 / 0) | 63% / 38% | FAIL |  |
| mosulcity@2 | Mosul: Old City on the Tigris | 40 (36 / 4 / 0 / 0) | 57% / 43% | PASS |  |
| negev@2 | Negev: Desert Crater | 40 (37 / 3 / 0 / 0) | 50% / 50% | PASS |  |
| petra@2 | Petra Highlands: Red Canyons | 40 (37 / 3 / 0 / 0) | 50% / 50% | PASS |  |
| taiwan@2 | Taiwan Strait | 120 (111 / 8 / 1 / 0) | 47% / 53% | PASS |  |
| taurus@2 | Taurus Mountains: Cilician Gates | 40 (38 / 2 / 0 / 0) | 40% / 60% | PASS |  |
| tigristowns@2 | Tigris: River Towns | 40 (34 / 6 / 0 / 0) | 45% / 55% | PASS |  |
| tihama@2 | Yemen: Tihama and Highlands | 120 (109 / 11 / 0 / 0) | 46% / 54% | PASS |  |
| yemen@2 | Yemen Highlands | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| zagros@2 | Zagros: Mountain Fortress | 120 (108 / 10 / 2 / 0) | 60% / 40% | PASS |  |
| anatolia@4 | Anatolian Mesa | 48 (47 / 1 / 0 / 0) | 54% / 50% / 67% / 29% | FAIL |  |
| babelmandeb@4 | Bab-el-Mandeb | 48 (47 / 1 / 0 / 0) | 40% / 40% / 48% / 73% | FAIL |  |
| beqaa@4 | Lebanon: Beqaa and Chouf | 48 (43 / 5 / 0 / 0) | 52% / 44% / 40% / 65% | FAIL |  |
| caribbean@4 | Caribbean Island | 168 (160 / 8 / 0 / 0) | 57% / 46% / 40% / 58% | FAIL |  |
| delta@4 | Delta Inferno | 48 (43 / 4 / 1 / 0) | 61% / 51% / 32% / 55% | FAIL |  |
| dnipro@4 | Dnipro: City on Fire | 48 (47 / 1 / 0 / 0) | 56% / 48% / 56% / 40% | FAIL |  |
| donbas@4 | Donbas Steppe | 168 (154 / 10 / 4 / 0) | 52% / 50% / 57% / 42% | PASS |  |
| emirates@4 | Gulf Emirates | 48 (44 / 4 / 0 / 0) | 40% / 40% / 65% / 56% | FAIL |  |
| fulda@4 | Fulda Gap | 48 (44 / 0 / 4 / 0) | 35% / 56% / 46% / 63% | FAIL |  |
| golanplateau@4 | Golan Plateau | 48 (45 / 1 / 2 / 0) | 46% / 46% / 46% / 63% | FAIL |  |
| gulf@4 | Gulf Coast Landings | 168 (160 / 8 / 0 / 0) | 51% / 51% / 48% / 50% | PASS |  |
| harbour@4 | Delta Harbor | 48 (46 / 2 / 0 / 0) | 65% / 35% / 40% / 60% | FAIL |  |
| hawizeh@4 | Hawizeh Marshes | 168 (163 / 4 / 1 / 0) | 47% / 53% / 44% / 56% | PASS |  |
| heartland@4 | American Heartland | 168 (158 / 10 / 0 / 0) | 58% / 52% / 39% / 52% | FAIL |  |
| honshu@4 | Honshu Coast: Land of the Rising Sun | 168 (156 / 10 / 2 / 0) | 51% / 48% / 56% / 45% | PASS |  |
| hormuzgate@4 | Strait of Hormuz: Island Gate | 168 (157 / 10 / 1 / 0) | 65% / 43% / 44% / 47% | FAIL |  |
| islands@4 | Island Chain Armada | 168 (161 / 7 / 0 / 0) | 52% / 52% / 52% / 43% | PASS |  |
| lebanon@4 | South Lebanon | 168 (165 / 2 / 1 / 0) | 45% / 50% / 49% / 56% | PASS |  |
| mesopotamia@4 | Mesopotamia | 168 (154 / 11 / 3 / 0) | 59% / 50% / 49% / 43% | PASS |  |
| persia@4 | Persian Plateau | 168 (151 / 16 / 1 / 0) | 54% / 50% / 51% / 44% | PASS |  |
| rivers@4 | Twin Rivers Offensive | 48 (43 / 2 / 3 / 0) | 64% / 41% / 51% / 45% | FAIL |  |
| strait@4 | Straits of Thunder | 168 (154 / 13 / 1 / 0) | 54% / 49% / 51% / 46% | PASS |  |
| taiga@4 | Siberian Taiga | 168 (161 / 4 / 3 / 0) | 56% / 50% / 49% / 46% | PASS |  |
| volga@4 | Volga Winter | 48 (48 / 0 / 0 / 0) | 44% / 52% / 40% / 65% | FAIL |  |
| yemen@4 | Yemen Highlands | 168 (156 / 8 / 4 / 0) | 58% / 51% / 49% / 42% | PASS |  |
| aegean@6 | Aegean Islands | 180 (175 / 5 / 0 / 0) | 54% / 52% / 48% / 56% / 49% / 41% | PASS |  |
| atoll@6 | Pacific Atolls | 180 (179 / 1 / 0 / 0) | 48% / 54% / 50% / 51% / 49% / 48% | PASS |  |
| bosphorus@6 | Bosphorus: City on Two Continents | 60 (60 / 0 / 0 / 0) | 57% / 47% / 33% / 50% / 53% / 60% | FAIL |  |
| caucasus@6 | Caucasus Valleys | 60 (60 / 0 / 0 / 0) | 75% / 62% / 42% / 38% / 42% / 42% | FAIL |  |
| crimea@6 | Crimean Isthmus | 60 (57 / 2 / 1 / 0) | 43% / 68% / 49% / 51% / 39% / 51% | FAIL |  |
| dmziron@6 | Korean DMZ: Iron Triangle | 180 (173 / 6 / 1 / 0) | 53% / 51% / 50% / 50% / 54% / 41% | PASS |  |
| indus@6 | Indus Valley | 60 (60 / 0 / 0 / 0) | 52% / 32% / 45% / 65% / 58% / 48% | FAIL |  |
| lebanon@6 | South Lebanon | 60 (60 / 0 / 0 / 0) | 35% / 58% / 42% / 65% / 62% / 38% | FAIL |  |
| mesopotamia@6 | Mesopotamia | 60 (60 / 0 / 0 / 0) | 63% / 43% / 50% / 43% / 53% / 47% | FAIL |  |
| najd@6 | Najd Escarpment | 180 (180 / 0 / 0 / 0) | 53% / 49% / 60% / 52% / 48% / 38% | FAIL |  |
| nile@6 | Nile & Suez | 60 (60 / 0 / 0 / 0) | 62% / 72% / 35% / 42% / 45% / 45% | FAIL |  |
| oasis@6 | Oasis Basin: Last Water | 180 (178 / 2 / 0 / 0) | 46% / 53% / 47% / 51% / 49% / 54% | PASS |  |
| punjab@6 | Five Rivers | 60 (56 / 4 / 0 / 0) | 58% / 55% / 58% / 45% / 35% / 48% | FAIL |  |
| rubalkhali@6 | Empty Quarter Edge | 180 (171 / 5 / 4 / 0) | 57% / 51% / 57% / 48% / 42% / 45% | PASS |  |
| sahara@6 | Sahara Crossroads | 60 (60 / 0 / 0 / 0) | 68% / 35% / 45% / 52% / 55% / 45% | FAIL |  |
| taiwan@6 | Taiwan Strait | 180 (176 / 3 / 1 / 0) | 51% / 54% / 55% / 50% / 45% / 46% | PASS |  |
| ural@6 | Ural Ridge | 180 (180 / 0 / 0 / 0) | 55% / 52% / 61% / 47% / 51% / 35% | FAIL |  |
| yangtze@6 | Yangtze Gorges | 60 (59 / 1 / 0 / 0) | 58% / 52% / 32% / 68% / 45% / 45% | FAIL |  |
| yemen@6 | Yemen Highlands | 60 (60 / 0 / 0 / 0) | 65% / 52% / 58% / 35% / 52% / 38% | FAIL |  |
| aegean@8 | Aegean Islands | 40 (37 / 1 / 2 / 0) | 57% / 28% / 50% / 45% / 57% / 45% / 65% / 53% | FAIL |  |
| arctic@8 | Arctic Front: Frozen Armies | 320 (314 / 5 / 1 / 0) | 55% / 50% / 52% / 45% / 49% / 49% / 54% / 47% | PASS |  |
| atoll@8 | Pacific Atolls | 320 (309 / 9 / 2 / 0) | 45% / 48% / 49% / 54% / 50% / 46% / 54% / 53% | PASS |  |
| dmz@8 | Korean DMZ | 320 (310 / 10 / 0 / 0) | 47% / 49% / 50% / 52% / 47% / 54% / 49% / 52% | PASS |  |
| fulda@8 | Fulda Gap | 40 (39 / 1 / 0 / 0) | 48% / 20% / 63% / 53% / 55% / 48% / 57% / 57% | FAIL |  |
| gulfoil@8 | Gulf Oil Platforms | 40 (37 / 3 / 0 / 0) | 57% / 65% / 57% / 48% / 40% / 48% / 38% / 48% | FAIL |  |
| heartland@8 | American Heartland | 320 (309 / 10 / 1 / 0) | 50% / 45% / 49% / 52% / 47% / 51% / 52% / 54% | PASS |  |
| hindukush@8 | Hindu Kush | 320 (311 / 9 / 0 / 0) | 49% / 46% / 47% / 50% / 49% / 52% / 52% / 55% | PASS |  |
| kuwait@8 | Burning Oil Fields: Inferno | 320 (315 / 4 / 1 / 0) | 55% / 52% / 52% / 47% / 48% / 49% / 52% / 45% | PASS |  |
| najd@8 | Najd Escarpment | 40 (38 / 1 / 1 / 0) | 46% / 36% / 59% / 64% / 54% / 51% / 36% / 54% | FAIL |  |
| nile@8 | Nile & Suez | 40 (40 / 0 / 0 / 0) | 63% / 55% / 63% / 43% / 35% / 63% / 43% / 38% | FAIL |  |
| oasis@8 | Oasis Basin: Last Water | 320 (311 / 8 / 1 / 0) | 47% / 47% / 50% / 53% / 50% / 47% / 52% / 55% | PASS |  |
| persia@8 | Persian Plateau | 320 (315 / 4 / 1 / 0) | 54% / 50% / 53% / 48% / 50% / 47% / 53% / 45% | PASS |  |
| plateau@8 | Sinai: Iron Mesa | 320 (314 / 6 / 0 / 0) | 48% / 56% / 48% / 50% / 51% / 48% / 47% / 53% | PASS |  |
| rhine@8 | Rhine Front | 320 (310 / 8 / 2 / 0) | 45% / 50% / 51% / 53% / 49% / 46% / 53% / 52% | PASS |  |
| strait@8 | Straits of Thunder | 40 (40 / 0 / 0 / 0) | 38% / 35% / 43% / 53% / 70% / 53% / 57% / 53% | FAIL |  |
| ural@8 | Ural Ridge | 320 (313 / 7 / 0 / 0) | 50% / 46% / 50% / 48% / 54% / 52% / 50% / 50% | PASS |  |
| volga@8 | Volga Winter | 320 (307 / 11 / 2 / 0) | 45% / 48% / 51% / 56% / 48% / 49% / 51% / 53% | PASS |  |
| yangtze@8 | Yangtze Gorges | 320 (312 / 8 / 0 / 0) | 47% / 53% / 48% / 50% / 53% / 47% / 49% / 53% | PASS |  |
| zagros@8 | Zagros: Mountain Fortress | 320 (314 / 6 / 0 / 0) | 54% / 51% / 52% / 45% / 49% / 50% / 53% / 46% | PASS |  |
