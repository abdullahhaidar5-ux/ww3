# BRIEF — one-page state of World War 3 (janitor, 2026-11-07 21:56Z = Sat 15:56 Chicago)

## What the game is now
Browser RTS in the style of C&C Generals, live at https://abdullahhaidar5-ux.github.io/ww3/ (also the ww3 Worker and the
claude.ai artifact). PC only. Conquest is the only battle mode. The grand campaign is a Total War / EU4-style world map
above it: real-world proportional map (Equal Earth), provinces, armies, empire economy, morale styles, real time with pause,
AI nations that act on their own. Battles are hosted on Cloudflare. Deadline: $75 studio-quality game by Sat 2026-11-07
20:00 Chicago; no new scope after 18:00 Chicago (now past, so finish and ship only).

## Live since the last brief (main, 19:00Z–21:56Z)
- Peace conferences with reparations, and demilitarised zones on loser border provinces (RG16, RG44, laneG).
- Natural disasters: floods, sandstorms and a neighbour's quake with relief teams that move opinion (RG59, laneG).
- Last stand: surrounded troops hit 25% harder (RF10, laneF).
- In-game UI kit (src/08j-uikit.js): province panel tabs, unit and building cards, icon command tiles, pause menu in one
  panel, Settings in tabs, one tooltip style (ingameui slices 1–4).
- Grand-map city lights and a 5-minute dusk cycle; sea colour variation and distance-faded ripples (laneC).
- Grand-map armies drawn as instanced meshes: wide-zoom draw calls 676 → 63 (laneC PERF).
- Base buildings: merged prop kits per material, guard towers, camo net, facade windows, PBR concrete and plaster, vehicle
  mud, grime and wear, sand ripple relief in the terrain shader (DE-BLOCK slices 2–10, laneE).
- Earlier today, still live: observer mode, real-world proportional map, logistics stages 5b–10, elections and refugees,
  TV news lower-thirds, nuclear programmes with a one-month flight time, online campaign lobby (camplobby, A2b).

## Lanes — current item (full list: orch/PLAN-SAT.md)
- **A — Grand engine:** A2b online grand campaign (slices 1–4 shipped; friends' battles answered on their own map);
  A3 smooth army control (open; perf test passes at 150 armies); A3b morale and allied sharing (shipped); A5 force limit.
- **B — Grand systems (EU4):** economy, pipelines, mobilisation, arms trade shipped. Next: RG46 bases abroad,
  RG19 mercenaries, RG61 economy crash.
- **C — Look ($75 bar):** C-LOOK (grand map de-block) and C-TOWNS in progress; C-LABELS shipped; C0 UI kit and
  C0b studio shortcuts still open; C3 UI skin; C4 battle graphics.
- **D — Content & QA:** D2 first-time-player fixes (lobby spells out Balance); D3 voices and anthems for new nations
  (open); D4 auto-balancer slice 1 (tuning tool only); D5 cleanup.
- **E — Battle look:** DE-BLOCK slices 2–10 shipped; E1 soldiers and E2 buildings partial; E3 ground detail open;
  E5 HUD readability partial.
- **F — Battle & armies:** RF10 last stand shipped; RF4 collapsing buildings, RF5 cinematic moments and RG11 naval
  invasions are the next open items.
- **G — Grand events & diplomacy:** RG16, RG44, RG59 shipped. Open: RG10 nuke follow-ups (map flash, interceptors,
  occupation stops programme), RG41 diaspora, RG28 ministers, RG30 succession.

## Known bugs and open items
- Player bug reports open on GitHub (label `player`): none (checked 2026-11-07 21:56Z via REST).
- Local gates: a pre-existing NaN-geometry console error (THREE computeBoundingSphere) makes smoke fail on unchanged main
  in several lanes' runs; a manpower NaN in the 15-turn grandtest is red on main. Owners: whoever touched
  11-models.js / the 13-grand economy. Look before the next ship.
- Smooth and grand gates time out on the slow sandbox box; CI is the judge. Last laneC/laneE work aimed at the draw-call
  budgets (smooth-pc was 2207–2568 against 1725).
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
