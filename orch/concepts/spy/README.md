# Infiltrator look — three plain-clothes outfits (helper spylook, 2026-11-12)
`spy-IR.jpg`, `spy-US.jpg` (1600x900, close): a rifle squad, then A dark jacket + cap + satchel + phone at the ear (**shipped default**), B long plain coat + scarf + binoculars, C polo + vest + sunglasses + hand radio.
`spy-IR-battle-zoom.jpg`: the same line-up at the normal battle camera. `spy-IR-hidden-eye.jpg`: the small eye its owner sees above a hidden spy.
To switch the default: `SPYLOOK` in `src/11-models.js` ('A' / 'B' / 'C'); colors in `SPYC`, props and poses in `spyKit`.
Retake: `node orch/spyshot.mjs --p IR --hid 1 --out <dir>` (US: `--p US --a RU --map fulda`); `--repl <dir>` keeps the page open for quick tries.
Built by code on the existing soldier body (no new model file, nothing fetched); view only.
