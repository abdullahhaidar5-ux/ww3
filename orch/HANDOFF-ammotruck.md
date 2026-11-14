# HANDOFF ammotruck (2026-11-14)

**What changed (plain words).** There is now a separate **Ammo Truck** for every nation, built at the War Factory ($450, light armour, no weapon). It refills the ammo of your units within a short radius (170) of it, about 5 seconds to fill a unit, up to 6 units at once, thirstiest first. It carries a limited stock (800 shots) that shows on its bar (and in the Ammo row of the unit card); the stock refills when it is back inside your area (HQ, Supply Depot, base buildings, held towns). A unit it is serving counts as supplied, so the out-of-ammo badge clears. An idle truck drives by itself to the nearest thirsty unit outside your area and parks 150 behind it toward home; when its stock is under 20% it drives back to your area to reload. Ctrl+A does not select it, so it stays behind the front.

**The money truck no longer refills ammo.** The supply circle around 'harv' is gone (`SUP_R.harv`), and tooltips, load tips, the low-ammo warnings, the Supply (Z) button text, the encyclopedia and unit description no longer mention supply trucks for ammo.

**AI.** Builds one Ammo Truck once it has 8+ combat units, a second at 18+ (never more than two), only when ammo is tracked; it is never picked by the random unit mix. Trucks idle behind the front and follow the thirsty units as above.

**Look.** Same truck bodies as the nation's cargo truck (M35 for Western, Ural for Eastern nations, team colour paint) with a covered bed, ammo crates at the tail and a dark-olive tarp; instanced like the other trucks. Proof picture: `orch/shots/ammotruck.jpg` (truck among a tank group, stock bar 467/800 after topping them up).

**Sync.** Stock uses the unit's existing `am` / `amx` fields, which are already in the unit snapshot and checkpoint (`U_LATE`), so no new state. Host only, no RNG.

**Guard.** `orch/decisions.mjs` AMMO TRUCK block: every nation has `ammot` (War Factory, unarmed); a harv beside a dry tank gives it nothing and is not a supply point; an Ammo Truck refills the tank from its stock; and no source text says the supply truck refills ammo.

**Gate.** build + `--check` OK; `node orch/smoke.mjs` SMOKE PASS (444 s); decisions: see the last line below. cigate: see the last line below.

**Lands after orch/ammozone** (this branch is built on top of it).

**Try for 2 minutes (PC):** Battle, build a War Factory, buy an Ammo Truck, send a tank group far out to fight, and park the truck behind them: watch their ammo bars fill and the truck's bar drop. Drive it home and watch it reload.
