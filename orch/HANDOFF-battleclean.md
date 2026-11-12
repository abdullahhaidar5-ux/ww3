# HANDOFF — battleclean (branch `orch/battleclean`, lock `taken/battleclean`)

Four jobs from Abdullah's 2026-11-11 evening messages. Nothing landed on main; the conductor lands the gated branch.

## Done

1. **Conquest full base + $10,000** (commit fc9e93d). Cause: Conquest only ever placed the Command HQ (+ dozer, truck, 2 infantry). `orch/reports/conquest.md` (2026-11-04) chose "HQ + dozer" over a pre-built base, and the three-games commit `70e1b1f` (2026-11-07) kept it, so "same full base" in DECISIONS was never true. Now `conqBase()` in `src/03-sim.js` places Barracks, War Factory, Supply Depot, Airfield (+ Shipyard near water) built and free for every team at second 0, by a fixed search (no random numbers). Checked headless on every map at min and max player counts: all teams get HQ + Barracks + War Factory + Depot (+ Airfield where the nation has one), $10,000 each. A 4-minute AI-vs-AI run is healthy. First-time hint text updated. Guard: `orch/decisions.mjs`.
   - Not literal: there is **no player-built power building** in this game (power = the map's power plants), so none is placed. Nations flagged `noAir` (RS, DW and the other militia nations) have **no Airfield by their own rules**, so RS starts with HQ, Barracks, War Factory, Depot (+ Shipyard) — I did not override the nation rule. Shipyard appears only when a shore spot is within 900 of the HQ (so not on every water map).
2. **Battle without supply lines** (a89d56f + part of 3b6869d). In `G.battle`: nothing drawn for supply roads on minimap or ground, no Supply overlay / key L / "Supply OK" chip, no out-of-supply label in the ammo row, no out-of-supply healing penalty, no town/road-node circles on the minimap. Conquest, grand campaign and Fight-it unchanged (guard checks Conquest still draws them).
   - **Decision for Abdullah:** I kept the **ammo refill circles** (around HQ, depots, supply trucks) — that is the ammo rule, not road supply lines, and removing it would change Battle balance. Say if he wants ammo gone in Battle too.
3. **Conquest road colors** (3b6869d). Roads are colored per stretch by the territory owner (existing `terrUpdate` owner map): yours + allies green, enemy red, neutral light gray; a cut-off, cratered or mined stretch is dashed in its owner's color; thin solid lines; town/junction dots take the owner's color; color-blind setting uses the Okabe-Ito pair already in `ID_CB`. Same sets drive minimap and ground. View only. Cached per territory change.
4. **Rally flag** (3b6869d). Shows only while one of your production buildings is selected, plus a 1.5 s flash right after setting it; disappears the moment you click away. It was already one flag per army. **Unsure:** the "large teal flag" in his photo may be the building's own national flagpole or the teal selection disc, which I left alone; I could not see his photo.

Jobs 3 and 4 share one commit (the built `index.html` is one file); the guard-fix commit 0e53000 follows.

## Proof pictures (`orch/concepts/battleclean/`, all looked at)
`cq-start-RS.png` (full compound, $10,002 top bar at second 0; RS data: hq, barracks, factory, depot, shipyard), `battle-minimap-BEFORE.png` / `-AFTER.png`, `cq-minimap-roads.png` (green / red / gray), `cq-ground-roads.png`, `rally-selected.png` / `rally-clicked-away.png`. **Missing: a Conquest start picture as US** — the second sandbox browser run was too slow; the US result is covered by the headless check (all nations, all maps) and the gate guard.

## Gate
First `orch/cigate.sh` on 3b6869d: 27 of 28 green; only `gate/decisions` red — my own new money check also looked at computer players, which spend at once. Fixed in 0e53000 (human only). Second run result: see the bottom line below (or `gh api repos/abdullahhaidar5-ux/ww3/commits/<sha>/statuses`).

## Try this for 2 minutes (PC)
Start Conquest as RS on any map: you should see $10,000 and a finished base at second 0. Open the minimap: roads green near you, red near the enemy, gray in between. Then start a Battle: no dashed roads or circles on the minimap. Select your HQ (flag appears), click empty ground (flag gone).
