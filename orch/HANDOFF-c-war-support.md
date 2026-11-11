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
