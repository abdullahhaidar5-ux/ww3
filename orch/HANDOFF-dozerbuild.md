# HANDOFF dozerbuild (2026-11-14) — branch `orch/dozerbuild`, lock `taken/dozerbuild`

Abdullah 04:00: "You can only build a building using the construction vehicle" (C&C Generals).

## What changed (plain words)
- The BUILD tab shows only while a Construction Vehicle (Dozer) is selected; select one and it opens, deselect and it goes away (and any ghost is dropped). Same in Battle, Conquest, Missions, Tutorial, Test range (the Test range no longer builds instantly without a dozer; it keeps its fast build speed).
- Pick a building, click a spot: the selected dozer drives there and builds. Progress only moves while a dozer with a build order on it stands at it. If it leaves or dies the building stays half-built and pauses; any dozer can be right-clicked onto it to finish.
- Shift+click places several buildings in a line-up for one dozer (queue of ids `u.bq`, saved with the unit); Shift+right-click an unfinished building adds it to the queue.
- Extra dozers on one building speed it up a bit (+35% each, max 4 workers).
- AI: each AI foundation already got a dozer; now up to 3 idle fighters stand guard at a building site, and a dozer under fire (enemy within 260) backs off to the HQ and is not re-sent for 8 s.
- Tutorial steps and first-hint text now say "click your Dozer, open Build..." and the highlight points at the Dozer first.
- Kept: STRUCT/placement checks, repair, cancel/refund.
- Guard: `orch/decisions.mjs` ("dozerbuild" block after the Battle shot): tab hidden/shown, a placed building has `nd` and zero progress with no dozer at it, builds once a dozer is on site.
- Screenshot: `orch/shots/dozerbuild.jpg` (dozer selected, BUILD tab open, War Factory ghost; a progress-bar close-up was not captured).

## Files
`src/03-sim.js` (placeBld queue, dzNext, bldWorkers, updBld rate, bldGo queue, AI protect), `src/08-ui.js` (dozerTab, shift flag, no-dozer message), `src/08b-social.js`, `src/08l-firsthint.js`, `orch/decisions.mjs`.
UI change is small (`dozerTab()` in updateUI) so it merges with orch/presentation and orch/bldqueue.

## Gate
- build.py + --check OK; smoke PASS (561 s here); decisions PASS here (incl. new guard).
- `orch/cigate.sh` run once on `gate/0cea660215`: still QUEUED on GitHub after ~1 h (run 43584113149, runners busy) - no result yet
- Not run here: smooth/grandtest (too slow; per CLAUDE.md the CI gate decides).

## Status
NOT yet ready to land: code is done and passes local smoke + decisions; waiting only for the gate/* statuses on gate/0cea660215. If all green, ORCH can land orch/dozerbuild (rebase on origin/main; rebuild index.html/grand.*.js on conflict). Not done: progress-bar close-up screenshot.
