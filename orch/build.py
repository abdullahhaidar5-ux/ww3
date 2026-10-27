#!/usr/bin/env python3
"""Build index.html from the game sources in src/.

index.html = shell + vendored libraries (PeerJS, Three.js, GLTFLoader, SkeletonUtils) + MODEL_PACK + the game script.
Only the game script is ours to edit; it lives in src/NN-*.js. This script swaps the game <script> in index.html for
the concatenation of src/*.js (in file-name order) and leaves every other byte alone, so no model assets are needed.

  python3 orch/build.py           # rebuild index.html from src/
  python3 orch/build.py --check   # exit 1 if index.html is out of date with src/ (nothing written)
  python3 orch/build.py --split   # one-off: regenerate src/ from the game script inside index.html
  python3 orch/build.py --artifact  # write the claude.ai artifact edition to orch/out/artifact/ (see orch/ARTIFACT.md)
"""
import glob, json, os, re, subprocess, sys

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
        if out != html:
            print('index.html is OUT OF DATE with src/ — run python3 orch/build.py')
            sys.exit(1)
        print('index.html is up to date with src/')
        return
    # syntax check before writing
    syntax_check(game, 'index.html')
    if out == html:
        print('index.html already up to date')
        return
    with open(HTML, 'w', encoding='utf-8', newline='') as f:
        f.write(out)
    print(f'index.html rebuilt ({len(out)} bytes, game {len(game)} chars)')


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
    rels = sorted('vo/' + n for n in os.listdir(os.path.join(ROOT, 'vo')) if n.endswith('.mp3')) + ['mus/smp.mp3']
    files = {rel: rel for rel in rels}  # published path -> source path, relative to the repo root (ORCH's cwd)
    for rel in rels:
        if not os.path.isfile(os.path.join(ROOT, rel)):
            sys.exit(f'artifact: missing published file {rel}')
    publish = {'url': ARTIFACT_URL, 'file_path': out, 'files': files, 'capabilities': CAPABILITIES}
    with open(os.path.join(ARTIFACT_OUT, 'publish.json'), 'w', encoding='utf-8') as f:
        json.dump(publish, f, indent=2)
    print(f'artifact page written: {os.path.relpath(out, ROOT)} ({len(page)} bytes, game {len(game)} chars), '
          f'{len(files)} audio files; publish arguments in orch/out/artifact/publish.json')


if __name__ == '__main__':
    if '--split' in sys.argv:
        split()
    elif '--artifact' in sys.argv:
        artifact()
    else:
        build(check='--check' in sys.argv)
