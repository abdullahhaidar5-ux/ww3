# HANDOFF pack-units (PACK helper, 2026-11-19)

Done
- Item 1 (unit limit 500 per player up to 4 players, 300 for 5-8): was already on main when this run started (d7fbc49: popCap by team count, DECISIONS line, CLAUDE.md Targets, guard in orch/decisions.mjs) and servers-live (b3f11e64) already contains it. Nothing left.

Item 2 (soldiers up close) - started, NOT landed
- Branch orch/pack-units: (a) orch/gfxinf.mjs now takes --idist a,b --idy a,b --idx N --clip x,y,w,h for close-up framing (use: node orch/gfxinf.mjs --scenes golan:IR:IL --tag after --out infantry-closeup --idist 40 --idx -90 --idy 58 --clip 240,0,800,500; one run is ~4 min on swiftshader); (b) src/11-models.js soldier material (mergeSoldier, the 'solgear' fragment hook): fine woven grain + ripstop squares + slightly stronger camo contrast, faded out by screen-space derivative so it never shimmers. Same shader program for all soldiers, no new draw calls/textures/triangles.
- Shots: orch/shots/infantry-closeup/before|after (IR, golan). The change is real but SUBTLE (a bit crisper camo); I did not spend a 35 min cigate on it alone. Not pushed to main.
- Findings: IR jackets are plain dark (camo only on the trousers) - the biggest visible win is a camo pattern on the jacket + chest rig/pouches and a face/skin pass. The merged soldier has one baked vertex-colour per vertex and one uniform texture, so a camo overlay needs a per-region mask (e.g. vertex colour alpha or a bone-id test in spyPaint-style code in mergeSoldier). RS/DW/RV not started.

Try (2 min, PC) once a look change lands: Battle as IR, zoom all the way in on a rifleman; the camo should look crisper.

## Update (restart run, 2026-11-19 evening)
- Rebuilt on current main: WIP chest rig/radio/straps (db86ffec6) + cloth grain shader, branch orch/pack-units-r5 (orch/pack-units is diverged from others' work, not force-pushed). Gate run 44628555740 on its head: 24 green, gate/superfreeze red twice (OB: one 5.9 s frame, "wave"/decodeAudioData audio warm-up lines; the same stall pack-looks2 saw). NOT landed.
- Not done: helmet cover/goggles, per-nation camo textures (IR/RS/DW/RV), face/skin shading.
- Next: find whether the OB stall is from this change (rerun the gate on origin/main head to compare) before landing.
