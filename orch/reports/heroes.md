# Hero squads + commander radio (orch/heroes, 2026-11-05)

Abdullah approved 2026-11-04 19:38: one elite squad per nation with one special ability, and short commander radio callouts in each language.

## Hero squads
- New unit kind `champ` ("Hero Squad"), trained at the Barracks by **every** nation (data: `BASE.champ`, `HEROES`, `HAB` in `src/01-data.js`; logic: `src/03c-heroes.js`).
- Same for all 18: $1,800, 24 s, 560 HP, unlocked at **General rank 3** (`HERO_RANK`, no tech), **max one alive** (also none queued), **150 s wait** after it falls (`HERO_REBUY`, `T.hrb`), ability cooldown **90 s** (`HERO_CD`). Nation mods (cost) never change it (`stats()` pins the cost).
- Each nation has its own name, uniform colour (`CHAMP_TINT`), and one ability, used with the card button "★ …" or **E**:

| Ability | Nations | Effect |
|---|---|---|
| Precision strike | US, EU, UA, KR | 3 shells on the nearest enemy group within 500 m |
| Plant charges | RU, PK, CN, EG | nearest enemy building within 150 m, blows after 3 s for a third of its HP (max 1500) |
| Rally the line | IR, TR, KP | infantry within 300 m heal 25%, lose fear, +25% damage 10 s |
| See through the fog | IL, SA, AE | 520 m reveal for 12 s + enemies marked (+25% damage) |
| Ambush | RS, CU, IN | squad + infantry within 220 m: double damage, -33% damage taken, 8 s |
| Turn the town | DW | nearest enemy/neutral town within 260 m changes sides, garrison sent out (Conquest) |

  Names: Delta Force Operators, Spetsnaz Assault Group, IRGC Special Forces, Radwan Commander Squad, Veteran Militia Commander, Sayeret Recon Team, Maroon Beret Commandos, EU Special Forces Détachement, SSO Special Operators, Royal Special Forces, Presidential Guard SF, SSG Commandos, Para SF Commandos, PLA Special Forces, Storm Corps Veterans, 707th Special Mission Team, Unit 777 Commandos, Black Wasps. Generic soldiers only, no real people.
- Looks: the soldier model at 124% size (silhouette), dark nation-coloured kit, a **gold star** over its head (brighter when the ability is ready), a gold "HERO" tag in lists.
- Multiplayer: the ability is a host-authoritative command (`hab`), cooldowns and the rebuy wait ride in the team message (`hc`, `hb`), `NET_PV` 8. Cloudflare battles need the `main → servers-live` PR (sim changed).
- AI (`aiHero`): trains its hero at rank 3 when it has $2,400+, uses the ability when 3+ enemies (1 for recon) are within 420 m, flips/charges whenever ready.
- No fighting abilities during the 90 s Conquest setup.
- Probe: `node orch/heroes-probe.mjs` (all 18 nations train/limit/rebuy/ability + AI) → HEROES PASS.

## Commander radio
- Events (`log(team,msg,'r:<key>')`; `pushLog` → `radioCall`, `src/09b-radio.js`): base under attack, enemy aircraft inbound, enemy armour left / right flank (relative to the line from our HQ to the nearest enemy HQ, seen enemies only — `radioScan` in `03c-heroes.js`, human teams only), town taken, town lost, enemy missile launch (existing "inbound" warning), unit lost, hero ready, + the hero's own lines (select / move / attack / ability).
- Throttle: per-key gap (air 45 s, flanks 40 s, base 25 s, unit lost 25 s, towns 10 s, missile 8 s), never two callouts within 5 s, never over a voice line already playing (missile and ability may), host-side 6 s gap in the scan.
- Subtitle: small box at the top centre, "RADIO" + the line in the nation's language + the English underneath, 3.6 s. Shown for all 18 nations even before a nation's voice sheet exists; then the old voice cue ("under attack", "unit lost", "ready") still plays as before.
- Voices: `vo/<CODE>_h.mp3` (13 lines per nation: 9 callouts + 4 hero lines), same pipeline as the role voices (`orch/vo/roles.py` with `VO_LINES=radio_lines VO_SUF=_h VO_TAKES=2`, lines in `tools/voices/radio_lines.py`, offsets `VOH`, subtitles `RADT/RADE` written by `tools/voices/patch_map.py`). Deep male commander (cmd voice, tough chain), shouted variant for alarms, **max 2 takes per line with Whisper read-back QC**. Shia factions IR / RS / DW first.
- Hero lines use the nation's elite-soldier voice. Shia heroes carry slogans (Ya Abal-Fadl, Ya Ali, Ya Hussein, Ya Zahra).

## Notes / caveats
- No human listening yet: samples in `orch/voices-heroes/`. Persian (Piper) lines read back with CER 0.2–0.5 on 8 of 13 lines (Whisper is weak on Persian; same as earlier passes).
- Screenshots: `orch/shots/heroes/` (IR RS DW US RU KP + two callout subtitles + a phone view).
- `cigate.sh` needs an authenticated `gh`, which this cloud run lacks: gates run here were smoke, smooth, heroes probe; CI statuses read via the GitHub tool.
