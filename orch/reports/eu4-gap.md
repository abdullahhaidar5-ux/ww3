# EU4 gap audit — what the grand campaign has, what it lacks (helper eu4audit, 2026-11-12)

Read-only audit. No game file changed. Ideas only: nothing here copies EU4 text, art, icons or layout.

## How this was checked (and what was not)

- **Wiki pages actually read this run:** Mechanics (the full list of ~110 mechanics), Warfare, Casus belli, War exhaustion,
  Manpower, Trade, Land warfare, Diplomacy. Each page is long; the reader saw only the first part of Warfare, Manpower,
  Trade, Land warfare and Diplomacy.
- **Wiki pages that could NOT be opened** (the fetch was refused, twice): the wiki front page, Relations (aggressive
  expansion, coalitions), Rebellion, Autonomy, Overextension, Estates. Rows for those mechanics are written from general
  knowledge of EU4, not from the wiki text. Rows marked ★ should be re-checked against the wiki before building.
- **Our side:** `orch/SYSTEMS.md`, `orch/GRAND-PICKS.md` headings, `orch/REAL-2026.md` headings, and for every `src/13*`
  module the header comment plus function names (grep), with a few single-line reads. No module was read whole, so
  "have" means "the system exists and its header describes this", not "play-tested".
- **Not found on main:** the 2026-11-11 decision ("Turn it into eu 4 rules", campaign battles resolved on the map, never
  fought live) is not in `CLAUDE.md` or `orch/DECISIONS.md` on main `77b4ee8`. `CLAUDE.md` still describes "Fight it live".
  This report follows the scheduled prompt; ORCH should record the decision so helpers stop building Fight-it features.

## The short answer

ORCH expected seven things to be missing. Tested, most already exist as first cuts:

| ORCH expected missing | Verdict | Evidence |
|---|---|---|
| War score / war goals / peace deals | **partial** | Peace screen exists (`13z-gpeace.js`: provinces, tribute, vassal, reparations, demilitarised zone). War score is thin: `gdWarscore` (13m) = ±12 per army standing on enemy land + 2 per month, max 30. No war goals. |
| Casus belli | **partial** | `13zc-gclaims.js`: one type only (a bought claim on a neighbour's province, 24 months). |
| Aggressive expansion + coalitions | **have** | `13y-gcoal.js`: alarm `N.ae`, fades 5%/month, coalitions join wars, "Ease tensions". |
| War exhaustion | **have** | `13v-gwarsup.js` war support 0–100 is the one meter; `gseWE` (13zzb) shows it as exhaustion. |
| Unrest / rebels / autonomy | **have / partial** | Autonomy `13zp`, unrest + occupation reaction `13y-goccupy`, rebel factions with demands `gseRebels` (13zzb). Rebels are lists and events, not armies that take land. |
| Manpower + attrition | **partial** | Manpower pool `geManCap`/`geManRegen` (13g) + mobilisation (13zm). Supply lines (13zl) starve cut-off armies, but there is no attrition by province and no visible reserve drain. |
| Trade routes | **have (first cut)** | `13x-gtrade.js`: every sea zone a node, 30% flows downstream, power from ports, blockades and closed straits count. |

The real holes are elsewhere: **land changes owner the moment a battle is won** (no occupation), **no sieges**, and the
**map battle is one dice-weighted comparison** (`grAuto`) — which matters most now that battles are never fought live.

## Table A — EU4 mechanics, one row each

Status: **have** · **partial** · **missing** · **n/a** (does not fit 2026). Size S ≈ one helper hour, M ≈ a day, L ≈ several days.
Order = suggested build order (1 first); "–" = nothing to build. Files are `src/13…js`.

### War and peace

| EU4 mechanic | Status | What we have today (file) | 2026 translation | Owner | Size | Order |
|---|---|---|---|---|---|---|
| Occupation vs ownership (control until peace) | **missing** | Winner owns the province at once (`grSettle`, 13-grand); `st.o0` remembers the first owner | Occupied territory: you hold it, the world still sees it as theirs until a peace deal or annexation; income cut, resistance by morale style | `13-grand.js` (new field `st.oc`) + `13y-goccupy.js` | L | 1 |
| War score | **partial** | `gdWarscore` (13m): armies on enemy land + months | Score from battles won (cap 40), occupied land by value, blockaded ports, war goal held (ticks to 25) — the numbers every peace offer is argued with | `13m-gdiplo.js` `gdWarscore` | M | 2 |
| War goals | **missing** | Only the setup screen's "war goals" provinces for Quick length (13c) | Each war has one stated aim: take a named province, hold the capital, show superiority, defend, free a nation, regime change | `13m-gdiplo.js` (state on the war record) | M | 2 |
| Casus belli | **partial** | Claims only (`13zc-gclaims.js`) | Legal justification menu: border claim, reclaim own core, self-defence / ally attacked, UN mandate, liberation of an occupied nation, treaty breach (broken truce), nuclear red line, protect shipping. Each sets the war goal, peace prices, alarm and UN reaction. No justification = sanctions vote + alarm + stability loss | `13zc-gclaims.js` (rows `GCB`) | M | 3 |
| Peace deals | **partial** | `13z-gpeace.js`: provinces, tribute, vassal, reparations, DMZ, white peace; truce 12 / 6 months | Add terms: return occupied land, release a nation, regime change, drop claims, end sanctions/embargo, base rights, disarmament cap, recognition; separate peace with one enemy; war leader speaks for a coalition; truce length grows with what was taken | `13z-gpeace.js` | M | 4 |
| Truce | **have** | `GC.tr`, `gdTruce`; truces can break (`13zy-gceasefire.js`) | Ceasefire with incidents, guarantors, peacekeepers | 13m / 13zy | – | – |
| Call to arms, co-belligerents | **partial** | AI allies and guarantors join (`glgTurn`, 13o-gworld); coalition joins (`gcoJoin`) | Treaty articles: defensive allies must join, offensive allies may refuse (trust loss); attacking a co-belligerent's land costs more alarm | `13o-gworld.js` | S | 9 |
| Unconditional surrender / capitulation | **missing** | – | Collapse of a state: government in exile, all land occupied, forced deal. Rare (base rates) | `13z-gpeace.js` | S | 4 |
| Revanchism | **missing** ★ | – | Rally after defeat: lost-land nations recover unrest and war support faster, want it back (auto claim) | `13v-gwarsup.js` GMOD row | S | 12 |
| Land battles (phases, dice, width, terrain, leaders) | **partial** | `grAuto` (13-grand): strength × terrain/river/fort/depth mods × ideas × 6% roll; morale `gmMor*` (13b); tradition, drill, generals' perks feed it | Battles resolved on the map over several days: fire phase (artillery, air, drones) then assault phase, front width by terrain, general skill, supply state, daily losses shown. **Zealous sides never retreat**: they fight on at reduced strength (heavier losses), others withdraw at their style's threshold | `13-grand.js` `grAuto` (one function) | L | 5 |
| Sieges, fort levels, zone of control | **missing** | Forts / Mountain Fortress are buildings that add defence (`grDefMods`, province `bl`); no siege clock, no blocking | Cities and fortress belts take weeks or months to reduce (encircle, starve, breach, storm at high cost); a fortress blocks movement past it; capitals rarely fall fast | `13-grand.js` + `13i-grandmil.js` | L | 6 |
| Attrition + supply limit | **partial** | Supply lines by distance, terrain, season; cut armies burn stock (`13zl-gsupply.js`); operational pauses | Each province feeds only so many troops (roads, ports, season); over the limit or out of supply = monthly losses of men and vehicles, worse in winter, desert, mountains | `13zl-gsupply.js` (part of the one supply owner 13g) | M | 7 |
| Manpower | **partial** | `geManCap`, `geManRegen` (13g): pool from towns, autonomy, bases; mobilisation levels (`13zm`) | Trained reserves + conscript classes: battle and attrition losses drain it, refills over years not months, mobilisation trades economy for men; show it in the top bar | `13g-grandeco.js` + `13zm-gmobil.js` | S | 8 |
| Sailors | **missing** | Fleets cost money only | Fold into manpower as naval crews; no second pool | `13g-grandeco.js` | S | 20 |
| Force limit | **have** | `13y-gforce.js` | Sustainable force size from development; over it upkeep ×1.5 | 13y-gforce | – | – |
| Army tradition, professionalism, drill | **have** | Tradition `N.trad` (13y-gforce); drill order (`13zzd-gdrill.js`) | Combat experience, professional vs conscript army | 13y-gforce / 13zzd | – | – |
| Discipline | **partial** | Idea stats `attack`/`defense` feed `grAuto` | Training quality: one stat read by the map battle | `13-grand.js` `grAuto` | S | 5 |
| Military leaders | **have** | Generals, perks, fronts (`13i-grandmil.js`); names from `13l-people.js` (fictional) | Generals and admirals | 13i | – | – |
| Land / naval units, navy, naval warfare, blockades | **have** | Unit records, fleets, sea zones, mines, blockades (13i, 13g) | – | 13i | – | – |
| Mercenaries, condottieri | **partial** | Foreign volunteers and proxies (`13zq-gproxy.js`), arms trade (`13zr-garms.js`) | Private military contractors for hire (cash, no manpower, opinion cost); lending brigades to an ally | `13zq-gproxy.js` | M | 17 |
| Looting, scorched earth | **partial** | Scorched earth exists in the economy (13g) | Infrastructure damage that slows the invader and costs the owner for years | 13g | – | – |
| Forts upkeep, mothballing | **missing** | Fort buildings have no monthly cost | Garrison readiness: full, reduced (cheaper, weaker at first) | `13g-grandeco.js` | S | 6 |
| Power projection, rivals | **partial** | Rivalries seeded in `GR_REAL`; great powers (`13u-gprestige.js`) | Declared rivals: beating, sanctioning or out-growing them gives standing and Diplomatic points; ignoring them costs | `13u-gprestige.js` | M | 14 |
| Privateers, coast raiding | **n/a** | – | Not built: attacks on civilian shipping and slave raiding break the "military vs military" rule. The useful part (interdiction) is the blockade system we have | – | – | – |

### Diplomacy

| EU4 mechanic | Status | What we have today (file) | 2026 translation | Owner | Size | Order |
|---|---|---|---|---|---|---|
| Relations / opinion | **have** | One opinion with factor lines (`gdOp`, `gdWhy`, 13m) | – | 13m | – | – |
| Aggressive expansion ★ | **have** | Alarm (`13y-gcoal.js`) | Add: alarm weighs more on neighbours and same-bloc states, and feeds UN sanctions votes (`unPropose`) instead of being separate | `13y-gcoal.js` | S | 10 |
| Coalitions ★ | **have** | `gcoForm`, `gcoJoin` | Add a coalition war with one leader who signs peace for all | 13y-gcoal | S | 10 |
| Diplomatic actions | **partial** | Improve, aid, claim, alliance, guarantee, peace, leave alliance, proxy, cyber, escalate, step back, declare war (13m `gdAct`) | Missing acts: military access / overflight, basing rights for fleets and aircraft, subsidies and loans to another state, insult / recall ambassador, warn, offer or ask for a non-aggression pact, sell province (rare), share intelligence | `13m-gdiplo.js` | M | 11 |
| Diplomats and relation slots | **missing** | Acts cost points only | A handful of envoys: each long task (improve relations, mediation, lobbying the UN) ties one up; too many treaties cost Diplomatic points | `13m-gdiplo.js` | S | 13 |
| Trust and favours ★ | **missing** | – | Reliability record: honoured calls raise it, dishonoured treaties crater it; favours earned by aid and joining wars buy help later | `13m-gdiplo.js` | M | 13 |
| Diplomatic reputation, prestige | **partial** | Prestige is a read-only formula (13u) | Standing that moves with wins, broken promises, UN votes; changes acceptance of offers | `13u-gprestige.js` | S | 14 |
| Guarantee, warning, threaten | **have** | Guarantees `GC.gu`; escalation ladder `gesc*` (13m) | Red lines, alerts, off-ramps, mediators | 13m | – | – |
| Great powers + their actions | **partial** | Top 8 list (13u) | Great-power acts: intervene in a war, break an alliance by pressure, take a state under protection, veto (UN, 13zu) | `13u-gprestige.js` | M | 14 |
| Subjects (vassal, march, tributary, client) | **have** | `13zq-gsubj.js`: liberty desire, tribute, troop demands, integration, independence | Aligned states, aid partners, covert militias | 13zq-gsubj | – | – |
| Support independence | **partial** | Liberty desire exists (`gsbLib`) | Backing another power's unhappy partner | 13zq-gsubj | S | 18 |
| Espionage (spy networks, fabricate, sow discontent) | **partial** | Spies, sabotage, counter-intelligence, cyber, proxies (13-grand `grSpy`, `13zs-gcovert.js`) | A network level per target that unlocks actions and decays; claims built by intelligence work | `13zs-gcovert.js` | M | 16 |
| Embargo | **have** | `geEmbargo` (13g), arms embargo (13zr), UN sanctions (`13zu-gun.js`) | Sanctions regimes | 13g / 13zu | – | – |
| Holy Roman Empire, Papacy, Emperor of China, Council of Trent | **n/a → have** | UN Security Council with vetoes (13zu); blocs `GC.alz`; EU as an alliance | Their modern job (a body above states) is the UN and the blocs | 13zu | – | – |
| Defender of the Faith | **partial** | The shared Ayatollah leads IR/RS/DW (`13v-gleader.js`); guarantees | Bloc patron: one state per bloc pledged to defend members, paying for it in money and exposure | `13m-gdiplo.js` blocs | S | 19 |
| Royal marriage, personal union, claim throne | **n/a** | – | No dynastic politics in 2026 | – | – | – |

### Economy and trade

| EU4 mechanic | Status | What we have today (file) | 2026 translation | Owner | Size | Order |
|---|---|---|---|---|---|---|
| Tax, production, economy, loans, bankruptcy | **have** | `13g-grandeco.js` (income, bonds `geBorrow`, default, crises) | – | 13g | – | – |
| Inflation, corruption | **have** | `13x-ginfl.js`, `13z-gcorrupt.js` | – | – | – | – |
| Development | **have** | `13w-gdev.js` (tax / production / manpower levels, bought with points) | Investment in a region | 13w-gdev | – | – |
| Buildings | **have** | Province buildings `bl` (13g) | – | 13g | – | – |
| Trade goods, prices | **have** | Oil index (13g) + grain, metals, wares (`13z-gmarket.js`) | World commodity prices | 13z-gmarket | – | – |
| Trade nodes and flow | **have** | `13x-gtrade.js` | Sea lanes and chokepoints | 13x-gtrade | – | – |
| Merchants: collect vs steer | **partial** | `geMerchant` (13g); node lead news (13x) | Trade missions: pull value toward your home lane or cash it where you are strong | `13x-gtrade.js` | S | 15 |
| Light ships protecting trade | **missing** | Fleets blockade, they do not add trade power | Naval patrols on a sea lane raise your share and insure shipping against a closed strait | `13x-gtrade.js` | S | 15 |
| Trade company, colonial nation, colonization, exploration | **n/a** | Fog and satellites cover "knowing the map" (`grSeen`) | No unclaimed land in 2026 | – | – | – |
| War reparations, subsidies | **partial** | Reparations one-time (13z-gpeace); aid act (13m) | Monthly payments over years | 13z-gpeace | S | 4 |

### Running the country

| EU4 mechanic | Status | What we have today (file) | 2026 translation | Owner | Size | Order |
|---|---|---|---|---|---|---|
| Monarch power | **have** | Political / Diplomatic / Military points `N.pp` (`13l-grandideas.js`) | – | 13l | – | – |
| Idea groups, national ideas, policies | **have** | 18 groups + morale-style tree (13l); policies `GPOL` (13zzb) | – | – | – | – |
| Technology | **partial** | Three research tracks + cabinet bonus (`13z-gresearch.js`) | Add catch-up: being behind neighbours and allies makes research cheaper, being ahead dearer | 13z-gresearch | S | 21 |
| Institutions | **missing** | – | Spreading capabilities (digital economy, drone warfare, precision strike) that start in a few states and spread by trade, alliances and war experience | `13z-gresearch.js` | M | 21 |
| Stability | **have** | −3…+3 (`13m-grandstab.js`) | – | – | – | – |
| Cores, coring | **have** | `gsIsCore`, `gsCoreStart` (13o-gstab) | Integrating annexed land (administration, recognition) | 13o-gstab | – | – |
| Overextension ★ | **partial** | `gseOE` = development of non-core land, shown on the Stability screen | Make sure it bites: unrest, worse diplomacy, alarm, and estate crises past 100% | `13zzb-gdecide.js` | S | 12 |
| Governing capacity, states and territories ★ | **missing** | Direct / Local / Autonomous level per province (`st.au`, 13g) + autonomy % (13zp) | Administrative reach: a state can run only so much land directly; the rest must be left autonomous or handed to aligned governments. This is the brake on world conquest | `13zp-gautonomy.js` | M | 12 |
| Autonomy ★ | **have** | `13zp-gautonomy.js` | – | – | – | – |
| Unrest, rebellion ★ | **partial** | Unrest per province; rebel factions with demands and "Handle them" (`gseRebels`, `gseHandle`); revolts; occupation reaction by morale style (13y-goccupy) | Rebels as map forces that hold provinces and enforce their demand if ignored: loyalists return land to the old owner, separatists found a state, anti-war movements force peace talks. Generic names only (no real groups) | `13zzb-gdecide.js` + armies in 13-grand | M | 8 |
| Disasters | **partial** | Coup, civil war, economic collapse with progress meters (`GSE_DIS`) | Add: succession crisis, army mutiny after defeats, bloc break-up, sanctions spiral | `13zzb-gdecide.js` rows | S | 22 |
| Estates ★ | **have** | Power groups per regime (`13o-gstab.js`) | Army, clergy, business, labour, tribes, guard corps, party | 13o-gstab | – | – |
| Government types and reforms | **partial** | Government type in the header; government ↔ war support (`pgGov`, 13x-gpropa); elections (`13zw-gelect.js`) | A short reform ladder per regime type (presidential, parliamentary, monarchy, one-party, theocracy, junta) with real trade-offs; regime change by coup, vote or defeat | `13l-people.js` (gov tab) | M | 16 |
| Ruler, heir, personalities | **partial** | Leader, heir, ministers with fictional names (13l-people); succession listed open (RG30) | Leader traits that tilt AI behaviour; succession and term limits | 13l-people | S | 18 |
| Advisors | **partial** | Four ministers with skill 1–3 (13z-gresearch) | Hire and dismiss ministers for a salary | 13z-gresearch | S | 18 |
| Legitimacy, absolutism | **partial** | War support and stability carry it | No new meter: keep as war support + stability (one system per idea) | – | – | – |
| Religion, culture | **n/a (as mechanics)** | Estates and occupation reaction carry identity; holy places (`13w-gholy.js`) | No conversion or culture change in 2026. Identity only affects unrest under foreign rule, as today | – | – | – |
| Missions, decisions, events | **have** | `13s-gmissions.js`, `13zzb-gdecide.js`, `13p-gevents.js` + real dated events (`13zz-greal26.js`) | – | – | – | – |
| Capital, moving it | **partial** | Capital doubles peace cost; AI guards it | Wartime relocation of the government | 13-grand | S | 22 |
| Great projects | **partial** | Signature assets (`GE_SIG`), decisions | National megaprojects (canal, pipeline, space launch site) as slow buildings | 13g | S | 23 |
| Ages, splendour, luck, innovativeness | **n/a** | – | A two-to-five-year campaign has no ages | – | – | – |
| Alerts, ledger, graphs, achievements | **have** | `13l-galerts.js`, ledger tab, `13t-ggraphs.js`, `13q-gach.js` | – | – | – | – |

## Table B — EU4 screens vs our windows

Today the nation window registers **36 tabs** (`npTab` calls across 13j…13zzb). The six groups below would hold them all.

| EU4 screen (its job) | Our window today | What is missing | Group / top-bar zone |
|---|---|---|---|
| Top bar | `guTop` (13c) + `geUiTop`, `gmilUiTop` chips | One bar in three zones. **Left = the nation**: flag (opens the Nation window), stability, war support, alarm, the three power-point pools. **Centre = resources**: cash and monthly change, reserves (manpower), fuel, munitions, force used / limit. **Right = the world**: date, pause and speed, wars, alert count | Top bar |
| Court (ruler, heir, advisors) | `gov` tab (13l-people), cabinet inside `res` | Hire / dismiss ministers; leader traits | Government |
| Government (type, reforms) | Header + `elect`, `ldr` tabs | Reform ladder | Government |
| Stability & expansion | `stab`, `dec` (Stability & expansion screen `gseTab`), `cor`, `au` | Governing reach; overextension effects listed | Government |
| Estates | `estates` | – | Government |
| Decisions & policies | `dec` | – | Government |
| Ideas | `idea` | – | Government |
| Technology | `res` | Capabilities that spread (institutions) | Government |
| Missions | `mis` | – | Government |
| Economy (income / expense, sliders, loans) | `eco`, `fin` | One income-and-expense page; reparations and subsidies lines | Economy |
| Trade (nodes, merchants) | `trade`, `mkt`, `pipe`, `arms` | Steer / collect choice, patrol fleets | Economy |
| Province view, production builder | Province panel (`geUiProv`, `gmilUiProv`), `prov`, `dev` tabs, standing orders (`gmMacros`) | Occupation status and siege progress | Economy |
| Military (army quality, leaders, losses) | `mil`, `mob`, `sup`, `nuke` | Reserves page: pool, monthly refill, losses by cause (battle / attrition); war losses per war | Military |
| Army panel, battle view | Army rows and tokens (13c, 13e3); battle prompt `grBattlePrompt`; after-action report `grandAAR` | A map battle window: both sides, phases day by day, terrain and general modifiers, losses. Remove the "Fight it live" choice from the prompt | Military |
| Siege view | none | Siege window: garrison, supplies left, breach, storm button | Military |
| Diplomacy (country list, actions) | `dip` tab (13m), filters All / Neighbours / At war / Allies / Great powers | Envoys, trust, favours, access and basing rights | Diplomacy |
| Declare-war dialog | Confirm inside `dip` | One step-by-step dialog: pick the justification → see the war goal → see who joins each side → see the costs (alarm, UN, stability) | Diplomacy |
| War overview | none found | Per-war page: war score split by source, war goal, participants, losses, "Offer peace" | Diplomacy |
| Peace deal | `gpOpen` (13z-gpeace) | More terms; separate peace; score split shown | Diplomacy |
| Subjects | `subj` | – | Diplomacy |
| Coalitions, great powers | `coal`, `gp`, `un` | Great-power actions | Diplomacy |
| Espionage | `cov` + spy rows (13c) | Network level per target | Diplomacy |
| Rebels list | Inside Stability & expansion | Link each faction to its map force | People |
| Home front (no EU4 equal) | `home`, `prop` | – | People |
| Ledger, graphs | `led`, `gr`, `ach` | War and losses pages | World |
| Outliner | `gmOutliner` (13c) | Sieges and battles in progress | World (right edge) |
| Alerts bar | `alBar` (13l-galerts) | Alerts for: no war goal held, army over supply limit, reserves empty, truce ending | Top bar, right zone |
| Modifiers list | `mods` (13k) | – | World |
| Map modes | Overlays in the 3D map (13e) | Supply limit, occupation, alarm, trade flow modes | World |

Suggested homes for all 36 tabs — **Government:** gov, stab, estates, dec, idea, res, mis, cor, elect, ldr.
**Economy:** eco, fin, dev, prov, trade, mkt, pipe, arms, au. **Military:** mil, mob, sup, nuke. **Diplomacy:** dip, coal,
subj, un, cov, gp. **People:** home, prop. **World:** led, gr, ach, mods.

## Top 10 missing, in build order

1. **Occupied land is not yours until peace.** When your army wins a province you hold it, but it only becomes yours in a peace
   deal. Wars become long and are decided at the table, as in real history, instead of the map being repainted in a few weeks.
2. **War goals and an honest war score.** Every war has one stated aim, and a score that counts battles won, land held, ports
   blockaded and the aim achieved. You can see why the enemy says no and what would make him say yes.
3. **Reasons for war.** Before declaring war you pick a legal justification (border claim, self-defence, UN mandate, liberation
   and so on). A good reason keeps sanctions and coalitions off your back; a war without one turns the world against you.
4. **A full peace table.** Peace can return occupied land, free a nation, change a government, lift sanctions, grant bases or set
   monthly reparations, and you can make peace with one enemy at a time. Winning a war gives real choices besides taking land.
5. **Battles you can read on the map.** A battle lasts days: artillery, aircraft and drones first, then the assault, with terrain,
   the general, supply and morale style all shown. Since battles are no longer fought live, this window is the battle — and
   Zealous armies visibly fight to the end instead of withdrawing.
6. **Sieges and fortresses.** Big cities and fortress lines must be surrounded and worn down for weeks or months, and a fortress
   blocks the road past it. Capitals stop falling in days, and a Mountain Fortress finally does on the map what it does in name.
7. **Attrition and supply limits.** Each province can feed only so many troops; too many, or a winter far from your depots, and
   men and vehicles are lost every month. Huge single stacks stop being the best answer and logistics decides campaigns.
8. **Reserves that run dry, and rebels that take ground.** Losses drain a pool of trained reserves that refills over years, and
   ignored unrest becomes an armed force that holds provinces until its demand is met. Long wars and harsh occupations get a
   real price at home.
9. **Allies with terms.** Allies join by treaty type, can refuse an offensive war at a cost in trust, and a coalition has one leader
   who signs for all. You know before the war who will really come.
10. **A limit on how much one state can run.** Past your administrative reach, land must be left autonomous or handed to an
    aligned government. This is the realistic brake on conquering the world and makes subjects worth having.

After these: missing diplomatic acts (access, basing, subsidies), trust and favours, rivals and great-power actions, trade
steering with patrol fleets, spy networks, government reforms, private military contractors, spreading capabilities.

## Notes for ORCH

- **One system per idea — possible overlaps to settle before building:** (a) war exhaustion must stay a view of war support
  (13v); do not add a 0–20 meter. (b) Alarm (13y) and UN sanctions (13zu) react to the same act separately; item 3 should
  make the justification feed both. (c) Autonomy has two fields (`st.au` level in 13g, `st.ap` percent in 13zp); item 10 is the
  moment to merge them. (d) `orch/SYSTEMS.md` repeats four grand-map rows (state, map data, Fight-it bridge, auto-resolve).
- **Leftovers of "Fight it live"** once the 11-11 decision is recorded: `grandFightLive`, `grBattlePrompt` choices, `gnBattleAsk`
  (13zn), the campaign-creation battle time limit, sortie / air rules written for live battles, `CLAUDE.md` "Grand strategy
  layer" bullet, guards in `orch/grandtest.mjs`. Not removed here (read-only job).
- **Checkpoint:** items 1, 2, 6 and 8 add state (`st.oc`, war records, siege progress, rebel forces); all of it must be saved
  with `GC` and covered by the campaign save test.
- **Base rates:** items 1, 6, 7 and 10 are the ones that move the campaign toward "wars rare, long and costly; capitals rarely
  fall fast". Re-run the AI-vs-AI campaign check after each and compare with the calibration notes in `orch/REAL-2026.md`.

Sources: eu4.paradoxwikis.com — Mechanics, Warfare, Casus_belli, War_exhaustion, Manpower, Trade, Land_warfare, Diplomacy.
