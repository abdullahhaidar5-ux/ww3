# BRIEF — one-page state of World War 3 (janitor, 2026-11-07 16:00Z = Sat 10:00 Chicago)

## What the game is now
Browser RTS in the style of C&C Generals, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only. Conquest is the only battle mode. The grand campaign is a Total War / EU4-style world map
above it: provinces, armies, empire economy, morale styles, real time with pause, AI nations that act on their own.
Battles are hosted on Cloudflare. Deadline: $75 studio-quality game by Sat 2026-11-07 20:00 Chicago; no new scope after 18:00.

## Live since the last brief (main, 13:00Z–16:00Z)
- Nuclear programmes and a two-step grand-map strike, with fallout and sanctions (RG10 first cut, laneG).
- TV news lower-third fed by the event log, with fictional channels and anchors (RG5, laneG).
- Elections and refugees: democracies vote on war support and unrest; wars create refugees (RG4, laneG).
- Pipelines and grids: eight real lines, sabotage/guard/repair, oil price and income rows (RG24, laneB).
- Mobilisation, call-up and stand-down (RG34), plus arms trade tab (RG12).
- Army after-action report on the Fight-it result screen (laneF). Allied armies lift weaker ones' morale (A3b, laneF).
- Grand-map first-minute coach card (D5, laneD). Battle-map readability: soldiers larger, HQ compound with PBR props,
  tyre tracks and rocks, vehicle grime and mud (DE-BLOCK slices 1–4b, laneE).
- Towns sparser and megacity-only towers; grand-map oil rigs and political colours (laneC).
- Portraits round 3 asset-pack pipeline in art/portraits, flag OFF (portraits3).

## Lanes — current item (full list: orch/PLAN-SAT.md)
- **A — Grand engine:** A2b online grand campaign (slices 1–3 shipped, more open); A3 smooth army control (open); A3b morale bar
  + retreats (slices 1–2 and courage shipped, allied sharing new); A4 leftovers; A5 force limit + tradition (open); A6 occupation (slices 1–3).
- **B — Grand systems (EU4):** B5 trade nodes, B5b economy (inflation, corruption, world market, autonomy shipped); RG24 pipelines
  and RG34 mobilisation first cut; next: open RG items (mercenaries RG19, bases abroad RG46, economy crash RG61).
- **C — Look ($75 bar):** C0 UI kit not started; C2 grand map to ART-BAR ≥ 4.5 (C-LOOK de-block and C-TOWNS in progress);
  C3 UI skin; C4 battle graphics.
- **D — Content & QA:** D2 first-time-player fixes (slice 6); D3 voices and anthems for new nations (open); D4 auto-balancer
  slice 1 (tuning tool only); D5 cleanup (coach card shipped, slice 1); Middle East maps done (≥6 home maps per ME faction).
- **E — Battle look:** E1 soldiers (4-soldier squads); E2 buildings (ME HQ/barracks/factory, PBR roof and wall clutter);
  E3 ground detail (open: flat sand between objects); E4 vehicle wear (partial: grime, mud); E5 HUD readability (partial).
- **F — Battle & armies:** campaign-battle rules, ⚡31 quick battle, after-action report, cover overlay, weather, generals' speech.
- **G — Grand events & diplomacy:** RG5 TV, RG10 nukes, RG4 elections, RG7/RG43 crises, B6 claims, peace-deal screen shipped;
  open: RG16 peace conferences and RG44 demilitarised zones (DMZ not built yet).

## Known bugs and open items
- Player bug reports open: none (GitHub label `player`, checked 2026-11-07 16:00Z).
- Open design item: 3-player maps (isolated start wins about 55%).
- Smooth and grand gates can time out on the slow sandbox box; CI is the judge.
- Needs Abdullah: PR #24 (main → servers-live, Middle East maps) is open; merge it to put the maps into Cloudflare battles.

## Where to find things
- How to work and test: orch/HOWTO.md · the central plan: orch/PLAN-SAT.md · what each system owns: orch/SYSTEMS.md
- Standing decisions: CLAUDE.md · what shipped and when: orch/HISTORY.md · progress board: orch/ROADMAP.md
- Phone summary for Abdullah: orch/STATUS.md · this brief: orch/BRIEF.md
- Rule for every change: build.py → smoke.mjs (SMOKE PASS) → smooth.mjs (SMOOTH PASS) → commit src/ + index.html together.
