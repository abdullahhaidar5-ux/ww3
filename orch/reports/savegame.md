# Save games (orch/savegame, 2026-11-06)

Abdullah, 2026-11-05 18:51: "Make it so a game can be saved."

## What you can do now
- **Esc / P → "Save game"**: type a name (or keep the suggested "Map · Nation · 12:34"), Save. A name that already exists asks "Overwrite?" first. "Download save" gives a `.ww3save` file.
- **Autosave** every 3 minutes into one rotating "Autosave" slot (silent; the heavy work runs in idle time — packing a 300-unit battle takes about 5 ms on the game thread, compression and storage are asynchronous).
- **Main menu → Continue** (the newest save that still loads) and **Load game** (list with minimap thumbnails and "Map · Nation · 12:34 in · date", Load / Download / Delete-with-confirm, and "Load from file…" to bring a save from another PC).
- A loaded battle starts **paused** with "Game loaded. Press P to continue." Camera and squads (1–5) are back where they were.
- Storage is the browser's IndexedDB. If the browser blocks it, a clear message appears and "Download save instead" is offered.
- Saves from an older build show "This save is from an older version and can't be loaded." (greyed Load button); damaged or foreign files get their own message. Nothing is touched before the checks pass.

## What is inside a save
The host-migration checkpoint (`ckEncode`, no second serializer) plus the arguments the battle was built with (map, seed, nations, colours, teams, slots, difficulty, conditions — `G.ng`), campaign mission state, camera, squads, thumbnail, build version. Single-player Conquest skirmishes and campaign missions can be saved; Test Range, replays and online battles cannot (yet — see HANDOFF-savegame.md for the multiplayer plan).

## Checkpoint audit — what was missing (this also fixes host migration)
Towns (only 12 of ~40 fields were saved: tax-rate timers, loyalty, garrisons, revolt state, and rebel/militia unit links were lost), the AI's whole memory (it restarted from scratch), projectiles in flight, missile/strike countdowns, campaign mission state, the battle clocks and timers (time of day, humanitarian aid, rebel/radiation/supply timers), the Conquest setup timer, squads, who-sees-whom (the AI decides from it), the "recently fired" timer, team upgrade caches, roads (re-synced after restore) and two identity checks in the movement code. Not covered: `G.timers` closures (a few delayed power effects, ≤ 8 s), and fog "explored" memory does not exist in this game (fog is recomputed from units every frame).

## Test
`node orch/savetest.mjs` (new gate job `save`, `cigate.sh` now waits for 21 results): 5-minute AI battle → save → load in a fresh page → state hash right after load equals the saved one → both run 2 more minutes with the same random numbers → hashes must match → reload the page, Continue works → file round trip → old/damaged/foreign files refused. Deterministic mode lives in `orch/savelib.mjs`.

## Results
- `node orch/savetest.mjs` (5 min battle → save → fresh page → +2 min, identical hash `3640833123` in both pages; Continue after a reload; file round trip; refusals): **SAVETEST PASS**. Packed save ≈ 22 KB for a 50-unit battle at 5:00; `ckEncode` 3–6 ms on the game thread.
- `node orch/smoke.mjs`: SMOKE PASS. Full gate: see the push note in HISTORY.
- Screenshots: `orch/shots/savegame/` (1 save dialog, 2 dialog with saves, 3 load list with thumbnails, 4 main menu with Continue, 5 a loaded battle).
- Not done: the multiplayer part (host saves, clients get a toast, Load on an online save → Play online with seats) — spec and entry points in `orch/HANDOFF-savegame.md`.

## Try it (2 minutes, PC)
Open https://abdullahhaidar5-ux.github.io/ww3/ , start a skirmish, play a minute, press Esc → **Save game** → name it → Save. Press Esc → Quit battle. On the main menu press **Continue** — your battle comes back paused; press P.

