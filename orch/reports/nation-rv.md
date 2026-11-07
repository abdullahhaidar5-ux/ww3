# nation-rv — RV "River Shias" (2026-11-07, Sonnet 5.5, scheduled run)
Abdullah 2026-11-06 21:24: "Somehow incorporate the Iraqi PMF as a faction" → name **River Shias**, **own nation in south Iraq**. Fictional faction inspired by Iraqi Shia volunteer brigades; no real organisation/group name, flag, emblem or leader.
First cut via NEWNAT (Egypt base, equal power per tier), Zealous (never rout).
- `01-data.js`: RV NEWNAT row (Volunteer Brigade Squad, Kornet, Shrine Guard Commandos, T-72, Grad, Mi-35, Su-25, Marsh Boat…), RV added to Zealous list.
- `11-models.js` `drawRV` (black cloth, green print, shrine dome + minarets over twin wavy rivers, ring + laurels, شيعة الرافدين / لبيك يا حسين) + flag/emblem hooks; `11z-nations-rv.js` looks/names/home maps/voice stand-ins (IQ lines, Labbaik ya Hussein cries).
- Grand map: Basra → RV, new provinces Najaf (capital) and Southern Marshes (inserted at 236; sea ids shifted +2, `GM_LAND` 238; old grand saves are rejected by the map signature). Axis of Resistance bloc, IQ–RV opinion −15 (tense, no war). GR_REAL row RV:[.15,.35,110]; IQ trimmed to [.4,.45].
- Signature "Call to the Shrines" (13-grand.js `grMovePhase`, `GR_HOLY`): enemy arrives in Najaf → free 3000-value volunteer levy (once per 6 turns).
- Open: own voices/anthem (IQ lines stand in; no vo/RV sheets), dedicated 3D models, Karbala as its own province, balance tourney, Ayatollah tour effect (data-only until grand6), servers-live PR.
