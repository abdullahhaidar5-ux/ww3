# Mountain Fortress + Bunker Buster
- Mountain Fortress (KP, IR, RS, DW only, limit 1): $2600, 30 s build, needs a War Factory. Price = War Factory $1200 + Tunnel $600 + ~$800 for being untouchable and a 24-unit garrison (tunnel holds 12; the fortress adds 12 more). Works as a tunnel exit; units inside already heal.
- It takes 0 damage from everything (guns, artillery, air, powers, superweapons) except the Bunker Buster. No other state added: it is a normal building of kind "fort", so snapshots/checkpoints carry it.
- Bunker Buster (all 18 nations, general power: 1 point to unlock, no levels): $2200 per use, 420 s cooldown, locked until 5:00. Two guided bombs 1.2 s apart, 70 radius, 1500 damage each to other buildings.
- Each bomb takes 55% of a fortress, so the pair kills it: $2200 answers a $2600 building, but a single bomb or a one-off power cannot (2 hits chosen so a lone bomb can't snipe it and the defender has the seconds to react).
- AI (Normal/Hard) unlocks the Bunker Buster once an enemy has a fortress, fires it at a fortress it can see, and builds its own fortress mid build order if its nation has one.
- Checks added to orch/ewtest.mjs: immunity, limit 1, enter/exit, cost/cooldown/5-min lock, destruction, checkpoint.
