# Voices "Tougher." pass (2026-10-30, branch orch/voices-tough)
What changed: all 18 nations re-voiced. Deepest natural XTTS speakers (Damien Black, Baldur Sanjin, Dionisio Schuyler ~90 Hz; Viktor Eka, Damjan Chapman); faster, hotter delivery (combat lines barked); gentle formant-kept pitch-down toward ~90 Hz (max 3 st, only while it stays natural and Whisper still reads it); harder 2-stage compression + drive; tighter 350-3200 Hz radio band on combat lines. All settings in tools/voices/tough2.py (+ casts in orch/vo/render.py, cast.json); voice cache ?v=5.
Tough score (orch/vo/score.py, 1.0 = max; before = previous pass 456eeb9 -> after):
RS .78->.93 (median pitch 108->91 Hz) · DW .80->.93 (105->96) · IR .87->.93 (99->95)
US .51->.88 · TR .48->.96 · RU .42->.86 · EU .46->.83 · CU .51->.88 · CN .50->.87 · KR .78->.95 · KP .87->.92
SA .49->.91 · AE .61->.86 · EG .57->.85 · PK .71->.90 · IN .63->.84 · UA .29->.66 · IL .24->.59 (Piper/MMS: pitch-down limited to stay natural)
Cost: DNSMOS naturalness on the radio-treated clips ~3.4 -> ~3.0; Whisper clarity (sheet CER) RS .11->.18, DW .12->.15, IR .30->.31 (IR keeps the old pace to stay clear). KR/KP keep 29/33 lines (garbled variants dropped, every kind still voiced).
Preview: orch/vo/samples/{RS,DW,IR}-{select,attack,underfire}-after.mp3 (before = *-before.mp3).
Gates: SMOKE PASS, AUDIO PASS, CIGATE PASS (17/17 on GitHub runners, gate/129d811527).
