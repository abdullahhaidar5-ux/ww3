# Realism pass (2026-11-05, branch orch/realism) — Abdullah's CoH / Broken Arrow list, render-only

All of it is render-side (no sim change, no servers-live PR needed): host and clients draw the same battle, nothing here feeds back.

1. **Soldier body language** (`postApply` in 11-models.js, `squadPost` in 06-view.js): pinned-down (suppressed) squads go prone (body really lies flat, head forward),
   squads firing from cover (existing `coverAt`) crouch / kneel, a quarter of a prone squad kneels instead so they don't drop in lockstep; the drop ripples through the squad.
   While firing a soldier now and then pauses to reload (chest bows to the rifle) or lobs a grenade (wind-up, throw, grenade arc + small burst where it lands).
   Works with the existing rigged soldiers (bone poses, no new draws). Within 760 zoom only (same gate as the walk cycle). Not done: a comrade dragging a wounded soldier.
2. **3D battle sound** (09-audio.js `bus`): lowpass now falls with distance down to ~900 Hz (far fire = low muffled rumble, low shelf lifted up to +9 dB),
   close fire (<22% of range) gets a +5 dB presence peak at 3 kHz (sharp crack); global cap of 14 gun sounds per 150 ms (7 on phones; shelf/peak filters off on phones).
   Echo by theatre already existed (`sfxTheatre`: mountain/snow long, green, city...) and is untouched. AUDIO PASS.
3. **Battle scars** (05-fx3d.js): scorch pool 180 -> 320, crater pool 90 -> 160 (oldest is overwritten), tracks 1600 as before; the terrain scar texture (04-gfx) already lasts all match.
   Not done: broken/fallen trees (needs a tree-instance index in 04-gfx).
4. **Deaths and wrecks** (05-fx3d.js): four kinds of fall (sideways, face-down, backwards, crumple to the knees first) with random turn; bodies now stay ~50 s (was 14 s), cap 90 (40 on phones);
   vehicle wrecks burn then stay ~3 min (was 56 s), cap 30 (12 on phones); the turret-blast on heavy kills already existed (45%). Wrecks do NOT block roads (that would be a sim change + servers PR; not done).
5. **Garrisons** (new src/06b-realism.js): a garrisoned city building shows dark silhouettes (up to 3) in real window cells (cell grid taken from the wall shader: 9/10 or 6/8 unit cells) on the wall facing the last shot;
   every shot fired from inside flashes that window (flash, puff, light). As the building loses HP it gets char holes + smoke from more floors (<72% HP), flames from <45%. Only garrison buildings (their HP is the one synced to clients).
6. **Living towns** (06b-realism.js): up to 10 civilians and 3 cars wander free ground around towns near the camera, run / drive away from shooting within ~300 units and disappear;
   street lamps and window lights fade out (to ~10%) while a fight rages near the camera and come back after. Off on Low / phones, never in the sim, never targetable.
   Kill switches for tests: `window.NOPOSTURE`, `window.NOREAL`.

Tools: `orch/realismshots.mjs <posture|garrison|town>` (screenshots into orch/shots/realism/).

## Evidence / not done
Screenshots in orch/shots/realism/ (posture-*, garrison-*, town-*, scars-*). CI gate: all green (CIGATE PASS, 20/20 incl. smooth-pc and smooth-mp).
Local smooth.mjs on this slow box failed on noise (load time +77% too), CI on GitHub passed. Not done: ≤10 s MP4, phone screenshots, comrade-drags-wounded animation,
broken/fallen trees, wrecks blocking roads (sim change). Turret-blast on heavy kills already existed.
