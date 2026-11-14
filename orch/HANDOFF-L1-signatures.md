# L1 Signature units — parked until after Monday; NOT ready
Stopped on ORCH's order (orch/L1-SIGNATURES-STOP.md). Nothing here is on main; no gates have been run (local smoke is too slow in the sandbox; `orch/cigate.sh` not run).

Done (commit 45a470a, `python3 orch/build.py` OK, not play-tested):
- `src/01d-signatures.js` (data rows, `SIG` constants) + hooks at the end of `src/03g-modern.js` (wrapper on `specialMult`).
- RS Kornet Ambush Team (`tunAmb`): first shots out of a tunnel hit double for 5 s (`unloadTunnel` in 03-sim sets `ambT`).
- IL Merkava Mk4M / DE Leopard 2A8 APS (`aps`): soaks one anti-tank hit per 8 s, cost +8%; `apsT` added to `U_LATE` (checkpoint).
- RU/CN mass armour (`mass`): -10% damage taken with 2+ friendly tanks within 120 m.
- KP KN-25 240 mm Rocket Battery (`krb`, War Factory extra, 12-rocket ripple, max 3, General rank): alias in GEO_ALIAS/VO_ROLE/WHEELED, rank gate + tip in 08-ui.

Left: UA FPV team, TR Bayraktar, IR Shahed rack truck; guards in `orch/decisions.mjs` (RS tunAmb, IL/DE aps, RU/CN mass, KP krb in roster); encyclopedia/what's-new text; AI build lists for krb; `orch/tourney.mjs` balance run; `orch/cigate.sh`; screenshots `orch/shots/L1-*.jpg`; playtest that krb renders (arty model alias) and rocket ripple of 12 stays smooth.
