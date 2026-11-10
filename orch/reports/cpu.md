
## Run 2 (orch/speedD, 2026-11-10) — no code shipped
- Sandbox: 2 cores, software GL. `node orch/smooth.mjs` alone did not finish within 10 min (killed), so no trustworthy before/after numbers can be produced here; grandsmooth not attempted for the same reason.
- CI gate history (gate/* branches, latest runs of 2026-11-07/08): gate/smooth-pc flips PASS/FAIL between runs (9edfd85a FAIL 1 problem; 649609b7 PASS); gate/grandsmooth FAIL on 1ac17c11, PASS on 9edfd85a, FAIL on 649609b7 — i.e. noisy/borderline, not a clean regression to bisect. Main commits themselves carry no smooth statuses (gates run on gate/* branches).
- Per CLAUDE.md ("never ship a look/perf change without equal-or-better gate numbers"), nothing was changed. Slices 1-4 are unstarted.
- Needed: a runner that can execute smooth/grandsmooth (CI, or a machine with GPU), then slice 1 (frame-budget scheduler after render in 08-ui loop ~L1494), slice 2 (extend QUAL in 06-view.js + Settings Performance Auto/Quality/Speed), 3 (worker), 4 (CDP profile).
