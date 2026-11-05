# HANDOFF — Conquest (branch `orch/conquest`, 2026-11-05)

Read `orch/reports/conquest.md` first (design, numbers, code map). State when this was written:

## Done and in the branch
Stage 1 (towns, tax, unrest, revolt + rebels, hamlets on every map, minimap, tax panel, AI tax/capture), stage 2 (everything unlocked via
`reqMet`, $10,000, 90 s setup no-fire, base trickle, derrick ×0.6 / truck ×0.3, Revenue Center removed, "destroy the base" win rule + "Enemy
base: N of M" banner), a slice of stage 3 (missile rules: ≥ 8:00, $1500 per launch, ~5 min recharge, 40% cap per building per salvo, SAM
sites = missile defence with nation names, public "strike ready in m:ss" lines, strikes raise unrest `t.shock`), tutorial steps for towns + tax,
replay "older version" refusal, `NET_PV` 7. Smoke PASS on the stage 1+2 build; cigate result: see the last HISTORY line or run
`bash orch/cigate.sh`. Probes: `orch/conquest-t1…t5.mjs`, `orch/hamprobe.mjs`, `orch/conquestshots.mjs`.

## Exact next steps
1. **Gate**: if `cigate` shows failures, the usual cause is a test counting `G.teams` — the rebel team is the LAST element of `G.teams`
   (`T.reb`); filter `!T.reb` (done in smoke.mjs; mpsync/migrate/ewtest/replaytest/headless --compare may need it). The headless `--compare`
   hash covers all teams, so it should still match; if not, check `townRevolt` (uses `Math.random`? it does NOT — keep it that way).
2. **Merge to main** only when green (fast-forward after `git merge origin/main`), then open `main → servers-live` (the sim changed):
   `gh api repos/abdullahhaidar5-ux/ww3/pulls -f base=servers-live -f head=main -f title=... -f body=...` (or the GitHub MCP).
3. **Stage 3 left**: research cost/time per tier (UPG in `01-data.js`: make cost/time identical for the same tier across nations; `T.rq`
   one research per building), powers = rank from `gxp` + command points from calm held towns (`t.un<30` gives more), first-charge delay +
   recharge, nothing in setup (done: refused in `usePower0`), launch-site "revealed on the enemy's map" + minimap marker + countdown on
   the minimap (`drawTownsMini` is the place), nation-flavour missile-defence *building* (today the SAM site is the defence).
4. **Stage 4 left**: there is no Classic menu item to remove (Conquest = every non-campaign, non-sandbox game: `G.conq`); check the
   online lobby text for "classic"/mode wording; map editor button for hamlets (`D.hamAt`); AI "raid enemy rear towns".
5. **Fairness evidence** (not run — 2-core box): `node orch/aitourney.mjs` (18 nations), `node orch/mapfair.mjs --battles` (start positions),
   and `node orch/conquest-t5.mjs --seeds 20` (tax policies). Targets: nations 40–60%, no result decided in the first 3 minutes, length
   12–25 min. Tune `CQ_*`, `TAX`, `townBase`, `CQ_TRICKLE` if the AI economy is off (AI hoards money in some games).
6. Screenshots still missing: setup countdown banner, strike countdown / missile defence intercept, end screen (`orch/conquestshots.mjs`
   is the scaffold; it already makes the town/panel/rebel/hamlet/minimap shots in `orch/shots/conquest/`).

## ADDITION from Abdullah (2026-11-04 19:57) — civic buildings for the locals (stage 1, item 11) — NOT BUILT YET
Spec (verbatim intent): in/next to a held town or hamlet, builder/engineer builds worship place, clinic, school; money + build time; max one of each per town.
Effects (same numbers for every nation): worship = biggest steady unrest reduction + loyalty; clinic = calm + heals own infantry nearby; school = calm + slowly raises that town's tax yield.
Together they allow a higher tax without revolt. Faction-specific names + looks (never cubes, fits a town block):
IR/RS/DW Husseiniya or mosque (dome+minaret, black banners), "Martyr … Clinic", "Imam … School"; TR Ottoman, SA/AE Gulf/Najdi, PK Mughal, EG Cairo mosques + red-crescent clinic + school;
US/EU/UA field clinic (Red Cross), school, chapel/community centre; RU Orthodox chapel + field clinic + school; IL community centre + field clinic + school; IN temple-style hall + clinic + school;
CN "Friendship Clinic" + school + community hall; KP "Revolutionary Study Hall" (no real-person likeness) + clinic + school; KR church/centre; CU medical-brigade clinic + school + centre.
Rules: cannot be targeted by attacks; on owner change they stay and calm at half effect until the new owner pays a small "reopen" cost; shown on the town panel and as small minimap icons;
AI builds them in rich rear towns where it keeps High tax; include in fairness tourney; screenshots: IR Husseiniya, US clinic, RU chapel, KP study hall.
Hooks that exist: perks (clinic/mosque already calm unrest in `updTowns`: `t.perk`), `T_*` constants, `drawTownsMini`, tax panel `#townp` in `08c-towns.js`, `bldAllowed` in `01-data.js`, `addBld`.
Plan: add 3 building kinds ('civW','civC','civS') to 01-data with per-nation name/look table; place-near-town check in the build handler; `t.civ=[o,o,o]` + owner-change half-effect flag (`t.cv`) in updTowns; include in `tw` net packing/ckpt (bump NET_PV); mark `e.civic` untargetable in `nearestEnemy/applyDmg`; AI branch in the conquest block; models via procedural meshes in 04-gfx.
