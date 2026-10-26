# ORCH log

Newest first. One entry per cycle: date/time (Chicago), what shipped, what failed or was rolled back, gate results.

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
