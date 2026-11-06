# Grand map — Abdullah's extra picks, by stage

Abdullah picked these on 2026-11-05 19:38 after the stage helpers were already queued. **Each grand stage helper builds its section
below in addition to its own prompt** (follow `orch/SYSTEMS.md`: extend owners, no duplicates). Tick items off here when shipped.

## ALL stages — the map (Abdullah 19:41)
- The grand map is the **whole world with detail where it matters**, replacing "three theatres": detailed provinces around all
  18 nations' homes (Middle East & North Africa, Europe/Russia, East Asia, South Asia, North America & Caribbean), oceans as a few
  big sea lanes linking them (crossing takes turns; fleets/air lift needed). Every nation gets a fair home region (54 full nations by 2026-11-08 — add detailed home provinces for South America and
  Oceania too, for BR/VE and AU). **DW (Coffee Shias) = Yemen.** Iraq, Syria and Japan are being added as full nations
  (orch/reports/nations-new*.md) — give them home regions now (AI/minor until they ship). Every other country is a **playable minor
  nation** (pick it in the campaign setup; shared regional army, own flag/name/colours). Stage 5's 3D map
  covers this whole world map.

## ALL stages — signature assets are UNIQUE (Abdullah 21:02 "I don't like all countries having the same thing")
- No copies of another nation's special. **grand2 first writes `orch/SIGNATURES.md`**: one (or two) unique grand-map signature
  asset(s) per full nation, of different kinds (e.g. US carrier strike groups, RU strategic bombers, CN mass mobilisation, IL
  missile-defence umbrella, TR drone fleets, UK/FR special forces raids, IN/PK…, keep the Ayatollah = IR/RS/DW, Dear Leader = KP,
  Mountain Fortress = RS, Bunker Buster = US/IL/RU/CN), with a one-line effect and a rough value so overall strength stays even
  (proved later by the balance tourneys / grandtest). Economy/building-type signatures → grand2 builds; military/strike-type →
  grand3; leader/political-type → grand6. New-nation helpers add their nation's row.

## Stage 1 (grand1 — map, provinces, armies, turns, battles)
- [ ] **Chokepoint straits** on the map (Hormuz, Suez/Red Sea, Bosporus, Gibraltar-style, Korea Strait…, stylised): sea-zone/province
      pairs flagged as chokepoints (stage 2 gives them their economic effect).
- [ ] **Oil fields as prizes:** a few giant oil regions, placed so no nation starts with an unfair share; marked on the map.
- [ ] **Mountains & rivers matter:** crossing a major river or mountain pass costs extra movement/attrition; defenders there get a
      bonus in auto-resolve and the "Fight it" battle uses a matching map (river crossing / mountain pass).
- [ ] **Capital & war-goal provinces:** each nation has 2–3 must-hold provinces (capital + 1–2 others, equal value across nations);
      losing them forces peace talks (stage 4 diplomacy handles the talks; stage 1 just flags and reports it).
- [ ] **Quick campaigns:** campaign length option — Quick (20–30 turns, smaller start, faster economy, win by score/war goals at the
      end) or Standard.

## Stage 2 (grand2 — empire economy)
- [ ] **Mountain Fortress** (Abdullah 20:58, moved out of battles): a province building for mountain provinces (RS only — no copies for other nations); it appears pre-built for the defender in that province's Fight-it battle.
- [ ] Chokepoints have real effects: whoever holds a strait can close it — world trade income and the oil price shift for everyone.
- [ ] Oil-prize regions feed the oil market/fuel economy.

## Stage 3 (grand3 — military)
- [ ] **Bunker Buster** (Abdullah 20:58, moved out of battles): a grand-map strike on a province — wrecks fortified buildings
      (Mountain Fortress, bunkers, air defence, bases) there; air defence can intercept; only US, IL, RU, CN have it (Abdullah 21:02); others counter fortresses with their own signature assets.
- [ ] **Encirclement & sieges:** armies/provinces cut off from supply (by provinces, sea control, chokepoints) lose strength each
      turn and may surrender; besieged cities hold out on stockpiles (province buildings/rationing), and a siege battle can be
      fought live.

## Stage 4 (grand4 — world & empire)
- [ ] **Heritage & holy sites:** special provinces (shrines, ancient cities — every region gets some, equal value, respectful,
      no real-world claims) give loyalty/prestige to whoever protects them; damaging them costs heavily (world opinion, unrest,
      war weariness). Ties into national missions (e.g. protecting holy sites for the Shia factions).
- [ ] Peace talks when war-goal provinces fall (from stage 1).
- [ ] **European Union alliance** (Abdullah 2026-11-05 19:54): the EU is no longer a nation; it's a joinable alliance for European
      nations (members get a joint-operations bonus: shared vision/supply, cheaper allied aid), with membership rules in diplomacy.

## Stage 6 (grand6 — hidden war, home front)
- [ ] **Ayatollah & Dear Leader** (Abdullah 20:58, moved out of battles): national leader figures on the grand map (IR/RS/DW
      clerical leader, KP Dear Leader; fictional, no real-person likeness; ONLY these four nations have a leader figure — others get different signature assets): boost
      national morale/loyalty, can tour a province (Fight-it battles there start with fervour), danger if the capital falls.
- [ ] **Occupation choices:** for each conquered province: annex (full tax, high unrest/insurgency), set up a friendly government
      (puppet: less tax, low unrest, may defect) or liberate (no tax, big world-opinion/loyalty gain); uses **Locals** for resistance.
- [ ] **Factions at home:** military, business and clergy interest groups with demands and satisfaction; happy factions give
      bonuses, angry ones feed war weariness and coups; equal-value for all nations.
- [ ] **National morale** (Abdullah 20:01; part of war weariness): raised/lowered by victories & defeats, casualties & war length,
      losing home or holy places (capital, war-goal provinces, heritage/holy sites), short boosts on national & religious days
      (Ashura, national days — equal value for every nation); on collapse: that nation's troops start Fight-it battles shaken
      (high fear), forced peace talks (negotiate or face unrest), coups & civil war. Uses the battle morale styles (SYSTEMS.md).
- [ ] **Reconstruction:** rebuild war-torn provinces (destroyed buildings, wrecked towns from battles) for loyalty, tax and world
      opinion.

## Integration 2
- [ ] **Advisor tips:** optional chief-of-staff hints on the grand map ("province 12 will revolt", "your east is undefended",
      "this strait closing will hurt your oil income"), toggle in Settings.
