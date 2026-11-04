# Handoff: vehicles-real
Stage 1 (shader weathering for ground/ships/air, map-aware grime) is done and gated. Remaining, in order:
1. Per-unit damage: smoke trickle/scorch as hp drops (use particles in 05-fx3d, not shared-material shader), ships list slightly, aircraft trail smoke.
2. factionKit/kitGeo (src/11-models.js ~L930): RS camo nets + rocket pods, DW jerrycans, KP slogan panels, RU ERA blocks, IL bustle baskets, US RWS; air force camo via CAMOX-style patterns for jets (wPat) with `wk=2`; drone stencils in buildDrone (droneType ~L563); ship hull numbers/radar mast rotation.
3. Crew/life: tank commander figure, dust when driving by theme (WXE), rotor wash, afterburner glow, wakes.
4. Objaverse CC0/CC-BY models (Type 99, K2, Altay, Al-Khalid, Shahed, TB2).
Local `node orch/smooth.mjs` takes >10 min here: use `bash orch/cigate.sh` in the background (nohup) and poll.
