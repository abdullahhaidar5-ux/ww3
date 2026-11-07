# Portrait credits (orch/portraits)

Build-time only: the game ships small baked sprites (`art/portraits/*.webp`), never the meshes or the packs.

- **MakeHuman community** — base mesh `base.obj` and the macro/face modifier targets, CC0 (https://github.com/makehumancommunity/makehuman).
- **MakeHuman asset packs** (https://files.makehumancommunity.org/asset_packs/): skins01 / skins02 (skin textures: toigo, onlytheghosts, mindfront, callharvey3d, cutoff3d, and others), eyebrows01 and eyelashes01 (mindfront), suits01 (toigo), all CC0.
- **hair02 by Elvaerwyn** (CC-BY) — women's hair proxies (hazel, inverted curly bob, 50s updo). Credit shown in the menu credits.
- Men's hair, beards, caps, ghutra, turban, aba braid, epaulettes: modelled by this repo's `orch/portraits/bl/*.py`.
- Rendering: Blender Cycles via the `bpy` Python module; images are ours.
- No scans, photos or AI-generated images of real people; every face is a procedural mix seeded from a fictional person's id. The manifest (`art/portraits/manifest.json`) lists which asset each portrait used.
