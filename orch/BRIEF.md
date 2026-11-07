# BRIEF — one-page state of World War 3 (janitor, 2026-11-07 13:05Z = Sat 07:05 Chicago)

## What the game is now
Browser RTS in the style of C&C Generals, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only. Conquest is the only battle mode. The grand campaign is a Total War / EU4-style world map
above it: provinces, armies, empire economy, morale styles, real time with pause, AI nations that act on their own.
Battles are hosted on Cloudflare. Deadline: $75 studio-quality game by Sat 2026-11-07 20:00 Chicago; after 18:00 no new scope.

## Live since the last brief (main, roughly 10:00Z–13:00Z)
- Friends in online grand campaigns: a friend's battle waits for them (fight live / auto / withdraw), their events pop up on
  their own map, and a quitter's nation goes to their generals (laneA A2b s2–3).
- Diplomacy and war: UN Security Council votes and sanctions (RG2), border crises that escalate into clashes, coups and
  uprisings (RG7/RG43), claims and casus belli (B6), mobilisation (RG34), arms trade tab (RG12), per-province autonomy (B5b s4).
- Economy: world market for Grain / Metals / Wares with monthly prices (B5b s3); corruption (B5b s2).
- Occupied land fights back by morale style; occupiers' home war support wears down (A6 s3).
- Armies: Fight-it battles start with the average-morale fear head-start (A3b); army outliner (O), Ctrl+click select-all,
  macro-builder recruit orders (⚡23), observer mode to watch the AI run the world (⚡28). A 150-army select test is fast (A3).
- Realistic balance: real-tier table drives start money, unit costs and fire support; lobby shows the Balance mode (D1b, D2).
- Player-facing names: no jargon (SAM → Anti-Air, ATGM → Anti-Tank, RPG/TOW → Anti-Tank Team).

## Lanes — current item (full list: orch/PLAN-SAT.md)
- **A — Grand engine:** A2b online grand campaign (slices 1–3 shipped, more open); A3 smooth army control (open); A3b morale
  bar + retreats (slices 1–2 + courage shipped); A4 leftovers; A5 force limit + tradition (slice 1); A6 occupation (slices 1–3).
- **B — Grand systems (EU4):** B5 trade nodes, B5b economy (inflation, corruption, market, autonomy shipped); next: the open RG
  items (pipelines, economy crash, mercenaries, bases abroad).
- **C — Look ($75 bar):** C0 UI kit not started; C2 grand map to ART-BAR ≥ 4.5 (C-LOOK de-block plan added; the grand map
  now follows the real world, proportional, per CLAUDE.md 06:55); C3 UI skin; C4 battle graphics.
- **D — Content & QA:** D2 first-time-player fixes (slice 6); D3 voices and anthems for new nations (open); D4 auto-balancer
  slice 1 (tuning tool only); D5 cleanup (slice 1); D-ME Middle East maps: slice 3 done (every ME faction has ≥6 home maps).
- **E — Battle look:** E1 soldiers (partial: 4-soldier squads); E2 buildings (partial: ME HQ, barracks, factory); E3 ground
  detail (open: flat sand between objects); E4 vehicle wear (open); E5 HUD readability (partial: doctrine strip, Command panel collapsed).
- **F — Battle & armies:** campaign-battle rules, ⚡31 quick battle, cover overlay, after-action report, weather, generals' speech.
- **G — Grand events & diplomacy:** peace-deal screen (EU4), coalitions, claims, crises, UN, propaganda, research + cabinet
  bonuses. RG16 peace conferences still open for demilitarised zones (RG44).

## Known bugs and open items
- Player bug reports open: none (GitHub label `player`).
- Open design item: 3-player maps (isolated start wins about 55%).
- Smooth and grand gates can time out on the slow sandbox box; CI is the judge.
- Needs Abdullah: PR #24 (main → servers-live, Middle East maps) is open; merge it to put the maps into Cloudflare battles.

## Where to find things
- How to work and test: orch/HOWTO.md · the central plan: orch/PLAN-SAT.md · what each system owns: orch/SYSTEMS.md
- Standing decisions: CLAUDE.md · what shipped and when: orch/HISTORY.md · progress board: orch/ROADMAP.md
- Phone summary for Abdullah: orch/STATUS.md · this brief: orch/BRIEF.md
- Rule for every change: build.py → smoke.mjs (SMOKE PASS) → smooth.mjs (SMOOTH PASS) → commit src/ + index.html together.
