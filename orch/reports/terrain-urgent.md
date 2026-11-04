# terrain-urgent (2026-11-04)
Shipped: ground detail much stronger on PC/Medium (contrast, slope rock via vertex slope, ~190/520-unit patchy soil/dust variation, fine grit); conifers and broadleaf/acacia trees rebuilt as alpha-cut needle/leaf cards (instanced, muted olive/dark greens, wind sway, soft-ball normals, cheap shadow proxy; Low gets fewer cards); grass tufts desaturated. Tree positions/sim untouched.
Shots: orch/shots/terrain/ (before-desert, after-desert, after-green). Not done: dead/burnt trees, impostor billboards, snow-map and phone-viewport shots, new CC0 textures (existing TERR_DET textures reused).
Perf: no extra draw-call growth beyond +1 per tree variant; Low untouched on the ground shader.
