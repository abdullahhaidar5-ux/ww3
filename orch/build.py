#!/usr/bin/env python3
"""Build index.html from the game sources in src/.

index.html = shell + vendored libraries (PeerJS, Three.js, GLTFLoader, SkeletonUtils) + MODEL_FILES + the game script.
Only the game script is ours to edit; it lives in src/NN-*.js. This script swaps the game <script> in index.html for
the concatenation of src/*.js (in file-name order) and leaves every other byte alone.

The 3D models live in models/<key>.<hash>.glb.gz (one gzipped .glb per model; the files are the source of truth,
<hash> is the first 10 hex digits of the sha256 of the .gz bytes, so every version has its own URL and caches forever).
The build writes the list of them into index.html (`const MODEL_FILES={...}`, one short line) and into sw.js (the
offline precache list). The game fetches them at startup (src/11-models.js).

  python3 orch/build.py           # rebuild index.html (and the model lists in index.html + sw.js) from src/ + models/
  python3 orch/build.py --check   # exit 1 if index.html / sw.js are out of date with src/ + models/ (nothing written)
  python3 orch/build.py --split   # one-off: regenerate src/ from the game script inside index.html
  python3 orch/build.py --artifact  # write the claude.ai artifact edition to orch/out/artifact/ (see orch/ARTIFACT.md)
  python3 orch/build.py --add-model KEY FILE.glb   # add or replace model KEY (gzips it into models/, drops the old one)
"""
import glob, gzip, hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')
SRC = os.path.join(ROOT, 'src')
START = '/* ================= DATA ================= */'

# Module boundaries, in order: the first line each src file starts with.
MODULES = [
    ('01-data.js', '/* ================= DATA ================= */'),
    ('02-map.js', '/* ================= MAP: sea channel, bridges, grid, pathfi'),
    ('03-sim.js', '/* ================= SIMULATION (authoritative; runs in sing'),
    ('04-gfx.js', 'let BORDER_TEX=null;\n/* ================= 3D ENGINE: rendere'),
    ('05-fx3d.js', '/* ================= 3D EFFECTS: particles, tracers, project'),
    ('06-view.js', '/* ================= VIEW: scene sync, camera, HUD, fog, min'),
    ('07-net.js', '/* ================= MULTIPLAYER: lobby + host-authoritative'),
    ('07b-ckpt.js', '/* ---------- Battle checkpoints (for host migration) ------'),
    ('08-ui.js', '/* ================= UI: sidebar, input, menu, main loop ==='),
    ('09-audio.js', '/* ================= AUDIO ENGINE: layered weapons, reverb, '),
    ('10-post.js', '/* ================= CINEMATIC POST-PROCESSING: HDR, bloom, '),
    ('11-models.js', 'let WALKSIGN=1;\n/* ================= ART ASSETS: real 3D mod'),
]


MODELS_DIR = os.path.join(ROOT, 'models')
SW = os.path.join(ROOT, 'sw.js')
# keys whose model is byte-for-byte another key's: one file, both keys (the game parses it once per key)
MODEL_ALIAS = {'inf': 'soldier'}
MODEL_NAME = re.compile(r'^([A-Za-z0-9_]+)\.([0-9a-f]{10})\.glb\.gz$')
PACK_RE = re.compile(r'<script>const MODEL_PACK="([A-Za-z0-9+/=]*)";?</script>')  # the old inline pack (pre-2026-10-27)
FILES_RE = re.compile(r'<script>const MODEL_FILES=\{[^<]*?\};</script>')
SW_RE = re.compile(r'const MODELS=\[[^\]]*\];')


def gz(data):
    """Deterministic gzip: same bytes in, same bytes out (no timestamp, no file name)."""
    return gzip.compress(data, compresslevel=9, mtime=0)


def model_hash(b):
    return hashlib.sha256(b).hexdigest()[:10]


def model_files():
    """{key: 'models/<file>'} for every model in models/ (aliases included), checked: name hash matches the bytes,
    the bytes are gzip and unpack to a glTF binary, one file per key."""
    out = {}
    if not os.path.isdir(MODELS_DIR):
        return out
    for n in sorted(os.listdir(MODELS_DIR)):
        m = MODEL_NAME.match(n)
        if not m:
            sys.exit(f'models/{n}: not a model file (expected <key>.<10 hex>.glb.gz) — remove it or use --add-model')
        key, h = m.groups()
        b = open(os.path.join(MODELS_DIR, n), 'rb').read()
        if model_hash(b) != h:
            sys.exit(f'models/{n}: contents do not match the hash in its name — use --add-model to (re)add a model')
        if gzip.decompress(b)[:4] != b'glTF':
            sys.exit(f'models/{n}: not a gzipped .glb')
        if key in out:
            sys.exit(f'models/: two files for {key!r} ({out[key]}, {n})')
        out[key] = 'models/' + n
    for a, k in MODEL_ALIAS.items():
        if k in out and a not in out:
            out[a] = out[k]
    return dict(sorted(out.items()))


def write_model(key, glb):
    """Store one model as models/<key>.<hash>.glb.gz, removing any older file for that key."""
    if not re.fullmatch(r'[A-Za-z0-9_]+', key):
        sys.exit(f'bad model key {key!r}')
    if glb[:4] != b'glTF':
        sys.exit(f'{key}: not a glTF binary (.glb)')
    os.makedirs(MODELS_DIR, exist_ok=True)
    b = gz(glb)
    name = f'{key}.{model_hash(b)}.glb.gz'
    for n in os.listdir(MODELS_DIR):
        m = MODEL_NAME.match(n)
        if m and m.group(1) == key and n != name:
            os.remove(os.path.join(MODELS_DIR, n))
    p = os.path.join(MODELS_DIR, name)
    if not os.path.exists(p):
        open(p, 'wb').write(b)
    return name


def unpack_old_pack(html):
    """One-off migration: the inline MODEL_PACK (gzip(JSON{key: base64 .glb}) as base64) becomes models/*.glb.gz."""
    import base64
    m = PACK_RE.search(html)
    if not m:
        return html
    pack = json.loads(gzip.decompress(base64.b64decode(m.group(1))))
    for key in sorted(pack):
        glb = base64.b64decode(pack[key])
        if key in MODEL_ALIAS:
            if base64.b64decode(pack[MODEL_ALIAS[key]]) != glb:
                sys.exit(f'model alias {key} -> {MODEL_ALIAS[key]}: the two models differ; drop the alias')
            continue
        write_model(key, glb)
    print(f'moved {len(pack)} models out of index.html into models/')
    return html[:m.start()] + '<script>const MODEL_FILES={};</script>' + html[m.end():]


def with_models(html):
    """index.html with its MODEL_FILES line listing models/ as it is now."""
    files = model_files()
    line = '<script>const MODEL_FILES=' + json.dumps(files, separators=(',', ':')) + ';</script>'
    if len(FILES_RE.findall(html)) != 1:
        sys.exit('index.html: expected exactly one <script>const MODEL_FILES={...};</script> line in the shell')
    return FILES_RE.sub(lambda _: line, html), files


def sw_with_models(files):
    sw = open(SW, encoding='utf-8', newline='').read()
    if len(SW_RE.findall(sw)) != 1:
        sys.exit('sw.js: expected exactly one "const MODELS=[...];" line')
    urls = sorted(set('./' + f for f in files.values()))
    return sw, SW_RE.sub(lambda _: 'const MODELS=' + json.dumps(urls, separators=(',', ':')) + ';', sw)


def game_span(html):
    i = html.index(START)
    j = html.index('</script>', i)
    return i, j


def split():
    html = open(HTML, encoding='utf-8').read()
    i, j = game_span(html)
    game = html[i:j]
    pos = []
    for name, head in MODULES:
        k = game.find(head, pos[-1] if pos else 0)
        if k < 0:
            sys.exit(f'cannot find start of {name}: {head[:50]!r}')
        pos.append(k)
    pos.append(len(game))
    os.makedirs(SRC, exist_ok=True)
    for n, (name, _) in enumerate(MODULES):
        with open(os.path.join(SRC, name), 'w', encoding='utf-8', newline='') as f:
            f.write(game[pos[n]:pos[n + 1]])
    print(f'wrote {len(MODULES)} modules to src/ ({len(game)} chars)')


def concat():
    files = sorted(glob.glob(os.path.join(SRC, '[0-9]*.js')))
    if not files:
        sys.exit('src/ is empty — run with --split first')
    return ''.join(open(f, encoding='utf-8', newline='').read() for f in files)


def syntax_check(game, what):
    tmp = os.path.join(ROOT, 'orch', 'out', '_game_check.js')
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    open(tmp, 'w', encoding='utf-8').write(game)
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'syntax error in src/ — {what} NOT written:\n' + r.stderr[-2000:])


def build(check=False):
    html = open(HTML, encoding='utf-8', newline='').read()
    i, j = game_span(html)
    game = concat()
    if '</script' in game.lower():
        sys.exit('src/ contains "</script" — escape it as "<\\/script" or the page breaks')
    out = html[:i] + game + html[j:]
    if check:
        if PACK_RE.search(out):
            print('index.html still has the inline MODEL_PACK — run python3 orch/build.py')
            sys.exit(1)
        out, files = with_models(out)
        sw, sw2 = sw_with_models(files)
        if out != html or sw != sw2:
            print(('index.html' if out != html else 'sw.js') + ' is OUT OF DATE with src/ + models/ — run python3 orch/build.py')
            sys.exit(1)
        print(f'index.html and sw.js are up to date with src/ and models/ ({len(files)} models)')
        return
    # syntax check before writing
    syntax_check(game, 'index.html')
    out = unpack_old_pack(out)
    out, files = with_models(out)
    if not files:
        sys.exit('models/ is empty — the game would have no 3D models; index.html NOT written')
    sw, sw2 = sw_with_models(files)
    if sw != sw2:
        with open(SW, 'w', encoding='utf-8', newline='') as f:
            f.write(sw2)
        print(f'sw.js model list updated ({len(set(files.values()))} files)')
    if out == html:
        print('index.html already up to date')
        return
    with open(HTML, 'w', encoding='utf-8', newline='') as f:
        f.write(out)
    print(f'index.html rebuilt ({len(out)} bytes, game {len(game)} chars, {len(files)} models in models/)')


# ---------------------------------------------------------------------------------------------------------------
# claude.ai artifact edition (https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi). Same game, same src/, three swaps:
#  1. No PeerJS / Trystero / "online edition" shim / service worker: those two vendored <script>s stand in for the
#     artifact runtime's `room` capability on GitHub Pages. On claude.ai the page gets the real claude.use('room'),
#     which 07-net.js was written against, so the game script itself is byte-for-byte the Pages one.
#  2. Three.js r128 from cdnjs (artifact pages may only load scripts from cdnjs/jsdelivr/unpkg) instead of inline.
#  3. No <!doctype>/<html>/<head>/<body> or manifest/icon links: the Artifact publisher wraps the page itself.
# Audio stays at vo/XX.mp3 and mus/smp.mp3, published as files next to the page. See orch/ARTIFACT.md.
ARTIFACT_URL = 'https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi'
ARTIFACT_OUT = os.path.join(ROOT, 'orch', 'out', 'artifact')
THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
# Every room topic 07-net/07b-ckpt send in room mode, opened to Contributors ("interact"). 'b' (bundles) is P2P-only.
ROOM_TOPICS = ['cmd', 'evt', 'hello', 'lobby', 'snap', 'start', 'team', 'ck', 'pong']
CAPABILITIES = {'room': {'topics': {t: 'interact' for t in ROOM_TOPICS}}, 'user': {'scopes': ['profile']}}


def scripts(html):
    """(start of <script>, end after </script>, body) for every <script> block, in order."""
    out, k = [], 0
    while True:
        a = html.find('<script', k)
        if a < 0:
            return out
        b = html.index('>', a) + 1
        e = html.index('</script>', b)
        out.append((a, e + len('</script>'), html[b:e]))
        k = e + len('</script>')


def artifact():
    html = open(HTML, encoding='utf-8', newline='').read()
    i, j = game_span(html)
    game = concat()
    if '</script' in game.lower():
        sys.exit('src/ contains "</script" — escape it as "<\\/script" or the page breaks')
    syntax_check(game, 'artifact')
    html = html[:i] + game + html[j:]
    if PACK_RE.search(html):
        sys.exit('artifact: index.html still has the inline MODEL_PACK — run python3 orch/build.py first')
    html, models = with_models(html)
    t = html.find('<title>')
    if t < 0:
        sys.exit('artifact: no <title> in index.html shell')
    blocks = scripts(html)
    before = [s for s in blocks if s[0] < t]
    names = ['online-edition shim' if 'window.WW3_P2P=true' in b else
             'PeerJS' if 'peerjs' in b.lower() or 'chunkedMTU' in b else '?' for _, _, b in before]
    if names != ['PeerJS', 'online-edition shim']:
        sys.exit(f'artifact: expected PeerJS + online-edition shim before <title>, found {names} — update build.py')
    three = [s for s in blocks if s[0] > t and 'Three.js Authors' in s[2][:300]]
    if len(three) != 1 or 'const e="128"' not in three[0][2]:
        sys.exit('artifact: vendored Three.js r128 <script> not found — CDN URL would not match; update build.py')
    a, b, _ = three[0]
    end = html.rindex('</body>')
    page = html[t:a] + f'<script src="{THREE_CDN}"></script>' + html[b:end].rstrip() + '\n'
    # guards: nothing Pages-only may leak into the artifact
    # (the World War 3 servers backend - relay rooms, server game list - lives in the shim, so it is dropped with it)
    for bad in ('window.WW3_P2P=true', 'window.claude=', 'serviceWorker.register', '<!doctype', '<body',
                'manifest.webmanifest', 'WW3_SDIR', '__ww3WsStats', "'/room/'"):
        if bad.lower() in page.lower():
            sys.exit(f'artifact: Pages-only code {bad!r} still in the artifact page — update build.py')
    srcs = re.findall(r'<script[^>]+src="([^"]+)"', page)
    if srcs != [THREE_CDN]:
        sys.exit(f'artifact: unexpected external scripts {srcs}')
    os.makedirs(ARTIFACT_OUT, exist_ok=True)
    out = os.path.join(ARTIFACT_OUT, 'index.html')
    with open(out, 'w', encoding='utf-8', newline='') as f:
        f.write(page)
    rels = sorted('vo/' + n for n in os.listdir(os.path.join(ROOT, 'vo')) if n.endswith('.mp3')) + sorted('mus/' + n for n in os.listdir(os.path.join(ROOT, 'mus')) if n.endswith('.mp3'))
    files = {rel: rel for rel in rels}  # published path -> source path, relative to the repo root (ORCH's cwd)
    for rel in rels:
        if not os.path.isfile(os.path.join(ROOT, rel)):
            sys.exit(f'artifact: missing published file {rel}')
    # the 3D models, published next to the page at the same paths as on Pages (hash in the name: new model = new path)
    mrels = sorted(set(models.values()))
    for rel in mrels:
        files[rel] = {'from': rel, 'contentType': 'application/gzip'}
    publish = {'url': ARTIFACT_URL, 'file_path': out, 'files': files, 'capabilities': CAPABILITIES}
    with open(os.path.join(ARTIFACT_OUT, 'publish.json'), 'w', encoding='utf-8') as f:
        json.dump(publish, f, indent=2)
    msize = sum(os.path.getsize(os.path.join(ROOT, r)) for r in mrels)
    print(f'artifact page written: {os.path.relpath(out, ROOT)} ({len(page)} bytes, game {len(game)} chars), '
          f'{len(rels)} audio files + {len(mrels)} model files ({msize / 1e6:.1f} MB); publish arguments in orch/out/artifact/publish.json')


if __name__ == '__main__':
    if '--split' in sys.argv:
        split()
    elif '--add-model' in sys.argv:
        k = sys.argv.index('--add-model')
        if len(sys.argv) < k + 3:
            sys.exit('usage: python3 orch/build.py --add-model KEY FILE.glb')
        key, src = sys.argv[k + 1], sys.argv[k + 2]
        print('models/' + write_model(key, open(src, 'rb').read()) + ' written; now run python3 orch/build.py')
    elif '--artifact' in sys.argv:
        artifact()
    else:
        build(check='--check' in sys.argv)
