# Conductor state — 2026-11-15 08:55 UTC
main head 841cfdc02 (07:32 UTC). Pages build for it: success (site up to date). No orch/* or train/* push since 07:00 — helpers land straight on main. Last train: train/20261115-0300. No train this run.
**Main head gate is RED** (run 43690396086): decisions, smooth-pc (1 problem), save, controls/controlscheck, superfreeze, migrate-dual ("AI took over old host's side but did nothing in 45 game-s"), cfclient (timeout; known flaky). Smooth-pc red on main = look work stops until the lane that broke it fixes it. Suspects: 06:30-07:32 landings (haze culling 505ead381, signature units 9c024bea3, general powers 54b1976e3, Zolfaghar e022212a6, mirror maps 156ae1fd, balance 841cfdc0).
Already inside main (0 ahead): freezefix sweepfixA/B orderfeel battleclean2 pileflag unstuck dugout battlepower bldqueue groundreal leaderlook usvoice looktest onegame nations20.
Stale and ahead: ammozone (7 commits, HANDOFF present; redo on current main); ghostslot/testrange/techbldgs 1 commit each, likely integrated.
Parked (removed from the game): camphud nofightit warpeace mapshapes eu4audit civhumans.
Locks with no orch/* branch: army-standards c-real-supply finish-tokens freezefix2 realwar seamless-hud spylook2.
Note: local git fetch of this 5 GB repo times out; state gathered via API/ls-remote.
