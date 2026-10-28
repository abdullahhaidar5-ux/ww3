# Multiplayer servers: ORCH runbook, design, measurements

Abdullah's Cloudflare servers (`server/`, Worker **`ww3-servers`**, expected at
**https://ww3-servers.abdullah-haidar5.workers.dev**) add a game list, relay rooms and TURN logins to the online
edition. Battles still run in the host's browser (Stage 1). The game ignores the servers while `WW3_SERVER_URL` in
`src/07-net.js` is empty, which is the state on `main` until the steps below are done. The claude.ai artifact edition
never uses them: the backend lives in the online-edition shim, which `build.py --artifact` strips (and guards against).

## Putting the servers live (ORCH)

0. **Prerequisite:** `server/` has shipped to `main` in a normal cycle (with `WW3_SERVER_URL` still `''`). Abdullah's
   dashboard import builds `server/` from `main` once, so it must exist there first.
1. **Make the approval branch (once).** Point `servers-live` at the last commit **before** `server/` existed, so the
   go-live PR contains the whole server:
   `git push origin "$(git rev-list -1 "$(git log --diff-filter=A --format=%H -- server/wrangler.toml | tail -1)^")":refs/heads/servers-live`
   (creating a branch only; never force-push it afterwards).
2. **Ask Abdullah to do the one-time dashboard setup** in `server/README.md` → "One-time setup" (8 taps-and-types;
   send him that section as it is, or link https://github.com/abdullahhaidar5-ux/ww3/blob/main/server/README.md). In short:
   Workers & Pages → Create → Import a repository → `abdullahhaidar5-ux/ww3` → name `ww3-servers`, root directory
   `server`, deploy command `npx wrangler deploy` → then Settings → Build → Branch control: production branch
   `servers-live`, preview builds off. (Creating it deploys once from `main`. That's harmless, because the game isn't
   pointed at it yet.)
3. **Open the approval PR**, in plain words:
   `gh pr create --base servers-live --head main --title "Put multiplayer servers live" --body "Tap Merge to switch on World War 3's own multiplayer servers on your Cloudflare account (free plan). Nothing changes for players until the next game update points the game at them."`
   Abdullah taps **Merge** in the GitHub app. Cloudflare builds `server/` from `servers-live` (about a minute).
   Confirm the merge with `gh pr view --json state,mergedAt` (state `MERGED`) before going on.
4. **Check it** (after the merge, wait ~2 min): `curl -s https://ww3-servers.abdullah-haidar5.workers.dev/health` must
   show `"ok":true`, `"service":"ww3-servers"` and `"version":2`. (The dashboard's first deploy from `main` already
   answers this, so the check proves the server is up, and the `MERGED` state proves the approval.) Then
   `node orch/servertest.mjs --url https://ww3-servers.abdullah-haidar5.workers.dev` must print `SERVERTEST PASS` (it
   skips the checks that need a local server). If /health doesn't answer: ask Abdullah for a screenshot of
   ww3-servers → Deployments; don't switch the game over.
5. **The one-line change, in a normal ship:** in `src/07-net.js`,
   `const WW3_SERVER_URL='https://ww3-servers.abdullah-haidar5.workers.dev';`, `python3 orch/build.py`. Then the usual
   gate plus `node orch/servertest.mjs` and `node orch/mpsync.mjs --server`, push `main` (Pages and the `ww3` Worker
   pick it up; check https://ww3.abdullah-haidar5.workers.dev serves the new `index.html`). The artifact edition is
   unaffected (its build strips the server code) but republish it as usual. Tell Abdullah: "Multiplayer now uses your
   own servers: game list, and a backup route for friends whose internet blocks direct connections."
6. **Later server changes:** each one is a PR `main → servers-live` with a plain title ("Update multiplayer servers:
   …"), approved by Merge. Workers Builds deploys nothing else.

**Rollback:** set `WW3_SERVER_URL` back to `''` and ship. Every player is on pure P2P again from their next page load.
**Dashboard checks:** Worker → Metrics shows requests and errors. `/health` → `budget` shows today's estimated
free-tier use.

## How it works

**Fallback chain (a player joining a game, servers configured):**
1. **Direct P2P:** PeerJS with STUN only (`via:'pjd'`, 9 s timeout). This is today's path, and most players stop here.
2. **P2P through TURN:** only when step 1 *timed out* (ICE failed) and TURN logins exist (`/turn` returns servers
   when Abdullah has added the TURN secrets; otherwise "not configured" and this step is skipped). `iceTransportPolicy:
   'relay'`, `via:'pjt'`.
3. **Server relay:** WebSocket to `/room/<code>` (`via:'ws'`). Taken at once when PeerJS can't reach the host at all
   (broker down, host not on PeerJS), after step 1/2 fail, or when the player turned on "Hide my IP address".
   The lobby status says "Joined (through the game server)".
A reconnect reuses the way that worked. If that fails, it falls back to the relay. The host always listens on all
three (PeerJS, Nostr backup and its relay room) and never waits for the server if P2P hosting worked. Host migration
works unchanged: the standby opens `<code>-m1` the same way.

**What touches the server in a typical match:** the game list (one hibernating WebSocket per browser on the menu,
plus a message whenever a hosted game changes), and one idle relay socket per host (it sleeps, costs nothing). Game
traffic goes through the server **only for players who couldn't connect directly**. If all 8 connect directly, the
match costs about 12 requests and about 0 GB-s.

**Same semantics as P2P:** star topology (players talk only to the host), sender ids, per-player targeting (`d.to`),
join/leave notices, presence. `07-net.js` sees identical room objects whichever path a player took.

**Wire format, cheap per message:** text frames of `"<to>|<json>"` records joined by `"\n"` (JSON never contains a
raw newline). The server reads only the short prefix and forwards slices: it never parses, re-serializes or stores
game payloads. The page batches everything sent in one go (one host tick: every relayed player's bundle) into **one**
frame. The server regroups a batch so each player gets one frame with just its records. So a host sends ~2–10 frames
a second however many players it relays, and billed messages don't grow with player count. Routing is in
`server/src/route.js` (timed in plain Node by `serverbench.mjs`).

**Compression:** WebSocket `permessage-deflate` is negotiated by the runtime (verified locally in workerd; browsers
always offer it). JSON number arrays compress roughly 4×, so bytes on the wire are about a quarter of the raw size,
with no extra code or CPU in the page.

**Low latency:** a room's Durable Object is created with a `locationHint` from the host's own connection
(`request.cf`: Middle East countries → `me`, North America west/east → `wnam`/`enam`, Europe west/east → `weur`/`eeur`,
Asia → `apac`, Oceania `oc`, Africa `afr`, South America `sam`). The relay hop sits next to the host, so a relayed
player's path is player → nearest Cloudflare edge → (Cloudflare backbone) → room beside the host → host.

**Hibernation and cleanup:** Hibernation API everywhere (`acceptWebSocket`, `webSocketMessage/Close/Error`). Keep-alive
`ping` → `pong` is answered by Cloudflare without waking anything (and isn't billed). Room state lives in socket
tags/attachments plus memory. Storage is written only when a host drops (3 s grace timer) and by the usage report.
One alarm per room/lobby, every 5 min while sockets exist: it closes sockets silent for 150 s (crashed tabs, phones
that dropped off), so stale games leave the list, and it reports usage. Nothing re-arms once a room is empty. The lobby
is a single object whose list is cached as the ready-to-send frame and rebuilt only when a game changes.

**Limits (per socket unless noted):** message size: host 128 KB (page flushes at 96 KB), player 16 KB, lobby 1 KB.
Rate: host 150 frames/s (burst 400), player 30/s (90), lobby 3/s (10), whole room 300/s (800). Connects per address
per room/lobby: 0.5/s (burst 30). Sockets per address: 8 per room, 16 in the lobby. Room size: host + 11 (8 players + 4
spectators). Origins: GitHub Pages, `ww3.abdullah-haidar5.workers.dev`, `*.pages.dev`, `*.workers.dev`, localhost
(more via the `ALLOWED_ORIGINS` var).

**Free-tier guard:** every room and the lobby estimate their own cost as Cloudflare bills it (requests = connections
+ alarms + incoming messages / 20; GB-s = awake time × 128 MB, where awake = gaps between events capped at 10 s) and
report it to one `Budget` object (one row per UTC day) every 5 min and when they empty. At **80%** of either daily
allowance (100,000 requests, 13,000 GB-s) new relay rooms and relay joins are refused with `busy`, and the page keeps
playing P2P. At **90%** the game list refuses new connections and the page switches to its P2P game list. Matches in
progress are never cut off. `/health` shows the day's numbers.

**Password-protected games** (Abdullah, 2026-10-27 19:30; `server/src/password.js`): the page offers the password as a
WebSocket subprotocol pair `ww3` + `pw.<base64url UTF-8>` on `/room/<code>` (host and players) and `/battle/<code>` (never
in the URL; the Worker answers `ww3`). The server keeps only a salted PBKDF2-SHA256 hash (4,000 rounds; relay room: on
the host's socket attachment; battle: in memory and in its kept checkpoint), compares in constant time, and refuses with
`!e needpw` (none given), `!e badpw` (wrong) or `!e pwlimit` (5 wrong guesses from one address, then one per 20 s; 30 per
game, then one per 2 s). One guess per connection. A battle's owner key gets back in without it. The game list carries
only `pw:1` (the page shows a 🔒). A browser host also checks the password itself for players who reach it directly
(P2P), 10 wrong a minute. Invite links carry it in the fragment: `#join=<code>&pw=<password>`. Tests: `servertest.mjs`,
`cfclient-password.mjs`.

## Measurements (2026-10-27, local: wrangler dev 4.153.0 / workerd, headless Chromium)

Measured with `node orch/serverbench.mjs` (logs: `/home/claude/logs/servers-serverbench.txt`) on the per-player traffic
that `node orch/mpsync.mjs --server` captured in real-time battles through the local server (2 sides; `--ais 2` = 4 sides;
`--ais 6` = 8 sides). Re-run both to refresh.

| What | Measured |
|---|---|
| **Added relay latency** | ~1 ms per pass in the room (local round trip through a relay room p50 3.2 ms / p95 9.2 ms vs 0.65 ms for a bare socket). In the real world a relayed player also pays the detour to the room's region (it sits beside the host, so roughly the player→nearest-edge hop plus Cloudflare's backbone); not measurable before the first deploy. Players who connect directly pay nothing. |
| **DO CPU per 1,000 messages** | Room code alone: **~1 ms** per 1,000 host frames batching 7 players (1.3 µs each), 0.13 µs per single-record frame, 0.04 µs per player frame. Whole local runtime incl. socket framing and compression: 415 ms per 1,000 frames of 5 KB to 3 players (upper bound). Free-plan Durable Objects bill awake time (GB-s), not CPU, so this only shows the server is never the bottleneck. |
| **Per relayed player, 2-side match** | down 657 frames/min, 404 KB raw → **113 KB/min** on the wire; up 1.4 KB/min |
| **Per relayed player, 4-side match** | down 659 frames/min, 523 KB raw → **155 KB/min**; up 1.3 KB/min |
| **Per relayed player, 8-side match** | down 657 frames/min, 636 KB raw → **229 KB/min**; up 1.3 KB/min. Host upload through the relay with all 7 others relayed: 1.6 MB/min. |
| **One 30-min match** | 8 players, all direct: 12 requests, ~1 GB-s. 1 relayed: 1,100 requests (1.1%), 225 GB-s (1.7%). 7 relayed: 1,646 requests (1.6%), 225 GB-s (1.7%). |
| **Evening: 10 × 8-player × 30-min matches** | all direct: 120 requests (0.1%), 10 GB-s (0.1%). One relayed player per match: 11,000 requests (**11%** of 100k/day), 2,250 GB-s (**17%** of 13,000/day). Everyone relayed: 16,460 requests (16.5%), 2,250 GB-s (17%). Well inside the free plan; the 80% guard would trip only after ~45 relayed matches in one UTC day. |

Billed frames don't grow much with players because the host sends one batched frame per tick (~657/min) whatever the
number of relayed players; each relayed player adds only its own ~60 presence frames a minute.

Gate runs on this branch (2026-10-27): `servertest` PASS; `mpsync --server` 2/2 PASS (+ `--ais 2` and `--ais 6` PASS);
plain `mpsync` 3/3 PASS; `smoke --players 4` PASS; artifact build + `smoke --artifact` + `mpsync --artifact` PASS.

## Known limits and follow-ups

- **PeerJS broker** is still what introduces browsers for *direct* P2P (WebRTC signalling). If it's down, joiners go
  straight to the relay. Our own signalling (PeerJS-compatible broker in a Durable Object) is a possible next step.
- **Players opening the game as a file** (`ww3.html` from Discord: origin `null`) or **on itch.io** aren't on the
  origin allow-list, so they get P2P only. Add exact origins with `ALLOWED_ORIGINS` if wanted. `null` is not
  recommended, because any sandboxed page could then use the quota.
- The budget is an estimate. An object evicted between reports loses up to 5 minutes of counts, hence the 80%
  threshold. Cloudflare's own limit is the backstop.
- Compression was verified in local workerd only. On first deploy, check in a browser's devtools (Network → WS →
  headers: `Sec-WebSocket-Extensions: permessage-deflate`).
- Stage 2 (battles hosted on Cloudflare): `BattleRoom` at `/battle/<code>` and `/battle-bench` are in `server/`
  (branch `orch/stage2-dedicated`, not yet used by the game). Protocol, limits and measurements: `STAGE2.md` §8–9;
  test: `node orch/battletest.mjs`.

## Test copy on real Cloudflare (staging)

Abdullah OK'd a separate test Worker on 2026-10-27 19:37: **`ww3-servers-staging`** at
https://ww3-servers-staging.abdullah-haidar5.workers.dev, with its own Durable Objects. It never touches the live
`ww3-servers` Worker or its game list. To test a commit on real Cloudflare, push it to any `staging/<name>` branch
(`git push origin HEAD:staging/<name>`). `.github/workflows/staging-servers.yml` deploys `server/` from that commit,
runs `orch/servertest.mjs --url` against it, and runs one battle bench (8 players, fulda, 2 game-minutes) when the
commit message contains `[bench]`. Results are commit statuses `staging/deploy|servertest|bench`; the full log is on
branch `staging-logs/<sha10>`. One deploy runs at a time, so agents share it. A page served from localhost may use it
(the origin rules allow localhost). The free plan's daily allowance is shared with the live servers, so bench only
when server or battle code changed.
