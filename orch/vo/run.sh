#!/usr/bin/env bash
# render nations one by one; after each: rebuild index.html, commit and push (orch/vo/run.sh RS DW IR ...)
cd "$(dirname "$0")/../.."
export PYTHONDONTWRITEBYTECODE=1
for f in "$@"; do
  python3 orch/vo/render.py "$f" || { echo "RENDER FAIL $f"; continue; }
  python3 orch/build.py | tail -1 && python3 orch/build.py --check | tail -1 || { echo "BUILD FAIL $f"; exit 1; }
  rm -rf orch/vo/__pycache__ tools/voices/__pycache__.new
  git add "vo/$f.mp3" "tools/voices/map/$f.json" src/09-audio.js index.html orch/vo
  git commit -q -m "Voices: $f re-voiced with natural neural voices (best of several takes, light radio treatment)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GRiS9oVTgV38oh5D2gSh29" && git push -q origin orch/voices-natural 2>&1 | grep -v '^remote:'
  echo "DONE $f $(git log --oneline -1)"
done
