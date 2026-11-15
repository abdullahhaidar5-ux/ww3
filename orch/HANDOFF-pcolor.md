# HANDOFF pcolor (player colours) — 2026-11-15

Abdullah 2026-11-14 18:57: "Make it so players can choose their color".

What shipped: a colour picker (Nation colour + 12: Red, Blue, Green, Yellow, Orange, Purple, Cyan, Pink, White, Black/Grey, Brown, Lime) per row in the online lobby (`pcPicker` in `src/08d-mplobby.js`; you edit your own row, the leader edits computer rows, other friends read-only) and in the single-player Players step (`renderTeams`/`skPc` in `src/08-ui.js`). Taken colours are greyed out; computer players take the first free colour; your last pick is saved (`localStorage ww3_pcol`).

How it flows: `PCOLS`/`pcClean` (01-data) -> `newGame({pc})` -> `pcApply` (03-sim, G.pcP; the old colour de-clash and the profile-colour repaint in 08b-identity never move a picked colour). Seat field `c` (PCOLS index, -1 = nation) in `server/src/battle.js` seats()/pick()/bset (`pc0` = leader, `ais[].c`), `start.pc`; browser host: `pick.c`, `lobr.r[].c`, `start.pc`. Old clients/servers without it fall back to nation colour (visual only, no sync impact, no protocol bump). Checkpoint skips T.color on purpose (rebuilt by newGame from start info, which carries pc).

Server changes (server/src/battle.js, battle-driver.js) reach the live Cloudflare servers only through autodeploy, after ALL gate/* are green. Until then an online game picks colours in the lobby but the server ignores them -> nation colours.

Guard: `orch/pcolor.mjs` (run from `orch/decisions.mjs`). Stand-in `orch/cfhost-standin.mjs` mirrors the server. Screenshot `orch/shots/pcolor.jpg`.
Not done: colour-blind mode (SET.cb) still overrides every colour on purpose.
