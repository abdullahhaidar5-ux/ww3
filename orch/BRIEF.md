# BRIEF — one-page state of World War 3 (janitor, 2026-11-07 06:57Z = Sat 00:57 Chicago)

## What the game is now
Browser RTS in the style of C&C Generals, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only (phones abandoned). Conquest is the only battle mode; the grand campaign is a Total War / EU4-style
world map above it (provinces, armies, empire economy, morale styles, real time with pause). Battles are hosted on Cloudflare.
Deadline: $75 studio-quality game by Sat 2026-11-07 20:00 Chicago. After 18:00 Chicago: no new scope.

## Live since the last brief (main, last ~3 h)
- Grand map: events and world crises, achievements, national missions, ledger graphs, great powers, diplomatic web, AI
  joins/peace/pacts (laneG, f02856e). Achievements now tick off in PLAN-SAT RG8.
- Army outliner (press O on the grand map) and multi-army select with Merge/Split (laneF, 53c5cc1).
- Force limit + army tradition, top-bar chip (laneA A5 slice 1, 4c37b53); real time with pause and marching armies that walk their road (laneA A2 slices 1–2).
- Stability with a Political-point raise, power points and national ideas, inflation + army upkeep slider with a Finance tab
  (laneB B4 s1–2, B3, B5b s1). War support meter with a Home front tab (laneB B4b).
- Development levels bought with capital points; grand-map shipping lanes and sea swell (laneB B5, laneC).
- Battle look: burning oil smoke columns, lasting wrecks as cover, Command panel starts collapsed, doctrine picker slimmed,
  bigger infantry at gameplay height (laneE RF14, RF16, E-slices).
- Balanced/Realistic lobby toggle in solo Conquest; Realistic start money by military tier (laneD D1b s1).
- "MBT" jargon removed from unit names (laneD D2 s3). Israel, Iraq and Syria gained real-geography Conquest maps (memaps, laneD).
- Bisect workflow names the first bad commit on a red gate (laneD D0a). "Report a problem" button (laneD D0d).
- PR #23 (main → servers-live, new nations) is merged; no servers-live PR is open.

## Lanes — current item (top unticked in orch/PLAN-SAT.md)
- **A — Grand engine & feel:** A2 real time with pause (slices 1–2 shipped; rest open); A2b multiplayer grand campaign;
  A3 smooth army control (slice 1 shipped); A3b army morale bar and retreats (slice 1 shipped); A4 grand3 leftovers; A5b morale extras; A6 hidden war.
- **B — Grand systems (EU4 mechanics):** B5c propaganda war (open); B4 stability and cores/estates shipped; B5 development
  shipped in slice 1; B5b economy slice 1 shipped.
- **C — Look ($75 bar):** C0 UI kit (not started); C0b studio-feel shortcuts; C2 grand map to ART-BAR ≥ 4.5; C3 UI skin; C4 battle graphics.
- **D — Content & QA:** D1b Balanced/Realistic slice 1 shipped; D2 first-time-player fixes (slice 3 shipped, continue);
  D3 voices and anthems for the new nations (open); D4 auto-balancer; D5 integration.
- **E — Battle units & look (laneE):** E1 real soldier model swap (open), then E2–E5 (E2–E3 partly shipped).
- **F — Battle rules & grand battles:** outliner and multi-select shipped; RG47–RG50 battle prep, objectives, sieges, pursuit queued.
- **G — Grand politics & world:** RG8 achievements shipped (f02856e); RG5 news, RG7 crises, RG2 UN votes, RG4 elections open.
- **Vertical slice:** the Middle East campaign ("Middle East 2026", Gulf flashpoint scenario) gets full quality first.

## Known bugs / player reports
- Open issues labelled `player`: none (checked via the GitHub REST API at 06:57Z).
- Open design item: 3-player maps (isolated start wins ~55%).
- Portraits stay off: the 40-portrait sheet failed the quality bar (orch/HANDOFF-portraits.md).
- Local smooth gate times out on the slow box; CI decides.

## Open PRs needing Abdullah
- None. PR #23 (main → servers-live, new nations) is merged.

## Where to find things
- `CLAUDE.md` — rules, standing decisions, the build and gate commands.
- `orch/PLAN-SAT.md` — the central plan, lanes, the top unticked item per lane.
- `orch/SYSTEMS.md` — one owner per system (read before adding any system).
- `orch/HOWTO.md` — recipes: gate, adding a nation, adding a test, adding a grand panel.
- `orch/HISTORY.md` — what each run shipped (append only). `orch/ROADMAP.md` — status of big workstreams.
- `orch/ART-BAR.md` — the look bar. `orch/BUDGET.md` / `orch/KAIZEN.md` — usage limits and the kaizen loop.

## Build and gate (every change)
`python3 orch/build.py` → `node orch/smoke.mjs` (SMOKE PASS) → `node orch/smooth.mjs` (SMOOTH PASS). Commit src/ and index.html together.
