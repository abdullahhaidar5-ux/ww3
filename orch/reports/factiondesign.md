# Faction design: what makes each nation feel different (design only, no game code)

Asked by Abdullah Fri 2026-11-13 22:46 Chicago ("What could make the factions more unique", picked all six points). Written Sat 2026-11-14 by helper `factiondesign` from a grep audit of `origin/main` (a3b627b-era). 22 nations: IR RS DW RV OB US GB FR DE IL UA RU CN KP IN JP KR PK SA AE TR EG.

## 1-page summary (phone)

**Good news first: most of the six points already exist.** Every nation already has its own unit names, one special unit, one hero squad with an ability, its own national power, a doctrine, a morale style, stat mods (cost/hp/damage), nine own upgrades, and its own general-power wording. The ORCH lesson holds: do not rebuild these.

**What is really shared by everyone (the true gap):**
- Same buildings, same tech tree, same Battle economy (supply trucks, same prices). Nation differences in money are only small `mods` numbers (cost %, infantry cost %, oil, harvest). The big asymmetry (`REAL_TIER`: richer/dearer vs poorer/faster) only applies in the **Realistic** lobby toggle (`G.real`), not in default Battle.
- Five of the general powers (bounty, recon, paradrop, barrage, repair) and the four General Doctrines (Armour, Guerrilla, Air, Artillery) are shared; nations only rename and tune them.
- Base look: only two families exist. Middle-Eastern mud brick (IR RS DW SA AE EG) and "everyone else" (one Western-concrete look). No Soviet concrete, no Western prefab, no Asian style. RV and OB are not in the Middle-Eastern set (to verify in game, see audit notes).
- Soldiers: three rigged soldier models only (`sol_w` Western, `sol_e` Eastern, `sol_m` militia fatigues) plus a national colour tint. Vehicles: tanks are mostly one of two shared models (`t90`, `tankE`) with national paint.
- Sound: voices exist for 16 of 22 (GB, FR, DE, JP, RV, OB are missing or borrowed). Anthems missing for IR RS DW RV OB KP SA AE TR GB. The shared soundtrack is one pool by design.

**Biggest wins for the smallest work (my recommendation, in order):**
1. **Economy profile in Battle** (M): turn on a light version of `REAL_TIER` (build time and upkeep only) in default Battle so "rich = expensive and strong, poor = cheap and fast" is felt every game. Already proven by `node orch/tourney.mjs --real`.
2. **Base looks in 3 families** (M, smooth-safe if instanced): mud brick (Shia + Arab), Soviet concrete (RU KP CN IN PK), Western prefab/glass (US GB FR DE IL JP KR UA), reusing `04c-townlook` palettes and the `11-models` compound-wall parts.
3. **One "signature unit" each that plays differently** (S-M each), mostly by adding a small behaviour to an existing special/extra slot: RS tunnel-ambush Kornet team, IR Shahed rack truck, IL Merkava with built-in active protection, KP massed 240 mm rocket battery, UA FPV team, TR Bayraktar.
4. **Shia-specific**: tunnels exist for IR RS DW KP; give RV and OB a cheap "hidden firing post" (not a full tunnel network) and make cheap hidden forts a Shia perk in Battle.
5. **Audio fill-in**: native voices for the 6 missing nations (RV and OB first because his group plays Shia), anthems for the 10 missing, per-group radio chatter and battle-cry touches.

**Needs you (6 short questions at the bottom).** Everything else can start in 6 parallel lanes without touching the same files.

---

## 1. Audit method and honesty notes

Read: `FACTIONS`, `NEWNAT`, `SPEC`, `HEROES`, `NATPOW`, `GPOW`, `DOCT`, `XL`/`XLB`, `REAL_TIER`, `UPG`/`UPGL` in `src/01-data.js`; `SOLV`, `MEFAC`, `MIL_TANK`, `RMAP` in `src/11-models.js`; `FORT_NAT`/`tunnels` flags; `vo/` and `mus/` file listings; `orch/SYSTEMS.md` morale table; `orch/SIGNATURES.md`. No whole-module reads, no assets opened.

Not verified (flagged "?" below, to check in a 2-minute play test before building): RV and OB building look and soldier model (neither is in `MEFAC`/`SOLV`; OB has its own look entry in `11-models.js` with `sol_e`); the exact specials of GB, FR, DE, JP (they inherit `EG`/`EU` bases, so likely `saka`/`atgm`); whether voices for GB/FR/DE stand in on EU/US sets; the Battle economy path (supply trucks) not applying `REAL_TIER` unless `G.real`.

Morale styles (CLAUDE.md, fixed): Zealous IR RS DW RV OB KP (never rout). Professional RU CN PK EG, GB FR DE JP KR TR US (US/GB/FR/DE/JP/KR/TR per SYSTEMS list). Home defenders IN UA. Firepower-reliant AE SA IL.

## 2. Already exists (nation x 6 points)

Abbreviations: **Roster** = named units different from the generic ones; **Sig** = special unit slot (`SPEC`) and hero squad (`HEROES`: ability); **Mech** = doctrine (`DOCT`) + power + perks; **Econ** = `mods` and `XL` price/hp rows (default Battle) ; **Look** = base / soldier / vehicle; **Audio** = voices (vo/) / anthem (mus/an_).

| Nat | 1 Signature unit | 2 Faction mechanic | 3 Economy (Battle) | 4 Base look | 5 Unit look | 6 Sound |
|---|---|---|---|---|---|---|
| IR | IRGC Field Commander (officer aura); hero IRGC SF (rally); Shahed-136, Fateh-110, Karrar | Asymmetric Warfare (ambush + hit-and-run); Zealous; tunnels + Mountain Fortress; Shahed Swarm power; EW truck | drones -25% cost, 1.8x build speed; arty +12% range; boats cheaper | Middle-Eastern mud brick | `sol_m`; `t90` tank | fa voices (Piper); anthem: none |
| RS | Mountain Rocket Team (hidden ripple fire); hero Radwan Commander (ambush); ATGM team range 205; Medium Rocket Launcher | Fortress & Ambush; Zealous; tunnels + fort; tunnel/turret/SAM +HP/dmg (`XLB`); Labbayk Ya Hussein power; no air/navy | drones -25%, rockets +12%; no air/navy | Middle-Eastern mud brick | `sol_m`; hilux technical | ar-LB voices; anthem: none |
| DW | Ghost Raider; hero Veteran Militia Commander (flip); raid leader (+20% speed/dmg aura); long-range rocket truck 620 | Desert Raiders (hit-and-run + ambush); Zealous; tunnels + fort; Desert Raid power; no air/navy | +13% speed, -8% cost | Middle-Eastern mud brick | `sol_m`; hilux technical | ar-YE voices; anthem: none |
| RV | Shrine Guard Commandos; Kornet team; T-72; Grad; Mi-35, Su-25 | Defenders of the shrines (homeland + ambush); Zealous; no tunnels/fort | infantry -18% cost, faster training | ? (not in Middle-Eastern set) | ? (own look file `11z-nations-rv`; default `sol_w`) | 1 voice file (borrowed from IQ); anthem: none |
| OB | Rubble Marksman Team; RPG ambush team; bulldozer carrier; improvised rockets/AA | Rubble ambush from cover, homeland; Zealous; no tunnels (doctrine text only) | infantry -15%, vehicles -8% HP | ? (own look entry) | `sol_e`-style fatigues | 1 voice file; anthem: none |
| US | Delta Operator (laser-mark); hero Delta Force (strike); Javelin, Abrams, Apache, F-35A | Aggressive Manoeuvre (shock); Shock and Awe power; Tomahawk salvo; Bunker Buster; EW truck | +8% damage; F-35/Apache +25% dmg, tougher | Western concrete (generic) | `sol_w`; `tankE` | en-US voices; anthem yes |
| GB | SAS Troopers hero; Challenger 3; AS-90; Sky Sabre; Typhoon | Combined arms (homeland); GB SAS-raid grand asset (grand only) | infantry -10% cost, -15% train time | generic | `sol_w`; `tankE` | voices: none own (stand-in?); anthem: none |
| FR | Équipe MMP; FELIN squad; Leclerc XLR; CAESAR; Rafale F4; Crotale | Armée de Terre (homeland); +30% building HP; self-repair | -3% cost, regen | generic | `sol_w`; `tankE` | voices: none own; anthem yes |
| DE | Leopard 2A8 line; Panzertruppe; Taurus uplink | Panzertruppe (homeland); EU kit | EU-style: tank HP +12%, tank cost -8% | generic | `sol_w`; `tankE` | voices: none own; anthem yes |
| IL | Iron Dome unit (shoots down shells/missiles, -55% dmg nearby); Sayeret; Merkava Mk4 (820 HP); Spike (dmg 60); Trophy upgrade | Covert Operations; Firepower-reliant; Mossad Intelligence power; Air Strike; Bunker Buster; EW truck; SAM +30% range | -4% cost, +10% HP, +5% dmg; strikes/missiles do 50% to IL | generic | `sol_w`; Merkava model | he voices; anthem yes |
| UA | Aerorozvidka Drone Team; FPV Strike Drone ($250); Stugna-P; Bohdana; Sea Baby boat | Homeland Defence (homeland + hit-and-run); Partisan Uprising; self-repair; Neptune salvo | drones -35% cost and fast; -4% cost | generic | `sol_w` | uk voices (Piper); anthem yes |
| RU | Krasukha EW Truck (jams drones/guided); TOS-1A; Kornet; Pantsir; T-90M | Heavy Barrages (barrage); Thermobaric Strike; Iskander; reactive armour upgrade | vehicles +45% HP; arty +30% HP, +15% dmg | generic (no Soviet concrete) | `sol_e`; `t90` | ru voices; anthem yes |
| CN | PLA Political Commissar; Type 99A; PHL-03; HJ-12; Type 055 | Mass & Information War (barrage); Cyber Blackout power; DF-21; EW truck; Bunker Buster | infantry -42% cost, +40% train speed; ships +30% HP | generic | `sol_e`; `t90` | zh voices; anthem yes |
| KP | Bureau 121 hackers (special = hacker, shared kind); Storm Corps hero (rally); Koksan 520 range; Chonma-216 | Artillery Siege (barrage); Zealous; tunnels + fort; Human Wave power; Hwasong strike | -20% cost, -10% HP; Koksan -20% cost, +10% range | generic | `sol_e`; `t90` | ko voices; anthem: none |
| IN | Army Medical Corps (revive); Nag; Pinaka; Arjun; Tejas | Cold Start Offensive (shock); Akash Shield power; BrahMos salvo | -11% cost, +5% HP; ships +25% HP | generic | `sol_e`; `t90` | hi voices; anthem yes |
| JP | (inherits EG base: likely saka); Type 10 | Layered defence (homeland); sensors +12%, regen, subs/ships +20% | +4% dmg | generic | `sol_w`; `tankE` | 1 voice file; anthem yes |
| KR | K-Counter-Battery Radar (reveals firing enemy guns); 707th hero; K2; K9; KF-21 | Active Defence (homeland); sensors +15%, regen; K9 Barrage power; Hyunmoo | +5% dmg; K9 reload -20% | generic | `sol_w`; `tankE` | ko voices; anthem yes |
| PK | SSG Tank Hunters (+40% vs wounded vehicles); Baktar-Shikan; Al-Khalid; JF-17 | Tank Hunters (ambush); Nasr power (EMP); Shaheen | infantry -28% cost, vehicles +30% HP, AT +20% dmg | generic | `sol_e`; `t90` | ur voices; anthem yes |
| SA | Royal Recon Patrol (+30% aircraft dmg on spotted); Special Forces Sniper; F-15SA; M1A2S | Air Superiority (shock); Petrodollar Contract (+$2000); AWACS upgrade; SAM +20% range | oil +40%, trucks +10%, all units -17% cost; F-15 -25% cost | Middle-Eastern | `sol_w`; `tankE` | ar-SA voices; anthem: none |
| AE | Combat Engineers (hidden mines); Pantsir-S1E; Leclerc; Rafale | High-Tech Precision (covert); Mercenary Contract power; THAAD name | +25% dmg, -5% cost, oil +25%; Pantsir/Apache +15% | Middle-Eastern | `sol_w`; `tankE` | ar-AE voices; anthem: none |
| TR | Kale Mortar Team (drone-guided +40% range); Maroon Beret hero (rally); Kargu drone; Altay; KAAN | Drone Warfare (hit-and-run); Bayraktar Swarm power; Tayfun strike | drones -10% cost, +30% build speed, +15% HP | generic | `sol_w`; `tankE` | tr voices; anthem: none |
| EG | Saka commandos (grenades vs garrisons); Unit 777 hero; Kornet; M1A1 | Armoured Corps (shock); Smoke and Crossing power | infantry -30% cost, faster train; tanks -22% | Middle-Eastern | `sol_w`; `tankE` | ar-EG voices; anthem yes |

**Shared by everyone today:** the four General Doctrines and their 4 perks; nine upgrades each at identical prices per tier (by design); hero cost/cooldown (150 s / 90 s) and rank gate; the 5 general powers (reworded + multipliers); supply-truck economy; buildings list and tech tree (except tunnels / fort / bunker-buster gates); radio "treatment" and the shared soundtrack.

## 3. Proposed (nation x 6 points) - smallest additions, reusing existing systems

Rules of thumb: add a **behaviour** to an existing slot instead of a new unit type; add a **data row** instead of a system; every addition paired with a balance giveback; visual additions merged/instanced. Effort S/M/L; Smooth risk L(ow)/M/H. "+" = proposed addition.

| Nat | 1 Signature unit | 2 Mechanic | 3 Economy profile | 4 Base look | 5 Unit look | 6 Sound |
|---|---|---|---|---|---|---|
| IR | + **Shahed Rack Truck** (S/M, low): ground launcher that fires drones; extends the `drone`+`arty` rocket flag so drones launch from the truck, not the base (matches "ground racks" rule) | + cheap hidden forts (see Shia mech) | Poorer-fast (small/regional): cheap infantry/drones, slower tech | mud brick (exists) + HESCO walls | IRGC fatigue camo tint on `sol_m` (S) | fa chatter set, Persian "Ya Zahra" battle cry touch (S) |
| RS | + **Tunnel-Ambush Kornet**: ATGM team leaving a tunnel fires its first shot at x2 damage, 5 s (S, low); extends `guer/atk` hide + `tunnel` | Shia mech (below) + rocket barrage already | Poorer-fast; hidden forts cheap | mud brick + stone village (exists) | cedar/green fatigue tint, Ashura banner already | Lebanese-dialect chatter (exists); anthem-style Ashura chant at start instead of national anthem (M, audio) |
| DW | + **Technical Convoy** perk: raid leader aura also stacks on rocket trucks (S) | Shia mech (below) | Poorer-fast (already +13% speed) | tower-house + coffee terraces (town look exists); compound look | `sol_m` with turban/shemagh variant (S) | ar-YE chatter exists; Zaidi chant touch (S) |
| RV | + **Shrine Guard Post**: cheap hidden firing post (S, via tunnel-lite, see Shia mech) | Shia mech: hidden post, "defend the shrine": +10% near Shrine landmark building | Poorer-fast | mud brick family (S: add RV to `MEFAC` if not) | southern-Iraq militia + state-army mix: `sol_m` + tan (S) | own ar-IQ voices (M, voice batch); anthem-style chant |
| OB | + **Rubble Ambush Post**: firing post that stays hidden until it fires (S) | Shia mech (hidden post) + rubble cover on destroyed buildings (reuse debris) | Poorer-fast, thin armour (exists) | dense urban concrete / rubble (S: material swap) | light fatigues + keffiyeh, `sol_e` base (S) | own ar-PS voices (M) |
| US | + **Precision Air Call**: Delta mark already boosts aircraft; add "one extra F-35 sortie on marked target" (S) | Air + precision, **fewer, stronger**: cost +8%, HP +8%, build time +10% (data) | Rich-expensive (Superpower row) | Western prefab/glass | OCP camo tint, `sol_w` desert variant | en chatter exists; Marines "Oorah" shout (S) |
| GB | + **SAS Raid Team**: hero squad gets 6 s of cloak after landing (S); Challenger 3 extra-tough front armour (data) | Combined arms: infantry train fast (exists); **home-ground** | Rich-expensive (Great power row) | Western prefab | DPM/MTP camo tint (S) | own en-GB voices (M); anthem (S) |
| FR | + **Foreign Legion Section**: rapid-deploy infantry squad that arrives by helicopter-lift (reuse `airlift`) (M) | Engineering/precision: +30% building HP exists | Rich-expensive (Great power) | Western prefab + French tricolour trim | Daesh/Felin camo tint (S) | fr voices (M); anthem exists |
| DE | + **Leopard 2A8 with APS**: tank soaks the first ATGM per 10 s (S, reuse Trophy/`idome` check) | Panzertruppe: tank HP/cost exists | Rich-expensive, fewer stronger | Western prefab / Fachwerk-free modern | Flecktarn tint (S) | de voices (M); anthem exists |
| IL | + **Merkava Mk4M with active protection**: built-in Trophy, one intercept per 8 s vs ATGM/RPG (S, low); today Trophy is an upgrade | Air + precision; Iron Dome exists; hit hard, **fewer** | Rich-expensive, Firepower-reliant | Western prefab / limestone | IDF olive/tan tint (S) | he voices exist; Hebrew chatter ok |
| UA | + **FPV Strike Team**: infantry-sized team that launches 2 FPV drones (S/M, reuse `drone` + `recon` team) | Homeland defence + cheap drones exist; add **trench/dig-in** speed (data) | Poorer-fast, drones cheap (exists) | Soviet-era concrete with sandbags/earth | Pixel camo tint (S) | uk voices exist |
| RU | TOS-1A in `arty` slot already; + **EW jamming aura on Krasukha** already (exists) | Mass armour + EW: +**mass armour bonus** (3+ tanks together: -10% damage taken) (S) | Rich-expensive but mass: vehicles +HP already | Soviet concrete | EMR camo tint (exists as `sol_e`) | ru voices exist |
| CN | + **Type 99A mass bonus** shared with RU mech; Commissar aura exists | Mass armour + EW (cyber blackout power exists) | Great power: factory discount, mass infantry (exists) | Soviet-style concrete + red trim | Type 07 camo tint (S) | zh voices exist |
| KP | + **KN-25 240 mm massed rocket battery** (S/M): cheap multi-barrel that fires 24 rockets in a long ripple (reuse `rocket`/`ripple`); replace the generic hacker special with a political-officer | Artillery + cheap infantry: barrage doctrine, -20% cost exist; add **mass-conscript surge** after a loss (data) | Poorer-fast, cheap | Soviet concrete + banners | KPA green tint (S) | ko voices exist; anthem (S) |
| IN | Army Medical Corps exists; + **Pinaka salvo bonus** (S) | Cold Start offensive + mass army | Regional/Great mix, cheap | Soviet-style + Indian palette | Digital camo tint (S) | hi voices exist |
| JP | + **Type 10 with Type 03 SAM** pairing aura (S) | Layered defence; sensors +12% exist | Rich-expensive, fewer stronger | Western prefab | JGSDF camo tint (S) | own ja voices (M, 1 exists) |
| KR | K-CBR radar exists; + **K9 salvo bonus** (S) | Active defence (high-tech) | Rich-expensive | Western prefab | ROK digital tint (S) | ko voices exist |
| PK | SSG Tank Hunters exists; + **Nasr** tactical strike exists | Tank hunters (ambush) exists | Poorer-fast, tough | Soviet/Chinese mix (concrete) | Pakistani camo tint (S) | ur voices exist; anthem exists |
| SA | + **AWACS/air-defence umbrella** (S: SAM range +20% exists; add shared radar sight) | Gulf mech: **Integrated Air Defence** (below) | Rich-expensive: oil income x1.4 already | Gulf modern (glass/palace) | Gulf camo tint (S) | anthem (S) |
| AE | Combat Engineers exist; + **Rafale + Pantsir pairing** (S) | Gulf mech: Integrated Air Defence | Rich-expensive, +25% dmg exists | Gulf modern | Gulf camo tint (S) | anthem (S) |
| TR | Kargu/Kale exist; + **Bayraktar TB2** as a controllable MALE drone with 4 missiles (M, reuse `drone`/airfield) | Drone Warfare; add **drone-spotted artillery +40%** (exists on Kale) | Regional/Great power | Western/Anatolian | MSI camo tint (S) | tr voices exist; anthem (S) |
| EG | Saka exists; + **Abrams M1A1 cheap** exists | Armoured Corps | Regional-big army | Middle-Eastern (exists) | Egyptian tan tint (S) | ar-EG exists; anthem exists |

### Faction mechanics per group (point 2)

| Group | Mechanic (one, reusing what exists) | Existing system extended | Effort | Smooth risk |
|---|---|---|---|---|
| Shia (IR RS DW RV OB) | **Hidden posts + cheap forts.** IR RS DW keep full tunnels; RV and OB get a small Hidden Firing Post (holds 4, hidden until it fires, cheap); fortification cost x0.6 for all five in Battle (today only inside Realistic) | `tunnel` building, `FORT_NAT`, `REAL_TIER.fort/atg` | M | Low (no new meshes, reuse tunnel entrance) |
| US / IL | **Air power and precision, fewer but stronger units.** Cost +8%, HP +8%, build time +10% (data); laser mark = extra sortie; IL keeps Iron Dome | `mods`, Delta `mark`, `idome`, GPOW | S | Low |
| RU / CN | **Mass armour + EW.** Platoon bonus (3+ tanks within 120 m: -10% damage taken); EW aura as in `ew` | `ew` kind, `vehHp` mod | S | Low |
| Gulf (SA AE) | **Integrated air defence.** SAMs and AA vehicles within 300 m of each other share sight and +10% range; jets +dmg already | `XL`/`XLB` SAM rows, `MDN` names | S | Low |
| KP | **Artillery and cheap infantry.** Massed rocket battery + conscript surge (cheap infantry refill for 20 s after losing 30% of them) | `barrage` doctrine, `rocket`/`ripple` | M | Medium (many rocket tracers: keep merged FX) |
| Europe (GB FR DE) | **Combined arms + engineering.** GB home-ground infantry, FR rapid air-lift legion, DE tank APS | `homeland`, `airlift`, `idome` | S | Low |
| Drone nations (UA TR) | **Drone teams.** UA FPV teams (cheap, many), TR MALE Bayraktar (few, strong) | `drone`, `recon`, airfield | M | Medium (drone count: cap at 6) |
| Asian high-tech (JP KR) | **Sensors and counter-battery.** Pairing auras (Type 10 + Type 03, K9 + CBR) | `cbr`, `sight` mod | S | Low |

### Economy profile (point 3)

Keep `Balanced` default (all nations equal). Make the difference felt through **profiles** that reuse the `REAL_TIER` fields (bt = build time, up = upkeep, cash = start cash, fort, atg, st = starting units):

| Profile | Nations | Effect | Giveback |
|---|---|---|---|
| Rich-expensive | US GB FR DE IL JP KR (and SA AE with oil) | start cash +10%, units +8% cost and +8% HP, build time +10%, upkeep x0.9 per big army | slower to mass |
| Mass-balanced | RU CN IN PK EG TR | normal cost, vehicles/infantry mass bonus | middle |
| Poorer-fast | IR RS DW RV OB KP UA | cash -10%, infantry -30%, build time -25%, fortifications x0.6 | weaker fire support |

Proof gate before shipping: `node orch/tourney.mjs --real` style AI-vs-AI run across 22 nations, win rate 45-55% each (like `orch/reports/realstart.md`).

### Look and sound plan (points 4-6)

- **Base looks (point 4):** three families on one switch (`baseStyle` = me | soviet | west) in the existing 04-gfx compound code: palette + roof clutter + wall/gate variant, merged per material (smooth-safe). Gulf modern is a palette variant of "west".
- **Unit looks (point 5):** keep 3 soldier rigs; add per-nation camo **tint maps** (6 patterns: woodland, desert, digital, olive, tiger, MTP) via `soldierGear` material colour only. Vehicles: national paint exists (`camoFreq`); add the one new silhouette per signature unit by reusing an existing model with a different weapon fit.
- **Sound (point 6):** new voices only for the 6 missing nations (XTTS "tough2"); anthems for 10; chant or battle-cry touch per group as 2-3 one-shot sounds in `09c-shouts` (no new music).

## 4. Implementation lanes (parallel, one owner per file)

| Lane | Scope | Files owned | Needs from others | Effort | Smooth |
|---|---|---|---|---|---|
| **L1 Signature units** | RS tunnel-ambush, IR rack truck, IL APS Merkava, KP massed rockets, UA FPV team, TR Bayraktar, DE APS Leopard, RU/CN platoon bonus | new `src/01d-signatures.js` (data rows) + hooks in `03g-modern.js` and `03b-tactics.js` | L2 for faction text | M-L | Medium (drones, rockets) |
| **L2 Faction mechanics** | Shia hidden post + cheap forts, US/IL stronger-fewer, Gulf IADS, Europe perks | new `src/03k-factionmech.js`, `01-data.js` `DOCT`/`FORT_NAT` lines only | none | M | Low |
| **L3 Economy profiles** | Battle uses profile rows; tune with tourney; encyclopedia text | `REAL_TIER` block in `01-data.js`, `03h-economy.js`, `08c-economy.js`, `orch/tourney.mjs` | L2/L1 merged before final tuning | M | Low |
| **L4 Base looks** | three base families + town trim | `04-gfx.js` compound code, new `src/11c-bases.js`, `04c-townlook.js` | none | M | Medium (keep one merged mesh per building) |
| **L5 Unit looks** | camo tints, soldier/vehicle variants per nation | `11-models.js` (SOLV, soldierGear), `11b-jp.js`, `11z-nations-*.js` | none | M | Low (tint only) |
| **L6 Audio** | voices for GB FR DE JP RV OB, 10 anthems, group chants | `vo/`, `mus/`, `09b-radio.js`, `09c-shouts.js` | none | M-L (generation) | None |

Rules for all lanes: smoke + smooth + `cigate.sh` per CLAUDE.md; new sim state into `07b-ckpt.js`; a guard in `orch/decisions.mjs` per decision; remove every old trace (buttons, tooltips, encyclopedia text, AI build lists) in the same ship; Zealous nations never rout; fictional leaders only; no real militant names/flags/emblems; no terror or civilian-target mechanics; free CC0/CC-BY art only.

Suggested order: L2 and L6 start now (no conflicts); L5 and L4 next; L1 after L2 data lands; L3 last so it tunes the finished set.

## 5. Open questions for Abdullah (max 6)

1. **Money in Battle.** Should rich/poor difference show in every Battle, or only when you pick "Realistic"? (a) Light version always on (build time and upkeep only) **recommended**; (b) full REAL_TIER always on; (c) only Realistic (today).
2. **Shia hidden defences.** RV and OB have no tunnels. (a) A small Hidden Firing Post for both, tunnels stay special to IR/RS/DW/KP **recommended**; (b) full tunnels for RV only; (c) none.
3. **Signature units: how to get them.** (a) Build at War Factory/Barracks, max 2-3, General rank gate like the EW truck **recommended**; (b) from rank 1; (c) as a power you call in.
4. **Voices first.** Six nations lack native voices. (a) RV and OB first (your group plays Shia), then the rest **recommended**; (b) all six at once; (c) skip GB/FR/DE for now.
5. **Base look art.** (a) Procedural palette/material swaps, three families, no downloads **recommended**; (b) add free CC0 building models; (c) only Shia look changes.
6. **How much "fewer but stronger" for US and IL.** (a) Stats only (cost/HP/time) **recommended**; (b) add a soft army-size cap; (c) none, keep as today.

## 6. Risks

- Balance: every added signature needs a cost/giveback; the AI-vs-AI win-rate gate decides, not taste.
- Smoothness: any new visible thing must be instanced or merged; drones capped; rocket tracers share one batch.
- Overlap: do not re-add per-nation names, powers, doctrines, morale, upgrades, tunnels, forts, EW, hero squads; they exist (table 2).
