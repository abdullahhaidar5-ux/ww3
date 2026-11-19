# HANDOFF smooth-render2 (2026-11-19)
Branch `orch/smooth-render2`; report with numbers + verdict `orch/reports/smoothrender2.md`.
Done: item 1 buildings + item 2 aircraft (`staticMerge`; buildings gain little, helis 19 -> 14 meshes, 8p draw calls -40%), item 3 far walkers re-posed every 2nd frame. Guard in orch/decisions.mjs.
Left: far-LOD for helicopters (the biggest 8-player cost, ~20 calls each), merge across vertex-colour materials by baking colour, vehicles ~10 objects each, shadow-pass cost; re-run `Cap test` (push to the branch) after each step. 500 per player with 8 players is not smooth yet; POP_CAP untouched.
Try on PC (2 minutes): start a Battle, build up some helicopters and soldiers, zoom out over a big fight and back in; helicopters (spinning rotors, glass, nation paint), buildings and marching soldiers should look exactly as before. Tell us if a helicopter loses a part or its rotor, or a far walker looks jerky.
