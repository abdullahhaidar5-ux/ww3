**Ship cf-final d5ae2ca** (reviewed 2026-10-28 ~09:55 UTC): R1–R9 fixed (all repro scripts pass; build --check + SMOKE PASS), no hosting wording, no new desync or password leak found.
Two new non-blocking findings: R11 (MEDIUM) a standby whose own network is down for 40 s+ still splits the battle; R12 (LOW) an ungreeted lobby socket keeps an abandoned battle (and 1 of the 3 battle slots) alive for 45 min.
Fix R11 next (promote on silence only after the server is asked once more once the standby's own network works); R12 is a one-line `full` flag at Start.

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

## Batch 3 — `orch/cf-final` @ d5ae2ca (final head, with orch/reports/cf-final.md), ~09:55 UTC

### Status of R1–R10 on d5ae2ca

| | Status | Checked with |
|---|---|---|
| R1 token theft via checkpoint | **FIXED** (ce948cb: checkpoints carry `h:`+hash) | unit `tokSteal` ok |
| R2 idle lobbies lock out battles | **FIXED** (f22a065: slot claimed at Start; ungreeted lobby closes in 20 s) | ws `squat` ok |
| R3 ghost socket keeps battle alive | **FIXED** for sockets that join after Start (ws `ghost` ok) — but see **R12** for one that joined in the lobby |
| R4 more sides than seats | **FIXED** (ce948cb: Start refused, "Too many players for this battlefield") | unit `mapShrink`: start refused ok; the lobby still *lists* 5 seats on a 4-seat map until someone leaves (cosmetic, not a bug) |
| R5 floods | **FIXED** (f22a065: close after 200 dropped frames / frames > 16 KB) | ws `flood` ok |
| R6 standby splits after 15 s blip | **FIXED** for blips < 40 s (6bddce7) | split `--blip 15` PASS, `--blip 25` PASS; `--blip 45` FAIL → **R11** |
| R7 pwlimit locks out reconnects | **FIXED** (no password check once the battle runs; known-good addresses only hit the per-game limit) | ws `pwshared` ok. Residual, LOW: in the *lobby*, 6+ addresses mistyping still empty the per-game bucket and block everyone's correct password for a while — inherent in a per-game limit, acceptable |
| R8 hosting wording / password not wired | **FIXED** (6a95434); grep of every visible string in src/: no "host"/"hosting" text left (only comments and code keys) | |
| R9 NET.lobby undefined | **FIXED** (6a95434) | no page error in the split runs |
| R10 zombie relay host | reported handled; not re-tested | |

### R11. [MEDIUM] A standby whose own network is down for 40 s or more still splits the battle in two

- **Where:** `src/07-net.js` `clientReconnect`: `svBlip()` stops holding the standby back after 40 s measured from the
  start of *its own* reconnect. Silence for 40 s is taken as "the server is gone for everyone", but the standby can't
  tell that apart from its own network being down.
- **Scenario:** the creator (standby) on a phone goes through a tunnel / metro / dead Wi-Fi for ~45 s. At 40 s its page
  promotes itself; the takeover keeps retrying until the network returns, then opens `<code>-m1` and runs its own
  copy from its last checkpoint. The friend was never disconnected and stays on the server battle, now fighting the
  creator's AI. Both see "the other commander's AI"; nobody is told.
- **Reproduced:** `node orch/review-cf-split.mjs --root <cf-final> --blip 45` → `standby page: {"mode":"host","gen":1};
  other page: {"mode":"client","gen":0,"via":"wsb"}; server: phase battle, sides held by [null,"ww3p-…"]` →
  **REVIEW-SPLIT FAIL**. (15 s and 25 s: PASS.)
- **Why it matters:** promoting while one's own network is down can never help anyone (no other player can reach the
  new room either), so the silence rule only causes harm in exactly the case it fires most often.
- **Suggested fix:** when the 40 s silence rule fires, don't promote yet: first get *any* answer from Cloudflare (e.g.
  the game list or the relay join itself succeeding = this page's network works), then ask `/battle/<code>` once more;
  promote only if that answer is "nohost" or it still fails while the relay works. Keep the 60 s overall budget
  running from when the network came back (as `NET.stW` already does for a frozen page).

### R12. [LOW] A socket that sat ungreeted in the lobby keeps an abandoned battle running for 45 minutes (holding 1 of the 3 battle slots)

- **Where:** `server/src/battle.js`: `join()` sets `full: this.phase === 'battle' ? 1 : 0`; `startBattle()` doesn't mark
  the lobby sockets that have no seat (never greeted, or told "full" because the lobby was full) as `full`. During the
  battle `tick()` keeps `emptySince = 0` while any socket has `!P.full`, and `sweep()` closes only sockets told "full"
  or silent for 150 s. So such a socket that keeps sending keep-alives keeps the battle going AI vs AI after every
  player left, until `MAX_BATTLE_MS` (45 min), with one of the `MAX_BATTLES = 3` slots and the CPU budget.
- **Realistic?** Mostly deliberate: the game's own page greets at once and leaves when told "full". But it is cheap
  (one socket) and each one takes a third of Cloudflare battle capacity for 45 min (everyone else then quietly falls
  back to browser battles).
- **Reproduced:** `node orch/review-cf-unit.mjs --root <cf-final> --only lobbyGhost` → `after 120 s: phase battle,
  ghost closed: no` → **FAIL**.
- **Suggested fix:** in `startBattle()`, set `P.full = 1` for every player not in `this.order` (they then get the
  30 s `UNSEATED_MS` close like late joiners).

### Checked, no problem found

- An unseated socket (wrong/no password once the battle runs, or a late joiner) receives nothing: no snapshots,
  events or checkpoints (`--only unseatedRx` ok) — skipping the password gate in the battle phase leaks nothing.
- Token hashes in checkpoints: tokens are 10 base-36 chars from `Math.random` (~50 bits) hashed to 64 bits —
  not reversible within a battle; a reconnect replaces the hash by the raw token only on the host.
- `index.html` matches `src/` (`build.py --check`), `node orch/smoke.mjs` → SMOKE PASS on d5ae2ca.
- Minor, not filed: a battle picked up after a server restart reuses its slot without re-claiming it, so in a rare
  race 4 battles can run at once for a few minutes; the slot TTL corrects it.
- Cost: with `MAX_BATTLES = 3`, anyone can hold all three slots by just playing (or with R12 ghosts); the result is the
  designed fallback to browser battles, not an outage.

---

## Batch 2 — `orch/cf-battle-client` @ aa802a2, `orch/play-online` @ 3a6ff90, `orch/passwords` @ 39cb081 (~01:10 UTC)

(The server code on play-online and cf-battle-client is the same as stage2-dedicated, so R1–R5 apply to them too.)

### R6. [HIGH] A 15-second network drop on the standby's phone splits the battle in two

- **Where:** `src/07-net.js` `clientReconnect` (play-online / cf-battle-client / passwords): `svBlip()` rides out a
  Cloudflare blip for only **8 s**; after that, every loop turn first calls `promoteToHost()` if this page is the
  standby, **without having heard "nohost" from the server** (`gone` is never required for `NET.sv`). The server
  battle is still running, so the other players never leave it.
- **Scenario:** Cloudflare battle, 2 players. The standby (normally the creator) walks into a lift / switches Wi-Fi →
  4G / the phone sleeps for ~15 s. Its reconnects fail for 8 s, it then opens `<code>-m1` and runs the battle in its
  own browser from its last checkpoint. The server keeps the real battle with the friend; the standby's side there
  goes to the AI after 30 s. Result: the creator plays alone in a copy ("the other commanders are reconnecting…"
  forever), the friend fights the creator's AI. Nobody is told what happened.
- **Reproduced:** `node orch/review-cf-split.mjs --root <play-online> --blip 15` (two Chromium pages, local
  `wrangler dev`, the standby page's WebSockets fail for 15 s): `standby page: {"mode":"host","gen":1}; other page:
  {"mode":"client","gen":0,"via":"wsb"}; server: phase battle` → **REVIEW-SPLIT FAIL**. Same with `--blip 25`. With
  `--blip 12` it came back to the server (PASS), but only by luck (see R10).
- **Suggested fix:** for a server-run battle (`NET.sv`), promote only after the server itself answered `nohost`
  (`gone === true`) — that is exactly the restart-failed / handed-over case the standby exists for. While the server
  is merely unreachable, keep retrying `/battle/<code>` (the server gives the side 30 s before the AI, and the page
  can keep trying up to its 60 s budget). If Cloudflare as a whole is unreachable for everyone, every player sees the
  same thing; a longer cutoff (e.g. promote only if *also* 25 s without any answer) still covers it.

### R7. [MEDIUM] Password games: the right password is refused ("pwlimit") for everyone on an address where someone mistyped it 5 times — including players already in the battle reconnecting

- **Where:** `server/src/password.js` `PwGuard.ok` / `pwGate` (passwords branch): `ok(ip)` is checked **before** the
  password, so after 5 wrong guesses from one address (and 30 from all addresses) even correct passwords are refused
  for ~20 s per guess; `index.js` BattleRoom.fetch runs the gate for every connection, also during the battle.
- **Scenario:** friends on the same Wi-Fi (or the same mobile carrier NAT — very common on phones) play a protected
  battle. Someone else at that address mistypes the password 5 times while trying to join. Any player from that
  address whose connection blips now gets `!e pwlimit` on every reconnect → after 8 s the standby splits the battle
  (R6), a non-standby player loses their side to the AI. Also: 6+ addresses × 5 wrong guesses empty the per-game
  bucket and lock *everyone* out of reconnecting.
- **Reproduced:** `node orch/review-cf-ws.mjs --root <passwords> --only pwshared` → 5× `!e badpw`, then the friend's
  reconnect with the right password: `!e pwlimit` → **FAIL**.
- **Suggested fix:** once the battle has started, a socket can do nothing without a valid side token (it is told
  `full`), so skip the password gate in the battle phase, or at least let a correct password through regardless of the
  buckets (only *wrong* guesses should consume and be blocked by them: check `pwCheck` first when the per-address
  bucket allows, and when it doesn't, still accept an address that already got in correctly to this game).

### R8. [MEDIUM] Merge hazard: passwords branch brings back hosting wording and isn't wired to "New battle" / "Play online"

- **Where:** passwords `src/07-net.js`: `hostChoice()` ("Host in my browser" / "Host on Cloudflare" chips),
  `hostCF` fallback text "Cloudflare is busy right now, so your browser is hosting this battle instead.",
  `cfNetText()` "Hosted on Cloudflare", "Waiting for … the host", password field placed next to "Host a game"; the
  password is read only in `hostGame()` (`NET.pw=pwVal()`).
- **Impact:** passwords forked from cf-battle-client before aa802a2 ("Play online", no hosting wording). If it is merged
  as is, Abdullah's "no hosting button or wording" is reverted. And play-online's `newBattle()` → `hostCF()` never sets
  `NET.pw`: a player who types a password and presses **New battle** gets an **unprotected** game while believing it
  is locked.
- **Suggested fix (for whoever merges passwords into play-online):** keep play-online's buttons/texts; set
  `NET.pw=pwVal()` in `newBattle()` (and decide whether "Play online" with a typed password should skip joining and
  create a protected battle); keep `quickPick`'s `!g.pw` filter; re-run `cfclient-password.mjs` on the merge.

### R9. [LOW] play-online: "New battle" on a fresh page throws (NET.lobby undefined)

- **Where:** play-online `hostCF`: `if(r===true){NET.ais=[];NET.tm=[0];cfPush(true);…}` → `cfCfg()` reads
  `NET.lobby.length`, which is unset until the first `leaveNet`. Seen as `page error: Cannot read properties of
  undefined (reading 'length')` in the split test. The lobby recovers when the server's first `blob` arrives, but the
  creator's map/conditions aren't sent at creation and the page logs an uncaught error (the gate's browser tests fail on
  page errors). Already fixed on passwords (39cb081: `NET.lobby=[]`); make sure play-online gets it.

### R10. [LOW, from reading + the 12 s run] A failed takeover attempt leaves a "zombie" relay host for `<code>-m1`

- **Where:** shim `namedRoom` hosting path: when PeerJS and Nostr hosting fail, `wsOpen('host')` failing starts
  `wsRetry(1)` in the background, then `namedRoom` throws; `promoteToHost` returns `'retry'` and abandons that room
  object, but its `wsRetry` keeps trying (up to 30 times, ~2 min) and, once the network is back, becomes the host of
  relay room `<code>-m1` with a key no live code uses. The next real `promoteToHost` gets `taken` → `isStandby=false`
  → nobody takes over; players joining `-m1` through the relay reach a host that isn't wired to any game.
- **Evidence:** in the 12 s blip run the standby did *not* split although it was past the 8 s mark — consistent with
  its later promote being refused as `taken` by its own leftover. When the server really is gone (hand-over at 75%,
  45-minute cap) with a flaky standby connection, this can leave the battle with no host at all.
- **Suggested fix:** when `namedRoom`'s `ready` rejects, set `wsBye=true` (and close any socket it opened) so no retry
  outlives the failed attempt.

### Checked and fine (client / passwords / play-online)

- play-online: no player-visible "host/hosting" wording left in `src/` strings I could find (lobby says "Online · ping",
  leader, "Connection lost. Reconnecting…"). One "Play online" button + "New battle"; fallback to the browser is silent.
- Passwords: never in the URL (WebSocket subprotocol), stored only as a salted PBKDF2 hash (in memory / the kept
  checkpoint), the game list carries only `pw:1`, no `console.log` of either; invite link puts it in the `#fragment`
  only and strips it from the address bar. (Note the invite *text* spells the password out in Discord — by design.)
- Reconnect of a non-standby player after a short cut, server restart pickup, 75% hand-over: their own tests
  (`cfbattle`) cover them; the split test above passes for a 12 s blip.

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
