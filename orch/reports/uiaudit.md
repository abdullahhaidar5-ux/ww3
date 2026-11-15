# UI audit (2026-11-15, scheduled run)

Scope done in this run: every hotkey and key handler (`06z-keys.js` table vs all `keydown` listeners), mouse hint texts against the Controls rules, and the command bar / General window for duplicates. Not done (sandbox too slow for menu screenshots): a visual pass over every menu screen, so the "looks" part (sizes, alignment) is NOT audited yet, and there are no before/after screenshots because the fixes are keys, not visuals.

| Found | Status |
|---|---|
| **V** was Sell AND a leftover voice-command push-to-talk listener (code sat unreachable after an early `return`; ~70 lines of voice rules, language button, toast) | Removed all voice code |
| **N** was Bunker Buster AND "night vision / thermal" (handled in `10b-vision.js`, no key-table row) | Night vision now has its own row, spare key **`** (backtick); N is only Bunker Buster. Button tooltip shows the live key |
| Key table text "Flares / show supply lines (Conquest)" | "(Conquest)" removed |
| Hint texts saying "right-click to place/launch" | None found; all hints already match the rules |
| COMMAND battle-groups panel, battle-plan keys, formations | Already hidden/removed; only dead code remains (not touched, harmless) |
| Guards | `orch/decisions.mjs`: no key bound twice in the table, W A S D never used, every letter a handler reacts to has a row, no "right-click to place/launch" hint, no voice leftovers |

## Left alone on purpose (questions for Abdullah)
1. **Z (Resupply)** still works as a hotkey (sends units back to supply) although the Resupply button was removed. Remove the key too?
2. **LAUNCH** for the Strike is on the Strike building's command bar AND in the General window. Keep both, or only the General window?
3. **O** is Repair (tap) and also "hold to show ammo/supply rings", **L** shows supply lines: keep the hold-O, or drop it since L does the job?
4. **U** opens the auto-build list and is also the Sanctions power key: split them?
5. **P** enters photo mode (which pauses single player); there is no plain pause key. Intended?
