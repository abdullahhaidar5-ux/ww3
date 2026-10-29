# AI tactics, navy, balance — report (branch `orch/ai-tactics`)

**What the AI does now**
- **Hard is smarter, not richer.** Its extra 35% income is gone. Instead it counter-builds against your army (AT teams and tanks against armour, guns against infantry, flak against aircraft), holds back a wave that would only get slaughtered and attacks early when it is clearly stronger, sends pincer flanks round both sides that then close on the main target, hops infantry into cover (woods, walls, building corners) while trading fire, focus-fires, and pulls damaged vehicles back earlier. **Hard beat Normal in 58% of 153 games with the same money** (48% before the counter-building).
- **Navy:** on Normal the Shipyard now goes up at ~3 min (it could not start before 4 min), first warship ~4 min. On open-sea maps the AI builds a Landing Craft, loads troops, lands them by the enemy base and storms it (checked on Island Chain).
- **Supply trucks** never pick fields they can't drive to, keep out of enemy bases, and the AI builds a depot next to a far field the trucks report. Fulda Easy test: worst haul 2,167 → 208 by minute 10.
- **Covert nations (IL, AE)** no longer leave a third of their army sitting in ambushes.

**Balance** (Normal AI vs AI, `node orch/aitourney.mjs`, new fast Node tournament, 18 nations round robin)
- Before (153 games): 24–76%. Israel 32%, UAE 24%.
- After (459 games, 51 per nation): 37–65%. Israel 51%, UAE 57%. Strongest Egypt 65%, weakest Cuba 37%. (±7% noise per nation.)
- Done with each nation's overall cost factor. "Radwan Training" untouched.

**CIGATE:** 16/16 PASS on 142bbfb (HEADLESS PASS: battles stay deterministic, multiplayer sync and host-migration tests pass).
