# Getting in and out with no button (orch/enter-exit, built on orch/controls2)

- **Get in:** select troops, right-click (tap) your transport, tunnel or building. House cursor shown. Units that can't fit drive up next to it.
- **Leave a building / tunnel:** select it, right-click (tap) the ground: everyone comes out and runs there. Right-click an enemy: the troops inside focus fire and stay in.
- **Leave a transport:** select it, right-click (tap) the transport itself: unload there. Alt+right-click a spot: drive/fly there, then unload. Several transports selected: all unload.
- Unload/Bring-out buttons kept; hints and tooltips updated.
- Multiplayer-safe: same order messages plus one "at this spot" flag, handled by host and Cloudflare server alike.
- New tests: orch/enterexit.mjs, run from controls.mjs and touch.mjs.

CIGATE PASS: all 16 on f37b62dbd7 (controls 94/94, touch, headless determinism, mpsync incl. server).
