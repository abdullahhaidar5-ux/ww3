# HANDOFF L6 Audio (2026-11-14) — NOT ready: nothing shipped, no code or audio changed

Blocked in this scheduled cloud run:
1. **Voices (RV, OB, GB, FR, DE, JP):** sandbox has 2 CPUs, no GPU, and no torch / coqui-tts / faster-whisper / piper; XTTS weights (`/home/claude/xtts/m`) are absent. Rendering tough2 sheets via `orch/vo/render.py` needs a machine with those installed (or a long install + CPU render here). Cast entries for JP, RV, OB already exist in `orch/vo/cast.json` (1 sheet each, RV borrows IQ); GB/FR/DE need cast rows + `phrases` for en-GB/fr/de (Damien Black / Baldur Sanjin style speakers).
2. **Anthems:** WebFetch of the Navy Band archive.org item (https://archive.org/details/us-navy-band-national-anthems-public-domain) was denied (permission not answered), so no new `an_*.mp3` was cut. Missing: GB (God Save the King, PD recording), plus IR RS DW RV OB KP SA AE TR. Per `mus/an_pack.py` notes, TR/SA/AE/KP/IR compositions are not clearly PD; RS/DW/RV/OB would need an original instrumental, not a real group's chant. Credits go in the menu credits.
3. Chatter/battle-cry wiring: not started.

Next step: someone with the archive.org URL approved (or the audio files attached) runs `python3 mus/an_pack.py <dir>`; voices need a GPU/XTTS machine. Lock `taken/L6-audio` is held; release by deleting it.
