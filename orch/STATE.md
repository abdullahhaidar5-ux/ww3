# Conductor state — 2026-11-14 ~20:25 UTC (Sat 14:25 Chicago)

Main = 2bfad53de. ORCH itself landed ~14 branches between 20:07 and 20:13 UTC (presentation, dozerbuild, bldqueue, orderfeel,
nations20 = 22 nations, polishlooks, polishspeed, rangemirror, squads, destruction, pacecap, weathergfx, battlerules2) after
"orch/FINISH-NOW.md" (skip cigate, push straight to main). No train/* in flight. **This run built no train**: main was moving under
ORCH's hand and every remaining candidate is conflicted or not ready (merge-tree dry runs against 2bfad53de below).

| Branch | State |
|---|---|
| onegame (remove Conquest + campaign, supply lines in Battle) | 17 ahead, 24 conflicted files against new main (01-data, 03-sim, 06-view, 08-ui, 14-menu, decisions.mjs, workflows...); last conductor try also failed. Needs a human-sized merge, not landed |
| pileflag2 | 9 ahead, handoff "merged with main, smoke pass" (13 min ago) but 8 conflicts now; the first pileflag was reverted on main (6c3916f), cause not recorded. Not landed |
| ammotruck / ammozone | 27 conflicts each, no gate result; overlap onegame's ammo rule. Not landed |
| battlemaps | 2 conflicts; handoff says towns/roads rules not applied yet. Not ready |
| L2-mechanics, L3-economy, L5-unitlooks (new lane branches) | handoffs say NOT proven/ready (gate queued or partly red); 4 / 2 / 1 conflicts |
| maptrim | PARKED by ORCH (until after Monday), never gated |
| techbldgs, ghostslot, testrange | on main; only ORCH note commit left on the branch |
| camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans | parked (removed from the game) |
| taken/* with no orch/* branch | none newly found |

Environment: full `git fetch` takes ~5 min (7.6 GB .git); smoke/smooth here are too slow to trust, CI is the judge.
