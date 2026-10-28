# Review: Cloudflare-hosted battles (independent reviewer)

Reviewer: independent agent (did not write this code). Scope: `orch/stage2-dedicated` (server), `orch/cf-battle-client`
(browser), `orch/passwords`, `orch/play-online`. Everything tested locally only (`wrangler dev` + Node), never against the
live servers. Newest batch at the top, most severe first inside a batch.

Test scripts on this branch (run them against a checkout of the branch under review):

```
node orch/review-cf-unit.mjs --root <checkout>              # BattleHost in plain Node, scripted players, manual clock
node orch/review-cf-ws.mjs   --root <checkout> [--only ghost,flood,squat]   # real sockets, local wrangler dev
```

---

## Batch 1 — `orch/stage2-dedicated` @ cffbaaa (server code = fcad540), 2026-10-28 ~00:50 UTC

### R1. [HIGH] Any player who is the standby can take over another player's side (reconnect tokens leak in the checkpoint)

- **Where:** `src/07b-ckpt.js:21` (`ckEncode` puts `toks: NET.toks` — every player's reconnect token, in the clear — into
  the checkpoint); `src/07b-ckpt.js:50-55` (`ckTick`/`ckFlush` send that checkpoint to one player, the standby);
  `src/07a-hostsnap.js:19` (`hostRejoin`) and `:36` (`hostPres` calls it for any `hi.tok`); `server/src/battle.js:117`
  (`hello` in the battle phase calls `sim.rejoin` whenever the token is known).
- **Scenario:** two friends in a Cloudflare battle. Every 8 s the server sends the checkpoint to the standby (the first
  player whose page can host). The checkpoint decodes (gzip+base64) to JSON with `toks:["<owner tok>","<friend tok>"]`.
  The standby opens a second socket to `/battle/<code>` with any new id and greets with `hi:{tok:"<friend tok>"}`.
  `hostRejoin` does not check that the slot's current player is gone: it moves the friend's slot to the new socket.
  The thief now gets `start` for the friend's slot, the friend's snapshots and team panel, and the friend's orders are
  ignored (`hostCmd` looks the slot up by peer id).
- **Reproduced:** `node orch/review-cf-unit.mjs --root <stage2-dedicated> --only tokSteal` →
  `standby owner1 holds toks ["TOKowner0000001","TOKfriend000001"]` … `sides now controlled by: ["owner1","thief01"]`
  → **FAIL**. Needs only a browser console (the page already decodes checkpoints with `ckUnpack`).
- **Impact:** breaks "no way to control another player's units" for every Cloudflare battle (and browser-hosted ones:
  same code). Any friend who is the standby can steal a side mid-battle; the victim just sees their orders do nothing.
- **Suggested fix (small):** never ship raw tokens. In `ckEncode` store `toks` as one-way hashes (e.g. SHA-256 of
  `code + tok`, or a cheap non-crypto hash is enough against this attack since tokens are 52-bit random), and have
  `hostRejoin`/`hasTok` compare the hash of the presented token. Also refuse a rejoin while the slot's current peer is
  still connected and recently heard from (`NET.seen[old]` within ~8 s) — a real reconnect always comes after the old
  socket died. Then the standby can still accept reconnects after a takeover, but can't impersonate anyone.

### R2. [MEDIUM] Three idle sockets lock everyone out of Cloudflare battles for up to 30 minutes

- **Where:** `server/src/index.js:567-575` (any socket with `own=<key>` on a fresh code claims one of the 3 battle
  slots before anything is said), `server/src/battle.js:12,193` (an unstarted lobby lives 30 min as long as one socket
  is connected; 60 s after the last one leaves), `index.js:563` (the connect rate limit is per object, i.e. per game
  code, so it does not limit creating lobbies on new codes).
- **Scenario:** a script (Origin header set by hand, which any non-browser client can do) opens 3 sockets
  `/battle/<random>?role=client&id=…&own=<random>` and never sends anything. Every other player who presses
  "Play online"/New battle gets `!e busy` and falls back to browser hosting. Re-open every 30 min to keep it up all
  night. Non-malicious version: three friends who open a new battle and leave the tab on the lobby (or close it: the
  slot stays held 60 s more).
- **Reproduced:** `node orch/review-cf-ws.mjs --root <stage2-dedicated> --only squat` → the 4th creator gets
  `!e busy` → **FAIL**.
- **Impact:** nobody gets a Cloudflare battle tonight; the game silently falls back to browser hosting (so it still
  plays, but Abdullah's main feature is off).
- **Suggested fix:** don't claim a battle slot for a lobby; claim it at Start (`startBattle`), refusing Start with a
  plain `why` ("The game's servers are full right now — try again in a minute", or fall back) if no slot is free. A
  lobby costs only its awake time. Additionally: a lobby with no greeted human (`order.length === 0`) closes after ~20 s
  instead of 30 min, and cap open lobbies per address via the Budget object (e.g. 2 per IP).

### R3. [MEDIUM] One idle non-player socket keeps a finished-with battle running (AI vs AI) for up to 45 minutes

- **Where:** `server/src/battle.js:87,197` — `emptySince` is set only when `players` (every socket, including ones
  that were told `full` after Start) is empty; `index.js:545-` — the BattleRoom has no silent-socket sweep (the relay
  rooms close sockets silent for 150 s, `sweep()`; the BattleRoom has nothing like it).
- **Scenario:** 2 players start; a third socket connects to the same code after Start (told `{"full":1}`) and stays
  open; both players leave. The battle keeps running with the AI on both sides until the 45-minute cap, holding a
  battle slot and ~337 GB-s (2.6% of the daily GB-s) per battle. Same with a phone that drops off the network without
  closing its socket (no FIN): its socket counts as "connected" until the runtime notices.
- **Reproduced:** `node orch/review-cf-ws.mjs --root <stage2-dedicated> --only ghost` → after 75 s with only the idle
  socket: `phase battle, game time 77 s` → **FAIL**.
- **Suggested fix:** in the battle phase, count only sockets that hold a side (`sim.teamOf(id) >= 0`) for
  `emptySince`, and close sockets that are not seated (told `full`) right away (they have no use after Start: a
  reconnect always greets with a token). Add the same 150 s silent-socket sweep as the relay rooms (players ping every
  1 s during a battle, so 30 s silence is already safe).

### R4. [LOW] A battle can start with more sides than the map holds

- **Where:** `server/src/battle.js:144-151` (`configure`): when the owner picks a smaller map, only computer seats are
  dropped; `check()` does not compare humans to `mx()`; `startBattle` uses every human.
- **Scenario:** 5 humans in a lobby on Desert Strait (8), owner picks Gulf Coast (max 4) and starts → 5 sides on a
  4-seat map (`blob` shows `mx 4, 5 seats, ok 1`).
- **Reproduced:** `node orch/review-cf-unit.mjs --root <stage2-dedicated> --only mapShrink` → FAIL (the battle does
  run: the 5th base is placed at a fallback spot, 714,2162, so it is not a crash, just more players than the map is
  made for). The browser host avoids this (`renderLobby` drops extra players with `full`).
- **Suggested fix:** in `check()`, `if (this.order.length > this.mx()) return 'Too many players for this map: pick a
  bigger battlefield.'`; or refuse a `map` whose `max` is below the number of humans.

### R5. [LOW] Message floods are billed before they are dropped; the per-socket limit alone can't protect the daily budget

- **Where:** `server/src/index.js:583-589`. Every incoming frame counts 1/20 request whether or not the token bucket
  drops it; a socket is closed only after 2,000 dropped frames; the connect limit is per game code.
- **Measured:** `--only flood`: 20,200 frames (incl. 200 × 1 MB) from one socket: the server closed it, the battle kept
  running for the other player (ok). But each such burst is ~100 billed requests, and a script can repeat it on fresh
  codes without limit: ~2M frames (= the whole 100k-request day) is minutes of work, after which the 70%/75% guard
  sends every Cloudflare battle back to browser hosting for the rest of the UTC day.
- **Suggested fix (cheap):** close at ~200 dropped frames (not 2,000), and close at once on any frame over
  `MAX_FRAME` instead of ignoring it. A global per-IP connect limit (in the Budget object, or Cloudflare's free
  rate-limiting rule on `/battle/*`) is the real fix; worth a backlog item. Note the Origin allow-list is not a
  protection against scripts (they set any Origin).

### Checked and fine (stage2-dedicated)

- A socket that is not seated (late joiner) cannot order any side: its `cmd` and `cq` are ignored (unit `spectator` ok).
- Orders are validated (`cleanCmd`) and applied only to the sender's own units (`act` filters by team).
- `bset` from a non-owner is ignored; `map` is checked with `hasOwnProperty` (`__proto__`/`constructor` rejected);
  `ais` capped at 8, teams/difficulty clamped.
- Frames over 16 KB are ignored; a JSON error or a throwing handler is caught per record.
- Server restart: `battletest` restart case passes (picked up from the checkpoint). Battle over → checkpoint deleted, so a
  late reconnect does not resurrect it. Hand-over (`shut`) deletes the checkpoint before players reconnect.
- `/battle-test/` is 404 unless `TEST_HOOKS=1` (not in `wrangler.toml`); `/lobby`'s internal `/battle` POST is not
  reachable from outside (the Worker only forwards `/lobby` and `/games`).
- 4th battle refused with `busy`; budget guard refuses new battles (battletest PASS on this head).
