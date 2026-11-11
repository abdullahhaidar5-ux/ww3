# HANDOFF q-words (nightly queue runner, 2026-11-10)

## Done (slice 1)
- Checked all ~9,100 player-visible strings (`python3 orch/words.py` prints `file:line:text` for every string literal in src/,
  comments skipped): codespell found no misspellings; no doubled words, a/an slips or broken punctuation; no old faction
  name, real group's name, "End turn" or "Classic" in any visible text (only in code comments = history).
- A cheaper helper proofread the 1,430 menu/HUD/tutorial/encyclopedia strings (src/08*, 14-menu, 06-view, 03-sim, 03i, 01c):
  only naming mismatches. Fixed: "strike centre" → Strike Center, "defence gun(s)" → Defense Gun(s), "war factory" →
  War Factory, tutorial "Missile Defence battery" → Anti-Air Missile Site, encyclopedia "all 18 nations" → "every nation".
- Guard in `orch/decisions.mjs` ("Words" block, static): old faction names, real groups' names, turn wording and those
  stale building names fail the gate if they come back in a string.

## Next
1. **Abdullah decides: American or British spelling.** Prose is mostly British (defence ×143, armour ×47, programme, colour…),
   official names are American (Defense Gun, Strike Center, Command Center, … Armor Package, Mass Mobilization). List:
   `python3 orch/words.py > /tmp/s.txt && codespell --builtin en-GB_to_en-US -q 3 /tmp/s.txt`. Convert only inside strings
   that contain a space (never keys/identifiers); keep real names (Australian Defence Force, SANDF, Ethiopian National
   Defence Force, Labour, Centre Macedonia); update the 17 orch tests that mention the words; then add the losing spellings to the guard.
2. Proofread the rest with a cheap helper in chunks: src/01-data.js (110 KB of text: nation blurbs, upgrade names), src/13* (grand
   campaign panels/events, ~250 KB), src/02c-memaps.js (map names/blurbs). src/09-audio.js is voice-line text (native languages) - skip.
3. What's-new entries (`WHATS_NEW` in src/08i-hud.js) were in the proofread set and are clean.
