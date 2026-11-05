# Logistics — roads, supply network, cut-off towns (branch `orch/logistics`, 2026-11-05)

Stage 1 of Abdullah's 2026-11-04 20:05-20:13 "supply on roads" plan. PC-first (no phone work). Standing decision "supply lines are in"
is already in CLAUDE.md and BACKLOG (line 14).

## Shipped in stage 1 (items 1, 2, 4, part of 3/6/10)
- **Road graph** (`src/03c-logistics.js`, `G.lg`): nodes = bases + towns/hamlets, edges = the static town roads (`M.roadNet`) plus roads players
  build. Pure geometry, no random numbers, same on host and clients.
- **Supply network + CUT OFF:** per team, every node reachable from its base over uncratered roads without crossing an enemy-held town / enemy base.
  An owned town outside it is **CUT OFF**: its supply circle stops refilling ammo, tax -50%, unrest +0.35/s, red tag in the world, red ring on the
  minimap, "CUT OFF" log + ping. A town joined to the base **only through your own/allied towns** gets the **TRADE ROUTE** bonus: +25% tax, unrest -0.1/s.
- **Road building:** open a held town's panel -> "Build road here". Selected construction vehicles (else the nearest one) drive the route
  (A* over walkable ground from the nearest node of your own network) and build it at the frontier: cost $0.09 per world unit (a 3800-unit road ~ $340),
  progress runs at the dozer's speed (~3.5 min for a long road), several dozers share the job, no money = it waits, the dozer is exposed the whole
  time (rebels / raiders kill it). Finished road: stamped into the road mask (units +30% wheeled / +15% tracked on it, same as map roads), the
  ground shader's gravel layer updates live (`roadTexRefresh`), it joins the network.
- **Road warfare (cratering):** big blasts (shell / bomb / missile / boom, r>=22, dmg>=25 — hook in `explode`) within ~0.7r+14 of a road add damage
  to that road edge; 240 damage cuts it for 150 s ("ROAD CUT 1:30" marker, supply link severed); a construction vehicle within 170 units repairs 6x faster.
- **Overlay:** key **L** or the "Supply lines (L)" button above the minimap: solid green = connected to your base, red dashed = cut/cratered, yellow
  dashed = road under construction with % marker. Shown automatically while a construction vehicle is selected or a town panel is open. The
  minimap always draws the network (green solid / red dashed + cut towns ringed).
- **AI (Normal and up):** every 7th think, if it holds a town not on its trade network, has >$900 and nothing is being built, it orders a road
  (nearest town first, only when no enemies are near it).
- **Net:** command `road` appended to `CMD_T`; dynamic state `G.lgd` (built roads, craters, jobs) + town flags ride in `teamGlobals` as `lg`
  (only resent when changed); `lgd` is in the host-migration checkpoint (`CK_G`), the graph is rebuilt from the map. Server bundle list
  (`SIM_FILES` in `orch/headless.mjs`) now includes `03c-logistics.js`.

## Stage 3 shipped: CONVOYS (2026-11-05, orch/logistics2)
- Every 20 s each team's HQ sends an automatic **convoy** (an ordinary Supply Truck unit with `u.cv`, $60 per trip, max 3 alive per team) along the
  roads (`lgRoute`: Dijkstra over uncratered edges, never through enemy-held nodes) to the held, connected town that has gone longest without one.
- Delivery **stocks** the town for 4 min (`t.dl`): a stocked town's supply circle keeps its full 230 range for ammo; an unstocked one only reaches 115.
  A newly held town starts stocked for 2 min. Arrival also tops up ammo of units in the circle. Then the truck drives home and vanishes.
- **Ambush:** it is a normal truck - shoot it ("Our supply convoy to X was destroyed!" + ping). **Escorts:** armed friendly units within 200 units cut its damage 45%.
  A cratered road ahead halts it (20 s) then it turns back. A convoy also resupplies units it passes (normal truck circle).
- Icons: SUP (green) / CVY (red) badge over each convoy, yellow/red squares on the minimap, "STOCKED" tag on towns (overlay L). Net: `cv` ids + `sk` towns ride in `lg`.
- AI: gets convoys automatically (same rule for every nation); its truck count ignores convoys. `node orch/convoyprobe.mjs` checks it end to end.
- Smooth gate on this 2-core box fails the same way on plain origin/main (p95 frame ms, draw calls): not from this change; CI decides.

## Stage 5 shipped (part): TERRITORY + FRONT LINE (orch/logistics2)
- `terrUpdate()` (03c): influence field on an 80-unit grid from HQs (r1000), held towns (r520, hamlets 340, weaker if CUT OFF) and finished Supply Depots
  (r560). Cell owner = strongest influence (neutral below 0.08). Recomputed only when the source signature changes (checked at the 0.5 s town tick).
- **Front line** = border between non-allied owners: red/white dashed line on the ground (always on in Conquest) and on the minimap, which also gets a
  faint team-coloured territory tint.
- **Building only in territory:** `validSpot` refuses everything except Supply Depots in a cell an enemy dominates ("Enemy territory - push the front
  line first"). A forward depot extends your territory, which is how you push the front. Same rule for every nation, AI included.
- NOT done of stage 5: depots as real graph nodes joined by roads (convoys do not visit depots yet), rally/production point at a depot.
- `node orch/terrprobe.mjs` checks it.

## NOT done (next stages, in this order)
5b depots as graph nodes, 6 mined roads / checkpoints / tolls,
7 bridge demolish / rebuild / pontoon, 8 ports + blockade, 9 airlift, AI blowing bridges / convoy escorts / airlift / blockade, tutorial Logistics
step, road art per theme (road is drawn by the ground shader as gravel on every theme today). The AI tourney (18 nations, ~equal) and the Cloudflare
free-plan CPU numbers (/battle-bench) were not run on this slow 2-core box.

## Checks run
- `node orch/logiprobe.mjs [map]`: fulda 2p — graph 18 nodes / 25 edges; owned towns trade=1; 4 shells on the 3 roads at a town -> it flips to
  CUT (tax 7.3 vs 17.9) and heals after 150 s; road to a far town built end to end (3812 units, ~210 s), town becomes trade route, mask stamped.
- Cost of the network update: BFS over ~20-30 nodes, run only when town owners / craters / roads change (signature string), plus a loop over the
  ~25 edges per big explosion. Negligible next to the sim tick; not measured on the server (see above).
- Smoke PASS (346 s). Smooth and cigate: see HISTORY line.

## Try it (PC, 2 min)
Start a Conquest skirmish, capture a village, click it -> "Build road here" with a construction vehicle selected, press **L** to see the network,
then shell the road (artillery / a missile strike) and watch the far town turn CUT OFF.
