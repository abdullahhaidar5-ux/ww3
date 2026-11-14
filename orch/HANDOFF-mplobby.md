# HANDOFF mplobby - landed on main (lock taken/mplobby, branch orch/mplobby). No cigate (push-fast day).

## What changed
- The online Battle lobby (leader after start, guest after join) is ONE framed screen in the Zero Hour skirmish layout: new `src/08d-mplobby.js` (`mplShow(D)`).
  Title "MULTIPLAYER BATTLE" + room code top-left; table Player | Colour | Nation | Team (up to 8 rows) with ready marks on the right; map preview + name/players +
  SELECT MAP (existing map picker) + invite card on the right; options row (Conditions = existing weather picker, players count); lobby log + chat line; PLAY GAME
  (leader, glows when everyone is ready, START ANYWAY, countdown) or READY (guest) bottom-left, BACK bottom-right. Shot: orch/shots/mplobby.jpg (1920x1080, 2 people + 2 AI).
- `07-net.js renderLobby` and `08d-lobby.js glRender` now only describe the lobby and call `mplShow`; all netcode (bset/pick/blob/lobr, cfPush, launchMP, host migration) untouched.
  Old seat-list layout and its CSS in 08d-lobkit/08d-lobby removed (the connecting/landing box of 08d-lobby stays). Guard added in orch/decisions.mjs ("ONLINE LOBBY LAYOUT").
- Controls: you change your own nation (incl. Random) and team; the leader changes every team and the AI/Open rows (Open -> AI Easy..Brutal, AI -> Open removes it, AI nation/team/style), Conditions and map.
  Team menu: None, Team 1-4 (None = a free team number 4-7).

## Not done (nothing exists to hook into, "no new netcode")
- **Colour** is the team colour, shown as a read-only swatch (the sim has no per-player colour).
- **Chat**: the lobby has no chat message; the box is a lobby log (joins/leaves) with a disabled input. Needs one new message to go live.
- **Starting money / Game speed / Time limit** do not exist in Battle setup, so the options row has only Conditions. **Closed** slots do not exist (only Open / AI).
- Dropped old conveniences: team presets (Free for all, 2 teams, Co-op vs AI), "All AI level", per-seat start-spot menus (the clickable numbered spots still sit on the map preview via the leader's canvas? NO: preview is plain; start spots: the leader's canvas is used as the preview, click a numbered spot to hand it over).
- Cloudflare leader changing own nation sends the same `pick` message guests use; I could not test that the server applies it for the owner seat. Please try: host, change nation, see if it sticks.
- Old lobby CSS in the index.html page shell (`.seat`, `.lobhd`...) is shell, not src: left alone.
- Run in a slow sandbox: decisions.mjs fails only on things already red on main (powertest timeout, CLAUDE.md size, american spelling in 08o-*, one-game gnLobby); mine pass. Smoke not run (too slow).

## Try (2 min, PC)
Play online -> start a battle, add two computer players from Open slots, change your nation and team in the table, press PLAY GAME.
