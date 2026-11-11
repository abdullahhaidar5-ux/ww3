# Handoff: orch/voicesV (2026-11-10)

DONE (own vo/<CODE>.mp3, shipped to main except GB/AU/CA pending a gate run): IQ, RV, SY, OB, JO, BI, OM, KW, LY, SD, DZ, MA (Arabic dialect lines + own casts), GB, AU, CA (English).
Each: lines in tools/voices/phrases.py (P/C), cast in orch/vo/cast.json, `VO_OWN` in src/09-audio.js makes the main sheet vo/CODE.mp3 load
(VO_ALIAS still lends the nation's role/radio sheets _r/_h until those are rendered), VO cache ?v= bumped (now 12). CER <= 0.12 per nation.
NOT DONE: anthems (no mus/an_pack.py run, no credits added); AZ and KZ kept on alias (no natural voice checked); FR DE PL IT ES GR SE; JP TW VN PH ID TH; BR MX AR CO CL VE; NG ZA ET; AF KD.
Setup in a fresh container: pip install --break-system-packages torch torchaudio --index-url https://download.pytorch.org/whl/cpu; pip install --break-system-packages "coqui-tts[codec]" piper-tts speechmos faster-whisper pyworld librosa;
XTTS weights from huggingface.co/coqui/XTTS-v2 into /home/claude/xtts/m; one nation = ~15-20 min on 2 CPUs (run in background, wait on its pid, never two jobs).
Continue: add P['XX']/C['XX'] (8 kinds x 3-4 lines, 4 cry kinds), a cast in cast.json, then
`COQUI_TOS_AGREED=1 VO_TAKES=2 python3 orch/vo/render.py XX`, add XX:1 to VO_OWN, bump ?v=, python3 orch/build.py, HISTORY line, commit, orch/cigate.sh.
Gate note: audio / smooth-pc / migrate-abrupt flaked on CI at times (main itself had audio red); rerun before blaming voices.
