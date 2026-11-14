# presentation helper -> polishfeel: what I own (branch orch/presentation)
- Camera defaults and zoom range: `placeCam` + `ZMIN` in src/06-view.js, wheel/zoom keys and start distance in src/08-ui.js. Do not change them.
- Veteran look: glow (`vetGlow` in 06-view), stripes in the bar portrait (`vetStripes` in 08-ui), promotion cue (`vetCue` in 09b-radio).
- Command bar layout (minimap | selected unit | command and build grid) and hotkey letters on command buttons: src/08o-genbar.js (CSS only) plus the `em.hk` badge in `tcStrip` (08-ui).
- Not touched: end-of-match screen (Abdullah: leave as is), order markers (orderfeel).
