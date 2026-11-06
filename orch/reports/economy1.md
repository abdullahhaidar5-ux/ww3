# ECONOMY, part 1 — earning and towns (branch `orch/economy1`, 2026-11-06)

Abdullah's 2026-11-05 19:04 picks, all seven built on the existing towns / tax / unrest / roads / convoys / ports. Sim = `src/03h-economy.js`
(hooks in `03-sim.js`, `03c-logistics.js`), interface = `src/08c-economy.js`. Probe: `node orch/economy1-test.mjs`; screenshots:
`node orch/economyshots.mjs` → `orch/shots/economy1/`.

| # | Pick | How it works |
|---|---|---|
| 1 | **Trade routes** | Every 15 s each team looks for two of its towns that are joined to its own road network (`t.trade`) and 650–3200 apart (longest first, route must not be a huge detour). Up to 2 civilian trucks ("caravans", `u.cv.cav`, $30 each) shuttle along the roads; every leg pays `$16 + 1% of route length` (+15% per paved end). Enemies can shoot them (message + ping), craters/jams make them wait, give up or turn back. Route is a gold dashed line in the world and on the minimap; caravans carry a TRADE badge. |
| 2 | **Farms & food** | 2 (hamlet) / 4 (town) / 6 (city) farm plots around each town (`ecPlots`, flat furrowed patches in 3D). ONE bar per town `t.fd` 0–100: grows with live plots, drops when plots are burnt (blast within reach → burnt 150 s, then replanted) or the town is cut off. ≥60 fed: unrest −0.2/s; <25 hungry: unrest +0.7/s and tax −15%; 0 starving: +1.2/s. |
| 3 | **Mines & factories** | Placed beside the fairly placed hamlets: each base gets a **quarry** (home hamlet), a **factory** (forward hamlet), contested hamlets get **mines**; home sites are the same step beyond the hamlet away from the base (probe: 1049/1039, 1583/1576 on fulda; 1180/1184 strait; 887/905 gulf). Hold one by standing units in its 170 radius (~6–22 s). Quarry $1/s, mine $2/s (× battle scale). Factory: production buildings within 900 cost 8% less and build 12% faster. 3D headframe / pit / hall + owner flag; label, progress bar and minimap shapes. |
| 4 | **Port trade** | `lgToll`: every open port pays (first port full $1.2/s, others half); a blockade (existing) cuts it. HUD shows "trade +$X/s" (tooltip: ports ≈ $/min). |
| 5 | **Growth** | `t.lv` 0 hamlet / 1 town / 2 city. Calm (<35 unrest), fed, connected, undamaged, not shelled, no enemy troops near → growth bar fills (300 s per level, faster with investments); +20% tax per level above the start, +1 militia rifle per level, 3 extra houses per level drawn around the town. Starving / ruined / shelled towns shrink (−15% tax per level, down to one below their start). |
| 6 | **Invest** | Town panel: Power ($260) / Water ($210) / Road paving ($170) (×0.6 hamlet, ×1.4 city). Each +10% tax and +25% growth speed; power −0.15 unrest, water helps the food bar, paving = repairs ×1.5 and caravan pay +15%. Command `eco` (in `CMD_T`). |
| 7 | **Rebuild** | `t.dm` 0–1 from damaged / collapsed houses cuts tax up to 60% until repaired: locals ~10 min, engineers (dozers near) ~1.5 min, ×0.4 while restless, nothing under fire. Collapsed houses stay ruins on screen (only the penalty heals). |

HUD: income next to money now reads "+$tax/s · trade +$x/s". Town label gets a second strip (level stars, food bar, growth line, invest letters P W R). Town panel shows level, growth, food + fields, damage, invest buttons, tax modifier, nearby mine/factory.
AI uses everything: caravans are automatic, it invests in calm safe towns (keeps $900 spare) and sends two idle soldiers to the nearest mine that is not its own every ~60 s.

## Multiplayer / saves
Host-authoritative, no random numbers. New per-town fields live on the town object (copied by the checkpoint); `G.ec` (mines, caravans, routes) is in `CK_G`; clients get `ecPack()` (≈550 bytes) inside `hmPack` and rebuild plots/houses locally from town data. `03h-economy.js` is in `orch/headless.mjs` SIM_FILES, so the Cloudflare sim build gets it → **servers-live PR needed**.

## Balance notes (for the balance agent)
Starting income is unchanged (no town starts grown, fed bonus is only a unrest effect). Extras: quarry $1/s + mine $2/s per held site, ~$1.5–2/s from 2 caravans, ports as before (extra ports half), growth up to +20%/level and investments up to +30% per town. Average income per minute will rise a little for well-run towns — re-run the tourneys; knobs: `ECG_T`, `EC_PT_INC`, pay formula in `ecCaravan`, `gm` in `ecTown`.

## Not done / follow-ups
- Collapsed houses are not rebuilt visually (the tax penalty heals, ruins stay); repaired houses lower their damage stage only on the host's copy.
- Farm plots can sit on shallow water on a few maps (passability check only); not yet filtered by water depth.
- Mines are not in the map editor and not in the tutorial; no minimap tooltip for them yet; no voice lines.
- Wildfire: only explosions burn fields (incendiary blasts count); there is no spreading fire.

## Gate status at ship (2026-11-06)
Local: smoke PASS (after final merge), tutorial PASS, smooth-pc PASS, economy probe OK (`node orch/economy1-test.mjs`). CI gate on the merged build: all green except **tutorial** and **smooth-mp**. Tutorial also fails in CI on other agents' branches (e.g. grandmirror run 42267257183) and passes locally with this change (first failure was mine: the taller town panel covered the command-bar tabs — fixed by capping the panel height). smooth-mp fails identically on plain `origin/main` in this sandbox (DESYNC/snapshot jitter), but passed in CI on an earlier economy1 run. Recheck both on the next gate run.
The intermediate branch `orch/economy1` holds one bad commit (conflict markers, never merged to main); the clean history is `orch/economy1-final` and `main`.
