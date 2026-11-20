
## Update (restart run 2026-11-20)
- Not landed this run: no code change. Tried to render a close-up of the IR rifleman with orch/gfxinf.mjs (each shot takes 3-4 min in this sandbox; `--idist 45` frames bare ground, the soldier line-up needs the default idist ~232 with a zoomed crop instead), so no before/after proof was possible.
- Plan stays: bake camo into the soldier's vertex colours at load (like spyPaint does for spies; no new material/program, so no first-spawn shader stall), per-nation pattern by body region, chest rig/radio colour darker webbing; helmet cover pattern; skin tone. Do it with fast local rendering or CI shots, then ONE cigate.
