# Modern war (Abdullah 2026-11-05 18:58) — report

Branch `orch/modern-war`. Files: `src/01c-modern.js` (data), `src/03g-modern.js` (sim), `src/08h-modern.js` (effects, PiP, scoreboard). Test + screenshots: `node orch/mwtest.mjs`, `orch/shots/modern-war/`.

## What shipped
1. **Cyber Attack** (general power, key **[**, cooldown 150 s, radius 240): hacks ONE enemy radio tower, Strike Center, SAM site, defence gun/coastal battery, or a power plant near the target for 25 s (x1.0/1.4/1.8 by power level). Uses the existing "knocked out" timers (`e.dis` for buildings, `o.sab` for plants, so hacking the only plant = real blackout). A hacked radio/Strike Center also turns the victim's minimap to static. Names are flavoured per nation (`MW_NAME`), numbers are identical.
2. **EMP Strike** (general power, key **]**, cooldown 240 s, radius 230, 1.4 s warning): vehicles/ships 7 s, aircraft 5 s (frozen, no damage, never an instant kill), radio/Strike Center/SAM/guns 8 s. Infantry unaffected. Blue rings, sparks, screen flash.
3. **Hardened Firewall** (HQ research, $1300): halves Cyber Attack and EMP duration on your forces. One upgrade covers both counterplays.
4. **GPS jamming** extends the existing EW Jamming Truck (one system): guided shots (missile, ATGM, guided bomb) at anything inside an enemy jammer's bubble drift 28–70 px off target half the time (a drifting missile does no direct damage; splash lands off-centre; "JAMMED" text), drones inside the bubble fly erratically while burning out. Guns/shells never affected. The owner sees the jamming ring on the ground; the truck can be found and killed. The EW truck is now buildable by **every** nation (before: RU, US, CN, IR, IL).
5. **War news**: the existing headline ticker (Settings > War news) stays; new **breaking-news picture-in-picture**: a 3 s corner camera cut (top-left, never takes input, 6 s minimum gap) on missile strikes, towns captured/lost, Cyber Attacks and EMPs. Same Settings toggle turns both off. Per-language text not done (English only).
6. **Spectate live**: already existed (07a-hostsnap `specJoin`, cap `SPEC_MAX=4`, view switch in the spectate bar, Cloudflare + PC-host paths). Added a spectator **scoreboard** (units, buildings, kills, money per side). No sim/host changes for spectating.

## AI
Buys Hack then EMP only after nat + barrage + recon powers; hacks a SAM/turret/radio near its army (every ~25 s check), EMPs a cluster of 5+ visible enemy vehicles; researches Firewall once it has been hit.

## Sim / net
Changes `03-sim.js` (power dispatch, jam hook in `fire`/`updProj`, drone jitter, AI call) and adds `01c`/`03g`: **sim change, needs a `main → servers-live` PR**. No new checkpointed state (uses `dis`, `stun`, `sab`, `T.pw`, `T.upg.fw`). New FX events: `cyb`, `emp`, `mmst`.

## Notes / for the balance agent
Knobs are in `MW` (01c): `HACK_T`, `EMP_T`, `FW_K`, `JAM_MISS`, `JAM_D`; costs are one rank point each (like other powers), cooldowns in `POWERS`. Aircraft "glide" is just a freeze for 5 s (no descent animation). All letter keys were taken, so the new powers use `[` and `]`.
