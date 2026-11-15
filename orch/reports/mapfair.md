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

## mapfix (2026-11-15, Abdullah 2026-11-14 23:56 "Yes": even out caribbean and hormuzgate)

What was really unequal (found by dumping the ground grid and comparing every cell with its point mirror):
- **Caribbean**: the island outline and the four cay outlines used odd wobble harmonics (sin 3q, sin 7q), which are not point-symmetric, and the two towns were not mirrors of each other (different size and spot). 4572 of 35953 ground cells (12.7%) differed from their mirror, mostly the coast. Now 190 (0.5%, one-cell coast rounding).
- **Hormuz Gate**: the centre island outline used sin 3a (odd), and derricks were 2.5 / 1.5 by driving distance. Now equal (derricks 3.0 / 3.0, supply fields 4.0 / 4.0).
- **Both maps**: the route-distance search picked near-tie spots, so derricks and supply fields were not exact mirrors (caribbean fields 3.0 / 4.0 in one layout), and the neutral hamlet houses and town blocks (garrisonable cover) were random per site. New map flag `mirRes:1` (2-player point-symmetric maps only): derricks, supply fields and hamlets come from base 1's half and the other half is the exact point mirror; a town that mirrors an earlier one is that town turned half a circle, house for house.
- **Seat order in the simulation** (all games, all maps): gunfire hits at once and marks the target dead, and units were updated in creation order, so team 0's units fired first every tick; the AI always thought team 0 first. Now the unit loop runs forwards on even ticks and backwards on odd ticks (`G.upN`, in the checkpoint) and the AI think order rotates with `G.upN`.

Results (AI vs AI, Normal, 15 min cap, `--counts 2`, rounds 4+; games per map; position 1 win share / score share):

| state | caribbean | hormuzgate |
|---|---|---|
| before (16 games each) | 85% / 66% | 72% / 66% |
| seat order + coast/derrick fixes (56 games each) | 71% / 61% | 57% / 54% |
| plus mirrored towns, hamlets, fields (28 games each) | 68% / 55% | 82% / 65% |

The lean did **not** go away in AI-vs-AI games: pooled over the later samples position 1 still wins about 70% on both maps (p about 0.06 and 0.001 for 28 games, but every game pair shares a seed, so the real sample is about half that). The map is now point-exact apart from random trees/rocks, so what is left is either the random forests (placed per seed, not mirrored) or AI behaviour at the coast (naval spot search `coastSpot` takes the first tie in scan order; in one probe the US seat built a shipyard by minute 4 while IR built a tunnel instead, which is a nation effect, not a seat effect). Euphrates and Gulf lean to position 2 in the same test, so a generic seat edge is not it.

Next steps: (1) mirror the random forests/rocks for mirRes maps (G.treePos, in the render pass of mkMap), (2) break `coastSpot` ties by distance to the base instead of scan order, (3) run 40+ games per map on GitHub Actions to see whether the lean is gone; 28 games are not enough to read a 10-point change.

## mapfix2 (2026-11-15, Abdullah 2026-11-15 04:09 "Yes": finish map fairness)

**Real cause found: a supply truck stuck at a corner of the Command HQ.** A per-side probe (same nation in both seats, credits/buildings every 10 s) showed seat 2 behind at minute 2 on caribbean and hormuzgate in every seed (2 buildings started vs 8 on caribbean seed 101), while euphrates was even. Tracing the trucks: seat 2's first truck came back to the HQ at a diagonal, stopped against the HQ's corner and stayed "returning" with 160 supplies for the rest of the game. The unload test was distance to the HQ's *centre* < half its size + 26; the HQ is a 90-wide square, so from a corner the truck can never get that close (corner ≈ 64 + truck radius 12 = 76 > 71). Which side's truck reaches a corner depends on the path (grid cells round down, so the mirrored route is not exactly mirrored) - on these two maps it was always base 2. Losing one of two trucks from second 12 = about a third less money for the whole game, which is the 70-80% lean.

Fix (`src/03-sim.js` updHarv): a truck unloads when it is within 26 of the HQ/depot's **edge** (distance to the square, not its centre) - identical for a truck at a side, and a truck at a corner now unloads. Deterministic plain math, same on host, clients and Cloudflare servers. Guard: `orch/decisions.mjs` "mapfix2". Other centre-distance tests (dozer building, entering tunnels, repair) were checked: their margins are wide enough that a corner still counts for every building size.

Results (AI vs AI, Normal, 15 min cap, `node orch/mapfair.mjs --battles --counts 2 --maps caribbean,hormuzgate --round N`; position 1 win share / score share):

| state | caribbean | hormuzgate | pooled seat 1 : seat 2 (decided games) |
|---|---|---|---|
| before, main (rounds 4-12, 36 games each) | **81% / 63%** (p<0.001) | **72% / 63%** (p=0.008) | 43 : 5 |
| after (rounds 4-33, 120 games each) | **46% / 48%** (p=0.36) | **57% / 54%** (p=0.12) | 82 : 75 |
| after, same rounds as before (4-13, 40 each) | 45% / 50% | 51% / 52% | 25 : 28 |

Pooled seat check over the 13 two-player maps of the first table (rounds 4-5, 104 games, `--maps arctic,...,zagros`): position 1 won 33, position 2 won 33 of the decided games (was 19:11 before mapfix). Per map with 8 games: every map 44-56% except khyber 69% and lebanon 25% (p 0.29 / 0.16, too few games to read).

Both maps are now inside 40-60%. The earlier mapfix work (alternating tick order, mirrored coasts/derricks/towns) stays: it removed real asymmetries, but the truck was the big one.
