# Follow-ups — 2026-10-28 (branch orch/followups)

Fixes, checked with the playtester's/reviewer's scripts (`orch/qa-followups.mjs`, `qa-menu`, `qa-paste`, `review-cf-*`):

- **Defeat screen:** losers now read "Mountain Shias has been defeated: …", not "The last enemy capitulated".
- **Settings:** solid background; Done sits under the options and never covers them.
- **Command bar:** names wrap to two lines on PCs too (bar slightly taller); long nation/strike names wrap; only whole
  buttons show (phone sideways no longer hides a column under LAUNCH; upright phones too).
- **Hint line:** follows the chosen controls (Generals default or Alternate); touch wording on phones, mouse wording after a click.
- **Invites:** a pasted invite or link joins the right game (was "BATTLE"/"GITHUB"); invite text starts with the one-tap link.
- **Reload mid-battle:** the battle shows Rejoin.
- **Phones upright:** Deploy / Play online stay at the bottom of the long menu.
- **R11:** a standby whose own network is down keeps waiting instead of splitting the battle (split 45 s and 15 s PASS).
- **R12:** an ungreeted lobby socket no longer keeps a battle alive (unit PASS); too-small maps are refused (R4).
  Server change needs the main → servers-live PR; it works with today's client.

**CIGATE:** 16/16 PASS on 6d616eb.
