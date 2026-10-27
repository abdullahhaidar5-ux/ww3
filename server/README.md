# World War 3 servers

Abdullah's own multiplayer servers on Cloudflare (free plan). Battles still run in the host's browser; these servers only:

- **Game list:** shows open games to everyone on the Multiplayer menu (replaces the public matchmaking service).
- **Relay rooms:** carry the game for a player whose network blocks direct browser-to-browser links. Players who can
  connect directly never touch the server. Each room is created in the host's region.
- **TURN logins** (optional): short-lived Cloudflare TURN credentials, tried before the relay.
- **`/health`:** "is it up", plus today's free-tier use.

Address once deployed: **https://ww3-servers.abdullah-haidar5.workers.dev** (check: open `/health` on it).
This is a separate Worker from **`ww3`** (the game website, https://ww3.abdullah-haidar5.workers.dev). Never rename it.

## One-time setup (Cloudflare dashboard, works from a phone)

ORCH first creates a branch called `servers-live` in the repo. After that:

1. **Workers & Pages → Create → Import a repository → `abdullahhaidar5-ux/ww3`.**
2. On the setup screen:
   - **Project name:** `ww3-servers` (must be exactly this, or the build fails)
   - **Build command:** leave empty
   - **Deploy command:** `npx wrangler deploy`
   - **Advanced settings → Path / Root directory:** `server`
   - If a "Builds for non-production branches" box is shown, untick it.
   - Leave API token and variables as they are, then **Create and deploy**.

   Cloudflare deploys once straight away from `main`. That's expected and harmless: nobody uses the servers until the
   game is pointed at them, and an idle server costs nothing.
3. Open **ww3-servers → Settings → Build → Branch control**:
   - **Production branch:** `servers-live`
   - **Enable Preview Builds:** off
   - Save.

   From now on, server changes go live only when the `servers-live` branch changes, which happens only when you tap
   **Merge** on a pull request (see below).
4. *(Optional, for players behind very strict networks)* **Realtime → TURN Server → Create**, then copy the Key ID and
   API token into **ww3-servers → Settings → Variables and Secrets** as two **secrets** named `TURN_KEY_ID` and
   `TURN_KEY_API_TOKEN`. Without them the game skips TURN and uses the relay rooms instead.

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

## For developers

```
cd server && npm ci            # wrangler (devDependency, pinned in package-lock.json)
npx wrangler dev               # local server on http://127.0.0.1:8787
node ../orch/servertest.mjs    # protocol test (starts its own local server)
node ../orch/serverbench.mjs   # latency / CPU / usage projection
node ../orch/mpsync.mjs --server   # real game, host + client forced onto the relay
```

Files: `src/index.js` (Worker, GameRoom, Lobby, Budget), `src/route.js` (relay routing), `wrangler.toml`.
Never put secrets in these files; set them in the dashboard.
