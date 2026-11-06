# CHAIN — grand stages start each other (Abdullah 2026-11-06 06:20 "chain the stages")

Every stage below also has its own scheduled start time as a fallback. To avoid idle hours, each stage **starts the next one
the moment it finishes**. Usage stays the same; the chain just removes the waiting.

| Order | Stage | Scheduled task id | Fallback start (UTC) |
|---|---|---|---|
| 1 | grand1 | trig_01MSzbwrNFQr3pL8WjzHYPRQ | 2026-11-06 13:00 |
| 2 | grand5 (moved up: the map's LOOK, Abdullah 2026-11-06 08:04) | trig_01Njh4bSPF5985qWdMQro6Yy | 2026-11-07 17:00 |
| 2b | grandmirror (battles mirror the map, Abdullah 2026-11-06 08:09) | see orch/CHAIN-ids.md | 2026-11-07 08:30 |
| 3 | grand2 | trig_01HNEmcfdvDvGqYkz22bsWBL | 2026-11-06 21:00 |
| 4 | grand3 | trig_01Xyp14g6U8dcjkEfpMc9t4M | 2026-11-07 04:00 |
| 5 | grand4 | trig_01TixPPBWM54Wc3kBCqFpdjY | 2026-11-07 11:00 |
| 6 | grand4b | trig_018QBVULJjHr22A7QwaEGQQ3 | 2026-11-07 16:00 |
| 7 | grand6 | trig_01DtGg8wDtZcpYEhqttMihsi | 2026-11-07 23:00 |
| 8 | grand7 | trig_012iovw6hb9bkzDZ8K7ySJU4 | 2026-11-08 05:00 |
| 9 | integrate2 | trig_01Fr8JSjqX6YggocaqLDGjBv | 2026-11-08 13:00 |

## FIRST (before any other work — costs almost nothing)
1. `git fetch -q origin` then check:
   - `git log origin/main -1 --format=%H -- orch/reports/<stage>.md` or a `<stage>` heading in `orch/HISTORY.md` on origin/main
     **and** no `orch/HANDOFF-<stage>.md` saying it stopped early → this stage is already done: **stop now** (final message:
     "<stage> already shipped by an earlier run"). Do not fire anything.
   - `git log -1 --format=%ct origin/orch/<stage>` (if the branch exists) is less than 60 min old → another run of this stage
     is working right now: **stop now** (final message: "<stage> already running"). Do not fire anything.
2. Otherwise do the stage as your prompt says (including its "wait for the previous stage" loop — the previous stage is the row above yours in this table, whatever your prompt says).

## LAST (after you shipped to main, or wrote your HANDOFF and pushed the branch)
- Start the next stage in the table once (the row right below yours): call the scheduled-task tool `fire_trigger` (Claude_Code_Remote connector) with the
  next row's id. If the tool isn't available or errors, write one line in your report; the fallback time will start it.
- Never fire anything else, never change, disable or delete any scheduled task.
