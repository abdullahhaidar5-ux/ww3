# Reconnect bug + phone portrait bar — report (2026-10-27)

Branch `orch/open-reconnect-phonebar`, gated head 27625fe (origin/main and `orch/migrate-ci` merged in).

## What changed (for players)
- **Rejoining mid-battle:** a player only counts as "back in" once the host is sending to *them* again. Before, a rejoining player could pick up updates the host sends to everyone and think they were back, while the host still treated them as gone. They then saw their own army missing, the enemy base still showing, and their starting money.
- **Short freezes don't drop players any more:** when the host's or a player's page freezes for a few seconds (loading, a slow phone or PC), that time no longer counts as a lost connection. Before the first update arrives, a player now waits 45 s, because the host may still be loading.
- **Host takeover:** the backup player now takes over only when the old host is really gone. While the old host is still in its room and just slow, the backup waits up to 15 s.
- **Phone held upright:** the build grid now shows exactly 4 whole columns, so no button is cut off at the edge, and swiping snaps to whole columns. Screenshots: `orch/shots/phonebar/` (before/after at 390×844, landscape after).
- **Test:** the reconnect check (12 s outage, then own units, enemy view and money must match the host exactly) now runs in every plain `mpsync` run, so the ship gate always covers it.

## CIGATE (27625fe): PASS, 16/16
check, servertest, headless, smoke4, mpsync (with reconnect), mpsync-server, migrate, migrate-abrupt, migrate-down, art-smoke, art-mpsync, mapsweep: PASS. controls, touch, audio, cfclient: no test on this branch (SKIP = pass).

## Left / risky
- Long building names still end in "…" on phones.
- Locally, `mpsync --server --reconnect` passes, but it is not in the gate.
