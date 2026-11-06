# Tutorial — "make sure it's good" (orch/tutorial-good, Sonnet 5.5)

Abdullah, 2026-11-05 18:40: "Make sure it's good." Nobody had played the tutorial end to end as a new player. This run did:
`orch/tutorialtest.mjs` plays every step headlessly with real mouse and keyboard events (box-select, right-click orders,
building placement, minimap clicks, the L and F keys) and prints `TUTORIAL PASS`.

## What was wrong (found by playing it)

| # | Step | Problem | Fix |
|---|---|---|---|
| 1 | all | **No arrow or highlight anywhere.** The old tip only said "Show me" (which jumped the camera). | Pulsing ring + bouncing arrow on the exact button, building or map spot; off-screen targets get an edge arrow plus a minimap ping. |
| 2 | start | Camera opened with the HQ half off screen; the soldiers were small and far. | Every step moves the camera to what it points at (a little north so the target sits below the tip). |
| 3 | setup | The text promised a 90 s countdown but `setupEnd` was 0, so **no setup phase ever ran**; the step just timed out after 12 s. | Step starts a real setup phase (75 s) and is done when you place and finish a Barracks. |
| 4 | unrest, civic, logi | These steps **completed by themselves on a timer** (16–25 s) — nothing to do, nothing learned. | Every step needs one action: set Extortionate and watch a real revolt; open the town panel; press L; buy a power; build a battery. |
| 5 | train | After selecting the Barracks the panel still shows the Build tab; the soldier button is on the **Units tab**, which the tip never mentioned (dead end). | Arrow points at the Units tab first, then at the soldier. |
| 6 | town | With the 2 starting soldiers a town can **never** be captured: it needs more than half of its key houses (2 of 3) and both soldiers walk into the same house. Dead end. | A second squad arrives, the ring moves from house to house, the tip says "2 of 3 houses". |
| 7 | tax | Left-clicking your own town's house **selects the house and closes the tax panel** — a new player cannot find the tax buttons. | Arrow points at the town's marker on the minimap (that click opens the panel) and at the High / Extortionate / Low buttons. |
| 8 | unrest | Unrest rises too slowly to ever see a revolt in a tutorial. | While the tutorial town is on Extortionate its unrest is sped up, so the revolt really happens within seconds. After it, reinforcements arrive and "Retake the town" teaches the consequence. |
| 9 | hearts & minds | Long jargon text, not in the requested teaching order. | Folded away; the order is now select/move/attack → setup → town → tax → unrest → civic → supply → power + missile defence → win. |
| 10 | tips | 40–60 word tips, 15–17 px text over the top of the screen, overlapped the setup banner and the town panel. | 1–2 sentence tip + one yellow "do this" line; box sits below the setup banner and right of the town panel. |
| 11 | rescue | If every soldier died the player was stuck. | Reserves arrive when no soldier is left (garrisoned soldiers count as alive). |
| 12 | end | Ended with a one-line toast. | "You're ready!" screen: 3 tips + **Start a real match** (same nation) / Main menu. |
| 13 | enemy / win | The enemy never does anything, so the last step has no pressure; waking the Easy AI was tried and **wiped a 14-soldier force in 30 s** (it builds a barracks and factory within seconds), so a new player could not win. | The enemy stays calm (no AI): it keeps its 2 base defenders and a lighter HQ (1500 HP); reserves + $2500 arrive at the last step. Still a long march (the map is 9000 units wide), so the tip says keep producing and use the minimap. |
| 14 | start | The "Choose your General Doctrine" pop-up sat under the tip box. | Switched off in the tutorial. |

Bugs found only by pinning the map seed and replaying on 3 different maps (all fixed): the move spot could land in the river or under the bottom HUD (now walkable ground, always on screen); it could lead into the red scouts so the 2 starting soldiers died (spot is sideways, scouts are 2 weaker ones farther out, you start with 3 more soldiers, reserves arrive up to 4 times); if the scouts were already dead the attack step had nothing to attack (it now spawns new ones); the civic step finished by itself when the panel was already open (now: press Low); during the retake fight the rebels hole up in the houses or the houses get shot to rubble, making the town impossible to take (tutorial rebels are weak, two stay, they leave the houses, and the town's houses cannot be destroyed).

Test findings worth knowing: software rendering needs seconds per frame here and on CI, so the gate run stubs the GPU draw call (game logic and HUD run normally); a slow CI runner once needed over 20 min for the last fight, so the test now fast-forwards the battle clock between its real inputs (about 4 minutes in total) and pins the map seed (`TUT_SEED=n` to try another). The EW gate test failed once on an unrelated rubble-pathing flake and passed on re-run.

Not changed on purpose: the civic step teaches "hold the town's perk building" — in the game civic buildings are part of each town
(market / garage / clinic or mosque); players cannot build them, so the tutorial does not ask for it.

## Steps now (14, about 10–12 minutes)
1 select · 2 move · 3 attack · 4 setup phase + Barracks · 5 train soldiers · 6 capture a town · 7 set tax (High in the rear, Low at the front — why) ·
8 unrest and a revolt · 9 retake the town · 10 civic perks + tax down · 11 supply lines (L) · 12 buy a power · 13 missile defence · 14 destroy the enemy base → "You're ready".

Checks are state based, so doing things out of order (building the Barracks early, capturing another town) never blocks a step.
Skip step, Exit tutorial, restart from the menu and "Tutorial (replay)" after finishing are all tested.

## Files
`src/08b-social.js` (tutorial only; no simulation change, so no servers-live PR needed), `orch/tutorialtest.mjs`,
`.github/workflows/gate.yml` (new job `tutorial`), `orch/cigate.sh` (N 20 → 21), screenshots (JPEG, 1920x1080, one per step) in `orch/shots/tutorial/`.

## Running it
`node orch/tutorialtest.mjs` (gate: 1280x720, Low graphics, GPU drawing stubbed because software GL needs seconds per frame; ~10 min).
`node orch/tutorialtest.mjs --shots` = PC 1920x1080 full graphics with a real-frame screenshot per step into `orch/shots/tutorial/`.
In the last step the test adds a strike force (a real player trains one) and switches the enemy AI off to keep the run short; everything else is real input.
