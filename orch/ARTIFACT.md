# Publishing the claude.ai artifact edition

The game has two live copies: GitHub Pages (`index.html` on `main`) and the claude.ai artifact
https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi. Both are built from the same `src/`. Republish the artifact at
every ship (ORCH.md step 8), right after pushing `main`.

## What differs from index.html

`python3 orch/build.py --artifact` writes `orch/out/artifact/` (gitignored): `index.html` (~1 MB), `models/*.txt` and
`publish.json`, from the current `src/`, `models/` and the `index.html` shell. It makes four changes and touches nothing
else:

1. **No PeerJS, Trystero, online-edition shim or install/service-worker script.** On Pages those scripts stand in for
   the artifact runtime: the shim sets `window.claude.use('room')` over PeerJS. On claude.ai the real
   `claude.use('room')` is there, and `07-net.js` was written for it. The game script is byte-for-byte the same.
2. **Three.js r128 comes from cdnjs** (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`), because
   artifact pages may only load scripts from cdnjs/jsdelivr/unpkg. GLTFLoader, SkeletonUtils and the short `MODEL_FILES` list stay inline.
3. **No `<!doctype>/<html>/<head>/<body>` and no manifest/icon links.** The publisher adds its own wrapper. The page
   starts at `<title>World War 3</title>`.
4. **The 3D models are published as base64 text.** The artifact host refuses `.glb.gz` / `application/gzip` (it serves
   only html css js mjs wasm json txt, images, fonts, audio/video and pdf). So each `models/<key>.<hash>.glb.gz` is
   written as `orch/out/artifact/models/<key>.<hash>.txt` (base64 of the same gzip bytes) and published at
   `models/<key>.<hash>.txt` as `text/plain`. The page's `MODEL_FILES` points at the `.txt` paths, and a small
   `fetch` hook placed just before it (`MODEL_TXT_HOOK` in `build.py`) turns those answers back into the gzip bytes
   that `src/11-models.js` unzips. `src/` is untouched; the Pages build never contains the hook.

The build refuses to write the page if any of these swaps can't be made, for example when the shell changed shape or
Pages-only code would leak through, and refuses a `publish.json` that lists a file type the host won't serve
(`ARTIFACT_TYPES` in `build.py`). Audio loads from `vo/XX.mp3` and `mus/*.mp3`, published next to the page at the same
paths as on Pages.

The test server in `orch/artifact-harness.mjs` (used by `smoke`/`mpsync --artifact`) serves **only** the page and the
files in `publish.json`, with their published content types, and fails if `publish.json` lists a type the host refuses.
Both tests fail if any 3D model doesn't load in the artifact edition.

## Steps (ORCH)

```
python3 orch/build.py --artifact             # writes orch/out/artifact/ index.html, models/*.txt, publish.json
node orch/smoke.mjs --artifact               # must print SMOKE PASS (artifact edition)
node orch/mpsync.mjs --artifact              # host + client over a stand-in room, must print MPSYNC PASS
                                             # (add --reconnect to also test a client dropping out and rejoining)
```

Then publish with the Artifact tool:

1. `action: "read"` with `url: "https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi"`. A publish to an artifact this
   session hasn't read is refused.
2. `action: "publish"`, `url` = that URL, `file_path` = the absolute path of `orch/out/artifact/index.html`. Leave
   out `icon`. `orch/out/artifact/publish.json` contains every argument, ready to copy.
   - **`files`**: pass them when something under `vo/`, `mus/` or `models/` changed, and on the first publish from
     this pipeline (the first publish after 2026-10-27 must pass them: the models moved out of the page then; without
     them the artifact shows simple shapes instead of 3D models). Copy the `files` object from `publish.json`, which is
     always complete (94 entries as of 2026-10-27, with the soundtrack). Keys are published paths; values are source paths relative to the
     repo root (run the publish from the repo root, or use the absolute paths):
     - `vo/<CODE>.mp3` → `vo/<CODE>.mp3` (18 files, `audio/mpeg`, type from the extension)
     - `mus/<name>.mp3` → `mus/<name>.mp3` (every `mus/*.mp3`: `smp`, `me`, `as`, `we`, `an_US/EU/IL/UA/CU/IN/CN/EG`; `audio/mpeg`)
     - `mus/st/<id>.mp3` → `mus/st/<id>.mp3` (the shared soundtrack, 14 tracks, ~32 MB; `audio/mpeg`). The first publish
       after the soundtrack landed must pass `files`, or the artifact plays the generated fallback score instead
     - `models/<key>.<hash>.txt` → `{"from": "orch/out/artifact/models/<key>.<hash>.txt", "contentType": "text/plain"}`
       (50 files, ~5.3 MB in all; one per file in `models/`, the `inf` alias shares `soldier`'s file)

     A changed model gets a new file name (its hash): map the old `models/<key>.<oldhash>.txt` path to `null` to remove
     it. Files you leave out stay published. The first publish after this change may also remove any
     `models/*.glb.gz` entries a failed earlier attempt might have left (map them to `null`); none should exist.
   - **`capabilities`**: on a normal republish, **leave it out**, so the stored declaration (and the runtime contract
     pin) carries forward. Pass it once, on the first publish from this pipeline, to make sure every topic the game
     sends is open to Contributors. Pass it again whenever `ROOM_TOPICS` in `build.py` changes. It is a full-set
     declaration:
     ```json
     {"room":{"topics":{"cmd":"interact","evt":"interact","hello":"interact","lobby":"interact","snap":"interact",
       "start":"interact","team":"interact","ck":"interact","pong":"interact"}},"user":{"scopes":["profile"]}}
     ```
     The stored declaration opens cmd/evt/hello/lobby/snap/start/team. `ck` (host-migration checkpoints to the
     standby player) and `pong` (ping display) are also sent by the host. Today hosting needs Editor access, which
     can send any topic, so this is a safety margin rather than a fix. `user` with `profile` lets the lobby show
     players' names (`user.profiles`).
3. Say in the report that the artifact was republished. Abdullah keeps both copies in sync.

## When it breaks

- `artifact: expected PeerJS + online-edition shim before <title>`, or a similar message: someone changed the
  `index.html` shell (scripts added, moved or removed). Update `artifact()` in `orch/build.py` so it still drops
  exactly the Pages-only scripts.
- A new room topic in `07-net`/`07b-ckpt`: add it to `ROOM_TOPICS` in `build.py` (16 at most) and republish **with**
  `capabilities`. `smoke/mpsync --artifact` fails when the game sends a topic that isn't declared, a message over
  4 KiB, or a presence object over 4 KiB. The real runtime refuses all three.
- The test room (`orch/artifact-harness.mjs`) is a stand-in. It doesn't model real network loss, real rate limiting,
  Viewer/Editor permission differences, or host migration between real claude.ai users.
