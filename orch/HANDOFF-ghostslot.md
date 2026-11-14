# HANDOFF - ghostslot (branch orch/ghostslot, 2026-11-14)

Abdullah (2026-11-13 19:58): a 2-player Battle (Lebanese Shia vs US AI) ended with a third scoreboard column "Zaidi Shia Movement - Player".

## Cause
Not the setup, the lobby or empty slots. `newGame` (src/03-sim.js) always appends one hidden local-militia team (`T.reb`, faction `DW`, tm 900, always the last team) to `G.teams`, for rebel towns and militias. `endStats()` built its player list from every team, so the end screen showed that militia team as a player. The Players step, `rollAis`, `startSingle` and the online lobby build their teams from real players plus AIs only, so no empty seat ever became a team. Reproduced from the menu flow (2-player Battle map, RS vs US): `G.teams = RS, US, DW(reb)`, three scoreboard columns.

## Fix
- `endStats` (03-sim) lists only non-`reb` teams and adds `bt` (Battle flag). The ghost is always last, so player numbers stay aligned.
- `esClean` (08-ui) also drops a tm-900 entry from stats sent by an older server or an old save (a ghost team in a save still loads; it is just hidden).
- Battle scoreboard has no "World opinion" row (`esRows`); Conquest keeps it.
- Stat labels and values never wrap (14 px, nowrap, columns min 280 px).
- Sim state is untouched, so sync, saves and host migration are unaffected.
- Guards in orch/decisions.mjs ("ghost team"): 2-player Battle and 2-player Conquest -> exactly 2 teams in the end stats, 2 scoreboard columns (also with a ghost entry injected, as an old server would send), no opinion row in Battle, opinion row in Conquest.

## Gate
Local: `build.py --check` OK, `smoke.mjs` SMOKE PASS, and the new "ghost team" guard passed in both Conquest and Battle inside `decisions.mjs` (the full local decisions run was cut off by a sandbox restart, so GitHub's decisions job is the proof for the rest). cigate on commit 6552ce4 (gate/6552ce4...): 26 of 28 green on the first run; `gate/tutorial` and `gate/cfclient` failed (both on the known-flaky list). I re-ran those two once; the re-run was still queued on GitHub's runners when this helper stopped, so the conductor should check run 43548375367 before landing.

## Pictures (orch/concepts/ghostslot/)
1-players-step-2p-map.jpg (Players step: exactly two players), 2-end-screen-BEFORE-3-columns.jpg, 3-end-screen-AFTER-2-columns.jpg. Note: the Victory screen still lets the HUD show through below the scoreboard - that is sweepfixB's job, not touched here.

## Try for 2 minutes
Play a 2-player Battle on PC (any 2-player Battle map, you vs one AI), win or lose quickly, and look at the end screen: only your nation and the AI should be listed, with no "World opinion" line and each stat on one line.
