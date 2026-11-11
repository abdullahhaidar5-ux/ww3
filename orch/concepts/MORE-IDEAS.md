# Ideas 7–12 (Abdullah 2026-11-10 19:28: "Let's go all of them")

Same rules as ONE-LANGUAGE.md: extend the owner system, remove the old way, add a guard, instanced, inside the smoothness
budgets, standing controls unchanged (new keys go in the one key table), never break multiplayer sync, neutral wording,
fictional leaders only, free art only.

## Battle side (helper extras-battle)
10. **Commander's radio.** Every voice call that reports something (under attack, enemy spotted, unit lost, building done,
    reinforcements) also shows ONE short line of text in a small feed (max 3 lines, fades after ~6 s) in the player's own
    language (English), with a kind icon; clicking a line (or pressing the existing "jump to last alert" key if there is
    one) moves the camera there. One event source: the existing alert/voice trigger — no second alert system.
12. **Opening shot.** Each battle (Conquest, Battle, Missions, Fight-it; not online if it would desync start timing — the
    sweep is view-only and must not delay the simulation or the 90 s setup clock) opens with a ~5 s camera sweep over the
    player's base while the anthem starts, then eases to the normal start view; any key or click skips it; Settings toggle.
7.  **Ping wheel for friends** (multiplayer). Hold one key (pick a free key from the key table, suggest C for "call") and
    flick the mouse: Attack here · Defend here · Need help · On my way. Drops a marker on the map and minimap for
    allies for ~8 s, with a short voice line in the sender's faction language and a text line in the commander's radio.
    Pings are chat-like network messages (rate-limited, 1 per second), NOT simulation state: they must never enter the
    sim, the checkpoint or the sync hash.

## Story side (helper extras-story)
9.  **A living main menu.** The menu background becomes the war table: if a campaign save exists, the grand map centred on
    the player's nation with its borders and the last battle's place marked ("Continue: Iran, March 2027"); otherwise
    the current neutral world map. Static render (one frame or very slow drift), must not slow the menu or first load
    (the grand bundle is lazy — draw from the save's light summary, not by loading the grand code).
8.  **Named veterans.** A squad/vehicle that survives a battle with kills earns a name (from per-nation name lists in the
    nation's own language style, fictional) and keeps its kill count; in campaign the name and count persist with the
    army (saved, checkpointed, deterministic from seed); shown on the unit plate, the report card "best unit", and a
    small memorial line in the war diary when it is lost. Zealous/other morale rules unchanged; no stat bonus beyond the
    existing veterancy.
11. **Battle scars on the map.** Every campaign battle leaves a small crossed-swords marker at its place for the rest of
    the campaign (fading with age, capped count, instanced, hidden at the far zoom tier); hover/click shows that battle's
    report card (idea 6, built by helper lang-campaign on branch orch/lang-campaign — build on it after it lands).

# Ideas 13–16 (Abdullah 2026-11-10 19:32: "All except 17") — helper extras-command

15. **Edge alerts** (first). When an alert happens off-screen (under attack, unit lost, building/unit finished, ally ping),
    a small arrow sits on the screen edge pointing at it, with the alert's icon, for ~6 s; clicking it moves the camera
    there. Same single alert source as the commander's radio (idea 10, helper extras-battle) — one event feed, two
    displays; if the radio has not landed yet, hook the existing alert/voice trigger and let the radio reuse it. Max 4
    arrows, newest wins, never over the command bar or minimap.
16. **Photo mode.** A key from the key table (suggest P) or a pause-menu item: pauses a single-player battle (in
    multiplayer the battle keeps running, only the local view changes), hides the whole HUD, frees the camera (WASD/Q
    as usual, mouse wheel zoom, lower angles allowed), "Take picture" saves a PNG (and copies it to the clipboard where the
    browser allows) with a small "WORLD WAR 3" mark in a corner; Esc returns exactly to the previous view and HUD.
14. **Slow-motion command.** Single player only (Conquest, Battle, Missions, Fight-it vs AI): while Space is held the
    simulation runs at ~10 % speed and orders are accepted as normal; release = normal speed. Deterministic (the sim tick
    is unchanged, only how often it is stepped); never available or bound in multiplayer; the grand-map Space = pause
    binding is untouched (this is the battle only); sound pitches down gently; a thin "SLOW" frame shows it is on;
    Settings toggle; in the key table and the Keyboard keys screen. If Space already does something in battle, keep that
    on tap and use hold for slow motion, or pick another free key and say so.
13. **Draw your plan** (last). Before a Fight-it campaign battle (extend the existing Fight-it prompt, one job per window):
    the battlefield shown as a map table with both armies as tokens; the player drags arrows from groups of his units
    to places; "Start battle" turns each arrow into the ordinary move/attack-move order for those units at tick 0
    (same order path as a player click — deterministic, in the replay/checkpoint like any order); "Skip" starts as now.
    AI side unaffected. No new unit rules.
