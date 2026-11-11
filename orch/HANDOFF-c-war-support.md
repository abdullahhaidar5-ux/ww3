# HANDOFF — War support at home (campaign runner A, 2026-11-11)
Branch `orch/c-war-support` (owner system src/13v-gwarsup.js; 13zn-gnet order list; grandtest + wstest guards; REAL-2026 section; screenshot orch/shots/grand2/home-front.png).
NOT on main: runner rule "no push to main while CLAUDE.md's RIGHT NOW bullet lists gate/grand or gate/grandlive as red".
Slice 1 done: government families (`WS_GOV`/`WS_GOVT`: democracy, monarchy, theocracy, party state, military-led, presidential) change how bad battle news and war weariness land;
rally-round-the-flag for 6 months after an invasion; wartime support < 25: protests (democracies from < 30), strikes (GMOD row ws_strikes, income -5%), officer split (army estate loyalty -2/mo -> 13o crises/coups);
"Restrict war news" (wsCensor, 30 PP, 6 months, backlash -5, 12-month cooldown; AI uses it below 40); Home front tab shows the government line and the button.
Local: build --check, GRANDTEST PASS, WS PASS. CI gate: see queue line.
Next slices: casualties counted from real losses (not only battle results); prices/inflation feeding the meter; election losses tied to the real calendar already exist in 13zw (approval uses wsOf) - add the government-type weighting there;
elite splits for monarchies/party states (estates); enemy AI reading a low meter (peace offers, propaganda); media/UN reaction.
To land: merge origin/main, rebuild, grandtest + wstest + decisions + smoke, cigate, push.

## Slice 2 (campaign runner, 2026-11-11 14:20Z) — branch `orch/c-war-support2` (on top of main ac59908), NOT on main (RIGHT NOW bullet)
Prices and shortages feed the meter: in `wsMonth` (13v), only while at war, `N.e.starve` −3, `N.e.dry` −1, `N.e.ration` −1 a month (democracy ×1.5, Zealous ×0.5), why-line
"Shortages at home: …" on the Home front tab, a log line for the player every 4th month (`N.wsSh` counter, saved with the nation). No second economy: reads 13g's flags.
Guard: grandtest "war support by government" (`short`, `shortNone`, `shortPeace`). REAL-2026 "War support at home" has the source line.
Watch in CI: AI nations that run dry in a long war now tire faster — if a grandtest calibration check (war length / forced peace counts) moves, lower the `dry` step first.
To land: rebase on origin/main, `python3 orch/build.py`, `orch/cigate.sh`, push when the RIGHT NOW bullet allows; then delete branch `taken/c-war-support`.
Next slices unchanged: casualties from real losses, election weighting by government type (13zw), elite splits for monarchies/party states, enemy AI reading a low meter, media/UN reaction.

Gate (2026-11-11 14:45Z): the GitHub run for this branch failed in ALL 28 jobs before any test started — the runner could not reach the Ubuntu package servers
("Temporary failure resolving security.ubuntu.com" during `npx playwright install --with-deps`, step Tools). The two gate runs before it (13:14Z, 13:44Z) ended the same way.
So there is NO gate verdict for this slice yet: re-run `orch/cigate.sh` when the runners can install again, before landing.
