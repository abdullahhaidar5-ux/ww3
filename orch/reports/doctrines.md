# General Doctrines (2026-11-04)

Each player picks a doctrine in the first 2 minutes (free, big touch card at battle start, Powers tab, or Doctrine row in the skirmish setup). Four perks per doctrine, 1 general-rank point each; locked once a perk is bought. Layered on top of national doctrines (`DOCT`), Radwan Training, martyr/mourning, Mountain Fortress — none touched.

- **Armour**: vehicles build 25% faster, take 15% less damage, tank-hunter ambush (+25% when still/in cover), tanks +12% rate/+10% range, vehicles +8% damage.
- **Guerrilla**: infantry 15% cheaper, hidden ambush (+25%), idle infantry lay hidden mines, infantry +10% speed / -5% damage taken.
- **Air**: airfields 30% cheaper, recon flight every 75 s (reveals an enemy area 10 s), aircraft +15% damage/+10% hp, aircraft 15% cheaper and faster.
- **Artillery**: counter-battery radar (spots firing enemy guns), shells 25% wider, 12% faster reload / 8% range, guns 15% cheaper.

Code: `GDOC` in 01-data; `gdPick/gdBuy/gdRecon/aiPerk` + hooks (upgAgg, dmgOut, enqueue/placeBld cost, mines, cbr) in 03-sim; commands `doc`, `dbuy`; state `T.gdoc/T.gperk` (checkpoints copy all team keys; snapshot panel `dc/dp`, teamGlobals `gd`). No RNG used. AI picks by personality (Tank Rush→Armour, Guerrilla→Guerrilla, Artillery Turtle→Artillery, Air Power→Air; Balanced→its nation default `GDOC_AI`) and buys perks with spare points; no money bonuses.
UI: pick card + Powers tab; ally box and end scoreboard show the doctrine. Lobby: own pick only (`setup.gdoc`, sent at battle start); other players' doctrines appear in-game, not in the lobby list.

Balance (`node orch/aitourney.mjs --doctrines`, 153 games, 18 nations, Normal): first pass Arm 40 / Gue 58 / Air 49 / Art 53 → buffed Armour, trimmed Guerrilla → Arm 44 / Gue 53 / Air 55 / Art 48.
Simulation changed → needs the main→servers-live PR.
