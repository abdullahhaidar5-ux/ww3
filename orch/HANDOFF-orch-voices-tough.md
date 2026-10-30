# Handoff: orch/voices-tough ("Tougher." pass, 2026-10-30)

Status is in the git log: one commit per nation, "Voices: XX soldiers sound tougher still". A nation is DONE at the
new level only if its LAST such commit came after commit "tough2: tighter clarity gate" (CER_OK 0.12) — earlier ones
(RS, DW, IR, UA, IL first runs) used the looser 0.2 gate and are queued to be redone.

How to resume (fresh container): see orch/vo/render.py header for deps; XTTS-v2 weights -> /home/claude/xtts/m
(coqui/XTTS-v2 on HF: config.json vocab.json speakers_xtts.pth model.pth), Piper voices -> /home/claude/piperv,
`pip install coqui-tts[codec] piper-tts speechmos faster-whisper pyworld librosa` (torch CPU), then
`COQUI_TOS_AGREED=1 bash orch/vo/run.sh CODE...` (renders, measures into /home/claude/vowork/after.txt, rebuilds,
commits, pushes). Don't run other Whisper/XTTS jobs alongside on a 7 GB box (OOM killed renders).

Settings: all in tools/voices/tough2.py (synthesis speed/temperature, pitch target ~90 Hz max 3 st, chains, gates);
casts in orch/vo/render.py CAST (RS/DW/SA/AE/EG/IR/IL/UA) and orch/vo/cast.json (rest). Deep speaker pool from
tools/voices/audition2.py: Damien Black, Baldur Sanjin, Dionisio Schuyler (~90 Hz), Viktor Eka, Damjan Chapman.
Scores: python3 orch/vo/measure.py CODE (tough/f0/tilt/p808); clarity: python3 tools/voices/clarity.py REV CODE.
Before (previous pass, rev 456eeb9) tough: RS .78 DW .80 IR .87 US .51 TR .48 IL .24 EU .46 UA .29 RU .42 SA .49
AE .61 PK .71 IN .63 CN .50 KP .87 KR .78 EG .57 CU .51. VO cache version is ?v=5 in src/09-audio.js.
