# nations-new2 — Japan (JP) (2026-11-06, Sonnet 5.5, scheduled run)

**Status (final, 2026-11-06): main already had a first-cut JP from nations-b3 (NEWNAT, Egypt base), so only the independent pieces were shipped on top of it: Japanese voices, Kimigayo anthem, `BAL.JP` 0.85 (35% -> 46%, aitourney --vs JP, 36 games), JP in tourney/mapfair lists. The richer groundwork (01c-jp.js: JSDF roster, 9 upgrades, Type 12 salvo, doctrine, Honshu map, Japanese town style, 11b-jp.js looks) stays on branch orch/nations-new2 and must be PORTED into NEWNAT/existing tables (not loaded alongside: two JP systems would clash). Original status line:** ~~ Real 3D models, a camouflage texture and the radio/hero voice sheets are still open.~~

## Shipped
- `src/01c-jp.js` (loaded right after 01-data and also in the headless/server sim list in `orch/headless.mjs`): JSDF roster, 9 upgrades, Type 12 salvo,
  Active Defence doctrine, navy flavour (+hp/+dmg for ships), Professional morale style (SYSTEMS.md), all in the same per-nation tables as every nation.
- Looks: white-and-red-disc flag, olive JGSDF vehicles/uniform, west-grey navy (`src/11-models.js`, `src/11b-jp.js`); Honshu Coast map (2–4 players,
  mirrored) and the Japanese town style (dense low-rise, tiled roofs, Japanese town names).
- Voices: 33 Japanese clips, XTTS-v2 `ja` run on CPU with the standard tough pass and radio treatment (`vo/JP.mp3`, `tools/voices/phrases.py` JP tables,
  cast in `orch/vo/cast.json`). Anthem: Kimigayo excerpt `mus/an_JP.mp3` from the public-domain US Navy Band recording (archive.org,
  same source/credit as the other anthems; added to `mus/an_pack.py`, `AN_FAC.JP`).
- Balance: JP cost multiplier `BAL.JP._` tuned 0.9 → 0.85 with `aitourney.mjs --vs JP` (Normal AI, 5 maps, both slots). Measured: 0.9 = 36 %,
  0.8 = 60 %, 0.85 = 50 % (different seed, 36 games). Found on the way: `01c-jp.js` was missing from the headless sim list, so every JP game errored in the CI balance run.
- JP added to the tourney / mapfair nation lists.

## Still open
- Real GLB models for Type 10, Type 16 MCV, Soryu (free CC0/CC-BY): stand-ins are Abrams-family tank, Apache, F-16 jet. No Japanese camouflage texture.
- Radio (`VOR`) and hero (`VOH`) voice sheets for JP (orch/vo/roles.py) — JP uses the base sheet only.
- Honshu map fairness by AI-vs-AI start position (`mapfair.mjs --maps honshu`) not yet run in CI.
- Hard-AI balance for JP (only Normal measured).
