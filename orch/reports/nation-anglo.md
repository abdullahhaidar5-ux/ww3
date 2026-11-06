# nation-anglo — United Kingdom (GB), Australia (AU), Canada (CA) (2026-11-06, Sonnet 5.5, scheduled run)

**Status: first cut — sim-complete playable nations; voices, anthems, dedicated town looks and the full balance run are NOT done (see "Still open").**
Built on the nations-new1 `NEWNAT` mechanism (merged from `orch/nations-new1`, which was not yet on main): each nation clones Egypt's complete
per-nation table row (equal strength per tier) and overrides names/flavour. One system, three more rows in `NEWNAT` (`src/01-data.js`).

## Shipped
- Own unit names per tier: GB (Challenger 3, Rifle Section, Javelin Team, SAS, Sky Sabre, AS-90, Apache, Typhoon, Type 45, Astute), AU (Abrams SEPv3, Digger Section,
  SASR, NASAMS, M777, Apache, F-35A, Hobart, Collins), CA (Leopard 2A6M, Infantry Section, Carl Gustaf, JTF2, M777, CH-146 Griffon, CF-18, Halifax, Victoria).
- 9 upgrades each (`gb1..9`, `au1..9`, `ca1..9`), doctrine, nation power, general-power flavour, strike/economy buildings, missile-defence, coastal, transport, sub names.
- Looks (`src/11-models.js`): flags drawn in code (Union Jack, Australian flag with Commonwealth star + Southern Cross, Canadian maple leaf), camouflage/uniform palettes (MTP, AMCU, CADPAT-style),
  building trim, air-force paint, hero tint, Western vehicles (Abrams/Leopard-class tank, Apache, Typhoon, F/A-18, frigate hull).
- English voice phrase sets with British / Australian / Canadian idiom + war cries (`PHR_FAC`, `FCRY`), spoken by the browser's en-GB / en-AU / en-CA voice.
- Home turf: GB on `fulda`, `rhine`, `aegean`; CA on `heartland`, `volga`; AU on `heartland`, `caribbean`. Militia + radio-station names, adjectives, achievements.
- Sim change (new factions in `src/01-data.js`) → **main → servers-live PR needed for Cloudflare battles.**

## Balance
Small AI-vs-AI tourney (`orch/aitourney.mjs`, 11-nation field, 12-min cap, 10 games per new nation): GB 45%, AU 40%, CA 80% → CA's inf discount reduced (10%/3% → 6%); re-run 35% (n=10, noisy). Settled at 6%. A full round-robin with all nations is still needed.

## Still open
1. **Voices**: XTTS-v2 (en accents, fr for Canada) not available in the scheduled cloud run → no recorded tough2 lines. 2. **Anthems** (God Save the King, Advance Australia Fair, O Canada): no verified public-domain recording found/added; `AN_FAC` untouched.
3. **Town looks**: British/Canadian/Australian small-town styles in `04c-townlook.js` and regional town-name pools not done (shared looks used).
4. **Dedicated models**: no Challenger/Warrior/Boxer/Hobart/Collins/Halifax models; shared Western models used. Encyclopedia pictures use shared models.
5. **Maps**: AU has no outback/coast map of its own (shares heartland/caribbean); needs a fair AI-checked map.
6. **Grand map**: GB/AU/CA exist as grand-map nations (GM_NATS) but detailed home provinces not added — see GRAND-PICKS "Home regions (nation-anglo)". French lines for Canada not done.
