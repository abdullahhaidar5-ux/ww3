# Battle maps: fairness of the maptrim shortlist

AI-vs-AI Battle games (`node orch/battlemapfair.mjs --battles --list orch/maptrim-list.json`; mirror matches, seats rotate through the start positions, sides swap team numbers). **PASS = every start wins 40-60%.**
Merged by `node orch/maptrimreport.mjs`. Old maps (the 2-8 player maps from `src/02-map.js`, `02b`, `02c`) are seed-random, not mirrored by construction, so the strict structure check of `battlemapfair --static` is advisory for them; the game results decide.

| Map@players | Name | Games (kill / on time / draw / errors) | Win rate per start | Verdict | In the Battle list |
|---|---|---|---|---|---|
| aleppo@2 | Aleppo: Ruined City | 40 (36 / 4 / 0 / 0) | 60% / 40% | PASS |  |
| beqaa@2 | Lebanon: Beqaa and Chouf | 40 (35 / 2 / 3 / 0) | 36% / 64% | FAIL |  |
| caspian@2 | Caspian Oil Coast | 40 (32 / 7 / 1 / 0) | 66% / 34% | FAIL |  |
| euphrates@2 | Euphrates Crossing | 40 (34 / 5 / 1 / 0) | 49% / 51% | PASS |  |
| gaza@2 | Gaza: Rubble Streets | 8 (6 / 2 / 0 / 0) | 50% / 50% | FAIL |  |
| khyber@2 | Khyber Pass: Gate of Fortresses | 40 (36 / 4 / 0 / 0) | 60% / 40% | PASS |  |
| lebanon@2 | South Lebanon | 40 (39 / 1 / 0 / 0) | 55% / 45% | PASS |  |
| mesopotamia@2 | Mesopotamia | 40 (37 / 3 / 0 / 0) | 63% / 38% | FAIL |  |
| tihama@2 | Yemen: Tihama and Highlands | 40 (33 / 7 / 0 / 0) | 40% / 60% | PASS |  |
| yemen@2 | Yemen Highlands | 40 (33 / 6 / 1 / 0) | 61% / 39% | FAIL |  |
| zagros@2 | Zagros: Mountain Fortress | 40 (36 / 4 / 0 / 0) | 60% / 40% | PASS |  |
