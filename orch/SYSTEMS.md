# SYSTEMS — one system per idea (read before building anything)

Abdullah 2026-11-05 19:34: "Let's get this all done intelligently. Suggest and implement any gaps. For example two militias. Fix that."
Many helpers build in parallel, so the same idea keeps getting built twice. **Before adding a feature, find its row here and EXTEND
the owner. Never add a second system for the same idea.** If your feature has no row, add one (same commit). If you find two
systems doing one job, merge them into the owner and note it here.

## Battle layer (one Conquest battle)

| Idea | ONE owner (where it lives) | Everything below must extend it, not copy it |
|---|---|---|
| **Locals** — town loyalty, unrest, revolts, local armed groups | conquest.md + hearts-minds.md (`src/08c-towns.js`, town code in 03-sim) | Town militia recruit (hearts-minds), revolt rebels (conquest), **Fund Militia** power (tunnels-militia.md), neutral factions / militias (infra-militias), local militias + angry towns arm rebels (politics-intel: `milMake`/`polMilitias` in `src/03e-politics.js`), insurgency + proxy wars (grand6). **One "local armed group" entity** with an `allegiance` (owner / rebels / funded-by-team / neutral), one regional roster + looks, one AI.  **MERGED (integrate1):** every spawn goes through `localSpawn(t,al,kind,x,y,o)` in `src/03-sim.js` (al = `own` / `reb` / `neu` / `fund`, `u.loc` keeps it, one minimap ring); revolt rebels, politics insurgents, neutral militias, town militia and Fund Militia all call it. Still separate (follow-up): the neutral-militia trust/anger state machine (`t.ml`, `milTick`) and `t.mil` / `t.rebU` lists. |
| **Cover** | `coverAt()` / `tactic()` in `src/03b-tactics.js` | Foxholes/sandbags/trenches (tactics), rubble (rubble.md), collapsing buildings (battlefield), wrecks as cover (battlefeel), garrisons  **MERGED (integrate1):** `coverKind(x,y)` (4 rubble/hulk, 3 dug deep, 2 dug, 1 walls/trees) is the one query; `coverAt` = any cover; damage reads it. |
| **Wounded & medics** | `src/03f-battlefield.js` (`G.wnd`, `wndMake` hooked in `applyDmg`) | Combat Medics (every nation, one unit), aid stations at HQ/Depot, squad-mate drag to cover, bleed-out; the old nation `revive` perk only covers blast deaths. Anything new that revives or heals the fallen extends this list |
| **Line of sight blockers** | fog/vision code (06-view + sim vision); **smoke grid + wind + wildfire = `src/03g-battlefeel.js`** (`smokeBlock`, `bfWind`, `fireHit`) | Smoke (`G.smokes`), wind-blown smoke grid (battlefeel), wildfire smoke, night/weather sight multipliers (daynight.md, weather-naval.md) |
| **Conditions** (time of day, weather, season, wind) | daynight.md + weather-naval.md (`G.wx`) | Seasons (real-maps), changing weather / day-night in a match (atmosphere), grand-map seasons (grand4 sets the battle's conditions) |
| **"Knocked out for a while" status** | one status with `{src, until}` on buildings/units | EMP (modern-war: `e.stun` units / `e.dis` buildings), cyber hack (modern-war: `e.dis`, plants `o.sab`; `03g-modern.js`), spy sabotage (politics-intel), blackout from power loss (infra-militias / grand2), vehicle crits (tactics) — one icon style, one minimap marker  **MERGED (integrate1):** `koSet(e,secs,src)` / `koLeft(e)` in `src/03-sim.js` write/read `dis` (buildings) / `stun` (units) / `sab` (power plants); every EMP, hack, sabotage, blackout and crit goes through it; one minimap marker. Open: the old CN/PK `emp`/`cyber` strike powers (03-sim) vs the modern-war EMP/cyber (03g-modern) are still two implementations of the same powers. |
| **Deception** | EW radar spoofs (`spoofs` in 03-sim, `G.spoofs`) | Decoy units (politics-intel), fog-of-war rumours on the grand map (grand6) |
| **Jamming** | existing EW code (grep `jam`, ew in 03-sim/03b) | GPS jamming (modern-war), radio silence / intercepts |
| **World opinion & sanctions** | sanctions.md (Sanctions power + smuggling already exist) | World opinion meter (politics-intel: `T.op`, `opHit()`, `polMul()` in `src/03e-politics.js`) drives sanctions and aid; in a grand campaign the meter lives on the **grand map** (grand2/grand4) and the battle only reports incidents to it |
| **Supply, ammo, convoys, roads** | supply-towns.md + logistics.md (`src/03c-logistics.js`) | Trade caravans (economy1: `src/03h-economy.js`, extends the convoy unit `u.cv`), fuel trucks, loot depots, embargo chokepoints, refugees on roads (politics-intel) |
| **Town economy (food, growth, invest, rebuild, mines, factories)** | economy1.md (`src/03h-economy.js`, per-town `t.fd/lv/gp/inv/dm/em`, `G.ec`) | New town / income ideas extend this and `townIncome`; tax stays in 03-sim, trade income in 03c-logistics |
| **Battle money** | town tax (conquest) + oil/power (infra-militias) | Mines/factories/ports/farms/town growth (economy1). Empire money (bonds, upkeep, oil market, crises, manpower, fuel stock) is **grand map only** (grand2) |
| **Destruction** | rubble.md (destructible cities) + `src/03f-battlefield.js` (building stages `c.stg`, rubble clearing `c.clr`, dams `G.dams` and floods `floodAt()`) | Collapsing buildings stages (battlefield), dams/floods (battlefield), wildfires (battlefeel), scorched earth (grand2) |
| **Doctrines / perks** | doctrines.md (General Doctrines) | Doctrine trees with commander points (command-teams). Grand research tree (grand4) unlocks units/tiers, it must not duplicate doctrine perks |
| **Ceasefire** | in a standalone battle: command-teams (`src/03d-command.js`: `cfOffer/cfAnswer/cfBreak`, `G.truce`; `ally()` honours it, `sameTm()` is the strict team test for vision/victory/aid) | In a grand campaign, truces are made on the grand map (grand4 diplomacy); the battle shows them, doesn't create its own |
| **Commanders** | heroes.md (hero squads + commander radio) | Grand-map generals (grand3) enter battles as the hero/commander unit |
| **AI personalities** | coop-ai.md | Named AI generals, nemesis-style memory if ever added |
| **Spectating** | replay-spec.md (replays + spectators) | Spectate live (modern-war), campaign battle spectators (grand7) |
| **News / announcements** | one news feed component (create in modern-war: battle ticker) | Grand-map turn news (grand5), event pop-ups (grand4) use the same feed/card style |
| **Encyclopedia / unit guide** | identity.md (unit guide) | Encyclopedia (fun-extras) extends the unit guide |
| **Highlights, photo mode, voice commands** | extras.md | Kill-cam highlights, photo album (fun-extras) |
| **Save / host-migration state** | `src/07b-ckpt.js` (ckEncode/ckRestore) | **Every** new sim state must be added here (saves AND host migration depend on it); savegame uses it, never a second serializer |
| **Keys** | controls2.md / Controls rules in CLAUDE.md | Every new hotkey goes in the one key table; no reuse of W A S D, F, G, X, Alt/Ctrl/Shift combos already taken |
| **Morale** | `moraleTick()` / `courageOf()` / `rallyZone()` / martyr banners in `src/03-sim.js` | **National morale styles** (CLAUDE.md): one style per nation as a small data table (`MORALE_STYLE[fac]`) read by moraleTick — Zealous: IR, RS, DW, KP (KP's zealotry is ideological — political-officer/party-banner flavour instead of martyr banners and clerics, same mechanics) · Professional: US, RU, CU, GB, FR, DE, JP, KR, AU, CA, IT, GR, PL, UA, TR, CN, PK, EG, ES, SE, CL · Home defenders: JO, OM, ZA, TH, ET, LY, SD, KZ, TW, KD, VN, BR, NG, ID, SY, IQ, VE, AF, AZ, PH, MX, CO, AR, DZ, MA · **Firepower-reliant** (5th style, Abdullah 20:18 "below Home defenders"): IN, AE, SA, IL — the lowest morale (break sooner, especially without armour/air/artillery support nearby) balanced by stronger fire support (better artillery/air-support response, sturdier modern gear) so total power stays equal (Abdullah 2026-11-05 20:15: RU and CU Professional; 20:16: KP Zealous; 20:18: IN, AE, SA Firepower-reliant; 20:22: IL Firepower-reliant; 20:26: CN, PK, EG Professional, VN, BR, NG, ID Home defenders; 20:28: UA Professional, JO Home defenders; 20:29: OM Home defenders; 20:37: new ES, ZA, SE, CL Professional, TH Strength in numbers, ET, LY, SD, KZ Home defenders; 20:40: ZA, TH Home defenders; 20:41: Strength in numbers style REMOVED (don't build it); this assignment is set — tune numbers inside a style, don't move nations) Grand-map national morale = war weariness (grand6) feeds the starting fear of that nation's troops in Fight-it battles  **BUILT (integrate1):** `MSTYLES` / `MORALE_STYLE` / `msOf(fac)` in `src/01-data.js` (numbers live only there); hooks in `courageOf`, `moraleTick` (home turf, no-support, officer rally), comrade-death fear, damage taken/dealt, shell suppression and martyr/party banners (`zeal`). Nation pick + Encyclopedia show `morale: <style>`. New nations set `morale:` in NEWNAT or are added to the list in `01-data.js` (default Home defenders). The old `COURAGE` table is gone. |
| **Battle plans, battle groups, pings & drawings, quick lines, allied aid** | command-teams (`src/08g-command.js` panel + `src/03d-command.js` sim; keys O, Enter, `,` `.` `/` `'` `;`) | Plans only send ordinary orders; groups extend the control groups 1-9 (`G.sq`); pings/lines are the one team-comms channel (FX `mping/mdraw/say`) |
| **Production** | normal build queues | Smart auto-build (battlefeel: `T.auto`, `bfAutoTick` in `src/03g-battlefeel.js`, panel `src/08h-autobuild.js`, command `auto`), battle groups (command-teams) |
| **Soldier shouts** | `shout()` in `src/03g-battlefeel.js` + `src/09c-shouts.js` (`vo/CODE_s.mp3`) | Commander radio stays in `src/09b-radio.js`; any new battlefield callout is a new key in `BF_SHOUT` + `tools/voices/shout_lines.py` |
| **Wrecks / hulks, wildfire** | `src/03g-battlefeel.js` (`G.bfHulk` on the rubble grid `G.rub`; `G.bfFire`) | Destroyed-vehicle cover/blocking, burning ground; rubble clearing orders remove hulks |

## Grand map layer (campaign)

| Idea | ONE owner |
|---|---|
| Provinces, armies, turns, Fight-it / auto-resolve, save | grand1 (`orch/reports/grand-strategy.md`) |
| Empire economy (all of it) + province buildings | grand2 |
| Generals, front lines, map strikes, fleets & sea zones | grand3 |
| Events, minor nations, seasons, diplomacy, research, cabinet, missions | grand4 |
| 3D map, living map, turn news (uses the shared news feed) | grand5 |
| Fog, spies, proxy wars + insurgency (use **Locals**), war weariness, coups, succession, scenarios, disasters, deterrence, volunteers, refugee flows | grand6 |
| Friends multiplayer | grand7 |
| Grand-campaign state, turn order, armies (unit records `[kind, hp%, xp, ammo%]`), wars, save | grand1: `src/13-grand.js` (`GC`, `grEndTurn`, `grSave`); every later stage adds fields to `GC` and steps to `grFinishTurn`, never a second state or a second turn loop |
| World map data (provinces, sea zones, adjacency, rivers) | `src/13-grandmap.js`, generated by `orch/grandmap-gen.mjs` — edit the generator tables, not the output |
| Fight-it bridge (units in, survivors out; army-only battle; reinforcement waves) | `src/13b-grandbattle.js` + `G.grand` hooks in 03-sim; later stages (generals, forts, supply, sieges) extend `grandBattleStart` / `grandWriteBack` |
| Auto-resolve | `grAuto` in 13-grand.js: same unit lists as Fight it; one function for every stage that changes battle odds |
| Grand map screen, menus, prompts | `src/13c-grandui.js` (`GV`, `grandOpen`); 3D map (grand5, `src/13e-grand3d.js` + baked `13d-grandterrain.js`) draws it, keeps the panels |
| Grand-campaign state, turn order, armies (unit records `[kind, hp%, xp, ammo%]`), wars, save | grand1: `src/13-grand.js` (`GC`, `grEndTurn`, `grSave`); every later stage adds fields to `GC` and steps to `grFinishTurn`, never a second state or a second turn loop |
| World map data (provinces, sea zones, adjacency, rivers) | `src/13-grandmap.js`, generated by `orch/grandmap-gen.mjs` — edit the generator tables, not the output |
| Fight-it bridge (units in, survivors out; army-only battle; reinforcement waves) | `src/13b-grandbattle.js` + `G.grand` hooks in 03-sim; later stages (generals, forts, supply, sieges) extend `grandBattleStart` / `grandWriteBack` |
| Auto-resolve | `grAuto` in 13-grand.js: same unit lists as Fight it; one function for every stage that changes battle odds |
| Grand map screen, menus, prompts | `src/13c-grandui.js` (`GV`, `grandOpen`); 3D map (grand5, `src/13e-grand3d.js` + baked `13d-grandterrain.js`) draws it, keeps the panels |

**Bridge rule:** a "Fight it" battle is a normal Conquest battle whose start state (forces, towns, buildings, money, conditions,
locals' loyalty) comes from the province, and whose results go back. Battle systems are never re-implemented on the grand map, and
empire systems never inside a battle.

| **HUD** | `src/08i-hud.js` (integrate1) | ONE top bar (money, income, supply, opinion, Alerts) + ONE alerts feed (`pushLog` -> `hudAlert`, kinds `bad`/`w`) + overlay switcher (`OVL.*` flags read by the draw code: towns, supply (=L), opinion, sonar, mines). New alerts need nothing extra: log them with kind `bad`/`w`. New overlays: add a flag to `OVL` + `HUD_OV` and guard the draw call. |
| **What's new** | `WHATS_NEW` in `src/08i-hud.js` | One list, newest first; the menu button opens it |

## Known gaps (being fixed by the integration helpers)
*integrate1 status (2026-11-06): 1 partly done (Locals spawner, knocked-out status, cover, HUD merged; Deception, Jamming, Spectating/News/Encyclopedia merges still open), 2 HUD done except separate economy/unrest/front-line overlays, 3 What's new done (tutorial steps + tooltips + encyclopedia entries for new systems still open), 4 sounds open, 5 savetest hash now covers locals/knocked-out/morale state, 6 keys open, 7 smooth-pc passes, 8 DONE, 9 DONE (see orch/reports/integrate1.md).*
1. Duplicates above merged in code (Locals first).
2. One HUD: a single top bar, one alerts feed, toggleable map/minimap overlays (economy, supply, unrest, opinion, sonar, mines…).
3. Teaching: tutorial + tooltips + encyclopedia entries for every new system; a grand-campaign tutorial.
4. Sound for new systems (EMP, cyber glitch, sonar ping, fire, flood, medics, convoys) — free CC0/CC-BY, credited.
5. Saves/host migration cover every new state (savetest in the gate).
6. Key conflicts checked by the controls gate.
7. Per-system performance budget kept inside smooth-pc / server headroom.
9. **Remove from Conquest battles** (Abdullah 20:58 — they move to the grand map, see GRAND-PICKS): the cleric unit (Ayatollah / Dear Leader), the Mountain Fortress building/standalone fortress map entry and the Bunker Buster power — from build lists, powers, AI, encyclopedia, tutorial; morale: drop the 'Ayatollah' rally zone and "unbreakable while the Ayatollah lives" but keep the Zealous style; keep campaign missions working (mission-scripted versions); old saves with these units load without crashing; balance re-checked.
8. **National morale styles** (Abdullah 20:01) — build the `MORALE_STYLE` table + moraleTick hooks for all live nations, show the style on the nation pick screen and in the encyclopedia, AI aware of it, balanced (integration helper 1; nation helpers set theirs).
