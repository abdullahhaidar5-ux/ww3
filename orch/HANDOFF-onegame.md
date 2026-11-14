# HANDOFF — onegame (branch `orch/onegame`, 2026-11-14)

Abdullah, Fri 2026-11-13 Chicago: 20:18 "Abandon conquest and campaign entirely remove them from the game"; 20:19 "Bring supply lines
into battle"; 20:06 ammo rule; 20:24 "Keep capturable quarries and mines and power plants and field hospitals"; 20:38 "The vision is a
super super polished and smooth and beautiful battle game and test range"; 20:43 "If you own a road do units get automatically
supplied" (yes); 20:53 captured buildings "Shouldnt these resupply" (yes). **Not landed** — the conductor lands it after the Battle
branches in flight (techbldgs first). Main had not moved (a3b627b) when this branch was finished.

## Commits (in order)
1. `72a8eff7` Remove the grand campaign (src/13*, lazy bundle + loader, GRAND_FILE line, sw.js entry, Extras item, campaign saves in
   Continue, campaign lobby, campaign tests/data/docs). Gate list 28 → 25 jobs (grand, grandsmooth, grandlive gone).
2. `90f5ee20` Remove Conquest; Battle gets supply lines + the ammo rule.
3. `51c4b1b4` Menus (Play · Multiplayer · Test range); supply lines from every building / held map building; enemy troops cut roads; AI.
4. `956cd9c5` Docs (CLAUDE.md vision + one game, SYSTEMS, BRIEF, HISTORY, plans). DECISIONS.md entries went with commit 3.
5. `7f25ae0f` Ammo-rule leftovers ported from orch/ammozone.
6. (last) proof pictures, this handoff, menu tagline/step names, ONEGAME-NOTE.md deleted.

## Removed (all in git history)
Grand campaign: every `src/13*` module, `src/12zz-grandload.js`, `grand.<hash>.js`, `grand/` textures, `orch/realmap`, grand tests
(grandtest, grandsmooth, grandlive*, grandrt, occtest, legtest, gnettest + ~60 grand probes/shot scripts), GRAND-PICKS / CHAIN / REAL-2026.
Conquest: `G.conq`, towns/hamlets (`initTowns`/`updTowns`, capture, tax, unrest, revolts, rebels, towers, bribes, recruits), world
opinion / aid / refugees / radio station + leaflets / neutral militias (03e-politics now = spies + decoys only), fuel + blackout,
`src/03h-economy.js` (food, caravans, growth, invest, hamlet mines), `src/08c-towns.js`, `src/08c-economy.js`, convoys, territory /
front line, setup timer, $10,000 full-base start, Conquest missile rules, Conquest/Battle lobby switch, **Realistic toggle** (its tiers
came from the grand campaign's GR_REAL; without it every nation was "Regional"), the Conquest tutorial, Conquest probes/tests.
DW hero ability "Turn the town" → **"Cut the supply line"** (craters the nearest enemy supply road). Radio & TV Station is no longer
buildable (STRUCT row kept, desc says so). Net protocol 9 → old saves and replays are refused as "older version".

## Kept, and why
- **Missions: all five stay** (Hold the Pass, Supply Run, Mountain Fortress, Retake the Town, Combined Arms) — they use their own zones
  and scripts (CH helpers), none needed towns, Conquest or the campaign. None removed.
- **Every Conquest map works as a Battle map** (fields + derricks exist; 122 maps listed: Battle maps first, then the rest; the
  "Conquest battlefields too" link is gone). The old town / hamlet buildings are plain garrisonable buildings.
- **Map power plants** (M.plants) stay capturable G.oil rows (ORCH note 20:24) — no blackout/power effect any more. When orch/techbldgs
  lands, make them its `plant` type (one system) — techbldgs has its own TB quarry/mine/plant/hosp on G.oil rows.
- **techbldgs adds `tbSupplyPts`** (resupply hook): this branch's `supplyPoints()` already adds every held G.oil row (incl. `tb`, an
  `ammo` dump at 340 and 2x refill) — when merging, keep ONE: drop tbSupplyPts or feed it into supplyPoints, never both.
- **orch/ammozone could not be git-merged**: its history merges an old main (a merge would delete vo/AU.mp3, vo/CA.mp3, vo/GB.mp3 and
  ~260 other newer changes). Its src changes (ammoOn, hasAmmo, no supT timers, ammo row, out-of-ammo badge + tooltip, AI pull-back rule,
  unit-bar check) are ported by hand. Its docs (HANDOFF-ammozone, CLAUDE line) were not carried.
- Spies + decoys keep working in Battle (they only ran inside Conquest's politics tick before; now `polTick` runs from updSupply).

## Supply lines (how it works)
`src/03c-logistics.js` `lgCover()` per team: sources = base node (while its HQ stands), depots/ports, every other own building and every
held map building within 260 of a road; each reaches LG_REACH=1500 of road (cut-off depot / blockaded port half); never through an enemy
base/depot; cut by craters, blown bridges, enemy checkpoints (`lgBlk`) and enemy ground units on the road (`lgCuts`, 55). Coverage =
intervals per edge (`L.cov[k][ei]={v,d}`), beads every 120 = the road part of the area. `src/03-sim.js` `supplyPoints()` is the ONE
"your area" (buildings 170 / HQ 380 / depot 320 / truck 230 / held map buildings 170 / ammo dump 340 + beads). Recomputed when the
network signature or `lgCoverSig()` (units on roads, buildings, captures) changes, at most once a second; clients recompute for drawing.
UI `src/08c-logi.js`: minimap always, ground with L / dozer / ammo units selected; green / red / gray, dashed cuts; Supply chip.
AI (`lgAI2`): idle soldiers clear enemy troops cutting its lines, small squads cut the enemy's, dozers fill craters on its lines.
Home-defender morale "home" = inside your own supply area.

## Numbers
- Load: index.html 3,605,488 B (1,255,046 gz) + grand bundle 1,236,236 B (502,665 gz, prefetched at idle) → **3,429,262 B
  (≈1.20 MB gz), no second bundle**.
- Sim cost, 8 players, Fulda, 4 game-min, seed 7 (headless, this sandbox; note only): before 121.1 ms CPU/game-s (Conquest default) →
  after 114.2 ms (Battle with supply lines). Frame time: not measured here (sandbox too slow); smooth-pc / smooth-mp are the judge.
- Local: smoke PASS after commits 1, 2, 3 (499–590 s); decisions PASS on commit 3 (+ static after every commit); headless runs clean.

## Gate
`gate/7f25ae0f2d` (run 43552051358) was pushed at 03:31Z but **every Actions run in the repo stayed queued for over an hour** (other
helpers' gates too, autodeploy too) — no results by the time this session ended. Conductor: run `orch/cigate.sh` on the branch tip
(25 jobs; known flaky: audio, mpsync, cfclient, icons, tutorial, mapsweep — re-run once). Watch: tutorial (rewritten for the Battle
tutorial), save (polishtest rewritten), mapsweep (all 122 maps now Battle), mpsync (protocol 9).

## Pictures (looked at)
orch/concepts/onegame/: 01 main menu, 02 Play window, 03 Multiplayer, 04/04b Battle map list + picker (122 maps), 05 Battle with
supply lines (ground + minimap), 06 the same line cut (dashed), 07 a tank out of ammo outside the supply area.
orch/shots/onegame-supply-1-held.jpg / -2-cut.jpg. Script: `node orch/onegameshots.mjs`.

## Left for later
- Non-gate scripts still mentioning Conquest in comments (bandfair, bandshots, mappickshot...). tourney `--real` is a no-op.
- `CF.UNREST` constant in 03d-command is unused now.
- Ask Abdullah to try on PC for 2 minutes: start a Battle, press L, build a Supply Depot down a road and watch the green line grow.
