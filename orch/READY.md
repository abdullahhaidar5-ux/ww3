# READY — assembled branches (assembler, 2026-10-28 night)

Each line: `<name> <sha of orch/ready-<name>> CIGATE PASS|FAIL — summary`. Integrator fast-forwards main to the PASS ones in order.

reconnect-phonebar ad9b446d6c CIGATE PASS 16/16 (migrate ×3 now pass; they fail on main 65f8221) — rejoining mid-battle works properly (your army, the enemy view and money come back right), short freezes no longer drop players, the backup only takes over when the host is really gone; phone held upright shows 4 whole build columns. Base: main 65f8221. **Superseded: already shipped to main via 6b29922 (orch/ship-wave2); main 7b331ce has it.**
