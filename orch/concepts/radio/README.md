# Commander's radio + edge alerts (ideas 10 and 15)

- `radio-1-feed-and-edge.jpg` (1600x900, from a real battle start): the radio feed is top left (3 short lines, each fades after ~6 s); two edge arrows point at reports that happened off screen (unit lost, enemy armor sighted).
- One source feeds both: every report goes sim `log(team,msg,kind,x,y)` -> `pushLog` -> `radFeed` (line) + `edgeAlert` (arrow, only if off screen, 3 at most, same place = one arrow).
- Click a line or an arrow (or press Space) and the camera goes there. Settings has one switch for each; both are hidden in menus.
- View only: nothing is added to the simulation, the sync hash or the saved game.
- Remake the picture and re-run the checks: `node orch/radioshots.mjs` (prints `EXTRAS PASS`).
