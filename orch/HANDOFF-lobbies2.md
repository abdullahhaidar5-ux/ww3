# HANDOFF lobbies2
Shipped: src/08d-lobkit.js (LK: fac/flag/nat/ping/invite/mapCard/empty/toast/watch/cdLine), used by 07-net renderLobby (host) and 08d-lobby (guest). Test: node orch/lobbykit.mjs (offline).
Open: (1) restyle campaign lobby src/13zn-gnet.js with LK once camplobby is on main; (2) lobby chat needs a new net message (protocol change, not allowed without Abdullah); (3) smoke fails on main already (THREE computeBoundingSphere NaN, not lobby); wrangler local-server tests (lobbytest/qa-mplobby) don't connect in this sandbox; (4) full cigate not run.
