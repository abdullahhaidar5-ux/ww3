# nations-a1 — PL, AZ, JO, KD, IT, GR, ES + EU retired (2026-11-06, Sonnet 5.5, scheduled run)

**First cut: sim-complete playable nations. Voices, anthems, dedicated town looks, own maps and the full balance tourney are NOT done.**
Same `NEWNAT` mechanism as nation-anglo (Egypt base row, equal power per tier; `src/01-data.js` block "nations-a1").

## Shipped
- Poland (K2PL, Krab, GROM, Apache, F-35 Husarz, Miecznik), Azerbaijan (T-90S, Polonez, Mi-35M, Su-25, Caspian boats), Jordan (Al-Hussein, Cobra, F-16AM, Special Forces),
  Kurdistan Region (regional Peshmerga only: light infantry, T-72, mortars, Milan ATGM teams, Mi-17 — no other Kurdish groups' names/flags),
  Italy (Ariete, Alpini/Folgore, A129, Typhoon, FREMM, Todaro), Greece (Leopard 2A6HEL, Apache, F-16, Hydra, Type 214), Spain (Legion, Leopard 2E, Tigre, Typhoon, F-100, S-80).
- Each: 9 upgrades, doctrine, nation power, general powers, strike/economy/SAM/coastal/sub/transport names, flag drawn in code, camo/uniform/air paint on shared models, achievements, adjective.
- Morale styles untouched (already in `MORALE_STYLE`): PL/IT/GR/ES Professional, JO/KD/AZ Home defenders.
- Home turf added on existing maps (no new maps): PL fulda+rhine, AZ caspian, JO plateau+gulf, KD zagros+mesopotamia, GR+IT aegean, ES caribbean.
- Kit atlas: flag cells beyond 32 now use spare rows (`kfCell/krCell`, `KROWS` 24) so 54 nations fit (B1 lane can just push onto `KFAC`).
- **EU retired**: `FKEYS` excludes EU (lobby, menus, AI pool, encyclopedia, unit guide); EU removed from map home lists; missions that used EU as the enemy now use DE.
  `FACTIONS.EU` stays only as the hidden base row FR/DE are built from; old saves/replays naming EU still load (they play as the old EU row, no crash).
- Sim change → **main → servers-live PR needed.**

## Still open
Voices/anthems (voices-new batch; closest existing sets stand in), dedicated models (shared Western/Eastern models used), town looks, fair AI-checked maps of their own,
tourney (40–60%), grand-map detailed home provinces, full removal of the hidden EU row once FR/DE get their own tables.
