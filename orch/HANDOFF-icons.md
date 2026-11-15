# HANDOFF: icons (branch orch/icons)

Abdullah 2026-11-14 21:39: "make sure every button has an icon that makes sense."

What changed
- One icon table: `ICON_SVG` (was `ORD_SVG`; src/08-ui.js keeps the order-dock icons, new `src/08p-icons.js` extends it with ~60 more in the same style: 48x48 box, stroke 3.2, one bright colour, inline SVG, no emoji/images).
- Upgrade buttons: icon by what they improve (`icoUpg`: first effect of `UPG[k].fx`: rifle, vest, armor, shell, scope, speed, plane/heli/drone/ship, rocket, star, flag, cash, radar, clock, wrench, leaf, burst). The old text "▲" is gone.
- Generals' powers: icon by type (`icoPow`; national powers by their `type`). The General window rows copy the icon.
- Strike LAUNCH, Sell, Repair, General star, pause / menu / fold / minimap, pause-menu items, squad buttons, Test range panel (+ weather), alerts / help in the top bar, dock "Same type" and "Resupply".
- Icons are built once per button (`icoPut`); a MutationObserver re-puts the icon only when code rewrites a HUD button's text. Nothing per frame.
- Guard: orch/decisions.mjs "icons" block (upgrade/power buttons, order dock, HUD buttons have svg or a drawn picture; every upgrade maps to a real icon).

Not done / ideas
- Local run was slow (headless swiftshader); decisions.mjs not run to the end here. Run `node orch/decisions.mjs` + `orch/cigate.sh` if unsure.
- Buttons only reachable in menus outside the battle (main menu, lobby) were not touched.
- Test range panel "Day/Dusk/..." buttons get icons at creation (sbCond).
