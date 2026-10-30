#!/usr/bin/env bash
# render nations one by one; after each: rebuild index.html, commit and push to the current branch (orch/vo/run.sh RS DW IR ...)
cd "$(dirname "$0")/../.."
export PYTHONDONTWRITEBYTECODE=1
BR=$(git rev-parse --abbrev-ref HEAD)
export PYTHONUNBUFFERED=1
for f in "$@"; do
  python3 orch/vo/render.py "$f" 2>&1 | grep --line-buffered -v -i -E "warn|transformers|token_id|HF Hub" > "/home/claude/vowork/render_$f.log" || true
  grep -q "^$f: .* clips" "/home/claude/vowork/render_$f.log" || { echo "RENDER FAIL $f"; continue; }
  python3 orch/build.py | tail -1 && python3 orch/build.py --check | tail -1 || { echo "BUILD FAIL $f"; exit 1; }
  rm -rf orch/vo/__pycache__ tools/voices/__pycache__
  (cd orch/vo && python3 measure.py "$f" 2>/dev/null | tail -1 >> /home/claude/vowork/after.txt)
  case "$f" in RS|DW|IR) python3 tools/voices/samples.py after "$f";; esac
  git add "vo/$f.mp3" "tools/voices/map/$f.json" src/09-audio.js index.html orch/vo tools/voices
  git commit -q -m "Voices: $f soldiers sound tougher still (deeper voices, barked combat lines, harder radio grit)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GRiS9ooE1eXpuFrC28njU6" && git push -q origin "$BR" 2>&1 | grep -v '^remote:'
  echo "DONE $f $(git log --oneline -1) $(grep "^$f: " /home/claude/vowork/render_$f.log)"
done
