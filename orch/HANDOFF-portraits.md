# HANDOFF portraits (round 2) — NOT good enough, do not show Abdullah

Honest verdict after the quality gate: round 2 is much better than round 1 (real MakeHuman heads, skin pores, eyes, strand hair/brows, no floating bars) but still NOT EU4 / $75 quality. Sheet kept only as `orch/shots/portraits/sheet-round2-REJECTED.png`.

What blocks it (seen at 100%):
1. Beards are hard-edged mats: mask region cuts vertically at the cheeks/ears and covers the mouth like a box (bl/compose.py add_beard masks). Needs a soft falloff + jaw-following shape + sideburn blend.
2. Faces too alike and doll-like: MakeHuman targets give limited variety; skin is uniformly waxy orange; same stare (no eyelashes, no lid shape/expression). Needs skin texture maps (MakeHuman skin textures live in makehuman-system-assets, not reachable from this sandbox: only the `makehuman` repo can be cloned) and asymmetric/expression targets.
3. Peaked caps look like boxy chimneys; ghutra is a bucket; suits are dark blobs with weak lapels; no medals/insignia.
4. Women (KR, GB, BR) look androgynous; "bob" hair is a bowl.
Time/cost: ~35 s per portrait at 600x750 on 2 cores, so 40 = 25 min. Pipeline works end to end (README.md in orch/portraits): the fixes above are modelling work in bl/*.py, not infrastructure.
Needs a decision: grant access to makehuman-system-assets / makehuman-assets (add_repo) for real hair, eyebrows, skins, clothes proxies, or accept a stylised look.

Shipped to main anyway: names fix (Supreme Ayatollah = IR only; RS, DW, RV heads are "Imam <name>"; RV culture/names added; heirs stay Hojatoleslam). Portraits stay OFF.
