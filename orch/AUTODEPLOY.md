# Automatic server updates (Abdullah 2026-11-09: "yes")

`.github/workflows/autodeploy.yml` runs every 15 minutes (and after each push to `main`, and on demand). It looks at the newest
commits on `main`; the newest one whose **every gate/\* status is green** (the matrix in `.github/workflows/gate.yml`) and that
changed simulation files since `servers-live` (`src/01*`, `02*`, `03*`, `07*` — a little broader than the server's own
build list on purpose) is put on `servers-live`, then `deploy-servers.yml` is started on it. That replaces opening a
`main → servers-live` pull request for Abdullah to merge: **helpers no longer open those PRs while this is on.**

Rules it keeps: never force-push; a plain fast-forward when `servers-live` is an ancestor of the commit; otherwise a merge
commit whose tree is exactly the gated commit (still a normal push, no history rewritten) — but only when `servers-live`
holds nothing that `main` lacks (its tree equals the tree of some commit in `main`'s history). If it can't do either, or the
push is refused, it opens (or reuses) the `main → servers-live` pull request and stops. Adds no secrets and prints none.

**Kill switch:** put `off` in `orch/AUTODEPLOY` (on `main`), or set the repository variable `AUTODEPLOY` to `off`.
Anything else (the file says `on`) = enabled.
