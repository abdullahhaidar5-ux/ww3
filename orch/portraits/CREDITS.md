# Portrait credits (orch/portraits)

Build-time only: the game ships small baked sprites, never the meshes.

- **MakeHuman community** — base mesh `base.obj` and the macro/face modifier targets (age, gender, ethnic mix, weight, nose/chin/cheek/eye/brow/ear/mouth shapes), released CC0 in Sept 2020. https://github.com/makehumancommunity/makehuman
- **Hair, beards, eyebrows, eyes, skin shading, clothes, turbans, caps, ghutra**: modelled procedurally by this repo's `orch/portraits/bl/*.py` (original work, no third-party assets).
- Rendering: Blender Cycles via the `bpy` Python module (GPL tool; its output images are ours).
- No scans, photos or AI-generated images of real people were used; every face is a procedural mix seeded from a fictional person's id.
