# Standalone Mountain Fortress (2026-11-03)
- Fortress (kind 'fort') now has its own garrison `b.gar` (cap 20, FORT_CAP) separate from the team tunnel network `T.tun` (cap back to 12, no fortress bonus).
- Units entering the fortress come out only of the fortress; tunnels never release them and vice versa. Infantry inside heal 3 HP/s (fortHeal now walks fortress garrisons).
- Fortress destroyed -> garrison is unloaded alive beside it (kill() hook) with a log line. Elimination kills fortress garrisons; score counts them.
- A fortress no longer counts as a tunnel for "last tunnel destroyed"; AI retreat/unload uses real tunnels only (AI never garrisons the fortress).
- Clients: team snapshot carries fn/fk (fortress count/kinds) -> T.fortN/T.fortK; label over the fortress and the selection panel show "MOUNTAIN FORTRESS n/20". Right-click / tap to enter and Unload button work as for tunnels.
- Host migration: b.gar is a plain entity field, encoded by the generic ckpt entity encoder the same way as T.tun in team data (note: not separately tested).
- Unload of the fortress uses no Math.random (deterministic angle); tunnel unload unchanged.
- Bolder markings verified: orch/shots/faction-looks/bolder-IR.png, bolder-KP.png (PC view): flags/stars clearly visible, on surfaces, not cartoonish; no size changes needed.
- Smoke: PASS. Not covered by a dedicated automated test (fortress garrison).
