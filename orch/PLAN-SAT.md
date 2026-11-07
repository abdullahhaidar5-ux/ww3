# PLAN-SAT — one central plan until Sat 2026-11-07 20:00 Chicago (02:00Z Sun)

Abdullah 2026-11-06 18:02: **"Let's get this to a 75 dollar studio game by Saturday. That's goal. That is going to mean studying
everything we have going on now and centralizing and becoming faster. Kaizen afterwards."**

This file replaces the grand chain, the one-shot stage helpers and the look passes. **Four lanes**, each one self-firing loop
(hourly fallback), each owning its own files so they never wait on each other. Every iteration: read `orch/BRIEF.md` + this
file → take the **top unticked item of your lane** → ship it green in ~1 h → tick it here (`[x]` + one line: what + commit) →
fire yourself again. The old stage specs (GRAND-PICKS sections, grand-strategy.md) are the detail for each item — read only the
section you need. After Sat 18:00 Chicago: no new items, only finish/ship; at 20:00 everything left moves to kaizen.

**Disabled 2026-11-06 18:05 (folded into lanes):** grand4, grand4b, grand6, grand7, integrate2, intuitive, nationpanel, voices-new,
balance3, grandmirror (done), look3/look4. Still finishing on their own: grand3 (→ fires Lane A when done), look1, rescue, nations-b2.
Kept: Sat noon deadline check, kaizen re-enable at Sat 20:05.

## The bar: a $75 studio game (whole game, not just the grand map)
`orch/ART-BAR.md` (raised to $75, whole game) + **feel**: every click answers instantly (< 100 ms visible feedback), smooth
60 fps with big armies on the grand map and ~300 units in battle, no dead ends, nothing that "never loads", readable PC UI.

## Lane ownership (one owner per file — touch another lane's files only for a one-line hook, and say so in the commit)
| Lane | Model | Owns | Scheduled task |
|---|---|---|---|
| **A — Grand engine & feel** | Opus (sim/determinism) | `src/13-grand.js`, `13b-grandbattle.js`, `13f-grandmirror.js`, `13c-grandui.js` (input/selection), grand AI, `orch/grandtest.mjs` | `trig_01Gx98id1Z38KSG4R5rAdU94` (hourly :23 + self-fire) |
| **B — Grand systems (EU4 mechanics)** | Sonnet | `src/13g-grandeco.js`, `13h-grandecoui.js`, new `13i+` grand system files, nation panel | `trig_013LUzLCpqMyGsfK9ojXXmY8` (hourly :11 + self-fire) |
| **C — Look ($75)** | Sonnet | `src/13d-grandterrain.js`, `13e-grand3d.js`, `04-gfx`, `05-fx3d`, `10-post`, `11-models`, CSS/skin of every panel, `orch/ART-BAR.md` | `trig_0196kYnG3DBmhFHiNbNqisD6` (ex art loop; hourly :07 + self-fire) |
| **D — Content & QA** | Sonnet | `01-data` rosters, `11z-nations*`, `vo/`, `mus/`, balance numbers, wording/tooltips/tutorial, saves, `orch/newplayer.mjs` | `trig_01QkuM1b8miRMAF9NcwxC8bB` (hourly :47 + self-fire) |

## Lane A — Grand engine & feel (priority order)
- [ ] **A1 FIX: the live battle never loads** (Abdullah 18:00). Reproduce exactly as a player: menu → Grand campaign → march into an enemy → Fight it live, in a real (non-test-hook) browser path with models loading; find why it hangs (loader, mirror map generation, missing data for new nations, exception); fix; add that exact path to the gate so it can't regress.
- [ ] **A2 Real time with pause (EU4)** (Abdullah 17:58 "EU4 real-time + pause"; replaces simultaneous turns): days tick, speeds 1–5, Space = pause, +/− speed (add to the one key table; WASD stay camera-only), date shown in the top bar; economy/upkeep monthly; armies move continuously along paths with arrival dates; orders allowed while paused; a battle starting pauses the map and shows Fight it / Auto-resolve; AI thinks on ticks. Deterministic: state + timestamped orders + seed (multiplayer = lockstep later; any player can pause, host sets speed). Old turn saves load (convert turn → date).
- [ ] **A3 Smooth army control (EU4 feel)** (Abdullah 18:00 "the smoothness of selecting large armies on the map … way too clunky"): box-select many armies, Shift adds, Ctrl+click selects all of one nation's armies in view, double-click selects all armies in that province, right-click = move with a path preview + arrival date while hovering, merge/split/detach buttons + hotkeys, selected armies' unit cards at the bottom (Total War style), hover tooltips, instant feedback; 60 fps with 150+ armies on the map (profile, cache, no per-frame DOM rebuilds).
- [ ] **A4** grand3 leftovers (generals, front lines, map strikes, fleets & sea zones) — whatever grand3 (running now) leaves unticked.
- [ ] **A5 Force limit + tradition** (Abdullah 17:58): army/navy force limit (over it = expensive upkeep), army/navy tradition (from battles; better generals/morale), mercenaries/volunteer companies, war exhaustion (one system with grand6's war weariness).
- [ ] **A6** grand6 military/hidden-war items in priority: fog on the map, insurgency, war weariness hookup, coups (rest → kaizen).
- [ ] **A7** grand7 friends multiplayer on real time (lockstep, pause rules, live battles pause the map for everyone; others give orders while paused and can spectate; several battles from the same pause run together) — likely after the deadline.

## Lane B — Grand systems: EU4 mechanics (priority order)
- [ ] **B1 Realistic start** — GRAND-PICKS "REALISTIC START" (real GDP/military/oil, real alliances + opinions, real wars, fronts, bases, fleets).
- [ ] **B2 Nation panel** — GRAND-PICKS "THE NATION PANEL" (EU4-style tabbed window; `npTab` register; every later item adds its tab).
- [ ] **B3 Power points + ideas** (Abdullah 17:58): EU4 monarch points as **Political / Diplomatic / Military capital** (monthly from leader + advisors), spent on tech, development, coring, diplomacy, generals, stability; national ideas (unique per nation, equal value) + idea groups.
- [ ] **B4 Stability, cores, estates**: stability −3…+3 (raise with Political capital; affects unrest/income/war support), coring conquered provinces (cost, time, overextension), estates (Army, Clergy/Ideology, Business, Workers) with loyalty/influence and privileges.
- [ ] **B5 Development + trade nodes**: develop provinces (tax/production/manpower) with capital points; trade flows through EU4-style trade nodes along sea lanes/chokepoints to collectors; merchants steer it (extends grand2's oil market/trade — one system).
- [ ] **B6 Diplomacy (EU4)**: grand4 diplomacy + grand4b + the DIPLOMACY SCREEN (opinions, relations limit, alliances, guarantees, access, call to arms, favours, trust, coalitions/aggressive expansion, claims/casus belli, warscore peace deals, truces, client states).
- [ ] **B7** grand4 rest: events with choices, research via capital points, missions, cabinet/advisors (generate points), seasons, minor nations.
- [ ] **B8** grand4b rest: great powers, reforms, prestige, hegemonies. (grand6 home-front items → kaizen.)

## Lane C — Look: $75 studio (priority order; ART-BAR scores decide inside each)
- [~] **C1** look1 leftovers + replace boxy towns — towns rebuilt 2026-11-07 (laneC: hip/gable/row/courtyard houses on a rotated street grid, lighter pads); look1 leftovers still open.
- [ ] **C2** Grand map to ART-BAR ≥ 4.5 on every item (geography, colour, light, water, objects, life, performance).
- [ ] **C3** UI skin: one studio-grade style for top bar, nation panel, army cards, tooltips, battle HUD/sidebar (big readable text, icons, framed panels, consistent fonts), smooth panel animations.
- [ ] **C4** Battle graphics pass in real gameplay (terrain, lighting, explosions, units at 300 on screen) — CoH/Broken Arrow direction.
- [ ] **C5** look4 cinematic moments (battle start/end, turn news cards) — cut first if behind.

## Lane D — Content & QA (priority order)
- [ ] **D1** Finish the nations: whatever the rescue / nations-b2 helpers leave (Japan, remaining NATIONS-TODO lanes) via NEWNAT.
- [ ] **D2 First-time-player audit** (intuitive spec, trigger prompt in HISTORY of the plan): orch/newplayer.mjs + fix the top 15 confusions (wording, hints, Esc, feedback) — includes the grand map with real time.
- [ ] **D3 Voices + anthems** for all new nations (one batch; voices-new spec) — ship per group.
- [ ] **D4 Balance**: battle round robin all nations + grand campaign fairness given the realistic start (balance3 spec).
- [ ] **D5 Integration/cleanup**: duplicates from SYSTEMS.md "Open" notes, saves round-trip, campaign tutorial (integrate2 spec).

## Rules for every lane iteration (cheap + fast)
1. FIRST: `git fetch -q`; if your lane has an unmerged `orch/lane<X>-*` branch pushed < 60 min ago → stop ("lane busy"). Lane A also stops while `origin/orch/grand3` is unmerged and pushed < 60 min ago; Lane C while `orch/look1` is; Lane D while `orch/rescue`/`orch/nations-*` is (they finish their own work).
2. Branch `orch/lane<X>-<UTC yyyymmddhhmm>`, push early. Merge origin/main before shipping. Fast-forward pushes only.
3. Gate: `python3 orch/build.py` · `node orch/smoke.mjs 2>&1 | grep -E "SMOKE (PASS|FAIL)"` · `node orch/grandtest.mjs 2>&1 | tail -3` (grand changes) · `bash orch/cigate.sh` (blocking). Green → push to main. Sim/data change → comment on the open main→servers-live PR.
4. Tick the item here + one HISTORY line (heading "lane<X>"). Screens for Abdullah in `orch/shots/lane<X>/`.
5. LAST: fire your own scheduled task once (Claude_Code_Remote `fire_trigger`) if your lane has unticked items and it's before Sat 20:00 Chicago. Rate limit → HANDOFF-lane<X>.md, push, stop (the hourly schedule resumes).
