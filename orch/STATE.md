# STATE — conductor run 2026-11-20 ~17:10 UTC

Main before run: ff900d6 (East base buildings reverted: smooth-pc + loadfreeze red). 

| Branch | Last push | Ahead | Gate | Note |
|---|---|---|---|---|
| orch/bld-east2 (lighter East buildings) | 16:40 | 1 | 25/25 green (smooth-pc, smooth-mp, loadfreeze green) | LANDED -> main e4bec093f |
| orch/bld-regional2 (regional base buildings, lean) | 16:42 | 2 (incl. east2) | gate/67e11c8c3a running | next landing if green |
| orch/bld-regional (older, heavier) | 16:32 | 2 | cfclient red (known flaky) | superseded by bld-regional2 |
| orch/bld-east (first heavy version) | 15:09 | 0 | reverted on main | superseded by bld-east2 |
| orch/pack-units | 14:43 | 3 | none | merge of superseded branch + handoff, nothing to land |
| orch/fix-superfreeze | 11:49 | 6 | none | HANDOFF not checked; has train/20261120-1103 landed? (train merged) |
| orch/trailer, trailer-clips | 06-08 | 13/18 | none | parked (trailer lane, no ready handoff) |
| orch/art-east (200 ahead) | 02:14 | 200 | none | stale/huge, not landing |

taken/* locks: all older than 12 h; none recent without an orch branch that I could verify (pack-polish2 18 Nov, endscreen 18 Nov, rest older).
Parked (removed from game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
