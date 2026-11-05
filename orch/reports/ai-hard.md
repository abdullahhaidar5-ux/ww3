# Hard AI plays Conquest like a smart human (2026-11-05, helper agent `orch/ai-hard`)

Abdullah approved 2026-11-04 19:38. **Tactics only: no extra money, no extra vision** (it only reacts to enemy troops it can
actually see — `seenBy`; enemy base buildings and towns are public map knowledge, as for every AI). **Easy and Normal are
untouched**: everything new is behind `DIFF[2].hm` and the Hard-only functions `aiHmTowns`, `aiHmTax`, `aiHmSmart`, `aiHmOp`
in `src/03-sim.js` (just above `aiThink`). AI runs on the host only; no new net/snapshot state (a host-migration restart just
begins a fresh plan; stale "waiting" flags clear themselves).

## What Hard does now
- **Territory:** every ~2.5 s it sends 3-rifle squads to the two best free towns/hamlets **in different directions** (score =
  route distance ÷ √value; skips spots where it can see enemy troops), up to 14 held. **Defends** a held town when it sees
  enemies there and **retakes** a lost one within 2.5 min — sending a response force worth 1.3× what it sees (never feeds a lost
  fight). After minute 6 it **raids a lightly held enemy town** (3 fast vehicles + 3 riflemen who garrison the key buildings).
- **Tax:** High in safe rear towns (far from any enemy building), Low on the contested front or when unrest climbs, Normal in
  between; never lets a town boil over.
- **Flanking, timed together:** when it sends a flanking force, the main body now **stops at a staging point** and waits until
  the flankers reach their swing points (or 80 s, or it is fired on) — then **everyone hits at once** (pin + hammer). No new
  wave goes out while one is staging (no trickling).
- **Finish the base:** attacks aim at the nearest *base* building (HQ, barracks, war factory, airfield, shipyard — the ones
  that decide Conquest), and leftover troops in the enemy base go for those, not walls and turrets.
- **Smart choices:** builds 2 SAM sites (missile defence) once the enemy has a launch site; **raids the enemy launch site**
  when its strike countdown is past halfway; researches upgrades for the buildings that make most of its army (cheapest first)
  instead of at random. Kept from before: scouting-based counter-building, focus fire, cover hopping, retreating damaged
  vehicles, digging in when idle, powers/strikes on clusters.

## Proof (headless AI tourney, `node orch/aitourney.mjs`, 20-min cap, same money both sides)
**Hard vs Normal** (`--hard-vs-normal --maps strait,oasis,plateau,fulda`, all 18 nations, every pair, Hard plays both slots):

| | Games | Hard score |
|---|---|---|
| Before (main, Conquest, 8-nation sample) | 28 | **54%** |
| After, all maps | 153 | **88%** |
| Fulda | 38 | 100% |
| Plateau | 38 | 89% |
| Oasis | 38 | 88% |
| Strait | 39 | 76% |

**Hard vs Hard** (`--diff 2`, all 18 nations, every pair once, 5 maps, 153 games; 17 games per nation = about ±12 points of noise):
TR 79, IR 79, KP 65, CU 65, EU 59, KR 59, US 53, CN 53, IN 50, RS 50, EG 47, IL 44, AE 44, RU 41, UA 35, PK 29, DW 26, SA 21.
I re-checked the four extremes with a second round (`--vs TR,IR,SA,DW --seed 2`, 62 more games). Combined over 34 games each:
**IR 76%, TR 69%, DW 41%, SA 34%**. **Slot A won 74, slot B won 73, 6 draws**, so neither start position has an edge.

**Verdict:** Iran is still over the ~60% target. It isn't the new Hard AI: Iran was already on top with Normal vs Normal
(82% in the tactics run, 76% on main before that, see `tactics.md`). Turkey is borderline, and the others are inside
or near 35-65%. **Recommended next balance pass (not done here, it is a 01-data job):** make Iran weaker (a smaller Basij discount or
pricier units) and make Saudi Arabia and the Coffee Shias a bit stronger. Then re-run `node orch/aitourney.mjs --diff 2 --rounds 2`.

**Per-start fairness:** Normal is unchanged, so `orch/mapfair.mjs` (which plays Normal) is unchanged by construction; in the
Hard-vs-Hard run above slot A vs slot B is shown in the table.

## Checks
SMOKE PASS (401 s). CIGATE 20/20 PASS on 931f5c29 (headless determinism, MP sync, migration, smooth-pc, smooth-mp). Shipped to `main`; Cloudflare deploy rides open PR #20 (main → servers-live, commented).
