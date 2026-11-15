# HANDOFF nations20 (branch orch/nations20)

**Done:** playable nations cut to exactly 18: IR RS DW RV OB / US GB FR IL UA / RU CN KP / SA AE TR EG PK.
- One allow-list `PLAYABLE` in src/01-data.js; `FKEYS` = PLAYABLE. Every picker (Battle setup, lobby seats, Test range, quick start), AI/random pick, encyclopedia and unit guide already read FKEYS; achievements list now reads PLAYABLE. JP no longer pushed into FKEYS (src/01c-jp.js).
- `natFix(f)`: old saves, replays and online slots naming a removed nation fall back to a kept nation of the same morale style (EU/DE/PL->FR, IQ->RV, SY/KD->RS, BI->OB, AF->DW, IN/CU->UA, KR/JP->US, AU/CA->GB, otherwise by style). Used in svLoad, rpParse, net seat/pick.
- Missions: the two missions that used DE now use FR. Map "Home turf" text only names kept nations.
- Data rows, voices, anthems of removed nations are NOT deleted (they stay as hidden bases, grand-campaign code under Extras still reads them); sw.js does not precache vo/ so nothing to remove there. Morale styles and signature assets untouched (Zealous never routs: IR RS DW RV KP OB).
- Guard: orch/decisions.mjs checks FKEYS == the 18, Battle setup picker shows exactly the 18 names, AI select lists the 18, natFix maps every removed code. CLAUDE.md Factions bullet, orch/SYSTEMS.md morale line, orch/DECISIONS.md updated.
- Screenshot: orch/shots/nations20.jpg (Battle setup nation picker, 18 cards).

**Local checks:** build + `--check` OK; smoke PASS (on the pre-rebase base; rebuilt after). Local decisions run times out in this sandbox (CLAUDE.md says so) - rely on the CI gate.

**WARNING for ORCH:** the branch also holds orch/NATIONS20-NOTE.md (ORCH, "Keep 22": adds IN JP DE KR). It came from a repo file, not the stored task (which says 18), so it was NOT applied and the note was left in place. To switch to 22: add IN JP DE KR to PLAYABLE, drop them from NATFALL, change the list `W` in the decisions.mjs guard, update CLAUDE.md/DECISIONS, delete the note.
Also: EG's morale style in code is Home defenders (CLAUDE.md earlier listed it Professional); left as coded.

**Gate:** see bottom line (cigate pushed as gate/8d9a28eab3; GitHub runners were queued for 30+ min when this was written).
