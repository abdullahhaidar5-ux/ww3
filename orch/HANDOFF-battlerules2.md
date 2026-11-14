# HANDOFF battlerules2 (Brutal AI, Strike Center polish, fog memory, splash friendly fire)

Status: code done and pushed to `orch/battlerules2` (not on main - the conductor lands it). Gate result: see the last section.

## What a player gets (plain words)
- **Strike Center (the one superweapon, same `uplink` building - no second system).** In Battle it costs $5000, needs an Airfield, one per nation, and takes 6 minutes to charge. When anyone's comes online everybody gets an alarm message with the timer, a banner at the top of the screen counts down every Strike Center in the match (red for enemies, green for you and allies), and a second alarm says READY. Each nation has a conventional strike name: cruise-missile salvo (US GB FR DE UA IN JP), ballistic strike (CN KP KR PK SA TR), carpet-bombing run (IL EG), Thermobaric Strike (RU), heavy rocket barrage (IR RS DW RV OB), precision salvo (AE). Salvo size, damage and radius stay each nation's old numbers. Nothing nuclear, chemical or biological exists (guard in `orch/decisions.mjs`).
- A salvo can take at most 40% of any building (the Command Center survived with 60% in my test); enemy SAM sites still shoot some missiles down; the launch site shows on the enemy map for 45 s.
- AI builds the Strike Center last, only on Hard and Brutal, and fires it when ready.
- **Fog:** never-seen ground is black, seen-but-not-visible ground is grey and stays readable, ground in sight is clear (updateFog in src/06-view.js, view only, minimap follows).
- **Friendly fire:** in Battle, explosions (shells, rockets, bombs, grenades, strikes, powers) hurt your own and allied units in the radius at 50%; buildings are spared; bullets never hit friendlies (test: own unit lost 52% of what the enemy beside it lost).
- **Brutal AI:** 4th level (Easy/Medium/Hard/Brutal) in Battle setup (the Test range sits on that same setup panel), the online lobby and the server. It is Hard with sharper tactics only: thinks ~2x faster, earlier first attack, bigger waves, half the column flanks, more focus fire and supply-truck raids, damaged units fall back earlier. Same income as Hard, no extra vision (guard).

## Files
src/01-data.js (SW_* data, bstats), src/03-sim.js (swSup, swTick, launch, explode, DIFF[3], aiThink), src/06-view.js (updateFog, swBanner), src/07-net.js + 08-ui.js + 08b-identity.js (Brutal level), orch/decisions.mjs (guards), orch/br2check.mjs (browser check that made the screenshots), orch/shots/battlerules2-{banner,strike,fog}.jpg.

## Not done / notes for ORCH
- "Needs power": there is no power grid in the game, so the Strike Center needs only to be built, working (not hacked/disabled) and an Airfield.
- No new strike sounds or visuals; it reuses the existing missile arc / air strike FX and the 'inbound' alarm log.
- Friendly splash applies in Battle only (`G.battle`); missions/grand/conquest unchanged. If onegame makes everything Battle, nothing else to do.
- The tourney equal-strength check (`orch/tourney.mjs`) was NOT run here (too slow in this sandbox); all nations keep their old salvo numbers and share one 360 s timer.
- Smoke printed no PASS locally (loading screen took 235 s in the sandbox); trust the GitHub gate.

## Gate result
`orch/cigate.sh` ONCE on commit 22d82dd (gate/22d82ddd13, run 558): still QUEUED on GitHub when I stopped (no runner picked it up after ~25 min), so no gate result yet. Local: build + `--check` pass; decisions static guards pass (tested by extraction); orch/br2check.mjs passes (Strike Center timer 360 s / $5000 / needs Airfield, HQ kept 60% after a full salvo, friendly splash 52% vs 98%, fog black/grey/clear 255/140/0, Brutal d=3 inc=1). Full smoke/decisions not completed locally. Status: NOT ready until the gate run turns green - check https://github.com/abdullahhaidar5-ux/ww3/actions/runs/43554547194
