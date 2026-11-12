# Handoff — orch/armytokens2 (army tokens on the grand map), helper finish-tokens, 2026-11-12 00:55 UTC

State: finished and pushed; NOT landed (conductor batches). Based on main 737fab9 (train 5) + merge of orch/armytokens.
Gated commit: 79ed8f9 (`gate/79ed8f99a7`), 25 of 28 green — decisions, grand, grandsmooth, smooth-pc/mp, mpsync, check, smoke all PASS.
Red on that run:
- `tutorial`, `audio` — passed on this branch's first run (a2242b2, same code except spelling); both were also red on main tonight (aa8968f, 0a0b505). Looks flaky.
- `migrate-dual` — red on both runs ("client A never received a second checkpoint": the host made client B the standby, the test expects A). This branch does not touch battle or net code (src diff: 13c, 13e, 13e2, 13e3, one sentence in 08l-firsthint). Not explained; re-run it before landing. I used my two gate runs, so I did not run a third.

What changed (view only; no sim, sync hash or checkpoint change):
- `src/13e3-gtokens.js` — the tokens. Far = one Points draw of dots + numbers; middle = tokens only; close = token + main's small on-land figures.
  `gtkNudge`/`gtkOver`: a crowded token takes the nearest free spot (max 60 px), else joins its own nation's stack (far + middle), faint ones drop out; capital plates (`G3.plR`) count as occupied.
  The first version's second miniature system (`gtkMinis`, `gtkGeo`, `gtkFigures`) is deleted — one figure system (`g3Batch`).
- `src/13e-grand3d.js` — `g3Batch` draws figures only at tier 2 or for the selected army, flag only for the selected army; `g3FarGeo/g3FarCol/g3FarHide` and the shield-badge CSS/legend removed; `g3HitAt` box targets = whole token (ring + number plate + pin).
- Guards: `orch/grandtest.mjs` (armytokens block: ≤1 marker per province at middle zoom, 0 figures/flags at far+middle unless selected, close view has figures; calmmap `vis()` reads `gtkAudit()`), `orch/decisions.mjs`.
- Pictures: `orch/concepts/tokens/` (before/after + README).

Open ends: a nudged token's pin moves with it (up to 60 px off the exact spot at middle zoom); tokens can sit over the bottom HUD cards like the old badges did.
