# Weather + deeper naval warfare + 4 naval maps (branch orch/weather-naval)

## 1. Weather Conditions
The game already had *rolling* weather (rain/fog/sandstorm/blizzard that comes and goes, random). New: three **fixed Conditions** in the
skirmish Conditions row — **Sandstorm**, **Rain**, **Snow** (menu ids 6/7/8). Battle weather stays that kind the whole fight
(`G.fixWx`, set from the setup id on every machine; `wx`/`fixWx` are in the checkpoint list so host migration keeps it).
- Sandstorm: vision −45%, accuracy −20%, jets grounded, helis/drones weaker, brown haze + blowing sand (existing visuals).
- Rain: vision −20%, accuracy −10%, mud slows ground units 12%, rain streaks.
- Snow (new kind `snow`): vision −20%, accuracy −8%, ground units −10% speed, aircraft −20%, white haze + falling snow (35 flakes/s on Low graphics, 70 otherwise).
- Clear / Golden / Overcast / Dusk / Night / Changing / Random untouched; battles with them play exactly as before (the default rolling weather is unchanged).
- Optional "changing weather": the default (non-fixed) conditions already roll through weather during a battle.

## 2. Naval warfare
- **Submarine** (new unit, every faction with a navy; own name per nation, e.g. Virginia / Yasen / Type 039 Yuan, Iran's *Ghadir Midget Submarine*): 560 HP, $1500, slow, torpedoes (range 340, 200 dmg, splash) that hit **ships only**. Hidden from the enemy until it fires (revealed ~2.5 s) or an enemy warship (sonar 300), gunboat (170), coastal battery (260) or sub (230) gets close. Only ships, boats, helicopters and batteries can shoot it; land units and jets cannot.
- **Coastal missile battery** (new building, every nation, own name, e.g. Naval Strike Missile / Bastion-P / Noor-Qader / Mountain Anti-Ship Rockets): $1000, on the shore, range 520, hits ships/boats/landing craft only, sonar 260.
- **Iran (IRGC style):** fast attack boats (+18% speed, −12% cost, +15% damage), midget subs (cheaper, quicker, weaker), coastal missiles.
- **Offshore oil rigs:** oil derricks on small rock pads out at sea (`oilAt` entries with a 3rd value 1 → `sea:1`). Infantry from a landing craft **or a ship parked beside** the rig (within ~125) can capture it; AI sends a gunboat to take unowned rigs.
- **Landings:** transports unload on the nearest shore within a wider ring (290 units), so beach landings no longer fail when the craft stops a bit offshore. The AI already used landing craft on open-sea maps (Normal/Hard); it now also builds submarines (~25% of its fleet once an enemy navy exists or after 10 min) and one coastal battery (two on Hard) next to its shipyard.
- Tested in the headless sim: a sub stays hidden at 300 range, torpedoes a gunboat and a destroyer, is revealed when it fires.

## 3. Naval maps (all 'point' symmetric, shipyard coast for every player, land route + sea route + landing option)
| Map | Players | What it is |
|---|---|---|
| Coral Archipelago (`coral`) | 2 | two island homes, four islets + central isle, narrow straits, bridges (two land routes), 2 offshore rigs + 5 island derricks |
| Hormuz Narrows (`hormuz`) | 2–4 | desert strait, two coasts, rock island with a bridge, 2 rigs in the channel, bridges at both ends |
| Delta Harbour (`harbour`) | 2–4 | channel between two open bays, island district, 2 bridges, 2 bay rigs, landings from the bays |
| Pacific Atolls (`atoll`) | 6–8 | eight island bases in an ocean ring, bridges round the ring and to the centre, 4 rock-pad rigs |

Static check (`mapfair --static`, `mapsweep --static-only`): all layouts even and PASS. AI-vs-AI (Normal, 14-min cap, nations rotated through every start position, 114 games, `orch/mapfair.mjs --battles`; mixed with the newest main merged mid-run):

```

BATTLES map            n games  kills  win share by start position (fair = 1/n)        score share by position     avg-min
  atoll           6    18      0   33  11   6   6  22  22                         32  15   2   0  34  16     14.0 p=0.247
  atoll           8    24      0   12   8   8   8  24  24   8   8                 18  15   5  10  25  22   2   3 14.0 p=0.367
  coral           2    16     13   50  50                                         48  52                     10.8 p=1.000
  harbour         2    16     13   63  38                                         67  33                     10.8 p=0.317
  harbour         4    12      0   15  48  23  15                                 22  40  23  15             14.0 p=0.310
  hormuz          2    16     14   66  34                                         66  34                     10.9 p=0.211
  hormuz          4    12      3   56  15  23   6                                 53  21  19   7             13.9 p=0.075
BATTLES 114 games, 7 layouts; a start position wins significantly more than its share (p<0.01, >1.5x fair): none
pooled duel seat: position 1 won 41, position 2 won 26 (of games decided between the first two seats)
```
No start position wins significantly more than its share (p<0.01 rule). Duels lean a little to position 1 (hormuz 66/34, harbour 63/38, p≈0.2–0.3; coral 50/50). Big games mostly end on the 14-min clock (adjudicated by force), 8-player atoll positions 5-6 look strong (24% vs 12% fair) on 24 games — worth another round later.

## Notes / not done
- No new sub / battery 3D models: both are procedural (box) shapes; there are no free sub models in `models/`. A CC-BY sub model would be a good follow-up.
- Torpedo is a slow foam-trailed projectile, no special underwater sound yet.
- Snow on non-snow maps only gets white haze + flakes (ground stays its own colour).
- `orch/mapsweep.mjs` now skips the "unreachable by land" check for sea rigs. Screenshots: `orch/shots/weather/` (made by `orch/weathershots.mjs`).
- Sim changed (03-sim, 01-data, 02-map, 07b) → a `main → servers-live` PR is needed for Cloudflare battles to get it.
