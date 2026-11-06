# nation-frde — France and Germany (2026-11-06, Sonnet 5.5, scheduled run)

**Status: first cut. FR and DE are playable (lobby, AI Normal/Hard, Conquest). Voices, balance, town looks and grand provinces are open.**

## Shipped
- `NEWNAT.FR` / `NEWNAT.DE` in `src/01-data.js` (base EU, so power per tier equals EU's): own unit names, 9 upgrades each, doctrine and nation-power names, general powers, flags (tricolours drawn in 11-models), uplink/economy names, courage 1.03 (Professional).
- 11-models, 08-ui, 01c-modern, 08b-identity, 13-grand: FR/DE next to EU everywhere EU had a row (vehicle models, palettes, camo, flags, kit atlas). Kit atlas fix: 22 nations overflowed the 18-cell roundel block; atlas now 14 rows, roundels at cell 80+.
- Audio: FR/DE use EU's recorded sheets (`VO_SHEET`), German device-speech lines + war cries, FR French cries; anthems `mus/an_FR.mp3` (La Marseillaise) and `mus/an_DE.mp3` (Deutschlandlied), US Navy Band, public domain, via the Internet Archive (an_pack.py docstring is the credit).
- Maps: DE home on `fulda`, `rhine`; FR on `rhine`, `aegean` (EU stays listed until the Poland helper retires it).
- Loading-screen quotes for FR and DE.
- Sim change (01-data) → main→servers-live PR needed.

## Still open
1. Voices: no XTTS in the cloud run; FR/DE reuse EU's mixed fr/de/en clips (tough2 re-records needed, one language each).
2. Balance: tourney harness (`orch/tourney.mjs`) had two bugs (extra militia teams; hard-coded 18-faction table, still crashes at the summary). Fixed the first. Only 12 games played, no crashes with FR/DE; no win rates yet. Run the `balance/*` workflow.
3. Town looks (French village, German town), national unit models (Leclerc/Leopard use the shared EU tank model), real tank/ship/sub models.
4. Encyclopedia pictures share EU models; uniform variants (CCE/Flecktarn) not done; Poland helper retires EU.
