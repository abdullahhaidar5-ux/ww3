# Seamless across the three games (Grand campaign · Conquest · Battle)

Abdullah 2026-11-10 19:49 "10 great ideas to make the game more intuitive and seamless across types campaign conquest
battle" → 19:51 "All". Aim: learn it once in any of the three games and it works the same in the other two.
Rules for all ten: FIRST audit how the three modes differ today (short table in orch/reports/seamless.md), then extend the
owner system (orch/SYSTEMS.md) — never a second HUD, cursor, tooltip, setup or settings system; remove the old way in the
same ship; guards in orch/decisions.mjs / smoke; standing controls and MENU STRUCTURE (CLAUDE.md) unchanged; UI flow rule
(one job per screen, small elegant controls, Back/Esc); the game's one visual language (ring / rim / shape); American
spelling; view/UI only unless stated; never break multiplayer sync.

## HUD side (helper seamless-hud) — order: 4, 2, 3, 5, 6, 1
4. **The cursor tells you what a click will do.** One cursor set used on the grand map and in every battle: boots = move,
   crosshair = attack, door = enter/garrison, wrench = repair, flag = capture, hand = select, no-entry = cannot. Drawn in
   code (original, no ripped art); the cursor always matches what the right-click will actually do (same decision
   function as the order — one source).
2. **"How you win here" card.** Every match (Conquest, Battle, Missions, Fight-it; and a campaign start) opens with one
   small card, ~5 s, three icons + three short lines: how you win · where money comes from · can you build. Hold Tab to
   see it again. Text comes from the mode's real rules object, not hand-copied.
3. **Always-on goal line.** One line at the top: what to do next and how far along ("Destroy the Command Center — 2
   buildings left"), with an arrow/ping to it on click; campaign: the current war goal. Never more than one line.
5. **Attention chips everywhere.** The campaign's chip row ("6 idle armies") becomes the one attention system for all
   modes: Idle dozer/builder, Unspent cash, Idle production building, Army idle, Under attack… Click = camera goes there
   and selects. Max 4 chips, ranked; never shown for things the player cannot act on in that mode.
6. **One "what is this?" key.** Hold one key (from the key table, suggest H) and point at anything — unit, building,
   province, button, chip: one plain sentence (what it is) + one (what to do with it), same card style in all modes;
   the campaign's "What am I looking at?" legend opens from the same key.
1. **One screen layout, three games** (last; biggest). Money, command bar, minimap, alerts/radio, goal line and chips sit
   in the same places in every mode; what a mode does not use disappears, nothing moves. Fight-it (no production): the
   build area shows the reinforcement timeline. One HUD layout definition, three mode filters.

## Flow side (helper seamless-flow) — order: 7, 8, 9, 10
7. **One setup, same three steps.** Nation → Map → Opponents is one screen flow shared by Conquest and Battle (single
   player and the online lobby); campaign start has the same shape (Nation → World/length → Options). Remembers last
   choices; "Same again" and "Quick match" on the mode's first screen.
8. **One "Auto" switch for the boring part.** A small "A" toggle, same look and behaviour everywhere, on what can run
   itself: supply trucks (Battle), town taxes (Conquest), auto-resolve small battles / garrisons / governors (campaign).
   Reuse existing automation where it exists; the toggle state is saved; in multiplayer it is a normal player order so
   host and clients agree.
9. **Step from one game into another.** End of a Conquest/Battle match: "Start a campaign as this nation". Campaign
   province / Fight-it prompt: "Practice this battle" opens the Test range with exactly those armies and that ground
   (no effect on the campaign). No game mode is added to the top-level menu.
10. **One commander.** One local commander profile (name, favourite nation, colours, settings, rank from matches played
    and won, named veterans roll) shown small on the main menu and used as the default in every setup. Stored with the
    existing settings/save system; no account, no server, nothing personal leaves the browser.
