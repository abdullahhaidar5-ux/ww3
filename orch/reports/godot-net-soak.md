# Godot edition netcode — soak test results (2026-11-21, branch `orch/godot-net`)

Setup: Node 22 + headless **Godot 4.4.1** (official Linux build) in the cloud sandbox. "J" clients = JavaScript reference
client (`server-godot/test/client.mjs`), "G" clients = real Godot processes running `godot/net/lockstep_net.gd` +
the GDScript toy sim. JS and GDScript toy sims are bit-identical, so a match also proves cross-implementation
determinism. Relay = `wrangler dev` (real Worker + Durable Objects in workerd) or the Node relay (same `relay-core.js`).
Random orders ~3 per player per game-second. A hash of the whole sim state is compared every 10 turns (1 game-second).

| Run | Relay | Clients | Game time | Real time | Turns compared | Mismatches | Events survived | Result |
|---|---|---|---|---|---|---|---|---|
| Real-time soak | wrangler dev | J0 J1 G0 G1 | 10 min | 609.6 s | 601 | 0 | J1 blip, G0 blip + reconnect, G1 crash → fresh rejoin by snapshot | PASS |
| Real-time soak (final code) | wrangler dev | J0 J1 G0 G1 | 10 min | 602.1 s | 601 | 0 | J1 blip, G0 blip + reconnect (G0 joined through /quick; a spurious "lost" before the socket existed, fixed after this run), G1 crash → snapshot rejoin | PASS |
| Fast soak (10× clock) | Node | J0 J1 G0 G1 | 10 min | 61.4 s | 601 | 0 | J1 blip, G0 blip, G1 crash → snapshot rejoin | PASS |
| Desync (corruption injected) | wrangler dev | J0–J2 G0 G1 | 2 min | 13.4 s | 121 | 0 outside the corrupt window | J1 and G0 corrupted → reported (`bad` = the right slot) and repaired by snapshot within 3 turns | PASS |
| Rejoin by full replay | Node | J0–J2 G0 | 3 min | 19.3 s | 181 | 0 | J2 crash at turn 900 → replays 900 turns from the seed | PASS |
| Slow player (lag rule) | Node | J0 J1 G0 (G0 slowed) | 2 min | 20.8 s | 121 | 0 | relay waited (714 stalled turns), nobody desynced | PASS |
| Lobby via Worker | wrangler dev | – | – | – | – | – | `/quick` → room; `/list` shows it; 2nd `/quick` finds the same room; wrong version refused | PASS |

Also: `godot/net/test/det_test.gd` → `DET PASS` (trig, atan2, isqrt, fixed point; RNG and FNV equal the JS values).
Clock: the relay now schedules turns by wall clock (first real-time run drifted to 9.86 turns/s with a plain interval).

Not tested here: the Web export (no export templates in the sandbox) and a real Windows .exe — both use the same GDScript;
first check when the core battle exists: export both and play one game through `wrangler dev`.
