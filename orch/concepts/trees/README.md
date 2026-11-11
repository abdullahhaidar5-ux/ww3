# Grand map trees: before / after (helper "maptrees", 2026-11-11)

Abdullah: "the trees look too cartoony in the grand map". Same five camera views before and after, 1600x900 (`node orch/maptreeshots.mjs <prefix>`).
Before: big lime lollipop trees and stacked Christmas trees, taller than the towns. After: small groves of ragged, muted crowns that merge into one dark canopy; single small trees at forest edges; dull date palms on desert rivers only.
Views: `germany` (central Europe / Balkans, normal playing zoom), `nepal` (Himalaya foothills and Bengal, the worst case before), `levant` (Iraq and the Gulf: bare desert, palms on rivers), `close` and `palms` (closest zoom).
All tree art is drawn in code (no downloaded pictures). Still one texture of the same size, one instanced draw, same tree limit.
Guard: `orch/grandtest.mjs` ("maptrees") fails if the tree pictures turn lime/neon again, lose their variants, or grow back to toy size.
