# portraits (round 3, "portraits3")

Pipeline: `make-people.mjs` (people from `src/13l-people.js`) → `spec.py` (person → look: MakeHuman age/ethnic mix/weight/face targets, skin pick, hair, beard, headgear, garment) → `bl/portrait.py` (Blender Cycles via `pip install bpy`) → `bl/post.py` (painterly finish, warm grade, vignette, gilded frame) → `bake.py` writes `<id>.webp` sprites (336x420) and `manifest.json`. `sheet.py` builds the contact sheet.

Round 3 uses the free MakeHuman asset packs (approved by Abdullah 2026-11-07 06:45), fitted to each morphed head with MakeHuman's own proxy weights (`bl/mhclo.py`):
skins01/skins02 (CC0 skin textures, retinted to the person's tone), eyebrows01, eyelashes01, suits01 (jacket/shirt/tie islands recoloured per nation, `looks.recolor_suit`), hair02 (CC-BY, women's hair only). Men's hair and beards are strand hair with a soft jaw-following mask (`compose.beard_mask`); the bodyparts05 beards were tried and dropped (crude, patchy). Caps, ghutra, turban, aba braid, epaulettes and collar tabs are modelled in `bl/clothes.py`.

Needs: `pip install bpy`, a clone of github.com/makehumancommunity/makehuman (`MHDATA=<clone>/makehuman/data`), the asset packs unzipped under `$PACKS` (`files2.makehumancommunity.org/asset_packs/<pack>/<pack>_<lic>.zip`; never committed). About 20 s per portrait at 440x550 on 2 cores.
Run: `MHDATA=... PACKS=... python3 bake.py people.json OUT $(cat ids40.txt)` then `python3 sheet.py people.json OUT ids40.txt sheet.png`.
Portraits stay OFF in the game (`ptOn()` returns false) until Abdullah approves the sheet. Credits: see `CREDITS.md`.
