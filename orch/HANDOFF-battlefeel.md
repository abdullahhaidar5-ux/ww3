# Handoff: orch/battlefeel (2026-11-06) - all five picks shipped

STATUS: wildfires, wind-blown smoke (+ line of sight), wrecks as cover, shout triggers + 18 nation shout sheets, smart auto-build are on main.
Report `orch/reports/battlefeel.md`; test `node orch/feelshots.mjs` (BF-FEEL PASS); shots `orch/shots/battlefeel/`.

## Voices: what exists, what to redo
Rendered with the real pipeline (XTTS-v2 tough2 casts + radio chain; `VO_LINES=shout_lines VO_SUF=_s VO_TAKES=3 python3 orch/vo/roles.py CODE`,
then `python3 tools/voices/patch_map.py` and `python3 orch/build.py`): vo/CODE_s.mp3 for all 18 nations, lines in tools/voices/shout_lines.py.
Nobody has listened to them yet (no ears in the cloud): Abdullah / a voice pass should audition a few per nation.
- IN, PK, KP, KR: XTTS babbled on some short Hindi/Korean takes (QC for hi is length-only); takes > 3 s are dropped from the map by patch_map.py.
  Gaps: IN `tank` silent, PK `grenade` silent, several types have only one clip. Re-render those with more takes (VO_TAKES=5) or other casts.
- UA: the original Piper voices uk_UA-mykyta-high / oleksa-high were not in this container; the shouts use speaker 1 ("mykyta") of
  uk_UA-ukrainian_tts-medium (render.py passes speaker_id=1 for multi-speaker uk_UA voices). IL: MMS Hebrew + Piper he_IL-saspeech.
- A nation/type without a clip stays silent (never device speech). Subtitles are not shown for shouts.
- Rendering env: pip install torch (cpu) coqui-tts[codec] piper-tts faster-whisper pypinyin hangul-romanize jieba; XTTS weights from HF coqui/XTTS-v2
  into /home/claude/xtts/m; Piper voices from rhasspy/piper-voices into /home/claude/piperv. ~2-4 min per nation on 2 CPUs; an 8 GB box OOMs if a
  browser test runs at the same time (KP/KR were killed that way once).

## Balance agent: numbers
fire damage 5 hp/s infantry, ignition table `BF_HOT`, `bfDry()`, smoke block depth .55 (`smokeBlock`), hulk cap 36 (`BF_HULK_MAX`), auto-build 3 queued/factory.
Fire does not hard-block routes (slow x.5 infantry / x.78 vehicles + damage + panic); a hard block would need a dynamic path cost.

## Known flake
gate/tutorial fails intermittently in CI (also on plain origin/main at cfc5dd98: "TUTORIAL FAIL (1)"); it passes locally with this branch.
