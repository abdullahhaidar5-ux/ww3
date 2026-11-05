# HEARTS & MINDS — branch `orch/hearts-minds` (2026-11-05)

Builds on Conquest (town tax + unrest). Abdullah approved 2026-11-04 20:13 ("do all this") and added HOME TURF at 20:20. All of it is
social / territory only: **no damage, HP or income-rate bonuses** beyond what unrest already does. Sim code is all in `src/03-sim.js`
(block "HEARTS & MINDS", constants in `HM`); UI in `src/08c-towns.js`; tower model in `04-gfx.js`; tower placement in `02-map.js`.

## What a player gets

1. **Local recruits** — a town that is **loyal** (unrest < 30, held ≥ 2 min, population > 30 %) shows a *Recruit <local militia>* button on its
   panel: $70 (home turf $60) per fighter, instantly at the town, **cap 4 alive per town**, 6 s between recruits, 80 % HP of a rifleman.
   Same numbers for all 18 nations; only the name differs: IR *Volunteer Mobilization Fighters*, RS *Village Defence Fighters*, DW *Tribal
   Volunteers*, US/EU *Local Auxiliaries*, UA *Territorial Volunteers*, RU *Local Militia*, CN *People's Militia*, KP *Worker-Peasant Militia*,
   IL *Territorial Reservists*, everyone else *Local Defence Volunteers*. (No real organisation names.) **Not done:** a distinct irregular
   uniform/model per nation — they use the nation's normal infantry model (a visual pass would need new models; flagged for the art squad).
2. **Informants** — every 6 s each loyal town of a human player reports enemy troops within **700 m** (clusters of up to 5, count shown) as an
   orange diamond ping on the minimap after a 2 s delay; restless towns report nothing. Allies share pings. (AI teams skip it - saves CPU.)
3. **Collateral damage** — any explosion (shell, rocket, bomb, missile strike) inside a town: population −0.12 % × impact points (30 shells ≈ −8 %),
   which scales the town's tax for its owner; **anger against the firer** (per side, 0-100, decays 0.1/s) adds to unrest when that side owns the
   town and slows that side's capture by up to 41 %. Message: "Civilian casualties in X - locals turn against you" (+ minimap ping, 12 s throttle);
   the owner sees "Enemy fire is killing civilians in X - the locals blame them". Population regrows 0.12 %/s. AI artillery never fires at its own towns.
4. **Bribe the elders** — button on an enemy-held town panel at unrest ≥ 50: price = $700 town / $250 hamlet × (1.15 at unrest 50 → 0.6 at 100),
   ×1.25 against a home-turf owner. Town flips without a fight, enemy garrisons are **ejected not killed**, no capture treasury, 150 s cooldown per
   team, refused during the setup phase. AI buys the cheapest restless enemy town when it has the price + $1500.
5. **Propaganda towers** — 1 neutral radio mast per map (duel: the spot equally far from both bases, or a mirrored pair; 3+ bases: the most equal-route
   spot - same placement code as the oil/hamlets). Hold a unit within 70 for 10 s to capture. Towns within 900 m: enemy ones +0.5 unrest/s, yours −0.35/s.
   Station names are generic per nation (e.g. IR *Voice of the Plateau*, US *Heartland Radio One*, RS *Voice of the Mountain*, DW *Coffee Coast Radio*).
   The mast lamp blinks in the owner's colour, label + capture bar in the world, antenna icon on the minimap. AI sends idle units to the nearer prize
   (tower or town).
6. **Smuggling tunnels** (IR, RS, DW, KP — every faction with `tunnels`) — a town with ≥ 2 finished tunnel entrances of which one is within 700 m is
   flagged `t.sm`. Logistics is **not on main yet**, so this is a clean hook only: `townSupplied(t)` returns true if `!t.cut || t.sm`; when the logistics
   squad sets `t.cut` for an encircled town, penalties should skip towns where `townSupplied` is true. The town panel says "stays supplied even if cut off";
   an enemy with Ground-Penetrating Radar sees "found a smuggling tunnel under this town". No numeric bonus today, so no Shia balance change.
7. **Home turf** — see table. Locals favour the home nation(s) of the map: its unrest rises **35 % slower** and falls 25 % faster in its towns, it
   captures there **25 % faster**, informant radius ×1.3, recruits −15 %, bribes against it +25 %; a stranger facing a home nation has unrest rising
   +15 % faster. **Mirror match** (both home, or neither) = no effect. Lobby map picker shows "Home turf: Iran", town panel "Locals favour Iran - you are on home turf".
8. **AI uses it**: recruits in loyal towns when enemies are near or the garrison is thin, bribes, captures towers, artillery avoids own towns.

Also shipped: tutorial tip "Hearts and minds" (done when you own a loyal town); fixed a Conquest bug — `cleanCmd` dropped the town index `ti` and rate
`r` of the `tax` command, so clients' tax clicks reached the host as town 0 / Low (now carried; also needed by recruit/bribe).

## Home-turf map table (for Abdullah to check; `home:` in `src/02-map.js`, shown in the picker)

rivers IR+RS · delta EG · gulf SA+AE · plateau (Sinai) EG · hormuz IR+AE · zagros IR · lebanon RS+IL · persia IR · mesopotamia IR+RS · yemen DW+SA ·
volga RU · heartland US · bosphorus TR · golan IL · fulda EU · dnipro UA · rubalkhali SA · emirates AE · indus PK · kashmir IN · taiwan CN · dmz KP+KR ·
nile EG · caribbean CU · khyber PK · euphrates RS+IR · caspian RU+IR · aleppo RS+TR · anatolia TR · babelmandeb DW+SA · taiga RU · hawizeh IR+RS ·
caucasus RU · crimea UA+RU · punjab PK+IN · najd SA · ural RU · aegean TR+EU · yangtze CN · kuwait SA+AE · rhine EU · hindukush PK+IR · gulfoil AE+IR.
**I added** rivers, delta, gulf, plateau, zagros (the rest already existed). No home nation (neutral): strait, oasis, arctic, islands, sahara, coral, harbour, atoll.
Per-town affinity for mixed regions is **not** implemented (affinity is per map); a Shia-majority-town rule would need town metadata - open.

## Fairness evidence

**Home turf** (`node orch/hearts-turf.mjs --seeds 4 --minutes 14`): 8 home nations on their home map vs non-home AI opponents, effects ON vs OFF with identical seeds/slots,
8 games per cell, 64 per arm (std. error ≈ ±6 points):

| home : map | ON | OFF |
|---|---|---|
| IR zagros | 50 % | 50 % |
| RS lebanon | 63 % | 50 % |
| DW yemen | 31 % | 31 % |
| TR bosphorus | 56 % | 69 % |
| UA dnipro | 38 % | 38 % |
| EU fulda | 88 % | 100 % |
| KR dmz (mirror with KP only if KP plays) | 75 % | 88 % |
| PK indus | 44 % | 44 % |
| **all** | **55.5 %** | **58.6 %** |

Target was ≤ 55-57 %: met (55.5 %), and the effect itself is not measurable in AI-vs-AI games (−3 ± 8 points) - the AIs hold only ~1 town each at minute 14, so
this proves "no runaway", not "no effect". The per-nation base-rate differences (EU 100 %, DW 31 %) exist with turf OFF too - that is faction/map balance, not turf.
Human games with more town fighting will feel it more; the caps are modest on purpose (35 % / 25 % / 15 %); tune in `HM.TURF`.

**18 nations** (`node orch/aitourney.mjs --minutes 12 --maps strait,fulda,zagros,persia`, 153 games, 17 per nation, Normal AI): win % AE 71, EU 65, IR 65, KR 65, UA 56,
US/PK/IN/CU/DW 50, IL/RU/SA/RS 47, TR 44, KP 41, CN 32, EG 24 (std. error ≈ ±12 points per nation, 12-min cap, 54 draws). Shia: IR 65, DW 50, RS 47.
**Not equal yet**: EG/CN low and AE/EU/IR/KR high - I did not run a pre-change baseline, so I cannot say how much is Conquest's economy vs this branch (this branch only adds
militia/bribes/towers that the AI barely uses); needs a longer tourney (`--rounds 3`) on a bigger machine plus the Conquest tuning already listed in `reports/conquest.md`.

## Cloudflare server CPU

Measured in an 8-player all-AI Conquest battle on `kuwait` (`node orch/hearts-cpu.mjs`, 600 sim seconds): Hearts & Minds code total ≈ **0.23 ms per sim-second**
(updTowers 0.049, hmTick 0.042, turfOf 0.044, townSmuggle 0.053, collateral 0.014, recruit/bribe 0.024) against ≈ 1.0 ms for `updTowns` and ≈ 100 ms for the whole
step on this 2-core box (loaded with other jobs). Negligible vs the budget in `reports/cf-battle-server.md` (8 sides avg 1.4 ms per event). Net payload: +`3+N` ints per town per teamGlobals change.

## Netcode

New command types `recruit`, `bribe` (CMD_T); new teamGlobals block `hm` (population, loyal flag, smuggling flag + militia count, anger per team per town; tower owners/capture progress;
bribe cooldowns); host-migration checkpoint carries population, anger, tower owners, cooldowns. No RNG; all updates in fixed order in the host sim. **Sim change → needs `main → servers-live` PR.**

## Open / not done

- Distinct irregular models/uniforms for the militia; a tower can't be destroyed (capture only); informants don't reveal units in the fog (minimap ping only).
- Per-town affinity (Shia-majority towns on mixed maps); AI doesn't lean on home-turf towns beyond the cheaper recruits/bribes it gets automatically.
- Logistics hook (`townSupplied`) waits for orch/logistics; screenshots of the 3D militia are of the normal infantry model.
- Tools: `orch/hearts-t1.mjs` (mechanics probe), `hearts-turf.mjs`, `hearts-cpu.mjs`, `heartsshots.mjs` (→ `orch/shots/hearts-minds/`).
