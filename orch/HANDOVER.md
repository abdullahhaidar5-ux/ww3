# HANDOVER for a fresh ORCH conversation — written Thu 2026-11-12 06:25 Chicago (12:25Z)

Read this, then `orch/PLAN-75.md` (same branch `orch/plan75`), then CLAUDE.md. Abdullah reads on his phone (Chicago time), wants short
plain-word updates with pictures ORCH has looked at itself, approves with "Go"/"Yes". He often asks "Pics of new?".

## Usage rules (his: "No more resets. So let's be smart.")
- Max 5 helpers at once (2 Fable + 3 Sonnet is the usual mix). Fable (`claude-fable-5-2[1m]`, default on create) only for look/design/sim
  judgment and the conductor; Sonnet (`claude-sonnet-5-5`, set with update_trigger model — he approved this 11-11 17:48) for mechanical work.
- Helpers = scheduled tasks: create a DEDICATED trigger per job (compact standalone prompt, run_once_at far future, e.g. 2026-12-30),
  optionally update model, then fire_trigger (optional text). Never re-fire one trigger quickly with different texts. Never call list_triggers
  (huge output). Running helpers cannot be messaged or stopped.
- Helpers: lock `taken/<name>`, branch `orch/<name>`, save early, proof pictures in `orch/concepts/<name>/`, ONE `orch/cigate.sh`, never land.
  The Conductor (trig_01Cr6PwXooW5rLLWoinLF2fV, every 2 h at :45 UTC) batches gated branches into trains and lands; its report is
  `orch/STATE.md` on branch `orch/conductor`.
- ORCH's own turns are expensive: one status Bash per check, check every 2–3 h, no local smooth/grand tests (sandbox too slow).
- Never push docs-only commits to main. Never say "live" without checking the Pages build succeeded.

## Main right now
`7b4baa2` = train 9 (tutorial house-door fix, hover-card guard, no white cliffs in Arabia, smaller palms, map fairness report), 28/28 green.
Before it: train 7 gentler mountains (live). Conductor run 12 (09:30Z) landed nothing: train 10 was 27 of 28, only the flaky `cfclient`
group red (fails on a different sub-test every run).

## Branches waiting / in work
| branch | what | state |
|---|---|---|
| orch/armytokens2 | one token per army; SHIELD (land) / HULL (fleet) / WING (air) shapes he chose; tokens under HUD; Political button moved; one thin route style instead of chunky arrows; smaller cargo ships, quieter roads | handoff says 28/28 on train-9 merge; shield shapes NOT verified by ORCH (picture too far out) — look at a middle-zoom picture before telling him |
| orch/freezefix | Kheibar strike freeze fixed in tests + Performance log under Settings | green alone; the Fight-it "PREPARING GRAPHICS 78%" hang left open (moot for campaign now, still check Conquest/Battle loads) |
| orch/finish-menu, orch/finish-radio | living main menu, commander's radio + edge alerts | on train 10, waiting for a green run |
| orch/fortline | only Construction Vehicles build fortification lines, traced by dragging; infantry only "Dig in" | pictures good; check its gate, then conductor |
| orch/bldfix | floating factory frame/roof parts fixed; + Test range any faction; + old supplies look (check the last two were done) | pictures good for job 1; check handoff/gate |
| orch/battleclean | Conquest full base + $10,000 at second 0; Battle without supply lines/dotted roads; Conquest roads green (yours) / red (enemy) / gray (neutral), dashed when cut; rally flags vanish when clicking away | **breaks `tutorial` (and superfreeze/cfclient on the train)** → needs a Sonnet fix run (trigger trig_01XWi5o4yyKve5DpcQDPEhnp; fire with text: fix tutorial steps 3/4/14, merge main, one cigate) |
| orch/nofightit | campaign battles resolved on the map EU4-style (battle window, siege window, markers); then remove "Fight it" with every leftover | steps 1–2 in, pictures good; step 3 (removal) + gate not finished; trigger trig_01QHh9bAJBEMd7bqqRikavyo |
| orch/finish-report | battle report card + front lines | grand + decisions red; needs a fix run (and must fit the EU4-style battles now) |
| orch/spylook | Infiltrator in plain clothes, outfits A/B/C (A default) | 170+ behind main, needs merge + gate; he has not picked A/B/C yet |

## Decisions he made Wed evening (all recorded in helper prompts; put into DECISIONS.md with the landing commits)
- 23:57 "Abandon battles in grand campaign. Turn it into eu 4 rules" + 23:58 "No and now" → no live battles in the campaign at all.
  navalmap job (trig_01XYWD6BzySp2yxEpR1DB9m5) is OBSOLETE — never fire it.
- 20:20 "Let's keep it not park" → the campaign stays in active work.
- 20:28 / 20:30 EU4 wiki (Mechanics page and the wiki front page) = implement those mechanics in the campaign. Overrides the PLAN-75
  feature freeze for the campaign. Ideas only, never EU4 text/art/icons/UI.
- 19:40 Battle gets its own small Generals-style maps (supply sources, oil derricks); 20:14 many more maps of all sizes and themes
  (naval-heavy, mountains, deserts, cities). Conquest and campaign maps unchanged.
- 19:41 Battle: no supply lines, no dotted roads. 20:12/20:13 Conquest road colors, "Green for your team".
- 19:02 fortification lines by Construction Vehicle only + drag to trace. 19:23 any faction in the Test range. 19:35 old supplies look.
- 19:28 "Go" to the top bar redesign (three zones) and the Nation window in six groups instead of 36 tabs.
- 17:37 "Shield" for army tokens.

## Next jobs, in order (start as slots free up)
1. battleclean fix run (Sonnet). 2. "camphud": campaign top bar in three zones + Nation window six groups, before/after at 1280/1600/1920
   wide (Fable). 3. "eu4audit": read-only comparison of the EU4 wiki (Mechanics + front page sections, one level of links, no
   country/patch pages) with what the campaign has → `orch/reports/eu4-gap.md` (have / partial / missing / does not fit 2026, 2026
   translation, owner system, size, build order) + a second table EU4 screens vs our windows; show him the top-10 missing list.
   Likely build order: war score/war goals/peace deals, casus belli, aggressive expansion + coalitions, war exhaustion, unrest/rebels/
   autonomy, manpower + attrition, trade routes. 4. "battlemaps": Battle MAP KIT (data format per map, fairness checker with AI-vs-AI win
   rates, map list in setup + lobby with previews) + first six original maps (three 2-player, two 4-player, one 6-player); then Sonnet
   batches of six toward 24 (naval+cities, mountains+deserts, large/huge + mixed); show him overview pictures per batch.
5. Finish nofightit step 3 if its helper stopped. 6. Restart finish-report and spylook (Sonnet, merge + gate). 7. Coast blocks in the
   Gulf if the token helper did not reach them. 8. Wave 2 leftovers from PLAN-75.

## Waiting on him
- Infiltrator outfit A, B or C (picture sent 23:10 Wed).
- After freezefix lands: fire one Kheibar strike as Iran; if it still freezes, Settings → Performance log → Copy → paste to ORCH.
- "Once I click this should disappear" was read as the rally flags; he did not object.

## Hard rules (unchanged)
No secrets/tokens/passwords ever; never force-push main, never delete others' branches; free art only (CC0/CC-BY), no AI or ripped
images; no real militant groups' names/flags/emblems/leaders, fictional leaders, neutral wording; keep "Radwan Training"; Zealous nations
never rout; smooth first (never raise a budget); American spelling; Cloudflare changes only with his consent; tests never hit production.
The old conversation's remaining reminders (camphud, battlemaps, eu4audit, morning state) are all folded into this note.
