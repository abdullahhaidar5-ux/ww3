# Infrastructure (power + fuel) and neutral militias — branch `orch/infra-militias` (2026-11-06)

Abdullah picked these 2026-11-05 18:43. Conquest only. Same numbers for all 18 nations, no RNG, host-authoritative. Sim code is the block
"INFRASTRUCTURE + MILITIAS" at the end of `src/03-sim.js`; map placement in `src/02-map.js` ("POWER PLANTS"); plant model `plantObj` in
`src/04c-townlook.js`; banner `drawInfraHud` in `src/08c-towns.js`; test `node orch/infra-test.mjs`; shots `node orch/infrashots.mjs`.

## 1. Power plants, fuel, oil
- **Power plants** are capturable sites on the map: one **per base** (its own station ~0.13 of the base-to-base route away, same route length for
  everyone, on its side, starts owned by that side) plus a **neutral** one on the front (duel: the equidistant centre spot or a mirrored pair; 3+
  bases: the most equal spot — same placement code as oil/towers). Shown with a ⚡ square on the minimap (owner colour, red when burnt out) and a
  "POWER PLANT" label in the world. They reuse the oil-derrick machinery (`G.oil` entries with `pw:1`): infantry capture in 6 s, strikes/shells destroy
  them (2000 HP, no money income), so networking, checkpoints, replay and AI targeting needed no new channels.
- **Blackout:** a side with **no live plant (its own or an ally's)** is dark: **SAM sites, Defence Guns, Coastal Missile Batteries and the Strike
  Center go offline** (same disabled flag the hacker uses; the building panel says "NO POWER"). A pulsing red banner tells the player what to do; the
  enemy is told too. Power returns the moment one plant is captured or repaired.
- **Repair:** a burnt-out plant is repaired **only by the Construction Vehicle** standing at it (8 s; infantry can't). The AI sends an idle dozer to
  rebuild its home plant.
- **Fuel:** every side has a fuel reserve (1 → 0 over **15 min** after the setup phase if it holds **no live oil derrick**; refills in ~90 s once it
  holds one). At 0 its **ground vehicles drive at 72 % speed** (never stop; infantry/air/naval unaffected). Warnings at 30 % and at 0. The AI sends a
  rifleman to the nearest free derrick once its reserve falls below 60 %. Derricks keep paying money as before.
- Why 15 min: derricks sit ~2500 m from the base on the big maps and AIs rarely grab them early, so a shorter tank would slow everyone for no reason.

## 2. Neutral militias
- At match start the **35 % most evenly contested** towns/hamlets (nearest base ≥ 650 m away; ranked by "second-nearest base ÷ nearest base", whole
  equal-contest buckets so mirrored towns always come together) hold **3 (hamlet) / 4 (town) armed locals** (rebel-team infantry in the khaki irregular
  look). They ignore everybody and **nobody auto-shoots them**.
- **Trust** (per side, −100..100) grows each second for every town of that side within 1300 m: loyal +0.3, Low tax +0.2, clinic/market +0.08 (restless
  town −0.3); ×1.25 on home turf, ×0.85 as the stranger; collateral-damage anger in their town subtracts up to 0.9/s; it decays 2 %/s toward 0.
- At **60** they **join that side**: the locals vanish and **3 ordinary infantry** of that nation appear in the town ("the local militia trust us…").
  The enemy is told. One-time, small, they can be moved or used like any rifles — a few defenders, never an army.
- At **−50 trust**, or if **anyone shoots them**, they turn **hostile to that side only** (and its allies) for 2 min (refreshed while fighting): they
  hunt that side's units within 800 m, then go home and calm down.
- Checkpoints keep the state (`t.ml`, `milOk`), units carry `mil/mlT/hos`.

## Checks
- `node orch/infra-test.mjs`: plants on 6 maps (home plants within a few % of equal distance, e.g. strait 1087/1096, gulf 819/831), blackout disables
  SAM/turret, dozer repair restores power, fuel flag, militia join at trust 61, hostile after a hit. **INFRA PASS.**
- A 13-minute AI soak on rivers ran without errors; fuel drained as designed and the AI recaptured oil.
- Gates: see HISTORY entry. No tourney run (balance agent re-runs them). Both sides get exactly the same plants/fuel/militia rules; the only asymmetry
  is map geometry, which the placement code mirrors.

## Open / ideas
- Plants are not yet in the map editor; custom (`manual`) maps and campaign/sandbox have none, so power/fuel never apply there (`G.conq` only; no plant = no grid).
- No separate irregular unit model; militia use the DW infantry model/khaki colour.
- Power dependency is deliberately limited to SAM / Defence Gun / Coastal / Strike Center (no radar building exists; the minimap stays on).
- Tutorial tip not added.
- CI note: first gate run had one mpsync failure at t=121 s (2/11 live checks); it passes locally (0/23 out of tolerance) and other branches show the same flake — re-run for confirmation.
