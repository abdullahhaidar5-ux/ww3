# Realistic start — tourney results (leadersC, 2026-11-10)

Abdullah 2026-11-07 22:5x: "Does conquest have realistic start?" -> "Yes but keep the game fair". Realistic mode (lobby toggle, Conquest + Battle; Balanced stays the default and is unchanged)
now gives every nation a start from its real 2026 tier (`GR_REAL`) with equal win chance through asymmetry. Knobs: `REAL_TIER` in `src/01-data.js` (cash, fire-support columns, `inf`/`hv` cost,
`bt` build time, `up` income upkeep, `fort` fortification cost, `atg` AT/drone/rocket cost, `st` extra start units) + a small Zealous home-defence bonus (`realRowOf`).

Replay: `node orch/tourney.mjs --real --pairs US-IR,RU-UA,IL-RS,CN-TW,SA-DW,KP-KR,US-KP --factions US,IR,RU,UA,IL,RS,CN,TW,SA,DW,KP,KR --games 6 --minutes 20 --jobs 2`
then `python3 orch/realpairs.py <log>` (first-listed side's win %, 6 games per pairing, sides alternate, Normal AI, 3 maps).

| Pairing | Round 1 (first tier numbers) | Round 2 (big powers slower/dearer, small more infantry) | Round 3 (shipped numbers) |
|---|---|---|---|
| US–IR | US 67% | 50 / 50 | 50 / 50 |
| RU–UA | RU 67% | 58 / 42 | 67 / 33 |
| IL–RS | IL 17% | 25 / 75 | 17 / 83 |
| CN–TW | CN 100% | 50 / 50 | 33 / 67 |
| SA–DW | SA 83% | 17 / 83 (DW) | 33 / 67 (DW) |
| KP–KR | KP 83% | 67 / 33 | 42 / 58 |
| US–KP | US 100% | 25 / 75 (US) | 25 / 75 (US) |

**Honest status:** only US–IR and KP–KR are inside 40–60% in the shipped numbers; the others still lean 25–35 points one way (6 games per pairing is also ±20 points of noise, so each round costs
~50 min of tourney time). Realistic stays opt-in; Balanced (the default) is untouched. Next knobs, in order: (1) IL–RS — RS (Zealous + small) is far ahead of IL: lower the Zealous bonus further or give
Firepower-reliant IL the Great-power start; (2) US–KP — superpower still wins 75%: raise `bt`/`inf` for Superpower again or give KP a second AT team; (3) SA–DW — DW still ahead: Regional `st` +1 tank for SA;
(4) CN–TW now favours TW: Great-power `bt` back toward 1.15. Re-run with `--games 12` before trusting a result.
