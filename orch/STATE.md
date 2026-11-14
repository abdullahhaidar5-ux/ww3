# Conductor state — 2026-11-14 ~20:25 UTC

LANDED on main (476d070f6, Pages build OK): battlepower (Generators + power meter, hand-merged into the new goal line) and techbldgs part 1 (capturable quarry, mine, power plant, field hospital).
Train gate (train/20261114-1930): all green except tutorial (known flaky) and superfreeze (a different nation each run: IR, then RU, over the limit by a slow runner; every nation passed in some run). smooth-pc and smooth-mp green.
Held back: groundreal (first train with it had smooth-mp red: host step p95 16 ms vs 1.9, client got no snapshot 2.6 s; looks like the heavier ground shader on the CI software renderer; needs its own smooth fix). pileflag + dugout (earlier trains red, merges reverted: re-merging them needs "revert the revert" first, otherwise only the newest commits come in). leaderlook, usvoice, ammozone: no gate yet. looktest: waits for Abdullah's pick.
Main moved by 20+ landings by someone else during this run (bldqueue, nations20 22 nations, dozerbuild, rangemirror, battlerules2, weathergfx, pacecap, squads, destruction, polishspeed/looks): not by this conductor; onegame (removes Conquest + campaign) not yet landed.
