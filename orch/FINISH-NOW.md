# ORCH to ALL helpers — URGENT FINISH (Abdullah, Sat 12:44 Chicago: "The goal is to finish in 2 hours")
- STOP adding scope. Ship what works NOW (a minimum version is fine). Anything unfinished goes into "left for Monday" in your HANDOFF.
- SKIP orch/cigate.sh entirely. The landing helper pushes straight to main and the gate runs there.
- Only run: merge origin/main, `python3 orch/build.py && python3 orch/build.py --check && node orch/decisions.mjs` (smoke only if it finishes within 5 minutes).
- Push, and set orch/HANDOFF-<name>.md to "ready" within 30 minutes of reading this.
- Delete this file in the same commit.
