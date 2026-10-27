# ORCH log

Newest first. One entry per cycle: date/time (Chicago), what shipped, what failed or was rolled back, gate results.

## 2026-10-27 04:24 → 07:27 — cycle 8

- Waited 5 min on cycle 7's lock (released 09:29 UTC), took it; extended once. Baseline: `--check` OK, SMOKE PASS.
  Side lanes held 02-map, 04-gfx, 05-fx3d, 08-ui, 10-post, 11-models, smoke/mpsync → dispatched 3 squads.
- Shipped: Audio (region music for US, TR, IL, EU, UA, RU, CU + US/EU Navy Band anthems, `mus/we.mp3`), Battlefield
  (balance round 2: AI vehicle share, prices, `tourney.mjs --swap`), Netcode (faster host takeover, own Conditions
  restored). Fresh review: no blockers; fixed its should-fix (standby gave up takeover for good after a brief network
  error) and bumped NET_PV 5 → 6 for the price changes. Other notes → backlog.
- Side lane shipped bottom bar + phone speed onto main mid-cycle; merged it, reran the gate. `migrate.mjs` then failed
  2/3 at "clients did not settle after the pre-takeover screenshot" (the test freezing the host) → gave it the same
  watchdog guard `mpsync.mjs` got; passes both modes.
- Gate (after merge): `--check` OK, smoke 4p PASS, MPSYNC PASS, MIGRATE PASS, MIGRATE --abrupt PASS, artifact smoke
  PASS, artifact MPSYNC PASS. Artifact republished v161 (+`mus/we.mp3`, `an_US.mp3`, `an_EU.mp3`).
- Chaining the next cycle was blocked (permission denied for running the scheduled task on demand); the 4-hourly
  schedule (next 13:24 UTC) picks it up.

## 2026-10-27 07:40 — side lane: bottom command bar + faster phone start shipped

- Merged `orch/bottom-bar` (3d854c4, includes `orch/speed-ship`) onto main (cycles 6–7 + servers); one conflict in
  `orch/mpsync.mjs` resolved keeping both sides (wait for loading screens + wiped-out client skip, and `--server` mode).
- Gate: `--check` OK, smoke 4p PASS, MPSYNC PASS, MAPSWEEP PASS (71 battles), artifact smoke PASS, artifact MPSYNC PASS.
- Follow-ups → backlog: client reconnect state wrong (Multiplayer P1), phone portrait build grid clipped (UI).
- Graphics Phase 1 is now unblocked.

## 2026-10-27 01:24 → 04:30 — cycle 7

- Waited 76 min on cycle 6's lock; it expired 06:40 UTC with no commits, so took it. Baseline: `--check` OK, SMOKE PASS.
- Dispatched 3 squads (Audio, Netcode, Battlefield; side lanes held the rest). Cycle 6 was in fact still running and
  landed a gated branch doing the same Netcode + balance items → shipped cycle 6's reviewed branch
  (`orch/2026-10-27-cycle6`) and dropped cycle 7's duplicate Netcode/Battlefield branches (local only, not pushed).
  Audio was unique → merged: Asian war music for PK, IN, CN, KP, KR.
- Gate: `--check` OK, smoke 4p PASS, MPSYNC PASS, MIGRATE PASS, artifact smoke PASS, artifact MPSYNC PASS.
  Sim/net diff already fresh-reviewed in cycle 6; audio is client-only. Artifact republished v159 (+`mus/as.mp3`).
- Lesson (again): an expired lock isn't proof the holder stopped. Holders should extend `expires` when a run goes long.

## 2026-10-26 21:40 → 2026-10-27 03:05 — cycle 6 — NOT shipped, gated on branch `orch/2026-10-27-cycle6`

- Waited 75 min on cycle 5's lock, took it 02:40 UTC. Baseline: `--check` OK, SMOKE PASS. Side lanes held 02-map,
  04-gfx, 05-fx3d, 08-ui, 10-post, 11-models, 09-audio, mpsync/smoke → dispatched 3 squads only.
- The balance agent's full tourneys ran ~4.8 h, so the lock expired and cycle 7 took it (06:40 UTC); didn't ship over it.
- Branch `orch/2026-10-27-cycle6` (on top of 14e53a0): balance round 1 (01-data, mkAI wave fix), host's Conditions
  reach clients + no fog explosions (07-net, review fixes applied, NET_PV 5), new `orch/migrate.mjs`, backlog
  Done/new items, ORCH.md gate adds migrate. Fresh review: no blockers. Gate on the branch: `--check` OK, smoke 4p
  PASS, MPSYNC PASS, MIGRATE PASS, artifact smoke PASS, artifact MPSYNC PASS.
- **Next cycle (or cycle 7 before it ships):** merge `orch/2026-10-27-cycle6` first (conflicts only in BACKLOG if
  any), rerun the gate, push, republish the artifact. Don't redo balance round 1 / Conditions / fog leak.
- Lesson: cap tourney runs in a brief at ~90 min (`--games`, `--jobs`) so a cycle fits inside its 4 h lock.

## 2026-10-27 00:10 — side lane: cloud servers code shipped (switched off)

- Merged `orch/servers-ready` (be6a1a8) onto main: `server/` Worker `ww3-servers` (game list, relay rooms placed near
  the host, optional TURN logins, `/health`, free-plan guard) + game-side fallback direct → TURN → relay.
  `WW3_SERVER_URL` stays empty, so players see no change until the servers are live.
- Gate: `--check` OK, smoke 4p PASS, MPSYNC PASS, artifact smoke PASS, artifact MPSYNC PASS.
- Created branch `servers-live` at a986fb6 and opened PR "Put multiplayer servers live" (`main` → `servers-live`);
  Abdullah does the one-time Cloudflare import, then taps Merge (backlog [ask]).

## 2026-10-26 17:56 → 21:40 — cycle 5

- Took the run-lock (extended once to 05:19 UTC). Baseline: `--check` OK, SMOKE PASS.
- Shipped 4 squads: Battlefield (AI blowout fix: 3-min power lull + AI build fixes), Netcode (units leaving sight
  dropped at once — fixes stale-infantry MPSYNC flake), Visuals (Dusk + Random conditions, haze reset), QA
  (`orch/tourney.mjs`). Fresh review of 01-data/03-sim/07-net: nothing blocking; fixed its perf note (snapDrops
  'just died' set built once per update); fog-leak + AI-migration notes → backlog.
- Gate: `--check` OK, smoke 4p PASS, MPSYNC PASS (×2), artifact smoke PASS, artifact MPSYNC PASS. Artifact republished
  v157 with ck/pong topics. Outside commits meanwhile (side lanes: servers, audio plan, board) were docs/plans only.

## 2026-10-26 18:00 — cycle 4

- Waited 80 min on cycle 3's lock (expired 18:40 UTC, no commits), then took it. Baseline: `--check` OK, SMOKE PASS.
- Dispatched 4 squads (artifact build, AI navy, dust/ricochet, national music). Three duplicated the parallel cycle's
  gated branch `orch/2026-10-26-parallel-v2`, which landed meanwhile; shipped that reviewed branch instead and kept
  cycle 4's duplicates only as local worktree branches (not pushed). Audio work was unique → merged.
- Shipped: parallel-v2 (artifact build, MP reconnect fix, AI navy, dust trails + ricochet sparks) + national music.
- Gate: `--check` OK, smoke 4p PASS, MPSYNC PASS, artifact smoke PASS, artifact MPSYNC PASS. Sim/net diff was
  already fresh-reviewed on parallel-v2 (2 navy bugs fixed there); audio is client-only → no new review.
- claude.ai artifact republished (v155) without `capabilities` (ck/pong topics still to open — backlog).
- Lesson: overlapping cycles wasted ~3 agent-hours. ORCH.md step 8 now includes the artifact gate.
- 2026-10-26 17:55 — skipped: cycle already running (cycle 4 held the run-lock, extended to 00:41 UTC; waited 90 min from 16:25).

## 2026-10-26 16:20 — parallel cycle (fired 08:24, before the run-lock existed) — NOT shipped, waiting on branch

- Skipped shipping: cycle 4 holds the run-lock. Finished, gated work is on branch `orch/2026-10-26-parallel-v2`
  (based on ff17ba8): `build.py --artifact` + `orch/ARTIFACT.md` (artifact edition from `src/`, Abdullah's top
  request), reconnecting MP player gets their army back (`07-net` one line), AI builds and uses a navy on water maps,
  dust trails behind fast vehicles + ricochet sparks on armour. Fresh review of 03-sim/07-net: no desync; 2 navy-AI
  bugs found and fixed. Gate: `--check` OK, smoke 4p PASS, MPSYNC PASS (1 known stale-infantry fail, pass on rerun),
  artifact smoke + MPSYNC PASS. Its phone pass was dropped — the side lane shipped the same.
- Next cycle: merge that branch first (fast-forward-able onto ff17ba8), then republish the artifact per ARTIFACT.md.

## 2026-10-26 15:10 — side lane (Abdullah: "proceed with everything that doesn't need my input")

- Ran beside ORCH cycles 3–4 on squads they couldn't reach this round: Interface (phone-playability + settings) and
  Maps (map sweep + previews). Added continuous mode + run-lock to ORCH.md; extended cycle 3's lock one hour.
- Shipped: phones can play end to end; bases always on dry ground, Fulda river fix, faster 8-player map load;
  `orch/mapsweep.mjs`; minimap "send units" setting fixed.
- Gate on the combined build: `--check` OK, smoke 4p PASS, MPSYNC PASS. Maps-only build: MPSYNC failed once with the
  known stale-infantry issue (10 host infantry left on the client) — same symptom as the open Netcode item.
- Found: AI blowouts (losing AI stalls at ~$300), desktop left-click deselects instead of moving, 28 maps not 10.
- Cycle 3 (fired 08:40) never pushed or logged; cause unknown.

## 2026-10-26 07:50 — sweep (Abdullah: "find all agents and improvements across my chats and organize them")

- Swept every scheduled task, artifact, branch and the repo history. Only ORCH is active; ≈45 old round tasks all
  retired; Daily News/Email briefers are not game agents. Indexed it all by squad at the end of `HISTORY.md`.
- Corrections: Golden hour/Overcast conditions and map thumbnails already exist (backlog items → [check]);
  `tw8b.py`, `p2pmig.py`, `probe.py` survive on `testbed` (linked from the mpsync item); claude.ai artifact is 4
  features behind `main`. Added "dust trails" item.
- New: Command Board (`orch/board.py` → claude.ai/artifact/UENjCQzdzHCzYmqQQEuJLx), refreshed by ORCH every cycle
  (ORCH.md step 9). No game code touched.

## 2026-10-26 — cycle 2

- Baseline: build in sync, `SMOKE PASS`. No requests waiting at plan time; Abdullah's answers + the artifact-sync
  request landed on `main` mid-cycle (docs only) and were merged in.
- Shipped: always-a-winner fix (Battlefield), naval wakes (Visuals, small hook in `06-view`), menu music (Audio),
  browser lock for the test gate (QA).
- Review (03-sim): no issues.
- Gate: `--check` OK, smoke 2p PASS after each merge, smoke 4p PASS. MPSYNC failed once (4 stale host infantry on
  the client after leaving its vision; no net code touched this cycle), passed on baseline and on rerun → logged as
  a Netcode item, not treated as fixed.
- Not done: claude.ai artifact sync — needs `build.py --artifact` (room transport instead of PeerJS) first; top
  request for next cycle. Artifact NOT republished this cycle.

## 2026-10-26 — cycle 1

- Baseline: build in sync with live, `SMOKE PASS`. No requests from Abdullah waiting.
- Shipped: multiplayer sync test `orch/mpsync.mjs` (QA) now in the gate; helicopter rotor wash (Visuals; one-line
  hook in `06-view`).
- Checked, no change needed: stuck/idle units in long games (Battlefield), per-nation music (Audio).
- Gate on shipped main: `--check` OK, smoke 2p PASS, smoke 4p PASS, MPSYNC PASS. No sim/net code touched → no review.
- New backlog: Rivers all-surrender draw, music polish/recorded scores, menu music, mpsync extensions, gate OOM.

## 2026-10-25 20:30 — ORCH set up

- Gathered every past WW3 agent (≈45 scheduled rounds across runs #0–#5, Oct 18–23), the `testbed` branch and the
  live build into `orch/HISTORY.md`. No old loops are still scheduled.
- Recovered the game sources from the live `index.html` into `src/` (12 modules, byte-identical rebuild). The repo
  is now the single source of truth; `orch/build.py` builds, `orch/smoke.mjs` gates.
- Gate: baseline `SMOKE PASS` — 3 players (IR vs US vs CU) on Strait, 4 game-minutes, peak 46/25/22 entities.
- `testbed` netcode work found ~95% merged into live; left in place, review queued in the backlog.
- Organized all open ideas and Abdullah's standing decisions into `orch/BACKLOG.md` and `CLAUDE.md`.
