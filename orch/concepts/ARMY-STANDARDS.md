# Army Standards — how armies look on the grand map

Abdullah 2026-11-10 19:12 (screenshot of red figure blobs + shield badge + three waving flags at Tehran): "Why not have the
armies represented in a better way. Come up with something creative, clean, and intuitive. Impress me" · 19:14 "Also why so
many flags?" · 19:17 "Go" to the concept sheet `orch/concepts/army-standards.jpg` (source: `army-standards.html`, inline SVG —
copy shapes, colours and proportions from it).

(2026-11-13 mapshapes: the token is no longer round — land army = shield, fleet = ship hull, air group = swept wing, Abdullah 2026-11-11 17:37 "Shield". Everything else below still holds.)
One round token per army, read like a watch face. It REPLACES the figure blobs, the shield badges and the per-army waving flags.

1. **Token:** round flag in the middle = whose army. Green ring around it = strength left (men and machines vs full; turns
   red under 35 %). Thin gold outer ring = supply (fuel + ammunition; red under 30 %). Small pin under it = exact map spot.
   Plate to the right: unit count, general's stars (level), and at close zoom the make-up: infantry · armour · fire support counts.
2. **Rim = whose side:** white = yours, red = at war with you, blue = ally; everyone else small, faint, no number.
3. **Shape = what it is doing:** plain circle = holding · arrow nose + dotted route + arrival ("4 days") = marching ·
   gold corner brackets = dug in / fortified · dashed ring closing round the town = besieging · two tokens touching with a
   lightning mark and a green/red tug bar = fighting (bar = who is winning).
4. **Zoom tiers (the ONE shared zoom-tier value from the calm-map work):** far = owner-colour dot + number (yours/enemies
   bold, rest faint dots) · middle = the token · close = token + the real army in miniature on the ground (instanced
   models of its actual unit types, a few figures per type, inside a dashed footprint in the owner's colour).
5. **Odds:** with one of your armies selected, every enemy army in reach shows a pill: Good odds (green) / Even fight
   (gold) / Bad odds (red), from the same strength estimate the auto-resolve uses (one source, no second formula).
6. Several armies in one province: one stack with a count; hover/click fans them out.

Rules: one system (extend the grand-map army marker owner in `src/13e-grand3d.js` / the badge code; delete the old figure
blobs, shield badges and per-army waving flags — a decision is done when its leftovers are gone; legend "What am I looking
at?" updated to the new token). Instanced/merged per material, grand-map smoothness equal or better, never raise a budget.
Colour is never the only signal (rim + shape + position). Deterministic view only — no simulation change.
Guards: no figure-blob or waving-flag meshes for armies at any tier; one token per army (or one stack per province);
far tier draws dots only; odds pill uses the auto-resolve estimate.
