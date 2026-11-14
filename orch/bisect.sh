#!/usr/bin/env bash
# Auto-bisect a red ship-gate test. Usage: orch/bisect.sh <bad-sha> <test>   (run in a full clone, from CI)
# Finds the newest first-parent ancestor of <bad-sha> on origin/main whose commit status "gate/<test>" is success (the
# "good" end; falls back to 40 commits back), runs `git bisect` with that one test, and prints
# "BISECT <sha> <author> <subject>" on the last line. Playwright must already be installed (workflow does it).
set -u
BAD=$1; T=$2; REPO=${GITHUB_REPOSITORY:-abdullahhaidar5-ux/ww3}
cat > /tmp/rt.sh <<'RT'
#!/usr/bin/env bash
T="$1"
case "$T" in
  check)    python3 orch/build.py --check && node orch/lint.mjs ;;
  smooth-*) node orch/smooth.mjs --profile "${T#smooth-}" ;;
  tutorial) node orch/tutorialtest.mjs ;;
  save)     node orch/savetest.mjs ;;
  smoke4)   node orch/smoke.mjs --players 4 ;;
  *)        [ -f "orch/$T.mjs" ] && node "orch/$T.mjs" || { echo "no runner for $T"; exit 125; } ;;
esac
RT
chmod +x /tmp/rt.sh
GOOD="${BISECT_GOOD:-}"   # explicit good commit (manual bisect via a bisect/<test>/<good-sha> branch)
[ -n "$GOOD" ] || for c in $(git rev-list --first-parent -n 40 "$BAD" | tail -n +2); do
  st=$(gh api "repos/$REPO/commits/$c/statuses?per_page=100" --jq "[.[]|select(.context==\"gate/$T\")][0].state" 2>/dev/null)
  [ "$st" = success ] && { GOOD=$c; break; }
done
[ -z "$GOOD" ] && GOOD=$(git rev-list --first-parent -n 40 "$BAD" | tail -n 1)
git bisect start "$BAD" "$GOOD" >/dev/null
git bisect run bash -c 'bash /tmp/rt.sh '"$T"' > /tmp/step.log 2>&1; rc=$?; { echo "== $(git rev-parse --short HEAD) rc=$rc"; tail -4 /tmp/step.log; } >> /tmp/steps.log; exit $rc' >/tmp/bisect.log 2>&1
cat /tmp/steps.log 1>&2 2>/dev/null || true
F=$(git rev-parse refs/bisect/bad 2>/dev/null || git rev-parse HEAD)
git bisect reset >/dev/null 2>&1
echo "BISECT $F $(git log -1 --format='%an | %s' "$F") (good end ${GOOD:0:10})"
