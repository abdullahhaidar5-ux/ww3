# Godot Battle — AI vs AI and online checks (orch/godot-battle, 2026-11-21)

Headless: `godot --headless --path godot res://scenes/battle.tscn -- --battle-ai --fac=A --vs=B --seed=N --minutes=40`
(Normal AI both sides, map Split Ridge, seat 0 = west base). Every game reached a result.

| Seat 0 | Seat 1 | seed 1 | seed 2 |
|---|---|---|---|
| IR | US | US 8.2 min | US 16.6 min |
| US | IR | US 32.0 min | US 17.1 min |
| RS | IL | IL 18.0 min | IL 15.8 min |
| IL | RS | RS 11.0 min | RS 15.4 min |
| IR | IL | IL 12.3 min | IL 19.6 min |
| RS | US | RS 14.4 min | RS 26.3 min |

Wins: **IR 0/6**, RS 4/6, US 4/6, IL 4/6. Seat 1 (east) won 8/12. → The GDScript sim port does not yet keep the
nations equal the way the browser game's tourney does: Iran's AI loses every game. Owner of the fix: orch/godot-sim
(rules/AI port); the Battle scene only drives it.

Scripted human player (`--demo`: builds power, barracks, trains, attack-moves — all through the same `cmd()` door as
mouse and keyboard) vs Easy AI: wins in 6.5–8 min (IR vs US, single player).

## Online (lockstep relay from orch/godot-net, local relay `server-godot/local-server.mjs`)
Two headless Godot clients, each a scripted player, same game code, leader starts when both picked a nation:
- IR vs IR, 4 game-minutes: 240 / 240 state hashes identical.
- RS vs IL, 3 game-minutes: 180 / 180 state hashes identical.
Same binary on both sides; web vs Windows float agreement is not proven yet (the sim uses floats).
