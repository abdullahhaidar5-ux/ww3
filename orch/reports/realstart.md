# Realistic start (lane B1) — GR_REAL in `src/13i-grandrealstart.js`

One data table; `grNew` reads it (cash, army value, fuel), then `grRealApply` seeds wars, fronts, bases, alliances (`GC.alz`) and opinions (`GC.rel`, read with `grOpinion(a,b)`, `grAllied(a,b)`). Deterministic, no RNG. The old "ring of majors at war" is off.

**Method:** figures are rounded from 2025-26 public data (SIPRI 2025 military spending, IMF/World Bank GDP, EIA oil output, IISS troops) and squeezed (about a square root) so small powers are weak but playable. Cash = 2200 × econ; army value = 42000 × mil; fuel = oil stock (120 normal). Examples: US 6 / 3.0 / 230, China 4.5 / 2.4 / 110, Russia 1.6 / 1.9 / 260 (wartime), India 2.5 / 1.5, Turkey 1.0 / 1.1, Israel .9 / 1.0, Iran .6 / 1.0, Ukraine .4 / 1.4 (wartime), Jordan .2 / .3, RS Mountain Shias .15 / .3, DW Yemen .1 / .35. Full table: `GR_REAL.n`. Power class label per nation: `grRealClass(code)` (Superpower / Great / Regional / Small) — not shown in the nation picker yet.

**Nov 2026 checks (web search, titles only):** Russia–Ukraine war continues in its fifth year, no lasting ceasefire → opening war RU|UA. Syria: new government, Russian bases being renegotiated with Damascus (Oct 2026) → RU keeps a small base in SY; SY–IL not at war. Opening wars: RU|UA and IL|RS only; everyone else starts at peace with tensions (KP|KR, CN|TW, IN|PK, GR|TR, IL|IR, IL|DW, AZ|IR, IN|CN, SA|DW) where each side posts a Border Guard army.

**Alliances:** NATO (incl. SE, FI, TR), US partners, Russia bloc (BY/KZ/KP), Axis of Resistance (IR/RS/DW), China–Pakistan, Turkey–Azerbaijan, Saudi–Pakistan, Gulf, Russia–Iran. AI never attacks an ally or a nation it likes (opinion ≥ 40) and AI war chance dropped .30 → .15.

**Bases:** US in QA/KW/AE/JO/KR/JP/DE/PL/IT, RU in SY, TR in SY/IQ, GB OM, FR AE, CN PK, IL SY. Base armies are supplied inside the host. Allied territory supplies allied armies.
**Fleets:** table `GR_REAL.fl` waits for grand3 fleets.

**Still open (B1 follow-ups):** numbers are my rounded estimates, not a line-by-line source audit; opening-map screenshot; power class in the nation picker; food/manpower from real figures; GDP-driven income (only starting cash uses it); diplomacy screen reads `grOpinion` (B6). grandtest relaxed: eco snowball limit 3× → 6× (gaps are now intended); scenario waits up to 3 turns for contact.
