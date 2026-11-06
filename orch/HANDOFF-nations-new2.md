# HANDOFF — orch/nations-new2 (Japan, JP) — stopped early, NOT on main

Done (branch `orch/nations-new2`, builds clean with `python3 orch/build.py`):
- `src/01c-jp.js` (new, loads after 01-data): JP registered in the same per-nation tables as every nation — FACTIONS (JSDF roster names: Type 10, Type 99, AH-64DJP, F-2, Maya-class Aegis destroyer, Hayabusa boat), UPG/UPGL (9 upgrades jp1–jp9, same tier prices), NATPOW (Type 12 salvo), GPOW, DOCT (Active Defence), XL (ships/subs +20% hp, +10% dmg = navy flavour), TRN, SUBN (Soryu), MDN, COASTN, UPLINK, ECON, HEROES, SPEC, COURAGE (Professional ≈1.03), GDOC_AI/FLV, BAL (placeholder `_:0.9`, **needs tourney**).
- `src/11-models.js`: JP flag (white + red disc), KFAC; `src/11b-jp.js`: model/colour maps (Abrams-family tank stand-in, Apache, F-16 stand-in jet, west-grey navy, JGSDF olive-green uniform/vehicles).
- `src/03-sim.js` militia name + radio station + Japanese town names; `src/08-ui.js` adjective; `src/09-audio.js` Japanese voice text lines (tough short callouts, war cries).
- Map `honshu` (Honshu Coast, 2–4 players, mirrorX, home JP) + town style `japan` (dense low-rise, tiled roofs) in 02-map / 04-gfx / 04c-townlook.

NOT done (this cloud run had no GPU and software-only Chromium, ~3 min per game-minute):
1. `node orch/smoke.mjs` / `orch/smooth.mjs` / `orch/cigate.sh` — never completed here; run them first.
2. Balance tourney (`node orch/tourney.mjs --factions JP,... --swap`) until JP is 40–60%; tune `BAL.JP`, `XL.JP`, mods in 01c-jp.js only. Add 'JP' to the ALL lists in orch/tourney.mjs, mapfair.mjs, aitourney.mjs; run `mapfair.mjs --maps honshu` (fairness unverified).
3. Voices: XTTS-v2 `ja` tough2 + radio treatment -> `vo/JP.mp3` + VO_MAP/VOR/VOH entries (needs GPU). Lines are already in 09-audio.js PHR tables.
4. Anthem excerpt (public-domain recording, credited) via mus/an_pack.py -> `mus/an_JP.mp3`, AN_FAC.JP, menu credit.
5. Encyclopedia/unit-guide entries (08f / 08b-identity list), lobby pick check, AI Normal+Hard check, ckpt (07b) — JP adds no new sim state.
6. Real models: Type 10/Type 16/Soryu models not added (free GLBs needed); current stand-ins listed above. Japanese camouflage uniform texture not painted yet.
7. CLAUDE.md factions line + orch/GRAND-PICKS.md (grand-map home region = Japan) + ROADMAP. Sim change -> open main→servers-live PR when merged.
