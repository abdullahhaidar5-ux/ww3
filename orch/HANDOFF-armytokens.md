# HANDOFF armytokens (2026-11-11) — Army Standards, grand-map army tokens

Spec `orch/concepts/ARMY-STANDARDS.md`, sheet `orch/concepts/army-standards.jpg`. Branch `orch/armytokens` (= origin/orch/calmmap + origin/main
merged in, page rebuilt). Lock branch `taken/army-standards`. Pictures `orch/shots/armytokens/` (before-* / after-*; `node orch/armyshots.mjs <prefix> [view]`).

## Done on the branch (all six slices, one owner file `src/13e3-gtokens.js`)
1. Token (flag disc, green strength ring, gold supply ring, pin, number plate, general stars), rim white / red / blue, others small and faint.
   Old figure blobs, shield badges, per-army waving flags, wakes, plinths and their code are deleted (13e-grand3d.js, 13g-grandlook.js).
2. Far tier (`g3Zoom` = 0, the shared calm-map value): one owner-colour dot per stack (ONE `THREE.Points` draw) + numbers for yours / enemies / allies.
   Stacks: all armies in a province stand on one spot (`g3Anchors`), one token with a count; hover or click fans them out.
3. States: holding, marching (arrow nose, dotted route in 13e2-groads.js, "N days" at the destination), dug in (gold brackets: holding behind
   forts while the nation is at war), besieging (dashed red ground ring round the town, one InstancedMesh), fighting (tokens touch, ⚡, tug bar).
4. Close tier: make-up counts on the plate + the real army in miniature (baked soldier / tank / gun / air-defence / helicopter / drone / ship
   models, one InstancedMesh per model, nation tint by instance colour, dashed footprint in the owner's colour; nearest 14 stacks only).
5. Odds pills (Good odds / Even fight / Bad odds) on enemy armies within two months' march of your selected army, from `gtkEst` = the exact
   terms `grAuto` multiplies (guard compares it with `grAuto` itself, dice at zero).
6. Map key, first-minute tips, first-hint text updated; guards: orch/grandtest.mjs "armytokens" block, orch/decisions.mjs static check;
   DECISIONS.md, HISTORY.md, QUEUE.md lines.

View only: no campaign state is written; nothing new in saves.

## Checked
- `python3 orch/build.py` + `--check` OK. orch/grandtest.mjs locally: every block up to and including "armytokens" passed
  (est [10434,17255] == grAuto [10434,17255]); the live-battle part after it was not waited for (sandbox too slow).
- NOT yet run: node orch/smoke.mjs, node orch/decisions.mjs (browser part), the rest of grandtest, and the whole CI gate.

## Not landed — why, and what is next
- `orch/cigate.sh` was started for the branch head, but GitHub's runners had 23 runs queued (one gate at a time, ~1.5 h each), so no result yet.
- CLAUDE.md "RIGHT NOW": look changes do not ship to main until `gate/smooth-mp` is green on main.
- calmmap (`orch/calmmap`, the base of this branch) has not landed either; `orch/calmmap2` did not exist yet when this was written.
Next: (1) when `orch/calmmap2` appears, merge it (it owns zoom tiers / plates / trees in 13e-grand3d.js; this branch only touched the army
parts there: g3Ent, g3Anchors, g3PathPts, the frame-loop army block, g3HitAt/g3Click hooks, the map-key army rows and the old `.p` CSS);
(2) merge origin/main, rebuild; (3) one `orch/cigate.sh`; land when grandsmooth / smooth-pc / smooth-mp are green on the commit and nothing
is red that is not red the same way on main; (4) tick the queue line `[x]` + hash.
Ideas not done: per-nation real vehicle models in the miniature (it uses one generic model per unit type); fill colour inside the footprint.
