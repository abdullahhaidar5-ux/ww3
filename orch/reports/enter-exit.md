# Getting in and out with no button (branch orch/enter-exit, built on orch/controls2)

- **Get in:** select troops, right-click (tap) your transport, tunnel or a building → they go in. The cursor turns into a house. Units that can't fit (tanks into a helicopter, aircraft) drive up next to it.
- **Leave a building / tunnel:** select it, right-click (tap) the ground → everyone comes out and runs there. Right-click an enemy instead → the troops inside focus fire on it and stay in.
- **Leave a transport:** select it, right-click (tap) the transport itself → unload right there. Alt+right-click a spot → it drives (or flies) there, then unloads. Several transports selected → all unload.
- The Unload / Bring out buttons are still there; hints and tooltips explain the new way.
- Multiplayer-safe: same order messages plus one "at this spot" flag, handled by the host and the Cloudflare server alike. Headless determinism check passes.
- Tests added to controls.mjs and touch.mjs (shared orch/enterexit.mjs).

CIGATE PASS — all 16 on f37b62dbd7 (controls 94/94, touch PASS, headless determinism PASS, mpsync + server mpsync PASS).
