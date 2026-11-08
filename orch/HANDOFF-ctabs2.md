# HANDOFF ctabs2 (2026-11-08)
Shipped to main (636e4f08): Decisions & policies tab + Stability & expansion tab — src/13zzb-gdecide.js, test orch/ctabs2test.mjs (CTABS2 PASS),
smoke PASS, grandtest PASS. grandsmooth fails in this sandbox **on main too** (wide ~9 s vs 5 s budget in software GL, same numbers with and
without this change — the change is UI-only); CI is the judge.
Not done (next EU4 tabs, same pattern — extend existing systems, register with npTab):
- Government/estates: merge into the existing 'gov' (13l-people) + 'estates' (13o) tabs, don't add a third.
- Economy budget: the 'eco' tab only links to geUiPanel; an EU4 income/expense ledger from geAfterProvinces data.
- Military overview: 'mil' tab + force limit (13y-gforce) + tradition + manpower in one screen.
- Subjects: grVasInit / vassals (13-grand) have no tab yet.
Notes: the tab row now has ~36 tabs (wraps to 6 rows) — a grouped tab bar (EU4-style icon strip) would follow the UI-flow rule better.
Policies read GID_GROUPS keys eco/dip/mil + the national tree; if the Ideas helper renames groups, update GPOL[...][3].
