# AI personalities + Co-op vs AI (2026-11-04)

**Personalities** (data table `PERS` in `src/03-sim.js`): Balanced (old AI), Tank Rush, Guerrilla, Artillery Turtle, Air Power, and Random (picked at battle start).
Each sets build-order prefix, attack timing / wave size, unit-class mix, and extras (Guerrilla: ambush pickets + raids on enemy supply trucks).
No extra money; difficulty is unchanged. The personality rides in the existing AI-difficulty number (`d + 10*code`), so the page host, the Cloudflare server and host-migration checkpoints carry it with no new snapshot state.
**UI:** an "AI style" menu on every AI row in Skirmish and in the online lobby (saved through the Cloudflare lobby too).
**Co-op:** lobby chip "Co-op vs AI" (all humans Team 1, AIs Team 2, adds AIs if none) plus an "All AI: level" menu; Skirmish has "Me vs all / Free for all / Co-op: me + allies vs AI" chips.
**Fairness** (`node orch/aitourney.mjs --pers N`, 4-5 nations, both slots, 12 min, vs Balanced, Normal): Tank Rush 54%, Guerrilla 38%, Artillery Turtle 58%, Air Power 48% (20 games). All inside 35-65%.
Gate: smoke, cigate all PASS. Servers PR needed (sim + server battle.js changed).
