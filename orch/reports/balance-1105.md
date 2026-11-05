# Balance run 2026-11-05 (orch/balance branch)

First full balance pass on the finished Conquest game (town tax, hamlets, hearts & minds, heroes, logistics, Hard AI). Everything ran on
GitHub's free runners with the new workflow `.github/workflows/balance.yml` (push a branch named `balance/<tag>`; `balance/tune-*` runs
18 shards = Normal and Hard round robins at 4 rounds = 612 games each, any other `balance/*` runs the 20-shard version: 2 rounds each +
Hard-vs-Normal + tax policies + home turf). Merge shards with `python3 orch/balance_merge.py <dir>`. Map fairness stays on `mapfair.yml`
(24 shards). `orch/aitourney.mjs` got `--shard i/N`.

## Two crashes found and fixed on the way (real bugs, were on main)
Merging the logistics squad's latest work made 20-30% of AI battles crash with `TypeError` in `lgJobs/lgCompute/lgRoute/lgAI2`:
a road whose end is a *depot* (node index changes whenever a depot is built or destroyed) pointed at a node that no longer exists.
Fixed in `src/03c-logistics.js`: `lgJobs` no longer assumes the road end is a town; `lgSync` turns an edge to a vanished node into an inert
one. After the fix: 0 errors in 1,224 + 612 + 612 games. (The logistics squad may want a cleaner fix; the root cause is that roads store
dynamic node indexes.) A host crash here would have ended a Cloudflare battle, so this ships with the balance change.

## Nation win rates (18-nation round robin, 612 games per tier, each nation 68 games per tier)
"Before" is the first run (306 games per tier, 34 per nation, so it is noisy: +-8 points). "After" is the last run (68 per nation per tier,
+-6 points; pooled +-4). Target 40-60% pooled.

| Nation | Before Normal | Before Hard | Before pooled | After Normal | After Hard | After pooled |
|---|---|---|---|---|---|---|
| CN | 29% | 50% | 40% | 51% | 70% | **61%** |
| UA | 41% | 38% | 40% | 51% | 62% | **57%** |
| AE | 54% | 46% | 50% | 61% | 51% | **56%** |
| KR | 71% | 60% | 65% | 62% | 45% | **54%** |
| IR | 68% | 79% | 74% | 43% | 62% | **53%** |
| US | 56% | 62% | 59% | 59% | 45% | **52%** |
| PK | 43% | 32% | 38% | 50% | 53% | **51%** |
| TR | 75% | 62% | 68% | 52% | 48% | **50%** |
| RS | 59% | 69% | 64% | 50% | 50% | **50%** |
| KP | 34% | 57% | 46% | 46% | 54% | **50%** |
| IN | 60% | 53% | 57% | 49% | 50% | **49%** |
| DW | 29% | 26% | 28% | 49% | 49% | **49%** |
| EU | 65% | 60% | 62% | 54% | 38% | **46%** |
| RU | 37% | 47% | 42% | 35% | 56% | **45%** |
| IL | 51% | 54% | 53% | 42% | 49% | **45%** |
| EG | 37% | 35% | 36% | 49% | 41% | **45%** |
| SA | 40% | 19% | 29% | 51% | 38% | **44%** |
| CU | 51% | 49% | 50% | 46% | 40% | **43%** |

Everything pooled is now 43-61%. Single-tier readings that still look off are noise-sized (two of the 36 readings are under 40%: SA Hard 38,
EU Hard 38, RU Normal 35 - and CN/UA read high in Hard); Hard and Normal disagree on SA, EU, UA, CN, which is the AI's playing style, not
unit strength. Rounds 1-5 of tuning are in the git log (`Balance pass N`); intermediate runs, pooled: pass 3 had SA 64 / DW 62 (overshot, pulled
back), pass 5 had PK 38, AE 38, SA 40.

## What changed (all numbers, `src/01-data.js` + one in `03-sim.js`; descriptions in the faction cards updated to match)
- Weakened: **Iran** (Basij discount removed, Shahed drones 25% cheaper instead of 50%, Fateh range +12% instead of +20%), **Turkey** (no across-the-board 5% discount, drones 10% cheaper / +15% HP / +5% damage instead of 25% / +30% / +15%), **Korea (South)** (damage +5% instead of +15%, sight +15% instead of +25%), **Mountain Shias** (no 5% discount), **Europe** (3% cheaper instead of 7%).
- Strengthened: **Saudi Arabia** (17% cheaper, F-15SA 25% cheaper), **Coffee Shias** (13% faster, 8% cheaper), **Pakistan** (infantry 28% cheaper, vehicles +30% HP), **UAE** (+25% damage, 5% cheaper), **Ukraine** (4% cheaper, drones 35% cheaper), **China** (infantry 42% cheaper and 40% faster to train, everything else 5% cheaper), **Egypt** (infantry 30% cheaper, Abrams 22% cheaper), **Russia** (vehicles +45% HP), **India** (11% cheaper), **North Korea** (units 10% fewer HP instead of 15%).
- Untouched: Israel, Cuba, US (kept +8% damage after a trial at +5%).
- **Tax: "High" now adds more unrest** (`TAX[2].u` .6 -> .85), so High-everywhere gets revolts (0.5 per game in the test) and loses its edge.
- Per-tier numbers are identical across nations (only the faction modifiers above moved); no extra money for Hard.

## Other measurements (final code, run balance/final3: Normal 306 + Hard 306 + Hard-vs-Normal 153 + tax + turf)
- **Hard vs Normal:** Hard scores **93%** (target >= 70%).
- **Game length:** Normal median 16.4 min, Hard 14.3 min; 72% of Normal and 83% of Hard games end by destruction (the rest are timed-out and adjudicated at 20 min). **Nothing ended in the first 3 minutes**; about 1% end before 8 min. Target 12-25 min: met.
- **Tax policies** (US vs RU mirrored, 12 games per policy, 14 min): smart (High rear / Low front) earns 19.5k, High everywhere 16.8k with 0.5 revolts per game, Normal 12.7k, Low everywhere 7.1k. Smart beats Low clearly and High on income and revolts; on "ahead at the end" it is 2 ahead / 6 behind vs High 1 / 6 - too few games to separate. (balance.yml now runs 16 seeds per policy for the next run.)
- **Home turf:** home nation's win rate with turf ON 35.2% vs OFF 35.9% over 64 games each (the home nations were paired with strong opponents, so the absolute number is meaningless; the difference is the effect): **about 0 points, well under the 55-57% target.** Per map the sample is only 8 games, it swings +-30 (IR zagros +31, RS lebanon -25) - noise.
- **Hero impact: not measured.** `aitourney` has no hero on/off switch; `heroes-probe.mjs` only checks the rules. Left for a dedicated A/B.

## Start positions (mapfair, every map x player count, AI vs AI, nations rotate so only the seat matters)
Round 1: 672 games on 130 layouts, three layouts flagged at p<0.01: heartland 6, rubalkhali 6, gulfoil 8. Round 2 and 3 on those: **gulfoil 8 is
fine** (p=.13). **heartland 6 and rubalkhali 6 are real**: seat 4 (the SE start (2050,1879) in both maps' `sl6`) wins 48% of 18 games (fair 17%), p=.002-.004; rubalkhali 8 seat 8
(the south start (1600,1980)) 42%, p=.006. The static check says supply/oil are perfectly even on rubalkhali 6, so it is not resources - probably
the AI's target choice or terrain at that spot. **Not fixed here** (it is a layout job, not a number): needs a look by the maps squad.
Everything else (127 of 130 layouts) has no seat above its share.

## Not done
Hero A/B, a third nation-balance round on Hard only for SA/EU (their Hard rate lags their Normal rate), the heartland/rubalkhali layout fix.
