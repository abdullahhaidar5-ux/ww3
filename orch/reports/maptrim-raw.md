# Battle maps: fairness of the maptrim shortlist

AI-vs-AI Battle games (`node orch/battlemapfair.mjs --battles --list orch/maptrim-list.json`; mirror matches, seats rotate through the start positions, sides swap team numbers). **PASS = every start wins 40-60%.**
Merged by `node orch/maptrimreport.mjs`. Old maps (the 2-8 player maps from `src/02-map.js`, `02b`, `02c`) are seed-random, not mirrored by construction, so the strict structure check of `battlemapfair --static` is advisory for them; the game results decide.

| Map@players | Name | Games (kill / on time / draw / errors) | Win rate per start | Verdict | In the Battle list |
|---|---|---|---|---|---|
| aleppo@2 | Aleppo: Ruined City | 40 (36 / 4 / 0 / 0) | 60% / 40% | PASS |  |
| arctic@2 | Arctic Front: Frozen Armies | 40 (36 / 4 / 0 / 0) | 60% / 40% | PASS |  |
| beqaa@2 | Lebanon: Beqaa and Chouf | 40 (35 / 2 / 3 / 0) | 36% / 64% | FAIL |  |
| blacksea@2 | Black Sea Coast: Green Mountains | 40 (36 / 4 / 0 / 0) | 48% / 53% | PASS |  |
| caribbean@2 | Caribbean Island | 40 (36 / 4 / 0 / 0) | 45% / 55% | PASS |  |
| carmelcoast@2 | Carmel Coast: Haifa Bay | 40 (36 / 4 / 0 / 0) | 48% / 53% | PASS |  |
| caspian@2 | Caspian Oil Coast | 40 (32 / 7 / 1 / 0) | 66% / 34% | FAIL |  |
| coral@2 | Coral Archipelago | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| delta@2 | Delta Inferno | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| dmz@2 | Korean DMZ | 40 (36 / 3 / 1 / 0) | 61% / 39% | FAIL |  |
| donbas@2 | Donbas Steppe | 40 (38 / 2 / 0 / 0) | 40% / 60% | PASS |  |
| duhok@2 | Duhok: Border Mountains | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| euphrates@2 | Euphrates Crossing | 40 (34 / 5 / 1 / 0) | 49% / 51% | PASS |  |
| gaza@2 | Gaza: Rubble Streets | 40 (35 / 5 / 0 / 0) | 55% / 45% | PASS |  |
| golan@2 | Golan: Fight for the Heights | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| gulf@2 | Gulf Coast Landings | 40 (35 / 5 / 0 / 0) | 55% / 45% | PASS |  |
| hajar@2 | Hajar Mountains: Wadi Passes | 40 (37 / 3 / 0 / 0) | 50% / 50% | PASS |  |
| honshu@2 | Honshu Coast: Land of the Rising Sun | 40 (38 / 2 / 0 / 0) | 40% / 60% | PASS |  |
| hormuz@2 | Hormuz Narrows | 40 (37 / 3 / 0 / 0) | 60% / 40% | PASS |  |
| hormuzgate@2 | Strait of Hormuz: Island Gate | 40 (39 / 1 / 0 / 0) | 50% / 50% | PASS |  |
| islands@2 | Island Chain Armada | 40 (32 / 7 / 1 / 0) | 66% / 34% | FAIL |  |
| jordanvalley@2 | Jordan Valley: Rift Crossing | 40 (33 / 6 / 1 / 0) | 56% / 44% | PASS |  |
| kashmir@2 | Kashmir Line | 40 (40 / 0 / 0 / 0) | 57% / 43% | PASS |  |
| khyber@2 | Khyber Pass: Gate of Fortresses | 40 (36 / 4 / 0 / 0) | 60% / 40% | PASS |  |
| lebanon@2 | South Lebanon | 40 (39 / 1 / 0 / 0) | 55% / 45% | PASS |  |
| marshes@2 | Southern Marshes | 40 (40 / 0 / 0 / 0) | 57% / 43% | PASS |  |
| mesopotamia@2 | Mesopotamia | 40 (37 / 3 / 0 / 0) | 63% / 38% | FAIL |  |
| mosulcity@2 | Mosul: Old City on the Tigris | 40 (36 / 4 / 0 / 0) | 57% / 43% | PASS |  |
| negev@2 | Negev: Desert Crater | 40 (37 / 3 / 0 / 0) | 50% / 50% | PASS |  |
| petra@2 | Petra Highlands: Red Canyons | 40 (37 / 3 / 0 / 0) | 50% / 50% | PASS |  |
| taiwan@2 | Taiwan Strait | 40 (38 / 2 / 0 / 0) | 40% / 60% | PASS |  |
| taurus@2 | Taurus Mountains: Cilician Gates | 40 (38 / 2 / 0 / 0) | 40% / 60% | PASS |  |
| tigristowns@2 | Tigris: River Towns | 40 (34 / 6 / 0 / 0) | 45% / 55% | PASS |  |
| tihama@2 | Yemen: Tihama and Highlands | 40 (33 / 7 / 0 / 0) | 40% / 60% | PASS |  |
| yemen@2 | Yemen Highlands | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| zagros@2 | Zagros: Mountain Fortress | 40 (36 / 4 / 0 / 0) | 60% / 40% | PASS |  |
