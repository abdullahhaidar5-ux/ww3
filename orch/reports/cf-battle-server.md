# Cloudflare-hosted battles: server side (side lane, 2026-10-27/28)

Branch `orch/stage2-dedicated`; tested merged with the browser client in `orch/cf-e2e`.

**Works end to end** (`node orch/cfbattle.mjs`: real BattleRoom in local `wrangler dev`, two Chromium pages):
busy → browser hosts instead; lobby, join by code, teams + computer player; Start held until both loading screens
close; orders from both sides; pages match the server's view; reconnect in under 1 s; object evicted (as on a
redeploy) → battle picked up from its checkpoint, players back on it, still in sync; day past 75% → server hands
over, standby page hosts `-m1`, the other follows. **CFE2E PASS** locally and on GitHub's runners.

Server changes: wait for loading screens (`rd`, per side); one sim step per timer callback; info() only at battle
end; answer a player's close at once (was a 5 s stall); local-only test controls (`TEST_HOOKS=1`, 404 on Cloudflare).
Battle list stays in its own `b|` frame (today's list untouched); the client now reads `b|`.

**CPU per event** (1 step + send loop, Node): 2 sides p50 0.17 / p99 4.3 / max 15 ms (avg 0.47 ms); 8 sides p50
0.93 / p99 4.5 / max 15 ms (avg 1.4 ms). Local workerd: p50 1–2 ms, p99 3 ms.

**CIGATE** (`fcad540` this branch; `fc6256a` merged): all pass except the three known migrate tests on this branch
(on the merged branch only `migrate` fails); mapsweep PASS. `cfclient` slot =
SKIP here, CFE2E PASS merged.

**Left before players can use it:** ship server + client to `main`; Abdullah merges `main → servers-live`; run
`/battle-bench?players=8&batch=1` on the live Worker for real free-plan CPU; set `WW3_SERVER_URL`.
