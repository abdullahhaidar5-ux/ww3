# Maps20 — bigger, 20 new maps, fair starts (branch `orch/maps20`)

**Size:** every map +20% (`worldScaleFor` 1.3→1.56): 2p 5000×3440, 8p 8720×6000. Sim cost per unit unchanged (bench fulda 8p: 0.53→0.56 ms/unit·s; setup +0.5 s); phone 390×844 4× throttle frame time not worse (columns.mjs 354→275 ms median, SwiftShader). Duels still end in ~8–12 min.

**20 new maps (all mirror/point/four-way symmetric):** 2p Khyber Pass, Euphrates Crossing, Caspian Oil Coast, Aleppo Ruins · 3–4p Anatolian Mesa, Bab-el-Mandeb, Siberian Taiga, Hawizeh Marshes · 4–6p Sahara Crossroads, Caucasus Valleys, Crimean Isthmus, Five Rivers · 6–8p Najd Escarpment, Ural Ridge, Aegean Islands, Yangtze Gorges · 8p Burning Oil Fields, Rhine Front, Hindu Kush, Gulf Oil Platforms.

**Existing maps changed:** supply/oil now placed by *driving distance* for every map: each base gets the same own expansions; contested fields sit halfway between neighbours (mirror pairs across rivers); exposed bases get one extra close field per extra nearby rival. 6- and 8-player games now start on a regular ring (`sl6`/`sl8`, shown in the picker) — rows left the middle base losing almost every FFA. Volga/Dnipro cramped slots respaced; Sinai Plateau got its mesas; Gulf Coast hills + island; long sea bridges now reach at large scale (Taiwan 5–6p was split).

**Fairness (2640 AI games, `orch/reports/maps20-fairness.txt`):** duels on all 32 two-player maps 31–75% per side (16 games each), pooled 603 vs 553; 3–4p fine except Hawizeh 3p, Volga 4p. 6/8p FFA pooled by seat 85–136 / 52–95 wins (was 32–106); 24 of 127 layouts still show a hot seat, but mirror-image seats on plain symmetric rings disagree as much (AI picks the nearest/lowest-index foe) — an AI issue, not ground.

**Tools:** `orch/mapfair.mjs` (static + battles), `.github/workflows/mapfair.yml` (24 parallel shards). Shots: `orch/shots/maps20/`.

**CIGATE PASS** 17/17 on 90f6600 (mapsweep 808 static + 115 battles; headless compare identical).

**Needs:** a `main → servers-live` PR after merge (02-map/01-data changed).
