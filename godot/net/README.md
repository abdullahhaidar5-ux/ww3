# godot/net — multiplayer for the Godot edition (owner: netcode helper, branch `orch/godot-net`)

Deterministic **command lockstep**: players send only orders; every machine runs the same integer simulation on the
same orders at the same tick; a Cloudflare relay (`server-godot/`) owns the clock and the order of orders. No player
hosts, so nobody's PC or connection is special and a player dropping never ends the battle.

| File | What |
|---|---|
| `lockstep_net.gd` | The client node. Lobby, orders, 30 Hz ticks, hashes, reconnect, snapshots. |
| `det.gd` | Deterministic helpers: `Rng` (xorshift32), 16.16 fixed point, `isqrt`, `sin_a/cos_a/atan2_a` (4096 = full turn), FNV-1a hash. |
| `test/toy_sim.gd`, `test/soak_client.gd` | The headless soak-test client (run by `server-godot/test/soak.mjs`). |

## Using it from the battle (core battle helper)

```gdscript
const Net = preload("res://net/lockstep_net.gd")
const RELAY := "https://ww3-godot-relay.abdullah-haidar5.workers.dev"   # after ORCH deploys it (see server-godot/README.md)

var net := Net.new()
add_child(net)
net.state_hash = battle.hash_state       # func() -> int     hash of ALL sim state (det.gd fnv over every int)
net.snapshot = battle.save_state         # func() -> PackedByteArray  (var_to_bytes of the sim state is fine)
net.restore = battle.load_state          # func(PackedByteArray) -> void
net.battle_started.connect(func(info): battle.setup(info.seed, info.players, info.cfg, info.you))
net.tick.connect(func(t, orders): battle.step(orders))   # orders: [{"s": slot, "q": seq, "o": {...}}]
net.quick_play(RELAY, player_name)       # the one "Play online" button; or net.create(...) / net.join(RELAY, code, name)
# lobby: net.lobby_changed -> show players; net.set_pick({"nation": "IR", "team": 1}); leader: net.set_config({"map": "..."}), net.start_battle()
# in battle, on a right-click:  net.send_order({"k": "mv", "u": [12, 13], "x": 4096, "y": 2048})
```

Signals: `joined(you, code)`, `lobby_changed(lobby)`, `chat(slot, text)`, `battle_started(info)`, `tick(t, orders)`,
`roster_changed(players)`, `desync(turn, hashes, bad)`, `resynced(turn)`, `connection_lost()`, `reconnected()`,
`failed(reason)`, `ended(reason)`. Useful state: `you`, `code`, `phase`, `turn`, `t`, `buffered_ticks()`, `token`.

**Single-player / Test range:** don't add `net` at all; call `battle.step(orders)` yourself from a 30 Hz accumulator
with your own orders. Same sim code, so skirmish and online behave the same.

## Rules the simulation must follow (or players desync)

1. Step the sim **only** in `tick`. `_process`/`_physics_process` only draw and interpolate.
2. **Integers only** in sim state and math (`det.gd`: fixed point, `isqrt`, trig tables). No `float`, `randf()`, `randi()`,
   `Time`, `OS`, physics engine results, navigation server paths, or `Vector2/3` (they are floats) in anything that
   decides gameplay. Floats are fine for visuals.
3. One `det.gd` `Rng` seeded with `info.seed` for all gameplay randomness. Visual randomness uses a separate RNG.
4. Iterate in a fixed order: arrays, or dictionaries whose insertion order is the same everywhere (built from sim
   events). Never iterate scene-tree children or physics query results for gameplay decisions.
5. Apply a turn's orders in the given order, at the start of the tick, before the rest of the step. Validate every
   order (owner, unit alive, ranges) — a bad order is ignored identically on every machine.
6. Orders are dictionaries of ints/strings/arrays (no floats; `send_order` warns). Keep them small (≤ 1 KB, ≤ 16 a turn).
7. `{"sys": "left"|"back", "s": slot}` orders (slot `-1`) say a player dropped/returned: e.g. let the AI hold their army.
8. `state_hash` covers the whole sim state, so a desync is caught within a game-second. `snapshot`/`restore` must round-trip
   exactly (`restore(snapshot())` → same hash).

Input latency is about 150–300 ms (one turn + network), like Generals online. Show the click feedback at once locally.

## Test

`cd server-godot && npm install && GODOT=/path/to/godot node test/soak.mjs --clients 2 --godot 2 --minutes 10 --turnms 10`
→ prints `NETSOAK PASS` when every JavaScript and Godot client reported the same state hash for every checked turn.
See `server-godot/README.md`.
