# HANDOFF — Stockpiles that run out (campaign runner B, 2026-11-11)
Branch `orch/c-stockpiles`. Not on main: CLAUDE.md RIGHT NOW bullet still lists gate/grand + gate/grandlive red on main.
Owner: grand military (`src/13i-grandmil.js`, UI `13j-grandmilui.js` tab Stockpiles, net table `13zn-gnet.js`). Data + sources: REAL-2026.md "Munition stockpiles".
Done (slice 1, end to end): missile salvos + interceptor loads per nation (`GMIL_STK`: now / depot / per year), defence spends interceptors
(2 per missile salvo, 1 per raid sortie, 1 per 4 drones), empty = no interception + world news + war-support hit on the one meter (`wsE` −4, Zealous −1);
slow factory refill; `gmilOrder` (paid now, 4/6 months, +2 for importers, none for sanctioned importers, 3 running);
`gmilSend` to allies/close friends (1 a month, arrives next month, receiver's enemies −6/−12 opinion of the sender);
AI: `gmilAIStock` (orders when low, ships to an ally that ran dry, 20%/month), keeps the last salvo, prefers targets with no interceptors.
Old instant "Buy missile" and the free +1 every 3 months are removed (guards in grandtest: stockpile block + military ui).
Next slices: (1) artillery shells + precision bombs as counters (air raid spends bombs; army ammo% refills from the national shell stock);
(2) Fight-it battles draw missiles/interceptors from the same stock (drones already do); (3) "Ask an ally" request + AI refusals by interest;
(4) fleets' own magazines; (5) per-nation rows for the remaining full nations (now tier default) ; (6) show enemy stock only as an estimate (Uncertain intelligence item).
To land: rebase on origin/main, `python3 orch/build.py`, grandtest/decisions/smoke, `orch/cigate.sh`; ship when the RIGHT NOW bullet allows.

## Slice 2 (campaign runner, 2026-11-11 14:00Z) — branch `orch/c-stockpiles2` (on top of main ac59908), NOT on main (RIGHT NOW bullet)
Done end to end: `GMIL_STK2` (shells `sh`, precision bombs `pb`; same `GC.mil.n[c]` counters, `pa[2..3]`, `sa` = shell burn accumulator; older saves filled in `gmilN`).
Shells: `gmilShell(a,da)` called from `geSupplyStep` (13g) — an army that fought this month (`a.fo`) burns 25/1000 load per unit; stock 0 → every positive ammo refill ×0.25,
world news + `wsE` −2 (not Zealous). Bombs: `gmilStrike(..'a'..)` spends 1 `pb` (order carries `pb:1/0`), `pb:0` raid = half damage, ×1.3 interception; Cancel refunds.
Orders `sh` (4 for $400, 3 months), `pb` (2 for $300, 4 months); `gmilSend` ships 2 shell loads / 1 bomb load. AI: orders shells below 50% in war / 30% in peace, bombs when out in war,
ships shells to an ally or close friend at war with none, holds 60% of raids back without bombs. UI: Stockpiles tab lines + one kind picker for "Ship to an ally"; Strike tab shows bombs; alert "Shells running low".
Sources: REAL-2026.md "Shells and guided bombs". Guards: grandtest "military features" block (shell burn, hunger, order, unguided vs guided, save) + military ui (gSk_sh, gSkK_sh).
Local: build --check OK; grandtest military blocks clean (run cut off by the slow sandbox after the mirror battles); decisions/smoke timed out locally without a failure line → CI gate is the judge.
To land: rebase on origin/main, `python3 orch/build.py`, `orch/cigate.sh`, push when the RIGHT NOW bullet allows; then delete branch `taken/c-stockpiles`.
Next slices unchanged: Fight-it draw-down of missiles/interceptors, "Ask an ally", fleets' magazines, per-nation rows for the estimated nations, enemy stock as an estimate.

Gate (2026-11-11 14:45Z): the GitHub run for this branch failed in ALL 28 jobs before any test started — the runner could not reach the Ubuntu package servers
("Temporary failure resolving security.ubuntu.com" during `npx playwright install --with-deps`, step Tools). The two gate runs before it (13:14Z, 13:44Z) ended the same way.
So there is NO gate verdict for this slice yet: re-run `orch/cigate.sh` when the runners can install again, before landing.
