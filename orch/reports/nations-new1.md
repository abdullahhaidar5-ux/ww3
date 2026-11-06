# nations-new1 — Iraq, Syria, Yemen (Coffee Shias), Mountain Shias identity (2026-11-06, Sonnet 5.5, scheduled run)

**Status: first cut shipped (sim-complete IQ and SY, Yemeni/Lebanese town names + lore). Voices, anthems, balance run and the deeper RS content are NOT done — see "Still open".**

## Shipped
- **IQ Iraq** and **SY Syria** are full playable nations (lobby pick, AI Normal/Hard, Conquest). Built by cloning Egypt's complete table row
  (`NEWNAT` in `src/01-data.js`, one block before `FKEYS`, one block before the `FASTN` loop) so every per-nation table has a row and
  strength per tier equals Egypt's starting point:
  - own unit names (IQ: Iraqi Army Squad, Kornet Team, Golden Division Commando, Pantsir-S1, M1A1M Abrams, M109, Mi-28NE, F-16IQ…;
    SY: Syrian Army Squad, Konkurs Team, Republican Guard Commando, Shilka, T-72, 2S1, Mi-24, MiG-29…), special units, hero squads,
    9 upgrades each (`iq1..9`, `sy1..9`), doctrine (`Defence of the Two Rivers` / `Hardened Defence`), nation power (Reconstruction
    Convoy / Air Defence Umbrella), general-power flavour, strike building and economy building names, courage 1.16 (Professional-like).
  - Look (`src/11-models.js`): vehicle models (IQ Abrams/Mi-28/F-16, SY T-90-class/Mi-24/MiG-29), camo palettes, building trim, flags
    (IQ red-white-black with green takbir; SY green-white-black with three red stars = the flag currently in official use).
  - Voices: Iraqi-dialect and Levantine-dialect phrase sets + war cries (`PHR_FAC`, `PHR_X`, `FCRY*` in `src/09-audio.js`) — spoken by the
    browser's Arabic voice for now (no recorded files).
  - Home turf: IQ on `mesopotamia`, `euphrates`; SY on `euphrates`, `aleppo`, `golanplateau`.
  - Town names: new pools per region (`TOWN_NAMES.lb/ye/iq/sy`, picked in `townNames`).
- **DW = Yemen**: lore text now Yemeni (Sana'a tower-house towns, Sarawat, Red Sea); Yemeni town names on `style:'yemen'` maps. Name,
  slogans, flag/emblem untouched.
- **RS identity**: lore text says Lebanese mountain Shia resistance; real Lebanese place names (Bint Jbeil, Maroun al-Ras, Khiam, Nabatieh,
  Baalbek, Hermel, Litani Bend…) on `style:'lebanon'` maps. No real organisation name/flag/leader anywhere.
- Sim change (town names enter sim state) + new factions in `src/01-data.js` → **main → servers-live PR needed for Cloudflare battles.**

## Still open (not done this run)
1. **Voices**: XTTS-v2 is not available in the scheduled cloud run (no GPU / TTS package) → no recorded tough2 Arabic lines for IQ, SY; DW
   not re-voiced (keep as is). Needs a run with XTTS.
2. **Anthems** (`mus/an_pack.py`, `AN_FAC`): none for IQ/SY — need freely licensed recordings; none found/verified in this run.
3. **Balance**: only a 6-game smoke tourney (IQ 67%, SY 67%, EG 50%, DW 17% in 3 games each — too few to mean anything). The full
   `balance/*` workflow with IQ, SY, DW, RS still has to be run; numbers to tune are `mods`/`BAL` of IQ and SY only.
4. **RS content** beyond names/lore: Ashura banners and "Ya Hussein" wall calligraphy, shrine props, stone-village look variant,
   Kornet ATGM ambush squad naming, tunnel/hidden-launch-site visuals — build on tunnels-militia.md and fortress.md in a follow-up.
5. IQ/SY: encyclopedia unit-guide pictures use the shared Egypt models; unique uniforms/markings only via colour palettes for now.
   Dedicated Mesopotamian / Levantine town-look styles (currently the shared `mideast` look with regional names).
6. JP Japan not started.

## Questions for Abdullah
- Syria flag: I used the green-white-black flag with three red stars (the one in official use now). Prefer the older red-white-black with two green stars?
- DW emblem/flag: left unchanged (no clash found with "Yemen", but I did not review it visually).
- Menu credits: no new third-party assets were added, so no credit changes.
