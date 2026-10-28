# Battle spikes (orch/battle-spikes)

**Cause.** The 0.7–1.6 s "slowest events" in the Cloudflare bench are not long steps. Workers' clock stands still
while code runs and only now and then jumps to real time, so one event is billed for hundreds. Staging benches
(8p fulda, 2 game-min): 0 ms timers → 6183/7200 events read 0 ms, 14 events held 92% of the time; 1 ms timers →
7187 events read exactly 1 ms; a stream write per event → clock frozen for up to 1837 events. Per-step cost is
therefore measured in Node (Workers totals ≈ 2.3 ms/step, as in Node). Node showed two real problems: the 4 ms
route-search budget never trips on a frozen clock, and V8 discarded compiled hot code 80–190 times per game-minute
because units and G kept gaining fields.

**Fix.** Route searches are also budgeted by work done (`PF_N`, ~4 ms of searching per step). Units, buildings and
G declare their late fields at creation (as undefined).

**Node** (`headless --steptime`, 8p fulda 4 min, seeds 1–3), before → after: mean 2.6–3.0 → 2.1–2.3 ms; p99
8.7–9.6 → 7.3–7.9; p99.9 14.9–16.3 → 12.9–15.0; worst 28–46 → 25–41 ms. What remains: the first step (~28 ms,
players still loading), one cold route search (~25 ms), machine noise (one 575 ms stall a rerun did not repeat).

**Staging bench worst event:** 1763 / 1204 / 2000 ms, all clock artifacts (above).

**For cf-final:** `BattleHost.tick` paces by `Date.now()` deltas; a clock jump makes one tick owe 0.25 s of steps.

CIGATE (e192b59, merged with main): all 16 PASS.
