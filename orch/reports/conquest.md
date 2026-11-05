# CONQUEST — the only game mode (branch `orch/conquest`, started 2026-11-05)

Abdullah's decision (2026-11-04 19:45–19:54): everybody starts with all buildings available and the same money; the point is to
capture towns and hamlets and destroy the enemy base; taxes, unrest and revolts; "High tax in safe rear towns, Low tax on the front
line". This report says what is built, how the numbers work, and what is still open. Next steps are in `orch/HANDOFF-conquest.md`.

## Status by stage

| Stage | Scope | State |
|---|---|---|
| 1 | Town tax + unrest + revolt + rebels + hamlets + minimap + tax panel | **built, smoke PASS** (see "Checks") |
| 2 | Conquest start: money, no prerequisites, setup phase, economy = territory, win rule | **built, smoke PASS** |
| 3 | Fair upgrades / powers / missile strikes (launch sites, countdown, defence) | **not started** (hooks below) |
| 4 | Remove Classic from menus + lobby, tutorial teaches Conquest, old replays | **not started** (the sim already runs Conquest for every non-campaign, non-sandbox game: `G.conq`) |

## What a player sees

- **Hamlets** (2–5 low houses, in the local style of the map: mud-brick for Gulf/Yemen maps, tiled roofs for Europe/America, etc.) on
  every map and every player count: one safe hamlet behind each base, one forward hamlet at the same driving distance for everyone,
  and contested hamlets equally far from each pair of neighbours (placed with the same route-distance code as the oil; `src/02-map.js`,
  after "contested oil"). The map editor can add them with `hamAt` (data hook only — no editor button yet).
- **Towns** = the map's cities; **key buildings** = the 3 buildings nearest the centre (every house of a hamlet, max 3). Garrisoned
  infantry capture a building (as before); whoever holds **more than half of the key buildings owns the town**. The old "every
  building pays $0.35/s" is gone (other buildings still give a supply circle when held).
- **Tax**: owner clicks/taps a town (in the world, or on the minimap) → panel with **Low / Normal / High / Extortionate**
  (−40% / ±0 / +50% / +120% tax). Over each held town: "Tax +$X/s", a rate badge (letter in a shape) and an unrest bar. HUD money
  shows "+$X/s" territory income.
- **Capture reward** one-off "town treasury" ($360 town / $120 hamlet, × battle scale); tax **ramps 50% → 100% over 90 s**
  of holding (ping-pong recaptures don't pay); **whole town +50%** when every key building is yours.
- **Unrest** 0–100 per held town (per second): Low −0.8, Normal −0.1, High +0.6, Extortionate +1.6; **enemy troops within 560**
  +0.8…+1.8; just-conquered +0.8 for 90 s; strike nearby +1.5 (hook `t.shock`, used by stage 3); troops stationed in/next to the
  town −(0.35 + 0.12 per soldier, max 8); clinic −0.5. Above 50 = **Restless** (enemy capture ×1.5, ×2 above 80, perk off, −20%
  tax). Warnings at 70 and 90 ("Unrest rising in X — lower taxes or send troops", map ping ring on the minimap). At 100 = **REVOLT**:
  garrison thrown out, town neutral/rebel for 120 s, 5–8 armed locals (riflemen + RPG + technical, a hidden hostile team
  `G.reb`, flagged `T.reb`) hunt the old owner's units nearby; afterwards the town can be re-taken once the rebels are dead.
  **Low tax** = loyal locals: enemy captures 2× slower, perk +, and two local militia rifles show up when enemies close in (240 s cooldown).
- **Perks** (one per town): market (+25% tax, +40% on Low), garage/fuel (repairs vehicles nearby), clinic/mosque (heals infantry,
  calms unrest). Hamlets: sometimes a market stall.
- **Minimap**: squares = towns, circles = hamlets, owner colour fill, hollow = neutral, **pips under it = tax rate (1–4)**, dashed
  yellow ring = Restless, solid red ring = about to revolt (pulses ≥ 90), diamond with a cross = rebels, arc = capture in progress,
  expanding ring = alert pings, hover tooltip (PC) with tax/unrest, click = open the tax panel. Shapes/pips/rings carry the meaning
  so the colour-blind option keeps working. Setup phase: dashed gold centre line (2-player). Cheap: ~30 markers per frame.
- **Setup phase** 90 s: nothing can fire at an enemy (`fire()` + `nearestEnemy()` gate, powers refused), countdown banner top-centre.
- **Start**: `CQ_START` = $10,000 each, **no tech prerequisites** (everything buildable at once; units still need their production
  building) — chosen over "pre-built base" because it keeps the existing HQ + 2 infantry + dozer + truck start and lets the player
  choose; the Revenue Center is removed (`bldAllowed`); supply trucks pay ×0.3, oil derricks ×0.6 (they stay capturable points);
  base trickle $2.5/s while the HQ stands (comeback floor).
- **Win**: a side's BASE = HQ + every barracks, war factory, airfield, shipyard. None left (none under construction counts as left)
  and the setup phase is over → defeated at once ("its base has been destroyed"). Old collapse rules still apply. HUD shows
  "Enemy base: N of M structures left" (all enemies summed when there are several), synced to clients (`bs` in teamGlobals).

## Numbers (tune here)

`src/03-sim.js`: `TAX` (multiplier + unrest/s per rate), `T_FRONT_R` 560, `T_KEYS` 3, `T_GAR_R` 260, `T_RAMP` 90, `T_REBEL_S` 120,
`townBase` (town 5.5 + 1.0·K = 8.5/s at Normal ≈ 1.2 oil derricks of $7/s; hamlet 0.9 + 0.9·K ≈ 3.6/s; × battle scale `G.bs`),
`CQ_START`, `CQ_SETUP`, `CQ_TRICKLE`, `CQ_OIL`, `CQ_HARV`.

## Code map

- `02-map.js` hamlets + houses; `03-sim.js` `initTowns / updTowns / townRevolt / townCapture / townCmd / baseDestroyed`, AI tax + town
  taking (AI block "conquest: take the nearest town"), rebel team appended in `newGame` (index `G.reb`, hostile, never "out", skipped by
  `checkEnd`); `07a/07-net` `tw` (10 ints per held town) + `bs` in teamGlobals, command `tax` appended to `CMD_T`; `07b-ckpt` `tw`;
  `08c-towns.js` (new) world labels, minimap markers, tax panel, setup/base banner; hooks in `06-view` and `08-ui`.
- Tools: `orch/conquest-t1.mjs` (revolt probe), `-t2` (AI battle with towns), `-t3` (setup + win rule), `orch/hamprobe.mjs`
  (hamlets per map/player count), `orch/conquestshots.mjs` (screenshots → `orch/shots/conquest/`), `W.ev` hook in `headless.mjs`.
- Test harness change: the rebel team is a real extra entry at the END of `G.teams` (`T.reb`). Tests that count teams must filter
  `!T.reb` (smoke done; see HANDOFF for the rest).

## Checks

- Headless AI battles (US/RU/IR/CN, fulda, 14 min): towns change hands, AIs set High in the rear and Low at the front, one accidental
  revolt in 14 min before the front-line tweak; no exceptions. Revolt probe: tax Extortionate at unrest 80 → revolt in ~12 s, 8 rebels spawn.
- Setup phase: 0 damage events before 90 s, then fighting; razing HQ + production ends the game with the right reason.
- `node orch/smoke.mjs` → SMOKE PASS. Smooth + cigate: see HISTORY line / HANDOFF.
- Screenshots (`orch/shots/conquest/`): rear High town calm, tax panel, front town boiling (REVOLT bar), rebels after a revolt, hamlet,
  minimap crop, phone portrait panel.

## Fairness evidence (partial — small samples; this box has 2 cores)

**Tax policy** (`node orch/conquest-t5.mjs --seeds 3 --minutes 14`, maps fulda + strait, US vs RU, team 0 plays a fixed policy against the
smart AI; 6 games per row, "ahead/behind" = base+army value beyond ×1.4 at minute 14):

| Policy for team 0 | revolts / game | tax earned / game | towns held | ahead | behind |
|---|---|---|---|---|---|
| **smart** (High in garrisoned rear towns, Low at the front) | 0.00 | **16,593** | 1.5 | 4 | 1 |
| High everywhere | 0.33 | 13,282 | 1.0 | 1 | 3 |
| Normal everywhere | 0.17 | 10,941 | 1.2 | 1 | 1 |
| Low everywhere | 0.00 | 6,461 (−61%) | 1.2 | 1 | 2 |

So the intended play wins on money (+25% over High-everywhere, +52% over Normal, 2.6× Low), never loses a town to revolt, and ends ahead
most often; High-everywhere loses towns to revolts and falls behind; Low-everywhere is poor. (An earlier run with High = +0.35 unrest/s
showed no revolts at all in 12-minute AI games, so High was raised to +0.6 and Extortionate to +1.6.) Human games with more fighting near the
towns should widen the gap. **Not run:** the 18-nation tourney, start-position fairness with Conquest economics, game-length
distribution (12–25 min) — run `node orch/aitourney.mjs` and `node orch/mapfair.mjs --battles` on a bigger machine and tune `CQ_*`/`TAX`/`townBase`.

## Not done / open

1. Stage 3: fair upgrades (research cost/time per tier), powers (rank + command points from calm towns), **missile strikes** (launch
   site building, public countdown on HUD + minimap, ≥ minute 8, 5 min recharge, cost per launch, 40% cap per building, missile
   defence building for all 18 nations, strikes raise `t.shock`). Minimap hooks: `drawTownsMini` is the place for countdown/defence circles.
2. Stage 4: remove Classic from the menus and the online lobby, tutorial (`08b-social.js` TUT) teaching tax/revolts, old replays
   ("old version" message), version mismatch refusal for Cloudflare lobby (rebel team changes the team count).
3. Map editor button to place hamlets (`D.hamAt` works); AI "raid enemy rear towns" (hook: `updTowns` AI branch), AI garrison policy is basic.
4. Tuning: AI economy after the money change, game length 12–25 min, 18-nation balance.
5. Phone/touch: panel works by tap; no other phone work (phones are abandoned per CLAUDE.md).
