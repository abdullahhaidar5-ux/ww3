# BRIEF — one-page state of World War 3 (janitor, 2026-11-07 00:55Z)

## What the game is now
Browser RTS in the style of C&C Generals, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only (phones abandoned). Conquest is the only battle mode; the grand campaign is a Total War / EU4-style
world map above it (provinces, armies, economy, morale styles, real-time with pause). Battles are hosted on Cloudflare.
Deadline: $75 studio-quality game by Sat 2026-11-07 20:00 Chicago (02:00Z Sun). After 18:00 Chicago: no new scope.

## Live since yesterday (last ~3 h on main)
- New nations, first cut: Taiwan, Philippines, Vietnam, Indonesia, Thailand, Kazakhstan, Afghanistan, Oman (nations-b1),
  Algeria, Morocco, Nigeria, South Africa, Ethiopia, Libya, Sudan (nations-b2). Voices and anthems still open (D3).
- Japan (JP) playable, first cut (laneD D1).
- Menu quick-start row and compact nation list; first-time-player audit tool (`orch/newplayer.mjs`) with hover hints (laneD D2, slice 1).
- Street-grid settlements replace the boxy towns: hip, gable, row and courtyard meshes (laneC, cbbd5d78).
- Earlier today: battle plans, battle groups, doctrines, trenches, wildfires, navy stealth/mines, save games, Middle East maps.

## Lanes — current item (top unticked in orch/PLAN-SAT.md)
- **A — Grand engine & feel (Opus):** A1 "live battle never loads" (top); then A2 real-time pause, A3 army control.
  No new commits in the last 3 h.
- **B — Grand systems, EU4 mechanics (Sonnet):** B1 realistic start (top); then B2 nation panel, B2.5 modifier engine.
- **C — Look at $75 (Sonnet):** C0 UI kit (top); C0b studio-feel shortcuts (Blue Marble map, painterly filter, zoom into battle).
  Last ship: street-grid settlements.
- **D — Content & QA (Sonnet):** D2 first-time-player confusions (slice 1 shipped, more remain); D3 voices + anthems
  for the new nations (open); D4 auto-balancer; D5 integration.
- **Vertical slice (PLAN-SAT):** the Middle East campaign ("Middle East 2026") gets full quality first.

## Known bugs / player reports
- Open issues labelled `player`: none at 00:55Z.
- Open known bug from the plan: A1 (the live Fight-it battle never loads from the grand map).
- Open design item: 3-player maps (isolated start wins ~55%).

## Open PRs needing Abdullah
- #23 `main → servers-live` "new nations (sim changes in 01-data)": merge it so Cloudflare battles get the new nations.
  https://github.com/abdullahhaidar5-ux/ww3/pull/23

## Where to find things
- `CLAUDE.md` — rules, standing decisions, the build and gate commands.
- `orch/PLAN-SAT.md` — the central plan, four lanes, the top unticked item per lane.
- `orch/SYSTEMS.md` — one owner per system (read before adding any system).
- `orch/HOWTO.md` — recipes: gate, adding a nation, adding a test, adding a grand panel.
- `orch/HISTORY.md` — what each run shipped (append only). `orch/ROADMAP.md` — status of big workstreams.
- `orch/ART-BAR.md` — the look bar. `orch/BUDGET.md` / `orch/KAIZEN.md` — usage limits and the kaizen loop.

## Build and gate (every change)
`python3 orch/build.py` → `node orch/smoke.mjs` (SMOKE PASS) → `node orch/smooth.mjs` (SMOOTH PASS). Commit src/ and index.html together.
