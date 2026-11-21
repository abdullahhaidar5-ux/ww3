# HANDOFF lane C (base buildings) - 2026-11-21 (work in progress, updated as results come in)

**Land only the `-v2` branches** (built on main 261e9af): `orch/laneC-shia-v2`, `orch/laneC-west-v2`, `orch/laneC-east-v2`, `orch/laneC-regional-v2`.
The first set (`orch/laneC-shia|west|east|regional`, no -v2) is VOID: my sandbox's `origin/main` was stale (Nov 12, 10cf4bd) because the
first fetch timed out, so those branches sat on a week-old game. Their pictures/numbers are kept only in `orch/shots/laneC/void-wrong-base/`.
Lesson for helpers: after cloning, check `git rev-parse origin/main` against `git ls-remote origin main` before branching.

## What each v2 branch is (all view only)
- shia-v2 = 29853d34 + 9f5bb563 + 357ba0a5 (compound gate arch/banners/sandbags; roof pennants + mudbrick band + roof AC).
  Light pass: pennant/band materials single-sided (no double-sided shader variant) and shadowless; AC units and poles reuse the roof
  kit's tin/pole materials so they merge into meshes already drawn.
  **Bug fix found by looking at the pictures:** 9f5bb563 reads `T.fac` inside `roofKit`, which has no `T` -> ReferenceError, caught,
  and every later part of the roof kit (yard wall round the depot, HQ/factory roof boxes) was lost on every non-compound building of
  every nation. Fixed with the building's own team (`TF`). The pennants never showed in the original either.
- west-v2 = 0f63d625 (bldfam framework + West kit), `castShadow=false` (it cast shadows before).
- east-v2 = 0f63d625 + e4bec093 (lighter East), only East switched on, no shadow.
- regional-v2 = 0f63d625 + e4bec093 + 7fac31b9, only Regional on, no shadow, and **skipped for SA/AE/EG**: the pictures showed the
  sand/HESCO ring doubled up inside their walled Middle Eastern compound (cluttered). So Regional now dresses TR and PK only.
- Every family kit = ONE merged mesh per building on the shared standard material (`MAT.std`, vertex colours), geometry built once per
  family/kind/size and shared; no shadow casters; no new shader programs.

## Proof (GitHub runners)
- Pictures: branch `orch/laneC-shots`, folder `orch/shots/laneC/` (`<fam>-before|after-<nation>-battle|close.jpg`; desert bm_breakwater,
  Clear day, normal battle camera + close), from `.github/workflows/laneC-bench.yml` on branch `orch/laneC-bench`.
- Controlled bench (same seeded scene, full base for every side, before/after alternated A B A B B A in one job):
  `<fam>-bench.txt` - CPU ms per frame, draw calls without/with shadow pass, triangles, shader programs.
- smooth-pc A B B A in one job, battle filled with that family's nations: `<fam>-summary.txt` (laneC.yml on `orch/laneC-measure`).
- Gates: `orch/cigate.sh` per v2 branch.

## Results
(pending - filled in below as runs finish)
