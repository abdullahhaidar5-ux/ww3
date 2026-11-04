# Campaign — 5 missions for the Shia factions (2026-11-03)

**What shipped:** a **Campaign** button in the main menu (above Test Range) → mission list (✓ and best time per difficulty,
saved on the device in `localStorage` key `ww3camp1`) → briefing (story, objectives, Easy/Medium/Hard) → the mission on
the real simulation → on-screen objectives panel with check marks and timers → debrief (Play again / Next mission /
Missions / Main menu). All missions are replayable and all unlocked.

| # | Mission | Nation | Map | Script |
|---|---|---|---|---|
| 1 | Hold the Pass | Mountain Shias (RS) | Khyber Pass | small ridge garrison + 3 turrets, enemy waves every ~48 s, reinforcements at 6:00, then destroy the forward base |
| 2 | Supply Run | Coffee Shias (DW) | Sinai Plateau | 6 "Supply Truck" dozers + escort, 4 ambush groups sprung when the convoy passes, besiegers around the town; 4 of 6 must arrive |
| 3 | Mountain Fortress | Iran (IR) | Zagros | build the Fortress, waves every ~60 s growing to armour/artillery/helis, two bunker-buster strikes (warned 25 s ahead), hold HQ to 12:00 |
| 4 | Retake the Town | RS + DW (AI ally) | Aleppo Ruins | 3 teams; ally commander AI amoves to the next district; 5 districts to clear in order, enemy reserves at 2:30/5:00/7:30, bonus: garrison a building |
| 5 | Combined Arms | Iran (IR) | Sinai Plateau | drones, Fateh launchers, armour, infantry vs. a fortified base (SAMs, turrets, factory, HQ) with the real AI running |

The opposing side is always a generic "coalition" (renamed in-game), never named in the text. Difficulty scales enemy
numbers/wave pace (x0.7 / x1 / x1.4), never money.

**Code:** `src/12-campaign.js` (missions, scripting, all UI). Hooks in `src/03-sim.js`: `newGame` takes `o.camp`
(allows 3 teams on a 2-slot map, calls `campSetup` instead of the default HQ spawn), `simUpdate` calls `campTick`,
`checkEnd` is skipped when `G.camp`. Scripting runs only where the sim runs (single-player), RNG is a seeded mulberry.
Skirmish and online play never set `G.camp`, so they are unchanged.

**Test:** `node orch/camptest.mjs [--only id] [--minutes 2]` — for each mission: menu button/list/briefing exist, the mission
loads, runs 2 game-minutes with a simple scripted player and no errors/NaN, screenshot to `orch/shots/campaign/<id>.png`,
then objectives are completed by script and the victory debrief + saved progress are checked. (Takes ~3 min per mission in
headless Chromium; not part of cigate yet.)

**Needs Abdullah:** merge the `main → servers-live` PR (03-sim changed; campaign itself is single-player so online battles
behave the same either way).

**Not done / ideas:** voice-over for briefings, a story map screen, unlocking missions in order, tuning on a real phone,
mission 4 ally could also get a second wave of its own reinforcements from a visible road.
