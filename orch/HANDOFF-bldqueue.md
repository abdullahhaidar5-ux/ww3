# HANDOFF bldqueue (branch orch/bldqueue)

Abdullah 2026-11-13 20:15: "Also make units que and must be built in their home building for instance infranty in barracks like generals." Correction 20:16: "Unlimited queue".

## Rules now
- Every production building (HQ, Barracks, War Factory, Airfield, Shipyard) has its own queue `b.q = [{kind,t,c}]`: unlimited, one unit at a time, `c` = price paid (refunded in full on cancel or when the building dies). No shared per-type queue (`T.q` is gone), no +50% for a second building, no random spawn building.
- A unit comes out of the building whose queue made it and walks to that building's rally point (`b.rally`, else the army's `T.rally`). Two Barracks build two units in parallel.
- Actions: `{t:'q',k,tid}` adds to building `tid` (none/invalid = least busy of that type); `{t:'dq',k,tid,ti}` cancels slot `ti`; `{t:'rally',x,y,ids}` sets the rally of the listed buildings (no ids = army rally, used by the depot button).
- Screen side is `src/08o-prodq.js`: queue strip above the command bar (icons, progress bar on the first, x3 badges, first 8 + "+N more"), Units tab filtered to what the selected building makes, floating badge + progress ring over every producing building, minimap tooltip. Left-click adds, Shift adds 5, right-click a unit button or a queued icon cancels one. With nothing selected the Units tab adds to the least busy building and says which when there are several.
- Net: `teamMsg` sends `q: {buildingId: [[[kind,progress,paid]...], rally]}`; `applyTeam` writes it onto the client's buildings. Saves/host migration: building queues ride the entity checkpoint; old saves move the old shared queue onto the first building of that type (`07b-ckpt.js`).
- Building destroyed: `kill()` refunds its queue. Disabled building (`dis`) pauses only its own queue. (No low-power pause yet: orch/battlepower has not landed; hook is the `b.dis>G.t` test in `production()`.)
- AI: spreads orders over its buildings (`qPick` = least busy), cap per building; autobuild keeps "at most 3 per building".

## Guards
`orch/decisions.mjs` (search "bldqueue"): no shared queue, two Barracks build two infantry at once, each unit spawns at its own building, cancel refunds fully, destroying a Barracks refunds its queue, 20 infantry in one Barracks all come out, no leftover bonus/random-spawn code.

## Checks run here
- `build.py --check` ok; `smoke.mjs` SMOKE PASS (before the last UI tweaks); `decisions.mjs` all bldqueue guards green; the one failure it showed (rally flag flashing when selection changed) is fixed in the last commit.
- Pictures: `orch/concepts/bldqueue/` (Barracks selected with progress + x3 badge + map badge; two War Factories building in parallel with badges; Barracks with its own rally flag, unit about to walk out - the spawn position itself is proven by the guard, the sandbox is too slow for a walking clip).
- Tourney (IR,US,RU,CN, 2 games, same seed): see the section below.
- CI gate: see the section below.

## Try for 2 minutes (PC)
Start a Conquest, build a second Barracks, click the first Barracks and Shift+click a soldier, click the second and do the same: both queues run at once and soldiers walk out of the Barracks that made them. Right-click a queued icon to cancel (money returns). Set a different rally point for each Barracks.

## Results
- Tourney (IR,US,RU,CN, 2 games each, seed 5, 12 min cap; old main vs this branch): both versions play normally (units built, fights, draws/wins); the sample is too small to prove balance did not move. Single-game production counts at 8 game-minutes, RU vs US strait: main RU 28 / US 36, branch RU 28 / US 20 (one seed, the RNG sequence also changed because the random spawn building is gone). The real design change: a second Barracks is now a full second queue (2x) instead of +50%; AI orders are spread over its buildings. A bigger `--real`/round-robin tourney on GitHub is worth running before landing.
- The tourney first exposed a real leftover (naval AI and the factory smoke flag still read the old shared queue); fixed in the last code commit.
