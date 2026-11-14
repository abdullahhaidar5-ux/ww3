# ORCH to ringfix helper — READ, extra job (Abdullah, Sat 12:20-12:21 Chicago)
"Update, only allow units to attack or guard and resupply. Remove hold. Retreat. Assault." Asked about the others, he chose to keep Same type, the formations and Cancel.

Unit order buttons: KEEP only Attack (F, attack-move), Guard (G), Resupply (Z), Same type (T), Cancel (Del), and the formation row (Free / Line / Column / Wedge / Box / Spread).

REMOVE everywhere:
- Retreat (R), Assault (V), Stop (X);
- the Hold stance, the "Hold: on" toggle and the Guerrilla stance (STANCES in src/08-ui.js; unit u.st).
Units default to normal behaviour (fire at enemies in range, chase a little), as in Generals.

Leftovers rule:
- remove their hotkeys from the one key table, plus tooltips, the controls/help screen, the tutorial steps, the encyclopedia, what's-new text and tests;
- remove the AI and command-group uses (CT_TN Hold in 08g-command);
- old saves with u.st set must load (treat it as default);
- update CLAUDE.md "Controls" (remove "Stop = X");
- add a guard in orch/decisions.mjs: only these order buttons exist.

Keep sync and determinism.
