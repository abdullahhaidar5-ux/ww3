# Polish freeze (orch/polishE, 2026-11-10)

Scope: no new features; make what exists work for the next player. The cloud sandbox is too slow to run full playthroughs
(`smooth`/frame timing meaningless), so a headless rendering sweep was done where possible and the rest is listed as TODO.

## 1. Unfinished UI — result
Clicked every nation-panel tab for IR and US headless (`node orch/polishtabs.mjs`): **39 tabs, all render real content, 0 errors, 0 empty**
(thinnest: Missions "no goals yet", Graphs "play a few months", Elections for non-democracies = a one-line explanation — all honest early-game states, not stubs).
Nothing needed hiding, so no flag was added. Guard: `orch/decisions.mjs` now fails if any visible nation-panel tab renders empty or throws
(unfinished tabs must use `npTab(..., show)` to hide).
Observed: Economy tab shows "Income per month +0" at campaign start for both IR and US (before the first monthly tick) — looks like a wrong first read; TODO check `N.inc` is set at `grNew`.

## 2. Playtest sweep
| # | Problem | Status |
|---|---|---|
| 1 | No "what do I do first" help in any mode | Fixed (item 3) |
| 2 | Battle mode had no tutorial (only the Conquest one) | Fixed (item 3) |
| 3 | Battle sweep (IR): 13 buildings + 27 units spawned, no thrown errors | See run log below |
| 4 | Full playthrough of Grand (3 months, fight-it, auto-resolve, save/load), Conquest/Battle to a win, Mission, Tutorial, Test range, online 2P | NOT DONE here: sandbox renders ~1 frame per 3–10 s in swiftshader; run on GitHub runners / Abdullah's PC |

## 3. First ten minutes (shipped)
- `src/08l-firsthint.js`: short skippable card per mode (Conquest, Battle, Mission, Test range, Grand campaign), once each, Esc/Got it closes, re-open with the HUD "?" button.
- Battle tutorial: `TUTB` steps in `src/08b-social.js` (Supply Depot → Barracks → War Factory → train a vehicle → attack) on the existing tutorial machinery; main menu item "Battle tutorial".
- Guards in `orch/decisions.mjs`.

## To-do for later
- Run `orch/polishplay.mjs` for all factions on CI hardware (spawn every unit/building, fire every power).
- Real playthroughs of each mode with screenshots on a fast machine.
