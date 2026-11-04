# Handoff audio-1103
Resume: pip deps = torch(cpu) coqui-tts[codec] pypinyin jieba hangul-romanize pyworld piper-tts faster-whisper; XTTS weights /home/claude/xtts/m (HF coqui/XTTS-v2), Piper voices /home/claude/piperv (fa, uk, he). Env PIPER_DIR, VO_CACHE.
Left: `python3 orch/vo/roles.py KR KP` (then CU/US/TR/RU/EU/UA/CN/SA/AE/EG optional QC re-render with Whisper), `python3 tools/voices/patch_map.py`, build, smoke, cigate, push. Listen to orch/voices-1103 first.
