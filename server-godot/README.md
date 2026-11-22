# World War 3 — Godot edition: lockstep relay

The multiplayer server for the Godot rebuild (IR, RS, US, IL; up to 8 players). It is **not** the browser game's
server (`server/`, Worker `ww3-servers`) and nothing here touches the live game.

- **Lockstep relay, host-free:** players send only orders. A Cloudflare Durable Object per game owns the clock: every
  100 ms it closes one turn (3 ticks at 30 Hz), stamps every order it received with that turn and sends the turn to all
  players. Nobody hosts, so one player's bad connection or PC never ends the game for the others.
- **Lobby:** create (`/new`) or join by 6-letter code, `/list` open games, `/quick` = the one "Play online" button
  (an open lobby with room, else a new one). Leader picks the map, players pick nation/team, leader starts.
- **Desync detection:** every player sends a hash of the whole sim state once a game-second; the relay compares them,
  reports `D` to everyone and repairs the odd one out from a healthy player's snapshot.
- **Reconnection:** same token = same slot. A blip catches up from the relay's order log; a crashed/restarted game gets a
  snapshot from another player (or replays the battle from the seed). The battle never pauses for a dropped player.
- **Works for both builds:** Godot's `WebSocketPeer` is a browser WebSocket in the Web export and a native socket in the
  Windows .exe; same JSON protocol (`PROTOCOL.md`).

| File | |
|---|---|
| `src/relay-core.js` | All room logic (lobby, clock, lag rule, hashes, catch-up, snapshots). No Cloudflare APIs. |
| `src/index.js` | Worker routes + `GodotRoom` (one per game code) + `GodotLobby` (open-games list) Durable Objects. |
| `local-server.mjs` | Same relay-core on Node + `ws` (tests, LAN): `node local-server.mjs --port 8788`. |
| `test/soak.mjs` | Soak test: JS + headless Godot clients, random orders, blips, crashes, (optional) corruption. |
| `test/client.mjs`, `test/sim.mjs` | JavaScript reference client and the toy sim (bit-identical to `godot/net/test/toy_sim.gd`). |
| `PROTOCOL.md` | Wire protocol. |

## Test it

```
cd server-godot && npm install
export GODOT=/path/to/Godot_v4.4.1-stable_linux.x86_64          # headless Godot 4.4+ (or pass --godot-bin)
node test/soak.mjs --clients 2 --godot 2 --minutes 10 --turnms 10            # 10 game-minutes in ~1 real minute, Node relay
npx wrangler dev --var TEST_SPEED:1 --port 8787 &                             # the real Worker + Durable Objects (workerd)
node test/soak.mjs --relay http://127.0.0.1:8787 --clients 2 --godot 2 --minutes 10 --turnms 100   # real time, 10 min
node test/soak.mjs --scenario desync --clients 3 --godot 2 --minutes 2 --turnms 10                # corruption is caught + repaired
node test/soak.mjs --clients 3 --godot 1 --minutes 3 --turnms 10 --nosnap-rejoin                  # rejoin by full replay
```
`NETSOAK PASS` = every client reported the same state hash on every checked turn (≥ 90 % of turns compared), no client
failed, and (desync scenario) every corruption was reported and repaired. `--report file.json` writes the summary.

## Deploying (ORCH, once Abdullah says the Godot game is ready for friends)

Nothing is deployed yet. It's a new, separate Worker, so the browser game's servers and site are unaffected.

1. Cloudflare dashboard → Workers & Pages → Create → Import a repository → `abdullahhaidar5-ux/ww3`.
   Project name **`ww3-godot-relay`** (must match `wrangler.toml`), Build command empty, Deploy command
   `npx wrangler deploy`, Advanced → Path/Root directory **`server-godot`**. Builds for non-production branches: off.
2. Production branch: **`godot-relay-live`** (create it from the commit to ship: `git push origin <sha>:refs/heads/godot-relay-live`).
   Never point it at `main` or `servers-live`.
3. Do **not** set `TEST_SPEED`. Optionally set `ALLOWED_ORIGINS` for extra web origins (itch.io, Pages, workers.dev and
   localhost are already allowed; the Windows build sends no Origin and is always allowed).
4. Check `https://ww3-godot-relay.abdullah-haidar5.workers.dev/health` → `{"ok":true,"proto":1}`, then run the soak test
   against it (`--relay https://ww3-godot-relay.abdullah-haidar5.workers.dev --turnms 100 --minutes 2`; `turnms` is ignored there).
5. Put that URL in the Godot game's relay constant (see `godot/net/README.md`).
6. Later updates: fast-forward `godot-relay-live` to a newer commit whose soak test passed. Deploying restarts running
   rooms (battles in progress end), so deploy when nobody is playing. Changing the protocol: bump `PROTO` in both
   `src/relay-core.js` and `godot/net/lockstep_net.gd` (old clients get "Update the game").

## Cost on the Workers Free plan

A room's Durable Object stays awake while players are connected (ordinary sockets, ~10 Hz clock): about 128 MB × the
battle's length. The free 13,000 GB-s/day ≈ **28 room-hours a day**. Each player sends ~1 hash/s + their orders
(~1–3/s), and incoming WebSocket messages bill at 20 per request: an 8-player battle ≈ 1–2 requests/s ≈ **15–30
battle-hours a day** within the free 100,000 requests. Plenty for a group of friends; there is no daily guard yet (the
browser game's `server/` has one — port its `Budget` object if usage grows).
