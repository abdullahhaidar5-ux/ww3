# Stage 2, step 1: can the battle run on a server?

**Short answer: yes.** The battle simulation already runs in plain Node with no browser, no 3D engine and no changes to
the game's code. Played side by side from the same seed, Node and the real game in Chromium produce exactly the same
battle, checked every few game-seconds down to the last bit of every unit's position. An 8-player battle at its busiest
used about a third of one CPU core on this machine, so a PC dedicated server has plenty of headroom. Cloudflare's free
plan can host about 45 thirty-minute battles a day under the existing 80% guard (57 at the hard limit). What limits it
is how long the server is awake, not the size of the battle.

What was built (branch `orch/stage2-headless`):

- `orch/headless.mjs` plays an AI battle in Node and prints a state hash ("fingerprint") every N game-seconds.
- `node orch/headless.mjs --compare` plays the same battle in headless Chromium on the real `index.html` and checks
  that every fingerprint matches. It prints `HEADLESS PASS` or `HEADLESS FAIL`.
- `--compare --render` does the same with the page also building the 3D world, running every visual and sound effect
  and drawing frames between steps. This shows that nothing on the drawing side changes the battle.
- `--bench` measures the cost (2, 4 and 8 players; early, mid and late game).
- `src/` is untouched. Everything headless is handled by small stand-ins inside the runner.

## Plain-words summary for Abdullah

- The part of the game that decides what happens in a battle (movement, shooting, AI, economy) is already cleanly
  separate from the graphics. A server can run it as it is.
- Node and Chrome gave the same battle, move for move. One surprise: different browser versions round some math
  (sine, cosine, angles, powers) differently in the very last decimal place. That doesn't matter when one machine (the
  host today, the server tomorrow) decides everything, which is how the game works. To make the test exact anyway,
  the test gives both sides the same math routines.
- Cost: a big 8-player fight takes roughly a quarter to a third of one CPU core on this machine. A home PC can run
  several such battles at once.
- Cloudflare free plan: about **45 thirty-minute battles a day** under the current 80% safety guard (57 at the
  hard limit), whatever the number of players. A PC dedicated server has no daily limit.

## 1. What in the battle code touches the browser, and how each is handled

Method: an identifier scan (acorn) of `01-data.js`, `02-map.js` and `03-sim.js` lists every name they use that is
declared in another module or is a browser global. Each one was then read by hand. The game is one classic script,
so all modules share one global scope.

### Browser globals

| Where | What | Used for | Headless handling |
|---|---|---|---|
| `01-data` top | `localStorage` (`SET`, `saveSet`) | player settings (graphics, volume…) | in-memory stub; both calls are already in `try`. The battle never reads `SET`. |
| `01-data` | `$ = id => document.getElementById(id)` | defined only | not called by sim code |
| `01-data` | `rnd()` → `Math.random` | battle randomness (52 call sites in `03-sim` + 27 direct `Math.random`) | seeded generator swapped in while the sim runs (see §3) |
| `02-map` `terrTexMax` | `SET`, `matchMedia`, `R3` | size of the *painted* ground texture only | stubs; with `TERR_DEFER` the sim path never paints |
| `02-map` `terrPaint` | `document.createElement('canvas')`, 2D context, `mm.width/height` | drawing the ground picture; with `draw=false` only a blank minimap thumbnail | fake canvas + no-op 2D context; `mm` stub. The planning pass (roads, trees and cover, ground heights) is pure and is what `newGame` runs behind the loading screen anyway (`TERR_DEFER=true`) |
| `02-map` `terrPaint` (draw only) | `Math.random` pixel noise | texture grain | not reached headless |
| `03-sim` `newGame` | `new THREE.Color(hex)` | keeps team colours distinguishable (sets `T.color`) | 1-line stand-in: `'#rrggbb'` → r,g,b / 255 (exactly what r128 does; team colour is in the hash and matches) |
| `03-sim` `ffGet`, `navTo` | `performance.now()` | 4 ms per tick time budget for route searches | real clock on a server; **frozen** inside the sim for reproducible runs and the comparison (same trick as `tourney.mjs`) |

### Functions the sim borrows from rendering/UI modules

All of them are pure. The runner copies them verbatim from `src/` with a small lexer-aware extractor, so the server
runs exactly the browser's code.

| Module | Function | Why the sim needs it |
|---|---|---|
| `04-gfx` | `groundH`, `groundH0`, `buildHGrid` | ground height: slopes slow units, rough ground blocks building placement; the height grid is built in `terrPaint` |
| `05-fx3d` | `FXE` | effect/event queue: in host mode it fills `G.out` (sent to clients); handlers run only when `FXH` has one and `!G.headless`. Headless `FXH = {}` |
| `08-ui` | `log` | player messages → `FXE('log', …)` |
| `08-ui` | `endGame` → `showEnd` | battle over. Stub keeps the sim-relevant part: `G.over = true` and the host's `['end', winner]` event |

Nothing in 01–03 reads UI or render state (`G.sel`, `G.place`, `G.alpha`, `e.ox/oy`, `e.vis` are written by the sim or
the view and never read back by the battle). The sim *writes* a few render hints (`G.civDirty`, `G.terrain`/`G.thumb` in
the paint pass, `e.vis`/`e.hid` for the local player `ME`). They are harmless on a server. `ME` also gates a few
"warn the local player" messages (`T.routWarn`), and those don't affect the battle.

Top-level load-time code in 01–03 needs no DOM beyond the `localStorage` read above.

### Verified by experiment

`--compare --render` runs the full browser path: `afterStart()` (terrain picture, 3D world, shaders, first frame),
all effect handlers live (`G.headless = false`; their `Math.random` is the page's own, not the battle's) and
`renderFrame()` every game-second. The hashes still match Node, which has no graphics at all.

## 2. Server vs browser split (proposal for steps 2–4)

| Runs on the server (authoritative) | Stays in the browser |
|---|---|
| `01-data` (whole; `SET` unused) | `04-gfx`, `05-fx3d` effect handlers (`FXH`), `06-view`, `10-post`, `11-models` |
| `02-map` (map gen, pathfinding, `terrPaint` plan-only) | `09-audio` |
| `03-sim` (whole; command entry point is `act(team, a)`) | `08-ui` (menus, input, HUD, main loop) |
| borrowed: `groundH*`, `buildHGrid`, `FXE` (queue part), `log`, `endGame` core | `07-net` client side: `applySnap`, `clientTick`, `applyEvents`, `applyTeam`, lobby UI |
| `07-net` host side: `doAct`/`cleanCmd` (validate → `act`), snapshot building (`encEnt`, `sendSnapP`, `forPlayer`, `snapOut`, `sendChunks`, `snapDrops`, `verItems`, `dhSet`, `teamGlobals`, `teamMsg`, `visGrid`/`visAt`, `evWho`/`dieWho`/`civWho`), `netTick0` | |
| `07b-ckpt` `ckEncode`/`ckDecode`/`ckRestore` (server restart / handing a battle back to a browser host) | |

The host-side netcode is already DOM-free except for a few names, checked with the same scan:

- `sendSnapP` references `cv`.
- `netTick` checks `window.WW3_P2P`.
- `ckPack` uses `Blob`.

It talks to players through `NET.game.emit(...)`, a "room" object. On a server that object would be a WebSocket room
(Durable Object) or a Node `ws` server. The client code wouldn't change: to it, the server is just a host that never
leaves.

**Recommended small `src/` refactor for step 2.** It is behaviour-preserving and not done here, because it touches
other squads' files.

1. Move `groundH`, `groundH0` and `buildHGrid` from `04-gfx` into `02-map`.
2. Move the queue half of `FXE`, `log` and the core of `endGame` into `03-sim`.
3. Replace `THREE.Color` in `newGame` with a hex parser.
4. Guard the thumbnail canvas in `terrPaint` (`typeof document`).

After that, the server bundle is exactly `01 + 02 + 03`, plus a DOM-free slice of `07-net` (best as its own module,
e.g. `07a-hostsnap.js`). `orch/headless.mjs` already produces that bundle (`simSource()`), so step 2 can start from it.

## 3. Determinism: what had to be controlled for the hashes to match

1. **`Math.random` in the battle.** 27 direct calls plus the 52 `rnd()` calls, for production building choice,
   jitter, AI choices and weather. The seeded `srand` is used only for map generation. The runner swaps a seeded
   generator into `Math.random` while the sim runs and restores the page's own afterwards, so effects and rendering
   never consume battle random numbers.
2. **The pathfinding time budget** (`performance.now()`, `PF_MS = 4`). It makes route searches depend on CPU speed.
   It is frozen inside the sim for the comparison.
3. **Math differs between JS engines, in the last bit.** Measured on 20,000 random inputs each:
   - Node 22.23 (V8 12.4) and Chromium 153 (V8 15.3) disagree on 3–18% of results for `sin`, `cos`, `tan`, `atan`,
     `atan2`, `exp`, `log`, `pow` and `x**3`.
   - They agree on `hypot`, `sqrt`, `x**2` and `x**0.5`.
   - Node 22 still uses fdlibm. Current Chromium uses a different libm.

   With each engine's own math, the battle diverges at once: the supply-field layout at t=0 differs, and unit
   positions differ by one ulp at 20 s and then snowball. The runner therefore swaps a plain-JS fdlibm port in for
   `sin`, `cos`, `atan2`, `exp` and `pow` inside the sim on both sides. Every `**` in the sim is `**2`, which is exact.
   - Checked against Node's native results over 1,000,000 inputs each: `sin`, `cos`, `atan` and `atan2` are bit-identical, and `exp` is bit-identical in this test.
   - `pow` is within 1 ulp of Node's.
   - `--compare --native-math` reproduces the divergence.

**What this means for the game:**

- Host-authoritative play (today) and server-authoritative play (Stage 2) are unaffected, because one machine decides
  and everyone else shows its snapshots.
- It rules out lockstep multiplayer or replays from seed + commands across different browsers, unless the sim uses
  portable math and a seeded generator in `src/`. Not needed for Stage 2.
- **Recommendation for step 2 (optional, small):** route the sim's randomness through `G.rng` (seeded per battle),
  so a server battle can be replayed from seed + command log for debugging and crash recovery.
- A server and a browser host would never need to agree bit for bit. Handing a battle over (host migration, server
  restart) goes through checkpoints (`07b-ckpt`), not replay.

## 4. Comparison results

`node orch/headless.mjs --compare` (default: 2 players US vs RU, Desert Strait, seed 1, 5 game-minutes, hash every
10 s). Runs on this machine, 2026-10-27:

| Run | Result |
|---|---|
| `--compare` (default: 2 players, Desert Strait, seed 1, 5 min, every 10 s) | **HEADLESS PASS**, 31/31 hashes identical (map plan + battle) |
| `--compare --players 8 --map fulda --seed 3 --minutes 12 --every 60` (Normal AI, 4 nations eliminated along the way) | **HEADLESS PASS**, 13/13 identical, 166 entities at the end |
| `--compare --render --map oasis --seed 5 --minutes 2 --every 30 --render-every 10` (3D world built with the real models, all effects on, frames drawn; screenshot `orch/out/headless-render.png`) | **HEADLESS PASS**, 5/5 identical. An earlier run drawing a frame *every* game-second also matched all 6 hashes up to 150 s; it was stopped there because SwiftShader drawing was holding the shared browser lock for too long |
| `--compare --native-math` (each engine's own `Math.sin/cos/atan2/exp/pow`) | **HEADLESS FAIL** as expected: the map plan differs at t=0 (supply fields), and unit positions differ in the last digit at t=20 s, e.g. a supply truck at x = 792.5361476389876 (Node) vs …877 (Chromium) |

Sim speed seen in the same runs (Node: process CPU time; page: wall-clock time of the sim steps):

- **2 players:** Node 42 ms per game-second, Chromium 16 ms.
- **8 players, Fulda:** Node 171 ms, Chromium 133 ms.

The newer V8 in Chromium 153 is faster, especially on small battles. Cloudflare's runtime (workerd) tracks Chrome's V8,
so a Durable Object should land nearer the Chromium figures. A PC server should use a current Node LTS for the same
reason. The Node 22 figures in §5 are therefore on the pessimistic side.

## 5. Measured cost (Node 22, Intel Xeon @ 2.10 GHz, shared 2-core VM)

`node orch/headless.mjs --bench --seeds 1,2 --map strait|fulda`. Costs are CPU time of the whole Node process,
including the garbage collector's threads, per **game-second**. The sim steps at 60 Hz, so 1 game-second = 60
`simUpdate` calls. The AI is Normal. The pathfinding clock is frozen, which gives no 4 ms cap on route searches per
tick, so this is an upper bound for that part. The machine was shared with other agents' browser tests during the
runs, so expect ±20% noise.

| Battle (map, seed) | early 0–3 min | mid 8–11 min | late 18–21 min | busiest minute | peak entities | JS heap (whole process) |
|---|---|---|---|---|---|---|
| 2 players, Desert Strait, 1 | 34 ms (45 ent.) | 55 ms (83) | ended 8.8 min | 55 ms | 83 | 11 MB |
| 2 players, Desert Strait, 2 | 26 ms (54) | ended 8.0 min | – | 62 ms | 65 | 11 MB |
| 2 players, Fulda Gap, 1 | 35 ms (47) | 57 ms (65) | ended 9.3 min | 61 ms | 83 | 11 MB |
| 2 players, Fulda Gap, 2 | 26 ms (42) | 44 ms (57) | ended 10.2 min | 44 ms | 65 | 12 MB |
| 4 players, Desert Strait, 1 | 56 ms (93) | 88 ms (111) | ended 15.7 min | 151 ms | 153 | 12 MB |
| 4 players, Desert Strait, 2 | 32 ms (70) | 81 ms (98) | ended 16.3 min | 102 ms | 129 | 11 MB |
| 4 players, Fulda Gap, 1 | 37 ms (80) | 111 ms (123) | ended 10.4 min | 129 ms | 150 | 13 MB |
| 4 players, Fulda Gap, 2 | 28 ms (75) | 62 ms (77) | ended 9.1 min | 65 ms | 87 | 13 MB |
| 8 players, Desert Strait, 1 | 76 ms (161) | 282 ms (251) | 152 ms (126) | 300 ms | 266 | 13 MB |
| 8 players, Desert Strait, 2 | 79 ms (155) | 230 ms (228) | ended 16.2 min | 294 ms | 247 | 13 MB |
| 8 players, Fulda Gap, 1 | 83 ms (176) | 230 ms (224) | ended 17.5 min | 271 ms | 266 | 13 MB |
| 8 players, Fulda Gap, 2 | 92 ms (186) | 295 ms (259) | ended 17.7 min | **356 ms** | 317 | 13 MB |
| 8 players, Desert Strait, 1, Easy AI | 94 ms (131) | 245 ms (244) | ended 16.9 min | 263 ms | 256 | 12 MB |
| 8 players, Desert Strait, 2, Easy AI | 75 ms (129) | 188 ms (219) | ended 16.1 min | 241 ms | 245 | 11 MB |

Other figures from the same runs:

- A bare Node process running the script used 6.4 MB of JS heap before any battle.
- Battle setup (`newGame`: map generation and terrain plan) took 1.2–4.6 s of wall-clock time on the busy machine,
  about 2–2.5 s for 8 players.
- A CPU profile of a 4-player battle splits the time like this:
  - unit updates (movement, targeting, morale) ~42%, of which route following (`navTo`) is ~16%
  - `simUpdate`'s own loops (auras, healing, cleanup) ~21%
  - unit separation (`separate`) ~15%
  - garbage collection ~6%
  - vision ~3%
  - AI thinking ~2%
  - route searches (`findPath`) only ~1%
- Speed check: the same 8-player Fulda battle cost Node ~130 ms of CPU per game-second over its first 3 minutes.
  Chromium 153 took 66–119 ms of wall-clock time for the same minutes. The newer V8 is somewhat faster, but they are
  in the same range. Wrapping the sim in one function (as the runner does) costs nothing measurable compared with
  loading it as a classic global script (130 vs 135 ms).
- **Scaling is worse than linear in entities.** About 0.6 ms per entity per game-second at ~80 entities, ~1.1 ms at
  ~250.

Extrapolating to "massive columns" (1,000+ entities) is uncertain. It would likely need 1.5–3 s of CPU per
game-second, beyond one core at real time. Bigger battles need sim optimisation (separation, unit updates)
whichever machine runs them.

How to read it:

- The early/mid/late windows are game-minutes 0–3, 8–11 and 18–21.
- "Ended" means one side had already won. AI-vs-AI battles on Normal often end before 20 minutes.
- Cost tracks the number of live entities (units + buildings), so the busiest minute matters more than the clock.
- The heap figure is the whole Node process (runtime + game code + battle state) after a forced GC.

### What it implies

**PC dedicated server (Node).**

- At the busiest minute measured, an 8-player battle needs about a third of one core on this 2.1 GHz Xeon. A typical
  desktop core is faster.
- One PC can host several large battles at once, or one battle with many times today's unit counts (the "massive
  columns" goal).
- Memory is tiny (tens of MB).
- Map generation for 8 players takes about 4 s of CPU at battle start. That is a one-off and can hide behind the
  existing loading screen.

**Cloudflare Durable Object (free plan: 100,000 requests and 13,000 GB-s a day; duration billed as 128 MB × awake
wall-clock time, whatever the CPU use).**

- A server-run battle keeps its Durable Object awake for the whole match. A 30-minute match costs 1,800 s × 0.125 GB =
  **225 GB-s, independent of player count and CPU load**. That is 57 matches/day at 100%, or **~46/day under the 80%
  guard**, shared with the relay rooms' own usage. Shorter matches cost proportionally less.
- **Requests stay small if the loop is driven from inside the object** (a `setTimeout`/`setInterval` loop while
  players are connected) and not by alarms.
  - Per match: 1 per connection, plus incoming player messages / 20. About 7 players × ~60 frames/min × 30 min / 20 ≈
    630, so roughly 650 requests a match.
  - A per-tick alarm at 10–60 Hz would cost 18,000–108,000 requests per match and blow the daily allowance with one
    battle. **Avoid per-tick alarms.** Use at most one watchdog alarm per 30–60 s to restart the loop if the object was
    evicted.
  - Outgoing messages (snapshots to players) are free.
- **CPU.** DO invocations get 30 s of CPU, and each incoming WebSocket message resets it. Players send presence
  frames about every second, so ~0.3 s of CPU per wall-second fits.
  - **Uncertain:** whether Cloudflare will tolerate an object that is CPU-busy ~30% of the time continuously. The
    docs only warn that >30 s of CPU between incoming requests raises eviction risk.
  - Snapshot encoding (today done by the host's browser) comes on top. It was not measured here. Estimate +10–30%.
  - The free-plan Workers limit of 10 ms CPU per request is documented for HTTP requests and Cron Triggers. The docs
    don't say whether it applies to Durable Objects, and the DO page states 30 s. **Must be measured on the real
    deployment before promising "Host on Cloudflare".**
- **Memory.** The limit is 128 MB per isolate. The battle state measured here is small (well under the limit even for
  8 players).
  - **Uncertain:** whether several battle objects of the same class can share one isolate (and its 128 MB). The docs
    don't say. Keep one battle per object and measure on deploy.
- **Sizing suggestion for step 3.** Offer "Host on Cloudflare" for up to 8 players. Cap matches per day from the
  budget (the existing `Budget` object already tracks GB-s): ~40 matches/day leaves room for relay rooms. Fall back to
  "Host in my browser" when the budget is near the guard. Measure real DO CPU per tick with `wrangler dev` plus a
  deployed test before opening it to everyone.

## 6. Anything that blocks Stage 2?

Nothing blocks it. Things to handle in steps 2–4:

1. **Host-side netcode needs a DOM-free slice.** `07-net` mixes lobby UI with snapshot building. The snapshot
   functions themselves are pure (see §2) and talk to a "room" object, which suits a server well.
2. **The four borrowed helpers and the `THREE.Color` call** should move into the sim modules (§2), so the server
   bundle is exactly `01–03` and can't drift from the browser.
3. **The pathfinding time budget uses wall-clock time.** On a busy server, CPU contention means fewer route searches
   per tick. That slightly changes behaviour but keeps the tick time bounded, which is the point. Optional: switch
   the budget to a deterministic count of searched cells.
4. **The sim runs at 60 Hz.** A Durable Object could run it at 30 Hz to halve CPU. The code is dt-based, but the
   battle wouldn't be identical to 60 Hz and would need its own balance/feel check. Not recommended until measured.
5. **Uncertainties to measure on Cloudflare:** CPU tolerance for a continuously busy object, isolate sharing,
   snapshot-encoding cost.

## 7. Step 2b: the host netcode slice (`src/07a-hostsnap.js`, 2026-10-27)

**Done.** Everything the host sends to players now lives in its own module, `src/07a-hostsnap.js`, moved out of
`07-net` unchanged: the shared `NET` state and `FLG`/`NET_PV`, order checking (`CMD_T`, `cleanCmd`), reconnects
(`hostRejoin`, `discTick`, `playerLeft`), snapshots (`encEnt`, `sendSnap`, `verItems`, `sendSnapP`, `forPlayer`,
`snapOut`, `sendChunks`, `snapDrops`, `dhSet`), team panels (`teamGlobals`, `teamMsg`), per-player event streams
(`VG`, `visGrid`, `visAt`, `evWho`, `skNote`, `dieWho`, `civWho`, `sendEvtP2P`) and the send loop (`netTick`,
`netTick0`). `07-net` keeps the lobby, joining, the client side and `wireHost`. `build.py` picks the file up by name
order (07-net, 07a, 07b), and its `--split` list has the new boundary.

The three browser ties are gone:

- `sendSnapP`'s `cv` was a local loop variable that happened to share the 3D canvas's name. It is renamed `ov`.
- `window.WW3_P2P` (8 places) is now `hostP2P()`. That uses `NET.p2p` when it is set (a server sets it to true) and
  otherwise the page's `window.WW3_P2P`, exactly as before.
- `ckPack` already worked in Node (Node and Workers have `Blob`, `CompressionStream`, `Response` and `btoa`). It now also
  falls back to plain JSON if `Blob` is missing.

One unreachable line (a `pushLog` after a `return` in `playerLeft`) was dropped. Nothing players get changed: the
messages, their timing and `NET_PV` are the same.

**Proof:** `node orch/headless.mjs --hostsnap` loads `01 + 02 + 03 + 07a + 07b` verbatim in plain Node with **no
`window`**, hosts N-1 connected players (their sides are played by the AI, hidden from the netcode so it treats them as
humans), and records everything sent. It checks that every player gets snapshots, events and team panels, that every
row is well formed, and that the standby player receives checkpoints. It also scans 07a/07b for DOM, canvas,
Three.js or UI names. `--hostsnap --compare` runs the same host in the real `index.html` in Chromium and requires the
same battle state and **identical messages** (hash of every message, checkpoint gzip bytes aside) at each interval.
`--room` tests the claude.ai-artifact broadcast style.

Result 2026-10-27: `--hostsnap --compare --players 4 --minutes 2 --every 20` → **HOSTSNAP PASS**, state and all
4,265 messages identical between Node and Chromium at all 6 checks. Measured (Node 22, 8 players, Fulda, 5 game-min): 24,800 messages, ~59 KB/s in total to 7 players. The host netcode
cost ~14 ms per game-second, on top of ~130 ms for the battle.

**What remains for the dedicated server (step 3, not started):**

1. A Node entry point (`server/` or `tools/`) that concatenates `01+02+03+07a+07b` (as `simSource({host:true})` does)
   and runs the loop: `simUpdate(1/60)` at 60 Hz plus `netTick(dt)`, `MODE='host'`, no host player of its own
   (`ME` = a spectator slot or -1; check `netTick0`'s `k!==ME` and `teamMsg`), and `NET.p2p = true`.
2. A room adapter for `NET.game`: `emit(topic, data)` → send to the player named by `data.to` (or everyone), plus
   `buffered(to)`. Incoming player presence (`hi`, `cq` orders, `pg` pings, `kr` keyframe requests) has to be fed the
   way `wireHost`'s `onPeers` handler does. That handler lives in `07-net` and also drives the lobby UI, so split its
   battle half (`hostCmd`, order queue de-duplication, pong, keyframe reset) into 07a next.
3. Lobby/start: the server must send `start` (`pv`, `seed`, `facs`, `slot`, `map`, `tm`, `w`) to each player, as
   `launchMP` does, and accept players over the existing relay (WebSocket room) path.
4. Battle randomness still uses the global `Math.random`. That's fine on a server that runs one battle per process.
   Several battles in one isolate need `G.rng` (§3).
5. Checkpoints: on a server, `ckEncode` → disk/Durable Object storage gives restart recovery. The standby-player
   hand-off still works as a fallback.

## How to run

```
node orch/headless.mjs                                   # 2 players, 5 game-min, hash every 10 s
node orch/headless.mjs --players 8 --map fulda --minutes 20 --every 60 --seed 3
node orch/headless.mjs --compare                         # HEADLESS PASS / HEADLESS FAIL (takes the browser lock)
node orch/headless.mjs --compare --render                # with 3D world, effects and drawing in the page
node orch/headless.mjs --compare --native-math           # shows the cross-engine math divergence
node orch/headless.mjs --bench --seeds 1,2 --map strait  # cost table -> orch/out/headless-bench-*.json
node orch/headless.mjs --hostsnap --players 8           # server bundle hosts 7 players in Node -> HOSTSNAP PASS
node orch/headless.mjs --hostsnap --compare             # ...and the browser host must send identical messages
```
