# BRIEF — one-page state of World War 3 (janitor, 2026-11-07 19:00Z = Sat 13:00 Chicago)

## What the game is now
Browser RTS in the style of C&C Generals, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only. Conquest is the only battle mode. The grand campaign is a Total War / EU4-style world map
above it: real-world proportional map, provinces, armies, empire economy, morale styles, real time with pause, AI nations
that act on their own. Battles are hosted on Cloudflare. Deadline: $75 studio-quality game by Sat 2026-11-07 20:00 Chicago;
no new scope after 18:00 Chicago.

## Live since the last brief (main, 16:00Z–19:00Z)
- Grand map ships in proportion to the real world (Equal Earth, laneC 99629b2); collision-culled labels and army plates.
- Observer mode: "Observer — watch the AI run the whole world" in the new-campaign nation list (⚡28, laneF).
- Battle start fear: armies battered on the grand map start Fight-it battles shaken; fades like normal fear (A3b, laneF).
- Allied armies lift a weaker one's morale up to +3 a month (A3b, laneF).
- Battle lobby restyled with a shared kit: flags, morale rows, invite card, map facts, ready countdown (lobbies2).
- Facade windows, doors and lamps on base buildings (DE-BLOCK slice 7, laneE).
- Logistics stages 5b–10 on main: depots and ports on the road network, road mines and checkpoints, bridge demolish/rebuild,
  port blockade, airlift, AI use, road art per theme (conquest-finish / logistics3).
- Command points tuned to 0.8 per calm town, so AIs stop reaching powers too early (conquest-finish).
- Towns: regional architecture for Middle East, Europe/snow and Korea; one mesh per town (towns-look).
- Nuclear programmes and grand-map strikes, TV news, elections and refugees, pipelines, mobilisation, arms trade (laneG, laneB).

## Lanes — current item (full list: orch/PLAN-SAT.md)
- **A — Grand engine:** A2b online grand campaign (slices 1–4 shipped; friends' battles and events now answered on their own
  map); A3 smooth army control (open, perf test 150 armies passes); A3b morale bar + courage + allied sharing (shipped);
  A5 force limit + tradition (open); A6 occupation (slices 1–3).
- **B — Grand systems (EU4):** B5b economy (inflation, corruption, autonomy shipped); RG24 pipelines and RG34 mobilisation
  first cut; next: open RG items (mercenaries RG19, bases abroad RG46, economy crash RG61).
- **C — Look ($75 bar):** C-LOOK de-block and C-TOWNS in progress (grand map proportional now); C0 UI kit not started;
  C3 UI skin; C4 battle graphics.
- **D — Content & QA:** D2 first-time-player fixes (slice 6, Balance mode spelled out in lobby); D3 voices and anthems for
  new nations (open); D4 auto-balancer slice 1 (tuning tool only); D5 cleanup (coach card shipped); Middle East maps done.
- **E — Battle look:** E1 soldiers (4-soldier squads, partial); E2 buildings (HQ compound, roof and wall clutter shipped);
  E3 ground detail (open); E4 vehicle wear (grime and mud shipped); E5 HUD readability (partial).
- **F — Battle & armies:** campaign-battle rules, quick battle, after-action report, observer mode, fear-start courage.
- **G — Grand events & diplomacy:** RG5 TV, RG10 nukes (first cut, travel time), RG4 elections, RG7/RG43 crises, RG2 UN
  council shipped; open: RG16 peace conferences, RG44 demilitarised zones.

## Known bugs and open items
- Player bug reports open on GitHub (label `player`): none (checked 2026-11-07 19:00Z via REST).
- Local gate failures seen by lanes, not reproduced in CI: a pre-existing NaN-geometry console error (smoke FAIL on the
  facade-window slice, also on unchanged main), and a manpower NaN in the 15-turn grandtest AI run (red on main). Owners:
  whoever touched 11-models.js / 13-grand economy — look before the next ship.
- Smooth and grand gates can time out on the slow sandbox box; CI is the judge.
- 3-player maps: the isolated start wins about 55% (open design item).

## Needs Abdullah
- PR #24 (main → servers-live, Middle East maps + other lane work) is still open:
  https://github.com/abdullahhaidar5-ux/ww3/pull/24 — merge it so Cloudflare battles get the new maps and sim changes.

## Where to find things
- How to work and test: orch/HOWTO.md · the central plan: orch/PLAN-SAT.md · what each system owns: orch/SYSTEMS.md
- Standing decisions: CLAUDE.md · what shipped and when: orch/HISTORY.md · progress board: orch/ROADMAP.md
- Phone summary for Abdullah: orch/STATUS.md · this brief: orch/BRIEF.md
- Rule for every change: build.py → smoke.mjs (SMOKE PASS) → smooth.mjs (SMOOTH PASS) → commit src/ + index.html together.
