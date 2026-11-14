# pacecap - unit cap and match length (2026-11-14)

Abdullah 2026-11-13 21:24: match length "Medium 20-30 min", unit cap "About 150" per player.

## Unit cap (Battle only)
- 150 population per player. Infantry 1, small drones 1, light vehicles 2, boats 2, tanks / artillery / anything costing $800+ 3, helicopters and jets 3, ships and subs 3. Supply trucks and construction vehicles are free (`popOf` in `src/03-sim.js`).
- Counted from live units plus everything in the production queues, so it needs no saved state: host, clients and checkpoints always agree.
- Queuing past the cap is refused and a hold at the end of a build keeps the item waiting; either way the player sees "Unit limit reached (150)." (at most every 8 s). The AI uses the same `enqueue`, so it respects the cap.
- Top bar shows "units 87/150" next to the money (yellow from 90%, red when full). Guard: `orch/decisions.mjs` ("pacecap").
- In the measured AI games the biggest army was 10-95 pop, so 150 is only reached by a human who builds big.

## Match length
Tool: `node orch/pacemeasure.mjs` (equal nations, 1v1 on 4 Battle maps, Normal AI, real simulation). Minutes are game minutes until the last building falls.

| Setting | Games | Median | Range |
|---|---|---|---|
| Before (BATTLE speed 1.75) | 8 (US/RU) | 14.5 | 9.6 - 24.3 |
| BATTLE 1.25 | 8 | 18.9 | 6.9 - 20.8 |
| **After (BATTLE 1.0)** | 16 (US/RU/CN/IR) | **~20** | 9.9 - 29.9, one stalemate at 50 |

One number changed: `BATTLE` in `src/03-sim.js` (1.75 to 1.0) - the shared pace knob for starting money ($4,800 to $3,000), supply income, build speed, size of AI attack waves and how many items the AI queues. Every nation gets the same, so they stay equal. Slow-income games are spread wide: AI-vs-AI games that finish early are rushes on small maps.
2v2 (2 maps x 2 games): 10 / 17.7 / 16.7 / 47.1 min.
