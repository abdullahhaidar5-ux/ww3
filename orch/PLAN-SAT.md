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
- [ ] **A3b Army morale bar + retreats by morale style** (Abdullah 18:25, picked 1 + 3): every army on the grand map has a morale bar (0–100%, EU4-style) drained by battles, forced marches, attrition, no supply, encirclement and map strikes; recovers monthly in friendly land / near supply; army tradition (A5) raises the max; it sets the starting courage of that army's units in Fight-it battles and drives auto-resolve. Each style (read `MSTYLES`/`msOf()` in 01-data — the ONE morale table, add grand numbers there): **Zealous** high max, unhurt by losing its general, but **won't retreat** after a lost battle (fights on, heavy losses); **Professional** steady under map strikes, recovers fast near a general/HQ, heavy casualties drain it more, **retreats in good order** (keeps more units); **Home defenders** big bonus in own/core provinces, weak deep in enemy land, **fall back to the nearest home town and dig in**; **Firepower-reliant** low base, strong with own airfields/artillery/sortie cover in range, collapses when cut off, **break fast but lose fewer men** (pull back under air cover). Equal power — prove with auto-resolve sims (each style wins ~equally across mirrored setups). Bar shown on the army banner + army cards. **Allied morale** (Abdullah 18:29 pick 11): allied armies in the same/adjacent province share morale (the higher one lifts the lower a little); Firepower-reliant armies get a boost when an allied air power (airfield/sorties in range) supports them.
- [ ] **A4** grand3 leftovers (generals, front lines, map strikes, fleets & sea zones) — whatever grand3 (running now) leaves unticked.
- [ ] **A5 Force limit + tradition** (Abdullah 17:58): army/navy force limit (over it = expensive upkeep), army/navy tradition (from battles; better generals, higher max army morale A3b), mercenaries/volunteer companies; war exhaustion = Lane B's war-support meter (B4b), not a second one.
- [ ] **A5b Morale extras on the map** (Abdullah 18:31, all picked; all read the ONE `MSTYLES` table, equal total value per style): **named battles** — big battles become legends with lasting province/national morale bonuses (martyr shrines / regimental honours / "never again" sites / victory monuments); **surrender & POWs** — broken armies can surrender, prisoners held and traded in peace deals (B6) (Zealous never, Professional in good order when hopeless, Home defenders only abroad, Firepower-reliant sooner when cut off); **capital under threat** — Zealous fortified last stand, Professional relocate the capital, Home defenders whole-nation mobilisation, Firepower-reliant allies more willing to join; **sieges** — hold-out time by style (Zealous longest, Professional steady but supplies drain, Home defenders longer in home towns, Firepower-reliant short unless relieved by air); **pre-battle war cry** — every Fight-it battle opens with a short style boost + voice line (war cry / briefing / homeland call / air-support call-in; lines from Lane D's voices).
- [ ] **A6** grand6 military/hidden-war items in priority: fog on the map, insurgency, war weariness hookup, coups (rest → kaizen). **Occupation reaction by style** (Abdullah 18:29 pick 12, uses the ONE Locals system `localSpawn`): occupied Zealous lands grow resistance cells (raids, IEDs), Professional lands stay orderly (low insurgency, quiet admin), Home-defender lands raise partisans in hills/forests, Firepower-reliant lands comply but sabotage (supply/infrastructure hits); equal total cost to the occupier.
- [ ] **A7** grand7 friends multiplayer on real time (lockstep, pause rules, live battles pause the map for everyone; others give orders while paused and can spectate; several battles from the same pause run together) — likely after the deadline.

## Lane B — Grand systems: EU4 mechanics (priority order)
- [ ] **B1 Realistic start** — GRAND-PICKS "REALISTIC START" (real GDP/military/oil, real alliances + opinions, real wars, fronts, bases, fleets).
- [ ] **B2 Nation panel** — GRAND-PICKS "THE NATION PANEL" (EU4-style tabbed window; `npTab` register; every later item adds its tab).
- [ ] **B2.5 ONE modifier engine (EU4-style, do this before B3)** — `GMOD` rows `{id, src, scope: nation|army|province, stat, add|mul, cond, until}` + `gmod(scope, obj, stat)` evaluator with a per-month cache; every later B/A item (ideas, estates, stability, war support effects, rallies, style perks from `MSTYLES`, named battles, war economy, inflation, corruption, autonomy) is data rows, shown in tooltips as "+10% from Zealous fervour" lines. Saves on checkpoint; deterministic.
- [ ] **B3 Power points + ideas** (Abdullah 17:58): EU4 monarch points as **Political / Diplomatic / Military capital** (monthly from leader + advisors), spent on tech, development, coring, diplomacy, generals, stability; national ideas (unique per nation, equal value) + idea groups. **Style idea trees** (Abdullah 18:29 pick 10): each morale style gets its own national-idea tree (e.g. Zealous: fervour/martyrdom/volunteers; Professional: staff/training/discipline; Home defenders: fortified homeland/militia/terrain; Firepower-reliant: air power/artillery/precision) — equal total value, nation-flavoured names.
- [ ] **B4 Stability, cores, estates**: stability −3…+3 (raise with Political capital; affects unrest/income/war support), coring conquered provinces (cost, time, overextension), estates (Army, Clergy/Ideology, Business, Workers) with loyalty/influence and privileges.
- [ ] **B4b War support (national morale)** (Abdullah 18:25, picked 2): ONE nation-level war-support meter (this IS war weariness/exhaustion — A5 and grand6 use it, no second meter): victories, defeats, casualties, war length, occupied home/holy places, national/religious days (equal value), Ayatollah/Dear Leader clamour; low → unrest, slower recruits, forced peace talks, coups (later). Shaped by morale style: **Zealous** casualties raise it at first (martyrs) up to a cap, leaders keep it high; **Professional** stable, slow steady drain from losses; **Home defenders** surge in defensive wars / when invaded, low appetite for wars abroad; **Firepower-reliant** rises with clean victories, drops sharply with casualties. Shown in the nation panel header + Home front tab; feeds every army's morale recovery (A3b). **Rallies** (pick 9): spend Political capital on a style-flavoured rally to lift war support (commemorations/party rallies, military parades, defend-the-homeland drives, weapons showcases) — equal value, cooldown. **Recruiting by style** (pick 6, in grand2's manpower system): Zealous volunteer surges after martyr losses/holy days; Professional recruit slower but units start with veterancy; Home defenders get a free militia levy when invaded; Firepower-reliant recruit fewer men but better-equipped units — equal total value.
- [ ] **B5 Development + trade nodes**: develop provinces (tax/production/manpower) with capital points; trade flows through EU4-style trade nodes along sea lanes/chokepoints to collectors; merchants steer it (extends grand2's oil market/trade — one system).
- [ ] **B5b EU4-level economy** (Abdullah 18:09 "Will this have eu4 level economy?" → add all four): **trade goods** per province (oil, gas, grain, steel, electronics, arms, minerals… from the province's real profile) with world **prices** that move with supply/demand and crises, feeding production income and trade value; **inflation** (from printing money / bonds / gold-like windfalls; raises costs; reduce with Political capital or advisors); **army & navy upkeep sliders** (lower = cheaper but lower morale/readiness, EU4-style); **autonomy** per province (high = less income/manpower but less unrest; lower it with capital points) and **corruption** (from overspending/low stability; raises costs). All in grand2's economy (13g-grandeco.js), shown in the nation panel's Economy tab (income/expense ledger lines for each).
- [ ] **B5c Morale ↔ empire** (Abdullah 18:31, picked): **propaganda war** — spend capital to lower an enemy's war support (Zealous hard to shake, Professional resistant, Home defenders shaken when fighting abroad, Firepower-reliant hurt by casualty news); **war support ↔ government** — drives leader legitimacy (Zealous), elections/approval (Professional), unity government when invaded (Home defenders), opinion swings (Firepower-reliant); **war economy** — high war support boosts factory output (volunteer labour / efficiency / home-front drives / arms industry). All through B4b's one war-support meter; equal value.
- [ ] **B6 Diplomacy (EU4)**: grand4 diplomacy + grand4b + the DIPLOMACY SCREEN (opinions, relations limit, alliances, guarantees, access, call to arms, favours, trust, coalitions/aggressive expansion, claims/casus belli, warscore peace deals, truces, client states).
- [ ] **B7** grand4 rest: events with choices, research via capital points, missions, cabinet/advisors (generate points), seasons, minor nations.
- [ ] **B8** grand4b rest: great powers, reforms, prestige, hegemonies. (grand6 home-front items → kaizen.)

## Lane C — Look: $75 studio (priority order; ART-BAR scores decide inside each)
- [ ] **C1** look1's leftovers + replace boxy towns (GRAND-PICKS look2).
- [ ] **C2** Grand map to ART-BAR ≥ 4.5 on every item (geography, colour, light, water, objects, life, performance).
- [ ] **C3** UI skin: one studio-grade style for top bar, nation panel, army cards, tooltips, battle HUD/sidebar (big readable text, icons, framed panels, consistent fonts), smooth panel animations.
- [ ] **C4** Battle graphics pass in real gameplay (terrain, lighting, explosions, units at 300 on screen) — CoH/Broken Arrow direction.
- [ ] **C5** look4 cinematic moments (battle start/end, turn news cards) — cut first if behind.

## Lane D — Content & QA (priority order)
- [x] **D1** Nations done: Japan (JP) first cut live 2026-11-07 (laneD); voices/anthems pending D3.
- [ ] **D2 First-time-player audit** (intuitive spec, trigger prompt in HISTORY of the plan): orch/newplayer.mjs + fix the top 15 confusions (wording, hints, Esc, feedback) — includes the grand map with real time.
- [ ] **D3 Voices + anthems** for all new nations (one batch; voices-new spec) — ship per group.
- [ ] **D4 Balance**: battle round robin all nations + grand campaign fairness given the realistic start (balance3 spec).
- [ ] **D5 Integration/cleanup**: duplicates from SYSTEMS.md "Open" notes, saves round-trip, campaign tutorial (integrate2 spec).

## Rules for every lane session — FAST + CHEAP (Abdullah 18:40 "Get creative and speed up development and save usage")
1. **FIRST:** `git fetch -q`. Stop only if **your own lane** has an unmerged `orch/lane<X>-*` branch pushed < 45 min ago. **Never wait for
   other helpers** (grand3, look1, rescue…): if your top item touches files another active branch is editing, take your next
   non-conflicting item instead and come back later.
2. **One session = several items.** Keep going item after item in the same session (no re-clone, no re-reading) until ~3 h or
   your context is ~60 % full; ship after every item. Re-read nothing you already read this session.
3. **Background gate.** Per item: `python3 orch/build.py` + `node orch/smoke.mjs 2>&1 | grep -E "SMOKE (PASS|FAIL)"` + the one
   targeted test (`node orch/grandtest.mjs 2>&1 | tail -3` for grand work). Then start `bash orch/cigate.sh > /tmp/cig.log 2>&1 &`
   (run_in_background) and **begin the next item while it runs**; when it's green, merge origin/main and fast-forward push. Red →
   fix before anything else. Never leave main broken.
4. **Delegate cheap work to Haiku.** Bulk data entry (country figures, idea/event/mission rows, names, tooltips, wording, credits)
   goes to a subagent with `model: "haiku"` (Agent tool) with exact file + format instructions; you review the diff only.
5. **Data, not code.** Every EU4/morale effect is a **row** in the ONE modifier table (B2.5) — no new bespoke code paths for ideas,
   estates, rallies, style perks, named battles, war economy… One engine, many rows: faster to build, cheaper to read.
6. **Read less.** `orch/BRIEF.md` + this file + only the spec section of your item. grep -n + ≤ 120-line ranges. Command output
   via `tail`/`grep`. Self-review screenshots ≤ 400 px (one contact sheet per item); full-size only for Abdullah's 1–2 pictures.
7. **Cut, don't polish.** Ship the smallest version that a player can see and use, tick it, move on; polish goes to kaizen.
8. Tick the item + one HISTORY line (heading "lane<X>"). LAST: fire your own scheduled task once if items remain and it's before
   Sat 20:00 Chicago. Rate limit → orch/HANDOFF-lane<X>.md, push, stop (hourly schedule resumes).
