# HANDOFF — heroes (orch/heroes, 2026-11-05)
SHIPPED on main (gate 20/20): hero squads (all 18), radio callouts + subtitles (all 18 nations, English + native), radio voice sheets `vo/<CODE>_h.mp3` for 15 nations. Report: orch/reports/heroes.md.
NOT YET shipped: radio sheets for KP, KR, CN (CN needed `pip install pypinyin jieba`; Korean XTTS is ~3-4 min per line on 2 cores).
Resume (fresh container, setup as in orch/vo/render.py header; XTTS weights /home/claude/xtts/m, Piper voices /home/claude/piperv incl. uk_UA-oleksa/mykyta-high, he_IL-saspeech-medium):
  export COQUI_TOS_AGREED=1 VO_LINES=radio_lines VO_SUF=_h VO_TAKES=2
  python3 orch/vo/roles.py CN KP KR          # one at a time; don't run Chromium at the same time (OOM kills it)
  python3 tools/voices/patch_map.py && python3 orch/build.py
  git add vo/*_h.mp3 tools/voices/map/*_h.json src/09-audio.js index.html; commit; merge origin/main; push main.
Until then those nations get the subtitle + their old voice cue (base/unit lost/ready), no new voice.
Open: no human listening yet (samples orch/voices-heroes/); AI tourney balance check not run (2-core box, hours) — heroes have identical stats, abilities differ (see report table); hero model is the soldier at 124% size + gold star (a unique hero mesh would be the next look step).
