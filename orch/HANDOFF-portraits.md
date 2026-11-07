# HANDOFF portraits (round 3, "portraits3") — better, still NOT EU4 / $75 quality; do not show Abdullah as "done"

Round 3 (2026-11-07, ~1h50 of work) added the free MakeHuman asset packs Abdullah approved (06:45) and rebuilt the pipeline around them. Sheet kept for the record only: `orch/shots/portraits/sheet-round3-REJECTED.png` (40 portraits). Sprites + manifest are in `art/portraits/` (516 KB), flag still OFF (`ptOn()` false).

## What is fixed vs round 2
- Real skin textures (skins01/02, tinted per region/age/tone, pore bump) — the waxy orange is gone; faces read as skin.
- Real eyebrows + eyelashes (pack proxies fitted with MakeHuman weights, `bl/mhclo.py`).
- Beards: soft jaw-following mask (`compose.beard_mask`) — no more box masks; moustache-only, stubble, short, full, long all work. The bodyparts05 pack beards were tried and dropped (crude, patchy, one side missing).
- Suits from suits01 (jacket / shirt / tie islands recoloured per nation; lapels, collar, tie knot); service-dress for generals with gold collar tabs, epaulettes, a proper peaked cap (skull-hugging band + saucer top + visor + cord) and a flat-dome beret; ghutra = a draped cloth shell with agal ring; turban sizes/layers vary; aba with gold braid for the clerics.
- Women: female suit + blouse, hazel bob / 50s updo (hair02, CC-BY Elvaerwyn, credited), feminised face targets — no longer androgynous.
- Natural hairline with temple points, denser strand hair; clerics differ in skin, beard length/shape, turban.

## What still blocks "clearly EU4-level" (seen at 100%)
1. Faces still share one MakeHuman "head type": long jaw, weak chin, the same flat expression; many presidents look like cousins. Needs sculpted per-person detail (MakeHuman targets cannot make real character) or hand-painted/hand-sculpted heads.
2. Plastic CG look: the skin textures are soft, the hair is molded-cap strands (men) or helmet-like proxies (women), eyes are glossy marbles; painting pass is only a mild Kuwahara + grade. A stronger painterly pass (tried r=3) smears faces — it needs a proper brush-stroke/painterly shader, not a filter.
3. A few faces still have mouth/cheek bulges from the random face targets (e.g. CN general) and eye-socket shadows on the old-skin texture (aksel/old textures have dark eye patches; aksel removed, old kept).
4. Pack hair02 is stylised fashion hair; there is no good short men's hair in the free packs, so men are strands.
Time/cost: ~45 s per portrait at 440x550 on 2 CPU cores (40 = 30 min); the packs download at ~0.2 MB/s per connection (parallel is fine).

## Options for Abdullah
(a) accept the stylised-CG look for the Government tab (small 72 px cards hide most of the flaws; turn on `ptOn()` only for those), or (b) a dedicated art pass: sculpt 6–8 hero heads with distinct bone structure (Blender sculpt or a CC0 head scan set that is NOT a real person — none found yet) and a real painterly shader, or (c) keep names only.

## Run it
`orch/portraits/README.md`. `PACKS` dir layout: `<pack>/...` unzipped (never commit). `python3 orch/portraits/manifest.py people.json ids40.txt art/portraits/manifest.json` lists which asset each portrait used.
