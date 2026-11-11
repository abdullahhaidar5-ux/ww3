# One language for the whole game

Abdullah 2026-11-10 19:17 "Any more ideas like this for the entire game? Impress me" → concept sheet
`orch/concepts/one-language.jpg` (source `one-language.html`, inline SVG) → 19:22 "All".
Rule for all six: **ring = condition, rim = whose side, shape = what it is doing** — the same reading as the grand-map army
tokens (`ARMY-STANDARDS.md`). Each idea extends its owner system (orch/SYSTEMS.md), removes the old way in the same ship,
adds a guard, stays instanced and inside the smoothness budgets. View/UI only unless stated; never break multiplayer sync.

## Battle (owner: battle HUD/view — src/06-view, 08-ui, 08j-uikit, 04-gfx)
3. **Every button says what it beats** (first). Build/production buttons show BEATS and WEAK TO with unit pictures, computed
   from the real balance table in `src/01-data` (one helper function, never hand-written lists). Hovering or selecting an
   enemy unit highlights the buttons that beat it. Also in the encyclopedia/unit tooltips.
1. **Unit rings instead of health bars.** A ground ring under every squad/vehicle: green arc = health (red under 35 %), thin
   gold outer arc = ammunition (red under 30 %); shaken/suppressed = the ring breaks into dashes and trembles; veterancy =
   chevrons. Replaces the floating health bars (Settings "Health bars: When damaged / Always" keeps working, applied to rings).
   Instanced rings, one draw call per material.
2. **See it before you order it.** While a move order is held (right button down / right-drag line): cover dots on the
   ground near the cursor (green = full cover, gold = light, grey = open), ghost figures where each squad will stand, and
   the known enemies' weapon reach as soft red fans. Uses the existing cover/suppression data — no new rules.

## Campaign (owner: grand map view src/13e-grand3d + its panels)
6. **A battle report worth posting** (first). After every battle (Conquest, Battle, Missions, Fight-it): one report card —
   result, place/date, sides, mini-map with the main movements as arrows, lost/destroyed, best unit, one line "how it was
   won" from real battle events — with a "Copy picture" button (canvas → clipboard/PNG download). Campaigns: a monthly front
   page built the same way from the war diary. Footer "WORLD WAR 3 · play free in your browser".
4. **Front lines and supply veins.** At war: a glowing line along borders between you and an enemy, arrows where a side is
   advancing; gold veins along real roads from the capital to each army, dark and dashed past a cut. Reads the existing
   supply system; view only.
5. **See the chain before you act** (last; needs the campaign-realism systems). Before declaring war, striking, sanctioning,
   allying or making peace: one card listing who joins against you, who joins you, UN/bloc reaction, market effect, support
   at home, nearest danger — produced by running the SAME reaction functions the event engine will run (a dry run, no second
   formula), so the world reacts as the card warned.
