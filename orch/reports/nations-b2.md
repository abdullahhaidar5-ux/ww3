# nations-b2 — DZ Algeria, MA Morocco, NG Nigeria, ZA South Africa, ET Ethiopia, LY Libya, SD Sudan (2026-11-06, Sonnet 5.5, scheduled run)

**Status: first cut — all seven are playable (lobby, AI, Conquest) via `NEWNAT` in `src/01-data.js` (Egypt base, equal power per tier).**

## Shipped
- Own unit names per tier, 9 upgrades each, doctrine (small mods ~equal value), nation power, general-power flavour, uplink/economy/SAM/coast/transport names.
- LY and SD: stylised national armies only (neutral dark-grey/olive flag with a plain star, no factions/leaders/slogans).
- Morale: Home defenders for all seven (already set in `MORALE_STYLE`, unchanged).
- 11-models (NATX block): flags drawn in code, camo/uniform/building/hero palettes, vehicle model maps (MA Abrams, ZA kf51-class, others Eastern/shared), frigate hull.
- Militia/radio names, adjectives, home maps (nile: SD/ET; plateau: DZ/NG/ZA; rubalkhali: DZ/LY/MA).
- Checked headless: every unit/structure stat, 9 upgrades, flag and morale resolve for all seven; SMOKE PASS.
- Sim change (01-data) → main→servers-live PR needed.

## Still open
Voices/anthems (voices-new batch; English/Arabic stand-ins), dedicated town looks, grand-map detailed home provinces (nations stay grand-map nations via GM_NATS), a lane tourney (win rates 40–60%) and full cigate, screenshots in orch/shots/nations-b2/ not taken, encyclopedia pictures reuse shared models.
