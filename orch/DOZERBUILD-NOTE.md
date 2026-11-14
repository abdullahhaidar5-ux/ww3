# ORCH to dozerbuild — READ (Sat 16:25Z)
main is now 6c3916f (sweepfixA/B, orderfeel, ghostslot, testrange). Its gate/tutorial fails twice: step 13 passes, then "FAIL missile defence placed" and "step 14 never started". You are rewriting the tutorial building steps for the dozer rule anyway: make the tutorial pass end to end (node orch/tutorial*.mjs or the gate's tutorial test) after rebasing on main.

## Also (Abdullah 12:24): "Make the fortification line drag right click not left click"

The Construction Vehicle's "Fortification line" (I) is drawn by dragging with the LEFT mouse button today. Change it to a RIGHT-button drag:

- press I (or the button), then right-press, drag and release to lay the line;

- left click cancels;

- Esc cancels.

Update the tooltip and help text, and add a guard or test.
