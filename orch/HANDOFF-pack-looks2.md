# HANDOFF pack-looks2 (PACK looks helper, 2026-11-18)

Done / found
- Item 0: by the time I looked, main (4451d6b) had superfreeze and loadfreeze green (they are flaky: 8900437 has both success and failure runs); only gate/controls (edge-scroll check) failed on main. My kill-switch work (SOLB.on=false, soldier warm-up split per kit variant, soldier bone texture 256 rows at load) is on branch orch/pack-looks2 and is NOT landed (its own run still failed rangefreeze on OB: a one-frame 2.5 s stall at "wave dsam", no programs linked).
- Real leads for whoever takes it: (1) rangefreeze first runs often link a MeshDepthMaterial with uv (recon plane "Sketchfab_Scene", Apache glass) - add those depth variants to the warm-up; (2) SOLB-on runs upload 40-90 MB of texture data during superfreeze (texKB) vs ~1 MB with it off; (3) the Zolfaghar (bmt) wave frame creates 18 buffers / 12 VAOs.
- Item 1: shadow pass half-rate on Medium with a still camera (shadowDue/camStill in 10-post). Branch orch/pack-looks2-shadow. Gate: see HISTORY / report.

Left: items 2 (national vehicles in code, Shia first) and 3 (day-cycle visuals on G.tod/G.wx, already on main in 1b47e11) not started - the cloud gate runs (35 min each, flaky freeze gates) used the run.

Try (2 min, PC): Battle on Medium effects, stop moving the camera in a big fight; shadows should look the same and the frame rate should be a little higher.
