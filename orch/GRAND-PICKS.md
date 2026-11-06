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
  Mountain Fortress = IR, RS, AF, KD, DW, KP, Bunker Buster = US/IL/RU/CN), with a one-line effect and a rough value so overall strength stays even
  (proved later by the balance tourneys / grandtest). Economy/building-type signatures → grand2 builds; military/strike-type →
  grand3; leader/political-type → grand6. New-nation helpers add their nation's row.

## Stage 1 (grand1 — map, provinces, armies, turns, battles)
- [ ] **Menu names** (Abdullah 2026-11-06): main menu = Grand campaign · Conquest · Missions · Tutorial. Rename the old story
      "Campaign" to "Missions" everywhere players see it (menu, buttons, encyclopedia, What's new); keep its saves/progress working.
- [ ] **Battles start with your grand-map units** (Abdullah 2026-11-05 21:22, see CLAUDE.md "Grand strategy layer"): a Fight-it
      battle spawns exactly the armies' real units (types, counts, health, veterancy, ammo/fuel, general as hero unit) — no free
      Conquest base/money; defender adds the province's garrison, buildings, forts (Mountain Fortress pre-built); neighbouring
      armies join as timed reinforcement waves; NO new production inside the battle at all (Abdullah 2026-11-06: "Army only"); results (survivors, damage, veterancy, captured gear) go back exactly. Same rule
      for auto-resolve strength. Test: an army of N units → battle has N units of those types; losses match after. Later stages
      (grand3 generals/sieges/supply limits, integrate2 bridge audit) keep this rule.
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
- [ ] **Province autonomy** (Abdullah 21:20, EU4): raise/lower autonomy per province — high autonomy = less tax & manpower
      but much calmer (good for restless conquests); lowering it takes time and raises unrest.
- [ ] **Trade routes & merchants** (Abdullah 21:16, EU4-style): money flows between regions along trade routes (through
      straits/chokepoints); send merchants to steer the flow toward your provinces; blockades and embargoes cut it.
- [ ] **City upgrade chains** (Total War-style): cities grow through tiers and you choose what each becomes (industrial,
      military, port, holy city…) — ties into province buildings; the battle map reflects the city's tier/type.
- [ ] **Mountain Fortress** (Abdullah 20:58, moved out of battles): a province building for mountain provinces (only IR, RS, AF, KD, DW, KP — Abdullah 21:03); it appears pre-built for the defender in that province's Fight-it battle.
- [ ] Chokepoints have real effects: whoever holds a strait can close it — world trade income and the oil price shift for everyone.
- [ ] Oil-prize regions feed the oil market/fuel economy.

## Stage 3 (grand3 — military)
- [ ] **Fort zones of control** (Abdullah 21:20, EU4): forts and Mountain Fortresses stop enemy armies moving past them into
      the provinces behind until the fort is taken or besieged.
- [ ] **Supply limits**: each province can feed only so many troops (by terrain, development, season, roads); bigger stacks
      take attrition unless supplied by depots/convoys/rail — keeps doom-stacks in check.
- [ ] **Regiment histories** (Abdullah 21:16): armies keep names, battle honours and traditions that give small bonuses as
      they survive campaigns (shown on the army card; carried into Fight-it battles as veterancy flavour).
- [ ] **Bunker Buster** (Abdullah 20:58, moved out of battles): a grand-map strike on a province — wrecks fortified buildings
      (Mountain Fortress, bunkers, air defence, bases) there; air defence can intercept; only US, IL, RU, CN have it (Abdullah 21:02); others counter fortresses with their own signature assets.
- [ ] **Encirclement & sieges:** armies/provinces cut off from supply (by provinces, sea control, chokepoints) lose strength each
      turn and may surrender; besieged cities hold out on stockpiles (province buildings/rationing), and a siege battle can be
      fought live.

## Stage 4 (grand4 — world & empire)
- [ ] **Peace deals with warscore** (Abdullah 21:16, EU4): battles won, war goals taken and occupation build warscore; in peace
      talks spend it on provinces, reparations, making the loser a client state, etc.; the AI accepts/declines by warscore.
- [ ] **Justify wars first**: fabricate a claim / casus belli before declaring (takes turns, can be exposed by spies); war
      without one costs world opinion and home morale.
- [ ] **Coalitions**: expanding too fast (aggressive-expansion score) makes nearby nations form a defensive coalition against you.
- [ ] **Truce timers**: after a peace deal the same two nations can't attack each other for N turns (breaking it = huge penalties).
- [ ] **Client states**: defeated nations can become vassals that pay tribute and send troops; low loyalty → they break away.
- [ ] **National laws**: conscription level, war economy, press freedom, trade policy… each with clear costs/benefits.
- [ ] **Idea groups**: unlock groups of national perks over time (offensive, defensive, naval, espionage, economy) — distinct
      from the research tree and doctrines (per SYSTEMS.md: no duplicate perks).
- [ ] **Heritage & holy sites:** special provinces (shrines, ancient cities — every region gets some, equal value, respectful,
      no real-world claims) give loyalty/prestige to whoever protects them; damaging them costs heavily (world opinion, unrest,
      war weariness). Ties into national missions (e.g. protecting holy sites for the Shia factions).
- [ ] Peace talks when war-goal provinces fall (from stage 1).
- [ ] **European Union alliance** (Abdullah 2026-11-05 19:54): the EU is no longer a nation; it's a joinable alliance for European
      nations (members get a joint-operations bonus: shared vision/supply, cheaper allied aid), with membership rules in diplomacy.

## Stage 4b (grand4b — diplomacy & government, Abdullah 21:20; also finishes anything left unticked in Stage 4)
- [ ] **Call to arms & favours**: allies get called into your wars; helping them earns favours you spend to make them join.
- [ ] **Trust & reputation**: keeping deals builds trust; breaking truces/betraying allies wrecks it — nobody signs with you.
- [ ] **Great power ranking**: the top 8 nations by score are Great Powers (extra diplomatic weight, rivalries, can intervene).
- [ ] **Annex client states**: loyal client states can be peacefully absorbed after enough turns.
- [ ] **Government reforms**: a reform tree per government type (republic, monarchy, theocracy, party state…), nation flavour,
      equal total value; ties into national laws and regime legitimacy.
- [ ] **Prestige**: victories and great deeds raise it (better diplomacy & morale); humiliation lowers it.
- [ ] **Hegemonies**: military / economic / naval hegemon bonuses while you hold the top spot.

## Stage 6 (grand6 — hidden war, home front)
- [ ] **Cultures & acceptance** (Abdullah 21:20): provinces whose culture isn't accepted are less loyal until you accept it
      (costs points/time; limited slots); neutral, respectful framing.
- [ ] **Regime legitimacy**: a legitimacy bar for your government; low legitimacy feeds unrest, factions and coups.
- [ ] **Overextension** (Abdullah 21:16): conquering too much at once raises unrest and admin strain until provinces are
      integrated (turns + garrison/civics); ties into occupation choices and coalitions.
- [ ] **Politics at home**: fictional parties / factions and elections or regime-stability checks shift policies and laws over
      time (no real parties or politicians; neutral); ties into factions at home, war weariness and coups.
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

## Stage 5 addition
- [ ] **Map modes** (Abdullah 21:20): political, terrain, trade, supply, unrest, culture, alliances, development (one switcher).

## Integration 2
- [ ] **Ledger** (Abdullah 21:20): statistics screen comparing all nations (army size, income, provinces, war history, graphs
      over time).
- [ ] **Outliner**: side list of all your armies, fleets, sieges and build queues for quick control.
- [ ] **Pause on events**: settings for which events pause the game / pop up (war declared, revolt, province lost…).
- [ ] **Advisor tips:** optional chief-of-staff hints on the grand map ("province 12 will revolt", "your east is undefended",
      "this strait closing will hurt your oil income"), toggle in Settings.
