# HANDOFF laneG (2026-11-07 ~18:10 UTC, branch orch/laneG-202611071650)
Scope (PLAN-SAT rule 0 usage plan): Lane G = RG5 TV news (shipped) + RG10 nuclear (shipped, follow-ons below).
This run: RG10 follow-on "an enemy-held capital (the programme site) halts the programme" (src/13zz-gnuke.js gnkMonth).
Abdullah 10:22 "Not realistic" overrides the one-month flight: warheads impact within minutes (main already did this in 95cdab1);
my own earlier travel-time/interceptor draft was dropped, not merged.
Gate: nuketest PASS locally on this commit; smoke PASS and decisions PASS on the earlier base (a1776ce + the same change).
Cigate on 6eb8e2a (main 370d2a4, which includes the laneC merge) is RED for reasons outside Lane G: BufferGeometry
computeBoundingSphere NaN in battle tests (art-smoke, smoke4, mpsync, migrate*, smooth-pc), plus controls, decisions, grandsmooth, save.
Also red on a1776ce before the laneC merge: grandlive (page.click #gPlay timeout, reproduces locally on a1776ce), grand (eco: closed strait raises oil, Lane B), smooth-mp, controls, tutorial (flaky).
NOT pushed to main because the gate is red. Whoever owns the laneC/E model changes should look at the NaN bounding sphere first.
Open RG10 items: world-map flash/mushroom, interceptor stock from RG33/57, multiplayer alerts, town population wrecking, human victim's answer prompt.
Stopped without re-firing: Lane G's listed items are done per PLAN-SAT rule 0.
