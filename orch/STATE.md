# Conductor state — 2026-11-15 03:15 UTC
main head 2048ce4 (HANDOFF zhfeel). Latest train before this: 20261114-2055 (not in main, superseded).
Train now: train/20261115-0300 = main + orch/gatefix (clean merge), sent to gate/52d4501321.
| branch | last push | ahead | state |
|---|---|---|---|
| gatefix | 11-15 02:34 | 2 | gate on its own sha: red cfclient controls decisions migrate-dual save smooth-pc superfreeze -> re-gated in train |
| zhfeel2 | 11-15 02:37 | 1 | just pushed, no gate yet; next train |
| rangemirror | 11-14 20:08 | 1 | handoff "ready", no cigate, not yet included |
| pileflag2 | 11-14 19:59 | 9 | no handoff file; own gate red earlier; needs fresh run |
| ammotruck | 11-14 21:49 | 11 | not landed, redo on current main |
| techbldgs | 11-14 12:46 | 1 | docs only |
Everything else under orch/* is already inside main (ahead 0). onegame, nations20 landed earlier.
Parked (removed from the game): camphud nofightit warpeace mapshapes eu4audit civhumans.
Note: repo has ~16k branches (gate-logs); full fetch times out, fetch orch/* taken/* only.
