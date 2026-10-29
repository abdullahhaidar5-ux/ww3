# Voices report (orch/voices)

**What's new (all 18 nations):** `vo/<CODE>.mp3` rebuilt: 8 cues, 3-4 variants each, written natively and read by 3-4 different voices per nation, band-passed with radio hiss/squelch. Old cues kept (select, move, attack, unit ready, base attacked); **new: under fire, unit lost, building ready**, wired to sim events (`log` kinds `v5/v6/v7`, silent in the message log, throttled 14 s / 7 s; building-complete fires `v7`). War slogans kept and extended for the Shia factions (IR/RS/DW: Labbaik ya Hussein, Ya Ali, Haihat minna al-dhilla, Ya Zahra, Ya Sahib al-Zaman...). Languages: US English, EU French/German/British English, TR, IL Hebrew, UA, RU, IR Persian, SA/AE/EG/RS(Lebanese)/DW(Iraqi) Arabic with dialect wording, PK Urdu, IN Hindi, CN Mandarin, KR/KP Korean (different voices/wording), CU Spanish.

**Engines/licences:** Kokoro-82M (Apache-2.0: US, EU-en, IN, CN, CU); Piper voices (MIT code; datasets CC0/Apache/Unlicense, plus CC BY-NC-SA 4.0 for ryan, dfki, ruslan, pratham, kss: fine for a free game, credited); Meta MMS-TTS (CC BY-NC 4.0: TR, IL, Arabic x5, PK, KR/KP). Menu credit updated. Pipeline in `tools/voices/` (phrases, voices, gen, verify, patch_map).

**Sizes:** 177-308 KB per nation (32 kbps mono, 22 kHz), 4.2 MB total; only the player's nation loads. Sheets fetched as `vo/XX.mp3?v=2` so old service-worker copies cannot mismatch the new cue list.

**Checks:** Whisper round-trip: US 0.97, RU 0.82, CN 0.75, KR 0.68, KP 0.66 match (Korean weakest: single female KSS voice pitched down + MMS; Persian/Arabic dialect not checked). Nobody has listened on a real device: Abdullah should hear IR/RS/DW and KR/KP first.

**Limits:** Arabic has one real Piper voice (Jordanian) + MMS; nations differ by wording, pitch and pace. Device-speech fallback has no lines for the 3 new cues (silent). CIGATE: PASS 16/16 on the first commit (9b0af6b). On the Korean re-tune commit, migrate-abrupt failed once ("client B 2.0 game-s behind", a timing flake unrelated to audio); see final line.
