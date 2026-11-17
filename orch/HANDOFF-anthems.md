# HANDOFF — anthems (2026-11-17, branch orch/anthems)

Goal (Abdullah 2026-11-17 16:49 "Work on these now"): every one of the 22 playable nations plays its anthem at battle start and on victory.
Before: 12 of 22 had one (US FR DE IL UA RU CN IN JP KR PK EG). Missing: GB IR RS DW RV OB KP SA AE TR — nine added here; **KP still open** (see below).

Each excerpt: `mus/an_<CODE>.mp3`, 26 s from the start (fade-out last 4 s), mono 32 kHz 56 kb/s, loudnorm -18 LUFS target
(measures -19…-21 LUFS like the old ones), cut by `python3 mus/an_pack.py <download-dir> [CODE…]`. The same file plays at battle
start and as the victory cue (existing anthem player in `src/09-audio.js`, unchanged). Credits: `AN_CRED` in `src/09-audio.js`,
shown as one menu-credits paragraph (`#anCred`). Guard: `orch/decisions.mjs` "anthems" — every PLAYABLE nation needs the file,
an `AN_FAC` entry, an `AN_CRED` credit and a source row in `mus/an_pack.py`.

| Nation | Piece | Recording / source | Licence (checked on the file page) |
|---|---|---|---|
| GB | God Save the King | US Navy Band — https://archive.org/details/us-navy-band-national-anthems-public-domain (Current/United Kingdom.mp3); same recording on Commons: File:U.S._Navy_Band_-_God_Save_the_King.oga | Public Domain Mark; Commons: PD-USGov-Navy + PD-old-100 |
| IR | National Anthem of the Islamic Republic of Iran (Hassan Riahi) | US Navy Band 2000 recording — same archive item, Removed/Iran (2000).mp3 | Recording PD (US Navy work, Public Domain Mark). Composition: Iran has no copyright treaty with the US (Commons hosts the anthem as PD in the US) |
| RS (Lebanese Shia, fictional) | National Anthem of Lebanon (Wadih Sabra, d. 1952) — the Lebanese state anthem, never an armed group's song | US Navy Band — archive item Current/Lebanon.mp3; Commons File:National_Anthem_of_Lebanon.ogg | PD-USGov-Navy + PD-old-70 |
| DW (Zaidi Shia Movement = Yemen, fictional) | National Anthem of Yemen (Ayoob Tarish) — state anthem | US Navy Band — archive item Current/Yemen.mp3 | Recording PD (Navy). Composition: Commons tags the Yemeni anthem PD-Yemen (File:National_Anthem_of_the_Republic_of_Yemen_(instrumental).oga) |
| RV (Iraqi Shia Brigades, fictional) | Mawtini (Mohammed Flayfel), anthem of Iraq — opening | US Navy Band — archive item Current/Iraq.mp3; Commons File:United_States_Navy_Band_-_Mawtini.ogg | PD-USGov-Navy + PD-Iraq |
| OB (Palestine Islamic Brigade, fictional) | Mawtini — a later verse (from 52.5 s) of the same recording; poem by the Palestinian poet Ibrahim Tuqan, long the Palestinian people's anthem | as RV | as RV. Chosen instead of "Fida'i": the only Commons recordings of Fida'i are CC BY-SA (not allowed) or CC BY "licence review needed". No real armed group's song |
| KP | Arirang (traditional Korean folk song) — North Korea's 1947 anthem "Aegukka" (Kim Won-gyun, d. 2002) is still in copyright and has no free recording | US Army Chorus, "Songs of the Soldier" (2005) — Commons File:Arirang.ogg | PD-USGov-Military-Army; song traditional. **NOT YET IN THE GAME:** Wikimedia's file server answered 429 "too many requests" for every download from this sandbox all session. To finish: download File:Arirang.ogg to `<dl>/an/KP.ogg`, run `python3 mus/an_pack.py <dl> KP`, add `KP:1` to AN_FAC and `KP:'Arirang (traditional; United States Army Chorus)'` to AN_CRED in src/09-audio.js (plus "Arirang: United States Army Chorus, Songs of the Soldier (public domain)" in the anCred text), and remove `AN_PENDING=['KP']` in orch/decisions.mjs (the guard fails once the file exists while KP is still pending) |
| SA | Aash Al Maleek | US Navy Band — archive item Current/Saudi Arabia.mp3; Commons File:Saudi_Arabian_national_anthem,_performed_by_the_United_States_Navy_Band.oga | PD-USGov-Navy; composition PD in US (no notice before 1989 / not renewed) |
| AE | Ishy Bilady | US Navy Band — archive item Current/United Arab Emirates.mp3; Commons File:UAE_national_anthem.ogg | PD-USGov-Navy + PD-United Arab Emirates |
| TR | Istiklal Marsi | US Navy Band — archive item Current/Turkey.mp3; Commons File:Istiklâl_Marsi_instrumetal.ogg | PD-USGov-Navy + PD-old-60 / PD-old-80-expired |

Note: older `mus/an_pack.py` notes skipped TR/SA/AE/IR as "composition not clearly public domain"; this pass follows the Commons
file-page tags above (Commons keeps only files free in the US and the source country). If Abdullah wants the strict reading,
drop those four from AN_FAC/AN_CRED, delete their files and add them to AN_PENDING in the guard; they then play no anthem.

Next ideas: a shorter separate victory sting per nation (currently the same 26 s excerpt plays on victory).
