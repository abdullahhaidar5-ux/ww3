# Tonight's integration scout

Scratch branch `orch/tonight-scout`, rebuilt from scratch every ~15 min = `origin/main` + the six branches merged in order (three-upgrade tried separately on top). **Never merge this branch.** Last round: **23:28 UTC**, main = `ab2589a Gate workflow: each test's full log on its own gate-logs/<sha>-<test> branch`.

Browser tests (smoke/mpsync) are NOT run each round (shared 2-core machine); they run only when ORCH asks.

## Branches

| Branch | Last commit seen | Ahead/behind main | Unchanged since | Merge into combo | Build |
|---|---|---|---|---|---|
| `orch/stage2-dedicated` | b6b0b39 18:26 Servers: battle free-plan limits (3 at once, 45 min, hand over at 75%), battle list in its own b | 4/0 | 23:28 UTC | clean | ok |
| `orch/cf-battle-client` | f6b6a8c 18:20 STAGE2: browser side of the Cloudflare battle protocol (what the page does, two small additions  | 7/1 | 23:28 UTC | clean | ok |
| `orch/open-reconnect-phonebar` | 7585f4b 18:23 orch/barshots.mjs: command-bar screenshots at phone portrait/landscape and desktop sizes, with c | 3/0 | 23:28 UTC | clean | ok |
| `orch/controls` | 0ffa5f2 18:28 controls.mjs: find open ground on screen instead of fixed spots (CI screens lay out differently) | 4/0 | 23:28 UTC | clean | ok |
| `orch/touch-controls` | 988824f 18:28 Merge remote-tracking branch 'origin/orch/controls' into orch/touch-controls | 9/0 | 23:28 UTC | clean | ok |
| `orch/soundtrack` | bb05700 18:23 Soundtrack step 4: remove the old score's sample sheets (smp/me/as/we, 4.8 MB) and their pack sc | 5/1 | 23:28 UTC | clean | ok |
| `orch/three-upgrade` | 100d652 18:18 Merge orch/three-upgrade-fx (effects + post-processing port) into orch/three-upgrade | 8/0 | 23:28 UTC | resolved automatically (auto: `.gitignore` union merge (keep both sides)) | ok |

Combined six: `build.py` ok; `build.py --check` ok

## Pairwise conflict map (git merge-tree, branch vs branch)

- **orch/stage2-dedicated x orch/three-upgrade**: `.gitignore` L4-8 (?)

## Files each branch touches (its own commits only)

- `orch/stage2-dedicated`: `.gitignore`, `index.html`, `orch/STAGE2.md`, `orch/battletest.mjs`, `orch/serverdev.mjs`, `server/build-sim.mjs`, `server/src/battle-driver.js`, `server/src/battle.js`, `server/src/index.js`, `server/wrangler.toml`, `src/07-net.js`, `src/07a-hostsnap.js`
- `orch/cf-battle-client`: `index.html`, `orch/STAGE2.md`, `orch/build.py`, `orch/cfclient.mjs`, `orch/cfhost-standin.mjs`, `src/07-net.js`, `src/08-ui.js`
- `orch/open-reconnect-phonebar`: `orch/barshots.mjs`, `orch/mpsync.mjs`
- `orch/controls`: `index.html`, `orch/controls.mjs`, `src/06-view.js`, `src/08-ui.js`
- `orch/touch-controls`: `index.html`, `orch/touch.mjs`, `src/08-ui.js`
- `orch/soundtrack`: `CLAUDE.md`, `index.html`, `mus/an_pack.py`, `mus/as.mp3`, `mus/as_pack.py`, `mus/me.mp3`, `mus/me_pack.py`, `mus/smp.mp3`, `mus/st/calm-01.mp3`, `mus/st/calm-02.mp3`, `mus/st/calm-03.mp3`, `mus/st/calm-05.mp3`, `mus/st/combat-01.mp3`, `mus/st/combat-02.mp3`, `mus/st/combat-05.mp3`, `mus/st/combat-06.mp3`, `mus/st/combat-09.mp3`, `mus/st/combat-11.mp3`, `mus/st/defeat-02.mp3`, `mus/st/encode.py`, `mus/st/manifest.json`, `mus/st/menu-02.mp3`, `mus/st/menu-04.mp3`, `mus/st/victory-01.mp3`, `mus/we.mp3` ...
- `orch/three-upgrade`: `.gitignore`, `CLAUDE.md`, `index.html`, `orch/ARTIFACT.md`, `orch/artifact-harness.mjs`, `orch/build.py`, `orch/smoke.mjs`, `orch/three/compare.mjs`, `orch/three/entry.js`, `orch/three/package-lock.json`, `orch/three/package.json`, `orch/three/vendor.mjs`, `src/04-gfx.js`, `src/05-fx3d.js`, `src/06-view.js`, `src/10-post.js`, `src/11-models.js`

## Same code touched by more than one branch (may not conflict textually, but check behaviour)

- `orch/build.py`: `artifact` (soundtrack, three-upgrade); `syntax_check` (cf-battle-client, soundtrack)
- `src/08-ui.js`: `touchHud` (controls, touch-controls)

## Advice to the owning agents (hand-written, updated each round)

- **index.html conflicts are expected and harmless** when only the game span differs: at integration, take either
  side, then `python3 orch/build.py` regenerates the game span from merged `src/`. Only page-shell edits (outside the
  game `<script>`) need hand merging; the scout auto-merges the shell 3-way and flags it here if that fails.
- **touch-controls already contains controls** (it merged `origin/orch/controls`). Keep merging `orch/controls` into
  touch-controls rather than re-editing the same lines, and land controls first.
- **three-upgrade owns `orch/build.py` and the vendored Three.js in the page shell.** Nobody else should edit
  `orch/build.py` tonight; if you must, tell the three-upgrade agent.
