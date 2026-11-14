# HANDOFF — sweepfixB (slice-sweep fix batches 3, 4, 5)

Branch `orch/sweepfixB`, lock `taken/sweepfixB`. Battle + Conquest only, no `src/13*` touched. Not landed on main
(the conductor lands gated branches).

## Done (one commit each)
1. **Order buttons readable** (finding 2) — `20d1ff7`. All order rows sit in ONE dock above the command bar
   (`ordDock()` in `src/08-ui.js`): army orders as a 5-column grid (two rows), icon + whole word + hotkey chip (Attack F,
   Guard G, Same type T, Stop X, Retreat R, stance V, Resupply Z, Dig in I, Cancel Del); Fortification line / Fix
   vehicles row above when a Construction Vehicle is selected, road tools (Mine road … Pontoon) above that. The dock's
   empty padding lets clicks through to the battlefield. Follow-up commit compacted it from 3 rows to 2. Same buttons/handlers, same key
   table, no new system. Old per-row `bottom` offsets in `08c-tactui.js` / `08c-logi.js` removed. `orch/controls.mjs`
   reads the new label ("Same type (T)" via aria-label).
2. **Build bar + nameplate** (finding 3) — `a752c13`. BEATS / WEAK TO chips moved onto the price line
   (`08j-uikit.js`), so names get the full width ("Mountain Anti-Ship Rockets", "Noor / Qader Coastal Missiles" whole).
   Nation nameplate is a one-line caption on the minimap's top edge in the nation color (`plateHome()`), so it never
   wraps into the cash; on small screens it goes back to the header.
3. **Settings + overlays** (finding 5) — `73c50e6`. Settings = one framed, centered window, fixed height on every tab
   (tabs scroll inside, DONE pinned), labels spaced. While Settings or the Victory/Defeat screen is open the HUD floaters
   (money/Supply/Opinion bar, feed, setup banner, quick powers, order dock, toasts) are hidden (`08i-hud.js`, `:has`).

Guard in `orch/decisions.mjs` (sweepfixB block, runs at 1280×720 in the IR Conquest battle): no order button cut or
over the command bar (army / army+dozer / dozer), exactly one dock, no road tools without a dozer, hotkeys shown;
nameplate one line at ≥11 px for every nation in FKEYS; HUD top bar hidden under Settings and Victory and back after.

## Checks
`build.py` + `--check` OK · `node orch/smoke.mjs` SMOKE PASS · `node orch/decisions.mjs` DECISIONS PASS
(order dock: army 9 buttons FGTXRVZDelI, mixed 16, dozer 7, plate 0 failures). Gate: see the last section.

## Pictures (`orch/concepts/sweepfixB/`, before = main, after = this branch)
before/after at 1280: `-army-` (IR army), `-allarmy-` (army + dozer + truck), `-dozer-`, `-bar-IR-`, `-bar-RS-`,
`-settings-`, `-victory-`; after at 1920: army, allarmy, dozer, bar-IR, settings, victory. Script: `node orch/sweepfixB.mjs`.

## Not done / notes
- 1600 wide not shot separately (1280 and 1920 both clean; the dock is at most 700 px wide, so 1600 sits between).
  The 1920 dozer picture shows the first (3-row) dock; army/allarmy at 1280 and 1920 show the final 2-row dock.
- Gate run 1 (c4248e1, 3-row dock): 25 of 28 green incl. smooth-pc / smooth-mp / grandsmooth; `audio` + `grandlive`
  failed once and passed on re-run; `tutorial` failed twice ("step 14 never started") — it fails on most other recent
  gate branches too (flaky, listed as such).
- Gate run 2 for the final code (f2141d9, `gate/f2141d9d0c`) was still QUEUED when this run stopped: GitHub Actions
  ran nothing repo-wide from ~02:50 to 03:40 UTC. Its statuses land on that commit when runners resume — the conductor
  should check them (code after f2141d9 is pictures/docs only). Local re-check of f2141d9: DECISIONS PASS.
- Nameplate now lives on the minimap: a design call — if Abdullah wants it back next to the cash, the header needs a
  second line (not enough width at 1280 for "Palestine Islamic Brigade").
- The touch strip (`#tstrip`, phones) is untouched.

## Try for 2 minutes (PC)
Start a Conquest as Lebanese Shia, box-select your infantry, then add the Construction Vehicle with Shift:
the order dock should read whole words with hotkeys, and the nameplate sits on the minimap. Then Esc → Settings.
