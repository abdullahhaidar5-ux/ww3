# Handoff: polishP2 — Campaign panels + Readability are FINISHED, waiting to land (2026-11-10 21:30Z)

Shipped to main (c286035): **Never lose progress** and **Settings** (queue items ticked).

Waiting on branch `orch/polishP2` (commit 1e53c43, one commit on top of main 00d2a09): **Campaign panels** and **Readability**.
Both are look changes, so by the RIGHT NOW rule in CLAUDE.md they must not go to main until `gate/smooth-mp` is green.
I checked every 20 minutes for 3 hours (18:40–21:30Z); the bullet was still there.

CI gate on 1e53c43 (run on GitHub runners): everything green except `cfclient`, `smooth-mp`, `tutorial` — all three are on the known-red list.
(`gate/save` now also runs `orch/polishtest.mjs`: panels + text size at 1366×768 and 1920×1080.)

## To land (when the RIGHT NOW bullet is gone)
1. `git fetch origin && git checkout -B land origin/main && git merge --squash origin/orch/polishP2`
2. Conflicts in `index.html`, `sw.js`, `grand.*.js` → delete the old `grand.*.js`, `git checkout origin/main -- index.html sw.js`, then `python3 orch/build.py` (and `--check`, `node orch/lint.mjs`).
3. `orch/cigate.sh` on that commit; `mpsync`, `audio`, `ew`, `migrate-down`, `smooth-pc` were flaky on the runners today — re-run failed jobs once before believing them.
4. Push to main, tick the two queue lines (move under Done), append these two HISTORY lines:

- 2026-11-10 polishP2 #3 (Campaign panels): every grand-map window now has the same frame (font, border, gold title) and the close ✕ in the same top-right corner; Esc closes the top-most window, one per press; a question that needs an answer (battle prompt, event choice) is never skipped; Esc on the Grand campaign menu goes one step back. One owner: new src/13zzz-gpanels.js (GPAN); old per-panel close buttons / Esc handlers removed; list with ticks in orch/reports/panels.md. Not done: buttons inside panels keep their topic colours.
- 2026-11-10 polishP2 #4 (Readability): Settings → Text size 100 / 115 / 130 % enlarges every menu, overlay, the command bar and all grand-map panels and keeps them inside the window (checked at 1366×768 and 1920×1080); colour-blind mode now also puts each team's shape on town name plates and the allies list (new src/08n-readable.js). Not done: labels painted over the battlefield (unit/town names in the 3D view) and tooltips keep their size; the build grid scrolls sideways at 130 % on small screens.

## What is in it
- `src/13zzz-gpanels.js` — `GPAN` = every grand-map panel; `gpxDress` = shared frame + close ✕ top-right; `gpxEsc` = the one Esc handler (top-most first, a dialog that needs an answer is not skipped). Old per-panel close buttons / Esc handlers removed from 13j-grandmilui, 13j-nationpanel, 13r-gweb, 13z-gpeace. List: `orch/reports/panels.md`.
- `src/08n-readable.js` — `SET.ts` text size (CSS zoom on the roots in `TS_ROOTS`, `tsFit` keeps panels inside the window); colour-blind shapes on town name plates (08c-towns.js) and the allies list (08-ui.js).
- Guards: `orch/polishtest.mjs` sections 3–4, static checks in `orch/decisions.mjs`.
- Screenshots on the branch: `orch/shots/polish/panel-nation.jpg`, `panel-military.jpg`, `textsize-nation.jpg`, `textsize-settings.jpg`.

## Known gaps (honest list)
- Text size: labels painted over the battlefield (3D view) and hover tooltips keep their size; the build grid scrolls sideways at 130 % on 1366-wide screens (it already scrolls a little at 100 %).
- Panels: buttons inside panels keep their own topic colours; only font and corner radius are unified.
- Settings (already live): after a rebind, buttons and tooltips still print the standard letter.
