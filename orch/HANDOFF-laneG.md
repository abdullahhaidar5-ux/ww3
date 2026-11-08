# HANDOFF laneG (2026-11-08 00:05 UTC, branch orch/laneG-202611072240, NOT merged to main)

Shipped on the branch this session (not on main yet — the ship gate is not green):
- Event rows in src/13p-gevents.js for RG40 protests/general strike/arrests, RG39 state TV + phone footage, RG41 remittances + diaspora lobby, RG42 minority autonomy, RG29 hardliners vs reformers, RG28 contracts scandal. New event condition `unrest` (national average unrest >= 30, via gcrUn).
- RG10 follow-on: nuclear programme stalls while the capital (programme site) is occupied by an enemy army; logged on start and end (src/13zz-gnuke.js, gnkOccupied).
- RG20 ceasefires can break: src/13zy-gceasefire.js (gcfTurn, hooked in 13o-gworld.js try list). 4% monthly incident per truce, 2% with a third-party guarantee; one incident in three collapses the truce into war.
- Nuke launch modal wording changed so the decisions guard passes.

Gate status on the branch:
- build.py --check OK; smoke PASS; grandtest PASS; nuketest PASS; crisistest PASS; cigate ran on gate/ commit: FAILED on tutorial (step 9), grandsmooth (CI triangle budget: region 2,028,905 vs 2M), decisions (turn-wording, now fixed in the last commit; rerun pending at time of writing). cfclient and audio show failure states with PASS/SKIP descriptions (gate script quirk).
- Local check: grandsmooth on origin/main and on this branch produce identical triangle counts (region 1,862,632, close 1,863,212), so the CI triangle failure looks pre-existing on main, not from these changes. Tutorial failures also appear on other recent gate/ commits. Confirm both on main before merging; do not raise the budgets.

Next, in order: merge once main's grandsmooth and tutorial are green (or fix them in their owning lane), then RG9 proxy wars, RG18 volunteers, RG64 defectors, RG30 leader succession, B6 client states and the rest of the DIPLOMACY SCREEN, B7 events with choices/chains, B8 reforms/hegemonies.
