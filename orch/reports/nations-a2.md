# nations-a2 — Brazil (BR), Venezuela (VE), Mexico (MX), Argentina (AR), Colombia (CO), Chile (CL), Sweden (SE) (2026-11-06, Sonnet 5.5, scheduled run)

**Status: first cut — all seven are playable (lobby, AI Normal/Hard, Conquest). Voices, anthems, dedicated town looks and grand provinces are open.**

## Shipped
- Seven `NEWNAT` rows in `src/01-data.js` (base Egypt = equal power per tier): own unit names per tier, 9 upgrades each, doctrine, nation power, general-power flavour, uplink/economy/sub/SAM/coast/transport names. Small equal-value flavour mods only (infantry cost, vehicle hp, building hp, 2% cost).
- `src/11z-nations-a2.js` (new, appended-only so parallel lanes don't conflict): flags drawn in code, camo/uniform/paint/air-scheme/hero tint, shared Western (BR MX AR CO CL SE) or Soviet-style (VE) vehicle models, kit-atlas flag cells, militia/radio names, adjectives, home maps.
- Morale styles unchanged from `orch/SYSTEMS.md`: Professional (CL, SE); Home defenders (BR, VE, MX, AR, CO).
- Sim change (`src/01-data.js`) → main → servers-live PR needed for Cloudflare battles.

## Balance (small AI-vs-AI tourney, 12-min cap, 11 games each, Normal): CO 68%, BR 59%, MX 59%, VE 55%, SE 55%, AR 41%, CL 36% (control field US 57, EG 50, RU/CN/TR 36). Colombia's infantry discount was cut (6%+fast → 4%). Noisy at n=11; the final balance pass tunes all.

## Still open
1. Voices (stand-in: default English/Spanish device voice) and anthems. 2. Town looks (Brazilian/Mexican/Swedish towns) and regional town-name pools. 3. Dedicated models (Gripen, Leopard 1, Visby, Strv 122 use shared models). 4. Grand-map home provinces (they are GM_NATS but not detailed). 5. Kit atlas: flags use cells 0..KFAC.length-1; digits start at cell 48, so more than 48 nations in KFAC will collide.
6. Screenshots not captured in this run (headless runs were too slow in the cloud box).
