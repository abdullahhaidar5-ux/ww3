# BRIEF — one-page state of World War 3 (janitor, 2026-11-07 03:55Z = Fri 21:55 Chicago)

## What the game is now
Browser RTS in the style of C&C Generals, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only (phones abandoned). Conquest is the only battle mode; the grand campaign is a Total War / EU4-style
world map above it (provinces, armies, empire economy, morale styles, real time with pause). Battles are hosted on Cloudflare.
Deadline: $75 studio-quality game by Sat 2026-11-07 20:00 Chicago (02:00Z Sun). After 18:00 Chicago: no new scope.

## Live since the last brief (main, last ~3 h)
- Grand map events and world crises, diplomatic web, AI peace/pacts/joins, great powers, achievements, missions, ledger graphs
  (laneG, 13o–13u).
- Nation panel: stability (-3..+3) with a Political-point raise, ⚖ tab (laneB B4 slice 1, 13m-grandstab.js).
- Power points and national ideas on the grand map (laneB B3, 13l).
- Battle declutter: one command strip, Auto-build chip, "Decoy" unit labels (declutter2).
- Bisect workflow: a red gate on main gets bisected and the first bad commit commented (laneD D0a).
- Earlier today: new nations first cut (Taiwan, Philippines, Vietnam, Indonesia, Thailand, Kazakhstan, Afghanistan, Oman,
  Algeria, Morocco, Nigeria, South Africa, Ethiopia, Libya, Sudan; Japan playable), street-grid towns, menu quick-start row.
- Also live: the Fight-it live battle loads from the grand map and is covered by the grandlive gate (laneA A1).

## Lanes — current item (top unticked in orch/PLAN-SAT.md)
- **A — Grand engine & feel:** A2 real time with pause (slice 1 shipped: date, speeds, pause, arrivals); A2b multiplayer
  grand campaign; A3 smooth army control; A3b army morale bar and retreats.
- **B — Grand systems (EU4 mechanics):** B4 stability (slice 1 shipped; cores and estates remain); B4b war support; B5 development
  and trade nodes; B5b EU4-level economy; B5c propaganda war.
- **C — Look ($75 bar):** C0 UI kit (not started); C0b studio-feel shortcuts; C2 grand map to ART-BAR ≥ 4.5; C3 UI skin; C4 battle graphics.
- **D — Content & QA:** D0 free-compute tooling (lint, HOWTO seed, Report button and bisect shipped; remaining item open);
  D1b Balanced/Realistic lobby toggle (not confirmed in code yet); D2 first-time-player fixes (slices 1–2 shipped);
  D3 voices and anthems for the new nations (open); D4 auto-balancer; D5 integration.
- **E — Real-looking battle units & world (laneE):** infantry bigger at gameplay height shipped; E1 real model swap open,
  then E2–E5.
- **Vertical slice:** the Middle East campaign ("Middle East 2026") gets full quality first.

## Known bugs / player reports
- Open issues labelled `player`: none at 03:55Z (checked via GitHub).
- Open design item: 3-player maps (isolated start wins ~55%).
- Unverified: whether the new Balanced/Realistic lobby toggle (D1b) is in the code; the commit that cites it only touched
  CLAUDE.md and PLAN-SAT.

## Open PRs needing Abdullah
- #23 `main → servers-live` "new nations (sim changes in 01-data)": merge it so Cloudflare battles get the new nations.
  https://github.com/abdullahhaidar5-ux/ww3/pull/23

## Where to find things
- `CLAUDE.md` — rules, standing decisions, the build and gate commands.
- `orch/PLAN-SAT.md` — the central plan, lanes, the top unticked item per lane.
- `orch/SYSTEMS.md` — one owner per system (read before adding any system).
- `orch/HOWTO.md` — recipes: gate, adding a nation, adding a test, adding a grand panel.
- `orch/HISTORY.md` — what each run shipped (append only). `orch/ROADMAP.md` — status of big workstreams.
- `orch/ART-BAR.md` — the look bar. `orch/BUDGET.md` / `orch/KAIZEN.md` — usage limits and the kaizen loop.

## Build and gate (every change)
`python3 orch/build.py` → `node orch/smoke.mjs` (SMOKE PASS) → `node orch/smooth.mjs` (SMOOTH PASS). Commit src/ and index.html together.
