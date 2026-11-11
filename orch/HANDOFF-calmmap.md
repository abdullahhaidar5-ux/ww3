# HANDOFF calmmap (2026-11-11)

Done on branch `orch/calmmap` (src/13e-grand3d.js, 13c-grandui.js, orch/grandtest.mjs, orch/calmshots.mjs):
- ONE zoom tier `g3Zoom(d)` (far d>=440 = world and every region view, middle 250-440, close <250); used by labels, badges, trees, towns, flags.
- Far: no trees/towns/flags, <=13 capital plates (you, enemies, majors, neighbours first), only your army badges. Middle: one badge per province (yours bold, enemies, allies, others small and faint), smaller plates that hide when they would cover a higher-priority plate or your badges. Close: as before.
- Trees: `G3_DRY` belts + `g3Arid()` in `g3ForestCover` (Sahara, Arabia, Iranian plateau, Central Asia, Gobi, Thar, Australia, Namib, Atacama, Sonora, Horn) -> bare or sparse scrub; palms only on rivers/oases. (The per-province biome letter is unreliable: generated provinces default to 'f', so it is not used.)
- Map key starts folded (`SET.g3leg` is 'open' only after a click), forced folded while the first-minute tips are up; Political button CSS fixed.
- Guards: orch/grandtest.mjs "calmmap" block (key folded, no woods in dry belts / LY EG SA <=250, far = 0 trees and <=15 plates, middle = no duplicate badge per province). `orch/calmshots.mjs <prefix> [close]` takes the pictures.
Not done / next: nothing missing from the brief. Landing waits for gate/smooth-mp green on main (CLAUDE.md "RIGHT NOW"). Rebase on origin/main, rebuild (index.html + grand.*.js), run orch/cigate.sh, then land.
