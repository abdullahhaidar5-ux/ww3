# HANDOFF — Stockpiles that run out (campaign runner B, 2026-11-11)
Branch `orch/c-stockpiles`. Not on main: CLAUDE.md RIGHT NOW bullet still lists gate/grand + gate/grandlive red on main.
Owner: grand military (`src/13i-grandmil.js`, UI `13j-grandmilui.js` tab Stockpiles, net table `13zn-gnet.js`). Data + sources: REAL-2026.md "Munition stockpiles".
Done (slice 1, end to end): missile salvos + interceptor loads per nation (`GMIL_STK`: now / depot / per year), defence spends interceptors
(2 per missile salvo, 1 per raid sortie, 1 per 4 drones), empty = no interception + world news + war-support GMOD row for 3 months;
slow factory refill; `gmilOrder` (paid now, 4/6 months, +2 for importers, none for sanctioned importers, 3 running);
`gmilSend` to allies/close friends (1 a month, arrives next month, receiver's enemies −6/−12 opinion of the sender);
AI: `gmilAIStock` (orders when low, ships to an ally that ran dry, 20%/month), keeps the last salvo, prefers targets with no interceptors.
Old instant "Buy missile" and the free +1 every 3 months are removed (guards in grandtest: stockpile block + military ui).
Next slices: (1) artillery shells + precision bombs as counters (air raid spends bombs; army ammo% refills from the national shell stock);
(2) Fight-it battles draw missiles/interceptors from the same stock (drones already do); (3) "Ask an ally" request + AI refusals by interest;
(4) fleets' own magazines; (5) per-nation rows for the remaining full nations (now tier default) ; (6) show enemy stock only as an estimate (Uncertain intelligence item).
To land: rebase on origin/main, `python3 orch/build.py`, grandtest/decisions/smoke, `orch/cigate.sh`; ship when the RIGHT NOW bullet allows.
