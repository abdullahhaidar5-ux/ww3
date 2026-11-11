# calmmap notes (landed on main 2026-11-11)

Branch `orch/calmmap` (src/13e-grand3d.js, 13g-grandlook.js, 13c-grandui.js, orch/grandtest.mjs, orch/calmshots.mjs). Landed on main 2026-11-11 (merge after 7c7caba).

What it does
- ONE zoom tier `g3Zoom(d)`: far d>=600 (world view and wider than a region button), middle 250-600 (the region buttons open here; town clusters and small countries' capital plates join below d=400), close <250. Used by labels, badges, army figures, trees, towns, flags.
- Far: owner colours + country names, <=13 capital plates (you, enemies, neighbours, majors), only your armies and your enemies' (figure + badge); no trees, towns, flags.
- Middle: one badge per province (yours/enemies bold, allies normal, others small and faint); figures only for you, enemies, allies; smaller plates that give way to higher-priority plates and your badges; no trees.
- Close: everything as before; trees fade in between d=250 and d=200.
- First-minute tips are a compact strip (same text) that goes away on Got it, the first right-click order or after 60 s; sea names are fainter outside the close view.
- Map key starts folded (`SET.g3leg==='open'` only after a click), never open together with the first-minute tips; Political button CSS fixed.

Why forests stood on the Sahara (found in the second run)
- The real satellite land cover (grand/color.jpg, loaded 1.5 s after the grand bundle) was already right (Libya 3 trees). The woods came from the stand-in used when the map is drawn BEFORE that file has arrived: province biome letter, which defaults to 'f' (forest) for most provinces. Every test robot opens the map at once, so every robot picture showed it; a player hits it on the first campaign of a session on a slow line, and always in the one-file edition if the file cannot load.
- Fix: `g3ForestRefresh()` replants the trees from the real data as soon as it lands (called from `g3LoadReal`, ~0.3 s once, no screen rebuild). The stand-in itself now knows the dry belts (`G3_DRY`, used ONLY when real data is absent).
- Not fixed (outside this lane, small): the ground colours/relief still stay stand-in until the campaign screen is reopened; armies hidden by fog still show their figure (old behaviour: g3Frame sets `e.g.visible=e.mini` after the fog hook).

Guards: orch/grandtest.mjs "calmmap" block (key folded; woods in LY/EG/SA with stand-in <=250 each and with real data <=25 each; far = 0 trees, <=15 plates, no foreign badges/figures; middle = 0 trees, no two badges for one province; close brings all figures back). Local result: stand-in [154,80,79], real [3,1,2].
Pictures: `node orch/calmshots.mjs after` -> orch/shots/calmmap/ (before-* were taken on main with the stand-in land cover, as ORCH saw it).

Note: the full orch/grandtest.mjs is too slow for the cloud sandbox; gate/grand on GitHub is the proof.
Waiting on branch orch/calmmap (not on main, not gate-tested): army flags wave only in the close view or on the selected army (one line in src/13e-grand3d.js, from session 01GRiS9qfnbN15AiASsGWMyx).
