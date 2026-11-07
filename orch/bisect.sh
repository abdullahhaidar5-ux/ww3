#!/usr/bin/env bash
# Auto-bisect a red ship-gate test. Usage: orch/bisect.sh <bad-sha> <test>   (run in a full clone, from CI)
# Finds the newest first-parent ancestor of <bad-sha> on origin/main whose commit status "gate/<test>" is success (the
# "good" end; falls back to 40 commits back), runs `git bisect` with that one test, and prints
# "BISECT <sha> <author> <subject>" on the last line. Playwright must already be installed (workflow does it).
set -u
BAD=$1; T=$2; REPO=${GITHUB_REPOSITORY:-abdullahhaidar5-ux/ww3}
run_test() {
  case "$T" in
    check)    python3 orch/build.py --check && node orch/lint.mjs ;;
    smooth-*) node orch/smooth.mjs --profile "${T#smooth-}" ;;
    grand)    node orch/grandtest.mjs ;;
    tutorial) node orch/tutorialtest.mjs ;;
    save)     node orch/savetest.mjs ;;
    smoke4)   node orch/smoke.mjs --players 4 ;;
    *)        [ -f "orch/$T.mjs" ] && node "orch/$T.mjs" || { echo "no runner for $T"; return 125; } ;;
  esac
}
GOOD=""
for c in $(git rev-list --first-parent -n 40 "$BAD" | tail -n +2); do
  st=$(gh api "repos/$REPO/commits/$c/statuses?per_page=100" --jq "[.[]|select(.context==\"gate/$T\")][0].state" 2>/dev/null)
  [ "$st" = success ] && { GOOD=$c; break; }
done
[ -z "$GOOD" ] && GOOD=$(git rev-list --first-parent -n 40 "$BAD" | tail -n 1)
git bisect start "$BAD" "$GOOD" >/dev/null
export -f run_test; export T
git bisect run bash -c 'run_test >/dev/null 2>&1' >/tmp/bisect.log 2>&1
F=$(git rev-parse refs/bisect/bad 2>/dev/null || git rev-parse HEAD)
git bisect reset >/dev/null 2>&1
echo "BISECT $F $(git log -1 --format='%an | %s' "$F") (good end ${GOOD:0:10})"
