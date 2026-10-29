# Voices: natural instead of robotic (`orch/voices-natural`)

All 18 nations re-voiced using the 8 cue types and phrase lists from `orch/voices`. No pitch shifting. Each line is rendered 2–3 times (up to 12 if garbled), and the best take is kept: the most natural-sounding (DNSMOS) one that Whisper reads back correctly. Light radio treatment, matched loudness, 40 kbps mono.

**Engines**
- **XTTS-v2:** ar (RS, DW, SA, AE, EG), en, EU fr/de/en, tr, ru, zh, ko, hi (IN; PK lines are read from Devanagari). Each nation has 2–3 soldier voices plus a calm commander voice.
- **fa (IR):** Piper ganji + gyro. They had the best read-back; MMS got 43% wrong vs ~28% for these.
- **he (IL):** MMS + Piper saspeech. They score about the same, so both are used for variety.
- **uk (UA):** Piper mykyta/oleksa, the best of all engines tested.

**Naturalness score, before → after (P.808):** RS 2.40→3.54, DW 2.41→3.51, IR 2.25→3.11, US 3.15→3.38.

**Sizes:** 224–481 KB per nation (5.9 MB in total). Only the player's own nation is loaded.

**Known issue:** a few garbled Korean variants were dropped.

**Credits:** Coqui is now named in the menu credits.

**Tool:** `orch/vo/render.py`.

**CIGATE PASS** 16/16.
