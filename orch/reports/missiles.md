# Missile strikes — cinematic pass (2026-11-05)

Abdullah: "What's up with the missile strikes. They look really bad."
Filmed with `node orch/missileshots.mjs --tag before|after --phone 1` -> `orch/shots/missiles/` (before-* and after-*, phone size; Tomahawk from a VLS, Iran Kheibar, Bunker Buster).

## What looked bad (before)
- Launch: all missiles left the site at the same instant as a tiny dark stick; no visible motor flame or launch smoke worth seeing, so a "salvo" read as nothing happening, then blasts.
- Flight: a boxy cylinder-and-box missile (4 box fins), a short thin trail, no cruise/ballistic difference (Tomahawk and Kheibar flew the same high arc), no wobble.
- Warning: faint hairline ring + tiny numbers, no sound cue except one alarm beep.
- Impact: small brown/black smoke puffs, a blob-like fireball, dust ring only a half circle (a bug: angles 0..π), boulder-sized debris on some blasts, weak shake (not scaled by distance). Bunker Buster had no falling bomb and a weak blast.

## What changed (visuals + sound only; 01-data / 02-map / 03-sim / 07* untouched)
- New `src/05b-missiles.js`. Missiles are smooth Lathe shapes (slim body, ogive nose, dark band, swept fins; cruise gets pop-out wings; bomb gets canards), no boxes.
- Launch: each missile leaves on its own (staggered, still landing exactly on the sim's hit time), bright flame cone, flash light, white smoke billow along the ground + rising column, spark spray, motor roar.
- Flight: Tomahawk/SCALP/Neptune (VLS) = pop out of the cell then fly low and fast; other nations = high ballistic arc with a steep dive and an orange re-entry glow streak; long fading smoke trail spaced by distance; slight corkscrew wobble.
- Warning: shrinking ring converging on the target, steady outer ring, cross + four ticks, faster pulse in the last 1.6 s, incoming whistle. Air-launched missiles and Bunker Buster bombs now visibly fall onto the marker (bomb with fins and trail, falling shriek).
- Impact: bigger flash + hot core, rolling fireball and dark-orange fireball body, full-circle dust wall, bright shock ring, glowing fragments, small irregular rocks, lingering mushroom column (max 4 at once), bigger scorch + crater, deep thump + rumble sound, shake scaled by distance (explosions in general now shake less when far away).
- Cost: everything goes through the pooled `part()`; ~half the particles on phones; mushrooms capped; geometry shared.
