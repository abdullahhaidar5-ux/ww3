# HANDOFF loadF (2026-11-10)

Branch `orch/loadF`, 3 commits (loading / autodeploy / rules). Gate run on `gate/<sha>` (see statuses). Local smoke was too slow in the
cloud sandbox (battle load 250 s) - verified with build --check, lint, a lazy-open Playwright check and CI gates.

## Automatic server updates - what Abdullah may need to tap (only if the first run says so)
The workflow uses only GITHUB_TOKEN (permissions set in the file). Two repo settings could still block it; both are one tap:
1. If `servers-live` is a protected branch (requires PRs): Settings > Branches - allow GitHub Actions to push, or the workflow
   just falls back to opening the old PR.
2. For the PR fallback: Settings > Actions > General > Workflow permissions > "Allow GitHub Actions to create and approve pull requests".
`servers-live` today holds old (pre-rewrite) history, so the first automatic run will probably open the main -> servers-live PR once;
merge it (one tap) and every later update is automatic. Kill switch: `orch/AUTODEPLOY` = off.
Auto-update only sees commits whose exact SHA has all gate/* statuses green (rebase, then run cigate.sh on the final SHA, then push that SHA).
