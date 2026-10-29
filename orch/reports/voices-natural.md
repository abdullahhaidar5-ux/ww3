# Voices: natural instead of robotic (branch `orch/voices-natural`)

All 18 nations re-voiced, using the 8 cue types and phrase lists from `orch/voices`. No pitch shifting. Each line is rendered 2–3 times (up to 12 when the voice garbles it), and the best take is kept. "Best" means the highest DNSMOS naturalness score that Whisper can still read back correctly. The audio gets a light radio treatment: 300–3400 Hz, compression, hiss/squelch on about a third of the lines, matched loudness, 40 kbps mono.

**Engine per language**
- **XTTS-v2 studio voices:** ar (RS, DW, SA, AE, EG), en, fr/de/en (EU), tr, ru, zh, ko (KR, KP), hi (IN; PK reads Urdu lines written in Devanagari), es. Each nation has 2–3 soldier voices plus a calmer commander voice.
- **fa (IR):** Piper ganji + gyro. They beat MMS and the other Piper voices on read-back accuracy (MMS: 43% errors vs ~28%). The other free Persian models need unsafe checkpoint loading.
- **he (IL):** MMS-heb + Piper saspeech. They score about the same, so both are used for variety.
- **uk (UA):** Piper mykyta/oleksa-high, the best score of any engine tested (4–7% read-back errors).
- **Fallback lines** for IN/PK use Piper rohan/pratham/fasih.

**Improvement** (DNSMOS P.808, before → after): RS 2.40→3.54, DW 2.41→3.51, IR 2.25→3.11, US 3.15→3.38.

**Sizes:** 224–481 KB per nation, 5.9 MB in total. Only the player's own nation is loaded.

**Known issue:** a few garbled Korean variants were dropped (KR 4, KP 2).

**Credits:** Coqui is now named in the menu credits.

**Tooling:** `orch/vo/render.py`.

**CIGATE PASS** (16/16) on a7cd21b.
