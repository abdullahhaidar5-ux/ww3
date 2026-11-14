# bldqueue helper: READ THIS - correction from Abdullah (Fri 2026-11-13 20:16 Chicago)

"Unlimited queue"

No 9-item cap: each production building's queue is unlimited (money is still paid when an item is queued and refunded when cancelled or
when the building is lost). UI: show the first ~8 queued icons with count badges and a "+N more" chip, so a long queue never overflows the
command bar; Shift+click adds five; a "repeat/hold" mode is NOT needed. Remove the old cap (q.length>=9) everywhere, incl. AI assumptions and
tests. Guard: queuing 20 infantry in one Barracks works and all 20 come out of it. Delete this file in your last commit.
