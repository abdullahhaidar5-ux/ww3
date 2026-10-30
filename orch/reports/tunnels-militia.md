# Tunnels deeper + Fund Militia (orch/tunnels-militia)
- New HQ upgrade "Ground-Penetrating Radar" ($1200) for nations without tunnels: enemy tunnel entrances within 650 of your HQ or Strike Center show up and can be shot.
- Tunnel ambush: units coming out of a tunnel deal +50% damage for 3 seconds.
- New general power "Fund Militia" for all 18 nations (480 s cooldown): 5 riflemen, an RPG team and an armed technical appear at the neutral oil spot nearest the enemy base (or the midpoint to it), under your control.
- Names: Shia nations "Popular Mobilization volunteers", US "Contractors", RU "PMC", the rest "Local militia".
- AI (Normal/Hard) buys and uses it after 6 minutes; AI nations buy the radar only when an enemy has tunnels.
- Host-only logic, saved by checkpoints; games that use neither play as before. Checks added to orch/ewtest.mjs (all pass).
- Touches the simulation: needs the main -> servers-live PR.
- Try (2 min, https://abdullahhaidar5-ux.github.io/ww3/): play US vs IR, get a rank point, buy Fund Militia after 3:00 and fire it.
