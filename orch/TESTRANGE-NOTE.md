# testrange helper: READ THIS - extra item from Abdullah (Fri 2026-11-13 20:03 Chicago)

Photo of Test range: small red/orange round badges next to every one of his vehicles; he asked "What's the red symbols".
They are the OUT-OF-SUPPLY badge (src/06-view.js ~line 189: `oos=!e.sup&&G.t-(e.supT??G.t)>20`, crossed crate in a dark circle).
Test range has unlimited money and everything unlocked, so supply must never run out there: in G.sandbox every own unit is always
in supply (no out-of-supply badge, no ammo/heal penalty). Also make sure Battle (G.battle, no supply lines since train 12) never shows
this badge. Conquest keeps it, but give it a hover tooltip "Out of supply - get back to a road your side holds or a supply depot".
Guard: sandbox and Battle units never get the badge. Delete this file in your last commit.

## Owner change 20:18-20:19 Chicago: supply lines come INTO Battle (Conquest removed). So in Battle the out-of-ammo badge follows the new ammo rule (orch/ammozone); only Test range has no badge and unlimited ammo.
