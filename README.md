# World War 3

A browser real-time strategy game. **Nothing to download or install: just open the link and play** — on PC, Mac,
iPhone, iPad or Android.

**Play:** https://ww3.abdullah-haidar5.workers.dev (Cloudflare) or https://abdullahhaidar5-ux.github.io/ww3/ (GitHub)

- Skirmish against the AI, or the Test Range.
- Online multiplayer for up to 8 players: one player opens **Multiplayer → Host a game** and shares the 6-character code; others enter it under **Join by code**. Players connect directly to the host's browser.

**No install:** the game runs in any modern browser. (If someone really wants a desktop icon, Chrome/Edge can still install it from the browser's own menu.)

## Hosting for players around the world

The host's browser runs the battle, so the host's PC and connection matter most.

- **Keep hosting while the window is in the background.** The game keeps the battle running at full speed when the host switches to another window or minimizes it (it used to freeze for everyone). Closing the tab still ends the game.
- **Tune the host PC (Windows):** download the [`tools`](tools) folder and double-click **Host tune-up.cmd**. It shows what it would change, then asks: no sleep or lid-close sleep while plugged in, network adapters kept at full power, browsers on the high-performance graphics card. **Undo tune-up.cmd** puts everything back.
- **In the browser:** Chrome: Settings > Performance > *Always keep these sites active* > add `abdullahhaidar5-ux.github.io`. Edge: Settings > System and performance > *Never put these sites to sleep* > add it.
- **Use a cable, not Wi-Fi, and disconnect any VPN** while hosting.
- **Relay for strict networks:** some players' networks block direct connections. Set up the free Cloudflare relay in [`relay-worker.js`](relay-worker.js) (instructions at the top) and put its address in `RELAY_CF_URL` in `index.html`; those players then connect through Cloudflare automatically.


## Development

The game source is in [`src/`](src); `index.html` is built from it. All work is coordinated by ORCH, the orchestrator — see [`CLAUDE.md`](CLAUDE.md) and [`orch/`](orch) (backlog, history, build and test tools).
