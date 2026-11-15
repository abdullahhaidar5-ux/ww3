# HANDOFF voices-lebanese (2026-11-15)

Abdullah 00:31 Chicago: "Lebanese dialogue doesn't sound Lebanese enough" -> "Both, best quality".

## Done (RS, landed)
- Lines rewritten in Lebanese colloquial Arabic: `tools/voices/phrases.py` P/C['RS'], `roles_lines.py` R['RS'], `radio_lines.py` _b('RS'), `shout_lines.py` _s('RS') (same keys/shapes).
- Re-recorded vo/RS.mp3, RS_r, RS_h, RS_s (+ tools/voices/map/*.json, `patch_map.py`), ?v= bumped (main 14, _r/_h/_s 2).
- Cast (`orch/vo/render.py` CAST['RS']): soldiers clone:lb_vlog, clone:lb_tech, clone:lb_narr; commander clone:lb_narr.
- `orch/vo/xt.py`: reads reference clips with soundfile (torchaudio.load needs torchcodec, broken on CPU-only installs).
- QC (Whisper small read-back): main sheet 40 clips mean P.808 3.51, CER 0.09 (worst 0.31 "هيهات منّا الذلّة"); role sheet 81 clips and radio 13 clips all <= 0.33; shouts 14 clips 1.0-2.3 s; loudness -17 to -18 dB mean, peaks <= -0.5 dBFS.

## Sources and licences
MASC - Massive Arabic Speech Corpus (Al-Fetyani, Al-Barham, Abandah, Alsharkawi, Dawas 2021, IEEE DataPort doi:10.21227/e1qb-jv46), CC BY 4.0, via huggingface.co/datasets/pain/MASC (dev/test tarballs streamed, only the chosen clips kept).
Speakers chosen by Lebanese transcript markers (هيدا/هيدي، هلّق، -كن/-هن), male pitch and DNSMOS; refs in tools/voices/refs (lb_narr c2grGSyfpmo, lb_vlog SZC2HW-31Yc, lb_tech nl0DZ3eBKPQ), details in tools/voices/refs/CREDITS.md. Credit sentence in the menu credits (index.html shell, "Lebanese unit voices ... MASC"), guarded by `rsvoice:` in orch/decisions.mjs.
Mozilla Common Voice (CC0) was checked first: only one self-labelled Levantine male, reading MSA - too little accent.

## How to re-render
pip: torch/torchaudio (CPU wheel), coqui-tts, torchcodec, faster-whisper, speechmos, pyworld, librosa; XTTS-v2 files in /home/claude/xtts/m.
`python3 orch/vo/render.py RS` (needs ~5 GB RAM - run alone, it was OOM-killed next to node), `python3 orch/vo/roles.py RS`, `VO_LINES=radio_lines VO_SUF=_h python3 orch/vo/roles.py RS`, `VO_LINES=shout_lines VO_SUF=_s python3 orch/vo/roles.py RS`, then `python3 tools/voices/patch_map.py` and build.

## Not done yet
OB (Palestinian) and RV (south Iraq) re-recording - see the end of this file for status.
Candidate Levantine/Palestinian male MASC speakers for OB: eLR5XvLcNWk (~108 Hz, "عشان/راح نحكي"), XshQZopat4A (~111 Hz, cleanest), ZFzh-9_NKnU (~131 Hz).
