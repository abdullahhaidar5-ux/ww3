# US voices: Americans sound British (usvoice, 2026-11-14)
Abdullah 2026-11-13 20:08: "Americans sound British".

## Cause
vo/US*.mp3 were rendered with XTTS-v2 *studio* speakers Damien Black, Dionisio Schuyler, Viktor Eka and Baldur Sanjin (orch/vo/cast.json). Those built-in speakers have no American accent (the pack is multinational, chosen only for deep, hard voices), so the English lines came out British / mid-Atlantic. Other English casts: GB (Damien Black, Ludvig Milivoj, Filip Traverse; cmd Wulf Carlevaro) is correctly British-ish; AU (Craig Gutsy, Aaron Dreschner, Xavier Hayasaka; cmd Andrew Chipper) and CA (Royston Min, Abrahan Mack, Ferran Simen; cmd Viktor Menelaos) use the same pool with no accent control, so they carry an unspecific accent. Not touched (outside this job); Damien Black is shared by US(old)/GB. EU's English line is Kokoro bm_george (British, intended).

## Fix
XTTS-v2 can clone a voice from a short clip. The US cast is now three speakers cloned from public-domain American recordings (tools/voices/refs/*.flac, credits in CREDITS.md and the menu credits):
- `clone:us_reagan` (Reagan, 1981): infantry slot 0, engineers, navy, shouts
- `clone:us_truman` (Truman, 1945): AT teams, tanks (slot 1), infantry/navy variants
- `clone:us_ike` (Eisenhower, 1961): elite, vehicles (slot 2), plus the commander voice for pilots, leaders and all radio/base callouts (`cmd`)
Only 3 distinct voices: I found no further clean public-domain American male recording in the time budget. Same line list, file names and offsets maps, same tough2 chain (orch/vo/roles.py, render.py unchanged except `xt.py` learned `clone:<key>` speakers), 36 kbps mp3. Sizes (KB) before -> after: US 290 -> 317, US_r 377 -> 348, US_h 108 -> 92, US_s 78 -> 78 (total 853 -> 835).
One variant is gone: "Semper Fi!" never read back cleanly in 3 takes and was dropped (the war-cry kind keeps its other variants).

## How the voices were chosen (and what is not proven)
No listening is possible here. Picks rest on: speakers documented as plain General American (Midwest/Kansas/Missouri), government recordings with free licenses, and an accent-ID model (SpeechBrain CommonAccent ECAPA, Jzuluaga/accent-id-commonaccent_ecapa): the three reference clips score `us` first at 0.74-0.79 (old studio speakers on test lines: `england` first in 6 of 16 clips). The model is weak on short, radio-filtered synthetic clips: on the finished sheets it was inconclusive (us-minus-england margin per 5 s chunk, old -> new: US 0.18 -> 0.15, US_r 0.27 -> 0.14, US_h 0.17 -> 0.09, US_s -0.10 -> +0.08). So the claim "clearly American" is NOT machine-verified; Abdullah's ears are the test. If it still sounds off, the lever is cleaner/modern American reference clips (replace the .flac files, rerun `VO_TAKES=3 python3 orch/vo/roles.py US` etc.; recipe below).

## Render recipe (CPU, ~1 h total)
pip torch (cpu) coqui-tts[codec] faster-whisper speechmos; XTTS weights from HF coqui/XTTS-v2 to /home/claude/xtts/m; then
`VO_TAKES=3 python3 orch/vo/roles.py US` (US_r), `VO_LINES=radio_lines VO_SUF=_h VO_TAKES=3 python3 orch/vo/roles.py US`, `VO_LINES=shout_lines VO_SUF=_s VO_TAKES=3 python3 orch/vo/roles.py US`, `python3 orch/vo/render.py US` (US.mp3). The torch/torchaudio/torchcodec versions must match (install all three from the cpu index).

## Samples to listen to
- orch/reports/usvoice/US-inf-select-before.mp3 (old)
- orch/reports/usvoice/US-inf-select-after.mp3 (new, "Ready, sir.")
- orch/reports/usvoice/US-tank-attack-after.mp3 (new, shouted attack line)

Guard: `usvoice:` checks in orch/decisions.mjs (cast must be `clone:us_*`, reference clips exist, credits name the source).
