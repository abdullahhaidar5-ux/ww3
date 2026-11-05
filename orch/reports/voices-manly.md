# Voices manly pass (2026-11-05)
Abdullah: "The voices should all be manly, some sounded weak."

## What was measured
All 1,936 clips of all 18 nations (nation sheets `vo/CODE.mp3`, role sheets `_r`, radio/hero sheets `_h`): median F0 (Praat), spectral centroid, LUFS, duration. Tools: `tools/voices/manly_measure.py`. Weak = clip median F0 > 115 Hz or centroid > 2400 Hz. Nearly every sheet was already at the ~90 Hz "tough2" level; the weak ones were a minority of individual clips (and UA/IL in general).

## What was fixed
`tools/voices/manly_fix.py` re-processes only the weak clips inside the sheets (same offsets and lengths, so no map changes): formant-preserving WORLD pitch-down toward 95 Hz (max 3 semitones), low-mid warmth, brightness cut where thin, soft compression, loudness restored. ~330 clips changed. No re-synthesis: this run had no GPU / no XTTS install (2-core CPU, ~3 min per line), so no new XTTS takes and no Whisper QC was done; slogans and languages are untouched (same audio, only pitch/tone).

## Per nation (all sheets): clips measured, median F0 Hz before/after, weak clips before/after, median LUFS before/after
| Nation | clips | F0 before | F0 after | weak before | weak after | LUFS before | LUFS after |
|---|---|---|---|---|---|---|---|
| AE | 103 | 95 | 95 | 10 | 3 | -17.0 | -17.4 |
| CN | 100 | 90 | 90 | 10 | 4 | -16.6 | -17.1 |
| CU | 102 | 90 | 90 | 17 | 16 | -17.0 | -17.5 |
| DW | 134 | 91 | 91 | 5 | 3 | -17.0 | -17.4 |
| EG | 103 | 96 | 96 | 16 | 6 | -17.0 | -17.5 |
| EU | 102 | 91 | 92 | 26 | 16 | -17.0 | -17.4 |
| IL | 103 | 108 | 104 | 36 | 11 | -17.5 | -17.9 |
| IN | 103 | 89 | 89 | 7 | 3 | -17.4 | -17.6 |
| IR | 133 | 89 | 90 | 7 | 0 | -17.0 | -17.5 |
| KP | 100 | 89 | 89 | 7 | 7 | -16.8 | -17.3 |
| KR | 96 | 92 | 92 | 2 | 1 | -17.0 | -17.3 |
| PK | 103 | 90 | 89 | 2 | 0 | -16.9 | -17.1 |
| RS | 134 | 89 | 89 | 7 | 7 | -16.8 | -17.3 |
| RU | 103 | 95 | 95 | 19 | 13 | -17.0 | -17.5 |
| SA | 103 | 90 | 90 | 4 | 2 | -17.3 | -17.7 |
| TR | 103 | 88 | 87 | 11 | 8 | -17.0 | -17.5 |
| UA | 103 | 115 | 105 | 51 | 12 | -17.1 | -17.6 |
| US | 104 | 90 | 90 | 15 | 9 | -16.6 | -17.1 |
Remaining weak clips are mostly those already at the 3-semitone cap (a second pass would sound robotic) or only slightly over the bright threshold; the true fix for those is a fresh deep-speaker XTTS take (see handoff). Before/after samples: `orch/voices-manly/<CODE>_before.mp3` / `_after.mp3` for IR, RS, DW, US, RU, KP.

## Re-synthesis pass (2026-11-05, run 3) — the clips post-processing could not fix
XTTS-v2 (coqui-tts 0.28, CPU) + Piper/MMS + faster-whisper installed this run. `tools/voices/manly_resynth.py` re-voiced the 83 clips still
flagged in UA, IL, EU, CU, RU, KP, RS: deepest natural male voice per language from a quick audition (lowest median F0 that still reads back:
es/ru/ko/ar Dionisio Schuyler, then Damjan Chapman / Baldur Sanjin; fr/de/en Damien Black / Damjan Chapman; uk MMS-ukr then Piper oleksa;
he MMS-heb), barked delivery (tough2 cry/sold settings), max 2 takes with Whisper read-back QC, then the tough2 radio chain and the
manly_fix post chain where still high, loudness matched to the old clip. Sheets rebuilt with the same order/gaps; maps patched (patch_map.py).
6 clips had no clean take in 2 tries (3 KP short shouts, 2 UA one-word lines, 1 more) and kept their old audio.

| Nation | flagged clips | their median F0 before | after | weak clips (all sheets) before | after | nation median F0 before | after |
|---|---|---|---|---|---|---|---|
| CU | 17 | 126 | 88 | 17 | 3 | 90 | 89 |
| EU | 16 | 136 | 99 | 16 | 3 | 92 | 91 |
| IL | 11 | 121 | 98 | 11 | 4 | 104 | 101 |
| KP | 7 | 128 | 93 | 7 | 3 | 89 | 89 |
| RS | 7 | 122 | 87 | 7 | 0 | 89 | 88 |
| RU | 13 | 125 | 88 | 13 | 2 | 95 | 91 |
| UA | 12 | 130 | 98 | 12 | 5 | 105 | 104 |
83 weak clips -> 20 (mostly slightly-bright or kept-old lines). No human listening yet.
