# nations-b1 — TW, PH, VN, ID, TH, KZ, AF, OM (2026-11-06, Sonnet 5.5, scheduled run)

**Status: first cut. All eight are playable (lobby, AI Normal/Hard, Conquest). Voices, anthems, town looks, dedicated models, grand provinces are open.**

## Shipped
- Eight `NEWNAT` rows in `src/01-data.js` (base Egypt row, so power per tier equals the others): own unit names per tier, 9 upgrades, doctrine, nation power, general powers, uplink/economy/sub/missile-defence/coastal/transport names. Morale style Home defenders (already in the MORALE_STYLE table).
- `src/11-models.js`: flags drawn in code (TW, PH, VN, ID, TH, KZ, OM; AF = neutral stylised army emblem, no real flag), camo/palettes, vehicle/heli/jet/ship model picks (VN/KZ/AF Eastern, rest Western), building trim, kit atlas rows (KROWS 14 → 15 so 33 nations fit).
- Home maps (existing maps only): TW taiwan; PH, ID caribbean; VN, TH delta; KZ caspian, volga; AF khyber, zagros; OM gulf, hormuz. Militia/radio names, adjectives, achievements.
- AF is a stylised national army: no real factions/governments/leaders, no real flag or slogans.
- Sim change (01-data) → **main → servers-live PR needed.**

## Tests
Smoke PASS. AI-vs-AI (`aitourney.mjs`, 52 games, fulda, 6-min cap, vs US/RU/EG): no errors; 45–56% for every new nation (mostly draws at the cap). Screenshots: `orch/shots/nations-b1/`.

## Still open
Voices (stand-in sets), anthems, town looks, dedicated models (Kang Ding, VT-4, Leopard 2RI...), grand-map detailed provinces (GRAND-PICKS), a longer balance run, AF/TW/PH region maps.
