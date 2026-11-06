# Signature assets — one unique grand-map special per full nation (Abdullah 2026-11-05 21:02: "I don't like all countries having the same thing")

**Rules.** No nation copies another's special. Kinds differ on purpose. Every signature is worth roughly the same: **≈ +4–5 % of
empire strength** (income-equivalent for economy kinds; fight-equivalent for military kinds). Balance is checked by `orch/grandtest.mjs`
(per-nation income/upkeep print) and, for military kinds, later by the balance tourneys. New-nation helpers: add your nation's row
(a nation with no row gets none — never copy a neighbour's).

Kinds → who builds them: **E** economy / building (grand2 — **live**, table `GR_SIG` in `src/13g-grandeco.js`) ·
**M** military / strike (grand3) · **P** leader / political (grand6). Hard rules from Abdullah: the clerical leader (Ayatollah) only
IR/RS/DW; the Dear Leader only KP; the **Mountain Fortress** (a province building, E) only IR, RS, AF, KD, DW, KP; the **Bunker Buster**
(M, a grand-map strike on fortified provinces) only US, IL, RU, CN.

| Nation | Signature asset | Kind | One-line effect | Built by |
|---|---|---|---|---|
| US | Reserve Currency | E | War-bond interest halved; the best credit in the world | grand2 live |
| US | Bunker Buster | M | Strike that halves a fortified province's forts/garrison cover | grand3 |
| TR | Drone Fleets | M | Cheap drone swarms from any airfield: scout + strike without sorties | grand3 |
| IL | Tech Exports | E | +60 money per turn for each airfield / air-defence site it owns | grand2 live |
| IL | Bunker Buster | M | Same strike as US/RU/CN (one of the four) | grand3 |
| UA | Breadbasket | E | Food output +30 %; surplus grain sold for money | grand2 live |
| RU | Salvage Corps | E | Battle salvage doubled (wrecks → money) | grand2 live |
| RU | Bunker Buster | M | Same strike (one of the four) | grand3 |
| IR | Sanctions-Busting Networks | E | Smuggling under sanctions is free and recovers 80 % of lost trade | grand2 live |
| IR | Ayatollah | P | Leader figure: morale/loyalty, tours provinces, Fight-it battles start with fervour | grand6 |
| IR | Mountain Fortress | E | Province building (mountain provinces only) | grand2 live |
| RS | Mountain Fortress | E | Province building (mountain provinces only) | grand2 live |
| RS | Ayatollah | P | Leader figure (clerical) | grand6 |
| DW | Mountain Fortress | E | Province building (mountain provinces only) | grand2 live |
| DW | Ayatollah | P | Leader figure (clerical) | grand6 |
| SA | Swing Producer | E | Oil sells +25 % above the market and never depresses it | grand2 live |
| AE | Free-Trade Hubs | E | Trade income +25 % | grand2 live |
| PK | Remittance Flow | E | +8 % income that cannot be blockaded or looted | grand2 live |
| IN | Demographic Dividend | E | Manpower growth +30 % | grand2 live |
| CN | Factory of the World | E | Factory income +40 % and recruits 8 % cheaper | grand2 live |
| CN | Bunker Buster | M | Same strike (one of the four) | grand3 |
| KP | Juche Autarky | E | Immune to sanctions; rationing costs no unrest | grand2 live |
| KP | Dear Leader | P | Leader figure (loyalty, high war support) | grand6 |
| KP | Mountain Fortress | E | Province building | grand2 live |
| KR | Chaebol Savings | E | Central-bank reserve earns 3 % a turn (others 1 %) | grand2 live |
| EG | Canal Tolls | E | +70 money per turn for each strait it holds | grand2 live |
| CU | Revolutionary Militias | P | Home provinces raise free garrison units under attack | grand6 |
| IQ | Oil-for-Reconstruction | M | Rebuilt garrisons: lost garrison units regrow twice as fast in own provinces | grand3 |
| SY | Tunnel Networks | M | Armies in own provinces may "dig in": big defence bonus in auto-resolve | grand3 |
| JP | Just-in-Time Logistics | E | Army upkeep −12 % | grand2 live |
| GB | Merchant Fleet | E | One extra merchant steering trade flows | grand2 live |
| FR | Nuclear Grid | E | Power plants produce +60 % (rare blackouts) | grand2 live |
| DE | Precision Engineering | E | All province buildings cost 20 % less | grand2 live |
| PL | Eastern Shield | M | Border-province fort zones: first fort of each frontier province is free | grand3 |
| AZ | Caspian Pipeline | E | Pipeline crossing: oil output +15 % and safe from strait closures | grand2 live |
| JO | Desert Patrol Rangers | M | Cheap desert recon bands extend fog-free sight one province | grand3 |
| KD | Peshmerga Highland Guard | M | Mountain-province garrisons start veteran | grand3 |
| KD | Mountain Fortress | E | Province building | grand2 live |
| TW | Silicon Shield | P | Great powers hesitate to declare war on it (diplomacy cost for attackers) | grand6 |
| VN | Tunnel & Jungle Ambush | M | First battle in jungle/forest provinces: attacker hit with an ambush volley | grand3 |
| AU | Mining Boom | E | Mine income +50 % | grand2 live |
| PH | Overseas Workers | E | Manpower and income both +4 % in coastal provinces | grand2 live |
| BR | Biofuel Programme | E | +3 fuel per farm province per turn | grand2 live |
| VE | Heavy Crude | E | Oil output +35 % but sold −20 % | grand2 live |
| MX | Border Maquilas | E | Province buildings finish one turn sooner | grand2 live |
| CA | Resource Royalties | E | +5 % income from oil and mines, immune to embargo losses on them | grand2 live |
| DZ | Gas Pipelines | E | Gas exports: +40 money per oil province, unaffected by oil price | grand2 live |
| MA | Phosphate Reserves | E | +10 % food and +3 % income, immune to harvest crises | grand2 live |
| NG | Delta Oil Militias | M | Oil provinces raise local guards; hard to scorch | grand3 |
| OM | Neutral Port Diplomacy | P | Can trade with nations at war with each other | grand6 |
| IT | Naval Dockyards | M | Fleets in own ports repair fully each turn | grand3 |
| GR | Merchant Marine Lobby | E | Ports earn +30 % | grand2 live |
| ID | Archipelago Ferries | M | Armies cross sea zones one turn faster | grand3 |
| AF | Mountain Fortress | E | Province building | grand2 live |
| AR | Grain & Beef Exports | E | Farm provinces +25 % income | grand2 live |
| CO | Coffee & Emeralds | E | +45 money per turn per mine/farm province pair neighbouring | grand2 live |
| ES | Expeditionary Marines | M | Seaborne landings suffer no sea attrition | grand3 |
| ZA | Gold Reserve | E | Central bank reserve cannot be looted; mines +15 % | grand2 live |
| TH | Rice Surplus | E | Food +25 %, rationing never needed | grand2 live |
| ET | Highland Defence | M | Mountain provinces: garrisons +1 unit | grand3 |
| LY | Desert Raiders | M | Desert armies move one turn faster | grand3 |
| SD | Nile Militias | M | Garrisons double when a province is attacked the first time | grand3 |
| SE | Neutral Industry | E | Factories +20 %, no war-time unrest rise | grand2 live |
| KZ | Steppe Reserves | E | Oil and mines +10 %; manpower +10 % | grand2 live |
| CL | Copper Exports | E | Mines +35 %, other trade −10 % | grand2 live |

Minor nations (no unique army/voices) have no signature asset. **EU** retires as a nation (FR/DE/PL carry its traditions); on the grand map
the European Union is an alliance (grand4b).
