#!/usr/bin/env bash
# Run the full ship gate for the current commit on GitHub's free runners, all tests in parallel (~10-20 min instead of
# 1-2 h on this machine). Usage: orch/cigate.sh [commit-ish]   (default HEAD). Pushes it to gate/<shortsha>, then waits
# for every "gate/*" commit status and prints the results. Exit 0 only if all passed.
set -u
REPO=abdullahhaidar5-ux/ww3
SHA=$(git rev-parse "${1:-HEAD}") || exit 2
git push -q origin "$SHA:refs/heads/gate/${SHA:0:10}" 2>&1 | grep -v '^remote:' || true
N=16; t0=$(date +%s)
while :; do
  J=$(gh api "repos/$REPO/commits/$SHA/statuses?per_page=100" 2>/dev/null) || J='[]'
  done_n=$(printf '%s' "$J" | python3 -c 'import json,sys;s={};[s.setdefault(x["context"],x["state"]) for x in json.load(sys.stdin) if x["context"].startswith("gate/")];print(len([v for v in s.values() if v!="pending"]))')
  [ "$done_n" -ge "$N" ] && break
  [ $(( $(date +%s) - t0 )) -gt 3600 ] && { echo "cigate: timed out with $done_n/$N results"; break; }
  sleep 30
done
printf '%s' "$J" | python3 -c '
import json,sys
s={}
for x in json.load(sys.stdin):
    if x["context"].startswith("gate/"): s.setdefault(x["context"],(x["state"],x["description"]))
bad=0
for k in sorted(s):
    st,d=s[k]; bad+= st!="success"; print(("PASS " if st=="success" else "FAIL ")+k[5:].ljust(15)+" "+(d or ""))
print("CIGATE "+("PASS" if bad==0 and s else "FAIL"))
sys.exit(1 if bad or not s else 0)'
