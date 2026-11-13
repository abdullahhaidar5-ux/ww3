# Slice sweep — Conquest & Battle, first ten minutes (audit)

Helper **slicesweep**, 2026-11-13. Branch `orch/slicesweep`. **Audit only — no `src/` change.**
Scope per owner decision (Abdullah, Fri 2026-11-13 06:15): campaign paused; Phase 1 = finish **Conquest** and **Battle**.
Nations swept: IR, RS, DW, RV, IL, SA, US. PC 1600×900 (in-game helper shots at 1200×720). Pictures: `orch/concepts/slicesweep/`.

## How much got covered
- **Menus (both modes):** title, Single player, Conquest/Battle battlefield picker, nation picker + hover detail, Players, Battle options, Multiplayer lobby, Settings, Extras — captured for both modes.
- **In-game:** second-0 (IR Conquest, IR Battle, RS Conquest), BUILD/UNITS/UPGRADE/POWERS bar, building placement, box-select, pause menu, in-game Settings, Victory/awards/scoreboard.
- **Not captured:** right-click move / right-drag line / attack-move *feedback* shots and the per-nation in-game pass for DW/RV/SA/US. The headless SwiftShader browser **crashes reliably when an army is selected and screenshotted at 1600px** (3 separate runs died at that exact step), and a full battle takes 5–12 min to load here, so those were dropped. Nation-level differences are instead covered from the nation cards + three in-game nations. This is a sandbox limitation, not a game bug.

A note on captures: the big black **"Doctrine: …" box in the top-left of every in-game shot is a stuck native tooltip** (see #1), an artifact of scripted hovers in headless Chromium — it is **not** drawn in the real game. Ignore it when judging the battlefield shots.

---

## Findings — most harmful to a new player first

### 1. Nation picker shows the doctrine twice (native tooltip duplicates the detail panel) — S, mechanical (Sonnet)
`m-04-nation-RS-hover`. Hovering a nation fills the right-hand `#mxdet` panel with its doctrine/morale/strike (good), **and** each card also carries a native `title=F.doctrine`, so after ~1 s an OS tooltip pops up *over the nation grid* with the same wall of text, covering other cards. Redundant and messy.
Code: `src/08-ui.js` ~L1160 `b.title=F.doctrine` in `facCards()`; detail panel is `mxNatShow()` in `src/14-menu.js`. Fix = drop the `title` on `.fac` cards (the panel already shows it). This same tooltip is what sticks into the loading/battle shots.

### 2. In-game contextual command buttons truncate to 3–4 letters — M, design judgment
`c-ui-battle-sel`. With an army selected, the lower-right order buttons read **"Attac… Gu… Typ… Sto… Ret… Ass… Re… Can…"** — unreadable. They also stack *below* the dozer's road-tool row (Mine road / Checkpoint / Blow bridge / Rebuild / Pontoon, then Dig in / Fortification li… / Fix vehicles), crowding the corner. Captured at 1200 px; at 1600 px the dozer row is roomy (`c-12-tab-*`) but the army-order row could not be shot at 1600 (crash) — **verify at 1600 before deciding scope.** Likely `src/08c-tactui.js tactRow()` / `src/08-ui.js` `.cmdrow` (L328) / `TC_BTN` (L834). Give the buttons real widths or icon+tooltip, and don't stack two full button rows in the same corner.

### 3. Build-bar names and nameplate truncate / overlap in the narrow columns — S–M, design judgment
`c-10-second0-RS`, `c-10-second0-IR`. Defense/Support building names clip: **"Mountain Anti-Shi…"** (RS), **"Noor / Qader…"** (IR). The faction nameplate **"LEBANESE SHIA"** wraps to two lines and crowds the "$10,002" cash readout in the panel header. Widen those columns or shorten the building labels; give the two-word nation names room. Code: panel build/`setBtn` in `src/08-ui.js` (~L299), header `#facname`/`#credits` in `updateUI()`.

### 4. Map thumbnails render lazily → blank black tiles on first open — S, mechanical-ish
`m-02` (first paint) vs `m-02b` (after 6 s). Opening the battlefield picker shows the first few maps immediately but the rest as **empty black tiles** for several seconds while thumbnails generate one-by-one. A new player sees a half-empty grid. Code: `mxThumbRun()` / `mxMapCards()` in `src/14-menu.js` (throttled 30–800 ms per thumb, and skipped entirely while a game is live). Render a neutral placeholder/frame, or build all thumbs up front, so no tile is ever blank.

### 5. Settings panel wastes vertical space and the game HUD peeks over overlays — S, design/mechanical
`m-05-settings-from-menu`, `c-ui-settings`, `c-ui-end-top`. The Settings content fills only the middle third (big empty band above and below DONE). In-game, Settings sits low and the game's top HUD (`$money · Supply · Opinion · ⚠ · Layers`) stays visible *above* the overlay; same HUD peeks above the **Victory** screen. Center/fill the Settings column and have the in-game Settings / Victory overlay cover the top HUD. Code: settings panel + end overlay in `src/08-ui.js`.

### 6. Campaign still front-and-center while paused — **decision for ORCH** (not a code bug)
`m-01-single`, `o-02-conquest`. "Grand campaign" is listed **first** in both Single player and Multiplayer, and the join field reads "Game code or invite link **(battle or campaign)**". Campaign is paused per the 11-13 decision, so a new player is pointed at the paused mode first. **No campaign text leaks inside the Conquest/Battle gameplay screens themselves** (checked). Recommend ORCH decide whether to de-emphasize or hide the campaign entries while paused; mechanical once decided.

### Minor / watch (no batch needed yet)
- On-screen controls hint (`#hint`, `HINT_STD` in `src/08-ui.js` L1351) is one very long line that truncates mid-word ("…Right-click your bu…"). Acceptable (full controls are on the title screen + Settings), but a new player can't read it. Low priority.
- Conquest supply/road lines are drawn in a very saturated bright green across the whole base at second 0 (`c-12-tab-pow`). Readable but loud — a lane could soften them later; out of scope for this sweep.

---

## What is good (leave alone)
- **Pause menu** (`c-ui-pause`): clean, titled, elegant text items (Resume / Settings / Save / Load / Encyclopedia / Restart / Quit) — a model for the UI-flow rule.
- **Victory / awards / scoreboard** (`c-ui-end-top/bottom`): clear VICTORY banner, eight themed award cards, per-nation scoreboard with WINNER / Defeated. Professional.
- **Mode separation is correct:** Battle (`b-10`) = Command Center + dozer + supply truck + squad, $4,800, "destroy every enemy building", **no supply-line overlay**; Conquest (`c-10`) = full base, $10,000, setup phase 1:30, opinion/supply, supply lines. Clean split (matches train 12).
- **Per-nation identity works:** RS/DW/RV carry drawn emblems on the cards; RS gets its own buildings (Khums Treasury, Mountain Rocket Silo), strike (Mountain Rocket Storm), powers (Labbayk Ya Hussein, Mountain Watchers…), and Airfield greyed "Not available" (no air force). IR vs RS read as distinct nations, not re-skins.
- **Signature assets:** Ayatollah ($1425) buildable in Battle/Conquest UNITS for IR — correct per the standing rule (only grand-campaign Fight-it excludes it).

---

## Fix batches (ordered, one helper run each)

1. **Nation-picker tooltip cleanup** — remove duplicate `title=F.doctrine` on `.fac` cards (keep `#mxdet`). *(S, Sonnet)* → finding 1.
2. **Map-thumbnail placeholders** — no blank black tiles on first open of the battlefield picker. *(S, Sonnet)* → finding 4.
3. **Build-bar column widths & nameplate** — stop clipping Defense/Support names; fix two-line nation name overlapping the cash readout. *(S–M, design)* → finding 3.
4. **In-game command bar** — fix truncated contextual order buttons and the double-stacked dozer/army rows; **verify at 1600 px first**. *(M, design)* → finding 2.
5. **Settings & overlay layering** — center/fill the Settings column; cover the top game HUD under the in-game Settings and Victory overlays. *(S, design)* → finding 5.
6. **Campaign-while-paused** — ORCH decides whether/how to de-emphasize campaign in the Single-player and Multiplayer menus + join placeholder; then one mechanical pass. *(decision + S)* → finding 6.
