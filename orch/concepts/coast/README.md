# True coastlines on the grand map (helper "mapcoast", 2026-11-11)

Abdullah: "The map borders are also really ugly for instance Italy isn't a boot. Turkey and Greece are just meshed together."
Before, the land shape was a coarse 1200x600 mask blurred by about 150 km, so every narrow shape melted. Now land or sea is decided for every pixel on screen from the full 2400x1200 map (province map + real elevation), so Italy is a boot, the Aegean is open water, and Sicily, Sardinia, Corsica, Crete, Denmark, Qatar, Korea, Japan and Florida have their real outlines.
Borders are traced on the same fine map: thin smooth lines, country borders stronger than province borders, none across open sea; nation colors stop exactly at the shore.
Pictures (same four views, 1600x900): `europe-*`, `italy-aegean-*`, `middle-east-*`, `levant-red-sea-*`, each as `-before.jpg` and `-after.jpg`.
Cost: no new draw calls or meshes, one shore texture (the old sea texture, now 2400x1200); guard in `orch/decisions.mjs` checks 6 sea points and 8 land points (Equal Earth map, `orch/grandproj.mjs`).
