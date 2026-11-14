# HANDOFF shiamissions — parked until after Monday; NOT ready

ORCH note on this branch (Abdullah, Sat 09:50 Chicago: "Drop missions" for tonight) said stop, push, do not run cigate. Done. The conductor will not land this branch.

## What is in the branch (src/12-campaign.js only, plus rebuilt index.html / sw.js)
- Six missions now: the five Shia missions polished + a new RV mission 6.
  1. Hold the Pass (RS) — now on the Lebanon Beqaa/Chouf hills map; ridge depot (capturable), dug-in guns, wave warnings, radio line in Lebanese Arabic.
  2. Supply Run (DW) — now on the Yemen highlands map; optional cistern depot at the halfway ridge; ambush radio lines.
  3. Mountain Fortress (IR) — Zagros; the Ayatollah starts with the garrison; valley depot; wave and bunker-buster banners.
  4. Retake the Village (id 'town', RS + DW) — Golan hills map; fortified village of garrisoned houses, enemy turrets, enemy-held fuel depot at the far gate (z4 = recapture it). No town code used.
  5. Combined Arms (IR) — Caspian coast map; forward depot; objective banners.
  6. Bridgehead on the Euphrates (RV) — Euphrates Crossing map: take the east end of the bridge (emplacements + infantry), capture the ammunition dump, hold the bridgehead 6-8 min against counter-attacks. About 16-22 min.
- Shared: on-screen objective banner + "Objective complete" lines, radio lines (language + English), mission length in the list, CH helpers (flash, radio, civs, village, garrison, depot).
- A "depot" is one oil-derrick row (the sim's one capture system), so it will also work as a resupply point with techbldgs' tbSupplyPts / the ammo rule once they land.

## NOT done
- Not play-tested at all: no win/lose runs, no screenshots (orch/shots/shiamissions-*.jpg), no smoke/decisions/cigate. Only `python3 orch/build.py` + `--check` pass.
- orch/camptest.mjs still lists the 5 old ids and the old "town" completion script; needs the 'marsh' mission, lose-path checks, and the new village/depot completion.
- Map swaps (beqaa, tihama, golan, caspian, euphrates) are unverified for pathing at the CH.pt axis positions.
- Dugouts, capturable tech buildings and the ammo rule were not on main yet; mission 3 etc. use Defense Guns and derrick depots instead. Re-check after onegame / nations20 / techbldgs land.
