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

## ALL stages — REALISTIC START (Abdullah 2026-11-06 17:49 "starting economic strength, military strength, and placement of armies is realistic"; picks 17:53: "Realistic and factor in real world alliances" + "Real hot spots + bases")
Helper `realstart` builds it; later stages keep it true. Today (before): cash 2200 major / 900 minor, army value 1 / 0.5, same fuel/food for all, armies only at capital + 1 war-goal province, opening wars = a "ring" of majors per region.
- **Real gaps, not shrunk:** each nation's start comes from real 2025-26 figures (look them up, cite sources in the report): GDP → cash and income; defence budget + active troops + equipment → army value and unit mix (more jets/ships/armour where real); oil/gas output → fuel stock and oil income; food self-sufficiency → food; population → manpower cap. US ≫ Jordan is fine. Non-state/small sides (RS Mountain Shias, DW Yemen, KD) use realistic sizes for what they are (militia-heavy: lots of infantry, ATGMs, rockets, drones, tunnels/forts, little armour/air).
- **Real alliances at the start** (look up the current state, Nov 2026): NATO (incl. Sweden; Turkey is a member), US treaty/major partners (JP, KR, AU, PH, IL, Gulf states, JO, EG, MA, TW informal…), the Resistance bloc (IR + RS + DW and the Iraqi militias' leanings — check what Syria really is now), Russia's ties (CSTO/KZ, KP 2024 treaty), China–Pakistan, Turkey–Azerbaijan, India non-aligned, etc. Use grand4b's diplomacy system if it exists (alliances, defensive pacts, guarantees); if not yet, put them in ONE data table (`GR_REAL.al`) that grand4/4b will read — never a second diplomacy system. Allies start with shared vision/military access where real.
- **Starting relations:** also seed real starting opinions (−100…+100) and rivalries between nation pairs in `GR_REAL` (e.g. close allies +75, historic rivals −100) — grand4b's Diplomacy screen (EU4-style, Stage 4b) shows and uses them.
- **Opening wars = real conflicts as they stand in Nov 2026** (look them up), not the ring. Everyone else starts at peace with real tensions (claims/war goals) so wars can break out.
- **Real placement:** armies on the real hot fronts (Russia–Ukraine line, Korean DMZ, Kashmir LoC, Israel–Lebanon border, Yemen fronts, Taiwan Strait, Greece–Turkey etc.), garrisons in big cities/bases, real overseas bases with realistic sizes (US: Gulf/Qatar/Bahrain/Kuwait, Korea, Japan/Okinawa, Germany, Poland, Italy, Djibouti, Diego Garcia; Russia: Syria if still there, else none; Turkey: N. Iraq/N. Syria/N. Cyprus; France: Djibouti/UAE/Africa; UK: Cyprus/Gulf; China: Djibouti…), and fleets in real sea zones (US carrier groups, Russian Black Sea/Pacific, Chinese PLAN, etc.) if grand3's fleets exist; if not, the fleet table waits in `GR_REAL` for grand3.
- **Still a game:** the tactical rule "all nations equally strong" stays for unit-vs-unit balance in battles; the grand map is deliberately unequal. Small nations' fun comes from alliances, terrain, Mountain Fortress/home-defender morale and asymmetric tools — tell the player at nation pick ("Superpower / Great power / Regional power / Small power", difficulty shown).
- **Proof:** a table in `orch/reports/realstart.md` (nation, real figure, game value), screenshots of the opening map (fronts + bases), and `orch/grandtest.mjs` passes; AI empires survive 10 quick turns without instant collapse of every small nation.

## ALL stages — air & supply in campaign battles (Abdullah 2026-11-06 08:08; battles have no base, army only)
- [~] **Jets = sorties from airfields** (grand3 builds; grand2 provides the stocks — `geSortieStock(c,pi)` is ready): jets live in air wings at grand-map airfields
      (and carriers in fleets); if an airfield/carrier is within range of the battle province, that side gets on-call sorties in
      the battle — jets fly in from the map edge, strike/patrol, then leave; sorties per battle limited by the wing's fuel/munitions
      stock; jets shot down are lost on the map too. Defender with an airfield in the province gets it in the battle (jets rearm
      there). **Helicopters and drones travel with the army** as normal units and rearm at the army's supply trucks.
- [~] **Supply = entry edge + trucks** (grand2 built the stock side: armies carry ammo/fuel from hub/own/adjacent supply, battle starts with exactly that, leftover fuel/ammo returns; the entry-edge trucks/convoys in the battle are still open for grand3/integrate2; extending the battle's existing logistics/convoy system in
      `src/03c-logistics.js` — no second system): each army starts with its grand-map ammo/fuel (cut-off armies start low); the
      map edge it entered from is its supply point; supply trucks/convoys run from there along roads; cutting the road starves
      units (no ammo = can't fire, no fuel = vehicles stop); captured towns/depots become forward supply; the defender is supplied
      from the province's own towns and depots. Leftover ammo/fuel goes back to the army on the map.

## Mirror stage (grandmirror — battles mirror the grand map, Abdullah 2026-11-06 08:09 "full mirror"; runs after grand5)
- [x] **Battle map generated from the province**: each province's Fight-it battle map is generated deterministically (seed =
      province id) from its grand-map data: terrain/biome, relief, coast/sea side, rivers (with bridges/fords), forests, roads,
      and **town positions**; the side each army entered from = its map edge. Hand-made real-place maps (Golan, Beqaa, DMZ…) are
      used for their provinces when they exist. Every generated map passes the map-fairness rules as far as geography allows
      (the defender's terrain advantage is intended; check both sides have ≥2 real routes).
- [x] **Towns mirror exactly, both ways**: same town names, size tier/upgrade chain type, owner, loyalty/unrest/tax, province
      buildings (airfield, AA, fort, Mountain Fortress, factories, ports) and current damage appear in the battle (town-look
      generator in the right regional style); after the battle, captured towns, loyalty changes, destroyed/damaged buildings and
      rubble go back to the province (reconstruction on the map repairs them).
- [x] Fast: map generation < 2 s on a mid PC, cached per province until it changes; deterministic for multiplayer.

## Stage 1 (grand1 — map, provinces, armies, turns, battles)
- [x] **Menu names** (Abdullah 2026-11-06): main menu = Grand campaign · Conquest · Missions · Tutorial. Rename the old story
      "Campaign" to "Missions" everywhere players see it (menu, buttons, encyclopedia, What's new); keep its saves/progress working.
- [x] **Battles start with your grand-map units** (Abdullah 2026-11-05 21:22, see CLAUDE.md "Grand strategy layer"): a Fight-it
      battle spawns exactly the armies' real units (types, counts, health, veterancy, ammo/fuel, general as hero unit) — no free
      Conquest base/money; defender adds the province's garrison, buildings, forts (Mountain Fortress pre-built); neighbouring
      armies join as timed reinforcement waves; NO new production inside the battle at all (Abdullah 2026-11-06: "Army only"); results (survivors, damage, veterancy, captured gear) go back exactly. Same rule
      for auto-resolve strength. Test: an army of N units → battle has N units of those types; losses match after. Later stages
      (grand3 generals/sieges/supply limits, integrate2 bridge audit) keep this rule.
- [x] **Chokepoint straits** on the map (Hormuz, Suez/Red Sea, Bosporus, Gibraltar-style, Korea Strait…, stylised): sea-zone/province
      pairs flagged as chokepoints (stage 2 gives them their economic effect).
- [x] **Oil fields as prizes:** a few giant oil regions, placed so no nation starts with an unfair share; marked on the map.
- [x] **Mountains & rivers matter:** crossing a major river or mountain pass costs extra movement/attrition; defenders there get a
      bonus in auto-resolve and the "Fight it" battle uses a matching map (river crossing / mountain pass).
- [x] **Capital & war-goal provinces:** each nation has 2–3 must-hold provinces (capital + 1–2 others, equal value across nations);
      losing them forces peace talks (stage 4 diplomacy handles the talks; stage 1 just flags and reports it).
- [x] **Quick campaigns:** campaign length option — Quick (20–30 turns, smaller start, faster economy, win by score/war goals at the
      end) or Standard.

## Stage 2 (grand2 — empire economy)
- [x] **Province autonomy** (Abdullah 21:20, EU4): raise/lower autonomy per province — high autonomy = less tax & manpower
      but much calmer (good for restless conquests); lowering it takes time and raises unrest.
- [x] **Trade routes & merchants** (Abdullah 21:16, EU4-style): money flows between regions along trade routes (through
      straits/chokepoints); send merchants to steer the flow toward your provinces; blockades and embargoes cut it.
- [x] **City upgrade chains** (Total War-style): cities grow through tiers and you choose what each becomes (industrial,
      military, port, holy city…) — ties into province buildings; the battle map reflects the city's tier/type.
- [x] **Mountain Fortress** (Abdullah 20:58, moved out of battles): a province building for mountain provinces (only IR, RS, AF, KD, DW, KP — Abdullah 21:03); it appears pre-built for the defender in that province's Fight-it battle.
- [x] Chokepoints have real effects: whoever holds a strait can close it — world trade income and the oil price shift for everyone.
- [x] Oil-prize regions feed the oil market/fuel economy.

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
- [ ] **DIPLOMACY SCREEN** (Abdullah 2026-11-06 17:53, showed EU4's Diplomacy panel: "We need something like this") — the layout
      idea, our own modern-war art (no copied EU4 art/icons; the ART LOOP polishes the look after). One panel, opened from a top-bar
      "Diplomacy" tab or by clicking any nation's flag/province owner:
      · **Header**: big national flag, nation name + government type, leader as a title + fictional name (no real leaders — never
        the real Mountain Shias leaders), power tier (Superpower / Great power / Regional power / Small power), key stats with icons
        (cash & income, manpower, army strength, war support, prestige, stability, trust).
      · **Rows of flag icons**: Enemies (at war) · Rivals · Allies · Client states · Guaranteed by/for · Trade partners · Military
        access — each flag clickable (opens that nation).
      · **Searchable nation list** (right side): flag, name, *their opinion of you* and *yours of them* in green/red; sort by name /
        opinion / power; filter tabs All · Neighbours · At war · Allies · Great powers.
      · **Selected nation → actions**: Propose alliance, Declare war (needs war goal), Offer peace, Improve relations, Send aid,
        Guarantee, Military access, Sanctions, Trade deal, Call to arms. Each button shows the chance it's accepted and WHY
        (hover list: "+25 shared enemy", "-50 rivals", "+20 same bloc", "-30 low trust"…), like EU4.
      · **One opinion system**: one number per nation pair (alliances, rivalries, shared enemies, bloc/religion, world opinion
        `geOpinion`, trust, recent actions); everything diplomatic reads it. Starting opinions/rivalries come from realstart's
        `GR_REAL` table (real-world relations). Deterministic for multiplayer; saved in GC.
      · PC-size, readable text (CLAUDE.md command-bar rule), Esc closes; screenshot in the report.
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
      national morale/loyalty, can tour a province (Fight-it battles there start with fervour). NO capital-falls penalty (Abdullah 2026-11-06 08:11 — replaced): instead **the population clamours for war** — high war support: war weariness grows much slower, recruits/volunteers come faster, declaring war costs little home morale; the flip side is **war fever** — long stretches of peace build unrest/pressure until you fight (or spend effort to calm it). Equal total value vs other nations' signatures.
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

## Stage 5 — THE LOOK (Abdullah 2026-11-06 08:04, showed a Total War: Empire campaign-map screenshot: "it needs to look like this")
Moved up: runs right after grand1. The grand map must look like a **Total War campaign map**, adapted to modern war:
- [x] **3D painted terrain**: real coastlines (public-domain Natural Earth data, reachable via GitHub), relief/hills, biome-painted
      ground (green farmland, desert, steppe, snow, jungle) with soft texture detail; sea with the game's water shader, shallow
      coastal colour, rivers; tilted perspective camera (default ~45° like the reference) with smooth pan/zoom/rotate.
- [x] **Dense instanced forests** and scrub/palms by biome; mountains with rock/snow.
- [x] **Settlements as small 3D towns** (reuse the regional town-look generator / building models at map scale; capitals bigger, ports
      with docks, forts walled) — sized by province tier.
- [x] **Armies = one 3D soldier figure (the general, modern uniform of that nation) holding a big national flag on a pole**, with a
      small unit-count plate; fleets = one ship model with flag; selected army gets a glowing ground ring; planned moves = green
      arrow path along the ground (red for attack).
- [x] **Name banners**: province/city names on small banner plates floating above settlements (readable at every zoom, fade by zoom).
- [x] **Borders**: subtle coloured edge lines + soft owner tint on the ground only near borders/when toggled — not flat coloured blobs.
- [x] **UI layout like the reference**: bottom-centre army panel with one card per unit (portrait, count, health bar), round icon
      buttons on the bottom-right (end turn, menus), minimap of the region bottom-left, thin top bar (treasury, turn/season, alerts).
      Style: original art, modern military theme (no copying of the reference game's art/UI assets); free CC0/CC-BY only, credited.
- [x] **Performance/usage**: instancing + LOD (far = simple), one draw call per forest chunk, steady 60 fps on a mid PC
      (add a grand-map smoothness check). Reuse the battle engine's Three.js setup, terrain/water shaders, models, flags — no new tech.
- [~] Living map: armies walk between provinces, battle smoke over fought-over provinces, turn-report news card done; convoys, missile trails, burning cities (needs stage-3 strikes; renderer already reads `GC.prov[i].burn`) still to do.

> **2026-11-06 17:26 Abdullah: "I want the art loop now … all the art by 8 pm Saturday."** look1 runs as planned; **look2–look4 are folded into the ART LOOP** (their checklists below are the loop's backlog alongside the ART-BAR scores). The art loop also owns the grand-map UI **look** (skin, cards, banners); integrate2 only merges duplicate panels/systems, it does not restyle.

## Look passes (Abdullah 2026-11-06 15:42 — after grandsharp, one Sonnet helper each, in this order; rendering/UI only, no rules)
### look1 — Light & colour
- [ ] Sun with soft real-time shadows (one cascaded shadow map over the visible area), ambient occlusion in valleys, hemisphere sky light.
- [ ] Distance haze/aerial perspective and a soft sky gradient; drifting cloud shadows over the land (cheap projected noise).
- [ ] Water: waves (normal maps), depth colour from shallow turquoise to deep blue, shoreline foam, sun glints, subtle reflections.
- [ ] Hand-tuned colour palette per region/biome (Levant olive hills, Arabian sand, Iranian plateau, steppe, European green, snow) and a final colour grade; matching dawn/dusk for turn changes is optional.
### look2 — Detail & life
- [ ] Patchwork farm fields around towns, visible road and rail networks between towns (crisp ribbons), bridges.
- [ ] **Replace the current boxy box-and-cylinder towns** (seen in orch/shots/grandsharp/after/2-army-town-close.png — breaks the "no cubes" rule) with real building meshes/models. Region-style towns at map scale (Middle Eastern flat roofs + minarets/domes, Lebanese stone villages, Yemeni tower houses, European red roofs, East Asian roofs…) via the town-look generator; ports with docks and ships; airfields/forts visible on provinces that have them.
- [ ] Snow-capped peaks, rocky cliffs, varied forest (species by biome), palms in oases.
- [ ] Waving flags on armies, smoke columns over contested provinces, fires on burning cities.
- [ ] Weather and seasons on the map (snow cover in winter, rain/sand storms drifting, mud season tint), matching the turn's season.
### look3 — UI polish
- [ ] One modern-military UI skin for the grand map: frames, panels, buttons, icons (original, free fonts), readable on PC.
- [ ] Unit cards show real pictures of each unit (render portraits from the game's own 3D models at build time), with count/health/veterancy.
- [ ] Better name banners (nation colours, capital star, port/fort icons), minimap styling, turn/treasury top bar, tooltips.
### look4 — Cinematic moments
- [ ] "Fight it": the camera swoops down from the grand map into the province before the battle loads; after the battle it pulls back up to the map showing the result.
- [ ] End of turn: a short sweep over the world while moves resolve (skippable).
- [ ] Big events (capital falls, war declared, peace signed): a 2–3 s camera moment + news card (skippable; Settings toggle).
All passes: steady 60 fps on a mid PC (grandsmooth), Settings "Grand map quality" covers anything heavy, free CC0/CC-BY assets credited,
before/after screenshots of the same views in orch/shots/<pass>/.

## Stage 5 addition
- [x] **Map modes** (Abdullah 21:20): political, terrain, trade, supply, unrest, culture, alliances, development (one switcher).

## Stage 7 (grand7 — friends multiplayer; Abdullah 2026-11-06 07:51)
- [ ] **Co-commander**: a human ally who is in that war (allied with a side, not just watching) can join a running live battle
      from the campaign and take command of part of their side's army (the owner hands over units, or the ally gets the
      reinforcement waves / a share); same normal battle-room join path; never more than 8 players in one battle.
- [ ] **Support from the map**: any empire in the war — on either side — can send support into a running battle from its own
      grand-map stocks and launch sites/airfields in range: air strike, missile, drone strike (uses the stage-3 map-strike rules
      and costs). It arrives in the battle after a short delay as a normal power/strike for that side, with an on-screen notice
      ("Allied air strike inbound"); air defence in the battle can intercept; stocks are spent even if shot down. Sent as an
      ordinary battle command, so host, clients and replays stay in sync.

- [ ] **Battle time limit = host's choice** (Abdullah 2026-11-06 07:56; replaces the fixed 30-min cap in the stage-7 prompt): set
      when creating the campaign — 30 min / 60 min (default) / no limit; at the limit the battle is auto-resolved from its current
      state. Players waiting on the turn can vote "end it now" (majority of the waiting humans) to auto-resolve early; the
      fighters see a 60 s warning first. Solo campaigns: no limit.

## Integration 2
- [ ] **Ledger** (Abdullah 21:20): statistics screen comparing all nations (army size, income, provinces, war history, graphs
      over time).
- [ ] **Outliner**: side list of all your armies, fleets, sieges and build queues for quick control.
- [ ] **Pause on events**: settings for which events pause the game / pop up (war declared, revolt, province lost…).
- [ ] **Advisor tips:** optional chief-of-staff hints on the grand map ("province 12 will revolt", "your east is undefended",
      "this strait closing will hurt your oil income"), toggle in Settings.

## Home regions (nations-new1, 2026-11-06)
- **DW "Coffee Shias" = Yemen**: grand-map home region is Yemen (Sana'a / Sarawat highlands, Tihama coast, Hodeidah, Mokha, Bab-el-Mandeb). Battle maps `yemen`, `tihama`, `babelmandeb` already list DW as home; town names for style `yemen` are now Yemeni (tower-house towns).
- **RS "Mountain Shias"**: home = South Lebanon & the Bekaa (Bint Jbeil, Maroun al-Ras, Khiam, Nabatieh, Baalbek, Hermel, the Litani, southern Beirut suburbs). Battle town names for style `lebanon` use these places.
- **IQ Iraq**: home = Mesopotamia (Baghdad, Karbala, Najaf, Basra, Mosul, Kirkuk, the marshes); battle maps `mesopotamia`, `euphrates`. **SY Syria**: home = the Levant (Damascus, Aleppo, Homs, Hama, Latakia, Tartus, Palmyra); battle maps `aleppo`, `euphrates`, `golanplateau`.

## Home regions (nation-anglo, 2026-11-06)
- **GB**: England, Scotland, Wales, N. Ireland as detailed provinces (London, Home Counties, Midlands, Scottish Lowlands/Highlands, Wales, Ulster) + Royal Navy bases (Portsmouth, Faslane). **AU**: Sydney/Brisbane/Melbourne/Perth/Darwin, Outback, Tasmania. **CA**: Ontario/Quebec, Maritimes, Prairies, BC, the Arctic north. Not yet added to the grand map data (stage owner: add detailed provinces).

## Home regions (nation-frde, 2026-11-06)
- **FR France**: home = metropolitan France (Île-de-France / Paris, Normandy & Brittany coast, Lorraine-Alsace on the Rhine, the Rhône–Provence axis, Toulon naval base); battle maps `rhine`, `aegean` list FR; a French-village town style is still to do (currently the shared `europe` look). **DE Germany**: home = Germany (Rhine-Ruhr, Bavaria, Saxony, Berlin-Brandenburg, Hamburg/Kiel coast); takes over the Fulda Gap and Rhine Front as home maps. Detailed grand-map provinces belong to the grand stage that builds the Europe theatre.
