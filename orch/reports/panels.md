# Grand-map panels — one style (queue "Campaign panels", orch/polishP2, 2026-11-10)

Rule (UI flow): every grand-campaign window has the same frame (font, border, corner radius, gold title), the close ✕ in the
same top-right corner, **Esc closes the top-most one (one per press)**, Back goes one step. One owner: `src/13zzz-gpanels.js`
(`GPAN` = the list below, `gpxDress` = the frame, `gpxEsc` = the one Esc handler). A new panel = a new row in `GPAN` and here.
Guards: `orch/polishtest.mjs` section 3 (opens each, checks frame + ✕ position, closes with Esc, checks the stack order),
`orch/decisions.mjs` (no second Esc handler / own close button in a grand module).

| ✓ | Panel | Element | Kind | Frame | ✕ top-right | Esc |
|---|---|---|---|---|---|---|
| [x] | Nation window — six groups (Overview · Government · Economy · Military · Diplomacy · World), every screen in a left-hand list; Esc = one step back, then close | `#npWin` | window | yes | yes | closes |
| [x] | Military (Generals · Fronts · Strikes · Fleets) | `#gMil` | side | yes | yes (was its own button) | closes |
| [x] | Empire economy | `#gEco` | side | yes | yes (had none) | closes |
| [x] | Diplomatic web | `#gWeb` | window | yes | yes (had none) | closes |
| [x] | Peace deal | `#gpDeal` | window | yes | yes (had none) | closes (= Keep fighting) |
| [x] | Confirm dialogs (declare war, etc.) | `#gModal` | dialog | yes | yes | = "No" |
| [x] | Event with choices · battle prompt (Fight it live / Auto-resolve) · strike target | `#gModal` | dialog | yes | none on purpose | does nothing — it needs an answer |
| [x] | Auto-resolve result / notices with one plain button | `#gModal` | dialog | yes | yes | = that button |
| [x] | Campaign over (victory / defeat) | `#gOver` | dialog | yes | none on purpose | needs an answer |
| [x] | TV news ticker | `#gTV` | note (keeps its TV look) | own theme | yes | closes |
| [x] | Newspaper headline | `#gNews` | note (keeps its paper look) | own theme | yes | closes |
| [x] | First-steps coach | `#gCoach` | note | own theme | yes | closes |
| [x] | Grand campaign menu · New campaign · Campaign lobby | `#campScreen` | screen | page style | Back button | = Back (one step) |

Not panels (fixed parts of the screen, nothing to close): top bar + alerts strip, province / army column on the right, map key
("What am I looking at?", has its own fold arrow), minimap, map-mode buttons.

Left for later (not done here): the buttons *inside* panels still carry their own colours per topic (green = do, gold = money,
blue = military); only font and corner radius are unified.
