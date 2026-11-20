# HANDOFF trailer v2 (branch orch/trailer) - updated 2026-11-20 03:50 UTC
Spec now = orch/TASTE.md (30 s, quiet desert open then explode, combat-11 "Curse of the Scarab" CC-BY 4.0, IR/RS/DW vs US/IL).
Done: orch/trailer2-scenes.mjs (rubalkhali/zagros desert scenes), .github/workflows/trailer.yml (branch-only, concurrency group trailer-capture,
encodes 30 fps 1080p clips and pushes them to branch orch/trailer-clips as clips/<scene>-<shot>.mp4), orch/trailer2.py (edit: beat grid 71.25 BPM,
quiet intro then drop, Anton/Oswald titles in orch/trailer/fonts, 2.39:1 letterbox, grade+grain, sfx hits, -14 LUFS, end card). Edit tested on fake clips.
Run 44667103025 (6 matrix jobs: dunesA dunesB base night storm fort) was queued behind the gates; only 1 job at a time got a runner.
Known to fix after first look: storm scene enemy is SA (change to IL), dunesB could be RS vs IL; sfx hit times for fort-bb; check no UI in frames.
Next: when orch/trailer-clips exists: git fetch it, python3 orch/trailer2.py <clips> <work> orch/trailer/ww3-trailer-v2.mp4, extract 8 frames and look,
make 720p copy, commit both here.

## ORCH 2 (04:55 UTC): DELIVERED to Abdullah: orch/trailer/ww3-trailer-v2.mp4 (cut by ORCH from orch/trailer-clips with orch/trailer/mk2.py; night clips too dark - dropped; dunesA-clash weak - replaced by dunesB-air). Helper: stop here, nothing more to do unless ORCH asks.

## Helper Sonnet (05:50 UTC): footage fixes pushed (7f338e8), NOT re-cut. Run 4 of trailer.yml will re-capture with them; ORCH decides whether to re-cut.
Found + fixed in orch/trailer.mjs: camera near plane was 40 (clipped the ground in front of low cameras = dark wedge at the bottom of low shots; now 3),
ground ring decals (`decals_ring*` instanced meshes = the green rings under units) hidden, supply overlay off, selection cleared. Capture is 30 fps now (no minterpolate smear).
Scenes (orch/trailer2-scenes.mjs): desert map is `euphrates` (rubalkhali has a sea and most other desert maps load as snow); cameras follow the infantry/tank columns
(A.gm), not the "fight centre", which sits on the river and fills the frame with explosion blobs. Local preview (~1 min per shot): TR_SCENES=./trailer2-scenes.mjs TR_OUT=/tmp/x node orch/trailer.mjs --scene dunesA --fps 30 --rs 0.4 --preview
Edit script orch/trailer2.py (beat-grid cut, titles, end card, sfx, -14 LUFS) is tested; ORCH's cut used orch/trailer/mk2.py instead.
