# HANDOFF ammotruck (redone fresh on current main, 2026-11-14)

Branch `orch/ammotruck2` (from origin/main 2443c39). The first try (`orch/ammotruck`) was built on the old ammozone branch and could not be merged; this one is a clean re-apply, so ammozone is NOT needed first (main already has the ammo rule and supply lines).

**What a player sees.** A new **Ammo Truck** for every nation, built at the War Factory ($450, light armor, no weapon). It refills the ammo of your units within a short radius (170), about 5 seconds per unit, up to 6 at once, thirstiest first. It carries a limited stock (800 shots) shown on its ammo bar (and the Ammo row of its card); the stock refills when it is back in your supply area. A unit it serves counts as supplied. Idle, it drives by itself to the nearest thirsty unit outside your area and parks 150 behind it toward home, and goes back to reload when under 20%. Ctrl+A / double-click-all do not pull it into the army.

**The money truck no longer refills ammo.** The circle around the Supply Truck (`SUP_R.harv`) is gone; tooltips, load tips, low-ammo warnings, tutorial/what's-new text, the Supply button tip, encyclopedia and unit descriptions now say Ammo Truck.

**AI.** One Ammo Truck at 8+ combat units, a second at 18+ (never more), never picked by the random unit mix.

**Look.** Nation cargo truck body (M35 Western / Ural Eastern) with covered bed, ammo crates at the tail; instanced like the other trucks. Proof: `orch/shots/ammotruck.jpg`.

**Sync.** Stock uses the unit's existing `am`/`amx` fields (already in snapshots and the checkpoint); client snapshot capacity uses `AMMOT_CAP` through `ammoCap`. Host only, no RNG.

**Guard.** `orch/decisions.mjs` "AMMO TRUCK" block after the ammo-rule checks: every nation has `ammot` (War Factory, unarmed); a harv beside a dry tank gives nothing and is not a supply point; the Ammo Truck refills it from its stock; no text says the supply truck refills ammo.

**Gate.** build + `--check` OK. Local `decisions.mjs` in this sandbox: my new items are clean (American spelling fixed); the run also shows failures that exist on unchanged main (one-game grep guards, badge rule regex, CLAUDE.md size, powertest timeout) and a page crash before my block, so my new guard was not seen running locally. Smoke not run locally (too slow here). `orch/cigate.sh` result: see below.
