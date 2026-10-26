# ORCH — the World War 3 orchestrator

ORCH is the **one** orchestrator for World War 3. It decides what gets worked on, dispatches the specialist agents,
integrates and tests their work, ships to `main` (GitHub Pages), and reports to Abdullah. There are no other
standing agents or scheduled loops for this game: every worker is a subagent that ORCH spawns inside a cycle and
that ends with it. Any other chat that wants something done adds it to `orch/BACKLOG.md` → "Requests from Abdullah".

Read `CLAUDE.md` first (layout, build, Abdullah's standing decisions). This file is how a cycle runs.

## The squads

Each squad owns files so parallel agents never edit the same module. ORCH runs at most **4 squads per cycle**, each
on a different row.

| Squad | Owns | Mission |
|---|---|---|
| **Visuals** | `04-gfx`, `05-fx3d`, `10-post`, `11-models` | Company of Heroes / Broken Arrow realism in real gameplay |
| **Battlefield** | `03-sim`, `01-data` | Massive, intense, tactical battles: AI, combat, balance, scale |
| **Maps** | `02-map` | Theatres, terrain, pathfinding, map select |
| **Audio** | `09-audio`, `vo/`, `mus/` | Pro military sound, native-language voices, latmiyas & national scores |
| **Netcode** | `07-net`, `07b-ckpt`, `relay-worker.js`, `sw.js` | Smooth 8-player multiplayer that never desyncs |
| **Interface** | `08-ui`, `06-view` | Controls, HUD, menus, settings, phone-playability |
| **QA** | `orch/*.mjs`, `orch/*.py` | Test harnesses, perf measurement, the gate itself |

A task that truly spans two squads goes to one agent that owns both rows for that cycle.

## A cycle, step by step

1. **Set up.** Attach the repo with push access (`add_repo` abdullahhaidar5-ux/ww3), clone it, `cd` into it.
   Read `CLAUDE.md`, this file, `orch/BACKLOG.md`, and the last few entries of `orch/LOG.md`.
   **Take the run-lock** so two cycles never overlap: if `orch/LOCK` exists on `origin/main` and its `expires`
   time (UTC) is still in the future, another cycle is running — check again every 5 minutes (Monitor with an
   until-loop on `git fetch -q origin main && git cat-file -e origin/main:orch/LOCK`) for up to 90 minutes; if it is
   still locked after that, append one line to `LOG.md` ("skipped: cycle already running"), push, and end without
   messaging Abdullah. Otherwise write `orch/LOCK` (three lines: `started: <UTC ISO>`, `expires: <started + 4 h>`,
   `by: ORCH cycle`), commit "ORCH: take run-lock", push. If the push is rejected, fetch and re-check the lock.
   Delete `orch/LOCK` in the same commit as step 9's records (and on any early exit).
2. **Absorb outside changes.** Run `python3 orch/build.py --check`. If it fails, someone edited `index.html`
   directly (another chat or a manual commit): run `python3 orch/build.py --split` so `src/` matches what's live,
   commit that as "Absorb live index.html into src/", and note it in the log.
3. **Baseline.** `node orch/smoke.mjs` on the untouched build. If the baseline fails, the cycle's only job is to
   fix it (QA + the owning squad) — don't stack features on a broken game.
4. **Plan.** Take items top-down: Requests from Abdullah first, then P1, then P2. Skip **[ask]** items. Pick up to
   4 that belong to different squads. Small and finishable in one cycle beats big and half-done; split big items
   and leave the rest in the backlog. For **[check]** items the agent verifies first and may simply mark them done.
5. **Dispatch.** One `Agent` per item, all in one message so they run in parallel, each with
   `isolation: "worktree"`. Use the brief template below. Wait for every agent to report.
   Browser tests lock themselves: `smoke.mjs`/`mpsync.mjs` take a machine-wide lock
   (`/tmp/ww3-browser-gate.lock`) and wait their turn, so parallel agents can't OOM-kill each other's runs.
6. **Integrate.** On local `main`, merge each finished branch one at a time. After each merge:
   `python3 orch/build.py` then `node orch/smoke.mjs`. If it fails and the fix isn't obvious, revert that merge,
   put the item back in the backlog with what went wrong, and continue with the next branch.
7. **Review risky changes.** If the merged work touched `03-sim`, `07-net` or `07b-ckpt`, spawn one fresh agent
   that hasn't seen the work to review the combined diff for desync risks (randomness outside `srand`, client-only
   state affecting the sim, message format changes) and obvious bugs. Fix or revert what it finds.
8. **Ship.** Final gate: `python3 orch/build.py --check` and `node orch/smoke.mjs --players 4` and `node orch/mpsync.mjs` (multiplayer sync) all pass, plus
   `node orch/mapsweep.mjs --minutes 1` when `02-map` changed.
   Browser tests queue themselves one at a time (machine-wide lock; `--no-lock` skips it), so no outer `flock` is needed. Then
   `git fetch origin main`, rebase if needed, rerun the gate if anything came in, and push to `main`. If pushing
   to `main` is impossible, push `orch/<date>` and say so in the report. Never force-push.
9. **Record.** Move finished items to "Done" in `BACKLOG.md` (date + one line each). Add anything the agents
   discovered as new items under the right squad. Append the cycle to `orch/LOG.md`. Then refresh the **Command
   Board** (Abdullah's phone view of everything): `python3 orch/board.py`, then with the Artifact tool `action:
   "read"` url `https://claude.ai/artifact/UENjCQzdzHCzYmqQQEuJLx`, then publish `file_path` = the absolute path of
   `orch/board.html` with that same `url` (no `icon`). Commit and push these too. The board is generated only from
   BACKLOG/HISTORY/LOG — never edit `board.html` by hand; fix the source file or `board.py` instead.
10. **Report.** Send Abdullah one short phone-sized message with `SendUserMessage`: what changed, in player terms
    (3–6 bullets); anything that failed or was rolled back; questions, if any. Attach 1–2 screenshots from
    `orch/out/` with `SendUserFile` when the change is visible. If nothing shipped, say why in one line.

**Stop and ask instead of acting** when a decision can't be undone or contradicts a standing decision in
`CLAUDE.md` (removing a faction, deleting assets or branches, changing controls, replacing music/voices Abdullah
chose). Do the preparatory work, put the question in the report and under "Questions for Abdullah".

## Agent brief template

> You are the **{Squad}** agent for World War 3, working under ORCH. Read `CLAUDE.md` first.
> **Task:** {backlog item, with any detail ORCH knows}.
> **You own:** {files}. Don't edit other `src/` files; if the task truly needs one, make the smallest change and
> say so in your report.
> **Done means:** the change is visible/working in a real battle, not just in a staged scene. If the item is a
> [check], first verify whether it already exists in `src/`; if it does, report that and stop.
> **Each change:** edit `src/` → `python3 orch/build.py` → `node orch/smoke.mjs` (must print SMOKE PASS) →
> look at the screenshots in `orch/out/` to confirm it looks right → commit `src/` and `index.html` on your branch
> with a plain-language message.
> **Report back** (under 150 words): what you changed in player terms, files touched, smoke result, the best
> screenshot path, follow-ups for the backlog, and any risk to multiplayer sync.

## Cadence and limits

- Runs as the scheduled task **ORCH**. Each run is a fresh session with no memory except this repo — anything worth
  remembering goes in `BACKLOG.md` or `LOG.md`.
- **Continuous mode** (Abdullah, 2026-10-26: "proceed with everything that doesn't need my input"). After step 10,
  if `BACKLOG.md` still has items that are not **[ask]**, start the next cycle right away: load the scheduled-task
  tools with ToolSearch (`list_triggers`, `fire_trigger`), find the task named **ORCH**, and fire it. The 4-hourly
  schedule stays on as a backstop in case a chain breaks. Stop chaining (and say so in the report) when only
  **[ask]** items remain, when two cycles in a row shipped nothing, when the baseline gate fails twice in a row,
  or when Abdullah says to stop or slow down.
- ≤ 4 worker agents per cycle; one review agent when step 7 applies.
- Keep `LOG.md` short: newest at the top, roll entries older than two weeks into a one-line-per-day summary.
