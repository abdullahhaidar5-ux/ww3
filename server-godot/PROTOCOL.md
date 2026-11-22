# Godot edition — lockstep wire protocol (v1)

One WebSocket per player: `wss://<relay>/room/<code>?v=1&name=<url-encoded>&tok=<token>&have=<turn>&snap=<0|1>`.
Every frame is a JSON text frame `{"t": <type>, ...}`. Numbers are integers (hashes travel as decimal strings).

- `code`: 4–8 of `a-z0-9` (the relay hands out 6-letter codes from `/new` and `/quick`).
- `tok`: the player's secret token (8–40 of `A-Za-z0-9_-`). Same token = same slot; that is how rejoin works.
  If missing/invalid the relay makes one and returns it in `W`.
- `have`: the highest turn the player already holds (contiguous). `-1` = nothing (fresh start / crashed).
- `snap=1`: this client can send and load snapshots (enables fast rejoin and desync repair).

## Time

The relay owns the clock. Every `turnMs` (100 ms) it closes one **turn** = `tpt` (3) sim ticks at `hz` (30).
Orders that reached the relay while turn `k` was open are executed by everyone at the **first tick of turn k**, in
the order the relay lists them. Clients never run a turn they have not received, so nobody can run ahead.
Global tick number `t = k * tpt + sub`.

Lag rule (Generals-style): the relay does not close turn `k` while a connected player who reported within the last
3 s is more than 30 turns (3 s) behind. A player who goes quiet (frozen tab, alt-tab) is not waited for and
fast-forwards when back.

## Client → relay

| t | fields | when |
|---|---|---|
| `p` | – | keep-alive, every 15 s of silence (relay answers `p`) |
| `pick` | `p`: object ≤ 256 B (nation, team, colour…) | lobby |
| `ready` | `r`: bool | lobby |
| `cfg` | `cfg`: object ≤ 2 KB (map…) | lobby, leader only |
| `start` | – | lobby, leader only |
| `c` | `m`: text ≤ 200 | chat |
| `o` | `s`: client seq, `o`: order object ≤ 1 KB (no `sys` key) | battle; max 16 per player per turn |
| `H` | `k`: turn, `h`: hash string (optional) | after finishing every turn with `k % hashEvery == 0` |
| `snap` | `id`, `k`, `i`, `n`, `d`: base64 part ≤ 512 KB | answer to `SR`: state after turn `k`, `n` parts |
| `bye` | – | leaving for good (the slot cannot be rejoined) |

## Relay → client

| t | fields | meaning |
|---|---|---|
| `W` | `proto, code, you, tok, phase` | welcome; `you` = slot (0–7) |
| `E` | `m` | refused (full, started, wrong version); socket closes with 4001 |
| `L` | `code, leader, cfg, players:[{s,name,pick,ready,on}], max` | lobby changed |
| `S` | `seed, hz, tpt, turnMs, hashEvery, you, cfg, players:[{s,name,pick}], now` | battle start (also re-sent on rejoin) |
| `T` | `k`, `o`: `[[slot, seq, order], ...]` (omitted when empty) | turn `k`. Slot `-1` = system order `{"sys":"left"|"back","s":slot}` |
| `C` | `from, to, o:[[k, orders]...], last, replay` | catch-up: turns `from..to`; turns not listed were empty. `replay:1` = start over from the seed |
| `R` | `players:[{s,name,on}]` | battle roster changed |
| `D` | `k, h:{slot:hash}, bad:[slots]` | desync at turn `k`; `bad` = minority (all, if no majority) |
| `SR` | `id` | please send a snapshot after your next finished turn |
| `SW` | – | stop simulating: a snapshot for you is on its way |
| `snap` | `k, i, n, d` | snapshot part (state after turn `k`); then `C` from `k+1` |
| `SX` | – | snapshot repair gave up; carry on |
| `c` | `s, m` | chat |
| `X` | `m` | battle/room ended |

## Rejoin

- **Blip** (client still has its state): reconnect with the same `tok` and `have=<last turn held>` → `W`, `S`, `C` with the
  missing turns, then live `T`. Nothing else changes; other players see `left`/`back` system orders.
- **Fresh** (game restarted, `have=-1`): if a healthy player and this client both support snapshots → `SW`, donor's
  `snap` parts, `C` from the snapshot's turn. Otherwise `C` with `replay:1` from turn 0 (the client re-runs the whole
  battle as fast as it can).
- **Desync repair**: on a `D` with a clear majority, the relay asks one majority player for a snapshot and sends it to the
  minority (at most once per 30 game-seconds). Without snapshot support the `D` is only reported.

## Limits

8 players per room; 40 messages/s per socket (burst 120); 1 MB per frame; a room with nobody connected for 2 minutes ends;
a socket silent for 45 s is dropped. The Windows build sends no `Origin` and is allowed; web pages must come from the
allow-list in `src/index.js` (+ `ALLOWED_ORIGINS`).
