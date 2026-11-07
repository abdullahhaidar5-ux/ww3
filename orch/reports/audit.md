# Audit — leftovers of Abdullah's standing decisions (2026-11-07, branch orch/audit-202611070525)

Method: every decision in CLAUDE.md "standing decisions" checked in the code (grep, string-literal scan) **and** as a player in headless Chromium
(menu, a Conquest battle as IR with both sides AI for 2 game-minutes, a grand campaign as IR: map, province, sea zone; a Fight-it battle).
Guards: `orch/decisions.mjs` (new CI gate `gate/decisions`; `node orch/decisions.mjs --static` = source-only, no browser).

| Decision | Status | Where | Fixed? |
|---|---|---|---|
| EU4 real time — no turn wording / End turn | **LEFTOVER** (found 53 strings) | 13c/13e/13g/13h/13i/13j/13l/13m/13n/13o/13p/13q/13s/13t: "/turn", "Net income last turn", "Income per turn", "Last turn report", "GRAND CAMPAIGN · TURN", "Turn log", "Ordered this turn", "N turns to cross", "Quick — 25 turns"… | Fixed → months |
| EU4 real time — log prefix "T<n>" | **LEFTOVER** | 13c-grandui guLog | Fixed → shows the date |
| End turn button | OK (none visible; the round ▶ is Play/pause) | grand map | guard |
| Ayatollah / Dear Leader / Fortress / Bunker Buster out of Conquest | OK in roster, buttons, powers, 2-min AI battle, HUD text | conqBan | guard |
| …same, morale tooltip | **LEFTOVER** "While the Ayatollah lives, these troops never break" + "rally near an Ayatollah" | 08-ui.js:304 | Fixed → "Zealous troops fight on…" |
| Controls: WASD camera-only, F attack-move, A not, X stop, genKeys off | OK | 08-ui.js | guard (static + keys dispatched in battle change nothing) |
| Main menu order + "Missions", no Classic, no hosting wording, one Play online | OK | 14-menu.js | guard |
| Conquest only / PC only | OK | | — |
| Fight-it army-only (no build/train/tax/invest UI, credits 0) | OK | | guard |
| Morale styles + routing (Zealous IR RS DW KP RV never rout; IN UA CU EG home; AE SA IL fire…) | OK | 01-data MORALE_STYLE | guard |
| EU retired from menus | OK | FKEYS | guard |
| DW = Yemen | OK (grand map shows "COFFEE SHIAS (YEMEN)") | | — |
| "Radwan Training" | OK | | guard |
| Shia sub-leaders (RS Secretary-General, DW Leader of the Revolution, RV Chairman) | **NOT BUILT YET** (decided 23:09) | already queued as lane AY in PLAN-SAT | guard prints "pending", turns into a failure once AY ships |
| Dead code: `T.clr` / `'Ayatollah'` morale label (T.clr is always false), old phone/Classic code | LEFTOVER (invisible) | 08-ui.js:302, 08-ui | queued (PLAN-SAT, Lane D "AUDIT") |
| Voices / music / art credits / map fairness / no decorative aircraft | not auto-checkable here; covered by audio, mapsweep, mapfair, smoke gates | | — |

Totals: 4 visible leftovers found (turn wording, T<n> log, morale tooltip, + Shia sub-leaders not yet built), 3 fixed, 1 already queued (AY), 1 invisible dead-code item queued.
