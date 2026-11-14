# HANDOFF pacecap (2026-11-14)

**Unit cap.** Battle now has a 150 population cap per player: infantry 1, light vehicles 2, tanks and heavy vehicles 3, aircraft 3 (supply trucks and dozers free). The top bar shows "units 87/150"; at the limit, training is refused / held and the player sees "Unit limit reached (150)." The AI uses the same queue code so it respects the cap. The count comes from live units plus queues, so there is no new saved state; host, clients and checkpoints agree. Guard in `orch/decisions.mjs`.

**Match length.** Before: equal AIs 1v1 on four Battle maps ended after a median 14.5 game-minutes. After (one number, `BATTLE` 1.75 to 1.0 in `src/03-sim.js`: start money, income, build speed, AI wave size): median about 20 min over 16 games (range 10-30, one 50-min stalemate). Full table in `orch/reports/pacecap.md`; tool `node orch/pacemeasure.mjs`. AI armies peak at only 10-95 population, so the cap bites only human players who build big. If ORCH wants nearer 25 min, try BATTLE 0.9.

**Extra job (from `orch/PACECAP-NOTE.md` on this branch, written by ORCH, not in my task prompt):** unit gifts to allies are now 5 per gift, once every 2 minutes (was 12 per 20 s); tooltips updated; note deleted. Please confirm that is what Abdullah wanted.

**Gate / status:** see the last lines of this file.
