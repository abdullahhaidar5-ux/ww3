# HANDOFF redfixB (2026-11-15)

Red gates on main 90ec5bf/e1b493e: mapsweep, cfclient, migrate-dual, migrate-down.

- **mapsweep**: the sweep started Battles on old Conquest maps that maptrim (2026-11-13 21:17) removed from the Battle list; the game correctly sends those to a listed map (battleMapFix). Sweep now plays Battles only on BM_KEYS at their listed player counts (old maps keep their static checks).
- **cfclient** (all 5 cf tests): tests looked for the old lobby (`#mpstatus .lob`, `.startbtn`, `.addai`, `.seat .stsel`); the lobby is `#mpl` now (`#mplPlay`, open-slot `<select>`, spot canvas). Tests updated; game: the lobby badge said "✔ HOST" (no hosting wording rule) → "★ LEADER". cfclient/cfbattle pick bm_sixroads before adding the computer player (default map seats 2).
- **migrate-down**: flaky — the host's standby pick (benchmark/ping) moved to client B on a busy runner; test pins B's benchmark far below A's.
- **migrate-dual**: real AI bug — an AI taking over a side starts its build list at 0 and saved up for a second Barracks it didn't need (reserve blocked all unit buys). aiThink (src/03-sim.js) now skips build steps it already owns. migrate.mjs prints the side's contents when the AI idles.

Local: cfclient, cfclient-password, cfclient-startpick, cfbattle, cfbattle-overrun, migrate --dual-claim, migrate --server-down all PASS.
