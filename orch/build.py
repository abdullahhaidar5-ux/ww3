#!/usr/bin/env python3
"""Build index.html from the game sources in src/.

index.html = shell + vendored libraries (PeerJS, Three.js, GLTFLoader, SkeletonUtils) + MODEL_PACK + the game script.
Only the game script is ours to edit; it lives in src/NN-*.js. This script swaps the game <script> in index.html for
the concatenation of src/*.js (in file-name order) and leaves every other byte alone, so no model assets are needed.

  python3 orch/build.py           # rebuild index.html from src/
  python3 orch/build.py --check   # exit 1 if index.html is out of date with src/ (nothing written)
  python3 orch/build.py --split   # one-off: regenerate src/ from the game script inside index.html
"""
import glob, os, subprocess, sys

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
    tmp = os.path.join(ROOT, 'orch', 'out', '_game_check.js')
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    open(tmp, 'w', encoding='utf-8').write(game)
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit('syntax error in src/ — index.html NOT written:\n' + r.stderr[-2000:])
    if out == html:
        print('index.html already up to date')
        return
    with open(HTML, 'w', encoding='utf-8', newline='') as f:
        f.write(out)
    print(f'index.html rebuilt ({len(out)} bytes, game {len(game)} chars)')


if __name__ == '__main__':
    if '--split' in sys.argv:
        split()
    else:
        build(check='--check' in sys.argv)
