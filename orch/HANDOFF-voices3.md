# HANDOFF voices3 (2026-11-17/18) - FR, DE, GB re-record + JP lines + Hebrew announcer, NOT on main

Abdullah, Tue 2026-11-17 16:49 Chicago: "Work on these now" (FR/DE/GB tough & gritty from native speakers, JP replies, Hebrew announcer).
Everything is on branch `orch/voices3` only. **It goes to main only after Abdullah listens and says yes.**

**Listen (phone, 56 s):** https://github.com/abdullahhaidar5-ux/ww3/raw/orch/voices3/orch/out-v3/sample.mp3
Order: double beep = next nation. French, German, British: 3 lines (select, attack, under fire) with the voices the game plays now,
one beep, the same 3 kinds of line with the new voices. Then 4 new Japanese lines (select, move, attack, unit ready), then 3 Hebrew
announcer lines (base under attack, construction complete, supply line cut).

## What players would get
- **French / German / British** units: new lines and new voices on all four sheets (main, roles, radio, shouts).
  - French Army talk: "Mon lieutenant ?", "Reçu, on bouge.", "On se fait allumer à la base, renforts !", "Contact ! On est fixés !", "Un gars à terre !".
  - Bundeswehr talk: "Jawohl, Herr Hauptmann.", "Auftrag verstanden.", "Feindkontakt, wir sind festgenagelt!", "Verwundeter! Sanitäter!", "Wir dienen Deutschland!".
  - British Army talk (British, not American): "Go ahead, boss.", "Send, over.", "Right lads, move!", "Watch and shoot!", "Stand to! Enemy at the wire!", "Contact, wait out!", "Changing mag!", "Crack on, lads!", "Sunray here."
- **Japan (JP)**: had only an old main sheet (studio speakers) and NO role / radio / shout clips. Now all four sheets, JGSDF-style
  (了解、前進する / 準備よし / 敵発見、射撃開始！ / 交戦中、援護を求む！ / 衛生、来てくれ！ / 施設科、準備よし / 特殊作戦群、準備よし).
  Imperial-era cries (日本万歳、必勝) removed, also from the device-speech fallback and its English text.
- **Hebrew announcer**: all 17 lines recorded (vo/ann_he.mp3 + ANN_OFF.he); before it used the browser's speech voice.
- The device-speech fallback lines (PHR_FAC, PHR_X, FCRY in src/09-audio.js) now say the same words as the recordings.

## Voices and licences (details: tools/voices/refs/CREDITS.md; menu credit sentence added in the index.html shell)
XTTS-v2 cloned from clean 13-22 s references of native **male** speakers (best 3-5 phrases, DNSMOS P.808 3.9-4.3):
| nation | voices (role) | source, licence |
|---|---|---|
| FR | fr_bernard (commander), fr_zeckou, fr_lambert | LibriVox readers Bernard, Zeckou, Jean Lambert - **public domain** |
| DE | de_karlsson (commander), de_ungerer, de_thorsten | LibriVox Karlsson, Bernd Ungerer - **public domain**; Thorsten-Voice (Thorsten Müller) emotional set "angry/surprised" - **CC0** |
| GB | gb_yearsley (commander, deep ~90 Hz), gb_clarke, gb_minter | LibriVox David Clarke, Andy Minter, Peter Yearsley - **public domain** |
| JP | ja_cv1 (commander), ja_cv2, ja_cv3 | Mozilla Common Voice 17.0 ja, three anonymous male speakers - **CC0** |
| he announcer | Phonikud "michael"/"shaul" voices (picked per line) | Phonikud (MIT) G2P + Piper-format VITS trained on SASPEECH - **non-commercial** licence (same data as the Piper saspeech voice CLAUDE.md already allows) |

British accent check (CommonAccent ECAPA classifier): references all "england"; old GB sheet = england 0.63 / **us 0.49** (one voice
group classified US); new GB sheet = england 0.71, US no longer in the top 3.

## Quality (Abdullah's bar: clean refs, low temperature, several seeds, Whisper pick, reject > 15 % CER, light radio)
Renderer `orch/vo/v3.py`: temperature 0.45-0.7, speed 1.0-1.08, repetition penalty 7, top_p 0.8/top_k 30, no pitch-down;
2+ seeds per main-sheet line (1 for role/radio/shout lines that read back perfectly), up to 10-14 while the best is > 5 % / > 15 %;
XTTS's tail babble after short lines is cut off at the pause when that reads back better; light radio chain (170-5200 Hz,
3:1 compressor, little drive), every clip read back again after the radio chain + mp3 codec, as the game plays it.
Whisper: small for fr/de/en with a medium recheck of every line small could not read, medium for ja and he.
Lines that kept failing were re-voiced or reworded (FR "Feu !" -> "Feu à volonté !" (always heard "Fou"); JP 接敵 -> 敵だ,
前へ -> 前進, 乗車 -> 乗り込め, 踏ん張れ -> 持ちこたえろ, 衛生！ -> 衛生、来てくれ！, 砲手、撃て -> 目標、撃て ...).

Final read-back of the clips as they sit in the sheets (CER):
| sheet | clips | new mean CER | new > 15 % | old mean CER (same Whisper small) | old > 15 % |
|---|---|---|---|---|---|
| FR / FR_r / FR_h / FR_s | 40/54/13/14 | 0.021 / 0.028 / 0.029 / 0.010 | 0 / 1* / 0 / 0 | main 0.275, roles 0.384 | 20 / 41 |
| DE / DE_r / DE_h / DE_s | 40/54/13/14 | 0.007 / 0.007 / 0.007 / 0.004 | 0 | main 0.104, roles 0.081 | 8 / 11 |
| GB / GB_r / GB_h / GB_s | 40/54/13/14 | 0.011 / 0.004 / 0.014 / 0.000 | 0 | main 0.035, roles 0.137 | 3 / 17 |
| JP / JP_r / JP_h / JP_s | 40/54/13/14 | 0.007 / 0.019 / 0.000 / 0.034 | 0 | (no role/radio/shout sheets before) | |
| ann_he | 17 | 0.015 (after radio) | 0 | (device voice) | |
\* "On appareille." read as "On a pareil." - the same sounds (homophone), raw take 0.00.
Japanese CER compares UniDic pronunciations (fugashi), so 撃て/打て or 衛生/エーセー count as the same; Hebrew ignores
alef/ayin, het/khaf, qof/kaf, tet/tav and final letters (Whisper's spelling of modern Hebrew).
Per-line numbers (sandbox only): /home/claude/vowork/v3/report_{FR,DE,GB,JP,ann_he}.json.
Sheets are 48 kbps mono: about 1.5 MB per nation for the four sheets; ann_he 130 KB.

## Files on this branch
lines: tools/voices/phrases.py (P/C FR DE new - FR/DE main lines used to live in frde_phrases.py; GB, JP rewritten), roles_lines.py
(R FR DE GB rewritten, R JP new), radio_lines.py (_b JP new, FR/DE hero lines), shout_lines.py (_s JP new, FR/DE tweaks) ·
casts: orch/vo/cast.json FR DE GB JP · refs: tools/voices/refs/{fr,de,gb,ja}_*.flac + CREDITS.md · sheets: vo/{FR,DE,GB,JP}{,_r,_h,_s}.mp3,
vo/ann_he.mp3, tools/voices/map/*.json · wiring: src/09-audio.js (VO_MAP/VOR/VOH/RADT via patch_map.py, fallback lines, ?v= main 18,
_r 6), 09b-radio.js (_h ?v=6), 09c-shouts.js (_s ?v=6), 09d-announcer.js (ANN_OFF.he, ann ?v=3) · guard `v3voice:` in orch/decisions.mjs ·
index.html rebuilt (`build.py --check` passes) · tools: orch/vo/v3.py, v3wire.py, ann_he.py, v3sample.py.
Gate: pushed `gate/7854f68e51` (Ship gate run 44265175988, https://github.com/abdullahhaidar5-ux/ww3/actions/runs/44265175988): at 08:33 UTC the 13 finished jobs were green (audio, smooth-pc, mpsync, mpsync-server, migrate x3, servertest, headless, icons, ew, mapsweep, ...); decisions, smoke4, smooth-mp and the rest were still running - check it before landing. Local smoke/decisions were not run (sandbox too slow).

## To land after Abdullah says yes
Rebase on origin/main. Conflicts: index.html -> `python3 orch/build.py`; src/09-audio.js VO_MAP/VOR lines -> `python3 tools/voices/patch_map.py`;
?v= numbers: if main (or orch/voices-lb2, which also bumps main 18 / _r_h_s 6) moved them, bump once more past main's value.
Then build + --check, smoke, decisions, `orch/cigate.sh`, add a DECISIONS.md line ("FR/DE/GB/JP voices re-recorded + Hebrew announcer,
approved <date>") and a HISTORY line. If he says no to one nation, revert only that nation's vo/ + map files + cast entry.

## How to re-render
pip: torch/torchaudio CPU, coqui-tts, torchcodec 0.17+cpu (--no-deps), faster-whisper (remove `metadata_errors="ignore"`), speechmos,
librosa, cutlet fugashi unidic-lite (Japanese), onnxruntime + phonikud-onnx + phonikud from github thewh1teagle/phonikud (--ignore-requires-python)
for Hebrew; XTTS-v2 in /home/claude/xtts/m; Phonikud models in /home/claude/piperv (see ann_he.py docstring).
**Memory cap 6.2 GB**: XTTS (~2.5 GB after malloc_trim) + one Whisper model only. fr/de/en: `python3 orch/vo/v3.py FR` (XTTS + small), then
`V3_MED=1 python3 orch/vo/v3.py FR` (medium recheck, no XTTS). JP: `python3 orch/vo/v3.py gen JP` then `V3_MED=1 python3 orch/vo/v3.py JP`,
repeated until no REJECT. Then `python3 orch/vo/ann_he.py`, `python3 orch/vo/v3wire.py` (bumps ?v= - run once per landing), build, `python3 orch/vo/v3sample.py`.
