# Map fairness, 2-player Battle maps (2026-11-15, polishC)

AI-vs-AI mirror games (`node orch/mapfair.mjs --battles --counts 2`, Normal AI, 12-min cap, nations rotate through both start positions, so only the start position differs). Four games per round; maps with several rounds (--round 1..3) have 16 games. Win share = share of games won by start position 1 (fair = 50%); score = share of base+army value at the end.

Static check (`orch/mapfair.mjs --static`, 34 layouts) and `orch/battlemapfair.mjs --static` (30 checks, the bm_* maps) PASS: supply, derricks and routes are mirrored for every start; one flag only: zagros on one seed shows derricks in reach 1 vs 3 (the other seed 2 vs 2).

| map | games | pos 1 win share | pos 1 score share | verdict |
|---|---|---|---|---|
| arctic | 4 | 63% | 55% | ok (only 4 games, weak) |
| blacksea | 4 | 50% | 49% | ok (only 4 games, weak) |
| caribbean | 16 | 85% | 66% | watch: favours position 1 |
| euphrates | 16 | 32% | 40% | ok |
| gulf | 16 | 35% | 39% | ok |
| hajar | 16 | 69% | 60% | ok |
| hormuzgate | 16 | 72% | 66% | watch: favours position 1 |
| khyber | 4 | 50% | 43% | ok (only 4 games, weak) |
| lebanon | 4 | 38% | 48% | ok (only 4 games, weak) |
| marshes | 4 | 63% | 55% | ok (only 4 games, weak) |
| taiwan | 4 | 38% | 38% | ok (only 4 games, weak) |
| tihama | 16 | 69% | 56% | ok |
| zagros | 16 | 54% | 51% | ok |

bm_* maps (splitridge, ferryquarter, breakwater, fourmills, sixroads, tarbasin) are not in this table: the AI-vs-AI run does not take their ids; their static fairness passes (supply and derricks equal for each start).

## Findings
- No start position is significantly unfair (p<0.01) in any sample. Pooled over all maps position 1 wins slightly more often than position 2 (19:11 in the 52-game run), so part of any lean is a general seat effect, not the map.
- **Caribbean** (13 of 16 games to position 1, score 66%) and **Hormuz Gate** (about 72%, score 66%) lean to position 1 even though supply, derricks and routes are mirrored (point symmetry) - both are naval maps, so the AI's navy/coast handling is the likeliest cause. Euphrates and Gulf lean to position 2 (32-35%), Hajar and Tihama to position 1 (about 69%) - inside the tolerance but worth a bigger sample.
- No map data was changed: the static mirror is exact, so a fix would be a guess without a bigger sample (about 40 games per map). Next step: run `--round 4..9` on caribbean, hormuzgate, euphrates, hajar, tihama; if the lean holds, check the naval start (coast shape, water access) for the leaning side.
