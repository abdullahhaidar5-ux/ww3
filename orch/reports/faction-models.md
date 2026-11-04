# Faction-unique helicopters and warships (JOB B, 2026-11-03)

Source: Objaverse (Hugging Face allenai/objaverse metadata, Sketchfab licence + author per object). I scanned all 160
metadata files for CC-BY / CC0 objects, shortlisted ~14 candidates (helicopters, ships, boats), rendered each, kept 7.
Textures resized to 384-512 px WebP, geometry decimated with gltfpack (no meshopt: the game cannot decode it).

| Key | Model (Sketchfab author, CC BY) | Used by | gz size |
|---|---|---|---|
| m_mi28 | Mi-28 (maddex88) | Russia attack helicopter | 991 KB |
| m_ka52 | Ka-52 (maddex88), untextured, painted olive | Egypt | 246 KB |
| m_ah1 | Bell AH1 Cobra (Shreyash) - looks Cobra/T129-like | Turkey, Pakistan, Iran | 584 KB |
| m_frw | HMS Dragon Type 45 destroyer (Miljan Bojic) | US, IL, TR, KR, SA, AE, EG warship | 125 KB |
| m_frg | German Navy F123 frigate (seb201) | EU warship | 122 KB |
| m_fre | Russian destroyer ("Russian Aircraft Cruiser", assg709) | RU, CN, KP, UA, IN, PK, CU, IR, RS, DW warship | 189 KB |
| m_spb | Light SAR speedboat (GloriousBritain), camo | IR, RS, DW patrol boat | 440 KB |

Wired through RMOD/RMAP in src/11-models.js (visual only, no sim change). Credits added to the menu credits paragraph.
Models only download for nations in the match.

**Not found (nothing usable under CC0/CC-BY):** Z-10 / Z-19 (the one "Z10" was a house), T129 proper, a real Mi-35/Ka-52
with textures, western frigates beyond the two above, Chinese destroyer (China uses the Russian-style one),
landing-craft / lander speedboat (lander kept the old model on purpose: it carries 8 units). China, Korea keep Mi-24 / Apache.
Shots: orch/shots/faction-looks/models-RU.png (Russian destroyer; helicopters fly too high for that lineup shot, their nose direction
was checked against the Apache in a separate viewer).
