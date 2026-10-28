# Cloudflare battles: final branch (orch/cf-final)

**What players see:** one "Play online" button (joins an open battle, servers' battles first, else starts one) and
"New battle". No hosting choice or wording; if the servers can't take a battle it quietly runs in a browser. An
optional password makes a private battle (🔒 in the list, prompt, `#pw=` invite link). If the servers are full at
Start, the lobby says so and Start can be pressed again.

**Merged:** stage2-dedicated, play-online (UI kept), passwords (hosting chips dropped, password wired into Play
online/New battle), battle-spikes (`headless --compare` PASS).

**Review fixes** (repros pass): R1 checkpoints carry only token hashes; R6 standby takes over only when the server
says the battle is gone (or 40 s silence), split test PASS at 15 s and 25 s; R7; R8; R9; R2 lobbies hold no battle
slot until Start; R3 sockets without a side are closed and don't keep battles alive, silent ones swept after 150 s;
R4 Start refused when players exceed the map; R5 floods close sooner. R10 was already handled.

**Staging (real Cloudflare):** deploy + servertest PASS on the final head. Bench (8 players, fulda, 2 min):
maxEventMs 1488/1800 ms, but p50 0 ms, p99 2 ms, and the 12 slowest "events" sum to nearly the whole run: Cloudflare's
clock only moves with I/O, so many steps land on one reading. Same bench in local workerd: worst 27 ms, p99 5 ms.

**CIGATE:** 16/16 PASS on dca96b1.

**Left:** a true per-step latency on Cloudflare needs a moving clock (e.g. measured from players' side).
