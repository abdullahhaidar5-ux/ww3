
# ORCH to weathergfx — READ FIRST: much of this ALREADY EXISTS
- **Weather exists:** Clear, Fog, Rain, Snow and Sandstorm, with gameplay effects (vis/acc/spd), state G.wx / fixWx / ssn in the checkpoint. Add only what is missing: Dusk and Night lighting if absent, the setup/lobby/Test range "Conditions" picker if absent, and the geography filter. Do not build a second weather system.
- **Graphics quality exists:** SET.gfx low/med/high/auto (src/04-gfx.js, src/02-map.js terrTexMax). Extend it to Low/Medium/High/Ultra with a clear Settings row. Do not add a second setting.
