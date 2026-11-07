# portraits (round 2, "portraits2")

Pipeline: `make-people.mjs` (people from `src/13l-people.js`) → `spec.py` (person → look: MakeHuman age/ethnic mix/weight/face targets, hair, beard, headgear, uniform) → `bl/portrait.py` (Blender Cycles via `pip install bpy`: MakeHuman head, procedural skin/eyes, strand hair/beard/brows, body-fitted garments, turban/ghutra/caps, 3-point light) → `bl/post.py` (painterly finish, warm grade, vignette, gilded frame) → `bake.py` writes `<id>.webp` sprites (336x420). `sheet.py` builds the contact sheet.

Needs: `pip install bpy`, a clone of github.com/makehumancommunity/makehuman (`MHDATA=<clone>/makehuman/data`). About 1 minute per portrait on 2 CPU cores at 600x750.
Round 1 files (`render.js`, `sheet.html`, `mhmorph.py`, `prep.mjs`, `fetch.sh`) are obsolete (three.js flat-shaded attempt, rejected).
Portraits stay OFF in the game (`ptOn()` returns false) until Abdullah approves the sheet. Credits: see `CREDITS.md`.
