# Small fixes (branch `orch/small-fixes`) — CIGATE 16/16 PASS on 8e5ad4d376

1. **Map picker**: the line under each map no longer guesses "open land". All 28 maps now have a terrain line of their own,
   e.g. Fulda Gap "farmland · forests · winding river", Golan "high plateau · lake & valley below", Korean DMZ "fortified
   border · river · mountain ridges". The long descriptions were checked and were already right.
2. **Phone button names**: names on the command buttons now wrap onto two lines and shrink slightly if needed instead of
   ending in "…". Every building, unit, upgrade and power of all 18 nations fits at 390×844 and 844×390. One name
   (Hetman Sahaidachny Frigate) shows as "Sahaidachny Frigate" on phones. Buttons stay ≥ 40 px.
   Before/after: `orch/shots/phonelabels/`. `node orch/barshots.mjs --names` checks this.
3. **Gate**: the mpsync-server job now also runs `mpsync --server --reconnect` (still 16 statuses).
4. **Touch screenshots**: `orch/shots/touch/` (portrait guide, portrait command strip, landscape strip).

Note: run locally, touch.mjs timed out once on a slow landscape tap (the machine was slow); it passed on CI.
