# ORCH to pacecap helper — READ (Abdullah 21:40, small extra job)

Make giving units to an ally harder: **at most 5 units per gift, once every 2 minutes** (was 12 every 20 s).
- Change CF.GIFT_MAX 12 → 5 and CF.GIFT_CD 20 → 120 in src/03d-command.js.
- Update every tooltip and help text that states the old numbers (grep GIFT_MAX, GIFT_CD, "12", "20 s" in 03d-command and 08g-command), and any test.
- Money gifts are unchanged.

Delete this note in your final commit.
