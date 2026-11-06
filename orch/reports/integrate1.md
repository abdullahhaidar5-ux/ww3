# integrate1 report (2026-11-06)

Abdullah 19:34: "Let's get this all done intelligently. Suggest and implement any gaps. For example two militias. Fix that."

## Shipped
**National morale styles (gap 8).** `MSTYLES` / `MORALE_STYLE` / `msOf()` in `src/01-data.js` are the only place the numbers live.
Zealous (IR RS DW KP): courage 1.6, fervour (comrades falling steadies them), +7% damage taken, martyr banners (KP shows "PARTY BANNER").
Professional: courage 1.25, shell suppression x0.7, officer rally x1.9, comrade losses hit 30% harder. Home defenders: courage 1.0, x1.4 inside
their own territory. Firepower-reliant (IN AE SA IL): courage 0.85, /1.5 with no tank/artillery near, own artillery + air +10% damage, -5% damage taken.
Every live nation is assigned as in SYSTEMS.md; unlisted/new nations default to Home defenders (set `morale:` in NEWNAT). The old `COURAGE` table is gone.
Nation pick shows "morale: <style>", full text on hover and in the Encyclopedia. **Balance numbers are first-cut: run the tourneys** (`orch/aitourney.mjs`).

**Removed from Conquest battles (gap 9).** `conqBan(kind)` (cleric / fort / bb, only when `G.conq` and not a mission or the sandbox): not buildable,
not in rosters/powers/build lists/AI/encyclopedia, no Ayatollah rally zone, no "unbreakable while the Ayatollah lives". Data stays, so old saves with
these units load; missions keep them. **Hooks for grand stages 2/3/6:** the Mountain Fortress as a pre-built province building is already read by
`13b-grandbattle.js` (`fort:`); Ayatollah/Dear Leader/Bunker Buster as grand-map figures/strikes are still to build there (`conqBan` is the single switch).

**Merges.** Locals: one spawner `localSpawn` + `u.loc` + one minimap ring. Knocked out: `koSet/koLeft` + one marker. Cover: `coverKind`. World opinion:
already drives sanctions (`polMul`), shown in the new bar.

**ONE HUD** (`src/08i-hud.js`): top bar (money, income, supply, opinion, Alerts), one alerts feed fed from `pushLog`, overlay switcher (Towns, Supply, Opinion,
Sonar, Mines). The old top-centre opinion line moved into the bar. **What's new** screen (menu button). **savetest hash** now includes locals, knocked-out, fear/rout, suppression, rank, banners, smokes, wounded.

## Still open (see HANDOFF-integrate1.md)
Deception / jamming merges, spectating + news + encyclopedia merges, the two EMP/cyber power implementations, separate unrest/economy/front-line overlays,
tutorial steps + tooltips + encyclopedia entries per new system, new sounds (EMP, cyber, sonar, mines, wildfire, flood, medic, convoy horn, jammer, decoy, alerts),
key-table audit + `controls` gate flake, AI use of morale styles, balance tourney for the styles.
