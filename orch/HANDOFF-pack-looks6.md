# HANDOFF pack-looks6 (2026-11-18)
Branch orch/pack-looks6 (pushed after every commit).
Landed on main (own cigate green): Shia family vehicles + strike/textured depth pre-warm (932a668; the superfreeze failure was IR/RS long frames on a slow runner, the depth program only showed in US/OB within PROGMAX - the extra pre-warm is cheap insurance), West family (9623a37).
On branch, gate state in the log below: East family (abce7ce), Regional family (a338d49), night headlights + wet ground (HEAD).
Screenshots: orch/shots/vehicles-{shia,west,east,regional}.jpg via `node orch/vehiclesheet.mjs <family>` (contact sheet: tank, truck, ATGM, AA, artillery, EW per nation; regional sheet shows 6 of 8 rows).
How: per-nation paint variants (RMOD entries with tint on existing models, no new meshes) + RMAP.atgm carriers (Humvee/Ozelot); modelFor keeps the ATGM's own weapon extra.
Night lamps: one instanced `lamp` decal set (src/11-models.js decalSet/decalUpdate), drawn only when todDark()>=.3, warmed with 'eye','blob'. Wet ground: WETG uniform in the ground shader (src/04-gfx.js), eased in weatherFX (src/05-fx3d.js).
Not verified in a real browser by me: how the lamp pool looks at night and its exact placement (assumed +x of the unit = forward); first thing to look at.
Flaky gate jobs seen: smooth-mp / migrate-down "timed out waiting for client in the lobby" (passed on re-run).
Left: land East, Regional, night+wet each on its own green cigate (rebase on origin/main first); AA/arty/EW use the truck model of the nation (truckKey) so they inherit the shape not the tint.
Try (2 min, PC): Test range as Germany or Britain, spawn trucks and anti-tank teams (national paint, Humvee/Ozelot carrier); then a night battle (Battle > time of day night): vehicles throw a soft light pool ahead of them; in rain the ground darkens.
