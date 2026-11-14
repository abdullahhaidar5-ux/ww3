# HANDOFF — civhumans (branch `orch/civhumans`)

Owner request (Abdullah, Fri 2026-11-13 17:29 Chicago): "Make sure civilians on the maps look like humans and aren't blocky" — for Conquest, Battle, Missions and Test range maps.

## Done
- **Town civilians are people now** (`src/06b-realism.js`, the realism module's own civilian code — no second system):
  - The four-box figure (`RE_CIVM`: two box legs, a box body, a box head, in 4 color copies) is gone.
  - `reHumGeo` builds one smooth human figure in code (no new art, nothing downloaded): infantry height (sized from `MCFG.inf.size`, so civilians stand as tall as soldiers — the old boxes were about half a soldier's height), rounded head with nose, hair cap or an optional headscarf that leaves the face open, neck, shaped torso, shoulders, tapered upper arms / forearms, hands, thighs / shins, shoes, an optional long robe (thobe / abaya). ~3,000 triangles near, ~1,000 far.
  - `reHumLook` gives each person their own look through per-instance values: shirt/jacket color (14 civilian colors, no olive/khaki), trousers (7), robe (7), headscarf (8), hair (6, incl. gray/white cap), 7 skin tones, height 0.9–1.05 and build 0.92–1.12. About 28% wear a long robe (half of those a headscarf), 22% of the others a headscarf.
  - Animation is in the vertex shader (`RE_HUMVS`, also used by the shadow material): legs swing from the hips with the knee bending through the swing, arms swing opposite, body drops slightly as the legs open (feet stay on the ground), robe sways. Fleeing = run blend: longer stride, bent elbows, forward lean. Stride cadence follows ground speed (no sliding feet). No skeletons, no CPU skinning.
  - Draw cost: ONE instanced mesh for all civilians (+ its shadow), hidden when empty; the old version had 4. LOD: near figure under zoom 300, thin far figure beyond; hidden past zoom 820 and on Low / phones exactly as before.
  - Still cosmetic exactly as before: never targetable, not in the sim, sync or checkpoint; same counts (max 10, `ceil(zoom/70)`); same flee logic. Walk / run speeds are scaled to the new figure size (walk ≈1.3 m/s, run ≈5 m/s at the figure's scale) — the old speeds were tuned for figures half as tall.
- **Refugee columns** (`G.refs`, Conquest/Battle politics) were little 2D rectangles + circles painted on the HUD canvas. They are now drawn as the same walking 3D people (fixed look per refugee, same positions as the old figures); the REFUGEES label stays. When the 3D people are off (Low graphics, zoomed out past 820) the old 2D figures are still drawn so the column stays visible (`drawRefugeesWorld` in `src/08c-intel.js`).
- Guard in `orch/decisions.mjs` ("civhumans"): `RE_CIVM` / the box figure must not come back; civilians must use `reHumGeo` / `reHumMesh` / `reHumLook`; no second civilian system.
- `orch/civshots.mjs <tag> [map] [--html file]` takes the proof pictures.

## Other "people" found in battle maps (item 4)
| What | Where | Status |
|---|---|---|
| Town civilians | `06b-realism.js` | replaced (this ship) |
| Refugee columns (2D canvas figures) | `08c-intel.js` drawRefugeesWorld | now 3D people (this ship); 2D kept as fallback |
| Door gunners in transport helicopters | `11-models.js` ~1482 | small cylinder + ellipsoid soldier inside the vehicle model, merged into the vehicle; not boxes, soldiers not civilians — left alone |
| Tank commander in his hatch | `11-models.js` ~1546 | same (cylinder + ellipsoid, merged) — left alone |
| Ayatollah / Dear Leader + escorts | `11-models.js` dlBuild | already built from cylinders/spheres, signature units — left alone |
No market crowds, workers or prisoners exist in battle maps.

## Not done
- Cars are still box cars (not part of the ask).
- No full skinned human: the infantry meshes (`sol_e/m/w`) are one textured mesh with helmet, vest and camo baked in, so they would read as soldiers; a code-built figure with the same height and proportions was used instead.

## Gate
See the bottom of this file (filled in after `orch/cigate.sh`).

## Pictures (orch/concepts/civhumans/)
`before-street.jpg` / `after-street.jpg` (town at play zoom), `before-flee.jpg` / `after-flee.jpg` (gunfire starts), `before-close.jpg` / `after-close.jpg` (close zoom next to a soldier).

## One thing for Abdullah to try (2 minutes, PC)
Start a Conquest game on Fulda Gap, scroll to the nearest town and zoom all the way in on a street: the people walking there should look like people in their own clothes (some in robes and headscarves). Then fire at something near them — they should run away, leaning forward with their arms pumping. https://abdullahhaidar5-ux.github.io/ww3/
