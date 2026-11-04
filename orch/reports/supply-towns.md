# Supply lines, ammo and capturable towns (branch orch/supply-towns, 2026-11-03)

## What players get
- **Ammo.** Every ground combat unit carries shots (infantry/vehicles ~16-300 depending on fire rate, artillery and missile units 20). Each shot spends one. At 0 vehicles can't fire; infantry only plink with a sidearm (12% damage).
- **Supply.** Troops refill (7% of their ammo per second) inside faint blue supply circles: HQ (380), Supply Depot (320), supply trucks (230), held towns (230). Allies share supply. Out of supply for 60 s also stops healing. Trucks can be hunted, so cutting a route matters.
- **Clarity.** (a) ammo bar under the health bar (shown when selected or low: tan, yellow <30%, flashing red when empty); (b) "Ammo 12/40 · In supply" / "Out of supply 0:45" row in the selection panel (live; groups show average + how many empty/low/out of supply); (c) a crossed-box icon over own units out of supply >20 s; (d) supply circles while ammo units are selected or O is held (also on phone with a unit selected); (e) "Running low on ammo" / "Out of ammo" notifications (25 s cooldown per side); (f) one line in the loading tips, the phone first-battle guide, the truck and depot descriptions; (g) **Resupply** button (Z; touch strip "Supply" button, shown only when selected units carry ammo) sends units to the nearest supply point.
- **Towns.** Infantry garrisoned in a civilian building capture it (bar fills, ~20 s for 4 soldiers; the capture reverses if they leave). A held building pays $0.35/s (counted up to 8 per side), gets a supply circle, and shows the owner colour on the minimap and an owner dot + capture bar in the world. Ownership ends if the building collapses.
- **AI.** Dry/out-of-supply AI troops with nothing to shoot fall back to the nearest supply circle; Hard AI sends small squads at enemy supply trucks near its base; AI sends 2 infantry to take a nearby town (max 3 held per AI).

## Code
- `03-sim.js`: `hasAmmo/ammoCap/ammoInit/supplyPoints/updSupply` (before `damageOil`), ammo gate at the top of `fire()`, heal gate, `resup` command, AI block after the oil lines, `c.ow/c.cp/c.cpT` on civ buildings (host only).
- Net: unit ammo = 7 bits (bits 23-29 of the unit flags, 0 = untracked, 1 = empty) + in-supply bit 30 — no extra bytes. Towns in `teamGlobals` as `cv` (flat [civ, owner, capture%, capturing team]), only when changed. Checkpoints already copy every unit/civ field, so `am/amx/supT` and `ow/cp` migrate for free. New command `resup` appended to `CMD_T`.
- UI: `06-view.js` (`drawSupplyTowns`, ammo bar, minimap towns), `08-ui.js` (`ammoRowHTML`, `resupplySel`, button, Z key, touch strip, tips).
- Tools: `orch/supplyshots.mjs` (screenshots, orch/shots/supply/), `orch/ammostat.mjs` (headless ammo/town stats).

## Checks
- Headless AI battle (US v RU, fulda): no units run empty in 10 min, AIs hold 2-3 towns each.
- aitourney (6 nations x 5 maps, 12-min cap, Normal): similar to baseline, small sample (IR 90/90, RU 70/70, TR 50→70, CN 30/30, KR 30/30, US 30→10). Games end slightly sooner. A full 18-nation run was too slow on this 2-core box; worth running `node orch/aitourney.mjs` once on a bigger machine.
- Smoke PASS; cigate: see HISTORY line (touch-strip Cancel regression fixed by hiding the Supply button when no ammo units are selected).

## Not done / ideas
- No spoken voice line for low ammo (text notification only); "cheaper infantry near held towns" skipped (kept the economy change small); AI doesn't keep a truck near its army (it falls back to depots/HQ/towns instead).
