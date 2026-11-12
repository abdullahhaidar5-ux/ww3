# Fonts bundled into the page (no files from other hosts at runtime)

`index.html` used to fetch its two fonts from Google Fonts. They are now inside the page shell as `@font-face` data URIs
(the `<style id="fonts">` block right before the main `<style>`), so the game makes no font request to another host.

| File | Family / weight | License |
|---|---|---|
| `saira-condensed-latin-600-normal.woff2`, `…-700-…` | Saira Condensed 600 (also used for 500) and 700, Latin subset | SIL Open Font License 1.1 — © 2016 The Saira Project Authors (Omnibus-Type) |
| `ibm-plex-mono-latin-400-normal.woff2` | IBM Plex Mono 400 (also used for 500), Latin subset | SIL Open Font License 1.1 — © 2017 IBM Corp. |

Source: npm packages `@fontsource/saira-condensed` 5.3.0 and `@fontsource/ibm-plex-mono` 5.3.0 (unchanged files).
To rebuild the block: `python3 orch/fonts/embed.py` (rewrites only the `<style id="fonts">` block of `index.html`), then `python3 orch/build.py`.
Guards: `python3 orch/build.py --check` (shell must not name fonts.googleapis.com / fonts.gstatic.com) and `orch/smoke.mjs` (no request to a font host).
