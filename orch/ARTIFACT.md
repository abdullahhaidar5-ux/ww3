# Publishing the claude.ai artifact edition

The game has two live copies: GitHub Pages (`index.html` on `main`) and the claude.ai artifact
https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi. Both are built from the same `src/`. Republish the artifact at
every ship (ORCH.md step 8), right after pushing `main`.

## What differs from index.html

`python3 orch/build.py --artifact` writes `orch/out/artifact/index.html` (gitignored, ~7.3 MB) from the current
`src/` and the `index.html` shell. It makes three changes and touches nothing else:

1. **No PeerJS, Trystero, online-edition shim or install/service-worker script.** On Pages those scripts stand in for
   the artifact runtime: the shim sets `window.claude.use('room')` over PeerJS. On claude.ai the real
   `claude.use('room')` is there, and `07-net.js` was written for it. The game script is byte-for-byte the same.
2. **Three.js r128 comes from cdnjs** (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`), because
   artifact pages may only load scripts from cdnjs/jsdelivr/unpkg. GLTFLoader, SkeletonUtils and the short `MODEL_FILES` list stay inline.
3. **No `<!doctype>/<html>/<head>/<body>` and no manifest/icon links.** The publisher adds its own wrapper. The page
   starts at `<title>World War 3</title>`.

The build refuses to write the page if any of these swaps can't be made, for example when the shell changed shape or
Pages-only code would leak through. Audio loads from `vo/XX.mp3` and `mus/*.mp3`, and the 3D models from `models/<key>.<hash>.glb.gz`, all published
next to the page at the same paths as on Pages.

## Steps (ORCH)

```
python3 orch/build.py --artifact             # writes orch/out/artifact/index.html + publish.json
node orch/smoke.mjs --artifact               # must print SMOKE PASS (artifact edition)
node orch/mpsync.mjs --artifact              # host + client over a stand-in room, must print MPSYNC PASS
                                             # (add --reconnect to also test a client dropping out and rejoining)
```

Then publish with the Artifact tool:

1. `action: "read"` with `url: "https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi"`. A publish to an artifact this
   session hasn't read is refused.
2. `action: "publish"`, `url` = that URL, `file_path` = the absolute path of `orch/out/artifact/index.html`. Leave
   out `icon`. `orch/out/artifact/publish.json` contains every argument, ready to copy.
   - **`files`**: pass these only when something under `vo/`, `mus/` or `models/` changed, or on the first publish
     from this pipeline (the first publish after 2026-10-27 must pass them: that is when the models moved out of the
     page into `models/`; without them the artifact shows simple shapes instead of 3D models). Copy the `files` object
     from `publish.json`, which is always complete: model files go as `{"from": ..., "contentType": "application/gzip"}`.
     A changed model gets a new file name (its hash), so the old one can be removed by mapping its path to `null`. Files you leave out stay published. Keys are published paths, values are repo-relative source paths
     (run from the repo root):
     ```json
     {"vo/AE.mp3":"vo/AE.mp3","vo/CN.mp3":"vo/CN.mp3","vo/CU.mp3":"vo/CU.mp3","vo/DW.mp3":"vo/DW.mp3",
      "vo/EG.mp3":"vo/EG.mp3","vo/EU.mp3":"vo/EU.mp3","vo/IL.mp3":"vo/IL.mp3","vo/IN.mp3":"vo/IN.mp3",
      "vo/IR.mp3":"vo/IR.mp3","vo/KP.mp3":"vo/KP.mp3","vo/KR.mp3":"vo/KR.mp3","vo/PK.mp3":"vo/PK.mp3",
      "vo/RS.mp3":"vo/RS.mp3","vo/RU.mp3":"vo/RU.mp3","vo/SA.mp3":"vo/SA.mp3","vo/TR.mp3":"vo/TR.mp3",
      "vo/UA.mp3":"vo/UA.mp3","vo/US.mp3":"vo/US.mp3","mus/smp.mp3":"mus/smp.mp3"}
     ```
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
