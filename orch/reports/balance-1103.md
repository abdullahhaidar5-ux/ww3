# Balance pass 2026-11-03 (JOB A)

Method: `node orch/aitourney.mjs --rounds 2` (306 games, 5 maps, Normal AI, every pair twice). The "after" column of the
last run is `--rounds 2 --vs DW,IR,SA,EU` (124 games, only games involving those four), so the other 14 nations have just
8 games each there and only look worse because they were all playing the four nations that just got fixed — not a
real drop. A full 306-game re-run was not repeated (50 min each).

| Nation | Before | After 1st tweak (tank/arty HP) | After final tweak (4 nations only) |
|---|---|---|---|
| IR | 79% | 81% | 59% |
| DW | 71% | 88% | 50% |
| AE | 62% | 56% | 38% (only 8 games, not meaningful) |
| CU | 59% | 57% | 62% (only 8 games, not meaningful) |
| KR | 56% | 47% | 38% (only 8 games, not meaningful) |
| UA | 53% | 47% | 50% (only 8 games, not meaningful) |
| PK | 53% | 47% | 38% (only 8 games, not meaningful) |
| US | 50% | 50% | 25% (only 8 games, not meaningful) |
| RU | 50% | 53% | 25% (only 8 games, not meaningful) |
| IN | 50% | 56% | 50% (only 8 games, not meaningful) |
| CN | 50% | 53% | 62% (only 8 games, not meaningful) |
| RS | 50% | 47% | 62% (only 8 games, not meaningful) |
| TR | 47% | 47% | 38% (only 8 games, not meaningful) |
| KP | 44% | 44% | 50% (only 8 games, not meaningful) |
| IL | 41% | 38% | 25% (only 8 games, not meaningful) |
| EG | 38% | 41% | 12% (only 8 games, not meaningful) |
| EU | 26% | 21% | 56% |
| SA | 21% | 26% | 65% |

## What was wrong
Out of range (35-65%): Iran 79%, Coffee Shias 71% (too strong), Europe 26%, Saudi Arabia 21% (too weak). The other 14 nations were all 38-62%.

## Changes (all in `src/01-data.js`, six tweaks)
1. **Iran** — Basij militia discount 25% -> 15% cheaper (`infCost .75 -> .85`); description text updated.
2. **Coffee Shias** — units move 12% faster instead of 20% (`spd 1.2 -> 1.12`) and cost 3% less instead of 10% (`cost .9 -> .97`); text updated.
3. **Saudi Arabia** — every unit costs 7% less (`cost .93`); text updated.
4. **Saudi Arabia** — F-15SA jets hit 10% harder (`XL.SA.jet.dmg 1.1`).
5. **Europe** — every unit costs 7% less (`cost .93`); text updated.
6. **Europe** — tanks 12% tougher and 8% cheaper (`XL.EU.tank hp 1.12, cost .92`).

A first attempt (tank/anti-tank/artillery HP nudges on IR/DW/SA/EU) did nothing useful — DW went 71% -> 88% — so it was
removed again before shipping. The AI doesn't lean on tanks for those nations; the global cost/speed bonuses are what moved them.

Untouched: Radwan Training, Mountain Fortress, Bunker Buster, Ayatollah, Dear Leader, Sanctions, mourning period, stances.
Saudi Arabia is still at the top edge (65%) — worth a look at the next full run. Simulation changed (01-data) so a
`main -> servers-live` deploy PR is needed for Cloudflare battles to pick this up.
