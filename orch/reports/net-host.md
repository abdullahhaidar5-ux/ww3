# net-host — can Cloudflare carry the heavier Conquest battles? Smart hosting on a player PC (helper, 2026-11-05)

Abdullah 2026-11-04 20:13: "Consider hosting some things on a user's PC if the cloud servers can't handle this." Branch `orch/net-host`.

## 1. Measured (current main = Conquest + Hearts & Minds + Hard AI; road supply/convoys are not on main yet)

Node 22, this box (Xeon 2.3 GHz), `node orch/headless.mjs --steptime` = battle + host netcode sending to every side, one 1/60 s
step per event, 15 game-minutes, timing wrappers on (they add ~20-30 %):

| sides, map, AI | mean ms/step | p99 | p99.9 | worst | late-game CPU per game-second | entities late |
|---|---|---|---|---|---|---|
| 2, Fulda, Normal | 0.44 | 1.8 | 4.9 | 11 | ~22 ms (2 % of a core) | ~120 |
| 4, Fulda, Normal | 1.05 | 6.9 | 15.9 | 35 | ~80 ms | ~200 |
| 8, Rhine, Normal | 1.88 | 7.5 | 15.5 | 68 | ~120 ms | ~250 |
| 8, Rhine, **Hard** (before) | 3.13 | 8.8 | 13.7 | 53 | ~200 ms (20 % of a core) | ~300 |
| 8, Rhine, **Hard** (after) | 3.11 | 8.6 | 14.4 | 51 | ~200 ms | ~300 |

Where the time goes (8 sides, Hard, whole match, inclusive): unit updates 79 s (of which movement/pathing `navTo` 30 s, `findPath`
7 s), unit separation 23 s, host netcode 17 s, morale 14 s, buildings 12 s, garrisons 8 s, AI thinking 6 s, vision 4.5 s, supply 2.6 s.
Towns/tax/unrest/rebels (`updTowns`, `hmTick`, towers) are below 0.5 s each over the whole match: Conquest's town layer is cheap.
**Spikes** (single slow steps): before the fix, one AI's naval planning (`aiNavyPlan`) took 15-35 ms every 30 s on water maps; the
battle checkpoint (every 8 s) takes 13-25 ms; the rest are single 20-50 ms steps in `separate`/`moraleTick`/`updUnit` that are
garbage collection landing in that step.

**Live Cloudflare** (`/battle-bench?players=8&minutes=3&map=rhine&batch=1`, read-only, today, the servers' last deploy): 60 ms of
wall time per game-second (an upper bound on CPU) for 8 sides, 184 entities after 3 min; the same opening in Node with wrappers is
~95 ms. So Cloudflare runs the sim at least as fast as this box. 10,800 timer events, several far above 10 ms, and the object was
never stopped.

**What the numbers mean:** a battle needs 60 steps a second; a late 8-side Hard battle uses ~20 % of one core, so the server keeps
up with ~5x headroom. The "10 ms per request" free-plan figure is the per-request CPU cap of ordinary Workers; a Durable Object
battle runs its steps in timer callbacks, and the live bench shows occasional 30-60 ms steps are tolerated. The real limits are
(a) keeping up with real time (ample today) and (b) the daily free allowance of object-awake time (13,000 GB-s/day ≈ 28
battle-hours/day), which the existing 75 % guard already handles. **No paid plan is needed today.** Workers Paid ($5/month) would
lift the daily allowance (and the request count) if friends play more than ~25 battle-hours a day; not worth it yet.

## 2. Optimised (cheapest wins)

- **AI naval planning cached** (`src/03-sim.js` `aiNavyPlan` / new `aiNavySpots`): the coast scan around an AI's base is kept per
  base position until the terrain changes (keyed to the pathfinder's region arrays), and "can a ship reach this enemy building" is
  kept per building. Same answers as before (pure memo), so host and clients/tests see the same battle. Removes the 15-35 ms AI
  spikes on water maps (8-side Hard: steps over 20 ms 10 → 6; `aiThink` total -12 %).
- Not changed: the AI is already spread across steps (at most one AI thinks per step), pathfinding already has a per-step budget and
  path sharing, towns already update on a slow timer. The remaining cost is the core unit simulation; a big rewrite there is not a
  cheap win and isn't needed for Cloudflare's sake.

## 3. Smart hosting (built)

- **Strongest PC = standby.** Every page runs a ~20 ms CPU benchmark once (`hostPower()` in `src/07-net.js`; ×0.35 on a touch-only
  device, a bit more for more cores; this PC: ~800-860) and sends it with its greeting (`hi.hp`). The host — Cloudflare or a browser
  — now sends its takeover checkpoint to the best player by benchmark and ping (`sbPick` in `src/07b-ckpt.js`; sticky unless someone
  is 15 % better; players who can't send never), instead of simply the first player in the list. Host-side only: no change to what
  anyone simulates.
- **Overrun guard on Cloudflare** (`server/src/battle.js` `overrun`): Cloudflare's clock stands still while code runs, so a step's
  CPU can't be read there — but how far the battle falls behind real time can. If the battle runs at < 0.8 game-seconds per real
  second for two 15 s windows in a row **and** the standby holds a checkpoint, the server hands the battle over exactly like the
  75 % budget guard: it closes, the strongest PC takes over from its checkpoint as a browser host (`<code>-m1`), everyone follows.
  No button, no hosting wording: players see the usual short "reconnecting". If that PC leaves later, the normal host migration
  moves it again (to the next-best PC).
- **Crash guard:** if Cloudflare keeps stopping a battle (e.g. for CPU), the server picks it back up from its checkpoint at most
  twice in 10 minutes; the third time it leaves it to the standby PC instead of looping (`index.js` `resume`, `rz` in the kept
  record).
- **Before a match:** not done on a size rule. The measurements show 8 sides on the biggest maps fit with room to spare, so a fixed
  "6-8 players → PC" rule would only throw away Cloudflare's benefits (no host advantage, survives a player leaving). The guard
  above moves a battle within ~30 s if it ever can't keep up, during the 90 s no-fire setup if it's that heavy from the start.
- **Not done:** running the computer players' thinking on a player PC while Cloudflare stays in charge — AI is ~3 % of the
  server's time, so splitting it would add a lot of netcode for almost nothing.

## 4. Tests

- New `orch/cfbattle-overrun.mjs` (runs in the gate's `cfclient` job): real BattleRoom in local `wrangler dev` + two real pages;
  the creator reports a weak device (40), the friend a strong PC (900). The server picks the **friend** (slot 1, not slot 0) as
  standby; the server is made to fall behind (test hook `slow`: it gets a third of the real time); after ~28 s it hands over, the
  friend's PC hosts, the creator follows, and after a full keyframe the creator's page matches the new host exactly (0 missing /
  off-position / mismatched, credits equal). **CFOVER PASS** locally.
- Local test servers start with the guard off (`OVERRUN_GUARD: '0'` default in `orch/serverdev.mjs`) so a busy CI machine with
  software-rendered pages can't trigger a hand-over in the other tests; on Cloudflare it is on.
- `node orch/battletest.mjs` BATTLETEST PASS. Full gate: see HISTORY.

**Deploy:** the server half (overrun guard, crash guard, standby pick on Cloudflare battles) needs Abdullah to merge the
`main → servers-live` PR. The page half (benchmark, standby pick in browser-hosted battles) is live with the `main` push.
