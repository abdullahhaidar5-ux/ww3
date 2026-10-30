# Voices: tougher, pass 1 (`orch/voices-tough-pass1`)

**Overlap:** a second Voice session (01GRiS9ooE1…) took over `orch/voices-tough` with Abdullah's "Tougher." note (`orch/NOTE-voices-tough.md`) and redid RS/DW/IR at a harder level. I stopped and did not push over it. This branch keeps my first-level pass as a fallback.

**What changed:** deeper XTTS speakers cast per language (`orch/vo/audition.py`), shouted combat lines, faster terse select/move lines, a grim "unit lost" line, WORLD pitch-down (≤2 st, only where it stays natural), warmth, hard compression, light grit, tighter radio, squelch clicks, and quiet distant gunfire under "under fire". Takes are scored on naturalness + read-back + toughness. Cache-buster is now `?v=4`.

**Done:** RS DW IR US SA AE EG IL UA TR RU. **Not done:** IN PK CU CN KR KP EU.

**Toughness / naturalness (P.808), before→after:** RS .65→.78 / 3.54→3.48 · DW .53→.80 / 3.51→3.41 · IR .81→.87 / 3.11→3.01 · US .51→.83 / 3.38→3.31. Median pitch: DW 128→105 Hz, US 124→107 Hz.

**CIGATE PASS** 17/17 jobs (audio included) on 426c74a (Ship gate run 85). `gh` has no login on this machine, so I read the run through GitHub Actions instead of `cigate.sh`.
