# Real-war rules for battles — realistic AND intuitive

Abdullah 2026-11-10 19:42 "More realistic suggestions" → eight suggestions → 19:44 "Like these but let's keep the game
intuitive as well". Order: 1, 4, 5 first (they change every battle), then 2, 3, 6, 7, 8.

## The intuitive contract (applies to every rule below — a rule that breaks it is not done)
- **No new buttons, modes or micromanagement.** The realism happens by itself; standing controls (CLAUDE.md) are unchanged.
  Units pick the smart default alone (guns relocate after firing, tanks face the threat, engineers clear a lane when
  ordered through mines, radars manage themselves); at most ONE simple stance toggle where a real choice exists.
- **One clear signal per rule, on the ground, in the game's one visual language** (ring = condition, rim = side, shape =
  what it is doing; thin lines for links). Never a number the player must read to understand what happened.
- **See it before you commit:** the order preview (ONE-LANGUAGE.md idea 2) shows the consequence at the cursor in two or
  three words ("hull-down", "side exposed", "inside enemy jammer", "mined").
- **Say it once, in plain words:** when a rule bites, one line in the commander's radio ("Battery heard by enemy radar —
  moving") and the matching voice line. Taught in the tutorial with one 20-second moment each.
- **Fair:** tactical battles stay balanced games — every nation gets the same rules; retune costs/numbers with the
  balance tests (orch/tourney.mjs, nightly balance report); Zealous never rout / never bail out stays true.
- One system per idea: AUDIT FIRST what already exists (the code already mentions jamming, smoke, mines, radar, ammo,
  fuel, medics, flanking) and deepen the owner; top attack and hull-down do not exist yet. New sim state goes in the
  checkpoint; host and clients must agree; AI must use and respect every rule (or it is not shipped).

## The rules (real war → what the player sees)
1. **Kill chain.** Indirect fire with a friendly unit seeing the target is accurate and fast; without eyes it scatters.
   Signal: a thin line from spotter to gun while it is spotting; target marker solid (seen) vs dashed (blind fire).
4. **Armor facing and top attack.** Front thick, sides/rear thinner, roof thinnest; drones and top-attack missiles hit the
   roof. Signal: the unit ring's arc is thick at the front and thin at the back; a hit flashes the part of the ring it
   struck; "what it beats" buttons reflect it.
5. **Hull-down and real sight lines.** A vehicle behind a crest/wall shows only its turret: much harder to hit from the
   front. You can only shoot what one of your units sees; smoke blocks sight and guidance. Signal: a small turret-only
   mark on the unit's ring when hull-down; order preview says "hull-down" at good spots.
2. **Shoot and scoot.** Firing artillery can be located by enemy radar/sound ranging; a located battery is marked for
   the enemy for a short time. Guns relocate by themselves after a fire mission (stance: move after firing / hold).
   Signal: a "heard" pulse on the battery with a short countdown ring.
3. **Jamming bubbles.** A jammer projects a dome: enemy drones inside lose control, guided weapons lose accuracy.
   Signal: a faint dome outline in the owner's rim colour; drones entering an enemy dome show a broken-link mark.
6. **Layered air defense.** Guns vs drones, short missiles vs helicopters, long missiles vs jets; emitting radar sees far
   but can be targeted by anti-radar weapons. Signal: range rings by layer when an air-defense unit is selected; radar
   on/off shown by the ring's rim (managed automatically; one stance: radar free / radar quiet).
7. **Mines and engineers.** Minefields channel attacks; own mines always visible to the owner, enemy mines only when
   found; engineers clear a lane when ordered through; bridges can be blown and rebuilt. Signal: mine marks, a cleared
   lane drawn on the ground.
8. **Knocked out, not destroyed.** Hits can break mobility or the gun; knocked-out vehicles can be towed/repaired by a
   recovery or repair unit; crews of Zealous factions stay (standing rule). Signal: a wrench mark on the ring; the
   broken part named in the unit tooltip.
