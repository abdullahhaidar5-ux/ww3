# Replays + spectators (2026-11-04, orch/replay-spec)

## Replays (`src/08b-replay.js`)
- **Every battle is recorded** on the device that shows it: skirmish, hosting in this browser, online player, spectator.
- **End screen:** "▶ Watch replay" and "⬇ Save replay" (a `.ww3replay` file, a normal download; hidden in the claude.ai
  artifact edition). Main menu: "▶ Watch a replay file".
- **Viewer bar:** play/pause, 1x/2x/4x/8x, timeline (drag = jump to any moment), whose view ("Everything (no fog)" or a
  side's view with its fog), Exit. Camera is the normal free camera. The command bar is hidden; no order can leave.
- **Why not the order stream:** the live sim is only reproducible under lab conditions (orch/headless.mjs seeds
  Math.random, freezes the pathfinding clock, swaps in portable trig). In a real battle it uses the browser's own
  Math.random, a performance.now pathfinding budget, bigger steps on slow frames, and Safari/Chrome trig differ — a
  re-run would drift within seconds. So replays are **snapshots**, in the host's own snapshot format: 2 samples/game-s
  (only what changed), keyframe every 10 s, every visual effect, money/derricks/out once a second. Online players
  record exactly what they received (their own fog-of-war view); skirmish/browser host/spectator recordings show
  everything, so the viewer can switch sides or drop the fog.
- **Size:** gzip segments every 30 game-s (compressed while the battle runs). Measured: 11 KB per game-minute early,
  17 KB/min over a 6-minute 1v1; a client's own-view replay ~30 KB/min.
- **Test:** `orch/replaytest.mjs` (gate job smoke4): records a live AI battle, packs the file, opens it in the viewer,
  plays to the end at 8x → end-state hash (id/kind/side/position/health of every unit and building) equals the live
  battle; seek to the middle and play on → same hash; doAct sends nothing; view switch + fog off; file size limit.

## Spectators (`src/07a-hostsnap.js` specJoin/specPres/specEvts, `server/src/battle.js` spec, `src/07-net.js`)
- Game list: **👁 Watch** next to any battle (lobby or under way) that supports it (`g.sp`), not on password battles;
  "👁 Full" at 4. Lobby header shows "👁 N watching".
- A spectator is never in `NET.peers`: no side, orders ignored (doAct is a no-op on the page, and forged order queues
  / cmd messages are ignored by the host), never gets checkpoints → can never be the standby or next host.
- The host sends each spectator every unit of every side (no fog), every effect, and the panel of the side they follow.
  On the page: "👁 Spectating" bar with "Everything (no fog)" / each side's view, and Leave.
- Leaving/joining touches only the spectator's own caches. Server battles: spectators don't keep a battle alive —
  with no player left it ends after EMPTY_MS (60 s). Browser-hosted battles: if the host leaves, the battle migrates to
  a player; spectators see "connection lost" (they don't follow the migration — v1).
- **Tests:** `node orch/mpsync.mjs --spectator` (gate job mpsync): third page waits in the lobby, watches, sees 100% of
  the host's entities at every settle check, forged order ignored, leaves at 1.5 min and rejoins mid-battle, host/client
  sync checks all green; both pages' replays pack. `node orch/specserver.mjs` (gate job servertest): server lobby seat
  count, 4-spectator cap, start, both sides visible, no checkpoint, join/leave mid-battle, battle ends with only
  spectators.
- New wire fields (old pages ignore them): presence `hi.sp`, `sv`; 'start'/'lobby' `sp`/`spec`; blob/game list `sp`,`ns`.
  No sim state changed; nothing new in checkpoints (spectators are not part of the battle).

Server change → `main → servers-live` PR needed (server battle.js + 07a in the server bundle). Until it's merged,
server-hosted games don't advertise `sp`, so no Watch button appears for them (no risk of a spectator taking a seat).
