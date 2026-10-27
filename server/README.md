# World War 3 servers

Abdullah's own multiplayer servers on Cloudflare (free plan). Battles still run in the host's browser; these servers only:

- **Game list:** shows open games to everyone on the Multiplayer menu (replaces the public matchmaking service).
- **Relay rooms:** carry the game for a player whose network blocks direct browser-to-browser links. Players who can
  connect directly never touch the server. Each room is created in the host's region.
- **TURN logins** (optional): short-lived Cloudflare TURN credentials, tried before the relay.
- **`/health`:** "is it up", plus today's free-tier use.

Address once deployed: **https://ww3-servers.abdullah-haidar5.workers.dev** (check: open `/health` on it).
This is a separate Worker from **`ww3`** (the game website, https://ww3.abdullah-haidar5.workers.dev). Never rename it.

## One-time setup (Cloudflare dashboard, about 5 minutes on a phone)

**Before you start:** wait until ORCH says it's ready (the servers' code is on `main` and a branch called
`servers-live` exists). Doing it earlier makes step 7 fail.

1. On your phone, open **dash.cloudflare.com** in the browser and sign in (the same account that runs `ww3`).
2. Tap the **menu** (three lines, top left) → **Compute (Workers)** → **Workers & Pages**.
3. Tap **Create** (blue button). On the "Workers" tab, tap **Import a repository** (it may say *Get started* next to
   it).
4. Pick **GitHub** → **abdullahhaidar5-ux** → tap the repository **ww3**. (GitHub is already connected because of the
   `ww3` site. If it asks for access anyway, allow the `ww3` repository.)
5. On the "Set up your application" screen, fill in only these:
   - **Project name:** `ww3-servers` (exactly this: it must match the server's settings file, or the build fails)
   - **Build command:** leave empty
   - **Deploy command:** `npx wrangler deploy` (usually already filled in)
   - Tap **Advanced settings** → **Path** (also called *Root directory*): `server`
   - If you see a box "Builds for non-production branches", untick it.
   - Leave everything else (API token, variables) as it is.
6. Tap **Create and deploy**. Wait for the green "Success" (about a minute). This first deploy comes from `main`;
   that's expected and harmless, because the game isn't pointed at the servers yet and an idle server costs nothing.
7. Tap **Settings** (tab at the top of the `ww3-servers` page) → scroll to **Build** → **Branch control** → tap the
   pencil (edit) icon:
   - **Production branch:** pick `servers-live`
   - **Builds for non-production branches** (or *Enable Preview Builds*): off
   - Tap **Save**.
8. Check it: open **https://ww3-servers.abdullah-haidar5.workers.dev/health**. You should see a short line of text
   starting with `{"ok":true`. Then tell ORCH "servers set up".

From now on, server changes go live only when the `servers-live` branch changes, which happens only when you tap
**Merge** on a pull request (see below).

*(Optional, for players behind very strict networks)* **Realtime → TURN Server → Create**, then copy the Key ID and
API token into **ww3-servers → Settings → Variables and Secrets** as two **secrets** (tap *Add*, type *Secret*) named
`TURN_KEY_ID` and `TURN_KEY_API_TOKEN`. Without them the game skips TURN and uses the relay rooms instead.

No API tokens or GitHub secrets are needed anywhere. Cloudflare's Git connection does the deploying.

## Approving a server change (phone)

ORCH opens a pull request from `main` into `servers-live`, titled in plain words, for example *"Put multiplayer
servers live"*. Tap **Merge** in the GitHub app. Cloudflare builds and deploys within a minute or two. ORCH then checks
`/health` and switches the game over in a normal update.

## Free plan

Cloudflare's free allowance is 100,000 Durable Object requests and 13,000 GB-s a day. A match where everyone connects
directly uses almost none of it (about 12 requests). A 30-minute match with relayed players uses about 1–2% of the
daily requests and 1.7% of the daily GB-s. The server stops opening new relay rooms at 80% of either allowance (the
game list stops at 90%), so a match never breaks because the free plan ran out. Players then connect directly, as
before. Details and measurements: `orch/SERVERS.md`.

## Battles hosted on Cloudflare (being built)

The servers can also **run a battle themselves** (a `BattleRoom`), so no player's browser has to host it. The game
doesn't offer this yet. For now there is only a measuring tool, to check what the free plan can carry:

- Open **https://ww3-servers.abdullah-haidar5.workers.dev/battle-bench?players=8&minutes=3** in a browser. It plays a
  computer-only battle on the server and prints how long each game-second took. Without a key, it allows one run per
  hour of up to 3 game-minutes.
- *(Optional)* To allow more runs: **ww3-servers → Settings → Variables and Secrets → Add → Secret** named
  `BENCH_KEY` with any long password, then add `&key=<that password>` to the address.

Free-plan safety: at most 3 battles at once, each at most 45 minutes. No new battles once today's use reaches 70%.
At 75% a running battle hands itself to one of its players (it carries on in that player's browser).

## For developers

```
cd server && npm ci            # wrangler (devDependency, pinned in package-lock.json)
npx wrangler dev               # local server on http://127.0.0.1:8787
node ../orch/servertest.mjs    # protocol test (starts its own local server)
node ../orch/serverbench.mjs   # latency / CPU / usage projection
node ../orch/mpsync.mjs --server   # real game, host + client forced onto the relay
```

Files: `src/index.js` (Worker, GameRoom, Lobby, Budget, BattleRoom), `src/route.js` (relay routing),
`src/battle.js` (battle host: lobby, start, loop; runtime-neutral), `src/battle-driver.js` (the server's handle on the
game's code), `build-sim.mjs` (bundles `../src` into `gen/battle-sim.js` before every `wrangler dev`/`deploy`; the file
is generated, not committed), `wrangler.toml`. Battle tests: `node ../orch/battletest.mjs` (also `--bench 2,4,8` in
Node, `--cfbench 2,4,8` in local workerd). Protocol: `../orch/STAGE2.md` section 8.
Never put secrets in these files; set them in the dashboard.
