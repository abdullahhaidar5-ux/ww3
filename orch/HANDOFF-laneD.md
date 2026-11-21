# HANDOFF lane D - vehicle art re-applied onto the Nov 19 night game (2026-11-21, Stalingrad)

Base: main 55f2340 (= aae60d36 game code). Nothing pushed to main. ORCH lands, one branch at a time, only after Abdullah OKs the pictures.
Note: main moved on while I worked (0119b01, 261e9af...); every branch below needs a rebase on origin/main + `python3 orch/build.py` before landing (src-only diffs, 11-models.js / 11e-east.js, should rebase cleanly).

## Branches (one theme each; each is: re-applied src + rebuilt index.html, then tool + pictures commits)
| Branch | Re-applied | Gate (own cigate run on the src commit) | smooth-pc median / p95 / draw calls / k tris | Verdict |
|---|---|---|---|---|
| main 55f2340 (before) | - | 27/28, superfreeze FAIL on main itself | 37.1 / 70.9 / 1214 / 6120 (317 units) | baseline |
| `orch/laneD-shia` (src 8437ce3) | 59b5798 technicals per nation RS/DW/OB | 27/28 - only superfreeze, same as main (main is worse there: 2.8 s vs 0.5 s) | 50.6 / 94.8 / 1198 / 6403 (339 units) | Cheapest possible (extra boxes merged into the one cached add-on mesh, no new mesh/material). But **invisible at battle zoom**; only visible on the close-up sheet (DW aerial + spare wheel, OB bed plates, RS shield lip). Low value. OK to land if Abdullah wants it; not worth a slot by itself. |
| `orch/laneD-west` (src 6720337) | 73e8a86 navy kit, 35dcb25 tank add-ons, b86a73e jeeps + howitzer paint | **loadfreeze FAIL: "US: 13 shader programs linked in one go (max 12)"** (main passed it; but regional fails the same check on IR, which it doesn't touch, so it may be borderline 13-vs-12 noise - not sure); also superfreeze (as main), migrate-down + cfclient (infra flakes: lobby timeout / `wrangler dev exited`, no net code touched) | 49.8 / 87.4 / 1191 / 6466 (343 units) | **Do not land as a bundle.** Jeeps -> Humvee: clear win. Navy: sleek grey boats become dark boxy barges - looks worse. Tank add-ons invisible at battle zoom. Howitzer: UA loses its own tracked SP gun for a repainted G6 (worse); paint differences hard to see. FR/DE jeep becomes the Ozelot missile carrier (reads as an ATGM, wrong). Split into the two branches below. |
| `orch/laneD-west-jeeps` (src 77162a5) | jeep line of b86a73e only, US/GB/IL/UA -> Humvee (models + paints the West ATGM carriers already load) | still running at handoff time - read with `orch/cigate.sh 77162a5a2f` | - | The one visible West win, without new models/paints. |
| `orch/laneD-west-tanks` (src c49ad6a) | 35dcb25 only | partial at handoff time; mpsync FAIL (spectator lobby-join timeout, infra) | 51.4 / 207.6 / 1171 / 6397 (335 units) | Cheap (merged into the existing kit mesh) but invisible at battle zoom. Low value. |
| `orch/laneD-regional` (src 913bfa9) | 07674c0 KR Kargu detail, 6e9f898 regional AA/EW/dozer kits | 26/27: **loadfreeze FAIL** ("IR: 13 shader programs in one go, max 12" - odd, branch does not touch IR models; may be borderline/flaky, not sure) | 45.8 / 131.7 / **1471 / 8270** (347 units) | **Drop.** Only branch with a clear cost: +~260 draw calls (+21%) and +~2 M triangles (+33%) vs every other run. Kits read more detailed on the white close-up sheet, but in the battle they are blocky/toy-like (against TASTE "gritty realism"): dozers become large crude blocks, ATGM Humvees get a launcher rack stacked on top of the one they already have (doubled on SA/AE tracked carriers), EW big dish -> two small dishes. Kargu change is tiny. Also: on main the regional dozers did not show at all in the battle scene (only on the sheet) - not sure why, worth a look. |
| `orch/laneD-drones` (src a0c4878) | d2cee05 drone fuselages/wings/tails/gear/props | 26/27: ew FAIL ("rubble: tank never enters the rubble" - a pathing test; this change is view-only and main passed it; likely flaky, not sure) | 38.9 / 55.7 / 1190 / 6162 (345 units) | Fixed-wing drones clearly better up close (shaped fuselage, gear, sensor ball, Shahed nose). Code builds fewer meshes per drone than before (1 mesh() call vs 4). At battle zoom: drones a bit darker/slimmer, subtle. Quadcopter props became red-capped discs - not sure that's better. Best candidate after jeeps. |

## How honest are the numbers
- **smooth-pc is one run each on a shared GitHub runner and very noisy:** the shia branch (a few boxes in one cached mesh, can't cost 13 ms) measured 50.6 ms vs main 37.1; drones measured 38.9. Units on screen also differ run to run (317-345), so k-triangles move with it. Draw calls are 1190-1198 on every branch vs 1214 on main - none adds draw calls. I can't honestly say any branch is slower or faster from one sample; the loadfreeze fail on West is the only clear performance signal.
- Runners have no GPU (LESSONS rule 1): green gates are not proof it runs smooth on Abdullah's PC.

## Pictures (orch/shots/laneD/ on each branch, rendered on a GitHub runner, same scene before/after)
- `<theme>-battle.jpg` normal battle camera; `<theme>-close-<NAT>.jpg` low close camera per nation row; `west-navy.jpg`; `closeup-*.jpg` = orch/artaudit.mjs contact sheets (rows = nations).
- Tool: `orch/laneDshots.mjs <theme> before|after` (bm_breakwater, Day, seed 7, 4 nations, parks rows of vehicles on open sand). Runner workflow lives only on branches `shots/laneD-<theme>` (.github/workflows/laneDshots.yml, renders main + branch, pushes to `shots/laneD-out`). Snow map not rendered this run.
- Shia/RS (what his group plays) changes are invisible at battle zoom.

## Suggested order for ORCH (one at a time, each with Abdullah's OK on the picture)
1. `orch/laneD-west-jeeps` (if its gate is green) - its jeeps are the same as in the west pictures for US/GB/IL (FR keeps the truck): send `west-close-US.jpg` from orch/laneD-west (ignore the boats/howitzers there).
2. `orch/laneD-drones` - send `closeup-shia-air.jpg` + `drones-close-IR.jpg`.
3. Skip/park: west bundle (loadfreeze), regional (looks blocky), shia + west-tanks (invisible at play zoom).

Not done: snow-map pictures; repeated smooth runs to beat runner noise; real-PC check.
