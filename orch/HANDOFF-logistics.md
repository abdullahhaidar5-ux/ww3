# Logistics handoff (orch/logistics2, 2026-11-05)
Done on main: stage 1 (roads, supply network, CUT OFF), stage 3 convoys (`lgConvoys/updConvoy/lgRoute` in src/03c-logistics.js, `node orch/convoyprobe.mjs`),
stage 5 part: territory + front line (`terrUpdate/terrAt/terrEnemy`, drawn in src/08c-logi.js, `node orch/terrprobe.mjs`, build blocked in enemy territory in validSpot except depots).
NOT done, in order: 5b depots as graph nodes joined by roads + convoys visiting them + rally/production point; 6 road mining / checkpoints / tolls (dozer);
7 bridges (demolish with timer, rebuild, pontoon; pathfinding must update deterministically); 8 ports + blockade; 9 airlift (real transport unit);
10 AI uses all of it (AI already gets convoys and builds roads), tutorial Logistics step, road art per theme (dirt/gravel/asphalt).
No screenshots yet (convoy ambush, front line minimap...): take them with orch/*shots.mjs patterns into orch/shots/logistics/.
Notes: orch/smooth.mjs fails on this 2-core box identically on plain main (noise) - rely on CI gate/smooth-pc. cigate waits for 20 statuses but only ~17 exist: read them via gh api, don't wait for the script to end.
