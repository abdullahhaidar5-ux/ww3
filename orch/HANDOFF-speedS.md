# HANDOFF speedS (2026-11-11)
Done: orch/reports/speedS.md (frame split), governor rework in src/06-view.js (qualGov, two ladders, backoff), AO half-rate in src/10-post.js, guard orch/qualgov.mjs (in decisions.mjs). Local smoke PASS. Commit cf33e78f on branch orch/speedS.
CI: baseline gate/29bc1f3c77 (origin/main) and slice 1 gate/cf33e78fb7 were both still `queued` after ~25 min (runner queue full). Statuses post to the commits; read smooth-pc / smooth-mp / grandsmooth numbers from the gate logs/artifacts and compare.
Next: when both finish - land only if smooth-pc, smooth-mp, grandsmooth green and equal-or-better and no new red gate vs main; else tune. Fill the Numbers section of orch/reports/speedS.md. Possible slice 2: shadow pass skip for far/static, minimap/HUD at lower rate when struggling (small: drawMini 2.3 ms, drawHUD 2.1 ms).

Update 02:30Z: CI numbers in orch/reports/speedS.md. Slice 1 gates green but p95/p99 and mp client frame p95 worse in a single run; not landed. Next: smoothbase/speedS 5-run median, then land or fix.


Update 2026-11-11 evening (nightly runner, branch orch/q-speed): merged onto main 068b3146, five-run comparison done (orch/reports/speedS.md, last section): pc better, mp identical code path (client frame p95 there is noise). Added: AO and shadow passes take turns; effects-only steps skip resize(). Landing = orch/q-speed once its gate run shows no red beyond main's flaky four (audio, cfclient, mpsync, tutorial). Next: slice 2 (see report).
