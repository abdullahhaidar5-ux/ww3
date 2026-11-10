# Handoff: safetyH (2026-11-10)
Done: (1) nightly balance workflow + report script; (3) replays already in main (08b-replay.js, orch/replaytest.mjs) — nothing to add; (4) report form with "Download report file" (src/08k-report.js).
Not done:
- (1) Battle mode and Realistic are not covered: orch/aitourney.mjs only runs Conquest Balanced (headless). Extend it, or add a tourney.mjs --real shard (browser) to the workflow.
- (2) "Check online play" on the Multiplayer screen (reach server, create/join test room, exchange ticks, compare NET_PV/server version → green/red sentence) and orch/friendnight.mjs (8-player headless match on the TEST relay/server, 3 min no-desync, wired into orch/cigate.sh). Reuse orch/cfclient.mjs / cfproxy.mjs / serverdev.mjs for the test-server plumbing.
- (4) Server endpoint: server/wrangler.toml has only Durable Object bindings (no KV/R2/D1). A report endpoint would need a new SQLite DO class (migration v3) in server/src/index.js; deploying goes through autodeploy (servers-live), no secret needed. Left out: needs simulation-file/server review first. Until then players send the downloaded file on Discord.
Abdullah only: nothing required. The nightly workflow runs from main once merged (Actions → Nightly balance → Run workflow to test it; the first run creates the `reports` branch).
