# HANDOFF — mapshapes (branch `orch/mapshapes`, 2026-11-13)

Not landed (the conductor lands gated branches). Based on main 77b4ee8. View only: no simulation, sync hash or checkpoint change.
Lock branch `taken/mapshapes` can be removed by ORCH.

## Done (one commit each)

1. **Token shapes** (74aec51; Abdullah 2026-11-11 17:37 "Shield"). Land army = heraldic shield standing on its point (the point is the exact spot), flag on it, unit count in a dark band on top; fleet = ship hull with a small bridge; air group = swept wing; far zoom = tiny shields / hulls / wings in the same single Points draw; capital plates stay round. Selected, at war, in battle, dug-in, stack count and odds pill work as before; click targets follow the new outlines. Still the one token system (`src/13e3-gtokens.js`, new `gtkKind`). Map key and first hint reworded.
2. **Political button** (ee48426). It now sits in the bottom-right corner just above the round map buttons. The unit cards keep to the strip between the minimap and those buttons (cards 6 px narrower so seven fit at 1600x900 with the side panel open; more wrap onto a second row). Top bar untouched — `orch/camphud` was not on main.
3. **One route style** (8d0cc63). `g3BuildArrows` and the yellow dotted hover line are gone. `g3Routes` / `g3RoutePreview` (one builder `g3RouteMesh`, `src/13e2-groads.js`) draw one thin cream line (muted red for a visible enemy) with a small arrow head, same width on screen at every zoom. The hover preview is drawn on the map itself, so it no longer lies over the unit cards. Map key has a "Route line" row.
4. **Cargo ships and roads** (8a8a20b). Cargo ships half size; road web thinner, paler, more see-through.
5. **Gulf coast** (574032b). Cause: real elevation was not tapered to the coast, so the ground stood several units high right at the shoreline; seen at an angle the land's edge sat away from the true coast and the sea plane painted the strip between as pale foam-coloured squares. Fix: `g3CoastRamp` (`src/13e-grand3d.js`) caps ground height by distance to the coast, one pass at load, whole map. Coast is one clean line.

Guards: `orch/decisions.mjs` (block "mapshapes" + items 2–5), `orch/grandtest.mjs` (shields on screen and none round at middle zoom, Political button overlaps no card / minimap / button, a marching army has a route and no old arrows, coast ramp ran).
Logs: quote + date in `orch/DECISIONS.md` (shapes, route style), one line per item in `orch/HISTORY.md`.

## Not done / open ends

- **"Air group" is a reading of the army, not a new piece:** the campaign has no separate air pieces, so an army made only of helicopters / drones / jets is drawn as a wing. A mixed army stays a shield. For the proof picture one such group was placed by hand. If Abdullah wants real air groups as their own pieces, that is a simulation job (not view only).
- The yellow dashed **sea lanes** between sea zones (white dashed lines) were not changed — not in this job.
- At the destination the small arrow head can be hidden under an army token standing there.
- The coast ramp lowers coastal cliffs everywhere (max rise .55 per map pixel from the waterline); mountains further inland are unchanged. Worth one look at Norway / Chile / Lebanon in the next picture round.
- `node orch/decisions.mjs` could not finish in this sandbox (over 25 minutes, like the smooth runs); it passed on GitHub.
- `after-far.jpg` was taken before the coast fix (tokens are the same).

## Gate (one `orch/cigate.sh`-style run on GitHub, commit 574032b, branch `gate/574032b006`, run 43355794130)

First pass 26 of 28 green, including `decisions`, `grand`, `grandsmooth`, `smooth-pc`, `smooth-mp`, `smoke4`, `check`. Red: `audio` ("second battle: battle music again") and `cfclient` ("the creator gets no fresh battle state from the server") — both on the known-flaky list and untouched by this branch. Failed jobs re-run once: `audio` PASS; `cfclient` see the last line of this file. Local: `build.py --check` OK, `SMOKE PASS`.

## Pictures (`orch/concepts/mapshapes/`, 1600x900, README there)

`before-` / `after-middle-east.jpg` · `before-` / `after-gulf-fleet-air.jpg` · `before-` / `after-selected-route.jpg` · `before-` / `after-gulf-coast.jpg` · `after-gulf-coast-near.jpg` · `after-far.jpg`. Script: `node orch/mapshapesshots.mjs`.

## One thing for Abdullah to try (2 minutes, PC, after it lands)

Open the Grand campaign as Iran, zoom to the Gulf at middle zoom: are the armies clearly shields and the fleets clearly ships? Then select the 1st Army and right-click a province three or four steps away — is the thin route line easy to follow, and is the Political button out of the way of the unit cards?
https://abdullahhaidar5-ux.github.io/ww3/

cfclient re-run: still running 24 minutes after the re-run started (04:06 UTC) when this helper stopped — not chased, as instructed. Final count at stop: 27 of 28 green, `cfclient` open. Check `gate/cfclient` on commit 574032b before landing.
