# HANDOFF redfixC — smoothness gates (superfreeze, smooth-pc)

Branch `orch/redfixC`. Game code only in src/04-gfx.js, 05-fx3d.js, 06-view.js, 08-ui.js, 09-audio.js, 11-models.js (view/audio only, no simulation change → servers need no move).

## What was red and why
- **smooth-pc: draw calls 3275 (baseline 1661, max 2551).** Every bridge was built from ~150 separate meshes (stone piers, balls, lamp posts, arcs, globes), drawn twice per frame (AO depth + main) — ~1200 extra draws on Fulda. Fix: `mergeByMat(grp)` (04-gfx) merges a bridge's plain meshes into one mesh per material; pillars below the deck merged apart so a blown bridge still hides only the deck parts (08c-logi lgGfx). Local diag: 2700 → 1786 draws on the same frame.
- **superfreeze "47 new meshes" (IR):** infantry running into houses under the barrage made garrison entities, each building a new flag pole, flag, scaffold wireframe and material. Now shared (`garParts`, `scafGeo`, `scafMat`), kept from the GPU clean-up (`gcKeep`), and drawn once in the warm-up (`step('garrison')`, with the supply truck crate shape — it was also built new per truck: `harvCargoGeo`).
- **superfreeze "4 new textures + 616 KB buffers":** soldiers leaving a house were rebuilt (garrisoned units leave G.ents → their object was deleted). (a) syncScene now parks hidden soldier figures (`PARK`, 06-view) for up to 90 s and reuses them; (b) merged soldier shapes (`SOLM`) are `gcKeep` (the 15 s GPU clean-up used to free them, so they were re-sent); (c) bone textures come from a pool filled at load (`bonePool`/`bonePoolWarm`/`boneRelease` in 11-models, released in gpuGc).
- **simUpdate 200+ ms spikes:** the first sound of a battle built the theatre echo (3.4 s of stereo noise in a JS loop) inside the first explosion. Now `sfxEnsure()` runs in the "Preparing graphics" load step and `impulse()` buffers are cached. Local: worst simUpdate 114 → 51 ms (IR), 31 ms (US).
- Warm-up battlefield slices now draw off-screen scenery too (frustumCulled off during the slices) so rocks/depots across the map are on the card before first sight.

## Not mine
- gate/migrate-dual / migrate-down ("AI took over but did nothing") — redfixB's lane (net/migration); fails on main too.

## Tools left out of the commit
`orch/_diag.mjs` (`--calls`: per-render draw-call breakdown by owner) and `orch/_sf.mjs` (superfreeze with VAO/texture stacks) were local copies only.
