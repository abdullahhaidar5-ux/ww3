# HANDOFF zhfeel (2026-11-15, Zero Hour feel)
Landed together in one commit (time): 
1. **Build clock** — `setBtn` in src/08-ui.js: the `.p` overlay of a bar button is one conic-gradient dark sector that sweeps away clockwise (rewritten only when the whole percent changes); the queue count is a big number (`.q`, src/08o-zhbar.js CSS). Powers already had the wipe on the side rail (qpUpdate).
2. **Sell / Repair** — sim: `act` cases `sell`/`rep`, `sellBld/repBld/sellTick` next to `cancelBld` in src/03-sim.js (3 s, 50% refund, removed via kill with `e.sold` so no explosion/loss; repair heals over 40 s, costs 25% of price, pauses when broke). State `b.sell`/`b.rep` rides in the checkpoint (generic entity copy) and in snapshots (reused building bits FLG.rout/FLG.shak in 07a/07-net). Bar buttons `#zhSell`/`#zhRep` in zhCtx (08o-zhbar.js); keys V / O in the key table; wrench + "SELLING n s" drawn in 06-view drawHUD.
3. **Cursors** — added `sell`, `repair` to CURD (08-ui.js), shown over the Sell/Repair buttons; power-target reticle bigger. Normal/select/move/attack/nogo/enter/place/aim already existed there.
Guard: orch/zhfeel.mjs (spawned from orch/decisions.mjs) = ZHFEEL PASS. Screenshot orch/shots/zhfeel.jpg.
NOT proven here: full `decisions.mjs` and `smoke.mjs` both time out in this sandbox (>9 min, unchanged-main behaviour) — run on GitHub. Cloudflare servers: servers-live move done after landing (see LOG).
Ideas left: click-Sell-then-click-building armed mode (now Sell acts on the selection at once); AI never sells.
