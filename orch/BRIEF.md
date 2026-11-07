# BRIEF — one-page state of World War 3 (janitor, 2026-11-07 10:03Z = Sat 04:03 Chicago)

## What the game is now
Browser RTS in the style of C&C Generals, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only. Conquest is the only battle mode. The grand campaign is a Total War / EU4-style world map
above it: provinces, armies, empire economy, morale styles, real time with pause, AI nations that act on their own.
Battles are hosted on Cloudflare. Deadline: $75 studio-quality game by Sat 2026-11-07 20:00 Chicago; after 18:00 no new scope.

## Live since the last brief (main, roughly 07:00Z–10:00Z)
- Grand campaign: EU4 peace-deal screen (war score buys provinces, tribute, vassals), coalitions that join wars, research
  tracks + cabinet bonuses, propaganda war, trade nodes, chokepoint blockades, corruption, inflation with a Finance tab.
- World market: Grain / Metals / Wares goods with monthly prices and a bread subsidy (laneB B5b s3).
- Occupation fights back by morale style: resistance cells that spread to neighbouring land (laneA A6 s1–2).
- Armies that lose a battle retreat by morale style (laneF A3b s2). Path preview and Ctrl+click select-all-armies (A3 s2).
- Online grand campaign with friends: host a campaign, friends lead a nation (laneA A2b s1, host-authoritative).
- AI generals act on day ticks; army outliner (O) with multi-select; army squads and political owner colours on the map.
- Conquest: Middle East Conquest maps for Iraq, Syria, Jordan, Kurdistan, Oman, Yemen, Egypt, Turkey and Israel; OB and BI
  fictional factions; logistics stages 5b–10 (depots, ports, mines, bridge demolish and pontoons, airlift).
- Battle look: rifle squads show 4 soldiers, Command panel starts collapsed, Middle Eastern HQ and barracks fill their footprints.
- Player-facing names no longer use jargon (SAM → Anti-Air, ATGM → Anti-Tank, "MBT" removed).

## Lanes — current item (see orch/PLAN-SAT.md for the full list)
- **A — Grand engine:** A2b multiplayer grand campaign (slice 1 shipped; rest open); A3 smooth army control; A3b morale;
  A4 leftovers; A5b morale extras on the map.
- **B — Grand systems (EU4):** B5 trade nodes, B5b inflation/corruption/world market, B6 coalitions, B7 research shipped;
  next: the open RG items queued in PLAN-SAT (arms trade, pipelines, economy crash).
- **C — Look ($75 bar):** C0 UI kit (not started); C0b shortcuts; C2 grand map to ART-BAR ≥ 4.5; C3 UI skin; C4 battle graphics.
- **D — Content & QA:** D1b Balanced/Realistic slice 1 shipped; D2 first-time-player fixes (slice 5 shipped); D3 voices and
  anthems for the new nations (open); D4 auto-balancer; D5 cleanup; Middle East maps (D-ME) slices 1–2 shipped.
- **E — Battle look (laneE):** E1 real soldier model (partial: 4-soldier squads); E2 buildings (partial); E3 ground detail
  (open); E4 vehicle detail (open); E5 HUD readability (partial).
- **F — Battle rules & grand battles:** outliner and multi-select shipped; RG47–RG50 battle prep, objectives, sieges, pursuit queued.
- **G — Grand politics:** peace-deal screen, B5c propaganda, coalitions, RG8 achievements, RG17 holy sites and AY leader shipped;
  open: RG2 UN votes, RG4 elections, RG5 news, RG7 crises.
- **Vertical slice:** Middle East 2026 scenario (Gulf flashpoint, Red Sea crisis) is the start option; full quality first.

## Known bugs / player reports
- Open GitHub issues labelled `player`: none (checked via REST at 10:03Z).
- Open design item: 3-player maps (isolated start wins about 55%).
- Portraits stay off: the 40-portrait sheet failed the quality bar (orch/HANDOFF-portraits.md).
- Local smooth gate times out on the slow box; CI decides.

## Open PRs needing Abdullah
- **PR #24** main → servers-live: 3 new Middle East maps (+ other lane work). One-tap merge to deploy to Cloudflare battles:
  https://github.com/abdullahhaidar5-ux/ww3/pull/24

## Where to find things
- `CLAUDE.md` — rules, standing decisions, the build and gate commands.
- `orch/PLAN-SAT.md` — the central plan, lanes, the top unticked item per lane.
- `orch/SYSTEMS.md` — one owner per system (read before adding any system).
- `orch/HOWTO.md` — recipes: gate, adding a nation, adding a test, adding a grand panel.
- `orch/HISTORY.md` — what each run shipped (append only). `orch/ROADMAP.md` — status of big workstreams.
- `orch/ART-BAR.md` — the look bar. `orch/BUDGET.md` / `orch/KAIZEN.md` — usage limits and the kaizen loop.

## Build and gate (every change)
`python3 orch/build.py` → `node orch/smoke.mjs` (SMOKE PASS) → `node orch/smooth.mjs` (SMOOTH PASS). Commit src/ and index.html together.
