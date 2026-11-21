# Lessons (read before any landing) - the Sloppy Week, 2026-11-17..20

Abdullah 2026-11-20: "You made the game unplayable", "Sloppy work this week", "You lied", "Never do any of this again always check yourself".
What happened: 8-10 helpers landed art in parallel on green gates; on his real PC the game became super laggy, soldiers got black boxes and turned see-through/white, buildings slowed battles; he found it himself. Two rollbacks (to Nov 17, then to Nov 19 night aae60d36, which he said "isn't laggy").

Rules (ORCH's own way - measure, change ONE thing, prove it, ship, log):
1. Green gates are NOT proof something looks good or runs smooth on a real PC (runners have no GPU). Look at every visible change yourself (before/after picture, same camera, desert AND snow map) and send Abdullah the picture; land it only after his OK.
2. One change at a time on main, so any problem has one cause and one revert.
3. Only ORCH lands. Helpers (max 2-4, one file-owner each) work on branches; never push to main before their own full gate is green.
4. Smoothness first: a visual change that costs frames does not land, however good it looks.
5. Never report something as working until you have seen it work. Say "bad" and "not sure" plainly. No spin, no promised times you don't keep.
6. Broken things on the live game come before anything new. If Abdullah reports a problem, the live game is fixed (or rolled back) first.
