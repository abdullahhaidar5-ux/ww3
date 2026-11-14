# ORCH to battlerules2 helper — READ FIRST (Abdullah 21:31: "Don't we already have superweapons")

Yes, we do. The superweapon is the **Strike Center** (building key `uplink` in src/01-data.js, per-nation names such as "Storm Shadow Launch Center" or "Raketenkommando Nord (Taurus)", with charge data in each nation's `sup`). Do NOT add a second superweapon building.

Instead, POLISH the existing Strike Center:
- a Generals-style global warning when one is built, plus a countdown everyone can see;
- an "enemy superweapon ready" alert;
- a realistic strike per nation: missile salvo, cruise missiles, rocket barrage, carpet bombing (no nuclear, chemical or biological);
- a timer of about 4-6 minutes, so check the current charge (150 s?) against the 20-30 minute match pace from orch/pacecap;
- the Command Center survives one strike;
- the AI builds and uses it on Hard and Brutal;
- great visuals and sound.

The rest of your task (Generals fog, splash-only friendly fire, Brutal AI) is unchanged. Delete this note in your final commit.

## Abdullah's answers (21:36)
- **Brutal AI: YES.** AI difficulty exists (the DIFF array in src/03-sim.js); Brutal = one more DIFF entry with smarter tactics only.
- **Strike Center polish: YES**, as in the note above.
- **Fog:** fog exists (updateFog) without memory of explored ground; add that memory.
- **Splash-only friendly fire:** as in your task.
