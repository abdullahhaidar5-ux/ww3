# BRIEF — one-page state of World War 3 (janitor, 2026-11-08 00:56Z = Sat 18:56 Chicago)

## What the game is now
Browser RTS in the style of C&C Generals, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only. Conquest is the only battle mode. The grand campaign is a Total War / EU4-style world map
above it: real-world proportional map (Equal Earth), provinces, armies and navies, empire economy, morale styles, real time
with pause, AI nations that act on their own. Battles are hosted on Cloudflare. Deadline: $75 studio-quality game by
Sat 2026-11-07 20:00 Chicago (about an hour away); no new scope after 18:00 Chicago, so finish and ship only.

## Live since the last brief (main, 21:56Z–00:56Z)
- Proxy wars: "Arm a proxy militia" diplomacy act, plus volunteers who join wars for a same-faction ally (RG9, RG18, laneG).
- Cyber strike on banks: cash loss, attribution risk, 6-month cooldown (RG15, laneG).
- Grand-map armies and navies are now baked only from the real rigged soldier and ship models, with nation uniforms and
  hi/lo detail by distance; the box figure is gone (grandfigs).
- Covert actions: sabotage and counter-intelligence (RG3 slice 2, laneA).
- Event rows for protests, strikes, state TV, diaspora, minorities, factions and ministers; a nuclear programme stalls while
  its capital is occupied; ceasefires can break (RG40/39/41/42/29/28, RG10 follow-on, RG20, laneG).
- Battle look: fire glow under burning wrecks, night tracers spark on impact (DE-BLOCK slice 11, laneE).
- Lane F audit ticks: RF7 ammo and RF9 medevac were already built (laneF).

## Lanes — current item (full list: orch/PLAN-SAT.md)
- **A — Grand engine:** A2b online grand campaign (slices 1–4 shipped); A3 smooth army control (open; 150-army profile passes);
  A3b morale and allied sharing shipped, map banner bar open; A5 force limit slice 1 shipped.
- **B — Grand systems (EU4):** no commits in the last 3 h. Open: B5 trade nodes, B5b economy, B6 diplomacy, B7 events, B8 great powers.
- **C — Look ($75 bar):** no commits in the last 3 h. Open: C0 UI kit, C0b studio shortcuts, C2 grand-map ART-BAR, C3 UI skin, C4 battle graphics.
- **D — Content & QA:** no commits in the last 3 h. Open: D2 first-time-player fixes, D3 voices and anthems for new nations, D4 auto-balancer.
- **E — Battle look:** DE-BLOCK slices 2–11 shipped. Open: E1 soldiers and E2 buildings (partial), E3 ground detail, E5 HUD readability (partial).
- **F — Battle & armies:** RF1, RF2, RF3, RF7, RF9, RF10 shipped. Open: RF4 collapsing buildings, RF5 cinematic moments, RG11 naval invasions.
- **G — Grand events & diplomacy:** RG9, RG15, RG16, RG18, RG44, RG59 shipped. Open: RG10 nuke follow-ups (map flash, interceptors),
  RG41 diaspora, RG28 ministers, RG30 succession, RG36 player diplomacy (with A2b).

## Known bugs and open items
- Player bug reports open on GitHub (label `player`): none (checked 2026-11-08 00:56Z via REST).
- Earlier runs showed a pre-existing NaN-geometry console error (THREE computeBoundingSphere) that failed smoke on some lanes;
  the grandfigs run reports smoke PASS and grandtest PASS. Re-check on the next ship.
- Smooth and grand gates can time out on the slow sandbox box; CI is the judge.
- 3-player maps: the isolated start wins about 55% (open design item, ROADMAP).

## Needs Abdullah
- PR #24 (main → servers-live, Middle East maps + other lane work) is still open:
  https://github.com/abdullahhaidar5-ux/ww3/pull/24 — merge it so Cloudflare battles get the new maps and sim changes.
- Optional: try the grand map and one battle on PC for 2 minutes after the next deploy (look and performance).

## Where to find things
- How to work and test: orch/HOWTO.md · the central plan: orch/PLAN-SAT.md · what each system owns: orch/SYSTEMS.md
- Standing decisions: CLAUDE.md · what shipped and when: orch/HISTORY.md · progress board: orch/ROADMAP.md
- Phone summary for Abdullah: orch/STATUS.md · this brief: orch/BRIEF.md
- Rule for every change: build.py → smoke.mjs (SMOKE PASS) → smooth.mjs (SMOOTH PASS) → commit src/ + index.html together.
