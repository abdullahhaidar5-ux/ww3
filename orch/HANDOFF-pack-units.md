# HANDOFF pack-units (PACK helper, 2026-11-19)

Done
- Item 1 (unit limit 500 per player up to 4 players, 300 for 5-8): was already on main when this run started (d7fbc49: popCap by team count, DECISIONS line, CLAUDE.md Targets, guard in orch/decisions.mjs) and servers-live (b3f11e64) already contains it. Nothing left.

Item 2 (soldiers up close) - started, NOT landed
- Branch orch/pack-units: (a) orch/gfxinf.mjs now takes --idist a,b --idy a,b --idx N --clip x,y,w,h for close-up framing (use: node orch/gfxinf.mjs --scenes golan:IR:IL --tag after --out infantry-closeup --idist 40 --idx -90 --idy 58 --clip 240,0,800,500; one run is ~4 min on swiftshader); (b) src/11-models.js soldier material (mergeSoldier, the 'solgear' fragment hook): fine woven grain + ripstop squares + slightly stronger camo contrast, faded out by screen-space derivative so it never shimmers. Same shader program for all soldiers, no new draw calls/textures/triangles.
- Shots: orch/shots/infantry-closeup/before|after (IR, golan). The change is real but SUBTLE (a bit crisper camo); I did not spend a 35 min cigate on it alone. Not pushed to main.
- Findings: IR jackets are plain dark (camo only on the trousers) - the biggest visible win is a camo pattern on the jacket + chest rig/pouches and a face/skin pass. The merged soldier has one baked vertex-colour per vertex and one uniform texture, so a camo overlay needs a per-region mask (e.g. vertex colour alpha or a bone-id test in spyPaint-style code in mergeSoldier). RS/DW/RV not started.

Try (2 min, PC) once a look change lands: Battle as IR, zoom all the way in on a rifleman; the camo should look crisper.
