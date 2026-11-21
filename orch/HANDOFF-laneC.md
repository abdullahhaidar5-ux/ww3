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

## Results (GitHub runners, 2026-11-21)

### Cost - controlled bench (`<fam>-bench.txt`): same seeded scene, full base for every side, before/after alternated A B A B B A, one job
| family (nations) | draw calls, battle camera | shadow-pass draws | triangles | shader programs | CPU ms/frame (draws swallowed) |
|---|---|---|---|---|---|
| Shia (IR, RV) | 193-194 -> 194-195 (**+1**) | +0 | +2-5k (of 1.75M) | no change | IR battle 3.4/3.8/3.1 -> 4.7/3.7/3.5; RV 3.0/3.7/2.8 -> 2.8/2.4/3.2 (noise) |
| West (US, GB) | 185 -> 189-190 (**+4**) | +0 | +14-19k | no change | US 3.9/4.2/4.4 -> 3.7/4.3/4.6 (same) |
| East (RU, KP) | 185 -> 189 (**+4**) | +0 | +15k | no change | RU 5.1/4.8/5.0 -> 4.9/4.8/5.1 (same) |
| Regional (TR; SA) | TR 185 -> 189 (**+4**); SA unchanged (kit skipped) | +0 | +12k | no change | TR 5.7/5.3/5.0 -> 4.9/4.8/5.7 (same) |
+4 = one merged mesh per base building (HQ, barracks, War Factory, depot). Wide view (dist 900, several bases) same picture: +4 calls.
One odd number: IR wide view 4.0/6.8/4.9 -> 7.3/7.7/5.7 ms while RV wide stayed 3.3/2.6/2.6 -> 3.0/3.0/3.2; one extra mesh cannot plausibly
cost 1.7 ms of CPU, I read it as runner noise - **not sure**, worth one look on a real PC.

### smooth-pc A B B A in one job (`<fam>-summary.txt`, battle filled with that family's nations; HQs only at the start, so kits barely in it)
shia A 143.5/143.8 ms, B 140.3/141.0 ms; west A 75.9/108.1, B 88.2/84.9; east A 70.4/59.9, B 57.4/62.3; regional A 61.9/73.3, B 85.0/75.1.
Run-to-run noise (+-20-40 %) is bigger than any kit effect; draw calls B within the A spread for every family. No new shaders in any B run.

### Look - my honest verdict per family (pictures in `orch/shots/laneC/`, `cmp` = before top / after bottom)
- **Shia**: gate arch over the compound gates (reads as a dark hoop in shadow - weakest part), cloth banners/sandbag shoulders at the
  gate, small green roof pennants (visible but tiny at battle camera). Subtle; the real win is the **roof-kit bug fix**.
- **West**: blast-wall line, sandbag posts, generator/AC, tall antenna mast. Reads as a fortified base; the wall line partly doubles the
  existing yard fence. OK.
- **East**: concrete fence, tyres, camo-net lean-to (reads as dark plates more than a net), radio mast, small second flag next to the
  big one. Mixed - weakest family.
- **Regional (TR/PK)**: crenellated sand wall, HESCO, dish, second flag on the HQ. OK. (SA/AE/EG skipped, see above.)
None of them is a big look win; all are cheap (+4 draws per base, no shadows, no new shaders). Recommend: land West + Regional + the Shia
roof fix after Abdullah's OK; East and the Shia arch only if he likes them in the pictures.

### Side finding for ORCH (not lane C, current main 261e9af)
smooth-pc battles with only Shia nations (IR, RV, RS, DW, OB) run **~8000-9200 draw calls/frame and ~140 ms median frame** on the runner,
vs ~1300-1900 calls / 60-110 ms for all-West, all-East or all-Regional battles in the same job type. A single scene render (census,
`census-shia.log`) is only ~400-500 calls for both, so the extra comes from per-frame passes, likely the soldiers drawn one by one
(0119b01) times the infantry-heavy Shia columns. Abdullah's group plays Shia most - this is probably the biggest lag lead.

### Gates (orch/cigate.sh per v2 branch)
(see bottom - filled in when the runs finish; the runner queue was ~25 gate runs deep tonight)
