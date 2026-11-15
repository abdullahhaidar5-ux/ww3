# HANDOFF mapfix (2026-11-15)

Task: even out caribbean and hormuzgate (Abdullah "Yes", 2026-11-14 23:56). Details and before/after table: `orch/reports/mapfair.md` ("mapfix").

Done (src/): per-tick team order alternates (`G.upN` in `simUpdate`, in the checkpoint `CK_G`), AI think order rotates with it; caribbean island/cays and hormuz centre island use even harmonics only (point-symmetric); caribbean towns mirrored; new flag `mirRes:1` (caribbean, hormuzgate; `src/02-map.js` mkMap) makes derricks, supply fields, hamlets and towns the exact point mirror for 2 players. Guards: `orch/decisions.mjs` ("mapfix").

Not solved: AI-vs-AI games still lean to position 1 on both maps (about 70%, 28-56 games). Ideas left: mirror random trees/rocks (G.treePos) for mirRes maps; `coastSpot` tie-break; 40+ games on GitHub Actions. Do not conclude from fewer than ~40 games per map.

Servers: simulation changed, so servers-live needs the manual merge (see task text).
