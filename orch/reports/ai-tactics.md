# AI tactics, navy, balance — report (branch `orch/ai-tactics`)

**What the AI does now**
- **Hard is smarter, not richer.** Its extra 35% income is gone. It counter-builds against your army (AT/tanks vs armour, guns vs infantry, flak vs air), holds a wave that would be slaughtered and attacks early when clearly stronger, sends pincer flanks that close on the main target, hops infantry into cover (woods, walls, buildings) while trading fire, focus-fires, and pulls damaged vehicles back earlier. **Hard beat Normal in 58% of 153 games with the same money** (48% before the counter-building).
- **Navy:** on Normal the Shipyard now goes up at ~3 min (it could not start before 4 min), first warship ~4 min. On open-sea maps it lands troops by the enemy base with a Landing Craft (checked on Island Chain).
- **Supply trucks** never pick fields they can't drive to, keep out of enemy bases, and the AI builds a depot next to a far field the trucks report. Fulda Easy test: worst haul 2,167 → 208 by minute 10.
- **Covert nations (IL, AE)** no longer leave a third of their army sitting in ambushes.

**Balance** (Normal AI vs AI, new fast tournament `node orch/aitourney.mjs`)
- Before (153 games): 24–76%. Israel 32%, UAE 24%.
- After (459 games, 51 per nation): 37–65%. Israel 51%, UAE 57%. Strongest Egypt 65%, weakest Cuba 37%.
- Tuned via each nation's overall cost; "Radwan Training" untouched.

**CIGATE:** 16/16 PASS on 142bbfb (HEADLESS PASS: battles stay deterministic, multiplayer sync and host-migration tests pass).
