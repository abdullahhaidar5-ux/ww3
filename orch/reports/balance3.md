# Balance round 4 (after cycle-14 AI tactics) — report

Measured with `node orch/aitourney.mjs` (real simulation in Node, Normal AI, 20-min cap, maps strait/oasis/plateau/fulda/zagros).
Only change: per-nation price factors (`BAL` in `src/01-data.js`, the `_` overall cost multiplier). No sim logic touched.

**What changed for players** (everything a nation builds costs this much more/less):
- Cheaper (stronger): Coffee Shias DW -7%, Iran IR -6%, Turkey TR -4%, Cuba CU -4%, Egypt EG -3%, India IN -2%, Russia RU -1%.
- Dearer (weaker): Pakistan PK +3%, China CN +2%.
- Radwan Training and all names untouched.

| Nation | Before (seed 1, 17 g) | After (seed 3, swapped slots, 34 g) |
|---|---|---|
| CN | 71% | 65% |
| PK | 65 | 44 |
| IN | 65 | 44 |
| EU | 59 | 44 |
| AE | 59 | 44 |
| US | 53 | 59 |
| TR | 53 | 38 |
| UA | 53 | 56 |
| SA | 53 | 62 |
| KR | 53 | 41 |
| RS | 53 | 44 |
| DW | 53 | 50 |
| IL | 47 | 44 |
| KP | 47 | 50 |
| RU | 41 | 62 |
| CU | 35 | 47 |
| EG | 29 | 50 |
| IR | **12** | 59 |

Spread before: 12–71% (IR 3 standard deviations low). After: 38–65%, every nation within ~1.8 sd of 50% (noise at 34
games is about ±9%); the spread is what pure chance would give. An intermediate config (IR -10%, EG -5%, CN/IN/PK dearer;
51 games each) overshot (IR/RU/EG 61–63%, DW 29%, IN 33%) and was walked back to the numbers above.

Note: small price changes reshuffle whole matches (same seed, different outcome), so single 17-game runs swing ±12%; use
300+ games before acting on any one nation.

Tests: build OK, SMOKE PASS, HEADLESS PASS (31 hashes identical), MPSYNC PASS.

Follow-ups: this changes the simulation (unit prices) → bump `NET_PV` in 07-net/07b-ckpt so old and new copies don't mix,
and open a `main → servers-live` PR. TR (38%) and KR (41%) are the lowest now; watch them next round.
