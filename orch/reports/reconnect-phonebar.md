# Reconnect + phone bar report (2026-10-27)

Branch `orch/open-reconnect-phonebar`, gated head 27625fe (with main and `orch/migrate-ci` merged in).

## What changed
- **Rejoining mid-battle:** a player counts as back in only once the host is sending to them again. Before, they could think they were back while the host still treated them as gone, and they saw a missing army, the enemy base and starting money.
- **Short freezes no longer drop anyone:** a few seconds' freeze on the host's or a player's page (loading, slow device) doesn't count as a lost connection. A player waits 45 s for the first update, in case the host is still loading.
- **Host takeover:** the backup player takes over only when the old host is really gone. If the old host is just slow, the backup waits up to 15 s.
- **Phone held upright:** the build grid shows exactly 4 whole columns, so nothing is cut off at the edge. Swiping snaps to whole columns. Before/after shots: `orch/shots/phonebar/`.
- **Test:** every plain `mpsync` run now includes the reconnect check: a 12 s outage, then own units, the enemy view and money must match the host. The gate always runs it.

## CIGATE on 27625fe: PASS, 16/16
check, servertest, headless, smoke4, mpsync, mpsync-server, migrate, migrate-abrupt, migrate-down, art-smoke, art-mpsync and mapsweep pass. controls, touch, audio and cfclient have no test on this branch, so they report SKIP, which counts as a pass.

## Left / risky
- Long building names still end in "…" on phones.
- `mpsync --server --reconnect` passes locally but isn't in the gate.
